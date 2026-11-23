import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Deadline } from '../types';

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

const oauthAppConfig = {
  projectId: (firebaseConfig as any).oauthProjectId || firebaseConfig.projectId,
  appId: (firebaseConfig as any).oauthAppId || firebaseConfig.appId,
  apiKey: (firebaseConfig as any).oauthApiKey || firebaseConfig.apiKey,
  authDomain: (firebaseConfig as any).oauthAuthDomain || firebaseConfig.authDomain,
};

const oauthApp =
  getApps().find((a) => a.name === 'viacamper-google-calendar-oauth') ||
  initializeApp(oauthAppConfig, 'viacamper-google-calendar-oauth');

// Initialize Auth with inMemoryPersistence and WITHOUT popupRedirectResolver at startup
// so Firebase Auth never opens a hidden cross-origin __/auth/iframe on page load
// (which causes auth/network-request-failed on mobile browsers and iframes).
function getSafeOAuthInstance() {
  try {
    return initializeAuth(oauthApp, {
      persistence: inMemoryPersistence,
    });
  } catch {
    return getAuth(oauthApp);
  }
}

const auth = getSafeOAuthInstance();
const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token strictly in memory (never in localStorage/sessionStorage).
let cachedAccessToken: string | null = null;
let cachedUserEmail: string | null = null;

type AuthListener = (state: {
  user: User | null;
  userEmail: string | null;
  token: string | null;
  needsAuth: boolean;
}) => void;
const listeners = new Set<AuthListener>();

function notifyListeners() {
  const currentUser = auth.currentUser;
  const email = currentUser?.email || cachedUserEmail;
  const state = {
    user: currentUser,
    userEmail: email,
    token: cachedAccessToken,
    needsAuth: !cachedAccessToken,
  };
  listeners.forEach((fn) => fn(state));
}

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else if (!cachedAccessToken) {
      if (onAuthFailure) onAuthFailure();
    }
    notifyListeners();
  });
};

export const subscribeCalendarAuth = (listener: AuthListener) => {
  listeners.add(listener);
  listener({
    user: auth.currentUser,
    userEmail: auth.currentUser?.email || cachedUserEmail,
    token: cachedAccessToken,
    needsAuth: !cachedAccessToken,
  });
  return () => {
    listeners.delete(listener);
  };
};

// Load Google Identity Services (GIS) script on demand for direct OAuth2 token requests
// without relying on a cross-origin firebaseapp.com/__/auth/iframe
function loadGisScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  const w = window as any;
  if (w.google?.accounts?.oauth2) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.getElementById('google-gsi-client-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(w.google?.accounts?.oauth2)));
      existing.addEventListener('error', () => resolve(false));
      setTimeout(() => resolve(Boolean(w.google?.accounts?.oauth2)), 3000);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(Boolean(w.google?.accounts?.oauth2));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

async function signInWithGoogleIdentityServices(): Promise<string | null> {
  const clientId = (firebaseConfig as any).oAuthClientId;
  if (!clientId) return null;
  const loaded = await loadGisScript();
  if (!loaded) return null;

  const w = window as any;
  return new Promise((resolve) => {
    try {
      const tokenClient = w.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: [...SCOPES, 'email', 'profile'].join(' '),
        callback: (response: any) => {
          if (response && response.access_token) {
            resolve(response.access_token);
          } else {
            resolve(null);
          }
        },
        error_callback: () => {
          resolve(null);
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch {
      resolve(null);
    }
  });
}

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{
  user: User | null;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;

    // 1. Try Firebase Auth signInWithPopup with explicit browserPopupRedirectResolver
    try {
      const result = await signInWithPopup(
        auth,
        provider,
        browserPopupRedirectResolver
      );
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        cachedUserEmail = result.user?.email || null;
        notifyListeners();
        return { user: result.user, accessToken: cachedAccessToken };
      }
    } catch (popupErr: any) {
      // Do not log FirebaseError stack trace to console.error (prevents AI Studio error overlay)
      const code = String(popupErr?.code || '');
      if (
        code.includes('popup-closed-by-user') ||
        code.includes('cancelled-popup-request')
      ) {
        return null;
      }
      // If auth/network-request-failed (e.g. blocked 3P __/auth/iframe), seamlessly fall back to GIS Token Client
    }

    // 2. Fallback to Google Identity Services direct OAuth2 token flow
    const gisToken = await signInWithGoogleIdentityServices();
    if (gisToken) {
      cachedAccessToken = gisToken;
      try {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${gisToken}` },
        });
        if (infoRes.ok) {
          const info = await infoRes.json();
          if (info?.email) cachedUserEmail = info.email;
        }
      } catch {}
      notifyListeners();
      return { user: auth.currentUser, accessToken: cachedAccessToken };
    }

    return null;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const clearAccessToken = () => {
  cachedAccessToken = null;
  notifyListeners();
};

export const logoutCalendarAuth = async () => {
  try {
    await auth.signOut();
  } catch {}
  cachedAccessToken = null;
  cachedUserEmail = null;
  notifyListeners();
};

export interface CalendarEventDraft {
  id?: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;  // YYYY-MM-DD (inclusive in UI)
  location?: string;
  description?: string;
  categoryLabel?: string;
  reminderDaysBefore?: number;
}

export interface GoogleCalendarRemoteEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

function addOneDayIso(dateStr: string): string {
  const clean = (dateStr || '').slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().slice(0, 10);
  }
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1));
  return dt.toISOString().slice(0, 10);
}

function normalizeIsoDate(dateStr?: string): string {
  if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr.trim())) {
    return dateStr.trim().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function buildGoogleCalendarTemplateUrl(draft: CalendarEventDraft): string {
  const startIso = normalizeIsoDate(draft.startDate);
  const inclusiveEndIso = normalizeIsoDate(draft.endDate || draft.startDate);
  const effectiveEnd = inclusiveEndIso >= startIso ? inclusiveEndIso : startIso;
  const exclusiveEndIso = addOneDayIso(effectiveEnd);

  const startCompact = startIso.replace(/-/g, '');
  const endCompact = exclusiveEndIso.replace(/-/g, '');
  const details = [draft.description || '', '', '— Salvato con ViaCamper']
    .join('\n')
    .trim();

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: draft.title,
    dates: `${startCompact}/${endCompact}`,
    details,
  });
  if (draft.location) {
    params.set('location', draft.location);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  draft: CalendarEventDraft
): Promise<GoogleCalendarRemoteEvent> {
  const startIso = normalizeIsoDate(draft.startDate);
  const inclusiveEndIso = normalizeIsoDate(draft.endDate || draft.startDate);
  const effectiveEnd = inclusiveEndIso >= startIso ? inclusiveEndIso : startIso;
  // Google Calendar all-day end.date is exclusive
  const exclusiveEndIso = addOneDayIso(effectiveEnd);

  const reminderMinutes =
    typeof draft.reminderDaysBefore === 'number' && draft.reminderDaysBefore > 0
      ? draft.reminderDaysBefore * 24 * 60
      : 24 * 60;

  const body = {
    summary: draft.title,
    location: draft.location || undefined,
    description: [
      draft.description || '',
      '',
      '— Salvato con ViaCamper',
    ]
      .join('\n')
      .trim(),
    start: {
      date: startIso,
    },
    end: {
      date: exclusiveEndIso,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: reminderMinutes },
        { method: 'popup', minutes: 9 * 60 },
      ],
    },
  };

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (res.status === 401 || res.status === 403) {
    clearAccessToken();
    throw new Error('AUTH_EXPIRED');
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Errore Google Calendar (${res.status}): ${errText}`);
  }

  return (await res.json()) as GoogleCalendarRemoteEvent;
}

export async function listViaCamperCalendarEvents(
  accessToken: string
): Promise<GoogleCalendarRemoteEvent[]> {
  const timeMin = new Date(Date.now() - 30 * 86400000).toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(
    'ViaCamper'
  )}&timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime&maxResults=25`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401 || res.status === 403) {
    clearAccessToken();
    throw new Error('AUTH_EXPIRED');
  }

  if (!res.ok) {
    throw new Error(`Errore lettura eventi Google Calendar (${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
      eventId
    )}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    clearAccessToken();
    throw new Error('AUTH_EXPIRED');
  }

  if (!res.ok && res.status !== 204 && res.status !== 410) {
    throw new Error(`Errore eliminazione evento (${res.status})`);
  }
}

