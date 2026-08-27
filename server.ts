import express from "express";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getMessaging } from "firebase-admin/messaging";
import { ClientFirestoreAdapter } from "./src/client-firestore.ts";
import { INITIAL_COMMUNITY_MESSAGES } from "./src/data/mockData.ts";
import { PROMO_MESSAGES } from "./src/data/promoMessages.ts";

// Use dynamic Firebase Project configuration from our provisioned workspace
let firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "calm-light-fg02f",
  appId: ""
};
let firebaseDbId = "ai-studio-fbcd1f6d-679b-4649-8f91-6a9b5a40d0b9";

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (config.projectId) firebaseConfig.projectId = config.projectId;
    if (config.apiKey) firebaseConfig.apiKey = config.apiKey;
    if (config.authDomain) firebaseConfig.authDomain = config.authDomain;
    if (config.appId) firebaseConfig.appId = config.appId;
    if (config.firestoreDatabaseId) {
      firebaseDbId = config.firestoreDatabaseId;
    }
  }
} catch (e) {
  console.error("Error reading firebase config on server:", e);
}

// ... (lines 36-38)
const app = admin.getApps().length === 0 ? admin.initializeApp({
  projectId: firebaseConfig.projectId
}) : admin.getApp();

const bucketName = (firebaseConfig as any).storageBucket || `${firebaseConfig.projectId}.appspot.com`;
const bucket = getStorage(app).bucket(bucketName);

const defaultIcons: Record<string, string> = {
  'Area di sosta': 'default_icons/area_sosta.svg',
  'Campeggio': 'default_icons/campeggio.svg',
  'Camper service': 'default_icons/camper_service.svg',
  'Parcheggio': 'default_icons/parcheggio_camper.svg',
};

function removeUndefined(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      cleaned[key] = removeUndefined(obj[key]);
    }
  }
  return cleaned;
}

async function uploadDefaultIcons() {
  try {
    const [bucketExists] = await bucket.exists();
    if (!bucketExists) {
      console.warn(`[Firebase Storage] Storage bucket '${bucket.name}' not found. Default icons cannot be uploaded.`);
      return;
    }
    for (const [category, filename] of Object.entries(defaultIcons)) {
      const file = bucket.file(filename);
      const localPath = path.join(process.cwd(), "public", filename.replace("default_icons/", ""));
      if (fs.existsSync(localPath)) {
        await file.save(fs.readFileSync(localPath), {
          metadata: {
            contentType: 'image/svg+xml',
            cacheControl: 'public, max-age=3600'
          }
        });
        await file.makePublic();
        console.log(`Uploaded/Updated default icon: ${filename}`);
      }
    }
  } catch (err) {
    console.error(`[Firebase Storage] Error in uploadDefaultIcons:`, err);
  }
}

let firestoreDb: any;
try {
  firestoreDb = new ClientFirestoreAdapter(firebaseConfig, firebaseDbId);
  console.log(`[REST Firestore Adapter] Connected successfully using API Key for DatabaseId: ${firebaseDbId}`);
} catch (err) {
  console.error(`[REST Firestore Adapter] Failed to initialize database adapter.`, err);
}

// --- USER DATABASE OVERRIDES AND CACHING SYSTEM FOR RESILIENCY ---
interface UserOverride {
  email: string;
  approved?: boolean;
  isModerator?: boolean;
  moderatorRoles?: {
    community?: boolean;
    places?: boolean;
    itineraries?: boolean;
  };
  deleted?: boolean;
}

const OVERRIDES_FILE = path.join(process.cwd(), "user_overrides.json");
const USERS_CACHE_FILE = path.join(process.cwd(), "users_cache.json");

function getUserOverrides(): Record<string, UserOverride> {
  try {
    if (fs.existsSync(OVERRIDES_FILE)) {
      return JSON.parse(fs.readFileSync(OVERRIDES_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading user overrides file:", err);
  }
  return {};
}

function saveUserOverride(email: string, update: Partial<UserOverride>) {
  try {
    const overrides = getUserOverrides();
    const cleanEmail = email.toLowerCase().trim();
    if (!overrides[cleanEmail]) {
      overrides[cleanEmail] = { email: cleanEmail };
    }
    overrides[cleanEmail] = { ...overrides[cleanEmail], ...update };
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving user override:", err);
  }
}

function cacheUsers(users: any[]) {
  try {
    fs.writeFileSync(USERS_CACHE_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("Error caching users:", err);
  }
}

function getCachedUsers(): any[] {
  try {
    if (fs.existsSync(USERS_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_CACHE_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading users cache:", err);
  }
  return [];
}

function isUserDeleted(email: string): boolean {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  const overrides = getUserOverrides();
  return !!overrides[cleanEmail]?.deleted;
}

function getOverrideAppliedUser(email: string, userData: any): any {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();
  const overrides = getUserOverrides();

  // If marked deleted in overrides, user is completely deleted
  if (overrides[cleanEmail]?.deleted) {
    return null;
  }
  
  if (userData && userData.deleted === true) {
    return null;
  }

  let baseUser = userData;
  if (!baseUser) {
    const cached = getCachedUsers();
    baseUser = cached.find(u => (u.email || "").toLowerCase().trim() === cleanEmail);
  }
  if (!baseUser || baseUser.deleted === true) return null;

  if (overrides[cleanEmail]) {
    const o = overrides[cleanEmail];
    return {
      ...baseUser,
      ...(o.approved !== undefined ? { approved: o.approved } : {}),
      ...(o.isModerator !== undefined ? { isModerator: o.isModerator } : {}),
      ...(o.moderatorRoles !== undefined ? { moderatorRoles: o.moderatorRoles } : {})
    };
  }
  return baseUser;
}

// Ensure this is called when the server starts
uploadDefaultIcons().catch(console.error);
fixExistingPlaces().catch(console.error);

async function fixExistingPlaces() {
  try {
    const placesRef = firestoreDb.collection("places");
    const snapshot = await placesRef.get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const needsFix =
        !data.imageUrl ||
        data.imageUrl.startsWith("https://images.unsplash.com/") ||
        data.imageUrl.includes("default_icons/") ||
        data.imageUrl.includes(".jpg"); // Fix any old JPG icons or broken references

      if (needsFix) {
         // Try case-insensitive and flexible matching
         const cat = data.category ? data.category.toLowerCase() : "";
         let iconPath = "";
         if (cat.includes("sosta")) iconPath = defaultIcons['Area di sosta'];
         else if (cat.includes("campeggio")) iconPath = defaultIcons['Campeggio'];
         else if (cat.includes("service")) iconPath = defaultIcons['Camper service'];
         else if (cat.includes("parcheggio")) iconPath = defaultIcons['Parcheggio'];
         
         if (iconPath) {
           const iconFilename = iconPath.replace("default_icons/", "");
           const newUrl = `/${iconFilename}`;
           await firestoreDb.collection("places").doc(doc.id).update({ imageUrl: newUrl });
           console.log(`Updated place ${doc.id} with default icon per category ${data.category}`);
         }
      }
    }
  } catch (err) {
    console.error(`[Firebase Client Adapter] Error in fixExistingPlaces (DatabaseId: ${firebaseDbId}):`, err);
  }
}

    async function notifyModerators(role: "community" | "places" | "itineraries" | "users" | "all", title: string, body: string, data?: any) {
      console.log(`[Notification] Notifying moderators for role: ${role}`);
      try {
        const moderatorEmails = new Set<string>();

        // Always include superadmins
        moderatorEmails.add("sambucci.simone@gmail.com");
        moderatorEmails.add("viacamperapp@gmail.com");
        if (process.env.ADMIN_EMAIL) {
          moderatorEmails.add(process.env.ADMIN_EMAIL.toLowerCase().trim());
        }

        try {
          // Query users with moderator roles
          const usersSnapshot = await firestoreDb.collection("users").get();
          usersSnapshot.forEach((doc: any) => {
            const u = doc.data();
            const email = (u.email || doc.id).toLowerCase().trim();
            if (
              u.isModerator ||
              u.isAdmin ||
              email === "sambucci.simone@gmail.com" ||
              email === "viacamperapp@gmail.com" ||
              (role === "all" && u.moderatorRoles) ||
              (u.moderatorRoles && (u.moderatorRoles[role] === true || u.moderatorRoles.community || u.moderatorRoles.places || u.moderatorRoles.itineraries))
            ) {
              moderatorEmails.add(email);
            }
          });
        } catch (dbErr) {
          console.warn("[Notification] Could not query moderators from DB:", dbErr);
        }

        const emailList = Array.from(moderatorEmails);

        // Store notification record for each moderator in Firestore
        for (const email of emailList) {
          try {
            await firestoreDb.collection("notifications").add({
              userId: email,
              title,
              body,
              type: role,
              createdAt: new Date().toISOString(),
              read: false,
              data: data || {}
            });
          } catch (notifErr) {
            console.warn(`[Notification] Failed to write notification for ${email}:`, notifErr);
          }
        }

        // Also add entry to adminNotifications collection for history/logs
        try {
          await firestoreDb.collection("adminNotifications").add({
            type: role,
            title,
            body,
            timestamp: new Date().toISOString(),
            data: data || {},
            read: false
          });
        } catch (admNotifErr) {
          console.warn("[Notification] Failed to write adminNotifications history:", admNotifErr);
        }

        // Send FCM Push Notifications to devices
        if (emailList.length > 0) {
          await sendPushNotification(emailList, title, body, {
            ...(data || {}),
            type: role,
            title,
            body,
            click_action: "FLUTTER_NOTIFICATION_CLICK"
          });
        }
      } catch (err) {
        console.error(`[Notification] Error notifying moderators:`, err);
      }
    }

async function sendPushNotification(
  emails: string | string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    const emailList = Array.isArray(emails) ? emails : [emails];
    if (emailList.length === 0) return;
    console.log(`[FCM Push] Preparing to send push notification to users:`, emailList);

    const tokensRef = firestoreDb.collection("push_tokens");
    const rawTokens: string[] = [];
    const tokensToClean: string[] = [];

    const isValidToken = (t: any) =>
      typeof t === "string" && t.trim().length >= 20 && !t.includes(" ");

    for (const rawEmail of emailList) {
      const email = String(rawEmail || '').toLowerCase().trim();
      if (!email) continue;

      // 1. Check push_tokens collection
      try {
        const doc = await tokensRef.doc(email).get();
        if (doc.exists) {
          const t = doc.data()?.token || doc.data()?.pushToken;
          if (isValidToken(t)) {
            if (!rawTokens.includes(t)) rawTokens.push(t);
          } else if (t) {
            tokensToClean.push(t);
          }
        }
      } catch (err) {
        console.error(`[FCM Push] Error reading push token from push_tokens for ${email}:`, err);
      }

      // 2. Also check users collection as backup
      try {
        const userDoc = await firestoreDb.collection("users").doc(email).get();
        if (userDoc.exists) {
          const uData = userDoc.data() || {};
          if (isValidToken(uData.pushToken)) {
            if (!rawTokens.includes(uData.pushToken)) {
              rawTokens.push(uData.pushToken);
            }
          } else if (uData.pushToken) {
            tokensToClean.push(uData.pushToken);
          }

          if (Array.isArray(uData.pushTokens)) {
            uData.pushTokens.forEach((t: string) => {
              if (isValidToken(t)) {
                if (!rawTokens.includes(t)) rawTokens.push(t);
              } else if (t) {
                tokensToClean.push(t);
              }
            });
          }
        }
      } catch (uErr) {
        // silent
      }
    }

    const uniqueTokens = Array.from(new Set(rawTokens));

    if (uniqueTokens.length === 0) {
      console.log(`[FCM Push] No valid active push tokens found for users:`, emailList);
      if (tokensToClean.length > 0) {
        // Cleanup malformed tokens right away
        await cleanStaleTokens(tokensToClean, emailList, tokensRef);
      }
      return;
    }

    console.log(`[FCM Push] Sending notification to ${uniqueTokens.length} device(s) for ${emailList.join(", ")}...`);

    const message = {
      notification: {
        title: title,
        body: body,
      },
      android: {
        priority: "high" as const,
        notification: {
          sound: "default",
          channelId: "fcm_default_channel",
          notificationPriority: "PRIORITY_MAX" as const,
          visibility: "public" as const,
          icon: "ic_notification",
          defaultSound: true,
          defaultVibrateTimings: true,
        }
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            contentAvailable: true,
          }
        }
      },
      data: {
        title: title,
        body: body,
        ...(data || {})
      },
      tokens: uniqueTokens,
    };

    const response = await getMessaging(app).sendEachForMulticast(message);
    console.log(`[FCM Push] Multicast send summary: ${response.successCount} succeeded, ${response.failureCount} failed.`);

    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error;
        const failedToken = uniqueTokens[idx];
        console.warn(`[FCM Push] Device ${idx + 1}/${uniqueTokens.length} delivery failed:`, error?.code || error?.message || error);
        if (
          error &&
          (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/invalid-argument' ||
            error.code === 'messaging/mismatched-credential')
        ) {
          console.log(`[FCM Push] Token is invalid/expired (${error.code}). Scheduling deletion:`, failedToken);
          tokensToClean.push(failedToken);
        }
      }
    });

    if (tokensToClean.length > 0) {
      await cleanStaleTokens(tokensToClean, emailList, tokensRef);
    }
  } catch (err) {
    console.error(`[FCM Push] Error sending multicast notification:`, err);
  }
}

async function cleanStaleTokens(tokensToClean: string[], emailList: string[], tokensRef: any) {
  try {
    const uniqueBadTokens = Array.from(new Set(tokensToClean));
    // 1. Clean from push_tokens collection
    const snapshot = await tokensRef.get();
    for (const doc of snapshot.docs) {
      const docData = doc.data() || {};
      const docToken = docData.token || docData.pushToken;
      if (uniqueBadTokens.includes(docToken)) {
        console.log(`[FCM Push] Purging stale token doc in push_tokens for:`, doc.id);
        await tokensRef.doc(doc.id).delete();
      }
    }

    // 2. Clean from users collection
    for (const rawEmail of emailList) {
      const email = String(rawEmail || '').toLowerCase().trim();
      if (!email) continue;
      const userDocRef = firestoreDb.collection("users").doc(email);
      const userDoc = await userDocRef.get();
      if (userDoc.exists) {
        const uData = userDoc.data() || {};
        let shouldUpdate = false;
        const updatePayload: any = {};
        if (uData.pushToken && uniqueBadTokens.includes(uData.pushToken)) {
          updatePayload.pushToken = null;
          shouldUpdate = true;
        }
        if (Array.isArray(uData.pushTokens)) {
          const filtered = uData.pushTokens.filter((t: string) => !uniqueBadTokens.includes(t));
          if (filtered.length !== uData.pushTokens.length) {
            updatePayload.pushTokens = filtered;
            shouldUpdate = true;
          }
        }
        if (shouldUpdate) {
          console.log(`[FCM Push] Purging stale tokens in users collection for:`, email);
          await userDocRef.set(updatePayload, { merge: true });
        }
      }
    }
  } catch (cleanErr) {
    console.warn(`[FCM Push] Error during stale token cleanup:`, cleanErr);
  }
}

// In-memory holder for simulating web push notifications to bypass Firestore rate limits & quotas
let latestPromoPushInMemory = {
  title: "",
  body: "",
  data: {} as Record<string, string>,
  sentAt: ""
};

async function sendPushNotificationToAll(
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    // Always update local in-memory state for ultra-fast, zero-quota web polling fallback
    latestPromoPushInMemory = {
      title,
      body,
      data: data || {},
      sentAt: new Date().toISOString()
    };

    // Write to Firestore system_metadata/last_promo_push for Web client real-time simulation
    try {
      await firestoreDb.collection("system_metadata").doc("last_promo_push").set({
        title,
        body,
        data: data || {},
        sentAt: new Date().toISOString()
      });
      console.log(`[FCM Push Simulation] Saved to system_metadata/last_promo_push for web clients.`);
    } catch (saveErr: any) {
      const errStr = saveErr.message || String(saveErr);
      if (errStr.includes("Too Many Requests") || errStr.includes("Quota exceeded") || errStr.includes("429") || errStr.includes("ResourceExhausted")) {
        console.warn("[FCM Push Simulation] Warning: Firestore rate limit/quota reached (429/ResourceExhausted). Falling back to internal in-memory pub-sub sync.");
      } else {
        console.error("[FCM Push Simulation] Error saving to Firestore:", saveErr);
      }
    }

    const tokensRef = firestoreDb.collection("push_tokens");
    const snapshot = await tokensRef.get();
    const emails = snapshot.docs.map(doc => doc.id);
    if (emails.length > 0) {
      await sendPushNotification(emails, title, body, data);
    }
  } catch (err) {
    console.error("[FCM Push] Error sending notification to all users:", err);
  }
}

let lastCheckedPromoFirestoreTime = 0;

async function checkAndSendPromotionalPush() {
  const now = Date.now();
  // Don't query Firestore for promo push check more than once every 15 minutes
  if (now - lastCheckedPromoFirestoreTime < 15 * 60 * 1000) {
    console.log("[Promo Push] Skipped Firestore query to avoid rate limits (throttling active).");
    return;
  }
  lastCheckedPromoFirestoreTime = now;

  try {
    const metaRef = firestoreDb.collection("system_metadata").doc("push_scheduler");
    const doc = await metaRef.get();
    
    let lastSent = 0;
    if (doc.exists && doc.data()?.lastSentAt) {
      lastSent = new Date(doc.data().lastSentAt).getTime();
    }
    
    // 48 hours frequency (every 2 days)
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    
    if (now - lastSent >= fortyEightHoursMs) {
      console.log("[Promo Push] 48 hours have passed since last promo push. Sending new one...");
      
      const randomIndex = Math.floor(Math.random() * PROMO_MESSAGES.length);
      const promo = PROMO_MESSAGES[randomIndex];
      
      await sendPushNotificationToAll(promo.title, promo.body, { type: "promo_push", promoIndex: String(randomIndex) });
      
      try {
        await metaRef.set({
          lastSentAt: new Date().toISOString(),
          lastPromoTitle: promo.title
        }, { merge: true });
        console.log(`[Promo Push] Sent promo: "${promo.title}" and saved state to Firestore.`);
      } catch (setErr: any) {
        if (setErr.message?.includes("Too Many Requests") || setErr.message?.includes("Quota exceeded")) {
          console.warn("[Promo Push] Warning: Firestore write limit hit, could not save scheduler state (will retry later).");
        } else {
          console.error("[Promo Push] Error saving scheduler state:", setErr);
        }
      }
    } else {
      const hoursLeft = ((fortyEightHoursMs - (now - lastSent)) / (1000 * 60 * 60)).toFixed(1);
      console.log(`[Promo Push] Next promo push scheduled in ${hoursLeft} hours.`);
    }
  } catch (err: any) {
    if (err.message?.includes("Too Many Requests") || err.message?.includes("Quota exceeded")) {
      console.warn("[Promo Push] Warning: Firestore read limit hit during scheduler check (will retry later).");
    } else {
      console.error("[Promo Push] Error in checkAndSendPromotionalPush:", err);
    }
  }
}

// Initialize Gemini SDK with named parameters & telemetry headers
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function generateContentWithRetry(params: any, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const errMsg = err.message || "";
      const isQuotaError = err.status === 429 || errMsg.includes("429") || errMsg.includes("Quota") || errMsg.includes("RESOURCE_EXHAUSTED");
      
      if (isQuotaError && params && params.model === "gemini-3.5-flash") {
        console.warn(`[Gemini AI] Quota exceeded on gemini-3.5-flash. Falling back to gemini-2.5-flash!`);
        params.model = "gemini-2.5-flash";
        continue;
      }

      if (err.status === 503 || err.status === 429 || err.message?.includes("503") || err.message?.includes("429") || err.message?.includes("high demand") || err.message?.includes("UNAVAILABLE") || err.message?.includes("Quota")) {
        if (attempt < maxRetries) {
          const delayMs = attempt * 3000;
          console.warn(`[Gemini AI] 503/429 on attempt ${attempt}. Retrying in ${delayMs}ms...`);
          await new Promise(r => setTimeout(r, delayMs));
          continue;
        }
      }
      throw err;
    }
  }
}

function getFriendlyGeminiError(err: any): string {
  const errMsg = err.message || String(err);
  if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded")) {
    return "Quota gratuita dell'API Gemini temporaneamente superata. Riprova tra 15 secondi.";
  }
  if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand") || errMsg.includes("temporarily unavailable")) {
    return "Il servizio AI di Gemini è momentaneamente sovraccarico. Riprova tra pochi istanti.";
  }
  return errMsg;
}

const PROVINCE_CACHE_FILE = path.join(process.cwd(), "province_cache.json");

function getCachedProvincePlaces(province: string): any[] | null {
  try {
    if (fs.existsSync(PROVINCE_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROVINCE_CACHE_FILE, "utf-8"));
      const key = province.toLowerCase().trim();
      if (data[key]) {
        console.log(`[Cache Hit] Found cached POIs for province: ${province}`);
        return data[key];
      }
    }
  } catch (err) {
    console.error("Error reading province cache file:", err);
  }
  return null;
}

function saveCachedProvincePlaces(province: string, places: any[]): void {
  try {
    let data: any = {};
    if (fs.existsSync(PROVINCE_CACHE_FILE)) {
      data = JSON.parse(fs.readFileSync(PROVINCE_CACHE_FILE, "utf-8"));
    }
    const key = province.toLowerCase().trim();
    data[key] = places;
    fs.writeFileSync(PROVINCE_CACHE_FILE, JSON.stringify(data, null, 2), "utf-8");
    console.log(`[Cache Save] Saved POIs for province: ${province}`);
  } catch (err) {
    console.error("Error writing to province cache file:", err);
  }
}

const PROVINCES_COORDS: Record<string, { lat: number; lng: number }> = {
  "roma": { lat: 41.9028, lng: 12.4964 },
  "rome": { lat: 41.9028, lng: 12.4964 },
  "milano": { lat: 45.4642, lng: 9.1900 },
  "milan": { lat: 45.4642, lng: 9.1900 },
  "torino": { lat: 45.0703, lng: 7.6869 },
  "turin": { lat: 45.0703, lng: 7.6869 },
  "napoli": { lat: 40.8518, lng: 14.2681 },
  "naples": { lat: 40.8518, lng: 14.2681 },
  "venezia": { lat: 45.4408, lng: 12.3155 },
  "venice": { lat: 45.4408, lng: 12.3155 },
  "firenze": { lat: 43.7696, lng: 11.2558 },
  "florence": { lat: 43.7696, lng: 11.2558 },
  "bologna": { lat: 44.4949, lng: 11.3426 },
  "genova": { lat: 44.4056, lng: 8.9463 },
  "palermo": { lat: 38.1157, lng: 13.3615 },
  "bari": { lat: 41.1171, lng: 16.8719 },
  "catania": { lat: 37.5079, lng: 15.0830 },
  "messina": { lat: 38.1938, lng: 15.5540 },
  "reggio calabria": { lat: 38.1113, lng: 15.6473 },
  "lecce": { lat: 40.3515, lng: 18.1758 },
  "taranto": { lat: 40.4644, lng: 17.2470 },
  "foggia": { lat: 41.4622, lng: 15.5446 },
  "brindisi": { lat: 40.6321, lng: 17.9361 },
  "potenza": { lat: 40.6404, lng: 15.8056 },
  "matera": { lat: 40.6664, lng: 16.6043 },
  "salerno": { lat: 40.6780, lng: 14.7594 },
  "avellino": { lat: 40.9140, lng: 14.7971 },
  "benevento": { lat: 41.1307, lng: 14.7719 },
  "caserta": { lat: 41.0730, lng: 14.3312 },
  "latina": { lat: 41.4676, lng: 12.9036 },
  "frosinone": { lat: 41.6398, lng: 13.3411 },
  "viterbo": { lat: 42.4173, lng: 12.1047 },
  "rieti": { lat: 42.4049, lng: 12.8622 },
  "perugia": { lat: 43.1107, lng: 12.3908 },
  "terni": { lat: 42.5641, lng: 12.6414 },
  "ancona": { lat: 43.6158, lng: 13.5189 },
  "pesaro": { lat: 43.9100, lng: 12.9133 },
  "urbino": { lat: 43.7263, lng: 12.6364 },
  "macerata": { lat: 43.3009, lng: 13.4534 },
  "fermo": { lat: 43.1609, lng: 13.7184 },
  "ascoli piceno": { lat: 42.8535, lng: 13.5759 },
  "l'aquila": { lat: 42.3498, lng: 13.3995 },
  "laquila": { lat: 42.3498, lng: 13.3995 },
  "teramo": { lat: 42.6587, lng: 13.7042 },
  "pescara": { lat: 42.4618, lng: 14.2185 },
  "chieti": { lat: 42.3510, lng: 14.1675 },
  "campobasso": { lat: 41.5604, lng: 14.6596 },
  "isernia": { lat: 41.5961, lng: 14.2341 },
  "sassari": { lat: 40.7259, lng: 8.5556 },
  "cagliari": { lat: 39.2238, lng: 9.1217 },
  "nuoro": { lat: 40.3193, lng: 9.3271 },
  "oristano": { lat: 39.9061, lng: 8.5916 },
  "olbia": { lat: 40.9240, lng: 9.5009 },
  "tempio": { lat: 40.8997, lng: 9.1171 },
  "siena": { lat: 43.3186, lng: 11.3306 },
  "grosseto": { lat: 42.7603, lng: 11.1118 },
  "lucca": { lat: 43.8429, lng: 10.5027 },
  "pisa": { lat: 43.7228, lng: 10.4017 },
  "livorno": { lat: 43.5485, lng: 10.3106 },
  "arezzo": { lat: 43.4631, lng: 11.8780 },
  "pistoia": { lat: 43.9312, lng: 10.9156 },
  "prato": { lat: 43.8777, lng: 11.1022 },
  "massa": { lat: 44.0375, lng: 10.1432 },
  "carrara": { lat: 44.0793, lng: 10.0971 },
  "parma": { lat: 44.8015, lng: 10.3279 },
  "piacenza": { lat: 45.0526, lng: 9.6930 },
  "reggio emilia": { lat: 44.6982, lng: 10.6312 },
  "modena": { lat: 44.6471, lng: 10.9252 },
  "ferrara": { lat: 44.8381, lng: 11.6198 },
  "ravenna": { lat: 44.4184, lng: 12.2035 },
  "forli": { lat: 44.2227, lng: 12.0407 },
  "cesena": { lat: 44.1391, lng: 12.2431 },
  "rimini": { lat: 44.0575, lng: 12.5653 },
  "verona": { lat: 45.4384, lng: 10.9916 },
  "vicenza": { lat: 45.5455, lng: 11.5347 },
  "padova": { lat: 45.4064, lng: 11.8760 },
  "treviso": { lat: 45.6661, lng: 12.2444 },
  "belluno": { lat: 46.1425, lng: 12.2167 },
  "rovigo": { lat: 45.0711, lng: 11.7904 },
  "trieste": { lat: 45.6495, lng: 13.7768 },
  "udine": { lat: 46.0711, lng: 13.2446 },
  "pordenone": { lat: 45.9569, lng: 12.6563 },
  "gorizia": { lat: 45.9402, lng: 13.6217 },
  "trento": { lat: 46.0711, lng: 11.1211 },
  "bolzano": { lat: 46.4908, lng: 11.3548 },
  "bozen": { lat: 46.4908, lng: 11.3548 },
  "brescia": { lat: 45.5416, lng: 10.2118 },
  "bergamo": { lat: 45.6983, lng: 9.6773 },
  "como": { lat: 45.8081, lng: 9.0852 },
  "varese": { lat: 45.8195, lng: 8.8250 },
  "monza": { lat: 45.5845, lng: 9.2735 },
  "lecco": { lat: 45.8566, lng: 9.3977 },
  "lodi": { lat: 45.3139, lng: 9.5032 },
  "pavia": { lat: 45.1850, lng: 9.1559 },
  "cremona": { lat: 45.1333, lng: 10.0233 },
  "mantova": { lat: 45.1564, lng: 10.7911 },
  "sondrio": { lat: 46.1690, lng: 9.8692 },
  "novara": { lat: 45.4468, lng: 8.6212 },
  "alessandria": { lat: 44.9130, lng: 8.6151 },
  "asti": { lat: 44.9014, lng: 8.2069 },
  "cuneo": { lat: 44.3896, lng: 7.5479 },
  "vercelli": { lat: 45.3241, lng: 8.4184 },
  "biella": { lat: 45.5630, lng: 8.0579 },
  "verbania": { lat: 45.9221, lng: 8.5511 },
  "imperia": { lat: 43.8860, lng: 8.0263 },
  "savona": { lat: 44.3079, lng: 8.4811 },
  "la spezia": { lat: 44.1107, lng: 9.8434 },
  "laspezia": { lat: 44.1107, lng: 9.8434 },
  "aosta": { lat: 45.7371, lng: 7.3206 },
  "lariano": { lat: 41.7278, lng: 12.8336 },
  "velletri": { lat: 41.6886, lng: 12.7772 }
};

function findNearestCity(lat: number, lng: number): string {
  let minDistance = Infinity;
  let nearestCity = "";
  
  for (const [name, coords] of Object.entries(PROVINCES_COORDS)) {
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') continue;
    // Skip synonyms/English names to avoid duplications in output
    if (["rome", "milan", "turin", "naples", "venice", "florence", "bozen", "laquila", "laspezia"].includes(name)) {
      continue;
    }
    const dLat = lat - coords.lat;
    const dLng = lng - coords.lng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < minDistance) {
      minDistance = dist;
      nearestCity = name;
    }
  }
  
  if (!nearestCity) return "N/A";
  
  // Format the city name beautifully (e.g. "Reggio Emilia", "L'Aquila")
  return nearestCity.split(' ').map(word => {
    if (word.startsWith("l'")) {
      return "L'" + word.slice(2).charAt(0).toUpperCase() + word.slice(3);
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

const VERIFIED_REAL_PLACES: Record<string, any[]> = {
  "velletri": [
    {
      name: "Area Sosta Camper Comunale Velletri",
      category: "sosta",
      lat: 41.693045,
      lng: 12.782552,
      address: "Via del Camelieto, Velletri (RM)",
      priceEuro: 0,
      priceInfo: "Gratuito (non accessibile il giovedì mattina per mercato settimanale)",
      rating: 4.3,
      facilities: ["Acqua", "Scarico", "Illuminazione"]
    },
    {
      name: "Agricampeggio Colle dell'Acero",
      category: "campeggio",
      lat: 41.72450,
      lng: 12.80120,
      address: "Via Colle dell'Acero 14, Velletri (RM)",
      priceEuro: 15,
      priceInfo: "15€/notte, piazzole con attacco luce",
      rating: 4.6,
      facilities: ["Acqua", "Scarico", "Elettricità", "Ristorante"]
    },
    {
      name: "Parcheggio Camper Genzano di Roma",
      category: "parcheggio",
      lat: 41.70180,
      lng: 12.69530,
      address: "Via Emilia Romagna 94, Genzano di Roma (RM)",
      priceEuro: 0,
      priceInfo: "Gratuito, senza servizi, vicino al supermercato",
      rating: 3.8,
      facilities: ["Solo sosta"]
    },
    {
      name: "Punto Sosta Camper Lariano",
      category: "sosta",
      lat: 41.72620,
      lng: 12.83180,
      address: "Via Napoli, Lariano (RM)",
      priceEuro: 0,
      priceInfo: "Gratuito, punto sosta nel bosco dei Castelli Romani",
      rating: 4.0,
      facilities: ["Solo sosta", "Ombra"]
    }
  ],
  "lariano": [
    {
      name: "Punto Sosta Camper Lariano",
      category: "sosta",
      lat: 41.72620,
      lng: 12.83180,
      address: "Via Napoli, Lariano (RM)",
      priceEuro: 0,
      priceInfo: "Gratuito, punto sosta nel bosco dei Castelli Romani",
      rating: 4.0,
      facilities: ["Solo sosta", "Ombra"]
    },
    {
      name: "Area Sosta Camper Comunale Velletri",
      category: "sosta",
      lat: 41.693045,
      lng: 12.782552,
      address: "Via del Camelieto, Velletri (RM)",
      priceEuro: 0,
      priceInfo: "Gratuito (non accessibile il giovedì mattina per mercato settimanale)",
      rating: 4.3,
      facilities: ["Acqua", "Scarico", "Illuminazione"]
    }
  ]
};

async function geocodeAddress(address: string, name?: string): Promise<{ lat: number; lng: number } | null> {
  // First, check if there's a match in our verified real-world places to bypass geocoding entirely and guarantee 100% accuracy.
  const checkName = (name || "").toLowerCase().trim();
  const checkAddr = (address || "").toLowerCase().trim();

  // Custom hardcoded check for Velletri Via del Camelieto to avoid any ambiguity
  if (checkAddr.includes("camelieto") || (checkName.includes("velletri") && (checkName.includes("comunale") || checkAddr.includes("camelieto")))) {
    console.log(`[Verified Real Places Intercept] Direct match for Velletri Camper Stop: 41.693045, 12.782552`);
    return { lat: 41.693045, lng: 12.782552 };
  }

  for (const province of Object.keys(VERIFIED_REAL_PLACES)) {
    const list = VERIFIED_REAL_PLACES[province];
    for (const item of list) {
      const itemNormName = (item.name || "").toLowerCase().trim();
      const itemNormAddr = (item.address || "").toLowerCase().trim();
      
      // If the name is exactly the same, or matches very closely
      if (checkName && itemNormName && (checkName.includes(itemNormName) || itemNormName.includes(checkName))) {
        console.log(`[Verified Real Places Intercept] Found exact name match for "${name}": ${item.lat}, ${item.lng}`);
        return { lat: item.lat, lng: item.lng };
      }
      
      // If the address matches closely
      if (checkAddr && itemNormAddr && (checkAddr.includes(itemNormAddr) || itemNormAddr.includes(checkAddr))) {
        console.log(`[Verified Real Places Intercept] Found address match for "${address}": ${item.lat}, ${item.lng}`);
        return { lat: item.lat, lng: item.lng };
      }
    }
  }

  // Helper to determine if a Nominatim match is a city center/boundary fallback
  function isCityCenterFallback(result: any): boolean {
    if (!result) return true;
    const type = (result.type || "").toLowerCase();
    const resClass = (result.class || "").toLowerCase();
    
    // If the type is city/town/village/administrative/boundary, it is likely a city center fallback
    if (["city", "town", "village", "administrative", "boundary", "municipality", "county", "state", "country"].includes(type)) {
      return true;
    }
    if (resClass === "place" && ["city", "town", "village", "administrative"].includes(type)) {
      return true;
    }
    return false;
  }

  // Try to extract a specific city name from the address string
  let extractedCity = "";
  const rmMatch = address.match(/,\s*([^,()]+?)\s*(?:\([A-Z]{2}\))/i);
  if (rmMatch && rmMatch[1]) {
    extractedCity = rmMatch[1].trim();
  } else {
    const parts = address.split(",");
    if (parts.length > 1) {
      const potentialCity = parts[parts.length - 1].replace(/italy|italia/gi, '').replace(/\d+/g, '').replace(/\([A-Z]{2}\)/gi, '').trim();
      if (potentialCity) {
        extractedCity = potentialCity;
      } else {
        const potentialCity2 = parts[parts.length - 2].replace(/italy|italia/gi, '').replace(/\d+/g, '').replace(/\([A-Z]{2}\)/gi, '').trim();
        if (potentialCity2) extractedCity = potentialCity2;
      }
    }
  }

  try {
    let cleanAddress = address
      .replace(/\(.*?\)/g, '') // remove parenthesized details
      .replace(/Rif OSM:.*$/gi, '') // remove OSM reference notes
      .replace(/–/g, ' ')
      .replace(/-/g, ' ')
      .trim();

    // Map synonym spelling: "Via del Camelieto" is not in OSM, but is formerly "Via di Ponente"
    if (cleanAddress.toLowerCase().includes("camelieto")) {
      cleanAddress = cleanAddress.replace(/via( del| di)? camelieto/gi, "Via di Ponente");
    }

    // List of queries to try sequentially, from most specific to least specific
    const queryStages: string[] = [];

    // Stage 1: POI Name + City Name (highly specific, avoids non-existent street name confusion)
    if (name && extractedCity) {
      const lowerName = name.toLowerCase();
      // Only use POI name if it is specific, not a generic classification
      if (!lowerName.includes("camper service") && !lowerName.includes("parcheggio") && !lowerName.includes("scarico")) {
        queryStages.push(`${name}, ${extractedCity}, Italy`);
      }
    }

    // Stage 2: POI Name + full cleanAddress
    if (name) {
      const lowerName = name.toLowerCase();
      if (!lowerName.includes("camper service") && !lowerName.includes("parcheggio") && !lowerName.includes("scarico")) {
        queryStages.push(`${name}, ${cleanAddress}, Italy`);
      }
    }

    // Stage 3: cleanAddress alone (street address)
    queryStages.push(`${cleanAddress}, Italy`);

    // Let's execute the query stages in sequence
    let firstFallback: { lat: number; lng: number } | null = null;
    for (let i = 0; i < queryStages.length; i++) {
      const query = queryStages[i];
      console.log(`[Geocoding Stage ${i + 1}] Querying Nominatim for: "${query}"`);
      const targetUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
      
      try {
        const response = await fetch(targetUrl, {
          headers: {
            "User-Agent": "CamperCompanion/2.0 (Google AI Studio Build)"
          }
        });

        if (response.ok) {
          const results = (await response.json()) as any[];
          if (results && results.length > 0) {
            const firstResult = results[0];
            const lat = parseFloat(firstResult.lat);
            const lng = parseFloat(firstResult.lon);
            
            if (!isNaN(lat) && !isNaN(lng)) {
              // Check if it fell back to a city center coordinate
              const isFallback = isCityCenterFallback(firstResult);
              if (!isFallback) {
                console.log(`[Geocoding Success - Stage ${i + 1}] Found HIGH QUALITY coordinates: ${lat}, ${lng} for query: "${query}"`);
                return { lat, lng };
              } else {
                console.log(`[Geocoding Skip - Stage ${i + 1}] Found coordinates, but detected as city center/administrative fallback. Saving as backup...`);
                if (!firstFallback) {
                  firstFallback = { lat, lng };
                }
              }
            }
          }
        }
      } catch (err: any) {
        console.error(`[Geocoding Stage ${i + 1} Error] Failed query "${query}":`, err.message);
      }
    }

    if (firstFallback) {
      console.log(`[Geocoding Fallback] Using address-derived city center/administrative fallback coordinates: ${firstFallback.lat}, ${firstFallback.lng} for "${name || address}"`);
      return firstFallback;
    }

    console.log(`[Geocoding Status] All specific geocoding stages returned no coordinates for "${name || address}".`);
  } catch (err: any) {
    console.error(`[Geocoding Error] Failed to geocode "${address}":`, err.message);
  }
  
  // Return null only if no coordinates could be found for the address at all
  return null;
}

async function getProvinceCoordinates(province: string): Promise<{ lat: number; lng: number }> {
  const norm = province.toLowerCase().trim();
  if (PROVINCES_COORDS[norm]) {
    return PROVINCES_COORDS[norm];
  }
  
  try {
    const targetUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(province + ", Italy")}&limit=1`;
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "ViaCamperApp/2.0 (viacamperapp@gmail.com)"
      }
    });
    if (response.ok) {
      const results = (await response.json()) as any[];
      if (results && results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lon = parseFloat(results[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          console.log(`[Nominatim Fallback Geocoder] Resolved ${province} to ${lat}, ${lon}`);
          return { lat, lng: lon };
        }
      }
    }
  } catch (err) {
    console.log(`[Nominatim Fallback Geocoder] Failed to geocode ${province}, using default.`);
  }

  return { lat: 43.0, lng: 12.5 };
}



async function fetchActualOSMPlaces(province: string, coords: { lat: number; lng: number }): Promise<any[]> {
  const radiusMeters = 20000; // 20km radius around province center
  const query = `[out:json][timeout:15];
(
  node["tourism"="camp_site"](around:${radiusMeters},${coords.lat},${coords.lng});
  way["tourism"="camp_site"](around:${radiusMeters},${coords.lat},${coords.lng});
  node["tourism"="caravan_site"](around:${radiusMeters},${coords.lat},${coords.lng});
  node["caravan_site"](around:${radiusMeters},${coords.lat},${coords.lng});
  node["amenity"="sanitary_dump_station"](around:${radiusMeters},${coords.lat},${coords.lng});
);
out center;`;

  const overpassUrls = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
  ];

  const shuffledUrls = [...overpassUrls].sort(() => Math.random() - 0.5);
  for (const targetUrl of shuffledUrls) {
    try {
      console.log(`[OSM Fallback] Querying Overpass API for real places near ${province} (${coords.lat}, ${coords.lng}): ${targetUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "CamperCompanion/2.2 (github.com/google/ai-studio; viacamperapp@gmail.com)"
        },
        body: "data=" + encodeURIComponent(query),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const result = (await response.json()) as any;
        if (result && Array.isArray(result.elements) && result.elements.length > 0) {
          const places = result.elements.map((el: any) => {
            let elLat = el.lat;
            let elLng = el.lon;
            if (el.type === 'way' && el.center) {
              elLat = el.center.lat;
              elLng = el.center.lon;
            }
            if (!elLat || !elLng) return null;

            const tags = el.tags || {};
            let name = tags.name || tags.official_name || tags.alt_name || tags.short_name || tags.operator || tags.brand || tags.description;
            if (!name) {
              if (tags.tourism === 'camp_site') name = "Campeggio / Area Campismo";
              else if (tags.amenity === 'sanitary_dump_station') name = "Camper Service Carico/Scarico";
              else if (tags.tourism === 'caravan_site' || tags.caravan_site === 'regional') name = "Area Sosta Camper (OSM)";
              else name = "Sosta Camper / Parcheggio (OSM)";
            }

            let category = "sosta";
            if (tags.amenity === 'sanitary_dump_station') category = "scarico";
            else if (tags.tourism === 'camp_site') category = "campeggio";

            const street = tags["addr:street"] || "";
            const city = tags["addr:city"] || "";
            let address = [street, city].filter(Boolean).join(", ");
            if (!address) {
              address = `Rif OSM: ${el.id} (${elLat.toFixed(4)}, ${elLng.toFixed(4)})`;
            }

            let priceEuro = tags.fee === 'no' ? 0 : 15;
            let priceInfo = tags.fee === 'no' ? "Gratuito" : (tags.charge || "In loco / Da verificare");

            const facilities = ["Acqua", "Scarico"];
            if (tags.power_supply === 'yes' || tags.electricity === 'yes' || tags["power_supply:camper"] === 'yes') {
              facilities.push("Elettricità");
            }
            if (tags.internet_access === 'yes' || tags.wifi === 'yes') {
              facilities.push("Wi-Fi");
            }

            return {
              name,
              category,
              lat: Number(elLat.toFixed(5)),
              lng: Number(elLng.toFixed(5)),
              address,
              priceEuro,
              priceInfo,
              rating: Number((4.1 + Math.random() * 0.8).toFixed(1)),
              facilities,
              source: "OpenStreetMap",
              nearestCity: findNearestCity(Number(elLat.toFixed(5)), Number(elLng.toFixed(5)))
            };
          }).filter(Boolean);

          if (places.length > 0) {
            console.log(`[OSM Fallback] Successfully fetched ${places.length} real places from OpenStreetMap for ${province}!`);
            return places;
          }
        }
      }
    } catch (e) {
      console.log(`[OSM Fallback] Failed fetching from ${targetUrl}:`, e);
    }
  }
  return [];
}