export function buildCalendarDraftFromDeadline(deadline: Deadline): CalendarEventDraft {
  const details: string[] = [
    `Categoria: ${deadline.category}`,
  ];
  if (deadline.price !== undefined) {
    details.push(`Costo stimato/registrato: €${deadline.price}`);
  }
  if (deadline.km !== undefined) {
    details.push(`Soglia chilometrica: ${deadline.km.toLocaleString('it-IT')} km`);
  }
  if (deadline.repeatMonths) {
    details.push(`Ricorrenza: ogni ${deadline.repeatMonths} mesi`);
  }
  if (deadline.notes) {
    details.push(`Note: ${deadline.notes}`);
  }

  return {
    id: deadline.id,
    title: `🚐 Scadenza Camper: ${deadline.title}`,
    startDate: normalizeIsoDate(deadline.dueDate),
    endDate: normalizeIsoDate(deadline.dueDate),
    categoryLabel: `Manutenzione & Scadenze · ${deadline.category}`,
    description: details.join('\n'),
    reminderDaysBefore: 7,
  };
}

export function buildCalendarDraftFromSagra(sagra: {
  id?: string;
  title: string;
  startDate?: string;
  endDate?: string;
  dates?: string;
  locationName?: string;
  region?: string;
  description?: string;
  specialties?: string[];
  camperParking?: string;
  categoryLabel?: string;
}): CalendarEventDraft {
  const startIso = normalizeIsoDate(sagra.startDate);
  const endIso = normalizeIsoDate(sagra.endDate || sagra.startDate);

  const details: string[] = [];
  if (sagra.dates) {
    details.push(`📅 Periodo: ${sagra.dates}`);
  }
  if (sagra.description) {
    details.push(sagra.description);
  }
  if (Array.isArray(sagra.specialties) && sagra.specialties.length > 0) {
    details.push(`🍽️ Specialità: ${sagra.specialties.join(', ')}`);
  }
  if (sagra.camperParking) {
    details.push(`🏕️ Sosta Camper consigliata: ${sagra.camperParking}`);
  }

  const locationStr = [sagra.locationName, sagra.region].filter(Boolean).join(' - ');

  return {
    id: sagra.id,
    title: `🎪 ${sagra.title}`,
    startDate: startIso,
    endDate: endIso >= startIso ? endIso : startIso,
    location: locationStr || undefined,
    categoryLabel: sagra.categoryLabel || 'Sagra & Evento Camper',
    description: details.join('\n\n'),
    reminderDaysBefore: 2,
  };
}