async function checkContentForProfanity(content: string): Promise<{ isClean: boolean; reason?: string }> {
  try {
    const prompt = `Analizza il seguente testo. Determina se contiene parolacce, insulti, oscenità, linguaggio d'odio o esplicita volgarità. 
Rispondi in formato JSON con due campi: 
- "isClean": boolean (true se il testo è pulito, false se contiene insulti o parolacce)
- "reason": string (se isClean è false, spiega brevemente indicando la parola offensiva, altrimenti stringa vuota)

Testo da analizzare:
"${content}"`;

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isClean: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ["isClean", "reason"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    return parsed;
  } catch (err) {
    console.error("Profanity check failed, defaulting to clean", err);
    return { isClean: true }; // Fail open if API fails
  }
}

const USER_PLACES_FILE = path.join(process.cwd(), "user_places.json");

function loadUserPlaces() {
  try {
    if (fs.existsSync(USER_PLACES_FILE)) {
      const data = fs.readFileSync(USER_PLACES_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading user places file, resetting...", err);
  }
  return [];
}

function saveUserPlaces(places: any[]) {
  try {
    fs.writeFileSync(USER_PLACES_FILE, JSON.stringify(places, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing user places file:", err);
  }
}

// --- FEEDBACK & SUGGESTIONS SYSTEM ---
const FEEDBACKS_FILE = path.join(process.cwd(), "feedbacks.json");

function loadFeedbacks() {
  try {
    if (fs.existsSync(FEEDBACKS_FILE)) {
      const data = fs.readFileSync(FEEDBACKS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading feedbacks file:", err);
  }
  return [];
}

function saveFeedbacks(feedbacks: any[]) {
  try {
    fs.writeFileSync(FEEDBACKS_FILE, JSON.stringify(feedbacks, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing feedbacks file:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Start-up optimization for all large existing public/ and uploads/ images to prevent mobile browser memory crashes
  (async function optimizeExistingImages() {
    try {
      const publicDir = path.join(process.cwd(), 'public');
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const directoriesToScan = [publicDir, uploadsDir];

      for (const dir of directoriesToScan) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.startsWith('.')) continue;
          const ext = file.split('.').pop()?.toLowerCase();
          if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') {
            const filePath = path.join(dir, file);
            let stats;
            try {
              stats = fs.statSync(filePath);
            } catch (fsErr) {
              continue;
            }
            // If the image is large (above 400KB), we shrink/optimise it using sharp
            if (stats.size > 400 * 1024) {
              try {
                const buffer = fs.readFileSync(filePath);
                // Validate sharp can read metadata first
                const meta = await sharp(buffer).metadata();
                if (!meta || !meta.format) {
                  continue;
                }
                console.log(`[Startup Optimizer] Optimizing large file: ${filePath} (${(stats.size/1024/1024).toFixed(2)} MB)`);
                
                // Scale down to maximum dimension of 1024px ensuring aspect ratio is kept
                const sharpInstance = sharp(buffer).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true });
                let resizedBuffer;
                if (ext === 'png') {
                  resizedBuffer = await sharpInstance.png({ compressionLevel: 9, quality: 75 }).toBuffer();
                } else if (ext === 'webp') {
                  resizedBuffer = await sharpInstance.webp({ quality: 75 }).toBuffer();
                } else {
                  resizedBuffer = await sharpInstance.jpeg({ quality: 75, progressive: true }).toBuffer();
                }
                
                fs.writeFileSync(filePath, resizedBuffer);
                const newStats = fs.statSync(filePath);
                console.log(`[Startup Optimizer] Successfully optimized ${file}: ${(stats.size/1024/1024).toFixed(2)} MB -> ${(newStats.size/1024).toFixed(1)} KB!`);
              } catch (err: any) {
                console.warn(`[Startup Optimizer] Skipped ${file}:`, err?.message || err);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("[Startup Optimizer] Out-of-bounds error:", err);
    }
  })();

  // Middleware for parsing body
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));

  // CORS middleware to support native mobile apps, web preview, and cross-origin preflights
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    console.log(`[CORS] Request origin: ${origin || 'none'}`);
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // API proxy routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI Itinerary Generator endpoint
  app.post("/api/generate-itinerary", async (req, res) => {
    try {
      const { startLocation, endLocation, waypoints, duration, interests, travelStyle, vehicleType, vehicleDims } = req.body;

      if (!startLocation) {
        return res.status(400).json({ error: "Località di partenza obbligatoria." });
      }

      const numDays = Math.min(Math.max(Number(duration) || 3, 1), 30);
      const activeInterests = Array.isArray(interests) && interests.length > 0 ? interests.join(", ") : "Natura, Cultura, Enogastronomia";
      const style = travelStyle || "Bilanciato (ritmo medio)";
      const endDestStr = endLocation && endLocation.trim() !== "" ? ` e con destinazione finale a "${endLocation}"` : "";
      const validWaypoints = Array.isArray(waypoints) 
        ? waypoints.map((w: any) => typeof w === 'string' ? w.trim() : '').filter((w: string) => w.length > 0)
        : [];
      const waypointsStr = validWaypoints.length > 0 ? ` passando obbligatoriamente per le seguenti tappe intermedie: ${validWaypoints.map(w => `"${w}"`).join(", ")}` : "";

      const vProps = vehicleDims ? `Lunghezza: ${vehicleDims.length}m, Larghezza: ${vehicleDims.width}m, Altezza: ${vehicleDims.height}m` : "Dimensioni standard camper";
      const vType = vehicleType || "Mansardato";

      const systemInstruction = 
        "Sei 'ViaCamperApp AI', una guida turistica esperta specializzata in viaggi itineranti in camper. " +
        "Il tuo compito è generare un itinerario in camper realistico, entusiasmante e sicuro, partendo dalla località richiesta, toccando tutte le tappe intermedie inserite dall'utente (se presenti) e terminando nella località specificata (se presente, altrimenti proponi un itinerario circolare o aperto). " +
        "Fornisci consigli specifici per i camperisti (ad esempio strade strette da evitare se il mezzo è alto, aree sosta consigliate, camper service, facilità di manovra). " +
        "Qualsiasi stima del tempo di guida/al volante complessivo (campo 'totalDrivingTime') o dei singoli segmenti (campo 'drivingSegment') deve essere calcolata applicando una maggiorazione fissa del 15% rispetto ai tempi standard di un'autovettura (per tenere conto del ritmo ridotto del camper e delle andature più prudenti). " +
        "Cerca di stimare delle coordinate lat/lng realistiche in Italia o in Europa per i punti di sosta di ciascun giorno, in modo che possano essere disegnate su una mappa di sosta Leaflet. " +
        "Compila interamente tutti i campi richiesti in lingua italiana.";

      const prompt = `Genera un itinerario di viaggio in camper di ${numDays} giorni con partenza da "${startLocation}"${waypointsStr}${endDestStr}.
Dettagli di viaggio richiesti:
${validWaypoints.length > 0 ? `- Tappe intermedie richieste dall'utente: ${validWaypoints.join(" -> ")}\n` : ""}- Interessi principali: ${activeInterests}
- Stile di viaggio: ${style}
- Tipologia Mezzo: ${vType}
- Dimensioni veicolo: ${vProps}
- Fonti dati aggiuntive: Utilizza informazioni dal sito https://app.camperpass.it/#/explore per suggerire aree di sosta e attività.

CRITICO - CALCOLO TEMPI DI GUIDA (+15%):
Qualsiasi tempo di guida stimato o tempo al volante (sia nel campo 'totalDrivingTime' dell'itinerario, sia nel campo 'drivingSegment' per ciascun giorno) deve essere calcolato con una maggiorazione obbligatoria del 15% rispetto al tempo standard di percorrenza in auto (per via della velocità ridotta e del peso del camper). Inserisci questa stima incrementata del 15% direttamente nei campi di risposta.

Assicurati che ciascun giorno dell'itinerario includa un'area sosta camper o campeggio realmente esistente (o credibile) con coordinate decimali (latitudine fra 35.0 e 48.0, longitudine fra 6.0 e 19.0 se in Italia, altrimenti europee corrispondenti) per consentire la visualizzazione su mappa GPS.`;

      console.log(`[Gemini AI] Generating itinerary from ${startLocation} for ${numDays} days...`);

      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { 
                type: Type.STRING,
                description: "Titolo accattivante per l'itinerario in camper, es: 'La Via del Chianti in Mansardato'"
              },
              description: { 
                type: Type.STRING, 
                description: "Breve sommario descrittivo del viaggio e delle atmosfere"
              },
              totalKm: { 
                type: Type.STRING,
                description: "Chilometri stimati totali da percorrere, es: '210 km'"
              },
              totalDrivingTime: { 
                type: Type.STRING,
                description: "Tempo di guida complessivo stimato con l'aumento del 15% già calcolato, es: '4 ore e 50 minuti'"
              },
              days: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dayNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING, description: "Focus o tappe del giorno, es: 'Giorno 1: Arrivo a Siena e colli senesi'" },
                    description: { type: Type.STRING, description: "Cosa si visiterà e l'itinerario stradale descrittivo della giornata" },
                    stopPlaceName: { type: Type.STRING, description: "Nome dell'Area Sosta Camper o Campeggio consigliato per la notte" },
                    drivingSegment: { type: Type.STRING, description: "Segmento stradale del giorno con tempo di guida stimato con l'aumento del 15% già calcolato, es: 'Firenze -> Siena (75km, 1h 20m)'" },
                    activities: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Lista di 2-4 cose specifiche da fare o posti da vedere"
                    },
                    camperTips: { 
                      type: Type.STRING, 
                      description: "Consiglio specifico per camperisti legato alle dimensioni del veicolo, alle pendenze, o ai servizi dell'area sosta" 
                    },
                    stopCoordinate: {
                      type: Type.OBJECT,
                      properties: {
                        lat: { type: Type.NUMBER, description: "Latitudine reale o stima coerente per il punto sosta camper (es. 43.318)" },
                        lng: { type: Type.NUMBER, description: "Longitudine reale o stima coerente per il punto sosta camper (es. 11.332)" },
                        label: { type: Type.STRING, description: "Etichetta del marker sulla mappa, es: 'Area sosta Fagiolone Siena'" }
                      },
                      required: ["lat", "lng", "label"]
                    }
                  },
                  required: ["dayNumber", "title", "description", "stopPlaceName", "drivingSegment", "activities", "camperTips", "stopCoordinate"]
                }
              }
            },
            required: ["title", "description", "totalKm", "days"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Gemini ha restituito un corpo vuoto.");
      }

      const itinerary = JSON.parse(responseText.trim());
      res.json({ success: true, itinerary });
    } catch (err: any) {
      console.log("[AI Itinerary Info]: Error generated during AI itinerary.", err.message);
      res.status(500).json({ error: "Errore durante la generazione dell'itinerario AI: " + getFriendlyGeminiError(err) });
    }
  });

  // Search local events via Gemini AI with Google Search Grounding
  app.post("/api/search-events", async (req, res) => {
    try {
      const { location } = req.body;
      if (!location) {
        return res.status(400).json({ error: "Location is required" });
      }

      console.log(`[Gemini AI] Searching events for: ${location}...`);
      
      const prompt = `Cerca sul web eventi locali, sagre, feste di paese, festival e fiere in programma nei prossimi giorni o settimane nella zona di: "${location}". 
Formatta la risposta in modo chiaro usando markdown. USA OBBLIGATORIAMENTE un titolo di livello 3 (###) per il nome di ogni singolo evento per separarli visivamente l'uno dall'altro. Aggiungi sempre una riga vuota tra un evento e l'altro. Includi date, descrizioni brevi e metti in evidenza informazioni utili per chi viaggia in camper (es. parcheggi, aree di sosta vicine).`;

      let response;
      try {
        response = await generateContentWithRetry({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }]
          }
        });
      } catch (groundingErr: any) {
        console.log(`[AI Events Info] Search grounding tool hit a limit/error. Falling back to standard Gemini...`, groundingErr.message);
        // Fall back to standard content generation if search tool is rate-limited
        response = await generateContentWithRetry({
          model: "gemini-3.5-flash",
          contents: `Consiglia i principali eventi annuali tradizionali, sagre storiche, mercatini e feste famose che si tengono ricorrentemente nella zona di: "${location}". 
Formatta in markdown chiaro usando titoli di livello 3 (###) per ciascun evento. Aggiungi consigli utili per la sosta camper nelle vicinanze.`
        });
      }

      res.json({ eventsText: response.text });
    } catch (err: any) {
      console.log("[AI Events Info]: Error generated during AI events search.", err.message);
      res.status(500).json({ error: "Errore durante la ricerca eventi: " + getFriendlyGeminiError(err) });
    }
  });

  // Bulk import places in a province or near GPS coordinates using Gemini with Google Search Grounding
  app.post("/api/admin/generate-province-places", async (req, res) => {
    let province = "";
    try {
      province = (req.body.province || "").trim();
      const reqLat = req.body.lat !== undefined && req.body.lat !== null ? parseFloat(req.body.lat) : undefined;
      const reqLng = req.body.lng !== undefined && req.body.lng !== null ? parseFloat(req.body.lng) : undefined;
      const hasCoordinates = reqLat !== undefined && !isNaN(reqLat) && reqLng !== undefined && !isNaN(reqLng);

      if (!province && !hasCoordinates) {
        return res.status(400).json({ error: "Specificare una provincia/località o rilevare la posizione GPS." });
      }

      if (!province && hasCoordinates) {
        province = findNearestCity(reqLat!, reqLng!) || `Zona (${reqLat!.toFixed(3)}, ${reqLng!.toFixed(3)})`;
      }

      const geoDescription = hasCoordinates
        ? `nel raggio di 25-30 km attorno alla posizione GPS (${reqLat!.toFixed(4)}, ${reqLng!.toFixed(4)}) - territorio di "${province}" (Italia)`
        : `nel territorio di "${province}" (Italia) o nelle immediate vicinanze`;

      // 1. Skip cache check as requested: always execute a real-time web search to fetch updated data
      console.log(`[Fresh Search Mandated] Bypassing cache to execute real-time search for: ${geoDescription}`);

      console.log(`[Gemini AI with Search Grounding] Discovering POIs for ${geoDescription}...`);

      try {
        // Step 1: Use Google Search Grounding to find actual real, active places
        const searchPrompt = `Cerca sul web (usando Google Search Grounding) reali, esistenti, attivi ed ufficiali punti di sosta camper, aree di sosta attrezzate, campeggi o camper service (carico/scarico acque) situati ${geoDescription}.
Esegui una ricerca approfondita e ad ampio spettro che interroghi e combini i risultati provenienti sia da Camperpass.it sia da tutti gli altri principali portali specializzati italiani ed europei. Non limitarti ad un solo portale: vogliamo ottenere la massima copertura raccogliendo tutti i punti sosta reali documentati in uno o più di questi siti:
- Camperpass.it
- Camperonline.it
- Park4night.com
- Campercontact.com
- area-sosta-camper.it
- Caramaps / CaraMaps.com
- Campermaps.com
- viacamper.app
- Associazionecamperistiarianna.it (aree sosta Arianna)
- Siti ufficiali di enti turistici e comuni locali della zona

Elenchi SOLO luoghi che esistono realmente e sono ampiamente documentati su questi siti. 
ATTENZIONE CRITICA: Non inventare o allucinare NOMI o INDIRIZZI che non esistono sul web. Se per "${province}" esistono solo pochissimi luoghi reali o nessuno, restituisci solo quelli realmente esistenti o non restituirne affatto. Non forzare l'inserimento di luoghi fittizi.`;

        console.log(`[Gemini AI Search] Querying web search for real camper facilities ${geoDescription}...`);
        const searchResponse = await generateContentWithRetry({
          model: "gemini-3.5-flash",
          contents: searchPrompt,
          config: {
            tools: [{ googleSearch: {} }]
          }
        });

        const rawSearchText = searchResponse.text;
        console.log(`[Gemini AI Search] Web search result received. Now parsing into JSON...`);

        // Step 2: Use Gemini with JSON schema to convert the grounded web search text into the correct JSON structure
        const parseSystemInstruction = `Sei un assistente esperto, preciso e rigoroso. Il tuo compito è analizzare i risultati di una ricerca web relativi ad aree sosta camper reali e formattarli in un JSON valido.
REGOLE DI RIGORE ASSOLUTO:
- Includi SOLO ed ESCLUSIVAMENTE i luoghi esplicitamente presenti e documentati come reali nel testo fornito.
- È SEVERAMENTE VIETATO inventare, presumere o allucinare nuovi luoghi, nomi, indirizzi o dettagli che non siano presenti nel testo della ricerca web.
- Se il testo della ricerca contiene solo pochi luoghi reali (o nessuno), restituisci solo quelli identificati. Non aggiungere luoghi fittizi per "riempire" la lista.
- Per ciascun luogo reale estratto:
  1. Mantieni il nome e l'indirizzo reale trovato.
  2. Identifica la categoria: "sosta" (area sosta attrezzata), "campeggio" (camping), "parcheggio" (parcheggio generico dove è tollerata la sosta camper), "scarico" (camper service, solo carico/scarico).
  3. Trova le coordinate GPS (latitudine e longitudine) REALI e ACCURATE del luogo. Se non esplicitate nel testo, calcolale in modo accurato e veritiero per la posizione reale dell'indirizzo nel comune di riferimento.
  4. Compila fedelmente i prezzi (priceEuro e priceInfo) e i servizi (facilities) sulla base delle informazioni reali.
  5. Identifica e compila il campo "source" (fonte) per ciascun luogo reale sulla base del portale o sito da cui sono stati estratti i dati (es. "Camperpass.it", "Camperonline.it", "Park4night", "Campercontact", ecc.).
La tua risposta deve essere ESATTAMENTE e SOLO l'oggetto JSON richiesto. Nessun commento aggiuntivo.`;

        const parsePrompt = `Dati i seguenti risultati reali di ricerca web:
"""
${rawSearchText}
"""

Estrai e formatta i luoghi reali in formato JSON aderente a questo schema:
{
  "places": [
    {
      "name": "Nome reale",
      "category": "sosta",
      "lat": 41.12345,
      "lng": 12.12345,
      "address": "Via reale, Comune (Provincia)",
      "priceEuro": 12,
      "priceInfo": "12€/24h",
      "rating": 4.5,
      "facilities": ["Acqua", "Scarico", "Elettricità"],
      "source": "Camperpass.it"
    }
  ]
}`;

        const parseResponse = await generateContentWithRetry({
          model: "gemini-3.5-flash",
          contents: parsePrompt,
          config: {
            systemInstruction: parseSystemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                places: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      category: { type: Type.STRING },
                      lat: { type: Type.NUMBER },
                      lng: { type: Type.NUMBER },
                      address: { type: Type.STRING },
                      priceEuro: { type: Type.NUMBER },
                      priceInfo: { type: Type.STRING },
                      rating: { type: Type.NUMBER },
                      facilities: { type: Type.ARRAY, items: { type: Type.STRING } },
                      source: { type: Type.STRING, description: "La fonte web da cui è stato estratto il luogo (es. Camperpass.it, Camperonline.it, Park4night, OpenStreetMap)" }
                    },
                    required: ["name", "category", "lat", "lng", "address", "priceEuro", "priceInfo", "rating", "facilities", "source"]
                  }
                }
              },
              required: ["places"]
            }
          }
        });

        const parsed = JSON.parse(parseResponse.text);
        if (parsed && Array.isArray(parsed.places)) {
          const validPlaces = parsed.places.filter((p: any) => p && p.name && p.lat && p.lng);
          if (validPlaces.length > 0) {
            // Geocode and refine coordinates of each place using real-world Nominatim API to fix any Gemini coordinate guessing issues.
            const enriched = [];
            for (const p of validPlaces) {
              let lat = p.lat;
              let lng = p.lng;
              
              const refinedCoords = await geocodeAddress(p.address, p.name);
              if (refinedCoords) {
                lat = refinedCoords.lat;
                lng = refinedCoords.lng;
                console.log(`[Coordinate Refined] Refined coordinates of "${p.name}" to ${lat}, ${lng} (was ${p.lat}, ${p.lng})`);
              } else {
                console.log(`[Coordinate Refinement] Keeping original coordinates for "${p.name}": ${lat}, ${lng}`);
              }

              enriched.push({
                ...p,
                lat,
                lng,
                nearestCity: p.nearestCity || findNearestCity(lat, lng)
              });
            }

            saveCachedProvincePlaces(province, enriched);
            return res.json({ places: enriched });
          }
        }
        throw new Error("Nessun luogo valido trovato o errore di parsing JSON");
      } catch (geminiErr: any) {
        console.log(`[Gemini AI Info] IA o Grounding non disponibile per ${province} (${geminiErr.message || geminiErr}). Carico sosta reali.`);
        try {
          const norm = province.toLowerCase().trim();
          if (VERIFIED_REAL_PLACES[norm]) {
            console.log(`[Fallback Verified Real Places Hit] Returning 100% verified real places for: ${province}`);
            const enriched = VERIFIED_REAL_PLACES[norm].map((p: any) => ({
              ...p,
              source: "Database Certificato ViaCamper",
              nearestCity: p.nearestCity || findNearestCity(p.lat, p.lng)
            }));
            saveCachedProvincePlaces(province, enriched);
            return res.json({ places: enriched, isFallback: true });
          }
          const coords = hasCoordinates ? { lat: reqLat!, lng: reqLng! } : await getProvinceCoordinates(province);
          const realPlaces = await fetchActualOSMPlaces(province, coords);
          if (realPlaces && realPlaces.length > 0) {
            const mappedPlaces = realPlaces.map((p: any) => ({
              ...p,
              source: p.source || "OpenStreetMap"
            }));
            saveCachedProvincePlaces(province, mappedPlaces);
            return res.json({ places: mappedPlaces, isFallback: true, isOSM: true });
          } else {
            console.log(`[OpenStreetMap Fallback] Nessun risultato sosta reale da OSM per ${province}.`);
            return res.status(404).json({ 
              error: `Non è stato possibile individuare aree di sosta camper reali e certificate per la provincia o località "${province}" su OpenStreetMap o tramite ricerca web. Inserisci l'area manualmente.` 
            });
          }
        } catch (fallbackErr: any) {
          console.error("Errore durante il recupero dei POI:", fallbackErr);
          return res.status(404).json({ 
            error: `Non è stato possibile caricare aree reali da OpenStreetMap o tramite ricerca live per "${province}". Riprova più tardi o inserisci l'area manualmente.` 
          });
        }
      }
    } catch (err: any) {
      console.log(`[Gemini AI Info] Errore generale ricerca POI per ${province}.`);
      try {
        const norm = province.toLowerCase().trim();
        if (VERIFIED_REAL_PLACES[norm]) {
          console.log(`[Fallback Verified Real Places Hit] Returning 100% verified real places for: ${province}`);
          const enriched = VERIFIED_REAL_PLACES[norm].map((p: any) => ({
            ...p,
            source: "Database Certificato ViaCamper",
            nearestCity: p.nearestCity || findNearestCity(p.lat, p.lng)
          }));
          saveCachedProvincePlaces(province, enriched);
          return res.json({ places: enriched, isFallback: true });
        }
        const coords = (req.body.lat && req.body.lng) ? { lat: parseFloat(req.body.lat), lng: parseFloat(req.body.lng) } : await getProvinceCoordinates(province);
        const realPlaces = await fetchActualOSMPlaces(province, coords);
        if (realPlaces && realPlaces.length > 0) {
          const mappedPlaces = realPlaces.map((p: any) => ({
            ...p,
            source: p.source || "OpenStreetMap"
          }));
          saveCachedProvincePlaces(province, mappedPlaces);
          return res.json({ places: mappedPlaces, isFallback: true, isOSM: true });
        } else {
          return res.status(404).json({ 
            error: `Nessuna area di sosta camper reale trovata per la provincia o località "${province}" su OpenStreetMap o tramite ricerca web.` 
          });
        }
      } catch (fallbackErr: any) {
        return res.status(400).json({ 
          error: `Errore durante il caricamento dei dati reali per la provincia o località "${province}". Verifica la connessione o inserisci l'area manualmente.` 
        });
      }
    }
  });

  // AI Checklist Generator endpoint
  app.post("/api/generate-checklist", async (req, res) => {
    try {
      const { destinationType, season, crew, parkingStyle, additionalNotes } = req.body;

      const systemInstruction = 
        "Sei 'ViaCamperApp AI', l'assistente camperista intelligente. Il tuo obiettivo è generare controlli di sicurezza, sosta pre-partenza ed equipaggiamento personalizzati per un viaggio in camper sulla base delle specifiche fornite dall'utente.\n" +
        "Le categorie possibili in cui dividere e allocare ciascun elemento sono TASSATIVAMENTE le seguenti quattro:\n" +
        "1. 'Partenza': riguardanti le fasi di preparazione del mezzo immediatamente prima dello sblocco freno a mano e accensione motore (es. chiudere oblò, bloccare sportelli, chiudere gas).\n" +
        "2. 'Sosta': riguardanti la sosta e l'installazione all'arrivo (es. livellamento con cunei, allacciamento corrente 230V, scarico grigie).\n" +
        "3. 'Sicurezza': riguardanti strumenti salvavita, documenti, controlli meccanici profondi, kit medici o dotazioni neve/fango.\n" +
        "4. 'Alimentari & Cucina': per l'approvvigionamento cambusa, bombole gas, rifornimento acqua potabile e utensili specifici per cucinare in camper.\n\n" +
        "Rispondi esclusivamente in formato JSON valido aderente allo schema strutturato.";

      const prompt = `Genera una checklist intelligente di controlli e attrezzature per questo viaggio in camper:
- Destinazione: ${destinationType || "Non specificata"}
- Stagione: ${season || "Qualsiasi"}
- Equipaggio: ${crew || "Equipaggio standard"}
- Tipo di sosta: ${parkingStyle || "Misto"}
${additionalNotes ? `- Dettagli aggiuntivi: ${additionalNotes}` : ""}

Genera circa 12-16 controlli e avvisi specifici ed estremamente utili per questa esatta combinazione di fattori, distribuiti in modo sensato tra le 4 categorie elencate. Evita consigli troppo banali o generali, focalizzati sulle precauzioni tecniche, la sicurezza del mezzo e il benessere dell'equipaggio specifico (ad esempio: se ci sono cani/bambini o se fa freddo).`;

      console.log(`[Gemini AI] Generating custom checklist for: Destination=${destinationType}, Season=${season}, Crew=${crew}...`);

      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { 
                      type: Type.STRING, 
                      description: "Azione pratica e dettagliata da verificare o inserire in lista (es: 'Verifica le catene da neve a bordo ed esercitata a montarle' o 'Fissa le staffe delle biciclette sul portabici posteriore')" 
                    },
                    category: { 
                      type: Type.STRING, 
                      description: "Categoria obbligatoria dell'elemento. Deve essere uno tra: 'Partenza', 'Sosta', 'Sicurezza', 'Alimentari & Cucina'." 
                    }
                  },
                  required: ["text", "category"]
                }
              }
            },
            required: ["items"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Gemini ha restituito un corpo della checklist vuoto.");
      }

      const parsed = JSON.parse(responseText.trim());
      
      // Clean and validate categories to prevent typescript errors on client
      const validCategories = ['Partenza', 'Sosta', 'Sicurezza', 'Alimentari & Cucina'];
      const validatedItems = (parsed.items || []).map((item: any) => {
        let cat = item.category;
        if (!validCategories.includes(cat)) {
          // Map approximate category names just in case
          if (cat === 'Alimentari' || cat === 'Cucina' || cat.toLowerCase().includes('alimentari')) {
            cat = 'Alimentari & Cucina';
          } else if (cat.toLowerCase().includes('partenza')) {
            cat = 'Partenza';
          } else if (cat.toLowerCase().includes('sosta')) {
            cat = 'Sosta';
          } else {
            cat = 'Sicurezza'; // fallback
          }
        }
        return {
          text: item.text,
          category: cat
        };
      });

      res.json({ success: true, items: validatedItems });
    } catch (err: any) {
      console.log("[AI Checklist Info]: Error generated during AI checklist.", err.message);
      res.status(500).json({ error: "Errore durante la generazione della checklist AI: " + getFriendlyGeminiError(err) });
    }
  });

  // Explicit endpoint for service worker to bypass any static routing issues in development/production
  app.get("/sw.js", (req, res) => {
    const swPath = path.join(process.cwd(), "public", "sw.js");
    if (fs.existsSync(swPath)) {
      res.type('application/javascript');
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.sendFile(swPath);
    } else {
      res.status(404).send("Service worker file not found on disk");
    }
  });

  // Explicit endpoint for manifest.json
  app.get("/manifest.json", (req, res) => {
    const manifestPath = path.join(process.cwd(), "public", "manifest.json");
    if (fs.existsSync(manifestPath)) {
      res.type('application/json');
      res.sendFile(manifestPath);
    } else {
      res.status(404).send("Manifest file not found on disk");
    }
  });

  // --- USER PROPOSED PLACES SYSTEM IN FIRESTORE ---
  // Get all approved custom places
  app.get("/api/public-places", async (req, res) => {
    try {
      const snapshot = await firestoreDb.collection("places").where("status", "==", "approved").get();
      const approved: any[] = [];
      snapshot.forEach((doc: any) => {
        approved.push({ id: doc.id, ...doc.data() });
      });
      res.json(approved);
    } catch (err: any) {
      console.error("Error fetching approved places from Firestore:", err);
      // Fallback to local files in case Firestore is unreachable
      const list = loadUserPlaces();
      const approved = list.filter((p: any) => p.status === "approved");
      res.json(approved);
    }
  });

  // Get all pending custom places (for administrator moderation)
  app.get("/api/admin/pending-places", async (req, res) => {
    try {
      const snapshot = await firestoreDb.collection("places").where("status", "==", "pending").get();
      const pending: any[] = [];
      snapshot.forEach((doc: any) => {
        pending.push({ id: doc.id, ...doc.data() });
      });
      res.json(pending);
    } catch (err: any) {
      console.error("Error fetching pending places from Firestore:", err);
      const list = loadUserPlaces();
      const pending = list.filter((p: any) => p.status === "pending");
      res.json(pending);
    }
  });

  // General Profanity Check Endpoint
  app.post("/api/check-profanity", async (req, res) => {
    try {
      const { text, author, type } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Testo mancante." });
      }

      const profanityResult = await checkContentForProfanity(text);
      
      if (!profanityResult.isClean) {
        await firestoreDb.collection("adminNotifications").add({
          type: type === 'review' ? "rejected_review" : "rejected_content",
          reason: profanityResult.reason,
          author: author || "Anonimo",
          content: text,
          timestamp: new Date().toISOString()
        });
        
        return res.status(400).json({ error: "non è una recensione o proposta pubblicabile" });
      }
      
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error in check-profanity endpoint:", err);
      res.status(500).json({ error: "Unknown error" });
    }
  });

  // AI OCR & Extraction of Tariffs & Facilities from a photo of a signboard/price list
  app.post("/api/extract-tariffs-from-image", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Nessuna immagine fornita per l'estrazione." });
      }

      // Clean base64 string
      let cleanBase64 = image;
      let detectedMime = mimeType || "image/jpeg";
      if (typeof image === "string" && image.startsWith("data:")) {
        const match = image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (match) {
          detectedMime = match[1];
          cleanBase64 = match[2];
        } else {
          cleanBase64 = image.split(",")[1] || image;
        }
      }

      console.log(`[Gemini AI] Extracting tariffs from image (mime: ${detectedMime}, len: ${cleanBase64.length})...`);

      const systemInstruction =
        "Sei l'assistente esperto di ViaCamper specializzato nella lettura, OCR e interpretazione di cartelli informativi, tabelle prezzi, orari e regolamenti di aree sosta camper, campeggi, agrisosta e punti sosta. " +
        "Il tuo compito è esaminare l'immagine fornita, leggere con la massima precisione i prezzi e le tariffe indicate (anche scritte a mano, tabelle complesse, prezzi orari, giornalieri, 24 ore, tariffe stagionali alta/media/bassa stagione, supplementi per allaccio luce 220V, gettoni docce calde, tassa di soggiorno, carico/scarico acque reflue). " +
        "Estrai i dati in un formato JSON strutturato e accurato. Se una tariffa o un servizio non è chiaramente visibile, ometti solo ciò che non è leggibile senza inventare valori irrealistici.";

      const promptText =
        "Analizza con precisione questa fotografia di un cartello o tabella tariffe per area sosta camper / campeggio. " +
        "1. Estrai tutte le tariffe e fasce di prezzo elencate (periodo/descrizione, prezzo in Euro, unità es. 'a notte (24h)', 'al giorno', 'a persona', 'a sosta', 'a gettone / ora', 'a consumo', e note opzionali con inclusioni/esclusioni). " +
        "2. Fornisci un testo sintetico della tariffa principale (es: 'Da 15€ a 25€/notte', '18€/24h con elettricità', oppure 'Gratuito'). " +
        "3. Estrai il prezzo base o minimo numerico in Euro (es: 15). " +
        "4. Riconosci se sul cartello sono menzionati o indicati pittogrammi dei servizi tra: WiFi, Attacco 220V, Scarico Acque, Carico Acqua, Bagni, Docce, Cani Ammessi, Illuminato, Videosorvegliato, Raccolta Rifiuti. " +
        "5. Estrai l'eventuale nome della struttura o indicazioni di apertura/orari/regolamento (es. sosta max 48h, check-in 08-20).";

      const imagePart = {
        inlineData: {
          mimeType: detectedMime,
          data: cleanBase64,
        },
      };

      const textPart = {
        text: promptText,
      };

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              priceInfo: {
                type: Type.STRING,
                description: "Sintesi tariffaria es: '15€/notte', 'Da 12€ a 22€/notte' o 'Gratuito'",
              },
              priceEuro: {
                type: Type.NUMBER,
                description: "Prezzo base indicativo a notte in euro (0 se gratuito)",
              },
              seasonalPrices: {
                type: Type.ARRAY,
                description: "Elenco delle tariffe per stagione, durata, sosta o singoli servizi",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    period: {
                      type: Type.STRING,
                      description: "Periodo o nome tariffa (es: 'Alta Stagione (Luglio - Agosto)', 'Sosta 24h', 'Allaccio 220V', 'Solo C/S')",
                    },
                    priceEuro: {
                      type: Type.NUMBER,
                      description: "Prezzo numerico in euro (es: 18 o 5)",
                    },
                    unit: {
                      type: Type.STRING,
                      description: "Unità (es: 'a notte (24h)', 'al giorno', 'a persona', 'a sosta', 'a gettone / ora', 'a consumo')",
                    },
                    notes: {
                      type: Type.STRING,
                      description: "Eventuali dettagli: es. 'Luce inclusa', 'Minimo 2 notti', 'Docce 1€'",
                    },
                  },
                  required: ["period", "priceEuro", "unit"],
                },
              },
              facilities: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Servizi identificati sul cartello tra: 'WiFi', 'Attacco 220V', 'Scarico Acque', 'Carico Acqua', 'Bagni', 'Docce', 'Cani Ammessi', 'Illuminato', 'Videosorvegliato', 'Raccolta Rifiuti'",
              },
              detectedPlaceName: {
                type: Type.STRING,
                description: "Nome della struttura se presente nell'insegna del cartello (altrimenti stringa vuota)",
              },
              descriptionNotes: {
                type: Type.STRING,
                description: "Note su orari, regole di sosta o particolarità lette dal cartello",
              },
              summaryMessage: {
                type: Type.STRING,
                description: "Breve frase in italiano di riepilogo (es: 'Rilevate 3 tariffe stagionali e allaccio corrente')",
              },
            },
            required: ["priceInfo", "priceEuro", "seasonalPrices"],
          },
        },
      });

      const responseText = response && response.text ? response.text.trim() : "{}";
      const parsedData = JSON.parse(responseText);

      // Add unique IDs to seasonal prices if missing
      if (Array.isArray(parsedData.seasonalPrices)) {
        parsedData.seasonalPrices = parsedData.seasonalPrices.map((sp: any, i: number) => ({
          id: sp.id || `sp_ai_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
          period: sp.period || "Tariffa",
          priceEuro: typeof sp.priceEuro === 'number' ? sp.priceEuro : (parseFloat(sp.priceEuro) || 0),
          unit: sp.unit || "a notte (24h)",
          notes: sp.notes || ""
        }));
      } else {
        parsedData.seasonalPrices = [];
      }

      res.json({
        success: true,
        ...parsedData
      });
    } catch (err: any) {
      console.error("Error in extract-tariffs-from-image endpoint:", err);
      const friendlyMsg = getFriendlyGeminiError(err);
      res.status(500).json({
        error: friendlyMsg || "Impossibile analizzare l'immagine del tariffario. Assicurati che il testo sia nitido e ben illuminato.",
      });
    }
  });

  // Propose a new place
  app.post("/api/propose-place", async (req, res) => {
    try {
      const newPlace = req.body;
      if (!newPlace.name || !newPlace.category || !newPlace.lat || !newPlace.lng) {
        return res.status(400).json({ error: "Dati obbligatori mancanti: nome, categoria, latitudine o longitudine." });
      }

      // Check for profanity
      const textToCheck = `${newPlace.name} ${newPlace.address || ''} ${newPlace.description || ''}`;
      const profanityResult = await checkContentForProfanity(textToCheck);
      
      if (!profanityResult.isClean) {
        // Log rejected proposal for admin
        await firestoreDb.collection("adminNotifications").add({
          type: "rejected_proposal",
          reason: profanityResult.reason,
          author: newPlace.createdBy || "Anonimo",
          content: textToCheck,
          timestamp: new Date().toISOString()
        });
        
        return res.status(400).json({ error: "non è una recensione o proposta pubblicabile" });
      }

            const placeId = `user_place_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      let imageUrl = newPlace.imageUrl;
      if (!imageUrl && defaultIcons[newPlace.category]) {
          imageUrl = `https://storage.googleapis.com/${bucket.name}/${defaultIcons[newPlace.category]}`;
      }
      if (!imageUrl) {
          imageUrl = 'https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600';
      }
      
      if (typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
        const base64Data = imageUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `places/${placeId}.jpg`;
        const file = bucket.file(filename);
        
        const { randomUUID } = require('crypto');
        const downloadToken = randomUUID();
        
        await file.save(buffer, { 
          contentType: 'image/jpeg',
          metadata: {
            metadata: {
              firebaseStorageDownloadTokens: downloadToken
            }
          }
        });
        
        try {
          await file.makePublic();
          imageUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        } catch (e) {
          console.warn("[Places API] makePublic failed, using authenticated URL with token");
          imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${downloadToken}`;
        }
      }
      
      const entry = {
        name: newPlace.name,
        category: newPlace.category,
        lat: Number(newPlace.lat),
        lng: Number(newPlace.lng),
        address: newPlace.address || "",
        description: newPlace.description || "",
        priceInfo: newPlace.priceInfo || "Gratuito",
        priceEuro: Number(newPlace.priceEuro) || 0,
        seasonalPrices: Array.isArray(newPlace.seasonalPrices) ? newPlace.seasonalPrices : [],
        phone: newPlace.phone || "",
        imageUrl: imageUrl,
        facilities: newPlace.facilities || [],
        hasMaxHeightLimit: newPlace.hasMaxHeightLimit ?? false,
        maxHeight: newPlace.maxHeight !== undefined ? Number(newPlace.maxHeight) : null,
        hasMaxWeightLimit: newPlace.hasMaxWeightLimit ?? false,
        maxWeight: newPlace.maxWeight !== undefined ? Number(newPlace.maxWeight) : null,
        isNarrowAccess: newPlace.isNarrowAccess ?? false,
        rating: Number(newPlace.rating) || 5,
        reviews: newPlace.reviews || [],
        createdBy: newPlace.createdBy || "",
        status: newPlace.proposedBy === "AI Gemini" ? "approved" : "pending",
        createdAt: new Date().toISOString()
      };

      await firestoreDb.collection("places").doc(placeId).set(removeUndefined(entry));
      console.log(`[Firestore Sync] Proposed new place: ${entry.name} (${placeId})`);
      
      if (entry.status === "pending") {
          await notifyModerators("places", "Nuova Sosta Proposta", `Una nuova sosta è in attesa di approvazione: ${entry.name}`, { placeId });
      }

      // Write into local user_places.json as a backup
      try {
        const list = loadUserPlaces();
        list.push({ id: placeId, ...entry });
        saveUserPlaces(list);
      } catch (backErr) {
        // Safe to ignore
      }

      const targetAdminEmail = process.env.ADMIN_EMAIL || "viacamperapp@gmail.com";
      if (entry.status === "pending") {
        const placeHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 24px; border-radius: 16px;">
            <div style="background: linear-gradient(135deg, #1C3D2B 0%, #2D5A40 100%); padding: 20px; border-radius: 12px; color: white;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #a7f3d0; margin-bottom: 4px;">ViaCamperApp • Notifica Amministratore</div>
              <h2 style="margin: 0; color: #ffffff; font-size: 20px;">📍 Nuova Proposta di Sosta</h2>
            </div>
            <div style="background: #ffffff; padding: 22px; border-radius: 12px; margin-top: 16px; border: 1px solid #e2e8f0;">
              <p style="font-size: 14px; color: #1e293b; margin-top: 0;">Un utente ha proposto una nuova struttura ed è in attesa di approvazione:</p>
              <table style="width: 100%; font-size: 13.5px; color: #334155; border-collapse: collapse; margin-top: 12px;">
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; font-weight: 600; width: 130px;">Nome Sosta:</td>
                  <td style="padding: 8px 0;">${entry.name}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; font-weight: 600;">Categoria:</td>
                  <td style="padding: 8px 0;">${entry.category}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; font-weight: 600;">Indirizzo:</td>
                  <td style="padding: 8px 0;">${entry.address || 'N/D'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; font-weight: 600;">Tariffa / Costo:</td>
                  <td style="padding: 8px 0;">${entry.priceInfo || (entry.priceEuro ? `${entry.priceEuro}€` : 'Gratuito')}</td>
                </tr>
                ${entry.seasonalPrices && entry.seasonalPrices.length > 0 ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; font-weight: 600; vertical-align: top;">Listino periodi:</td>
                  <td style="padding: 8px 0;">
                    <ul style="margin: 0; padding-left: 18px;">
                      ${entry.seasonalPrices.map((sp: any) => `<li><strong>${sp.period}</strong>: ${sp.priceEuro}€ ${sp.unit || ''} ${sp.notes ? `(${sp.notes})` : ''}</li>`).join('')}
                    </ul>
                  </td>
                </tr>` : ''}
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; font-weight: 600;">Inviata da:</td>
                  <td style="padding: 8px 0;">${entry.createdBy || 'Anonimo'}</td>
                </tr>
              </table>
              <div style="margin-top: 24px;">
                <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Puoi approvare questa sosta dal pannello Amministrazione o dalla Mappa.</p>
              </div>
            </div>
          </div>
        `;
        sendAdminNotificationEmail(`📍 Nuova proposta di sosta da approvare: ${entry.name}`, placeHtml).catch(e => console.error(e));
      }

      res.json({ success: true, place: { id: placeId, ...entry } });
    } catch (err: any) {
      console.error("Error proposing place to Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown error inside server" });
    }
  });

  // Get pending places for admin moderation
  app.get("/api/admin/pending-places", async (req, res) => {
    try {
      const places: any[] = [];
      try {
        const snapshot = await firestoreDb.collection("places").where("status", "==", "pending").get();
        snapshot.forEach((doc: any) => {
          places.push({ id: doc.id, ...doc.data() });
        });
      } catch (fsErr: any) {
        console.warn("[Admin API] Error fetching pending places from Firestore, falling back to full places scan:", fsErr?.message);
        try {
          const snapshot = await firestoreDb.collection("places").get();
          snapshot.forEach((doc: any) => {
            const data = doc.data() || {};
            if (data.status === "pending") {
              places.push({ id: doc.id, ...data });
            }
          });
        } catch (scanErr) {
          console.warn("[Admin API] Full scan failed:", scanErr);
        }
      }

      // Fallback to local user places if empty or Firestore was offline
      if (places.length === 0) {
        try {
          const list = loadUserPlaces().filter((p: any) => p.status === "pending");
          list.forEach((p: any) => {
            if (!places.some(item => item.id === p.id)) {
              places.push(p);
            }
          });
        } catch (e) {
          // ignore
        }
      }

      // Sort newest first
      places.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      res.json(places);
    } catch (err: any) {
      console.error("Error in /api/admin/pending-places:", err);
      res.json([]);
    }
  });

  // Approve a pending place (Admin action)
  app.post("/api/admin/approve-place", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "ID mancante." });
      }

      const docRef = firestoreDb.collection("places").doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: "Punto sosta non trovato." });
      }

      await docRef.update({ status: "approved" });
      console.log(`[Firestore Sync] Approved place ID: ${id}`);

      // Sync local backup too
      try {
        const list = loadUserPlaces();
        const item = list.find((p: any) => p.id === id);
        if (item) {
          item.status = "approved";
          saveUserPlaces(list);
        }
      } catch (backErr) {
        // Safe to ignore
      }

      // Notify proposer of approval
      const placeData = docSnap.data();
      if (placeData && placeData.createdBy) {
        sendPushNotification(
          placeData.createdBy,
          `✅ Sosta approvata!`,
          `La tua sosta proposta "${placeData.name}" è stata approvata ed è ora visibile sulla mappa!`,
          { type: "proposal_approved", placeId: id }
        ).catch(err => console.error("[FCM Push] Failed to notify user of proposal approval:", err));
      }

      res.json({ success: true, place: { id, ...docSnap.data(), status: "approved" } });
    } catch (err: any) {
      console.error("Error approving place in Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });

  // Reject/Delete a pending or approved place (Admin action)
  app.post("/api/admin/reject-place", async (req, res) => {
    try {
      const { id } = req.body;
      console.log(`[Admin API] Attempting to reject/delete place ID: ${id}`);
      if (!id) {
        console.error("[Admin API] Missing ID in reject request.");
        return res.status(400).json({ error: "ID mancante." });
      }

      await firestoreDb.collection("places").doc(id).delete();
      console.log(`[Firestore Sync] Rejected/Deleted place ID: ${id}`);

      // Sync local backup too
      try {
        const list = loadUserPlaces();
        const filtered = list.filter((p: any) => p.id !== id);
        saveUserPlaces(filtered);
      } catch (backErr) {
        console.warn("[Admin API] Failed to sync local backup:", backErr);
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error rejecting place in Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });

  // Update a place in Firestore (Admin action)
  app.post("/api/admin/update-place", async (req, res) => {
    try {
      const { id, updatedData } = req.body;
      if (!id || !updatedData) {
        return res.status(400).json({ error: "ID e dati aggiornati sono obbligatori." });
      }

      await firestoreDb.collection("places").doc(id).update(updatedData);
      console.log(`[Firestore Sync] Updated place ID: ${id}`);
      
      // Sync local backup too
      try {
        const list = loadUserPlaces();
        const index = list.findIndex((p: any) => p.id === id);
        if (index !== -1) {
          list[index] = { ...list[index], ...updatedData };
          saveUserPlaces(list);
        }
      } catch (backErr) {
        // Safe to ignore
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating place in Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });

  // Get all places (Admin action)
  app.get("/api/admin/all-places", async (req, res) => {
    try {
      const snapshot = await firestoreDb.collection("places").get();
      const places: any[] = [];
      snapshot.forEach((doc: any) => {
        places.push({ id: doc.id, ...doc.data() });
      });
      res.json(places);
    } catch (err: any) {
      console.error("Error fetching all places from Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });

  // --- USER AUTHENTICATION & REGISTRATION ENDPOINTS ---
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, name, surname, dob, nickname, inviteCode, profilePhoto } = req.body;
      if (!email || !password || !nickname) {
        return res.status(400).json({ error: "Email, password e nickname sono richiesti per la registrazione." });
      }

      const cleanEmail = email.toLowerCase().trim();
      const cleanNickname = nickname.trim();
      const usersRef = firestoreDb.collection("users");

      // Check if user exists (ignoring deleted accounts)
      let emailTaken = false;
      try {
        const snapshot = await usersRef.where("email", "==", cleanEmail).get();
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          const docEmail = (data.email || doc.id).toLowerCase().trim();
          if (!isUserDeleted(docEmail)) {
            emailTaken = true;
          }
        });
      } catch (fsErr: any) {
        console.log("[Firestore Auth Fallback] Firestore email query fallback active.");
      }

      const cachedUsers = getCachedUsers();
      if (cachedUsers.some(u => (u.email || "").toLowerCase().trim() === cleanEmail && !isUserDeleted(cleanEmail))) {
        emailTaken = true;
      }

      if (emailTaken) {
        return res.status(400).json({ error: "Indirizzo email già registrato." });
      }

      // Check if nickname exists (ignoring deleted accounts)
      let nicknameTaken = false;
      try {
        const nicknameSnapshot = await usersRef.where("nickname", "==", cleanNickname).get();
        nicknameSnapshot.forEach((doc: any) => {
          const data = doc.data();
          const docEmail = (data.email || doc.id).toLowerCase().trim();
          if (!isUserDeleted(docEmail)) {
            nicknameTaken = true;
          }
        });
      } catch (fsErr: any) {
        console.log("[Firestore Auth Fallback] Firestore nickname query fallback active.");
      }

      if (cachedUsers.some(u => (u.nickname || "").trim().toLowerCase() === cleanNickname.toLowerCase() && !isUserDeleted(u.email))) {
        nicknameTaken = true;
      }

      if (nicknameTaken) {
        return res.status(400).json({ error: "Questo nickname è già stato scelto da un altro camperista." });
      }

      const adminEmail = (process.env.ADMIN_EMAIL || "viacamperapp@gmail.com").toLowerCase().trim();
      const isRegisteredUserAdmin = cleanEmail === adminEmail || cleanEmail === "viacamperapp@gmail.com" || cleanEmail === "sambucci.simone@gmail.com";

      const newUserDoc = {
        email: cleanEmail,
        password: password,
        name: name || "",
        surname: surname || "",
        dob: dob || "",
        nickname: cleanNickname,
        profilePhoto: profilePhoto || "",
        favorites: [],
        createdAt: new Date().toISOString(),
        approved: isRegisteredUserAdmin ? true : false,
        isModerator: isRegisteredUserAdmin ? true : false,
        moderatorRoles: isRegisteredUserAdmin
          ? { community: true, places: true, itineraries: true }
          : { community: false, places: false, itineraries: false }
      };

      // Clear any previous "deleted" override if re-registering
      const overrides = getUserOverrides();
      if (overrides[cleanEmail]?.deleted) {
        delete overrides[cleanEmail].deleted;
        try {
          fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2), "utf-8");
        } catch (err) {
          console.error("Error updating overrides file:", err);
        }
      }

      // Try saving to Firestore
      try {
        await usersRef.doc(cleanEmail).set(newUserDoc);
        console.log(`[Firestore Auth] User registered successfully on Firestore: ${cleanEmail}`);
        if (!newUserDoc.approved) {
          notifyModerators("users", "Richiesta Iscrizione Utente", `Nuovo utente in attesa di approvazione: ${cleanNickname} (${cleanEmail})`, { email: cleanEmail, nickname: cleanNickname, type: "user_approval" }).catch(err => console.warn("[Notification] Moderator alert failed:", err));
        }
      } catch (fsErr: any) {
        console.log(`[Firestore Auth Fallback] User ${cleanEmail} registered & saved locally.`);
      }

      // Update local cached users list immediately
      const updatedCached = cachedUsers.filter(u => (u.email || "").toLowerCase().trim() !== cleanEmail);
      updatedCached.push(newUserDoc);
      cacheUsers(updatedCached);

      // Send email notification to admin via sendAdminNotificationEmail
      if (!newUserDoc.approved) {
        const regSubject = `Richiesta di approvazione nuovo utente su ViaCamperApp [${newUserDoc.nickname}]`;
        const regHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 24px; border-radius: 16px;">
            <div style="background: linear-gradient(135deg, #1C3D2B 0%, #2D5A40 100%); padding: 20px; border-radius: 12px; color: white;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #a7f3d0; margin-bottom: 4px;">ViaCamperApp • Notifica Amministratore</div>
              <h2 style="margin: 0; color: #ffffff; font-size: 20px;">👥 Richiesta Approvazione Nuovo Utente</h2>
            </div>
            <div style="background: #ffffff; padding: 22px; border-radius: 12px; margin-top: 16px; border: 1px solid #e2e8f0;">
              <p style="font-size: 14px; color: #1e293b; margin-top: 0;">Un nuovo camperista si è appena registrato ed è in attesa di essere approvato per accedere all'app:</p>
              <table style="width: 100%; font-size: 13.5px; color: #334155; border-collapse: collapse; margin-top: 12px;">
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; font-weight: bold; width: 140px; color: #64748b;">Nickname:</td>
                  <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${newUserDoc.nickname}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Email:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${newUserDoc.email}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Nome e Cognome:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${newUserDoc.name || 'N/D'} ${newUserDoc.surname || ''}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Data di Nascita:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${newUserDoc.dob || 'N/D'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Data Iscrizione:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${new Date().toLocaleString('it-IT')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Stato:</td>
                  <td style="padding: 8px 0; font-weight: 700; color: #d97706;">IN ATTESA DI APPROVAZIONE</td>
                </tr>
              </table>
              <div style="margin-top: 20px; text-align: center;">
                <p style="font-size: 12.5px; color: #64748b; margin-bottom: 8px;">Puoi approvare o moderare questo utente direttamente dall'applicazione nel <strong>Pannello Moderatore &gt; Iscritti</strong>.</p>
              </div>
            </div>
          </div>
        `;
        sendAdminNotificationEmail(regSubject, regHtml).catch((err) =>
          console.warn("[Register API] sendAdminNotificationEmail notice:", err)
        );
      }

      // Send instant push notification to all superadmins and moderators about new user registration
      const adminPushTargets = ["sambucci.simone@gmail.com", "viacamperapp@gmail.com"];
      if (process.env.ADMIN_EMAIL && !adminPushTargets.includes(process.env.ADMIN_EMAIL.toLowerCase().trim())) {
        adminPushTargets.push(process.env.ADMIN_EMAIL.toLowerCase().trim());
      }
      sendPushNotification(
        adminPushTargets,
        `👥 Nuovo camperista iscritto!`,
        `L'utente ${newUserDoc.nickname} (${newUserDoc.name || ''} ${newUserDoc.surname || ''}) si è registrato ed è in attesa di approvazione.`,
        { type: "new_registration", userEmail: newUserDoc.email, nickname: newUserDoc.nickname }
      ).catch(err => console.error("[FCM Push] Failed to notify admin of new registration:", err));

      // Initialize empty user trips collection in Firestore
      try {
        await firestoreDb.collection(`users/${cleanEmail}/data`).doc("trips").set({ trips: [] });
      } catch (fsErr) {
        console.warn("[Register API] Init empty trips doc notice:", fsErr);
      }

      return res.json({ 
        success: true, 
        user: { 
          email: newUserDoc.email, 
          name: newUserDoc.name, 
          nickname: newUserDoc.nickname, 
          profilePhoto: newUserDoc.profilePhoto, 
          approved: newUserDoc.approved,
          isModerator: newUserDoc.isModerator,
          moderatorRoles: newUserDoc.moderatorRoles
        } 
      });
    } catch (err: any) {
      console.error("Error in register endpoint:", err);
      res.status(500).json({ error: err.message || "Unknown register error" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const cleanEmail = String(email || '').toLowerCase().trim();
      const cleanPass = String(password || '').trim();

      if (!cleanEmail || !cleanPass) {
        return res.status(400).json({ error: "Email e password sono richiesti per accedere." });
      }

      if (isUserDeleted(cleanEmail)) {
        return res.status(403).json({ error: "Questo account è stato eliminato definitivamente e non può più accedere." });
      }

      let userData: any = null;
      try {
        const userDoc = await firestoreDb.collection("users").doc(cleanEmail).get();
        if (userDoc.exists) {
          userData = userDoc.data();
        }
      } catch (fsErr: any) {
        console.log("[Firestore Auth Fallback] Firestore user lookup fallback active locally.");
      }

      userData = getOverrideAppliedUser(cleanEmail, userData);
      if (!userData || userData.deleted === true || isUserDeleted(cleanEmail)) {
        return res.status(403).json({ error: "Questo account è stato eliminato definitivamente e non può più accedere." });
      }

      const storedPass = String(userData.password || '').trim();

      if (storedPass !== cleanPass) {
        return res.status(400).json({ error: "Password errata. Se non la ricordi, usa la funzione 'Password dimenticata?'." });
      }

      if (userData.approved === false) {
        return res.status(403).json({ error: "Il tuo account è in attesa di approvazione da parte di un moderatore." });
      }

      console.log(`[Firestore Auth] User logged in: ${cleanEmail}`);
      const isSuper = cleanEmail === "sambucci.simone@gmail.com" || cleanEmail === "viacamperapp@gmail.com";
      const hasAnyModRole = Boolean(
        userData.moderatorRoles && (
          userData.moderatorRoles.community === true ||
          userData.moderatorRoles.places === true ||
          userData.moderatorRoles.itineraries === true
        )
      );
      const isMod = isSuper || (userData.isModerator === true && hasAnyModRole);

      res.json({ 
        success: true, 
        user: { 
          email: userData.email, 
          name: userData.name, 
          nickname: userData.nickname,
          profilePhoto: userData.profilePhoto || userData.avatarUrl || "",
          favorites: userData.favorites || [],
          isModerator: isMod,
          moderatorRoles: isSuper
            ? { community: true, places: true, itineraries: true }
            : (hasAnyModRole ? userData.moderatorRoles : { community: false, places: false, itineraries: false })
        } 
      });
    } catch (err: any) {
      console.error("Error in login endpoint:", err);
      res.status(500).json({ error: err.message || "Unknown login error" });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email) {
        return res.status(400).json({ error: "L'indirizzo email è obbligatorio." });
      }

      const formattedEmail = email.toLowerCase().trim();
      const userRef = firestoreDb.collection("users").doc(formattedEmail);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: "Nessun utente trovato con questo indirizzo email." });
      }

      let updatedPass = newPassword;
      if (!updatedPass || updatedPass.trim().length < 4) {
        // Generate a simple readable temporary password
        updatedPass = "ViaCamper" + Math.floor(1000 + Math.random() * 9000);
      } else {
        updatedPass = updatedPass.trim();
      }

      await userRef.update({ password: updatedPass });

      // Send email if Resend is configured
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          resend.emails.send({
            from: 'ViaCamperApp <onboarding@resend.dev>',
            to: formattedEmail,
            subject: '🔑 Ripristino Password ViaCamper',
            html: `<div style="font-family: sans-serif; padding: 20px;">
              <h2>Ripristino Password ViaCamper</h2>
              <p>Ciao <strong>${userDoc.data()?.nickname || 'Camperista'}</strong>,</p>
              <p>La tua password per l'account <code>${formattedEmail}</code> è stata aggiornata:</p>
              <p style="font-size: 18px; font-weight: bold; background: #f1f5f9; padding: 10px; border-radius: 8px;">${updatedPass}</p>
              <p>Puoi accedere all'app utilizzando questa password.</p>
            </div>`
          }).then(res => {
            console.log("[Reset Password] Email sent successfully to:", formattedEmail);
          }).catch(e => {
            console.warn("[Reset Password] Errore invio email resend in promise:", e);
          });
        } catch (e) {
          console.warn("[Reset Password] Errore configurazione email resend:", e);
        }
      }

      res.json({
        success: true,
        message: `Password impostata con successo! Password: ${updatedPass}`,
        password: updatedPass
      });
    } catch (err: any) {
      console.error("Error in reset-password endpoint:", err);
      res.status(500).json({ error: err.message || "Errore durante il ripristino password." });
    }
  });

  app.post("/api/user/push-token", async (req, res) => {
    try {
      const { email, token, platform } = req.body;
      if (!email || !token) {
        return res.status(400).json({ error: "Email e token sono richiesti." });
      }

      const tokensRef = firestoreDb.collection("push_tokens");
      await tokensRef.doc(email.toLowerCase().trim()).set({
        email: email.toLowerCase().trim(),
        token: token,
        platform: platform || "unknown",
        updatedAt: new Date().toISOString()
      });

      console.log(`[FCM Push] Token registered in Firestore for ${email}: ${token}`);
      res.json({ success: true, message: "Token push registrato con successo." });
    } catch (err: any) {
      console.error("Error storing push token:", err);
      res.status(500).json({ error: err.message || "Unknown error inside server" });
    }
  });

  // Endpoint for user profile update (photo, nickname, etc.)
  app.post("/api/user/update-profile", async (req, res) => {
    try {
      const { email, profilePhoto, nickname, name } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email mancante." });
      }
      const updateData: any = {};
      if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto;
      if (nickname) updateData.nickname = nickname.trim();
      if (name) updateData.name = name.trim();

      await firestoreDb.collection("users").doc(email.toLowerCase().trim()).update(updateData);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating user profile:", err);
      res.status(500).json({ error: err.message || "Errore aggiornamento profilo" });
    }
  });

  // --- ADMIN USERS ENDPOINTS ---
  // Approve user (admin action)
  app.post("/api/admin/users/approve", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email mancante." });
      }
      const cleanEmail = email.toLowerCase().trim();

      try {
        await firestoreDb.collection("users").doc(cleanEmail).update({
          approved: true
        });
        console.log(`[Firestore Auth] User ${cleanEmail} approved on Firestore.`);
      } catch (fsErr: any) {
        console.log(`[Firestore Auth Fallback] Saved user ${cleanEmail} approval locally.`);
      }

      // Always persist local override
      saveUserOverride(cleanEmail, { approved: true });

      // Update cached user entry as well
      const cached = getCachedUsers();
      const uIdx = cached.findIndex(u => (u.email || "").toLowerCase().trim() === cleanEmail);
      if (uIdx !== -1) {
        cached[uIdx].approved = true;
        cacheUsers(cached);
      }

      // Send email to the user letting them know they are approved! (If Resend is configured)
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          resend.emails.send({
            from: 'ViaCamperApp <onboarding@resend.dev>',
            to: cleanEmail,
            subject: 'Il tuo account ViaCamperApp è stato approvato! 🎉',
            html: `
              <h2>Benvenuto su ViaCamperApp!</h2>
              <p>Siamo felici di comunicarti che il tuo account è stato approvato dall'amministratore.</p>
              <p>Ora puoi effettuare il login con la tua email e password e iniziare ad utilizzare l'applicazione.</p>
              <br/>
              <p>Buon viaggio! 🚐💨</p>
            `
          }).then((emailRes: any) => {
            if (emailRes?.error) {
              console.log(`[Email Notice] Resend approval: ${emailRes.error.message || 'validation notice'}`);
            } else {
              console.log(`[Email] Approval notification sent successfully to user: ${cleanEmail}`);
            }
          }).catch(emailErr => {
            console.log("Approval email notice to user:", emailErr?.message || emailErr);
          });
          console.log(`[Email] Approval notification triggered in background for user: ${cleanEmail}`);
        } catch (setupErr) {
          console.error("Error setting up approval email to user:", setupErr);
        }
      }

      res.json({ success: true, message: `Utente ${cleanEmail} approvato con successo.` });
    } catch (err: any) {
      console.error("Error approving user:", err);
      res.status(500).json({ error: err.message || "Errore durante l'approvazione." });
    }
  });

  // Toggle moderator status (admin action)
  app.post("/api/admin/users/toggle-moderator", async (req, res) => {
    try {
      const { email, roles } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email mancante." });
      }
      const cleanEmail = email.toLowerCase().trim();
      // Handle legacy boolean isModerator if passed
      const moderatorRoles = roles || {
        community: !!req.body.isModerator,
        places: !!req.body.isModerator,
        itineraries: !!req.body.isModerator
      };

      const hasAnyRole = Boolean(
        moderatorRoles && (moderatorRoles.community || moderatorRoles.places || moderatorRoles.itineraries)
      );

      try {
        await firestoreDb.collection("users").doc(cleanEmail).update({
          moderatorRoles,
          isModerator: hasAnyRole
        });
        console.log(`[Firestore Auth] User ${cleanEmail} moderator roles updated to:`, moderatorRoles, `isModerator:`, hasAnyRole);
      } catch (fsErr: any) {
        console.log(`[Firestore Auth Fallback] Saved user ${cleanEmail} moderator roles locally.`);
      }

      // Always persist local override
      saveUserOverride(cleanEmail, { moderatorRoles, isModerator: hasAnyRole });

      // Update cached user entry as well
      const cached = getCachedUsers();
      const uIdx = cached.findIndex(u => (u.email || "").toLowerCase().trim() === cleanEmail);
      if (uIdx !== -1) {
        cached[uIdx].moderatorRoles = moderatorRoles;
        cached[uIdx].isModerator = hasAnyRole;
        cacheUsers(cached);
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating moderator status:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get all registered users
  app.get("/api/admin/users", async (req, res) => {
    try {
      const userMap = new Map<string, any>();
      let proposalCounts: { [key: string]: number } = {};

      // 1. Load locally cached users first so no pending registrations are lost
      const cached = getCachedUsers();
      for (const u of cached) {
        if (u && u.email) {
          const clean = u.email.toLowerCase().trim();
          if (!isUserDeleted(clean)) {
            userMap.set(clean, { ...u, email: clean });
          }
        }
      }

      // 2. Fetch from Firestore and merge
      try {
        const usersRef = firestoreDb.collection("users");
        const snapshot = await usersRef.get();

        snapshot.forEach((doc: any) => {
          const data = doc.data() || {};
          const clean = (data.email || doc.id).toLowerCase().trim();
          if (isUserDeleted(clean) || data.deleted === true) {
            return;
          }
          const existing = userMap.get(clean) || {};
          userMap.set(clean, {
            ...existing,
            email: clean,
            name: data.name || existing.name || "",
            surname: data.surname || existing.surname || "",
            nickname: data.nickname || existing.nickname || "",
            dob: data.dob || existing.dob || "",
            createdAt: data.createdAt || existing.createdAt || new Date().toISOString(),
            isModerator: data.isModerator !== undefined ? !!data.isModerator : !!existing.isModerator,
            approved: (data.approved !== undefined ? data.approved : existing.approved) !== false,
            favoritesCount: (data.favorites || existing.favorites || []).length
          });
        });

        // Try getting proposal counts
        try {
          const placesSnapshot = await firestoreDb.collection("places").get();
          placesSnapshot.forEach((doc: any) => {
            const placeData = doc.data() || {};
            const creator = (placeData.createdBy || "").toLowerCase().trim();
            if (creator) {
              proposalCounts[creator] = (proposalCounts[creator] || 0) + 1;
            }
          });
        } catch (placeErr) {
          console.warn("Could not fetch place proposals for user counts:", placeErr);
        }
      } catch (fsErr: any) {
        console.log("[Firestore Auth Fallback] Reading users list from local cache due to Firestore notice.");
      }

      const rawUsers = Array.from(userMap.values());
      // Save combined list to cache so no newly registered user is wiped
      cacheUsers(rawUsers);

      // Apply overrides and filter out deleted users
      const processedUsers: any[] = [];
      for (const u of rawUsers) {
        const cleanEmail = (u.email || "").toLowerCase().trim();
        const updatedUser = getOverrideAppliedUser(cleanEmail, u);
        if (updatedUser) {
          processedUsers.push({
            ...updatedUser,
            proposalsCount: proposalCounts[cleanEmail] || updatedUser.proposalsCount || 0
          });
        }
      }

      // Sort users by registration date descending
      processedUsers.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      res.json(processedUsers);
    } catch (err: any) {
      console.error("Error loading users for admin:", err);
      res.status(500).json({ error: err.message || "Errore nel recupero degli utenti." });
    }
  });

  // Get proposals made by a registered user
  app.get("/api/admin/users/:email/proposals", async (req, res) => {
    try {
      const email = req.params.email.toLowerCase().trim();
      const proposals: any[] = [];
      try {
        const snapshot = await firestoreDb.collection("places").get();
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          const creator = (data.createdBy || "").toLowerCase().trim();
          if (creator === email) {
            proposals.push({
              id: doc.id,
              name: data.name || "",
              category: data.category || "",
              lat: data.lat,
              lng: data.lng,
              address: data.address || "",
              status: data.status || "pending",
              createdAt: data.createdAt || "",
              priceInfo: data.priceInfo || "Gratuito",
              priceEuro: data.priceEuro || 0,
              imageUrl: data.imageUrl || ""
            });
          }
        });
      } catch (fsErr: any) {
        console.warn("Could not fetch user proposals from Firestore:", fsErr.message);
      }
      // Sort by design creation date descending
      proposals.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      res.json(proposals);
    } catch (err: any) {
      console.error("Error loading user proposals for admin:", err);
      res.status(500).json({ error: err.message || "Errore nel caricamento delle proposte." });
    }
  });

  // Delete a registered user
  app.delete("/api/admin/users/:email", async (req, res) => {
    try {
      const email = req.params.email;
      if (!email) {
        return res.status(400).json({ error: "Email non specificata." });
      }
      const cleanEmail = email.toLowerCase().trim();

      try {
        await firestoreDb.collection("users").doc(cleanEmail).set({ deleted: true }, { merge: true });
        await firestoreDb.collection("users").doc(cleanEmail).delete();
        console.log(`[Firestore Auth Admin] Fully deleted user account on Firestore: ${cleanEmail}`);
      } catch (fsErr: any) {
        console.log(`[Firestore Auth Fallback] Applied local deletion override for ${cleanEmail}.`);
      }

      // Always persist local override to mark user as deleted
      saveUserOverride(cleanEmail, { deleted: true });

      // Update cached users list by removing deleted user
      const cached = getCachedUsers().filter(u => (u.email || "").toLowerCase().trim() !== cleanEmail);
      cacheUsers(cached);

      res.json({ success: true, message: `Utente ${email} rimosso con successo.` });
    } catch (err: any) {
      console.error("Error deleting user for admin:", err);
      res.status(500).json({ error: err.message || "Errore durante l'eliminazione dell'utente." });
    }
  });

  // Self-delete user account (GDPR compliant)
  app.post("/api/user/delete-account", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email non specificata." });
      }
      const cleanEmail = email.toLowerCase().trim();
      
      try {
        await firestoreDb.collection("users").doc(cleanEmail).set({ deleted: true }, { merge: true });
        await firestoreDb.collection("users").doc(cleanEmail).delete();

        // Delete user trips doc as well
        await firestoreDb.collection(`users/${cleanEmail}/data`).doc("trips").delete();

        // Delete user fuel logs subcollection if present
        const fuelLogs = await firestoreDb.collection(`users/${cleanEmail}/fuelLogs`).get();
        if (!fuelLogs.empty) {
          const batch = firestoreDb.batch();
          fuelLogs.forEach((doc: any) => batch.delete(doc.ref));
          await batch.commit();
        }
      } catch (subErr) {
        console.warn("[Firestore] Error deleting subcollections during self-deletion:", subErr);
      }

      // Always persist local override to mark user as deleted so they cannot log back in
      saveUserOverride(cleanEmail, { deleted: true });

      // Update cached users list by removing deleted user
      const cached = getCachedUsers().filter(u => (u.email || "").toLowerCase().trim() !== cleanEmail);
      cacheUsers(cached);

      console.log(`[Firestore Auth] User self-deleted account: ${cleanEmail}`);
      res.json({ success: true, message: "Account ed i dati personali ad esso associati sono stati eliminati con successo." });
    } catch (err: any) {
      console.error("Error in user self-deletion:", err);
      res.status(500).json({ error: err.message || "Errore durante l'eliminazione dell'account." });
    }
  });

  // Get favorites list for user
  app.get("/api/user/favorites", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: "Email non specificata." });
      }

      const userDoc = await firestoreDb.collection("users").doc(email.toLowerCase().trim()).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "Utente non trovato." });
      }

      const userData = userDoc.data() || {};
      res.json({ favorites: userData.favorites || [] });
    } catch (err: any) {
      console.error("Error fetching user favorites from Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });

  // Sync favorites list for user
  app.post("/api/user/favorites", async (req, res) => {
    try {
      const { email, favorites } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email utente non specificata." });
      }

      const docRef = firestoreDb.collection("users").doc(email.toLowerCase().trim());
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: "Utente non trovato." });
      }

      await docRef.update({ favorites: favorites || [] });
      console.log(`[Firestore Sync] Synced favorites for ${email}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating user favorites in Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });

  // --- FUEL LOGS WITH CACHE & AUTOMATIC TRIP EXPENSE RECOVERY ---
  const FUEL_LOGS_CACHE_FILE = path.join(process.cwd(), "fuel_logs_cache.json");

  function getCachedFuelLogs(email: string): any[] {
    try {
      if (fs.existsSync(FUEL_LOGS_CACHE_FILE)) {
        const all = JSON.parse(fs.readFileSync(FUEL_LOGS_CACHE_FILE, "utf-8"));
        const clean = email.toLowerCase().trim();
        if (Array.isArray(all[clean])) return all[clean];
      }
    } catch (e) {
      console.warn("Error reading fuel logs cache:", e);
    }
    return [];
  }

  function saveCachedFuelLogs(email: string, logs: any[]) {
    try {
      let all: Record<string, any[]> = {};
      if (fs.existsSync(FUEL_LOGS_CACHE_FILE)) {
        try {
          all = JSON.parse(fs.readFileSync(FUEL_LOGS_CACHE_FILE, "utf-8"));
        } catch {}
      }
      const clean = email.toLowerCase().trim();
      all[clean] = logs;
      fs.writeFileSync(FUEL_LOGS_CACHE_FILE, JSON.stringify(all, null, 2), "utf-8");
    } catch (e) {
      console.warn("Error saving fuel logs cache:", e);
    }
  }

  app.get("/api/fuel-logs/:email", async (req, res) => {
    try {
      const email = (req.params.email || "").toLowerCase().trim();
      if (!email) return res.json([]);

      let existingLogs = getCachedFuelLogs(email);

      // Try fetching from Firestore fuelLogs subcollection
      try {
        const logsRef = firestoreDb.collection(`users/${email}/fuelLogs`).orderBy('createdAt', 'desc');
        const snapshot = await logsRef.get();
        if (snapshot && Array.isArray(snapshot.docs) && snapshot.docs.length > 0) {
          const fsLogs = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
          }));
          // Merge fsLogs
          const map = new Map<string, any>();
          existingLogs.forEach(l => map.set(l.id, l));
          fsLogs.forEach((l: any) => map.set(l.id, l));
          existingLogs = Array.from(map.values());
        }
      } catch (fsErr) {
        console.warn("[Fuel Logs] Direct subcollection fetch failed (may be quota or offline):", fsErr);
      }

      // Also recover any fuel expenses recorded in user trips if cache is low or to ensure full history
      try {
        const tripsDoc = await firestoreDb.collection(`users/${email}/data`).doc("trips").get();
        if (tripsDoc && tripsDoc.exists) {
          const tripsData = tripsDoc.data();
          if (tripsData && Array.isArray(tripsData.trips)) {
            const map = new Map<string, any>();
            existingLogs.forEach(l => map.set(l.id, l));

            for (const trip of tripsData.trips) {
              for (const exp of (trip.expenses || [])) {
                if (exp.category === 'Carburante' || exp.liters || exp.pricePerLiter || exp.fuelCompany) {
                  let liters = exp.liters;
                  let pricePerLiter = exp.pricePerLiter;
                  let odometer = exp.odometer || 0;
                  let fuelCompany = exp.fuelCompany || "Eni";
                  let isFullTank = !!exp.isFullTank;

                  if (!liters && exp.title) {
                    const match = exp.title.match(/([\d.,]+)\s*L/i);
                    if (match) liters = parseFloat(match[1].replace(',', '.'));
                  }
                  if (!pricePerLiter && exp.title) {
                    const match = exp.title.match(/@\s*([\d.,]+)/i);
                    if (match) pricePerLiter = parseFloat(match[1].replace(',', '.'));
                  }
                  if (!pricePerLiter && liters && exp.amount) {
                    pricePerLiter = Number((exp.amount / liters).toFixed(3));
                  }
                  if (!liters && pricePerLiter && exp.amount) {
                    liters = Number((exp.amount / pricePerLiter).toFixed(2));
                  }

                  const logId = exp.id || `fuel_trip_${trip.id}_${exp.date || Date.now()}`;
                  if (!map.has(logId)) {
                    map.set(logId, {
                      id: logId,
                      date: exp.date || trip.startDate || new Date().toISOString().split('T')[0],
                      liters: liters || 0,
                      pricePerLiter: pricePerLiter || 0,
                      totalCost: exp.amount || 0,
                      odometer: odometer,
                      isFullTank: isFullTank,
                      fuelCompany: fuelCompany,
                      createdAt: exp.date ? new Date(exp.date).toISOString() : new Date().toISOString()
                    });
                  }
                }
              }
            }
            existingLogs = Array.from(map.values());
          }
        }
      } catch (tripsErr) {
        console.warn("[Fuel Logs] Error recovering from trips:", tripsErr);
      }

      // Sort descending by date (newest in alto), then odometer, then createdAt
      existingLogs.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        const odoA = Number(a.odometer) || 0;
        const odoB = Number(b.odometer) || 0;
        if (odoA !== odoB) return odoB - odoA;
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      // Save merged logs to cache
      saveCachedFuelLogs(email, existingLogs);

      res.json(existingLogs);
    } catch (err: any) {
      console.error("Error fetching fuel logs:", err);
      const fallback = getCachedFuelLogs((req.params.email || "").toLowerCase().trim());
      res.json(fallback);
    }
  });

  app.post("/api/fuel-logs/:email", async (req, res) => {
    try {
      const email = (req.params.email || "").toLowerCase().trim();
      const data = req.body;
      
      const newLog = {
        id: data.id || `fuel_${Date.now()}`,
        date: data.date || new Date().toISOString().split('T')[0],
        liters: Number(data.liters) || 0,
        pricePerLiter: Number(data.pricePerLiter) || 0,
        totalCost: Number(data.totalCost) || Number((data.liters * data.pricePerLiter).toFixed(2)) || 0,
        odometer: Number(data.odometer) || 0,
        isFullTank: !!data.isFullTank,
        fuelCompany: (data.fuelCompany || "Eni").trim(),
        createdAt: data.createdAt || new Date().toISOString()
      };

      // 1. Immediately update cache and sort descending (newest on top)
      const current = getCachedFuelLogs(email);
      const filtered = current.filter(l => l.id !== newLog.id);
      const updated = [newLog, ...filtered];
      updated.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        const odoA = Number(a.odometer) || 0;
        const odoB = Number(b.odometer) || 0;
        if (odoA !== odoB) return odoB - odoA;
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      saveCachedFuelLogs(email, updated);

      // 2. Try Firestore in background (non-blocking, tolerant to 429 quota)
      (async () => {
        try {
          await firestoreDb.collection(`users/${email}/fuelLogs`).doc(newLog.id).set(newLog);
        } catch (fsErr: any) {
          const errMsg = fsErr?.message || String(fsErr);
          if (errMsg.includes("429") || errMsg.includes("Quota") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Too Many Requests")) {
            // Handled silently by local persistent cache
          } else {
            console.warn("[Fuel Logs] Background sync notice:", errMsg);
          }
        }
      })().catch(() => {});

      res.json({ success: true, log: newLog });
    } catch (err: any) {
      console.error("Error adding fuel log:", err);
      res.status(500).json({ error: err.message || "Unknown error adding fuel log" });
    }
  });

  app.delete("/api/fuel-logs/:email/:logId", async (req, res) => {
    try {
      const email = (req.params.email || "").toLowerCase().trim();
      const { logId } = req.params;

      // 1. Immediately remove from cache
      const current = getCachedFuelLogs(email);
      const updated = current.filter(l => l.id !== logId);
      saveCachedFuelLogs(email, updated);

      // 2. Try Firestore delete in background
      (async () => {
        try {
          await firestoreDb.collection(`users/${email}/fuelLogs`).doc(logId).delete();
        } catch (fsErr: any) {
          const errMsg = fsErr?.message || String(fsErr);
          if (!errMsg.includes("429") && !errMsg.includes("Quota") && !errMsg.includes("RESOURCE_EXHAUSTED")) {
            console.warn("[Fuel Logs] Firestore delete warning:", errMsg);
          }
        }
      })().catch(() => {});

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting fuel log:", err);
      res.status(500).json({ error: err.message || "Unknown error deleting fuel log" });
    }
  });

  // --- FAMILY CREW / GRUPPO FAMIGLIA & REAL-TIME SYNC ---
  const FAMILY_CREWS_FILE = path.join(process.cwd(), "family_crews_cache.json");

  function getCachedFamilyCrews(): Record<string, any> {
    try {
      if (fs.existsSync(FAMILY_CREWS_FILE)) {
        return JSON.parse(fs.readFileSync(FAMILY_CREWS_FILE, "utf-8"));
      }
    } catch (e) {
      console.warn("Error reading family crews cache:", e);
    }
    return {};
  }

  function saveCachedFamilyCrews(crews: Record<string, any>) {
    try {
      fs.writeFileSync(FAMILY_CREWS_FILE, JSON.stringify(crews, null, 2), "utf-8");
    } catch (e) {
      console.warn("Error saving family crews cache:", e);
    }
  }

  function generateInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "FAM-";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Get crew for specific user email
  app.get("/api/family-crew/user/:email", async (req, res) => {
    try {
      const email = (req.params.email || "").toLowerCase().trim();
      if (!email) return res.json({ crew: null });

      const allCrews = getCachedFamilyCrews();
      let foundCrew = Object.values(allCrews).find((c: any) => 
        Array.isArray(c.members) && c.members.some((m: any) => (m.email || "").toLowerCase().trim() === email)
      );

      // If not in cache, check Firestore
      if (!foundCrew) {
        try {
          const snapshot = await firestoreDb.collection("family_crews").get();
          if (snapshot && Array.isArray(snapshot.docs)) {
            for (const doc of snapshot.docs) {
              const data = doc.data();
              if (data && Array.isArray(data.members) && data.members.some((m: any) => (m.email || "").toLowerCase().trim() === email)) {
                foundCrew = { id: doc.id, ...data };
                allCrews[doc.id] = foundCrew;
                saveCachedFamilyCrews(allCrews);
                break;
              }
            }
          }
        } catch (fsErr) {
          // Ignore quota errors
        }
      }

      res.json({ crew: foundCrew || null });
    } catch (err: any) {
      console.error("Error fetching user family crew:", err);
      res.status(500).json({ error: err.message || "Errore recupero equipaggio" });
    }
  });

  // Get crew by ID
  app.get("/api/family-crew/:crewId", async (req, res) => {
    try {
      const { crewId } = req.params;
      const allCrews = getCachedFamilyCrews();
      let crew = allCrews[crewId];

      if (!crew) {
        try {
          const docSnap = await firestoreDb.collection("family_crews").doc(crewId).get();
          if (docSnap && docSnap.exists) {
            crew = { id: docSnap.id, ...docSnap.data() };
            allCrews[crewId] = crew;
            saveCachedFamilyCrews(allCrews);
          }
        } catch (fsErr) {}
      }

      res.json({ crew: crew || null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create a new Family Crew
  app.post("/api/family-crew/create", async (req, res) => {
    try {
      const { name, ownerEmail, ownerName, syncModules } = req.body;
      if (!ownerEmail) {
        return res.status(400).json({ error: "Email proprietario richiesta." });
      }

      const cleanEmail = ownerEmail.toLowerCase().trim();
      const cleanName = (name || "Famiglia in Viaggio 🚐").trim();
      const crewId = `crew_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const inviteCode = generateInviteCode();

      const newCrew = {
        id: crewId,
        code: inviteCode,
        name: cleanName,
        ownerEmail: cleanEmail,
        ownerName: (ownerName || cleanEmail.split("@")[0]).trim(),
        createdAt: new Date().toISOString(),
        members: [
          {
            email: cleanEmail,
            nickname: (ownerName || cleanEmail.split("@")[0]).trim(),
            role: "owner",
            joinedAt: new Date().toISOString()
          }
        ],
        syncModules: {
          fuelCard: syncModules?.fuelCard !== false,
          trips: syncModules?.trips !== false,
          checklists: syncModules?.checklists !== false,
          pantry: syncModules?.pantry !== false,
          maintenance: syncModules?.maintenance !== false,
        },
        sharedData: {
          fuelLogs: [],
          trips: [],
          checklists: [],
          pantry: { pantry: [], shoppingList: [] },
          maintenance: []
        },
        lastUpdated: new Date().toISOString(),
        updatedBy: ownerName || cleanEmail
      };

      // 1. Save to local cache
      const allCrews = getCachedFamilyCrews();
      // Remove user from any old crews if necessary
      Object.keys(allCrews).forEach(k => {
        allCrews[k].members = (allCrews[k].members || []).filter((m: any) => (m.email || "").toLowerCase().trim() !== cleanEmail);
      });
      allCrews[crewId] = newCrew;
      saveCachedFamilyCrews(allCrews);

      // 2. Background Firestore write
      (async () => {
        try {
          await firestoreDb.collection("family_crews").doc(crewId).set(newCrew);
        } catch (fsErr: any) {
          const errMsg = fsErr?.message || String(fsErr);
          if (!errMsg.includes("429") && !errMsg.includes("Quota") && !errMsg.includes("RESOURCE_EXHAUSTED")) {
            console.warn("[Family Crew] Firestore write notice:", errMsg);
          }
        }
      })().catch(() => {});

      res.json({ success: true, crew: newCrew });
    } catch (err: any) {
      console.error("Error creating family crew:", err);
      res.status(500).json({ error: err.message || "Errore creazione equipaggio." });
    }
  });

  // Join a Family Crew with invite code
  app.post("/api/family-crew/join", async (req, res) => {
    try {
      const { code, user } = req.body;
      if (!code || !user || !user.email) {
        return res.status(400).json({ error: "Codice invito ed utente richiesti." });
      }

      const cleanCode = code.trim().toUpperCase();
      const cleanEmail = user.email.toLowerCase().trim();
      const cleanNickname = (user.nickname || user.name || cleanEmail.split("@")[0]).trim();

      const allCrews = getCachedFamilyCrews();
      let targetCrew: any = Object.values(allCrews).find((c: any) => 
        (c.code || "").toUpperCase() === cleanCode || (c.id || "") === code.trim()
      );

      if (!targetCrew) {
        try {
          const snapshot = await firestoreDb.collection("family_crews").get();
          if (snapshot && Array.isArray(snapshot.docs)) {
            for (const doc of snapshot.docs) {
              const data = doc.data();
              if ((data?.code || "").toUpperCase() === cleanCode || doc.id === code.trim()) {
                targetCrew = { id: doc.id, ...data };
                allCrews[doc.id] = targetCrew;
                break;
              }
            }
          }
        } catch (fsErr) {}
      }

      if (!targetCrew) {
        return res.status(404).json({ error: `Nessun equipaggio trovato con il codice ${cleanCode}. Controlla il codice e riprova.` });
      }

      // Add user to target crew members if not already present
      const existingMemberIdx = targetCrew.members.findIndex((m: any) => (m.email || "").toLowerCase().trim() === cleanEmail);
      if (existingMemberIdx >= 0) {
        targetCrew.members[existingMemberIdx].nickname = cleanNickname;
      } else {
        targetCrew.members.push({
          email: cleanEmail,
          nickname: cleanNickname,
          role: "member",
          joinedAt: new Date().toISOString(),
          profilePhoto: user.profilePhoto || undefined
        });
      }

      targetCrew.lastUpdated = new Date().toISOString();
      targetCrew.updatedBy = cleanNickname;

      allCrews[targetCrew.id] = targetCrew;
      saveCachedFamilyCrews(allCrews);

      // Background Firestore update
      (async () => {
        try {
          await firestoreDb.collection("family_crews").doc(targetCrew.id).set(targetCrew);
        } catch (fsErr) {}
      })().catch(() => {});

      res.json({ success: true, crew: targetCrew });
    } catch (err: any) {
      console.error("Error joining family crew:", err);
      res.status(500).json({ error: err.message || "Errore durante l'adesione all'equipaggio." });
    }
  });

  // Leave Family Crew
  app.post("/api/family-crew/leave", async (req, res) => {
    try {
      const { crewId, email } = req.body;
      if (!crewId || !email) {
        return res.status(400).json({ error: "Dati mancanti." });
      }

      const cleanEmail = email.toLowerCase().trim();
      const allCrews = getCachedFamilyCrews();
      const crew = allCrews[crewId];

      if (crew) {
        crew.members = (crew.members || []).filter((m: any) => (m.email || "").toLowerCase().trim() !== cleanEmail);
        if (crew.members.length === 0) {
          delete allCrews[crewId];
          (async () => {
            try { await firestoreDb.collection("family_crews").doc(crewId).delete(); } catch (e) {}
          })().catch(() => {});
        } else {
          // If owner left, reassign owner to first member
          if ((crew.ownerEmail || "").toLowerCase().trim() === cleanEmail) {
            crew.ownerEmail = crew.members[0].email;
            crew.ownerName = crew.members[0].nickname;
            crew.members[0].role = "owner";
          }
          allCrews[crewId] = crew;
          (async () => {
            try { await firestoreDb.collection("family_crews").doc(crewId).set(crew); } catch (e) {}
          })().catch(() => {});
        }
        saveCachedFamilyCrews(allCrews);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Sync a specific section of data to Family Crew
  app.post("/api/family-crew/sync/:crewId", async (req, res) => {
    try {
      const { crewId } = req.params;
      const { section, data, userEmail, userName } = req.body;

      if (!crewId || !section) {
        return res.status(400).json({ error: "crewId e section richiesti." });
      }

      const allCrews = getCachedFamilyCrews();
      let crew = allCrews[crewId];

      if (!crew) {
        try {
          const docSnap = await firestoreDb.collection("family_crews").doc(crewId).get();
          if (docSnap && docSnap.exists) {
            crew = { id: docSnap.id, ...docSnap.data() };
          }
        } catch (e) {}
      }

      if (!crew) {
        return res.status(404).json({ error: "Equipaggio non trovato." });
      }

      if (!crew.sharedData) {
        crew.sharedData = {};
      }

      crew.sharedData[section] = data;
      crew.lastUpdated = new Date().toISOString();
      crew.updatedBy = userName || userEmail || "Membro equipaggio";

      allCrews[crewId] = crew;
      saveCachedFamilyCrews(allCrews);

      // Background Firestore update
      (async () => {
        try {
          await firestoreDb.collection("family_crews").doc(crewId).set(crew);
        } catch (fsErr) {}
      })().catch(() => {});

      res.json({ success: true, crew });
    } catch (err: any) {
      console.error("Error syncing family crew section:", err);
      res.status(500).json({ error: err.message || "Errore sincronizzazione sezione equipaggio." });
    }
  });

  // Update crew settings (sync modules & name)
  app.post("/api/family-crew/update-settings/:crewId", async (req, res) => {
    try {
      const { crewId } = req.params;
      const { name, syncModules, email } = req.body;

      const allCrews = getCachedFamilyCrews();
      const crew = allCrews[crewId];

      if (!crew) {
        return res.status(404).json({ error: "Equipaggio non trovato." });
      }

      if (name) crew.name = name.trim();
      if (syncModules) crew.syncModules = { ...crew.syncModules, ...syncModules };
      crew.lastUpdated = new Date().toISOString();

      allCrews[crewId] = crew;
      saveCachedFamilyCrews(allCrews);

      (async () => {
        try {
          await firestoreDb.collection("family_crews").doc(crewId).set(crew);
        } catch (fsErr) {}
      })().catch(() => {});

      res.json({ success: true, crew });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- ONLINE GROUP CHAT & COMMUNITY SYSTEM IN FIRESTORE ---
  const FAKE_USERS = new Set([
    'Marco_Van78', 'Elena_Camper91', 'Simo_FamilyOnRoad', 'BeppeVan', 'TechCamper_Luca',
    'Valeria_Coast', 'Pietro_Anto', 'Stefano_Oasi', 'Roberto_Mansardato', 'Giada_Van',
    'Silvia_NORD', 'Davide_Giramondo', 'Mia_E_CaneToby', 'GreenVan_Piero',
    'MeccanicoFaidate_Giuseppe', 'ChefInViaggio_Chiara', 'Andrea_Vento', 'Giancarlo_Pioneer',
    'OfficinaCamper_Rino', 'NomadFamily_Ilaria', 'Bruno_CamperSicuro'
  ]);

  const FAKE_POST_IDS = new Set([
    "m1", "m2", "m3", "m4", "social_post_1", "social_post_2", "social_post_3", "social_post_4", "chat_1", "chat_2"
  ]);

  // Persistent tracking of deleted community message IDs
  const deletedCommunityMessageIds = new Set<string>();
  const DELETED_COMMUNITY_MSGS_FILE = path.join(process.cwd(), "deleted_community_messages.json");

  function loadCachedDeletedCommunityMessages() {
    try {
      if (fs.existsSync(DELETED_COMMUNITY_MSGS_FILE)) {
        const raw = fs.readFileSync(DELETED_COMMUNITY_MSGS_FILE, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach(id => deletedCommunityMessageIds.add(id));
        }
      }
    } catch (e) {}
  }
  loadCachedDeletedCommunityMessages();

  function saveCachedDeletedCommunityMessages() {
    try {
      fs.writeFileSync(DELETED_COMMUNITY_MSGS_FILE, JSON.stringify(Array.from(deletedCommunityMessageIds)), "utf-8");
    } catch (e) {}
  }

  // Load deleted messages from Firestore on startup
  (async () => {
    try {
      const snap = await firestoreDb.collection("deleted_community_messages").get();
      if (snap && snap.docs) {
        snap.docs.forEach((d: any) => {
          deletedCommunityMessageIds.add(d.id);
        });
        saveCachedDeletedCommunityMessages();
      }
    } catch (e) {}
  })();

  function sanitizeServerCommunityMessage(docId: string, data: any) {
    if (!data) return null;
    const msgUser = data.user || "";
    if (deletedCommunityMessageIds.has(docId) || FAKE_POST_IDS.has(docId) || FAKE_USERS.has(msgUser)) {
      return null;
    }

    const isInitialRolly = msgUser.includes("Rolly") || docId.startsWith("rolly_topic_") || docId.startsWith("social_post_rolly") || docId.startsWith("chat_rolly");

    const rawReplies = Array.isArray(data.replies) ? data.replies : [];
    const cleanReplies = rawReplies.filter((r: any) => {
      if (!r) return false;
      if (r.id && (deletedCommunityMessageIds.has(r.id) || r.id.startsWith("r_r") || r.id.startsWith("r_soc") || r.id.startsWith("r_chat"))) return false;
      if (r.user && FAKE_USERS.has(r.user)) return false;
      return true;
    });

    let likes = Number(data.likes) || 0;
    if (isInitialRolly) {
      likes = data.likedByCurrentUser ? 1 : 0;
    }

    let msgType = data.type;
    if (!msgType) {
      if (docId.startsWith("chat_") || (data.text && (data.text.includes("chat live") || data.text.includes("quattro chiacchiere")))) {
        msgType = "chat";
      } else {
        msgType = "forum";
      }
    }

    let timestamp = data.timestamp;
    if (isInitialRolly) {
      const match = INITIAL_COMMUNITY_MESSAGES.find(m => m.id === docId);
      if (match) {
        timestamp = match.timestamp;
      }
    }

    return {
      ...data,
      id: docId,
      type: msgType,
      likes,
      timestamp,
      replies: cleanReplies
    };
  }

  // Get all online community messages
  app.get("/api/community-messages", async (req, res) => {
    try {
      // Always sync deleted message IDs from Firestore deleted_community_messages
      try {
        const delSnap = await firestoreDb.collection("deleted_community_messages").get();
        if (delSnap && delSnap.docs) {
          delSnap.docs.forEach((d: any) => {
            deletedCommunityMessageIds.add(d.id);
          });
        }
      } catch (e) {}

      const snapshot = await firestoreDb.collection("communityMessages").orderBy("timestamp", "asc").limit(200).get();
      
      // If collection is empty or missing Rolly topics, fire background seed to Firestore
      const hasRollyTopics = !snapshot.empty && snapshot.docs.some((doc: any) => doc.id && doc.id.startsWith("rolly_topic_") && !deletedCommunityMessageIds.has(doc.id));
      if (!hasRollyTopics) {
        console.log("[Firestore Seed] Triggering background seed for Rolly forum topics into Firestore...");
        Promise.all(
          INITIAL_COMMUNITY_MESSAGES.filter(m => !deletedCommunityMessageIds.has(m.id)).map((msg) =>
            firestoreDb.collection("communityMessages").doc(msg.id).set(msg, { merge: true }).catch(err => console.error("Seed error:", err))
          )
        ).catch(e => console.error("Batch seed error:", e));
      }

      const messages: any[] = [];
      snapshot.forEach((doc: any) => {
        const rawData = doc.data() || {};
        if (deletedCommunityMessageIds.has(doc.id) || rawData.isDeleted || rawData.deleted) {
          // Immediately purge deleted message from Firestore
          firestoreDb.collection("communityMessages").doc(doc.id).delete().catch(() => {});
          deletedCommunityMessageIds.add(doc.id);
          return;
        }
        const sanitized = sanitizeServerCommunityMessage(doc.id, rawData);
        if (sanitized) {
          messages.push(sanitized);
          // Clean Firestore document if it contained fake replies, fake likes or mismatched timestamps (like seeded Rolly posts)
          const hadFakeReplies = (rawData.replies || []).length !== sanitized.replies.length;
          const hadFakeLikes = rawData.likes !== sanitized.likes;
          const hadMismatchedTimestamp = rawData.timestamp !== sanitized.timestamp;
          if (hadFakeReplies || hadFakeLikes || hadMismatchedTimestamp) {
            firestoreDb.collection("communityMessages").doc(doc.id).update({
              likes: sanitized.likes,
              replies: sanitized.replies,
              timestamp: sanitized.timestamp
            }).catch(err => console.error("Error updating cleaned Firestore doc:", err));
          }
        } else {
          // Delete old fake doc from Firestore
          firestoreDb.collection("communityMessages").doc(doc.id).delete().catch(err => console.error("Error deleting fake doc:", err));
        }
      });

      // Combine with INITIAL_COMMUNITY_MESSAGES to ensure instant full list return
      const fetchedIds = new Set(messages.map((m: any) => m.id));
      for (const initialMsg of INITIAL_COMMUNITY_MESSAGES) {
        if (!fetchedIds.has(initialMsg.id) && !deletedCommunityMessageIds.has(initialMsg.id)) {
          const sanitizedInitial = sanitizeServerCommunityMessage(initialMsg.id, initialMsg);
          if (sanitizedInitial) {
            messages.push(sanitizedInitial);
          }
        }
      }

      res.json(messages);
    } catch (err: any) {
      console.error("Error loading community messages from Firestore:", err);
      const fallback = INITIAL_COMMUNITY_MESSAGES.filter(m => !deletedCommunityMessageIds.has(m.id)).map(m => sanitizeServerCommunityMessage(m.id, m)).filter(Boolean);
      res.json(fallback);
    }
  });

  // Post a new community message
  app.post("/api/community-messages", async (req, res) => {
    try {
      const msg = req.body;
      if (!msg.user || !msg.text) {
        return res.status(400).json({ error: "Dati obbligatori mancanti: utente o testo." });
      }

      const msgId = msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      if (deletedCommunityMessageIds.has(msgId)) {
        return res.json({ success: true, ignored: true, message: { id: msgId } });
      }
      const entry = {
        user: msg.user,
        avatar: msg.avatar || "👨‍💻",
        avatarColor: msg.avatarColor || "#86C232",
        title: msg.title || undefined,
        text: msg.text,
        timestamp: msg.timestamp || new Date().toISOString(),
        likes: Number(msg.likes) || 0,
        likedByCurrentUser: false,
        tag: msg.tag || "Generale",
        type: msg.type || (msgId.startsWith("chat_") ? "chat" : "forum"),
        locationName: msg.locationName || undefined,
        mediaUrl: msg.mediaUrl || undefined,
        mediaType: msg.mediaType || undefined,
        isResolved: msg.isResolved || false,
        replies: msg.replies || []
      };

      await firestoreDb.collection("communityMessages").doc(msgId).set(removeUndefined(entry));
      console.log(`[Firestore Chat] Shared message from ${msg.user} (Type: ${entry.type})`);

      // Trigger automatic push notifications for new community message or SOS
      if (entry.tag === "SOS" || entry.tag === "S.O.S.") {
        sendPushNotificationToAll(
          `🚨 S.O.S. Camper Life!`,
          `${entry.user}: ${entry.text}`,
          { type: "sos_message", msgId }
        ).catch(err => console.error("[FCM Push] Error sending SOS notification:", err));
      } else {
        sendPushNotificationToAll(
          `💬 Nuovo post in bacheca da ${entry.user}`,
          entry.text.length > 60 ? `${entry.text.substring(0, 60)}...` : entry.text,
          { type: "community_message", msgId }
        ).catch(err => console.error("[FCM Push] Error sending post notification:", err));
      }

      res.json({ success: true, message: { id: msgId, ...entry } });
    } catch (err: any) {
      console.error("Error writing community message to Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown chat error" });
    }
  });

  // Resolve / Unresolve an SOS message
  app.post("/api/community-messages/resolve", async (req, res) => {
    try {
      const { id, isResolved } = req.body;
      if (!id) {
        return res.status(400).json({ error: "ID mancante." });
      }

      await firestoreDb.collection("communityMessages").doc(id).update({
        isResolved: !!isResolved
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating isResolved on Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Like / Unlike a community message
  app.post("/api/community-messages/like", async (req, res) => {
    try {
      const { id, likes } = req.body;
      if (!id) {
        return res.status(400).json({ error: "ID mancante." });
      }

      await firestoreDb.collection("communityMessages").doc(id).update({
        likes: Number(likes) || 0
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating likes on Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Reply to community message thread
  app.post("/api/community-messages/reply", async (req, res) => {
    try {
      const { id, reply } = req.body;
      if (!id || !reply || !reply.text) {
        return res.status(400).json({ error: "Parametri replies incompleti." });
      }

      const docRef = firestoreDb.collection("communityMessages").doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: "Discussione non trovata." });
      }

      const data = docSnap.data() || {};
      const replies = data.replies || [];
      const newReply = {
        id: reply.id || `reply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user: reply.user || "Anonimo",
        text: reply.text,
        timestamp: reply.timestamp || new Date().toISOString()
      };

      replies.push(newReply);
      await docRef.update({ replies });

      console.log(`[Firestore Chat] Thread reply in ${id} by ${newReply.user}`);

      // Notify the original message author via Push notification if they have registered a token
      try {
        const usersRef = firestoreDb.collection("users");
        const userSnap = await usersRef.where("nickname", "==", data.user).get();
        if (!userSnap.empty) {
          const userDoc = userSnap.docs[0].data();
          if (userDoc && userDoc.email && userDoc.email.toLowerCase().trim() !== (newReply.user || "").toLowerCase().trim()) {
            sendPushNotification(
              userDoc.email,
              `💬 ${newReply.user} ha risposto al tuo post`,
              newReply.text.length > 60 ? `${newReply.text.substring(0, 60)}...` : newReply.text,
              { type: "reply", parentId: id }
            ).catch(err => console.error("[FCM Push] Error sending reply push:", err));
          }
        }
      } catch (fcmErr) {
        console.error("[FCM Push] Failed reply push notification logic:", fcmErr);
      }

      res.json({ success: true, reply: newReply });
    } catch (err: any) {
      console.error("Error posting chat reply in Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a community message entirely (author or moderator action)
  app.post("/api/community-messages/delete", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "ID mancante." });
      }
      deletedCommunityMessageIds.add(id);
      saveCachedDeletedCommunityMessages();

      try {
        await firestoreDb.collection("communityMessages").doc(id).delete();
      } catch (delErr) {
        console.warn("Direct Firestore doc delete warning:", delErr);
      }

      try {
        await firestoreDb.collection("deleted_community_messages").doc(id).set({
          id,
          deletedAt: new Date().toISOString()
        });
      } catch (delPersistErr) {
        console.warn("Deleted tracking persist warning:", delPersistErr);
      }

      console.log(`[Firestore Chat] Message ${id} permanently deleted`);
      res.json({ success: true, id });
    } catch (err: any) {
      console.error("Error deleting community message on Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete replies or set new replies array (author or moderator action)
  app.post("/api/community-messages/reply-delete", async (req, res) => {
    try {
      const { id, replies, deletedReplyId } = req.body;
      if (!id || !Array.isArray(replies)) {
        return res.status(400).json({ error: "Dati mancanti o non validi." });
      }
      if (deletedReplyId) {
        deletedCommunityMessageIds.add(deletedReplyId);
        saveCachedDeletedCommunityMessages();
        firestoreDb.collection("deleted_community_messages").doc(deletedReplyId).set({
          id: deletedReplyId,
          deletedAt: new Date().toISOString()
        }).catch(() => {});
      }
      await firestoreDb.collection("communityMessages").doc(id).update({
        replies: replies
      });
      console.log(`[Firestore Chat] Thread replies updated for ${id}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating replies array on Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Proxy for Nominatim OpenStreetMap Search
  app.get("/api/nominatim", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) {
        return res.status(400).json({ error: "Missing parameter q" });
      }
      const targetUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "ViaCamperApp/2.0 (viacamperapp@gmail.com)"
        }
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch from Nominatim" });
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error("Nominatim proxy error:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });

  // Proxy for Dynamic Google Places Search
  app.get("/api/google-places/search", async (req, res) => {
    try {
      const q = req.query.q as string;
      const lat = req.query.lat as string;
      const lng = req.query.lng as string;
      const clientKey = req.query.key as string;

      if (!q || !q.trim()) {
        return res.status(400).json({ error: "Missing parameter q" });
      }

      const googleKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || clientKey || "";

      // Helper function to calculate distance in km
      const calcDistKm = (l1: number, n1: number, l2: number, n2: number) => {
        const R = 6371;
        const dLat = ((l2 - l1) * Math.PI) / 180;
        const dLon = ((n2 - n1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((l1 * Math.PI) / 180) *
            Math.cos((l2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      const userLatNum = lat ? parseFloat(lat) : NaN;
      const userLngNum = lng ? parseFloat(lng) : NaN;
      const hasUserCoords = !isNaN(userLatNum) && !isNaN(userLngNum);

      if (googleKey && googleKey !== "YOUR_API_KEY") {
        let placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${googleKey}&language=it`;
        if (hasUserCoords) {
          placesUrl += `&location=${userLatNum},${userLngNum}&radius=50000`;
        }

        const googleRes = await fetch(placesUrl);
        if (googleRes.ok) {
          const googleData: any = await googleRes.json();
          if (googleData.status === "OK" && Array.isArray(googleData.results) && googleData.results.length > 0) {
            let places = googleData.results.map((p: any) => {
              const photoRef = p.photos?.[0]?.photo_reference;
              const photoUrl = photoRef
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${photoRef}&key=${googleKey}`
                : null;
              const pLat = p.geometry?.location?.lat;
              const pLng = p.geometry?.location?.lng;
              const distanceKm = hasUserCoords && pLat !== undefined && pLng !== undefined
                ? calcDistKm(userLatNum, userLngNum, pLat, pLng)
                : undefined;

              return {
                id: `google-${p.place_id}`,
                place_id: p.place_id,
                name: p.name,
                address: p.formatted_address || p.vicinity || "",
                lat: pLat,
                lng: pLng,
                rating: p.rating || null,
                user_ratings_total: p.user_ratings_total || null,
                types: p.types || [],
                photoUrl: photoUrl,
                source: "google_places",
                distanceKm
              };
            });

            if (hasUserCoords) {
              places.sort((a: any, b: any) => {
                if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
                  return a.distanceKm - b.distanceKm;
                }
                return 0;
              });
            }

            return res.json({ source: "google", places });
          }
        }
      }

      // Fallback to Nominatim OpenStreetMap if no Google key or zero results
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=10&addressdetails=1`;
      const nomRes = await fetch(nomUrl, {
        headers: {
          "User-Agent": "ViaCamperApp/2.0 (viacamperapp@gmail.com)"
        }
      });

      if (nomRes.ok) {
        const nomData: any = await nomRes.json();
        let places = nomData.map((item: any) => {
          const pLat = parseFloat(item.lat);
          const pLng = parseFloat(item.lon);
          const distanceKm = hasUserCoords && !isNaN(pLat) && !isNaN(pLng)
            ? calcDistKm(userLatNum, userLngNum, pLat, pLng)
            : undefined;

          return {
            id: `osm-${item.place_id}`,
            place_id: String(item.place_id),
            name: item.display_name.split(",")[0] || "Località",
            address: item.display_name,
            lat: pLat,
            lng: pLng,
            rating: null,
            user_ratings_total: null,
            types: [item.type, item.class].filter(Boolean),
            photoUrl: null,
            source: "nominatim",
            distanceKm
          };
        });

        if (hasUserCoords) {
          places.sort((a: any, b: any) => {
            if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
              return a.distanceKm - b.distanceKm;
            }
            return 0;
          });
        }

        return res.json({ source: "nominatim", places });
      }

      res.json({ source: "empty", places: [] });
    } catch (err: any) {
      console.error("Google Places proxy search error:", err);
      res.status(500).json({ error: err.message || "Search failed" });
    }
  });

  // Proxy for Nominatim OpenStreetMap Reverse Geocoding
  app.get("/api/nominatim-reverse", async (req, res) => {
    try {
      const lat = req.query.lat as string;
      const lon = req.query.lon as string;
      if (!lat || !lon) {
        return res.status(400).json({ error: "Missing parameter lat or lon" });
      }
      const targetUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`;
      
      try {
        const response = await fetch(targetUrl, {
          headers: {
            "User-Agent": "ViaCamperApp/2.0 (viacamperapp@gmail.com)"
          }
        });
        if (response.ok) {
          const data = await response.json();
          return res.json(data);
        } else {
          console.warn(`[Proxy] Nominatim returned status ${response.status}. Using fallback.`);
        }
      } catch (e: any) {
        console.warn("[Proxy] Nominatim fetch failed, using fallback:", e);
      }

      // Robust fallback when API is down, blocked, or rate-limited
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      const resolvedLat = isNaN(latNum) ? 0 : latNum;
      const resolvedLon = isNaN(lonNum) ? 0 : lonNum;

      return res.json({
        display_name: `Punto (${resolvedLat.toFixed(5)}, ${resolvedLon.toFixed(5)})`,
        address: {
          amenity: "Punto sulla mappa",
          road: "Coordinate",
          suburb: `${resolvedLat.toFixed(4)}, ${resolvedLon.toFixed(4)}`
        }
      });
    } catch (err: any) {
      console.error("Nominatim reverse proxy error:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });

  // Overpass database caching helper with 24h TTL and stale fallback to avoid 429 rate limits
  const overpassCache = new globalThis.Map<string, { data: any; timestamp: number }>();
  const OVERPASS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours cache for map POI data

  const OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
  ];

  async function fetchSingleOverpass(url: string, bodyStr: string, timeoutMs = 6000): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "CamperCompanion/2.2 (github.com/google/ai-studio; viacamperapp@gmail.com)"
        },
        body: `data=${encodeURIComponent(bodyStr)}`,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      const trimmedText = text.trim();
      if (trimmedText.startsWith("<?xml") || trimmedText.startsWith("<!DOCTYPE") || trimmedText.startsWith("<html")) {
        throw new Error("Returned HTML/XML instead of JSON");
      }
      const data = JSON.parse(text);
      if (data && Array.isArray(data.elements)) {
        return data;
      }
      throw new Error("Invalid elements structure");
    } catch (e: any) {
      clearTimeout(timeoutId);
      throw e;
    }
  }

  // Proxy for OpenStreetMap Overpass Interpreter with support for multiple public instances (parallel race fallback)
  app.post("/api/map-data-proxy", async (req, res) => {
    try {
      const bodyStr = req.body.data || "";
      if (!bodyStr) {
        return res.status(400).json({ error: "Missing 'data' body field" });
      }

      console.log(`[Overpass Proxy] Received query: ${bodyStr.substring(0, 50)}...`);

      const now = Date.now();

      // Clean expired entries older than 24h
      for (const [key, val] of overpassCache.entries()) {
        if (now - val.timestamp > OVERPASS_CACHE_TTL) {
          overpassCache.delete(key);
        }
      }

      // Check if we have an active cache entry
      if (overpassCache.has(bodyStr)) {
        const cached = overpassCache.get(bodyStr)!;
        if (now - cached.timestamp < OVERPASS_CACHE_TTL) {
          console.log(`[Overpass Proxy] Serving matching query from 24h cache 🎉`);
          return res.json(cached.data);
        }
      }

      // Shuffle server list deterministically per request
      const shuffled = [...OVERPASS_SERVERS].sort(() => Math.random() - 0.5);

      let responseData: any = null;

      // Group 6 servers into 3 parallel racing pairs (6s timeout per batch)
      const batches = [
        [shuffled[0], shuffled[1]],
        [shuffled[2], shuffled[3]],
        [shuffled[4], shuffled[5]]
      ];

      for (const batch of batches) {
        try {
          responseData = await Promise.any(batch.map(url => fetchSingleOverpass(url, bodyStr, 7000)));
          if (responseData) break;
        } catch (_) {
          // Batch completed without fast response, moving to next mirror pool
        }
      }

      if (responseData) {
        overpassCache.set(bodyStr, { data: responseData, timestamp: Date.now() });
        return res.json(responseData);
      }

      // Stale-While-Revalidate Fallback: If live fetch failed on all mirrors, serve previous cached result if available
      if (overpassCache.has(bodyStr)) {
        console.log(`[Overpass Proxy] All mirrors busy, serving stale cache gracefully!`);
        return res.json(overpassCache.get(bodyStr)!.data);
      }

      // Silent empty fallback without disruptive error notices
      console.log(`[Overpass Proxy] All Overpass mirrors busy and no cache available.`);
      return res.json({ elements: [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Unknown proxy error" });
    }
  });

  // Proxy for Project OSRM driving router
  app.get("/api/map-tile/:z/:x/:y", async (req, res) => {
    try {
      const { z, x, y } = req.params;
      const lyrs = (req.query.lyrs as string) || "m";
      
      // Try multiple subdomains to improve reliability with automatic retries
      const subdomains = ["mt0", "mt1", "mt2", "mt3"];
      let response: any = null;
      let lastError: any = null;
      
      // Shuffle subdomains so we can try different ones in sequence if there is a failure
      const shuffledSubdomains = [...subdomains].sort(() => Math.random() - 0.5);
      
      for (const subdomain of shuffledSubdomains) {
        try {
          const targetUrl = `https://${subdomain}.google.com/vt/lyrs=${lyrs}&x=${x}&y=${y}&z=${z}`;
          response = await fetch(targetUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
            },
            signal: AbortSignal.timeout(4000) // 4 seconds timeout per attempt
          });
          
          if (response && response.ok) {
            break; // Success!
          } else {
            lastError = new Error(response ? `Status ${response.status}` : "No response");
          }
        } catch (e: any) {
          lastError = e;
        }
      }
      
      if (!response || !response.ok) {
        throw lastError || new Error("Failed to fetch map tile after retrying all subdomains");
      }
      
      const contentType = response.headers.get("content-type") || "image/png";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400"); // Cache in browser for 7 days
      
      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    } catch (err: any) {
      console.warn("[Map Tile Proxy] Falling back to 1x1 transparent PNG due to fetch error:", err.message || err);
      // Return a transparent 1x1 PNG instead of a 404/500 to prevent Ajax/Fetch exceptions in the client
      const transparentPngBase64 = "iVBOR0w0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
      const buffer = Buffer.from(transparentPngBase64, "base64");
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
      res.status(200).send(buffer);
    }
  });

  const osrmCache = new Map<string, any>();
  const brouterCache = new Map<string, any>();

  async function snapToRoad(coord: string, heading?: string): Promise<string> {
    const bearingsQuery = (heading !== undefined && heading !== null && heading !== "" && !isNaN(Number(heading)))
      ? `&bearings=${Math.round((Number(heading) % 360 + 360) % 360)},45`
      : "";

    const servers = [
      `https://routing.openstreetmap.de/routed-car/nearest/v1/driving/${coord}?number=1${bearingsQuery}`,
      `https://router.project-osrm.org/nearest/v1/driving/${coord}?number=1${bearingsQuery}`
    ];
    
    try {
      const fetchPromises = servers.map(async (url) => {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          signal: AbortSignal.timeout(3000) // 3.0s timeout for high performance but reliable snapping
        });
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        if (data.code === 'Ok' && data.waypoints && data.waypoints[0]) {
          const loc = data.waypoints[0].location; // [lon, lat]
          return `${loc[0]},${loc[1]}`;
        }
        throw new Error("Invalid format");
      });
      return await Promise.any(fetchPromises);
    } catch (e) {
      if (bearingsQuery !== "") {
        // Fall back to snapping without bearing constraint if strict bearing match fails
        return snapToRoad(coord, undefined);
      }
      console.log(`[OSRM Proxy] All parallel snapping servers returned busy/timeout for coord ${coord}. Using original.`);
      return coord; // Fallback to original
    }
  }

async function fetchBRouter(s: string, e: string, avoidHighways: string = 'false', avoidTolls: string = 'false', nogos?: string) {
  const params = new URLSearchParams();
  params.append("lonlats", `${s}|${e}`);
  params.append("profile", "car-eco");
  params.append("format", "geojson");
  if (avoidHighways === 'true') {
    params.append("avoid_motorways", "1");
  }
  if (avoidTolls === 'true') {
    params.append("avoid_toll", "1");
  }
  if (nogos) {
    params.append("nogos", nogos);
  }

  const url = `https://brouter.de/brouter?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    },
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[BRouter Proxy] BRouter error ${response.status}: ${errorText}`);
    throw new Error(`Failed to fetch from Brouter: status ${response.status}`);
  }
  const rawText = await response.text();
  try {
    return JSON.parse(rawText);
  } catch (e) {
    console.error("[BRouter Proxy] Failed to parse BRouter JSON. Raw:", rawText.substring(0, 500));
    throw new Error("Failed to parse BRouter response as JSON");
  }
}

  app.get("/api/brouter", async (req, res) => {
    try {
      const { start, end, avoidHighways, avoidTolls, nogos } = req.query;
      if (!start || !end) {
        return res.status(400).json({ error: "Missing parameters start and/or end" });
      }

      const cacheKey = `${start}-${end}-${avoidHighways}-${avoidTolls}-${nogos || ""}`;
      if (brouterCache.has(cacheKey)) {
        console.log(`[BRouter Proxy] Returning cached route for ${cacheKey}`);
        return res.json(brouterCache.get(cacheKey));
      }

      const [s, e] = [start as string, end as string];
      const data = await fetchBRouter(s, e, avoidHighways as string, avoidTolls as string, nogos as string);

      brouterCache.set(cacheKey, data);
      res.json(data);
    } catch (err: any) {
      console.error("Brouter proxy error:", err);
      res.status(502).json({ error: err.message || "Failed to fetch from Brouter" });
    }
  });

  app.get("/api/osrm", async (req, res) => {
    try {
      const { start, end, heading, avoidHighways, avoidTolls } = req.query;
      if (!start || !end) {
        return res.status(400).json({ error: "Missing parameters start and/or end" });
      }

      const cacheKey = `${start}-${end}-${heading || ''}-${avoidHighways}-${avoidTolls}`;
      if (osrmCache.has(cacheKey)) {
        console.log(`[OSRM Proxy] Returning cached route for ${cacheKey}`);
        return res.json(osrmCache.get(cacheKey));
      }

      const convertBRouterToOSRM = (brouterData: any) => {
        if (!brouterData || !brouterData.features || !brouterData.features[0]) {
          throw new Error("Invalid BRouter response format for conversion");
        }
        const feature = brouterData.features[0];
        const coordinates = feature.geometry?.coordinates || [];
        const trackLength = parseFloat(feature.properties?.["track-length"] || "0");

        return {
          code: "Ok",
          routes: [
            {
              geometry: {
                coordinates: coordinates,
                type: "LineString"
              },
              legs: [
                {
                  steps: [],
                  distance: trackLength,
                  duration: trackLength / 13 // approx 13 m/s (~50 km/h)
                }
              ],
              distance: trackLength,
              duration: trackLength / 13
            }
          ]
        };
      };

      const getRoute = async (s: string, e: string, h?: string) => {
        const bearingsParam = (h !== undefined && h !== null && h !== "" && !isNaN(Number(h)))
          ? `&bearings=${Math.round((Number(h) % 360 + 360) % 360)},45;`
          : "";

        const servers = [
          `https://routing.openstreetmap.de/routed-car/route/v1/driving/${s};${e}?overview=full&geometries=geojson&steps=true&continue_straight=true&radiuses=100;100${bearingsParam}`,
          `https://router.project-osrm.org/route/v1/driving/${s};${e}?overview=full&geometries=geojson&steps=true&continue_straight=true&radiuses=100;100${bearingsParam}`
        ];
        
        for (const url of servers) {
          try {
            const resObj = await fetch(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              },
              signal: AbortSignal.timeout(5000) // Generous 5s timeout
            });
            if (resObj.ok) {
              const resData = await resObj.json();
              if (resData.code === "Ok") {
                return resData;
              }
            }
          } catch (err) {
            console.log(`[OSRM Proxy] Server response was busy for ${url}, trying next...`);
          }
        }

        // If bearings constraint was used and failed or produced no route, retry without bearings
        if (bearingsParam !== "") {
          console.log("[OSRM Proxy] Retrying route request without bearings constraint...");
          return getRoute(s, e, undefined);
        }

        throw new Error("All OSRM routing servers were busy");
      };

      // Pre-snap coordinates in parallel always!
      console.log(`[OSRM Proxy] Snapping coordinates in parallel (heading: ${heading || 'none'}): ${start} and ${end}`);
      const [snappedStart, snappedEnd] = await Promise.all([
        snapToRoad(start as string, heading as string),
        snapToRoad(end as string)
      ]);
      console.log(`[OSRM Proxy] Snapped coordinates: ${snappedStart} -> ${snappedEnd}`);

      let data: any;
      try {
        console.log(`[OSRM Proxy] Routing with snapped coordinates: ${snappedStart} -> ${snappedEnd}`);
        data = await getRoute(snappedStart, snappedEnd, heading as string);
      } catch (err) {
        console.log("[OSRM Proxy] Routing with snapped coordinates was unsuccessful. Retrying with original coordinates...");
        try {
          data = await getRoute(start as string, end as string, heading as string);
        } catch (retryErr) {
          console.log("[OSRM Proxy] All OSRM routing servers were busy. Fetching BRouter backup...");
          try {
            const brouterData = await fetchBRouter(start as string, end as string, avoidHighways as string, avoidTolls as string);
            data = convertBRouterToOSRM(brouterData);
            console.log("[OSRM Proxy] Successfully fell back to backend BRouter and converted to OSRM format.");
          } catch (brouterErr) {
            throw new Error("Failed to fetch route from both OSRM and BRouter");
          }
        }
      }

      osrmCache.set(cacheKey, data);
      res.json(data);
    } catch (err: any) {
      console.error("[OSRM Proxy] Final catch error:", err);
      res.status(502).json({ error: err.message || "Failed to fetch route" });
    }
  });

  // --- REAL IMAGE UPLOADING & STORAGE ROUTE ---
  // Ensure uploads directory exists and serve statically
  const UPLOADS_DIR = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use("/uploads", express.static(UPLOADS_DIR));
  app.use(express.static(path.join(process.cwd(), "public")));

  // Base64 based local storage photo uploader
  app.post("/api/upload", async (req, res) => {
    try {
      const { name, base64, image, category } = req.body;
      const actualBase64 = base64 || image;
      if (!actualBase64) {
        return res.status(400).json({ error: "Nessun dato immagine fornito o caricato." });
      }

      // Read content buffer
      const matches = actualBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let dataBuffer;
      let extension = "jpg";

      if (matches && matches.length === 3) {
        const type = matches[1];
        dataBuffer = Buffer.from(matches[2], 'base64');
        if (type.includes("png")) {
          extension = "png";
        } else if (type.includes("webp")) {
          extension = "webp";
        } else if (type.includes("gif")) {
          extension = "gif";
        }
      } else {
        dataBuffer = Buffer.from(actualBase64, 'base64');
      }

      // Max size limit (e.g. 20MB)
      if (dataBuffer.length > 20 * 1024 * 1024) {
        return res.status(400).json({ error: "L'immagine caricata supera il limite di 20 MB." });
      }

      // If category is provided, save it as a permanent default for that category
      if (category) {
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        const destPath = path.join(publicDir, `${category}.png`);
        
        let processedBuffer = dataBuffer;
        try {
          processedBuffer = await sharp(dataBuffer)
            .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
            .png({ compressionLevel: 9, quality: 75 })
            .toBuffer();
          console.log(`[Upload API] Sharp compressed from ${dataBuffer.length} to ${processedBuffer.length} bytes for category default: ${category}.png`);
        } catch (sharpErr) {
          console.error("[Upload API] Sharp optimization failed for category. Saving original:", sharpErr);
        }

        fs.writeFileSync(destPath, processedBuffer);
        const fileUrl = `/${category}.png`;
        console.log(`[Upload API] Permanent Category Image Saved: ${fileUrl}`);
        return res.json({ success: true, url: fileUrl });
      }

      const cleanName = (name || "photo")
        .replace(/[^a-zA-Z0-9.\-_]/g, "_")
        .substring(0, 50);
      const fileExt = (cleanName.includes(".") ? cleanName.split('.').pop() : extension)?.toLowerCase() || "jpg";

      const fileName = `upload_${Date.now()}_${Math.floor(Math.random() * 100000)}.${fileExt}`;
      const filePath = path.join(UPLOADS_DIR, fileName);

      let processedBuffer = dataBuffer;
      try {
        const sharpInstance = sharp(dataBuffer).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true });
        if (fileExt === 'png') {
          processedBuffer = await sharpInstance.png({ compressionLevel: 9, quality: 75 }).toBuffer();
        } else if (fileExt === 'webp') {
          processedBuffer = await sharpInstance.webp({ quality: 75 }).toBuffer();
        } else {
          processedBuffer = await sharpInstance.jpeg({ quality: 75, progressive: true }).toBuffer();
        }
        console.log(`[Upload API] Sharp compressed from ${dataBuffer.length} to ${processedBuffer.length} bytes for upload: ${fileName}`);
      } catch (sharpErr) {
        console.error("[Upload API] Sharp optimization failed for upload. Saving original:", sharpErr);
      }

      let fileUrl = "";
      try {
        const [bucketExists] = await bucket.exists();
        if (bucketExists) {
          const gcsFileName = `diary_photos/${fileName}`;
          const file = bucket.file(gcsFileName);
          
          const { randomUUID } = require('crypto');
          const downloadToken = randomUUID();
          
          await file.save(processedBuffer, { 
            contentType: `image/${fileExt}`,
            metadata: {
              metadata: {
                firebaseStorageDownloadTokens: downloadToken
              }
            }
          });
          
          try {
            await file.makePublic();
            fileUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;
          } catch (e) {
            console.warn("[Upload API] makePublic failed, using authenticated URL with token", e);
            fileUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(gcsFileName)}?alt=media&token=${downloadToken}`;
          }
          console.log(`[Upload API] Real photo saved successfully to GCS at: ${fileUrl}`);
        } else {
          throw new Error("Bucket does not exist");
        }
      } catch (uploadErr) {
        console.warn("[Upload API] Failed to upload to GCS, saving Base64 to Firestore instead", uploadErr);
        // Fallback to storing in Firestore `shared_photos` collection
        const photoId = `photo_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        const base64Data = processedBuffer.toString('base64');
        await firestoreDb.collection('shared_photos').doc(photoId).set({
          base64: base64Data,
          mimeType: `image/${fileExt}`
        });
        
        fileUrl = `/api/photos/${photoId}`;
        console.log(`[Upload API] Photo saved successfully to Firestore at: ${fileUrl}`);
      }

      res.json({ success: true, url: fileUrl });
    } catch (err: any) {
      console.error("Error in /api/upload:", err);
      res.status(500).json({ error: err.message || "Errore durante il salvataggio." });
    }
  });

  app.get("/api/photos/:photoId", async (req, res) => {
    try {
      const doc = await firestoreDb.collection("shared_photos").doc(req.params.photoId).get();
      if (!doc.exists) {
        return res.status(404).send("Image not found");
      }
      const data = doc.data();
      const buffer = Buffer.from(data.base64, "base64");
      res.setHeader("Content-Type", data.mimeType || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
      res.send(buffer);
    } catch (err) {
      console.error("Error in /api/photos GET:", err);
      res.status(500).send("Server Error");
    }
  });

  // --- HELPER FOR ADMIN EMAIL NOTIFICATIONS ---
  async function sendAdminNotificationEmail(subject: string, htmlContent: string) {
    const adminTargets = Array.from(
      new Set([
        "sambucci.simone@gmail.com",
        "viacamperapp@gmail.com",
        ...(process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL.toLowerCase().trim()] : [])
      ])
    );
    console.log(`[Email Service] Preparing to send email to [${adminTargets.join(", ")}]: "${subject}"`);
    
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        let anySuccess = false;
        for (const recipient of adminTargets) {
          try {
            const res: any = await resend.emails.send({
              from: 'ViaCamperApp <onboarding@resend.dev>',
              to: recipient,
              subject: subject,
              html: htmlContent
            });
            if (res?.error) {
              console.log(`[Email Service] Resend notice for ${recipient}: ${res.error.message || 'validation notice'}`);
            } else {
              anySuccess = true;
              console.log(`[Email Service] Email sent successfully via Resend to ${recipient}:`, res.data);
            }
          } catch (itemErr: any) {
            console.warn(`[Email Service] Could not send to ${recipient}:`, itemErr?.message || itemErr);
          }
        }
        return { success: anySuccess };
      } catch (err: any) {
        console.error(`[Email Service] Failed to send email via Resend:`, err?.message || err);
        return { success: false, error: err };
      }
    } else {
      console.warn(`[Email Service] RESEND_API_KEY non definita. Impossibile inviare email a [${adminTargets.join(", ")}] per: "${subject}".`);
      return { success: false, reason: "RESEND_API_KEY missing" };
    }
  }

  // --- NOTIFY PHOTO SUBMISSION ROUTE (Concorsi, Aree Sosta, Foto Generiche) ---
  app.post("/api/notify-photo-submission", async (req, res) => {
    try {
      const {
        type = "concorso", // "concorso" | "area_sosta" | "proposta_sosta" | "generico"
        userName = "Utente ViaCamperApp",
        userEmail = "",
        title = "",
        placeName = "",
        location = "",
        imageUrl = "",
        caption = "",
        details = {}
      } = req.body;

      const labelType =
        type === "concorso"
          ? "🏆 Concorso Foto Aree Sosta / Sfide"
          : type === "area_sosta"
          ? "📍 Nuova Foto Area di Sosta"
          : type === "proposta_sosta"
          ? "🆕 Nuova Proposta Sosta con Foto"
          : "📸 Invio Foto Utente";

      const displayTitle = placeName || title || "Foto ViaCamperApp";
      const subject = `📸 Nuova foto ricevuta [${labelType}]: ${displayTitle}`;

      const timestamp = new Date().toISOString();

      // 1. Store notification in Firestore adminNotifications
      try {
        await firestoreDb.collection("adminNotifications").add({
          type: "photo_submission",
          category: type,
          userName,
          userEmail,
          title: displayTitle,
          location,
          imageUrl,
          caption,
          details,
          timestamp,
          read: false
        });
      } catch (fsErr) {
        console.warn("[Photo Notification API] Could not write to adminNotifications:", fsErr);
      }

      // 2. Build rich HTML email template
      const targetAdminEmail = process.env.ADMIN_EMAIL || "viacamperapp@gmail.com";
      const isBase64 = imageUrl?.startsWith("data:");
      const imagePreviewHtml = imageUrl
        ? isBase64
          ? `<div style="margin-top: 16px; text-align: center; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
               <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #475569;">Foto caricata dall'utente:</p>
               <img src="${imageUrl}" alt="Foto Utente" style="max-width: 100%; max-height: 420px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); object-fit: cover;" />
             </div>`
          : `<div style="margin-top: 16px; text-align: center; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
               <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #475569;">Foto caricata dall'utente:</p>
               <img src="${imageUrl}" alt="Foto Utente" style="max-width: 100%; max-height: 420px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); object-fit: cover;" />
               <p style="margin-top: 10px;"><a href="${imageUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background: #059669; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: bold;">Visualizza o scarica foto originale &rarr;</a></p>
             </div>`
        : `<p style="font-style: italic; color: #94a3b8;">(Nessun file immagine allegato)</p>`;

      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #f1f5f9; padding: 24px; border-radius: 18px;">
          <div style="background: linear-gradient(135deg, #1C3D2B 0%, #2D5A40 100%); padding: 20px 24px; border-radius: 14px; color: #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.15);">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #a7f3d0; margin-bottom: 4px;">ViaCamperApp • Notifica Amministratore</div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff;">${labelType}</h2>
          </div>

          <div style="background: #ffffff; padding: 24px; border-radius: 14px; margin-top: 16px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <h3 style="margin-top: 0; margin-bottom: 16px; color: #0f172a; font-size: 18px; font-weight: 800; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">
              ${displayTitle}
            </h3>

            <table style="width: 100%; font-size: 13.5px; color: #334155; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; width: 140px; color: #64748b;">Tipologia:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${labelType}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Inviato da:</td>
                <td style="padding: 8px 0;"><strong>${userName}</strong> ${userEmail ? `<span style="color: #64748b;">(&lt;${userEmail}&gt;)</span>` : ''}</td>
              </tr>
              ${location ? `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Località / Luogo:</td>
                <td style="padding: 8px 0;">${location}</td>
              </tr>` : ''}
              ${caption ? `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Note / Descrizione:</td>
                <td style="padding: 8px 0; font-style: italic; color: #1e293b;">"${caption}"</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Data di invio:</td>
                <td style="padding: 8px 0;">${new Date().toLocaleString('it-IT')}</td>
              </tr>
            </table>

            ${imagePreviewHtml}
          </div>

          <p style="font-size: 11.5px; color: #94a3b8; text-align: center; margin-top: 20px; line-height: 1.5;">
            Email di notifica per l'amministratore di ViaCamperApp (${targetAdminEmail}).<br/>
            I contributi inviati sono consultabili e gestibili anche nell'applicazione.
          </p>
        </div>
      `;

      // 3. Send email via Resend
      const emailRes = await sendAdminNotificationEmail(subject, htmlContent);

      return res.json({
        success: true,
        message: "Notifica foto elaborata ed email inviata all'amministratore.",
        emailSent: emailRes.success
      });
    } catch (err: any) {
      console.error("Error in /api/notify-photo-submission:", err);
      return res.status(500).json({ error: err.message || "Errore durante l'invio della notifica foto." });
    }
  });

  // --- FEEDBACK & SUGGESTIONS ENDPOINTS ---
  // Submit feedback
  app.post("/api/feedback", (req, res) => {
    try {
      const { name, category, message, photo } = req.body;
      if (!name || !category || !message) {
        return res.status(400).json({ error: "Nome, tipologia e messaggio sono obbligatori." });
      }

      const list = loadFeedbacks();
      const newFeedback = {
        id: `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        category,
        message,
        photo: photo || null,
        createdAt: new Date().toISOString(),
      };

      list.push(newFeedback);
      saveFeedbacks(list);
      console.log(`[Feedback API] New feedback received: ${newFeedback.category} from ${newFeedback.name}`);
      res.json({ success: true, feedback: newFeedback });
    } catch (err: any) {
      console.error("Error submitting feedback:", err);
      res.status(500).json({ error: err.message || "Errore interno." });
    }
  });

  // Get all feedbacks for admin
  app.get("/api/admin/feedbacks", (req, res) => {
    try {
      const list = loadFeedbacks();
      res.json(list);
    } catch (err: any) {
      console.error("Error loading feedbacks:", err);
      res.status(500).json({ error: err.message || "Errore interno." });
    }
  });

  // Get all admin notifications (rejected contents, etc)
  app.get("/api/admin/notifications", async (req, res) => {
    try {
      let snapshot;
      try {
        snapshot = await firestoreDb.collection("adminNotifications").orderBy('timestamp', 'desc').get();
      } catch (err) {
        console.warn("Failed to fetch admin notifications with orderBy, falling back to unordered get:", err);
        snapshot = await firestoreDb.collection("adminNotifications").get();
      }
      const notifications: any[] = [];
      snapshot.forEach((doc: any) => {
        notifications.push({ id: doc.id, ...doc.data() });
      });
      // Sort in memory by timestamp descending
      notifications.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      res.json(notifications);
    } catch (err: any) {
      console.error("Error loading admin notifications:", err);
      res.json([]);
    }
  });

  // Client endpoint: report a crash / JS runtime exception
  app.post("/api/report-crash", async (req, res) => {
    try {
      const { message, stack, componentStack, userEmail, url, userAgent, appVersion } = req.body || {};
      if (!message) {
        return res.status(400).json({ error: "Messaggio errore obbligatorio" });
      }

      const report = {
        message: String(message).slice(0, 1000),
        stack: stack ? String(stack).slice(0, 4000) : "",
        componentStack: componentStack ? String(componentStack).slice(0, 4000) : "",
        userEmail: userEmail ? String(userEmail).slice(0, 100) : "Anonimo",
        url: url ? String(url).slice(0, 300) : "",
        userAgent: userAgent ? String(userAgent).slice(0, 300) : "",
        appVersion: appVersion || "1.0.0",
        status: "open",
        timestamp: new Date().toISOString()
      };

      console.error("[CRASH REPORT RECEIVED]", report.message, "| User:", report.userEmail);

      let docId = "crash-" + Date.now();
      try {
        const added = await firestoreDb.collection("crashReports").add(report);
        docId = added.id;
      } catch (fsErr) {
        console.warn("[Crash API] Firestore write failed, logged to console:", fsErr);
      }

      // Optional email notification to admin
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          const targetAdminEmail = process.env.ADMIN_EMAIL || "viacamperapp@gmail.com";
          resend.emails.send({
            from: "ViaCamperApp <onboarding@resend.dev>",
            to: targetAdminEmail,
            subject: `🚨 ViaCamper: Nuovo Crash Log [${report.userEmail}]`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; background: #fff1f2; border-radius: 12px; border: 1px solid #fecdd3;">
                <h2 style="color: #9f1239; margin-top: 0;">🚨 Segnalazione Crash / Errore Runtime</h2>
                <p><strong>Utente:</strong> ${report.userEmail}</p>
                <p><strong>Errore:</strong> ${report.message}</p>
                <p><strong>Pagina/URL:</strong> ${report.url}</p>
                <p><strong>Data/Ora:</strong> ${report.timestamp}</p>
                <pre style="background: #1e293b; color: #f8fafc; padding: 12px; border-radius: 8px; font-size: 11px; overflow-x: auto;">${report.stack || 'Nessuno stack trace'}</pre>
                <p style="font-size: 12px; color: #475569;">Puoi gestire questo crash log direttamente dal Pannello Moderatore in ViaCamperApp sotto <strong>Crash & Logs</strong>.</p>
              </div>
            `
          }).then(res => {
            console.log("[Crash API] Email alert sent successfully to:", targetAdminEmail);
          }).catch(e => {
            console.warn("[Crash API] Failed to send email alert in promise:", e);
          });
        } catch (e) {
          console.warn("[Crash API] Failed to setup email alert:", e);
        }
      }

      res.json({ success: true, id: docId });
    } catch (err: any) {
      console.error("Error saving crash report:", err);
      res.status(500).json({ error: "Errore durante il salvataggio del report." });
    }
  });

  // Admin endpoint: Get all crash reports
  app.get("/api/admin/crash-reports", async (req, res) => {
    try {
      let snapshot;
      try {
        snapshot = await firestoreDb.collection("crashReports").orderBy('timestamp', 'desc').get();
      } catch (e) {
        snapshot = await firestoreDb.collection("crashReports").get();
      }
      const reports: any[] = [];
      snapshot.forEach((doc: any) => {
        reports.push({ id: doc.id, ...doc.data() });
      });
      reports.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      res.json(reports);
    } catch (err: any) {
      console.error("Error fetching crash reports:", err);
      res.json([]);
    }
  });

  // Admin endpoint: Delete/clear a crash report
  app.delete("/api/admin/crash-reports/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (id) {
        await firestoreDb.collection("crashReports").doc(id).delete();
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting crash report:", err);
      if (err.message && err.message.includes("RESOURCE_EXHAUSTED")) {
        res.status(429).json({ error: "Limite quota giornaliera raggiunto. Riprova domani." });
      } else {
        res.status(500).json({ error: "Errore eliminazione." });
      }
    }
  });

  // Admin endpoint: Clear all crash reports
  app.post("/api/admin/crash-reports/clear-all", async (req, res) => {
    try {
      const snapshot = await firestoreDb.collection("crashReports").get();
      const batch = firestoreDb.batch();
      snapshot.forEach((doc: any) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error clearing all crash reports:", err);
      if (err.message && err.message.includes("RESOURCE_EXHAUSTED")) {
        res.status(429).json({ error: "Limite quota giornaliera raggiunto. Riprova domani." });
      } else {
        res.status(500).json({ error: "Errore pulizia crash log." });
      }
    }
  });

  // Reply to target feedback
  app.post("/api/admin/reply-feedback", (req, res) => {
    try {
      const { id, reply } = req.body;
      if (!id || !reply) {
        return res.status(400).json({ error: "ID e risposta sono obbligatori." });
      }

      const list = loadFeedbacks();
      const feedback = list.find((f: any) => f.id === id);
      if (!feedback) {
        return res.status(404).json({ error: "Segnalazione/suggerimento non trovato." });
      }

      feedback.reply = reply;
      feedback.repliedAt = new Date().toISOString();
      saveFeedbacks(list);
      console.log(`[Feedback API] Replied to feedback: ${id}`);
      res.json({ success: true, feedback });
    } catch (err: any) {
      console.error("Error replying to feedback:", err);
      res.status(500).json({ error: err.message || "Errore interno." });
    }
  });

  // --- COMMUNITY ITINERARIES & MODERATION API ---

  // Propose a community itinerary
  app.post("/api/propose-community-itinerary", async (req, res) => {
    try {
      const {
        title,
        description,
        authorName = "Camperista Community",
        authorEmail = "",
        durationDays = 3,
        startLocation = "",
        endLocation = "",
        waypoints = [],
        travelStyle = "Generico",
        interests = [],
        totalKm = "",
        days = []
      } = req.body;

      if (!title || !description) {
        return res.status(400).json({ error: "Titolo e descrizione sono obbligatori." });
      }

      const itineraryId = `community_itin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const timestamp = new Date().toISOString();

      const newItinerary = {
        id: itineraryId,
        title,
        description,
        authorName,
        authorEmail,
        createdAt: timestamp,
        durationDays: Number(durationDays) || 3,
        startLocation,
        endLocation,
        waypoints,
        travelStyle,
        interests,
        totalKm,
        status: "pending",
        source: "community",
        days: days || []
      };

      // 1. Save to Firestore community_itineraries
      try {
        await firestoreDb.collection("community_itineraries").doc(itineraryId).set(removeUndefined(newItinerary));
      } catch (fsErr) {
        console.warn("[Community Itineraries API] Firestore write warning:", fsErr);
      }

      // 2. Add notification to adminNotifications
      try {
        await firestoreDb.collection("adminNotifications").add({
          type: "community_itinerary",
          itineraryId,
          title,
          authorName,
          authorEmail,
          timestamp,
          read: false
        });
        await notifyModerators("itineraries", "Nuovo Itinerario Proposto", `Un nuovo itinerario è in attesa di approvazione: ${title}`, { itineraryId });
      } catch (err) {
        console.warn("[Community Itineraries API] Could not write admin notification:", err);
      }

      // 3. Send notification email to admin (viacamperapp@gmail.com)
      const subject = `🗺️ Nuovo Itinerario Proposto da ${authorName}: "${title}"`;
      const htmlEmail = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; background: #f8fafc; padding: 24px; border-radius: 16px;">
          <div style="background: linear-gradient(135deg, #1C3D2B 0%, #3E4A35 100%); padding: 20px 24px; border-radius: 12px; color: #ffffff;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #a7f3d0; margin-bottom: 4px;">ViaCamperApp • Moderazione Itinerari</div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff;">🗺️ Nuovo Itinerario Proposto dalla Community</h2>
          </div>
          <div style="background: #ffffff; padding: 24px; border-radius: 12px; margin-top: 16px; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; color: #0f172a; font-size: 18px; font-weight: 800;">${title}</h3>
            <p style="color: #475569; font-size: 14px; line-height: 1.5;">${description}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
            <table style="width: 100%; font-size: 13px; color: #334155;">
              <tr><td style="padding: 4px 0; font-weight: bold; width: 130px;">Inviato da:</td><td>${authorName} ${authorEmail ? `(&lt;${authorEmail}&gt;)` : ''}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold;">Durata:</td><td>${durationDays} Giorni</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold;">Partenza & Arrivo:</td><td>${startLocation || 'N/D'} ➔ ${endLocation || 'N/D'}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold;">Tappe principali:</td><td>${Array.isArray(waypoints) ? waypoints.join(', ') : 'N/D'}</td></tr>
            </table>
            <div style="margin-top: 20px; padding: 14px; background: #f1f5f9; border-radius: 10px; text-align: center;">
              <p style="margin: 0; font-size: 13px; font-weight: bold; color: #1e293b;">Apri il Pannello Moderatore in ViaCamperApp per approvare o rifiutare questo itinerario.</p>
            </div>
          </div>
        </div>
      `;

      try {
        await sendAdminNotificationEmail(subject, htmlEmail);
      } catch (emailErr) {
        console.warn("[Community Itineraries API] Warning sending notification email:", emailErr);
      }

      // Send push notification to admin about new proposed itinerary
      const adminEmailForItin = process.env.ADMIN_EMAIL || "viacamperapp@gmail.com";
      if (adminEmailForItin) {
        sendPushNotification(
          adminEmailForItin,
          `🗺️ Nuovo itinerario proposto!`,
          `L'utente ${authorName} ha proposto l'itinerario "${title}".`,
          { type: "new_itinerary", itineraryId }
        ).catch(err => console.error("[FCM Push] Failed to notify admin of new itinerary:", err));
      }

      res.json({ success: true, id: itineraryId, message: "Itinerario inviato per la moderazione con successo!" });
    } catch (err: any) {
      console.error("Error proposing community itinerary:", err);
      res.status(500).json({ error: err.message || "Errore durante l'invio dell'itinerario." });
    }
  });

  // Get community itineraries
  app.get("/api/community-itineraries", async (req, res) => {
    try {
      const includePending = req.query.includePending === "true";
      const snapshot = await firestoreDb.collection("community_itineraries").get();
      const list: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (includePending || data.status === "approved") {
          list.push(data);
        }
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      res.json({ success: true, itineraries: list });
    } catch (err: any) {
      console.error("Error fetching community itineraries:", err);
      res.status(500).json({ error: err.message || "Errore durante il recupero degli itinerari." });
    }
  });

  // Admin Approve Community Itinerary
  app.post("/api/admin/approve-community-itinerary", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "ID itinerario mancante." });

      const docRef = firestoreDb.collection("community_itineraries").doc(id);
      const docSnap = await docRef.get();
      
      await docRef.update({
        status: "approved",
        approvedAt: new Date().toISOString()
      });

      console.log(`[Community Itineraries API] Approved itinerary: ${id}`);

      // Notify the author of approval
      if (docSnap.exists) {
        const authorEmail = docSnap.data()?.authorEmail;
        if (authorEmail) {
          sendPushNotification(
            authorEmail,
            `🗺️ Itinerario Approvato!`,
            `Il tuo itinerario "${docSnap.data().title}" è stato approvato ed è ora pubblicato nella Community!`,
            { type: "itinerary_approved", itineraryId: id }
          ).catch(err => console.error("[FCM Push] Failed to notify user of itinerary approval:", err));
        }
      }

      res.json({ success: true, message: "Itinerario approvato e pubblicato nella Community!" });
    } catch (err: any) {
      console.error("Error approving itinerary:", err);
      res.status(500).json({ error: err.message || "Errore durante l'approvazione dell'itinerario." });
    }
  });

  // Admin Reject Community Itinerary
  app.post("/api/admin/reject-community-itinerary", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "ID itinerario mancante." });

      await firestoreDb.collection("community_itineraries").doc(id).delete();

      console.log(`[Community Itineraries API] Rejected and deleted itinerary: ${id}`);
      res.json({ success: true, message: "Itinerario rifiutato ed eliminato." });
    } catch (err: any) {
      console.error("Error rejecting itinerary:", err);
      res.status(500).json({ error: err.message || "Errore durante il rifiuto dell'itinerario." });
    }
  });

  // Self-correct files that are created with Windows backslashes by mistake at runtime
  try {
    const rootDir = process.cwd();
    const publicDir = path.join(rootDir, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const scanAndCopy = (dir: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'public') continue;
        const fullPath = path.join(dir, item);
        let stat;
        try {
          stat = fs.statSync(fullPath);
        } catch (e) {
          continue;
        }

        // Check if the item's name or path itself has backslashes (e.g. windows style folder or filename)
        if (item.includes('\\') || item.includes('public\\')) {
          const nameClean = item.split('\\').pop() || '';
          if (
            nameClean.endsWith('.png') ||
            nameClean.endsWith('.svg') ||
            nameClean.endsWith('.webp') ||
            nameClean.endsWith('.jpg') ||
            nameClean.endsWith('.jpeg')
          ) {
            const destPath = path.join(publicDir, nameClean);
            const size = stat.size;
            // Only copy if destination is missing, or if we have a larger/actual file size
            if (size > 0 && (!fs.existsSync(destPath) || fs.statSync(destPath).size === 0)) {
              fs.copyFileSync(fullPath, destPath);
              console.log(`[Self-Correction] Copied misplaced file from ${fullPath} (size: ${size}) -> ${destPath}`);
            }
          }
        }

        if (stat.isDirectory()) {
          scanAndCopy(fullPath);
        }
      }
    };
    scanAndCopy(rootDir);
  } catch (err) {
    console.error("[Self-Correction] Failed scanning for misplaced backslash files:", err);
  }

  // Manual promo push test trigger for administrators/developers
  app.post("/api/admin/trigger-promo-test", async (req, res) => {
    try {
      if (PROMO_MESSAGES.length === 0) {
        return res.status(400).json({ error: "Nessun messaggio promozionale configurato." });
      }
      const randomIndex = Math.floor(Math.random() * PROMO_MESSAGES.length);
      const promo = PROMO_MESSAGES[randomIndex];
      
      console.log(`[Promo Push Test] Manually triggering test push: "${promo.title}"`);
      await sendPushNotificationToAll(promo.title, promo.body, { 
        type: "promo_push_test", 
        promoIndex: String(randomIndex) 
      });
      
      res.json({ 
        success: true, 
        message: `Push di test inviato con successo a tutti gli utenti registrati!`, 
        promo 
      });
    } catch (err: any) {
      console.error("[Promo Push Test] Error sending manual test:", err);
      res.status(500).json({ error: "Errore durante l'invio del push di test.", details: err.message });
    }
  });

  // GET route for web client real-time simulated push notifications polling fallback
  app.get("/api/push-simulation/latest", (req, res) => {
    res.json(latestPromoPushInMemory);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use(express.static(path.join(process.cwd(), 'public')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Startup cleanup for fake places
  async function cleanupFakePlaces() {
    try {
      const fakeNames = [
        "Campeggio Riva Verde",
        "Service Scarico Acque Comunale",
        "Area Attrezzata Camper Oasi",
        "Sottopasso Ferrovia SP8",
        "Ponte Stretto Mulino",
        "Limitazione Peso Ponte SP3",
        "Sottopasso SP8 Vecchia Ferrovia"
      ];
      const snapshot = await firestoreDb.collection("places").get();
      let count = 0;
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (fakeNames.includes(data.name) || fakeNames.includes(data.roadName)) {
          await doc.ref.delete();
          count++;
        }
      }
      if (count > 0) console.log(`[Cleanup] Deleted ${count} fake places from database.`);
    } catch (e) {
      console.error("[Cleanup] Error deleting fake places:", e);
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    cleanupFakePlaces().catch(console.error);

    // Start background scheduler for promotional push notifications
    console.log("[Promo Push] Initializing automatic promotional push scheduler...");
    // 15 seconds delay after boot
    setTimeout(() => {
      console.log("[Promo Push] Running initial boot-time promo push check...");
      checkAndSendPromotionalPush().catch(console.error);
    }, 15000);

    // Repeat every 1 hour (3600000 ms)
    setInterval(() => {
      console.log("[Promo Push] Running periodic hourly promo push check...");
      checkAndSendPromotionalPush().catch(console.error);
    }, 3600000);
  });
}

startServer();
