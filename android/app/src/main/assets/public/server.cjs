var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_sharp = __toESM(require("sharp"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var import_storage2 = require("firebase-admin/storage");
var import_messaging = require("firebase-admin/messaging");

// src/client-firestore.ts
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var import_storage = require("firebase/storage");
try {
  (0, import_firestore.setLogLevel)("silent");
} catch (e) {
}
function toFirestoreValue(val) {
  if (val === null || val === void 0) {
    return { nullValue: null };
  }
  if (typeof val === "boolean") {
    return { booleanValue: val };
  }
  if (typeof val === "number") {
    if (Number.isInteger(val)) {
      return { integerValue: val.toString() };
    }
    return { doubleValue: val };
  }
  if (typeof val === "string") {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue)
      }
    };
  }
  if (typeof val === "object") {
    const fields = {};
    for (const key of Object.keys(val)) {
      if (val[key] !== void 0) {
        fields[key] = toFirestoreValue(val[key]);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}
function toFirestoreFields(obj) {
  const fields = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== void 0) {
      fields[key] = toFirestoreValue(obj[key]);
    }
  }
  return fields;
}
function fromFirestoreValue(val) {
  if (!val) return null;
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return parseInt(val.integerValue, 10);
  if ("doubleValue" in val) return parseFloat(val.doubleValue);
  if ("stringValue" in val) return val.stringValue;
  if ("arrayValue" in val) {
    const values = val.arrayValue.values || [];
    return values.map(fromFirestoreValue);
  }
  if ("mapValue" in val) {
    const fields = val.mapValue.fields || {};
    const obj = {};
    for (const key of Object.keys(fields)) {
      obj[key] = fromFirestoreValue(fields[key]);
    }
    return obj;
  }
  return val;
}
function fromFirestoreFields(fields) {
  if (!fields) return {};
  const obj = {};
  for (const key of Object.keys(fields)) {
    obj[key] = fromFirestoreValue(fields[key]);
  }
  return obj;
}
var ServerRESTFirestoreAdapter = class {
  constructor(firebaseConfig2, databaseId) {
    this.projectId = firebaseConfig2.projectId;
    this.apiKey = firebaseConfig2.apiKey;
    this.databaseId = databaseId || "(default)";
  }
  getStorage() {
    return null;
  }
  collection(collectionPath) {
    return new ServerRESTCollectionQueryWrapper(this, collectionPath);
  }
  async runQuery(collectionPath, constraints, orderByField, orderDirection, limitCount) {
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents:runQuery?key=${this.apiKey}`;
    const parts = collectionPath.split("/");
    const collectionId = parts[parts.length - 1];
    const requestBody = {};
    if (parts.length > 1) {
      const parentPath = parts.slice(0, parts.length - 1).join("/");
      requestBody.parent = `projects/${this.projectId}/databases/${this.databaseId}/documents/${parentPath}`;
    }
    const filters = constraints.map((c) => ({
      fieldFilter: {
        field: { fieldPath: c.field },
        op: c.op === "==" ? "EQUAL" : c.op,
        value: toFirestoreValue(c.value)
      }
    }));
    const structuredQuery = {
      from: [{ collectionId }]
    };
    if (filters.length > 0) {
      structuredQuery.where = {
        compositeFilter: {
          op: "AND",
          filters
        }
      };
    }
    if (orderByField) {
      structuredQuery.orderBy = [
        {
          field: { fieldPath: orderByField },
          direction: orderDirection === "desc" ? "DESCENDING" : "ASCENDING"
        }
      ];
    }
    if (limitCount !== void 0) {
      structuredQuery.limit = limitCount;
    }
    requestBody.structuredQuery = structuredQuery;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`REST Firestore runQuery failed: ${res.statusText} - ${errText}`);
    }
    const results = await res.json();
    return (results || []).filter((r) => r && r.document).map((r) => {
      const docData = r.document;
      const id = docData.name.split("/").pop();
      const fields = fromFirestoreFields(docData.fields);
      return new DocumentSnapshotWrapper(id, true, fields);
    });
  }
  async getDoc(docPath) {
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${docPath}?key=${this.apiKey}`;
    const res = await fetch(url);
    if (res.status === 404) {
      return new DocumentSnapshotWrapper(docPath.split("/").pop() || "", false, null);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`REST Firestore getDoc failed: ${res.statusText} - ${text}`);
    }
    const data = await res.json();
    const fields = fromFirestoreFields(data.fields);
    return new DocumentSnapshotWrapper(docPath.split("/").pop() || "", true, fields);
  }
  async setDoc(docPath, data, merge = true) {
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${docPath}?key=${this.apiKey}`;
    const fields = toFirestoreFields(data);
    let targetUrl = url;
    if (merge) {
      const keys = Object.keys(data);
      if (keys.length > 0) {
        const fieldPaths = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
        targetUrl += `&${fieldPaths}`;
      }
    }
    const res = await fetch(targetUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`REST Firestore setDoc failed: ${res.statusText} - ${text}`);
    }
    return await res.json();
  }
  async deleteDoc(docPath) {
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${docPath}?key=${this.apiKey}`;
    const res = await fetch(url, { method: "DELETE" });
    if (res.status === 404) return;
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`REST Firestore deleteDoc failed: ${res.statusText} - ${text}`);
    }
  }
  async addDoc(colPath, data) {
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${colPath}?key=${this.apiKey}`;
    const fields = toFirestoreFields(data);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`REST Firestore addDoc failed: ${res.statusText} - ${text}`);
    }
    const result = await res.json();
    const id = result.name.split("/").pop();
    return { id };
  }
};
var ServerRESTCollectionQueryWrapper = class _ServerRESTCollectionQueryWrapper {
  constructor(adapter, path2, constraints = [], orderByField, orderDirection, limitCount) {
    this.constraints = [];
    this.adapter = adapter;
    this.path = path2;
    this.constraints = constraints;
    this.orderByField = orderByField;
    this.orderDirection = orderDirection;
    this.limitCount = limitCount;
  }
  doc(docId) {
    return new ServerRESTDocumentWrapper(this.adapter, this.path, docId);
  }
  where(field, op, val) {
    const newConstraints = [...this.constraints, { field, op, value: val }];
    return new _ServerRESTCollectionQueryWrapper(
      this.adapter,
      this.path,
      newConstraints,
      this.orderByField,
      this.orderDirection,
      this.limitCount
    );
  }
  orderBy(field, direction = "asc") {
    return new _ServerRESTCollectionQueryWrapper(
      this.adapter,
      this.path,
      this.constraints,
      field,
      direction,
      this.limitCount
    );
  }
  limit(n) {
    return new _ServerRESTCollectionQueryWrapper(
      this.adapter,
      this.path,
      this.constraints,
      this.orderByField,
      this.orderDirection,
      n
    );
  }
  async get() {
    const docs = await this.adapter.runQuery(
      this.path,
      this.constraints,
      this.orderByField,
      this.orderDirection,
      this.limitCount
    );
    return new QuerySnapshotWrapper(docs);
  }
  async add(data) {
    return await this.adapter.addDoc(this.path, data);
  }
};
var ServerRESTDocumentWrapper = class {
  constructor(adapter, colPath, docId) {
    this.adapter = adapter;
    this.colPath = colPath;
    this.docId = docId;
  }
  async get() {
    const fullPath = `${this.colPath}/${this.docId}`;
    return await this.adapter.getDoc(fullPath);
  }
  async set(data, options) {
    const fullPath = `${this.colPath}/${this.docId}`;
    const merge = options?.merge !== false;
    await this.adapter.setDoc(fullPath, data, merge);
  }
  async update(data) {
    const fullPath = `${this.colPath}/${this.docId}`;
    await this.adapter.setDoc(fullPath, data, true);
  }
  async delete() {
    const fullPath = `${this.colPath}/${this.docId}`;
    await this.adapter.deleteDoc(fullPath);
  }
};
var BrowserFirestoreAdapter = class {
  constructor(firebaseConfig2, databaseId) {
    try {
      if ((0, import_app.getApps)().length > 0) {
        this.app = (0, import_app.getApp)();
        this.db = (0, import_firestore.getFirestore)(this.app, databaseId);
      } else {
        const appName = "client-" + Date.now();
        this.app = (0, import_app.initializeApp)(firebaseConfig2, appName);
        this.db = (0, import_firestore.initializeFirestore)(this.app, { experimentalForceLongPolling: true }, databaseId);
      }
    } catch (err) {
      console.error("[BrowserFirestoreAdapter] Safe init failed, using default fallback:", err);
      try {
        this.app = (0, import_app.getApps)().length > 0 ? (0, import_app.getApp)() : (0, import_app.initializeApp)(firebaseConfig2);
        this.db = (0, import_firestore.getFirestore)(this.app, databaseId);
      } catch (innerErr) {
        console.error("[BrowserFirestoreAdapter] Safe fallback failed:", innerErr);
      }
    }
  }
  getStorage() {
    return (0, import_storage.getStorage)(this.app);
  }
  collection(collectionPath) {
    return new BrowserCollectionQueryWrapper(this.db, collectionPath);
  }
};
var BrowserCollectionQueryWrapper = class _BrowserCollectionQueryWrapper {
  constructor(db, path2, constraints = []) {
    this.constraints = [];
    this.db = db;
    this.path = path2;
    this.constraints = constraints;
  }
  doc(docId) {
    return new BrowserDocumentWrapper(this.db, this.path, docId);
  }
  where(field, op, val) {
    const newConstraints = [...this.constraints, (0, import_firestore.where)(field, op, val)];
    return new _BrowserCollectionQueryWrapper(this.db, this.path, newConstraints);
  }
  orderBy(field, direction = "asc") {
    const newConstraints = [...this.constraints, (0, import_firestore.orderBy)(field, direction)];
    return new _BrowserCollectionQueryWrapper(this.db, this.path, newConstraints);
  }
  limit(n) {
    const newConstraints = [...this.constraints, (0, import_firestore.limit)(n)];
    return new _BrowserCollectionQueryWrapper(this.db, this.path, newConstraints);
  }
  async get() {
    const colRef = (0, import_firestore.collection)(this.db, this.path);
    const q = (0, import_firestore.query)(colRef, ...this.constraints);
    const snap = await (0, import_firestore.getDocs)(q);
    const docs = snap.docs.map((d) => new DocumentSnapshotWrapper(d.id, true, d.data()));
    return new QuerySnapshotWrapper(docs);
  }
  async add(data) {
    const colRef = (0, import_firestore.collection)(this.db, this.path);
    const docRef = await (0, import_firestore.addDoc)(colRef, data);
    return { id: docRef.id };
  }
};
var BrowserDocumentWrapper = class {
  constructor(db, colPath, docId) {
    this.db = db;
    this.colPath = colPath;
    this.docId = docId;
  }
  async get() {
    const dRef = (0, import_firestore.doc)(this.db, this.colPath, this.docId);
    const snap = await (0, import_firestore.getDoc)(dRef);
    return new DocumentSnapshotWrapper(snap.id, snap.exists(), snap.exists() ? snap.data() : null);
  }
  async set(data, options) {
    const dRef = (0, import_firestore.doc)(this.db, this.colPath, this.docId);
    await (0, import_firestore.setDoc)(dRef, data, options);
  }
  async update(data) {
    const dRef = (0, import_firestore.doc)(this.db, this.colPath, this.docId);
    await (0, import_firestore.updateDoc)(dRef, data);
  }
  async delete() {
    const dRef = (0, import_firestore.doc)(this.db, this.colPath, this.docId);
    await (0, import_firestore.deleteDoc)(dRef);
  }
};
var QuerySnapshotWrapper = class {
  constructor(docs) {
    this.docs = docs;
  }
  get size() {
    return this.docs.length;
  }
  get empty() {
    return this.docs.length === 0;
  }
  forEach(callback) {
    this.docs.forEach(callback);
  }
};
var DocumentSnapshotWrapper = class {
  constructor(id, exists, fieldsData) {
    this.id = id;
    this.exists = exists;
    this.fieldsData = fieldsData;
  }
  data() {
    return this.fieldsData;
  }
};
var ClientFirestoreAdapter = class {
  constructor(firebaseConfig2, databaseId) {
    if (typeof window === "undefined") {
      this.impl = new ServerRESTFirestoreAdapter(firebaseConfig2, databaseId);
    } else {
      this.impl = new BrowserFirestoreAdapter(firebaseConfig2, databaseId);
      this.app = this.impl.app;
    }
  }
  getStorage() {
    return this.impl.getStorage();
  }
  collection(collectionPath) {
    return this.impl.collection(collectionPath);
  }
};

// src/data/mockData.ts
var INITIAL_COMMUNITY_MESSAGES = [
  /* SOCIAL POSTS (Rolly Examples) */
  {
    id: "social_post_rolly_welcome",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    text: '\u{1F44B} Benvenuti nella Community Social di ViaCamper! Condividete qui le foto delle vostre soste, paesaggi ed esperienze in camper. Cliccate su "Nuovo Post" per pubblicare il vostro primo scatto! \u{1F690}\u{1F4F8} #viacamper #rolly #community',
    timestamp: "2026-07-15T10:00:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Generale",
    type: "social",
    locationName: "Italia in Camper",
    mediaUrl: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=80",
    mediaType: "image",
    replies: []
  },
  {
    id: "social_post_rolly_tip",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    text: "\u{1F4F8} Scatto del giorno dalla Community! Vi ricordiamo di verificare la pressione degli pneumatici e il livello dell'olio prima di mettervi in viaggio. Buon viaggio e felice chilometraggio a tutti! \u{1F690}\u{1F4A8} #campertip #rolly #sicurezza",
    timestamp: "2026-07-15T11:00:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Sosta",
    type: "social",
    locationName: "Passo Pordoi, Trentino",
    mediaUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    mediaType: "image",
    replies: []
  },
  /* FORUM TOPICS (Rolly Examples) */
  {
    id: "rolly_topic_1",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    title: "\u{1F3D4}\uFE0F Consigli per il primo viaggio invernale sulla neve: riscaldamento e catene",
    text: "Ciao a tutti i camperisti! Con l'arrivo della stagione fredda, molti utenti chiedono consigli su come preparare il camper per la neve e la montagna. Qual \xE8 la vostra esperienza con le stufe Truma/Webasto e le coperte termiche esterne per il parabrezza? Condividiamo qui i migliori trucchi per evitare il congelamento delle acque grigie!",
    timestamp: "2026-07-15T12:01:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Sosta",
    type: "forum",
    replies: []
  },
  {
    id: "rolly_topic_2",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    title: "\u26A1 Autonomia Energetica in Camper: Pannelli Solari vs Batteria al Litio LiFePO4",
    text: "L'autonomia elettrica \xE8 uno dei temi pi\xF9 caldi tra chi viaggia in sosta libera. Voi que setup utilizzate? Avete fatto il passaggio alle batterie al litio LiFePO4? Quanti watt di pannelli solari ritenete indispensabili per lavorare o viaggiare anche in autunno ed inverno?",
    timestamp: "2026-07-15T12:02:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Generale",
    type: "forum",
    replies: []
  },
  {
    id: "rolly_topic_3",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    title: "\u{1F30A} Le migliori Aree Sosta d'Italia vicine al Mare e aperte 365 giorni l'anno",
    text: "Molti di noi amano il mare d'inverno o durante le mezze stagioni per la pace assoluta. Avete aree sosta o campeggi del cuore direttamente sulla spiaggia con tutti i servizi attivi tutto l'anno da raccomandare alla community?",
    timestamp: "2026-07-15T12:03:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Sosta",
    type: "forum",
    replies: []
  },
  {
    id: "rolly_topic_4",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    title: "\u{1F5FA}\uFE0F Consigli di Guida: Come evitare sottopassi bassi e strettoie nei borghi storici",
    text: "In Italia i borghi storici sono meravigliosi ma nascondono spesso strettoie insidiose e cavalcavia bassi! Quali accorgimenti usate durante la guida per evitare brutte sorprese con la mansarda del camper?",
    timestamp: "2026-07-15T12:04:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Generale",
    type: "forum",
    replies: []
  },
  {
    id: "rolly_topic_5",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    title: "\u{1F4E6} Organizzazione Spazi & Storage nel Garage e negli Armadietti",
    text: "L'ottimizzazione degli spazi e della distribuzione dei pesi in camper \xE8 una vera arte! Scatole trasparenti impilabili, ganci magnetici o sottovuoto per la biancheria: quali sono i vostri trucchi salvaspazio indispensabili?",
    timestamp: "2026-07-15T12:05:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Generale",
    type: "forum",
    replies: []
  },
  {
    id: "rolly_topic_6",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    title: "\u26FA Raduno e Incontro ViaCamper Primavera 2026: Proposte di Location!",
    text: "Cari amici camperisti, vi piacerebbe organizzare un incontro informale nei prossimi mesi? Proponete qui la vostra regione preferita (es. Toscana, Umbria, Laghi del Nord o Costa Adriatica) per incontrarci e fare una bella grigliata insieme!",
    timestamp: "2026-07-15T12:06:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Incontro",
    type: "forum",
    replies: []
  },
  {
    id: "rolly_topic_7",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    title: "\u{1F43E} Viaggiare in Camper con Animali Domestici (Cani e Gatti): I vostri consigli",
    text: "Chi viaggia con i propri amici a quattro zampe sa quanto sia un'esperienza meravigliosa! Come avete allestito la cuccia durante la marcia? Quali attenzioni usate per garantire il massimo comfort termico in estate?",
    timestamp: "2026-07-15T12:07:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Generale",
    type: "forum",
    replies: []
  },
  {
    id: "rolly_topic_8",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    title: "\u{1F331} Gestione Cassetta WC Chimico e Additivi Ecologici Bio",
    text: "Rispettare l'ambiente nelle operazioni di camper service \xE8 fondamentale. Molti camperisti stanno passando ai fluidi disgreganti biodegradabili o al sistema di ventilazione SOG. Qual \xE8 la vostra opinione ed esperienza?",
    timestamp: "2026-07-15T12:08:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Sosta",
    type: "forum",
    replies: []
  },
  {
    id: "rolly_topic_9",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    title: "\u{1F6E0}\uFE0F Cassetta degli Attrezzi d'Emergenza: Cosa tenere sempre a bordo?",
    text: "I piccoli imprevisti tecnici fanno parte dell'avventura! Oltre a nastro americano multiuso e fascette da elettricista, quali utensili, multimetro, fusibili and ricambi non dovrebbero mai mancare a bordo?",
    timestamp: "2026-07-15T12:09:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Generale",
    type: "forum",
    replies: []
  },
  {
    id: "rolly_topic_10",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    title: "\u{1F373} Cucina On The Road: Le vostre ricette pratiche e il Fornetto Versilia",
    text: "Quali sono i vostri piatti forti da preparare sui fornelli del camper? Usate il celebre fornetto Versilia per ciambelloni e focacce senza bisogno del forno tradizionale? Condividiamo le ricette pi\xF9 veloci e gustose!",
    timestamp: "2026-07-15T12:10:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Generale",
    type: "forum",
    replies: []
  },
  {
    id: "rolly_topic_11",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    title: "\u{1F4A8} Bollettino Vento e Raffiche sulle Coste: Come orientare la sosta",
    text: "Il vento forte o le raffiche improvvise possono rendere poco piacevole la notte in mansardato o van. Come verificate le correnti di vento prima di posizionare il camper e da che parte orientate il veicolo?",
    timestamp: "2026-07-15T12:11:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Meteo",
    type: "forum",
    replies: []
  },
  {
    id: "rolly_topic_12",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    title: "\u{1F690} Mansardato vs Semintegrale vs Motorhome vs Van: Esperienze a confronto",
    text: "Ogni tipologia di veicolo risponde a esigenze di viaggio diverse! Chi ha provato pi\xF9 modelli nel corso degli anni, quali vantaggi e svantaggi ha riscontrato? Vi va di raccontare la vostra evoluzione camperistica?",
    timestamp: "2026-07-15T12:12:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Generale",
    type: "forum",
    replies: []
  },
  {
    id: "rolly_topic_13",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    title: "\u2744\uFE0F Manutenzione Invernale and Rimessaggio: La Check-list per evitare danni",
    text: "Quando il camper resta fermo qualche settimana nei mesi freddi, pochi gesti salvano da brutte sorprese alla riapertura! Voi quali accorgimenti usate per proteggere impianti idrici, batterie e guarnizioni dei finestrini?",
    timestamp: "2026-07-15T12:13:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Generale",
    type: "forum",
    replies: []
  },
  {
    id: "rolly_topic_14",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    title: "\u{1F1EA}\u{1F1FA} Prima Volta all'Estero in Camper: Consigli per la Francia, Spagna e Nord Europa",
    text: "Organizzare il primo viaggio oltreconfine in camper richiede qualche piccola informazione preventiva su autostrade, bollini ambientali e regolamenti di sosta. Quali paesi ritenete pi\xF9 'camper-friendly' in Europa?",
    timestamp: "2026-07-15T12:14:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Sosta",
    type: "forum",
    replies: []
  },
  {
    id: "rolly_topic_15",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    title: "\u{1F512} Sicurezza durante le Soste Notturne: Sistemi antifurto e buon senso",
    text: "Dormire tranquilli e rilassati \xE8 fondamentale per una vacanza indimenticabile. Quali sistemi di sicurezza (es. catene alle portiere cabina, antifurti perimetrali, rilevatori di gas o chiusure supplementari) utilizzate?",
    timestamp: "2026-07-15T12:15:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Generale",
    type: "forum",
    replies: []
  },
  /* LIVE CHAT MESSAGES (Rolly Examples) */
  {
    id: "chat_rolly_welcome",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    text: "\u{1F44B} Benvenuti nella Chat Live di ViaCamper! Scrivete qui per scambiarvi consigli in tempo reale o condividere informazioni pratiche mentre siete in viaggio. \u{1F690}\u{1F4AC}",
    timestamp: "2026-07-15T13:01:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Generale",
    type: "chat",
    replies: []
  },
  {
    id: "chat_rolly_tip",
    user: "Rolly - Assistente ViaCamper",
    avatar: "\u{1F916}",
    avatarColor: "bg-[#3E4A35]",
    text: "\u{1F4A1} La chat live \xE8 uno spazio aperto a tutti i camperisti per scambiarsi saluti e dritte al volo sulla strada! Buona permanenza! \u{1F6E3}\uFE0F",
    timestamp: "2026-07-15T13:02:00.000Z",
    likes: 0,
    likedByCurrentUser: false,
    tag: "Sosta",
    type: "chat",
    replies: []
  }
];

// src/data/promoMessages.ts
var PROMO_MESSAGES = [
  {
    title: "\u{1F5FA}\uFE0F Evita ponti bassi e strettoie!",
    body: "Calcola percorsi sicuri adatti alle dimensioni del tuo camper con il nostro navigatore speciale!"
  },
  {
    title: "\u{1F6A8} Richiesta S.O.S. in tempo reale",
    body: "Hai un guasto o un'emergenza in viaggio? Lancia un S.O.S. per avvisare all'istante i camperisti vicini!"
  },
  {
    title: "\u2696\uFE0F Troppo carico? Evita le multe!",
    body: "Usa il Calcolatore dei Pesi prima di partire per verificare di essere entro i limiti consentiti."
  },
  {
    title: "\u{1F690} Scopri nuove aree sosta nella Community",
    body: "Centinaia di punti sosta approvati e recensiti da veri camperisti per te. Trova la tua prossima meta!"
  },
  {
    title: "\u{1F4C5} Scadenze sotto controllo!",
    body: "Registra bollo, assicurazione e revisione nello Scadenziario e ricevi avvisi automatici prima della scadenza!"
  },
  {
    title: "\u{1F6E0}\uFE0F Registro di Manutenzione del Camper",
    body: "Tieni traccia dei tagliandi, del cambio filtri e dei lavori eseguiti sul tuo veicolo ricreazionale."
  },
  {
    title: "\u{1F4D6} Diario di Bordo: Scrivi le tue avventure!",
    body: "Immortala i tuoi viaggi con tappe, foto e note nel tuo diario di viaggio digitale personale."
  },
  {
    title: "\u{1F916} Itinerario personalizzato con l'AI!",
    body: "Lasciati ispirare! Chiedi alla nostra Intelligenza Artificiale di creare la tua prossima vacanza ideale."
  },
  {
    title: "\u26FD Monitora le spese di carburante",
    body: "Segna ogni rifornimento e analizza l'andamento dei consumi del tuo camper nel tempo."
  },
  {
    title: "\u{1F9FA} Cambia marcia alla tua dispensa!",
    body: "Usa l'organizzatore della dispensa e della lista spesa per non dimenticare mai nulla prima della partenza."
  },
  {
    title: "\u{1F5FA}\uFE0F ViaCamper \xE8 ora su Android Auto!",
    body: "Trova aree sosta e avvia la navigazione protetta direttamente dallo schermo della tua autoradio!"
  },
  {
    title: "\u{1F4AC} Chiacchiera con altri camperisti!",
    body: "Entra nella sezione Community, scambia consigli in bacheca e scopri trucchi per il fai-da-te."
  },
  {
    title: "\u{1F326}\uFE0F Meteo in tempo reale sulle soste",
    body: "Prima di partire, controlla le previsioni meteo aggiornate direttamente sulla scheda del punto sosta."
  },
  {
    title: "\u{1F4CD} Proponi un nuovo punto sosta!",
    body: "Hai trovato un posto da sogno? Condividilo con la community proponendo una nuova sosta sulla mappa."
  },
  {
    title: "\u{1F6A6} Traffico e info stradali",
    body: "Visualizza in tempo reale le condizioni del traffico sul navigatore per pianificare al meglio i tuoi tempi."
  },
  {
    title: "\u{1F50B} Camper Service: dove scaricare?",
    body: "Filtra la mappa per trovare subito i punti con acqua potabile e scarico acque grigie/nere pi\xF9 vicini."
  },
  {
    title: "\u{1F332} Campeggi immersi nella natura",
    body: "Cerca strutture attrezzate e campeggi sul nostro database per soste in totale comfort e relax."
  },
  {
    title: "\u{1F35D} Ricette salvavita da camper",
    body: "Scopri nella bacheca della community le ricette preferite dai viaggiatori, veloci e gustose!"
  },
  {
    title: "\u{1F512} Soste sicure e videosorvegliate",
    body: "Leggi le recensioni dei camperisti per scoprire quali aree offrono sbarra automatica o telecamere."
  },
  {
    title: "\u{1F50C} Allaccio elettrico 220V disponibile?",
    body: "Verifica con un clic i servizi inclusi in ogni sosta: elettricit\xE0, docce calde, barbecue o area cani."
  },
  {
    title: "\u{1F4C8} Statistiche di viaggio",
    body: "Scopri quanti chilometri hai percorso quest'anno e qual \xE8 la tua spesa media per chilometro."
  },
  {
    title: "\u{1F392} Checklist di partenza rapida",
    body: "Cunei messi? Finestre chiuse? Gradino rientrato? Segui la checklist interattiva prima di girare la chiave!"
  },
  {
    title: "\u{1F9AE} In viaggio con i tuoi amici a 4 zampe?",
    body: "Filtra le aree sosta e i campeggi che accolgono gli animali per vacanze senza pensieri con il tuo cane."
  },
  {
    title: "\u{1F5FA}\uFE0F Cambia lo stile della mappa!",
    body: "Passa alla visualizzazione satellitare, topografica o stradale classica per esplorare ogni dettaglio del territorio."
  },
  {
    title: "\u{1F6B2} Porta con te le bici!",
    body: "Cerca aree sosta adiacenti a piste ciclabili leggendo i tag descrittivi inseriti dalla nostra community."
  },
  {
    title: "\u{1F41A} Idee weekend: le spiagge pi\xF9 belle",
    body: "Filtra i punti sosta situati a meno di 100 metri dal mare per svegliarti guardando le onde!"
  },
  {
    title: "\u2744\uFE0F Sosta invernale? Nessun timore!",
    body: "Trova le aree ideali per il campeggio sulla neve, vicino agli impianti di risalita e con servizi riscaldati."
  },
  {
    title: "\u{1F3F0} Borghi d'Italia in camper",
    body: "Segui gli itinerari storici proposti nella sezione Community per esplorare piccoli tesori nascosti."
  },
  {
    title: "\u{1F4BB} Lavorare in camper in Smart Working",
    body: "Leggi le recensioni degli utenti sulla copertura 4G/5G o sulla presenza del Wi-Fi in piazzola."
  },
  {
    title: "\u{1F527} Pronto Soccorso Camper: Guide Utile",
    body: "Consulta la sezione tecnica per consigli su come sbloccare una pompa dell'acqua o ricaricare le bombole."
  },
  {
    title: "\u{1F30D} Condividi la tua posizione in sicurezza",
    body: "Invia ad amici o parenti le coordinate esatte di dove hai parcheggiato la notte con la condivisione rapida."
  },
  {
    title: "\u{1F6D2} Non restare senza bombola del gas!",
    body: "Trova i punti vendita o di ricarica di propano pi\xF9 vicini segnalati dai nostri utenti."
  },
  {
    title: "\u{1F31F} Diventa un Utente Top della Community!",
    body: "Condividi foto, recensioni e rispondi ai forum per guadagnare punti reputazione e scalare la classifica!"
  },
  {
    title: "\u{1F5FA}\uFE0F Navigazione Offline integrata",
    body: "Salva i tuoi itinerari preferiti per consultarli anche quando il segnale cellulare \xE8 assente in montagna."
  },
  {
    title: "\u{1F4A1} Trucchi per risparmiare energia",
    body: "Scopri come massimizzare la durata delle tue batterie dei servizi con i post tecnici della community."
  },
  {
    title: "\u{1F96A} Dispensa vuota? Spesa al volo!",
    body: "Aggiungi al volo gli ingredienti mancanti alla tua lista della spesa smart interna di ViaCamper."
  },
  {
    title: "\u{1F342} Autunno in camper: i colori del foliage",
    body: "Lasciati guidare dagli itinerari autunnali consigliati per percorsi panoramici mozzafiato."
  },
  {
    title: "\u{1F9FC} Come pulire i serbatoi delle acque grigie",
    body: "Trova guide e discussioni sulla sanificazione dei serbatoi per eliminare i cattivi odori."
  },
  {
    title: "\u26FA Sosta libera o Area Attrezzata?",
    body: "Leggi i regolamenti locali e le esperienze degli altri camperisti per evitare sanzioni sulla sosta libera."
  },
  {
    title: "\u{1F377} Itinerari Enogastronomici",
    body: "Abbina la passione del camper alle eccellenze del territorio: scopri aree sosta vicino ad agriturismi e cantine!"
  },
  {
    title: "\u{1F50B} Manutenzione Pannello Solare",
    body: "Il tuo pannello carica al massimo? Leggi i suggerimenti dei nostri esperti per tenerlo sempre pulito ed efficiente."
  },
  {
    title: "\u{1F392} Sfide e Obiettivi di Viaggio",
    body: "Completa le sfide di ViaCamper, visita nuovi borghi e sblocca i badge esclusivi nel tuo profilo!"
  },
  {
    title: "\u{1F690} Pronto per il prossimo ponte festivo?",
    body: "Pianifica in anticipo tappe ed aree di sosta per non rischiare di trovare tutto esaurito."
  },
  {
    title: '\u{1F5FA}\uFE0F "Google Maps Plus" \xE8 eccezionale!',
    body: "Esporta l'itinerario sicuro calcolato da ViaCamper direttamente nell'app di Google Maps con un semplice clic."
  },
  {
    title: "\u2696\uFE0F Peso del camper sotto controllo?",
    body: "Inserisci stoviglie, serbatoi d'acqua, bombole e passeggeri per stimare il peso totale prima di partire."
  },
  {
    title: "\u{1F6A8} Segnala un ostacolo sulla strada",
    body: "Aiuta gli altri camperisti segnalando ponti bassi o divieti non presenti in mappa direttamente dall'app."
  },
  {
    title: "\u{1F9FC} Lavanderia self-service vicina?",
    body: "Cerca i punti sosta che dispongono di lavatrici ed asciugatrici interne per i viaggi a lungo raggio."
  },
  {
    title: "\u{1F3DE}\uFE0F Soste camper panoramiche",
    body: "Trova piazzole con viste spettacolari su laghi, montagne o scogliere per risvegli da favola."
  },
  {
    title: "\u{1F476} Viaggiare in camper con i bambini",
    body: "Scopri le aree sosta con parco giochi, piscine e animazione recensite dalle altre famiglie."
  },
  {
    title: "\u{1F5FA}\uFE0F ViaCamper: Il tuo copilota perfetto",
    body: "Sfrutta al massimo tutte le funzioni: l'app all-in-one creata appositamente da camperisti per camperisti!"
  }
];

// server.ts
var firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "calm-light-fg02f",
  appId: ""
};
var firebaseDbId = "ai-studio-fbcd1f6d-679b-4649-8f91-6a9b5a40d0b9";
try {
  const configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
  if (import_fs.default.existsSync(configPath)) {
    const config = JSON.parse(import_fs.default.readFileSync(configPath, "utf-8"));
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
var app = import_firebase_admin.default.getApps().length === 0 ? import_firebase_admin.default.initializeApp({
  projectId: firebaseConfig.projectId
}) : import_firebase_admin.default.getApp();
var bucketName = firebaseConfig.storageBucket || `${firebaseConfig.projectId}.appspot.com`;
var bucket = (0, import_storage2.getStorage)(app).bucket(bucketName);
var defaultIcons = {
  "Area di sosta": "default_icons/area_sosta.svg",
  "Campeggio": "default_icons/campeggio.svg",
  "Camper service": "default_icons/camper_service.svg",
  "Parcheggio": "default_icons/parcheggio_camper.svg"
};
function removeUndefined(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  const cleaned = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== void 0) {
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
      const localPath = import_path.default.join(process.cwd(), "public", filename.replace("default_icons/", ""));
      if (import_fs.default.existsSync(localPath)) {
        await file.save(import_fs.default.readFileSync(localPath), {
          metadata: {
            contentType: "image/svg+xml",
            cacheControl: "public, max-age=3600"
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
var firestoreDb;
try {
  firestoreDb = new ClientFirestoreAdapter(firebaseConfig, firebaseDbId);
  console.log(`[REST Firestore Adapter] Connected successfully using API Key for DatabaseId: ${firebaseDbId}`);
} catch (err) {
  console.error(`[REST Firestore Adapter] Failed to initialize database adapter.`, err);
}
var OVERRIDES_FILE = import_path.default.join(process.cwd(), "user_overrides.json");
var USERS_CACHE_FILE = import_path.default.join(process.cwd(), "users_cache.json");
function getUserOverrides() {
  try {
    if (import_fs.default.existsSync(OVERRIDES_FILE)) {
      return JSON.parse(import_fs.default.readFileSync(OVERRIDES_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading user overrides file:", err);
  }
  return {};
}
function saveUserOverride(email, update) {
  try {
    const overrides = getUserOverrides();
    const cleanEmail = email.toLowerCase().trim();
    if (!overrides[cleanEmail]) {
      overrides[cleanEmail] = { email: cleanEmail };
    }
    overrides[cleanEmail] = { ...overrides[cleanEmail], ...update };
    import_fs.default.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving user override:", err);
  }
}
function cacheUsers(users) {
  try {
    import_fs.default.writeFileSync(USERS_CACHE_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("Error caching users:", err);
  }
}
function getCachedUsers() {
  try {
    if (import_fs.default.existsSync(USERS_CACHE_FILE)) {
      return JSON.parse(import_fs.default.readFileSync(USERS_CACHE_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading users cache:", err);
  }
  return [];
}
function isUserDeleted(email) {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  const overrides = getUserOverrides();
  return !!overrides[cleanEmail]?.deleted;
}
function getOverrideAppliedUser(email, userData) {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();
  const overrides = getUserOverrides();
  if (overrides[cleanEmail]?.deleted) {
    return null;
  }
  let baseUser = userData;
  if (!baseUser) {
    const cached = getCachedUsers();
    baseUser = cached.find((u) => (u.email || "").toLowerCase().trim() === cleanEmail);
  }
  if (!baseUser) return null;
  if (overrides[cleanEmail]) {
    const o = overrides[cleanEmail];
    return {
      ...baseUser,
      ...o.approved !== void 0 ? { approved: o.approved } : {},
      ...o.isModerator !== void 0 ? { isModerator: o.isModerator } : {},
      ...o.moderatorRoles !== void 0 ? { moderatorRoles: o.moderatorRoles } : {}
    };
  }
  return baseUser;
}
uploadDefaultIcons().catch(console.error);
fixExistingPlaces().catch(console.error);
async function fixExistingPlaces() {
  try {
    const placesRef = firestoreDb.collection("places");
    const snapshot = await placesRef.get();
    for (const doc2 of snapshot.docs) {
      const data = doc2.data();
      const needsFix = !data.imageUrl || data.imageUrl.startsWith("https://images.unsplash.com/") || data.imageUrl.includes("default_icons/") || data.imageUrl.includes(".jpg");
      if (needsFix) {
        const cat = data.category ? data.category.toLowerCase() : "";
        let iconPath = "";
        if (cat.includes("sosta")) iconPath = defaultIcons["Area di sosta"];
        else if (cat.includes("campeggio")) iconPath = defaultIcons["Campeggio"];
        else if (cat.includes("service")) iconPath = defaultIcons["Camper service"];
        else if (cat.includes("parcheggio")) iconPath = defaultIcons["Parcheggio"];
        if (iconPath) {
          const iconFilename = iconPath.replace("default_icons/", "");
          const newUrl = `/${iconFilename}`;
          await firestoreDb.collection("places").doc(doc2.id).update({ imageUrl: newUrl });
          console.log(`Updated place ${doc2.id} with default icon per category ${data.category}`);
        }
      }
    }
  } catch (err) {
    console.error(`[Firebase Client Adapter] Error in fixExistingPlaces (DatabaseId: ${firebaseDbId}):`, err);
  }
}
async function notifyModerators(role, title, body, data) {
  console.log(`[Notification] Notifying moderators for role: ${role}`);
  try {
    const moderatorEmails = /* @__PURE__ */ new Set();
    moderatorEmails.add("sambucci.simone@gmail.com");
    moderatorEmails.add("viacamperapp@gmail.com");
    if (process.env.ADMIN_EMAIL) {
      moderatorEmails.add(process.env.ADMIN_EMAIL.toLowerCase().trim());
    }
    try {
      const usersSnapshot = await firestoreDb.collection("users").get();
      usersSnapshot.forEach((doc2) => {
        const u = doc2.data();
        const email = (u.email || doc2.id).toLowerCase().trim();
        if (u.isModerator || u.isAdmin || email === "sambucci.simone@gmail.com" || email === "viacamperapp@gmail.com" || role === "all" && u.moderatorRoles || u.moderatorRoles && (u.moderatorRoles[role] === true || u.moderatorRoles.community || u.moderatorRoles.places || u.moderatorRoles.itineraries)) {
          moderatorEmails.add(email);
        }
      });
    } catch (dbErr) {
      console.warn("[Notification] Could not query moderators from DB:", dbErr);
    }
    const emailList = Array.from(moderatorEmails);
    for (const email of emailList) {
      try {
        await firestoreDb.collection("notifications").add({
          userId: email,
          title,
          body,
          type: role,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          read: false,
          data: data || {}
        });
      } catch (notifErr) {
        console.warn(`[Notification] Failed to write notification for ${email}:`, notifErr);
      }
    }
    try {
      await firestoreDb.collection("adminNotifications").add({
        type: role,
        title,
        body,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        data: data || {},
        read: false
      });
    } catch (admNotifErr) {
      console.warn("[Notification] Failed to write adminNotifications history:", admNotifErr);
    }
    if (emailList.length > 0) {
      await sendPushNotification(emailList, title, body, {
        ...data || {},
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
async function sendPushNotification(emails, title, body, data) {
  try {
    const emailList = Array.isArray(emails) ? emails : [emails];
    if (emailList.length === 0) return;
    console.log(`[FCM Push] Preparing to send push notification to users:`, emailList);
    const tokensRef = firestoreDb.collection("push_tokens");
    const tokens = [];
    const tokensToClean = [];
    for (const rawEmail of emailList) {
      const email = String(rawEmail || "").toLowerCase().trim();
      if (!email) continue;
      try {
        const doc2 = await tokensRef.doc(email).get();
        if (doc2.exists && doc2.data()?.token) {
          const t = doc2.data()?.token;
          if (t && !tokens.includes(t)) tokens.push(t);
        }
      } catch (err) {
        console.error(`[FCM Push] Error reading push token from push_tokens for ${email}:`, err);
      }
      try {
        const userDoc = await firestoreDb.collection("users").doc(email).get();
        if (userDoc.exists) {
          const uData = userDoc.data() || {};
          if (uData.pushToken && !tokens.includes(uData.pushToken)) {
            tokens.push(uData.pushToken);
          }
          if (Array.isArray(uData.pushTokens)) {
            uData.pushTokens.forEach((t) => {
              if (t && !tokens.includes(t)) tokens.push(t);
            });
          }
        }
      } catch (uErr) {
      }
    }
    if (tokens.length === 0) {
      console.log(`[FCM Push] No push tokens found for users:`, emailList);
      return;
    }
    console.log(`[FCM Push] Sending notification to ${tokens.length} devices for ${emailList.join(", ")}...`);
    const message = {
      notification: {
        title,
        body
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "fcm_default_channel",
          notificationPriority: "PRIORITY_MAX",
          visibility: "public",
          icon: "ic_notification",
          defaultSound: true,
          defaultVibrateTimings: true
        }
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            contentAvailable: true
          }
        }
      },
      data: {
        title,
        body,
        ...data || {}
      },
      tokens: Array.from(new Set(tokens))
    };
    const response = await (0, import_messaging.getMessaging)(app).sendEachForMulticast(message);
    console.log(`[FCM Push] Multicast send summary: ${response.successCount} succeeded, ${response.failureCount} failed.`);
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error;
        if (error && (error.code === "messaging/invalid-registration-token" || error.code === "messaging/registration-token-not-registered")) {
          const badToken = tokens[idx];
          console.log(`[FCM Push] Token is invalid/expired. Scheduling deletion of token:`, badToken);
          tokensToClean.push(badToken);
        }
      }
    });
    if (tokensToClean.length > 0) {
      const snapshot = await tokensRef.get();
      for (const doc2 of snapshot.docs) {
        if (tokensToClean.includes(doc2.data()?.token)) {
          console.log(`[FCM Push] Cleaning up stale token doc for email:`, doc2.id);
          await tokensRef.doc(doc2.id).delete();
        }
      }
    }
  } catch (err) {
    console.error(`[FCM Push] Error sending multicast notification:`, err);
  }
}
var latestPromoPushInMemory = {
  title: "",
  body: "",
  data: {},
  sentAt: ""
};
async function sendPushNotificationToAll(title, body, data) {
  try {
    latestPromoPushInMemory = {
      title,
      body,
      data: data || {},
      sentAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    try {
      await firestoreDb.collection("system_metadata").doc("last_promo_push").set({
        title,
        body,
        data: data || {},
        sentAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log(`[FCM Push Simulation] Saved to system_metadata/last_promo_push for web clients.`);
    } catch (saveErr) {
      const errStr = saveErr.message || String(saveErr);
      if (errStr.includes("Too Many Requests") || errStr.includes("Quota exceeded") || errStr.includes("429") || errStr.includes("ResourceExhausted")) {
        console.warn("[FCM Push Simulation] Warning: Firestore rate limit/quota reached (429/ResourceExhausted). Falling back to internal in-memory pub-sub sync.");
      } else {
        console.error("[FCM Push Simulation] Error saving to Firestore:", saveErr);
      }
    }
    const tokensRef = firestoreDb.collection("push_tokens");
    const snapshot = await tokensRef.get();
    const emails = snapshot.docs.map((doc2) => doc2.id);
    if (emails.length > 0) {
      await sendPushNotification(emails, title, body, data);
    }
  } catch (err) {
    console.error("[FCM Push] Error sending notification to all users:", err);
  }
}
var lastCheckedPromoFirestoreTime = 0;
async function checkAndSendPromotionalPush() {
  const now = Date.now();
  if (now - lastCheckedPromoFirestoreTime < 15 * 60 * 1e3) {
    console.log("[Promo Push] Skipped Firestore query to avoid rate limits (throttling active).");
    return;
  }
  lastCheckedPromoFirestoreTime = now;
  try {
    const metaRef = firestoreDb.collection("system_metadata").doc("push_scheduler");
    const doc2 = await metaRef.get();
    let lastSent = 0;
    if (doc2.exists && doc2.data()?.lastSentAt) {
      lastSent = new Date(doc2.data().lastSentAt).getTime();
    }
    const fortyEightHoursMs = 48 * 60 * 60 * 1e3;
    if (now - lastSent >= fortyEightHoursMs) {
      console.log("[Promo Push] 48 hours have passed since last promo push. Sending new one...");
      const randomIndex = Math.floor(Math.random() * PROMO_MESSAGES.length);
      const promo = PROMO_MESSAGES[randomIndex];
      await sendPushNotificationToAll(promo.title, promo.body, { type: "promo_push", promoIndex: String(randomIndex) });
      try {
        await metaRef.set({
          lastSentAt: (/* @__PURE__ */ new Date()).toISOString(),
          lastPromoTitle: promo.title
        }, { merge: true });
        console.log(`[Promo Push] Sent promo: "${promo.title}" and saved state to Firestore.`);
      } catch (setErr) {
        if (setErr.message?.includes("Too Many Requests") || setErr.message?.includes("Quota exceeded")) {
          console.warn("[Promo Push] Warning: Firestore write limit hit, could not save scheduler state (will retry later).");
        } else {
          console.error("[Promo Push] Error saving scheduler state:", setErr);
        }
      }
    } else {
      const hoursLeft = ((fortyEightHoursMs - (now - lastSent)) / (1e3 * 60 * 60)).toFixed(1);
      console.log(`[Promo Push] Next promo push scheduled in ${hoursLeft} hours.`);
    }
  } catch (err) {
    if (err.message?.includes("Too Many Requests") || err.message?.includes("Quota exceeded")) {
      console.warn("[Promo Push] Warning: Firestore read limit hit during scheduler check (will retry later).");
    } else {
      console.error("[Promo Push] Error in checkAndSendPromotionalPush:", err);
    }
  }
}
var ai = new import_genai.GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
async function generateContentWithRetry(params, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      const errMsg = err.message || "";
      const isQuotaError = err.status === 429 || errMsg.includes("429") || errMsg.includes("Quota") || errMsg.includes("RESOURCE_EXHAUSTED");
      if (isQuotaError && params && params.model === "gemini-3.5-flash") {
        console.warn(`[Gemini AI] Quota exceeded on gemini-3.5-flash. Falling back to gemini-2.5-flash!`);
        params.model = "gemini-2.5-flash";
        continue;
      }
      if (err.status === 503 || err.status === 429 || err.message?.includes("503") || err.message?.includes("429") || err.message?.includes("high demand") || err.message?.includes("UNAVAILABLE") || err.message?.includes("Quota")) {
        if (attempt < maxRetries) {
          const delayMs = attempt * 3e3;
          console.warn(`[Gemini AI] 503/429 on attempt ${attempt}. Retrying in ${delayMs}ms...`);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
      }
      throw err;
    }
  }
}
function getFriendlyGeminiError(err) {
  const errMsg = err.message || String(err);
  if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded")) {
    return "Quota gratuita dell'API Gemini temporaneamente superata. Riprova tra 15 secondi.";
  }
  if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand") || errMsg.includes("temporarily unavailable")) {
    return "Il servizio AI di Gemini \xE8 momentaneamente sovraccarico. Riprova tra pochi istanti.";
  }
  return errMsg;
}
var PROVINCE_CACHE_FILE = import_path.default.join(process.cwd(), "province_cache.json");
function saveCachedProvincePlaces(province, places) {
  try {
    let data = {};
    if (import_fs.default.existsSync(PROVINCE_CACHE_FILE)) {
      data = JSON.parse(import_fs.default.readFileSync(PROVINCE_CACHE_FILE, "utf-8"));
    }
    const key = province.toLowerCase().trim();
    data[key] = places;
    import_fs.default.writeFileSync(PROVINCE_CACHE_FILE, JSON.stringify(data, null, 2), "utf-8");
    console.log(`[Cache Save] Saved POIs for province: ${province}`);
  } catch (err) {
    console.error("Error writing to province cache file:", err);
  }
}
var PROVINCES_COORDS = {
  "roma": { lat: 41.9028, lng: 12.4964 },
  "rome": { lat: 41.9028, lng: 12.4964 },
  "milano": { lat: 45.4642, lng: 9.19 },
  "milan": { lat: 45.4642, lng: 9.19 },
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
  "catania": { lat: 37.5079, lng: 15.083 },
  "messina": { lat: 38.1938, lng: 15.554 },
  "reggio calabria": { lat: 38.1113, lng: 15.6473 },
  "lecce": { lat: 40.3515, lng: 18.1758 },
  "taranto": { lat: 40.4644, lng: 17.247 },
  "foggia": { lat: 41.4622, lng: 15.5446 },
  "brindisi": { lat: 40.6321, lng: 17.9361 },
  "potenza": { lat: 40.6404, lng: 15.8056 },
  "matera": { lat: 40.6664, lng: 16.6043 },
  "salerno": { lat: 40.678, lng: 14.7594 },
  "avellino": { lat: 40.914, lng: 14.7971 },
  "benevento": { lat: 41.1307, lng: 14.7719 },
  "caserta": { lat: 41.073, lng: 14.3312 },
  "latina": { lat: 41.4676, lng: 12.9036 },
  "frosinone": { lat: 41.6398, lng: 13.3411 },
  "viterbo": { lat: 42.4173, lng: 12.1047 },
  "rieti": { lat: 42.4049, lng: 12.8622 },
  "perugia": { lat: 43.1107, lng: 12.3908 },
  "terni": { lat: 42.5641, lng: 12.6414 },
  "ancona": { lat: 43.6158, lng: 13.5189 },
  "pesaro": { lat: 43.91, lng: 12.9133 },
  "urbino": { lat: 43.7263, lng: 12.6364 },
  "macerata": { lat: 43.3009, lng: 13.4534 },
  "fermo": { lat: 43.1609, lng: 13.7184 },
  "ascoli piceno": { lat: 42.8535, lng: 13.5759 },
  "l'aquila": { lat: 42.3498, lng: 13.3995 },
  "laquila": { lat: 42.3498, lng: 13.3995 },
  "teramo": { lat: 42.6587, lng: 13.7042 },
  "pescara": { lat: 42.4618, lng: 14.2185 },
  "chieti": { lat: 42.351, lng: 14.1675 },
  "campobasso": { lat: 41.5604, lng: 14.6596 },
  "isernia": { lat: 41.5961, lng: 14.2341 },
  "sassari": { lat: 40.7259, lng: 8.5556 },
  "cagliari": { lat: 39.2238, lng: 9.1217 },
  "nuoro": { lat: 40.3193, lng: 9.3271 },
  "oristano": { lat: 39.9061, lng: 8.5916 },
  "olbia": { lat: 40.924, lng: 9.5009 },
  "tempio": { lat: 40.8997, lng: 9.1171 },
  "siena": { lat: 43.3186, lng: 11.3306 },
  "grosseto": { lat: 42.7603, lng: 11.1118 },
  "lucca": { lat: 43.8429, lng: 10.5027 },
  "pisa": { lat: 43.7228, lng: 10.4017 },
  "livorno": { lat: 43.5485, lng: 10.3106 },
  "arezzo": { lat: 43.4631, lng: 11.878 },
  "pistoia": { lat: 43.9312, lng: 10.9156 },
  "prato": { lat: 43.8777, lng: 11.1022 },
  "massa": { lat: 44.0375, lng: 10.1432 },
  "carrara": { lat: 44.0793, lng: 10.0971 },
  "parma": { lat: 44.8015, lng: 10.3279 },
  "piacenza": { lat: 45.0526, lng: 9.693 },
  "reggio emilia": { lat: 44.6982, lng: 10.6312 },
  "modena": { lat: 44.6471, lng: 10.9252 },
  "ferrara": { lat: 44.8381, lng: 11.6198 },
  "ravenna": { lat: 44.4184, lng: 12.2035 },
  "forli": { lat: 44.2227, lng: 12.0407 },
  "cesena": { lat: 44.1391, lng: 12.2431 },
  "rimini": { lat: 44.0575, lng: 12.5653 },
  "verona": { lat: 45.4384, lng: 10.9916 },
  "vicenza": { lat: 45.5455, lng: 11.5347 },
  "padova": { lat: 45.4064, lng: 11.876 },
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
  "varese": { lat: 45.8195, lng: 8.825 },
  "monza": { lat: 45.5845, lng: 9.2735 },
  "lecco": { lat: 45.8566, lng: 9.3977 },
  "lodi": { lat: 45.3139, lng: 9.5032 },
  "pavia": { lat: 45.185, lng: 9.1559 },
  "cremona": { lat: 45.1333, lng: 10.0233 },
  "mantova": { lat: 45.1564, lng: 10.7911 },
  "sondrio": { lat: 46.169, lng: 9.8692 },
  "novara": { lat: 45.4468, lng: 8.6212 },
  "alessandria": { lat: 44.913, lng: 8.6151 },
  "asti": { lat: 44.9014, lng: 8.2069 },
  "cuneo": { lat: 44.3896, lng: 7.5479 },
  "vercelli": { lat: 45.3241, lng: 8.4184 },
  "biella": { lat: 45.563, lng: 8.0579 },
  "verbania": { lat: 45.9221, lng: 8.5511 },
  "imperia": { lat: 43.886, lng: 8.0263 },
  "savona": { lat: 44.3079, lng: 8.4811 },
  "la spezia": { lat: 44.1107, lng: 9.8434 },
  "laspezia": { lat: 44.1107, lng: 9.8434 },
  "aosta": { lat: 45.7371, lng: 7.3206 },
  "lariano": { lat: 41.7278, lng: 12.8336 },
  "velletri": { lat: 41.6886, lng: 12.7772 }
};
function findNearestCity(lat, lng) {
  let minDistance = Infinity;
  let nearestCity = "";
  for (const [name, coords] of Object.entries(PROVINCES_COORDS)) {
    if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") continue;
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
  return nearestCity.split(" ").map((word) => {
    if (word.startsWith("l'")) {
      return "L'" + word.slice(2).charAt(0).toUpperCase() + word.slice(3);
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(" ");
}
var VERIFIED_REAL_PLACES = {
  "velletri": [
    {
      name: "Area Sosta Camper Comunale Velletri",
      category: "sosta",
      lat: 41.693045,
      lng: 12.782552,
      address: "Via del Camelieto, Velletri (RM)",
      priceEuro: 0,
      priceInfo: "Gratuito (non accessibile il gioved\xEC mattina per mercato settimanale)",
      rating: 4.3,
      facilities: ["Acqua", "Scarico", "Illuminazione"]
    },
    {
      name: "Agricampeggio Colle dell'Acero",
      category: "campeggio",
      lat: 41.7245,
      lng: 12.8012,
      address: "Via Colle dell'Acero 14, Velletri (RM)",
      priceEuro: 15,
      priceInfo: "15\u20AC/notte, piazzole con attacco luce",
      rating: 4.6,
      facilities: ["Acqua", "Scarico", "Elettricit\xE0", "Ristorante"]
    },
    {
      name: "Parcheggio Camper Genzano di Roma",
      category: "parcheggio",
      lat: 41.7018,
      lng: 12.6953,
      address: "Via Emilia Romagna 94, Genzano di Roma (RM)",
      priceEuro: 0,
      priceInfo: "Gratuito, senza servizi, vicino al supermercato",
      rating: 3.8,
      facilities: ["Solo sosta"]
    },
    {
      name: "Punto Sosta Camper Lariano",
      category: "sosta",
      lat: 41.7262,
      lng: 12.8318,
      address: "Via Napoli, Lariano (RM)",
      priceEuro: 0,
      priceInfo: "Gratuito, punto sosta nel bosco dei Castelli Romani",
      rating: 4,
      facilities: ["Solo sosta", "Ombra"]
    }
  ],
  "lariano": [
    {
      name: "Punto Sosta Camper Lariano",
      category: "sosta",
      lat: 41.7262,
      lng: 12.8318,
      address: "Via Napoli, Lariano (RM)",
      priceEuro: 0,
      priceInfo: "Gratuito, punto sosta nel bosco dei Castelli Romani",
      rating: 4,
      facilities: ["Solo sosta", "Ombra"]
    },
    {
      name: "Area Sosta Camper Comunale Velletri",
      category: "sosta",
      lat: 41.693045,
      lng: 12.782552,
      address: "Via del Camelieto, Velletri (RM)",
      priceEuro: 0,
      priceInfo: "Gratuito (non accessibile il gioved\xEC mattina per mercato settimanale)",
      rating: 4.3,
      facilities: ["Acqua", "Scarico", "Illuminazione"]
    }
  ]
};
async function geocodeAddress(address, name) {
  const checkName = (name || "").toLowerCase().trim();
  const checkAddr = (address || "").toLowerCase().trim();
  if (checkAddr.includes("camelieto") || checkName.includes("velletri") && (checkName.includes("comunale") || checkAddr.includes("camelieto"))) {
    console.log(`[Verified Real Places Intercept] Direct match for Velletri Camper Stop: 41.693045, 12.782552`);
    return { lat: 41.693045, lng: 12.782552 };
  }
  for (const province of Object.keys(VERIFIED_REAL_PLACES)) {
    const list = VERIFIED_REAL_PLACES[province];
    for (const item of list) {
      const itemNormName = (item.name || "").toLowerCase().trim();
      const itemNormAddr = (item.address || "").toLowerCase().trim();
      if (checkName && itemNormName && (checkName.includes(itemNormName) || itemNormName.includes(checkName))) {
        console.log(`[Verified Real Places Intercept] Found exact name match for "${name}": ${item.lat}, ${item.lng}`);
        return { lat: item.lat, lng: item.lng };
      }
      if (checkAddr && itemNormAddr && (checkAddr.includes(itemNormAddr) || itemNormAddr.includes(checkAddr))) {
        console.log(`[Verified Real Places Intercept] Found address match for "${address}": ${item.lat}, ${item.lng}`);
        return { lat: item.lat, lng: item.lng };
      }
    }
  }
  function isCityCenterFallback(result) {
    if (!result) return true;
    const type = (result.type || "").toLowerCase();
    const resClass = (result.class || "").toLowerCase();
    if (["city", "town", "village", "administrative", "boundary", "municipality", "county", "state", "country"].includes(type)) {
      return true;
    }
    if (resClass === "place" && ["city", "town", "village", "administrative"].includes(type)) {
      return true;
    }
    return false;
  }
  let extractedCity = "";
  const rmMatch = address.match(/,\s*([^,()]+?)\s*(?:\([A-Z]{2}\))/i);
  if (rmMatch && rmMatch[1]) {
    extractedCity = rmMatch[1].trim();
  } else {
    const parts = address.split(",");
    if (parts.length > 1) {
      const potentialCity = parts[parts.length - 1].replace(/italy|italia/gi, "").replace(/\d+/g, "").replace(/\([A-Z]{2}\)/gi, "").trim();
      if (potentialCity) {
        extractedCity = potentialCity;
      } else {
        const potentialCity2 = parts[parts.length - 2].replace(/italy|italia/gi, "").replace(/\d+/g, "").replace(/\([A-Z]{2}\)/gi, "").trim();
        if (potentialCity2) extractedCity = potentialCity2;
      }
    }
  }
  try {
    let cleanAddress = address.replace(/\(.*?\)/g, "").replace(/Rif OSM:.*$/gi, "").replace(/–/g, " ").replace(/-/g, " ").trim();
    if (cleanAddress.toLowerCase().includes("camelieto")) {
      cleanAddress = cleanAddress.replace(/via( del| di)? camelieto/gi, "Via di Ponente");
    }
    const queryStages = [];
    if (name && extractedCity) {
      const lowerName = name.toLowerCase();
      if (!lowerName.includes("camper service") && !lowerName.includes("parcheggio") && !lowerName.includes("scarico")) {
        queryStages.push(`${name}, ${extractedCity}, Italy`);
      }
    }
    if (name) {
      const lowerName = name.toLowerCase();
      if (!lowerName.includes("camper service") && !lowerName.includes("parcheggio") && !lowerName.includes("scarico")) {
        queryStages.push(`${name}, ${cleanAddress}, Italy`);
      }
    }
    queryStages.push(`${cleanAddress}, Italy`);
    let firstFallback = null;
    for (let i = 0; i < queryStages.length; i++) {
      const query2 = queryStages[i];
      console.log(`[Geocoding Stage ${i + 1}] Querying Nominatim for: "${query2}"`);
      const targetUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query2)}&limit=1`;
      try {
        const response = await fetch(targetUrl, {
          headers: {
            "User-Agent": "CamperCompanion/2.0 (Google AI Studio Build)"
          }
        });
        if (response.ok) {
          const results = await response.json();
          if (results && results.length > 0) {
            const firstResult = results[0];
            const lat = parseFloat(firstResult.lat);
            const lng = parseFloat(firstResult.lon);
            if (!isNaN(lat) && !isNaN(lng)) {
              const isFallback = isCityCenterFallback(firstResult);
              if (!isFallback) {
                console.log(`[Geocoding Success - Stage ${i + 1}] Found HIGH QUALITY coordinates: ${lat}, ${lng} for query: "${query2}"`);
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
      } catch (err) {
        console.error(`[Geocoding Stage ${i + 1} Error] Failed query "${query2}":`, err.message);
      }
    }
    if (firstFallback) {
      console.log(`[Geocoding Fallback] Using address-derived city center/administrative fallback coordinates: ${firstFallback.lat}, ${firstFallback.lng} for "${name || address}"`);
      return firstFallback;
    }
    console.log(`[Geocoding Status] All specific geocoding stages returned no coordinates for "${name || address}".`);
  } catch (err) {
    console.error(`[Geocoding Error] Failed to geocode "${address}":`, err.message);
  }
  return null;
}
async function getProvinceCoordinates(province) {
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
      const results = await response.json();
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
  return { lat: 43, lng: 12.5 };
}
async function fetchActualOSMPlaces(province, coords) {
  const radiusMeters = 2e4;
  const query2 = `[out:json][timeout:15];
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
      const timeoutId = setTimeout(() => controller.abort(), 6e3);
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "CamperCompanion/2.2 (github.com/google/ai-studio; viacamperapp@gmail.com)"
        },
        body: "data=" + encodeURIComponent(query2),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const result = await response.json();
        if (result && Array.isArray(result.elements) && result.elements.length > 0) {
          const places = result.elements.map((el) => {
            let elLat = el.lat;
            let elLng = el.lon;
            if (el.type === "way" && el.center) {
              elLat = el.center.lat;
              elLng = el.center.lon;
            }
            if (!elLat || !elLng) return null;
            const tags = el.tags || {};
            let name = tags.name || tags.official_name || tags.alt_name || tags.short_name || tags.operator || tags.brand || tags.description;
            if (!name) {
              if (tags.tourism === "camp_site") name = "Campeggio / Area Campismo";
              else if (tags.amenity === "sanitary_dump_station") name = "Camper Service Carico/Scarico";
              else if (tags.tourism === "caravan_site" || tags.caravan_site === "regional") name = "Area Sosta Camper (OSM)";
              else name = "Sosta Camper / Parcheggio (OSM)";
            }
            let category = "sosta";
            if (tags.amenity === "sanitary_dump_station") category = "scarico";
            else if (tags.tourism === "camp_site") category = "campeggio";
            const street = tags["addr:street"] || "";
            const city = tags["addr:city"] || "";
            let address = [street, city].filter(Boolean).join(", ");
            if (!address) {
              address = `Rif OSM: ${el.id} (${elLat.toFixed(4)}, ${elLng.toFixed(4)})`;
            }
            let priceEuro = tags.fee === "no" ? 0 : 15;
            let priceInfo = tags.fee === "no" ? "Gratuito" : tags.charge || "In loco / Da verificare";
            const facilities = ["Acqua", "Scarico"];
            if (tags.power_supply === "yes" || tags.electricity === "yes" || tags["power_supply:camper"] === "yes") {
              facilities.push("Elettricit\xE0");
            }
            if (tags.internet_access === "yes" || tags.wifi === "yes") {
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
async function checkContentForProfanity(content) {
  try {
    const prompt = `Analizza il seguente testo. Determina se contiene parolacce, insulti, oscenit\xE0, linguaggio d'odio o esplicita volgarit\xE0. 
Rispondi in formato JSON con due campi: 
- "isClean": boolean (true se il testo \xE8 pulito, false se contiene insulti o parolacce)
- "reason": string (se isClean \xE8 false, spiega brevemente indicando la parola offensiva, altrimenti stringa vuota)

Testo da analizzare:
"${content}"`;
    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            isClean: { type: import_genai.Type.BOOLEAN },
            reason: { type: import_genai.Type.STRING }
          },
          required: ["isClean", "reason"]
        }
      }
    });
    const parsed = JSON.parse(response.text.trim());
    return parsed;
  } catch (err) {
    console.error("Profanity check failed, defaulting to clean", err);
    return { isClean: true };
  }
}
var USER_PLACES_FILE = import_path.default.join(process.cwd(), "user_places.json");
function loadUserPlaces() {
  try {
    if (import_fs.default.existsSync(USER_PLACES_FILE)) {
      const data = import_fs.default.readFileSync(USER_PLACES_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading user places file, resetting...", err);
  }
  return [];
}
function saveUserPlaces(places) {
  try {
    import_fs.default.writeFileSync(USER_PLACES_FILE, JSON.stringify(places, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing user places file:", err);
  }
}
var FEEDBACKS_FILE = import_path.default.join(process.cwd(), "feedbacks.json");
function loadFeedbacks() {
  try {
    if (import_fs.default.existsSync(FEEDBACKS_FILE)) {
      const data = import_fs.default.readFileSync(FEEDBACKS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading feedbacks file:", err);
  }
  return [];
}
function saveFeedbacks(feedbacks) {
  try {
    import_fs.default.writeFileSync(FEEDBACKS_FILE, JSON.stringify(feedbacks, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing feedbacks file:", err);
  }
}
async function startServer() {
  const app2 = (0, import_express.default)();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  (async function optimizeExistingImages() {
    try {
      const publicDir = import_path.default.join(process.cwd(), "public");
      const uploadsDir = import_path.default.join(process.cwd(), "uploads");
      const directoriesToScan = [publicDir, uploadsDir];
      for (const dir of directoriesToScan) {
        if (!import_fs.default.existsSync(dir)) continue;
        const files = import_fs.default.readdirSync(dir);
        for (const file of files) {
          if (file.startsWith(".")) continue;
          const ext = file.split(".").pop()?.toLowerCase();
          if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp") {
            const filePath = import_path.default.join(dir, file);
            let stats;
            try {
              stats = import_fs.default.statSync(filePath);
            } catch (fsErr) {
              continue;
            }
            if (stats.size > 400 * 1024) {
              console.log(`[Startup Optimizer] Optimizing large file: ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
              try {
                const buffer = import_fs.default.readFileSync(filePath);
                const sharpInstance = (0, import_sharp.default)(buffer).resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true });
                let resizedBuffer;
                if (ext === "png") {
                  resizedBuffer = await sharpInstance.png({ compressionLevel: 9, quality: 75 }).toBuffer();
                } else if (ext === "webp") {
                  resizedBuffer = await sharpInstance.webp({ quality: 75 }).toBuffer();
                } else {
                  resizedBuffer = await sharpInstance.jpeg({ quality: 75, progressive: true }).toBuffer();
                }
                import_fs.default.writeFileSync(filePath, resizedBuffer);
                const newStats = import_fs.default.statSync(filePath);
                console.log(`[Startup Optimizer] Successfully optimized ${file}: ${(stats.size / 1024 / 1024).toFixed(2)} MB -> ${(newStats.size / 1024).toFixed(1)} KB!`);
              } catch (err) {
                console.error(`[Startup Optimizer] Error processing ${file}:`, err);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("[Startup Optimizer] Out-of-bounds error:", err);
    }
  })();
  app2.use(import_express.default.json({ limit: "25mb" }));
  app2.use(import_express.default.urlencoded({ limit: "25mb", extended: true }));
  app2.use((req, res, next) => {
    const origin = req.headers.origin;
    console.log(`[CORS] Request origin: ${origin || "none"}`);
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
  app2.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app2.post("/api/generate-itinerary", async (req, res) => {
    try {
      const { startLocation, endLocation, waypoints, duration, interests, travelStyle, vehicleType, vehicleDims } = req.body;
      if (!startLocation) {
        return res.status(400).json({ error: "Localit\xE0 di partenza obbligatoria." });
      }
      const numDays = Math.min(Math.max(Number(duration) || 3, 1), 30);
      const activeInterests = Array.isArray(interests) && interests.length > 0 ? interests.join(", ") : "Natura, Cultura, Enogastronomia";
      const style = travelStyle || "Bilanciato (ritmo medio)";
      const endDestStr = endLocation && endLocation.trim() !== "" ? ` e con destinazione finale a "${endLocation}"` : "";
      const validWaypoints = Array.isArray(waypoints) ? waypoints.map((w) => typeof w === "string" ? w.trim() : "").filter((w) => w.length > 0) : [];
      const waypointsStr = validWaypoints.length > 0 ? ` passando obbligatoriamente per le seguenti tappe intermedie: ${validWaypoints.map((w) => `"${w}"`).join(", ")}` : "";
      const vProps = vehicleDims ? `Lunghezza: ${vehicleDims.length}m, Larghezza: ${vehicleDims.width}m, Altezza: ${vehicleDims.height}m` : "Dimensioni standard camper";
      const vType = vehicleType || "Mansardato";
      const systemInstruction = "Sei 'ViaCamperApp AI', una guida turistica esperta specializzata in viaggi itineranti in camper. Il tuo compito \xE8 generare un itinerario in camper realistico, entusiasmante e sicuro, partendo dalla localit\xE0 richiesta, toccando tutte le tappe intermedie inserite dall'utente (se presenti) e terminando nella localit\xE0 specificata (se presente, altrimenti proponi un itinerario circolare o aperto). Fornisci consigli specifici per i camperisti (ad esempio strade strette da evitare se il mezzo \xE8 alto, aree sosta consigliate, camper service, facilit\xE0 di manovra). Qualsiasi stima del tempo di guida/al volante complessivo (campo 'totalDrivingTime') o dei singoli segmenti (campo 'drivingSegment') deve essere calcolata applicando una maggiorazione fissa del 15% rispetto ai tempi standard di un'autovettura (per tenere conto del ritmo ridotto del camper e delle andature pi\xF9 prudenti). Cerca di stimare delle coordinate lat/lng realistiche in Italia o in Europa per i punti di sosta di ciascun giorno, in modo che possano essere disegnate su una mappa di sosta Leaflet. Compila interamente tutti i campi richiesti in lingua italiana.";
      const prompt = `Genera un itinerario di viaggio in camper di ${numDays} giorni con partenza da "${startLocation}"${waypointsStr}${endDestStr}.
Dettagli di viaggio richiesti:
${validWaypoints.length > 0 ? `- Tappe intermedie richieste dall'utente: ${validWaypoints.join(" -> ")}
` : ""}- Interessi principali: ${activeInterests}
- Stile di viaggio: ${style}
- Tipologia Mezzo: ${vType}
- Dimensioni veicolo: ${vProps}
- Fonti dati aggiuntive: Utilizza informazioni dal sito https://app.camperpass.it/#/explore per suggerire aree di sosta e attivit\xE0.

CRITICO - CALCOLO TEMPI DI GUIDA (+15%):
Qualsiasi tempo di guida stimato o tempo al volante (sia nel campo 'totalDrivingTime' dell'itinerario, sia nel campo 'drivingSegment' per ciascun giorno) deve essere calcolato con una maggiorazione obbligatoria del 15% rispetto al tempo standard di percorrenza in auto (per via della velocit\xE0 ridotta e del peso del camper). Inserisci questa stima incrementata del 15% direttamente nei campi di risposta.

Assicurati che ciascun giorno dell'itinerario includa un'area sosta camper o campeggio realmente esistente (o credibile) con coordinate decimali (latitudine fra 35.0 e 48.0, longitudine fra 6.0 e 19.0 se in Italia, altrimenti europee corrispondenti) per consentire la visualizzazione su mappa GPS.`;
      console.log(`[Gemini AI] Generating itinerary from ${startLocation} for ${numDays} days...`);
      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              title: {
                type: import_genai.Type.STRING,
                description: "Titolo accattivante per l'itinerario in camper, es: 'La Via del Chianti in Mansardato'"
              },
              description: {
                type: import_genai.Type.STRING,
                description: "Breve sommario descrittivo del viaggio e delle atmosfere"
              },
              totalKm: {
                type: import_genai.Type.STRING,
                description: "Chilometri stimati totali da percorrere, es: '210 km'"
              },
              totalDrivingTime: {
                type: import_genai.Type.STRING,
                description: "Tempo di guida complessivo stimato con l'aumento del 15% gi\xE0 calcolato, es: '4 ore e 50 minuti'"
              },
              days: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    dayNumber: { type: import_genai.Type.INTEGER },
                    title: { type: import_genai.Type.STRING, description: "Focus o tappe del giorno, es: 'Giorno 1: Arrivo a Siena e colli senesi'" },
                    description: { type: import_genai.Type.STRING, description: "Cosa si visiter\xE0 e l'itinerario stradale descrittivo della giornata" },
                    stopPlaceName: { type: import_genai.Type.STRING, description: "Nome dell'Area Sosta Camper o Campeggio consigliato per la notte" },
                    drivingSegment: { type: import_genai.Type.STRING, description: "Segmento stradale del giorno con tempo di guida stimato con l'aumento del 15% gi\xE0 calcolato, es: 'Firenze -> Siena (75km, 1h 20m)'" },
                    activities: {
                      type: import_genai.Type.ARRAY,
                      items: { type: import_genai.Type.STRING },
                      description: "Lista di 2-4 cose specifiche da fare o posti da vedere"
                    },
                    camperTips: {
                      type: import_genai.Type.STRING,
                      description: "Consiglio specifico per camperisti legato alle dimensioni del veicolo, alle pendenze, o ai servizi dell'area sosta"
                    },
                    stopCoordinate: {
                      type: import_genai.Type.OBJECT,
                      properties: {
                        lat: { type: import_genai.Type.NUMBER, description: "Latitudine reale o stima coerente per il punto sosta camper (es. 43.318)" },
                        lng: { type: import_genai.Type.NUMBER, description: "Longitudine reale o stima coerente per il punto sosta camper (es. 11.332)" },
                        label: { type: import_genai.Type.STRING, description: "Etichetta del marker sulla mappa, es: 'Area sosta Fagiolone Siena'" }
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
    } catch (err) {
      console.log("[AI Itinerary Info]: Error generated during AI itinerary.", err.message);
      res.status(500).json({ error: "Errore durante la generazione dell'itinerario AI: " + getFriendlyGeminiError(err) });
    }
  });
  app2.post("/api/search-events", async (req, res) => {
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
      } catch (groundingErr) {
        console.log(`[AI Events Info] Search grounding tool hit a limit/error. Falling back to standard Gemini...`, groundingErr.message);
        response = await generateContentWithRetry({
          model: "gemini-3.5-flash",
          contents: `Consiglia i principali eventi annuali tradizionali, sagre storiche, mercatini e feste famose che si tengono ricorrentemente nella zona di: "${location}". 
Formatta in markdown chiaro usando titoli di livello 3 (###) per ciascun evento. Aggiungi consigli utili per la sosta camper nelle vicinanze.`
        });
      }
      res.json({ eventsText: response.text });
    } catch (err) {
      console.log("[AI Events Info]: Error generated during AI events search.", err.message);
      res.status(500).json({ error: "Errore durante la ricerca eventi: " + getFriendlyGeminiError(err) });
    }
  });
  app2.post("/api/admin/generate-province-places", async (req, res) => {
    let province = "";
    try {
      province = req.body.province || "";
      if (!province) {
        return res.status(400).json({ error: "Province is required" });
      }
      console.log(`[Fresh Search Mandated] Bypassing cache and hardcoded hits to execute real-time search for province: ${province}`);
      console.log(`[Gemini AI with Search Grounding] Discovering POIs for province: ${province}...`);
      try {
        const searchPrompt = `Cerca sul web (usando Google Search Grounding) reali, esistenti, attivi ed ufficiali punti di sosta camper, aree di sosta attrezzate, campeggi o camper service (carico/scarico acque) situati nel territorio di "${province}" (Italia) o nelle immediate vicinanze.
Esegui una ricerca approfondita e ad ampio spettro che interroghi e combini i risultati provenienti sia da Camperpass.it sia da tutti gli altri principali portali specializzati italiani ed europei. Non limitarti ad un solo portale: vogliamo ottenere la massima copertura raccogliendo tutti i punti sosta reali documentati in uno o pi\xF9 di questi siti:
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
        console.log(`[Gemini AI Search] Querying web search for real camper facilities in ${province}...`);
        const searchResponse = await generateContentWithRetry({
          model: "gemini-3.5-flash",
          contents: searchPrompt,
          config: {
            tools: [{ googleSearch: {} }]
          }
        });
        const rawSearchText = searchResponse.text;
        console.log(`[Gemini AI Search] Web search result received. Now parsing into JSON...`);
        const parseSystemInstruction = `Sei un assistente esperto, preciso e rigoroso. Il tuo compito \xE8 analizzare i risultati di una ricerca web relativi ad aree sosta camper reali e formattarli in un JSON valido.
REGOLE DI RIGORE ASSOLUTO:
- Includi SOLO ed ESCLUSIVAMENTE i luoghi esplicitamente presenti e documentati come reali nel testo fornito.
- \xC8 SEVERAMENTE VIETATO inventare, presumere o allucinare nuovi luoghi, nomi, indirizzi o dettagli che non siano presenti nel testo della ricerca web.
- Se il testo della ricerca contiene solo pochi luoghi reali (o nessuno), restituisci solo quelli identificati. Non aggiungere luoghi fittizi per "riempire" la lista.
- Per ciascun luogo reale estratto:
  1. Mantieni il nome e l'indirizzo reale trovato.
  2. Identifica la categoria: "sosta" (area sosta attrezzata), "campeggio" (camping), "parcheggio" (parcheggio generico dove \xE8 tollerata la sosta camper), "scarico" (camper service, solo carico/scarico).
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
      "priceInfo": "12\u20AC/24h",
      "rating": 4.5,
      "facilities": ["Acqua", "Scarico", "Elettricit\xE0"],
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
              type: import_genai.Type.OBJECT,
              properties: {
                places: {
                  type: import_genai.Type.ARRAY,
                  items: {
                    type: import_genai.Type.OBJECT,
                    properties: {
                      name: { type: import_genai.Type.STRING },
                      category: { type: import_genai.Type.STRING },
                      lat: { type: import_genai.Type.NUMBER },
                      lng: { type: import_genai.Type.NUMBER },
                      address: { type: import_genai.Type.STRING },
                      priceEuro: { type: import_genai.Type.NUMBER },
                      priceInfo: { type: import_genai.Type.STRING },
                      rating: { type: import_genai.Type.NUMBER },
                      facilities: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
                      source: { type: import_genai.Type.STRING, description: "La fonte web da cui \xE8 stato estratto il luogo (es. Camperpass.it, Camperonline.it, Park4night, OpenStreetMap)" }
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
          const validPlaces = parsed.places.filter((p) => p && p.name && p.lat && p.lng);
          if (validPlaces.length > 0) {
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
      } catch (geminiErr) {
        console.log(`[Gemini AI Info] IA o Grounding non disponibile per ${province} (${geminiErr.message || geminiErr}). Carico sosta reali.`);
        try {
          const norm = province.toLowerCase().trim();
          if (VERIFIED_REAL_PLACES[norm]) {
            console.log(`[Fallback Verified Real Places Hit] Returning 100% verified real places for: ${province}`);
            const enriched = VERIFIED_REAL_PLACES[norm].map((p) => ({
              ...p,
              source: "Database Certificato ViaCamper",
              nearestCity: p.nearestCity || findNearestCity(p.lat, p.lng)
            }));
            saveCachedProvincePlaces(province, enriched);
            return res.json({ places: enriched, isFallback: true });
          }
          const coords = await getProvinceCoordinates(province);
          const realPlaces = await fetchActualOSMPlaces(province, coords);
          if (realPlaces && realPlaces.length > 0) {
            const mappedPlaces = realPlaces.map((p) => ({
              ...p,
              source: p.source || "OpenStreetMap"
            }));
            saveCachedProvincePlaces(province, mappedPlaces);
            return res.json({ places: mappedPlaces, isFallback: true, isOSM: true });
          } else {
            console.log(`[OpenStreetMap Fallback] Nessun risultato sosta reale da OSM per ${province}.`);
            return res.status(404).json({
              error: `Non \xE8 stato possibile individuare aree di sosta camper reali e certificate per la provincia o localit\xE0 "${province}" su OpenStreetMap o tramite ricerca web. Inserisci l'area manualmente.`
            });
          }
        } catch (fallbackErr) {
          console.error("Errore durante il recupero dei POI:", fallbackErr);
          return res.status(404).json({
            error: `Non \xE8 stato possibile caricare aree reali da OpenStreetMap o tramite ricerca live per "${province}". Riprova pi\xF9 tardi o inserisci l'area manualmente.`
          });
        }
      }
    } catch (err) {
      console.log(`[Gemini AI Info] Errore generale ricerca POI per ${province}.`);
      try {
        const norm = province.toLowerCase().trim();
        if (VERIFIED_REAL_PLACES[norm]) {
          console.log(`[Fallback Verified Real Places Hit] Returning 100% verified real places for: ${province}`);
          const enriched = VERIFIED_REAL_PLACES[norm].map((p) => ({
            ...p,
            source: "Database Certificato ViaCamper",
            nearestCity: p.nearestCity || findNearestCity(p.lat, p.lng)
          }));
          saveCachedProvincePlaces(province, enriched);
          return res.json({ places: enriched, isFallback: true });
        }
        const coords = await getProvinceCoordinates(province);
        const realPlaces = await fetchActualOSMPlaces(province, coords);
        if (realPlaces && realPlaces.length > 0) {
          const mappedPlaces = realPlaces.map((p) => ({
            ...p,
            source: p.source || "OpenStreetMap"
          }));
          saveCachedProvincePlaces(province, mappedPlaces);
          return res.json({ places: mappedPlaces, isFallback: true, isOSM: true });
        } else {
          return res.status(404).json({
            error: `Nessuna area di sosta camper reale trovata per la provincia o localit\xE0 "${province}" su OpenStreetMap o tramite ricerca web.`
          });
        }
      } catch (fallbackErr) {
        return res.status(400).json({
          error: `Errore durante il caricamento dei dati reali per la provincia o localit\xE0 "${province}". Verifica la connessione o inserisci l'area manualmente.`
        });
      }
    }
  });
  app2.post("/api/generate-checklist", async (req, res) => {
    try {
      const { destinationType, season, crew, parkingStyle, additionalNotes } = req.body;
      const systemInstruction = "Sei 'ViaCamperApp AI', l'assistente camperista intelligente. Il tuo obiettivo \xE8 generare controlli di sicurezza, sosta pre-partenza ed equipaggiamento personalizzati per un viaggio in camper sulla base delle specifiche fornite dall'utente.\nLe categorie possibili in cui dividere e allocare ciascun elemento sono TASSATIVAMENTE le seguenti quattro:\n1. 'Partenza': riguardanti le fasi di preparazione del mezzo immediatamente prima dello sblocco freno a mano e accensione motore (es. chiudere obl\xF2, bloccare sportelli, chiudere gas).\n2. 'Sosta': riguardanti la sosta e l'installazione all'arrivo (es. livellamento con cunei, allacciamento corrente 230V, scarico grigie).\n3. 'Sicurezza': riguardanti strumenti salvavita, documenti, controlli meccanici profondi, kit medici o dotazioni neve/fango.\n4. 'Alimentari & Cucina': per l'approvvigionamento cambusa, bombole gas, rifornimento acqua potabile e utensili specifici per cucinare in camper.\n\nRispondi esclusivamente in formato JSON valido aderente allo schema strutturato.";
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
            type: import_genai.Type.OBJECT,
            properties: {
              items: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    text: {
                      type: import_genai.Type.STRING,
                      description: "Azione pratica e dettagliata da verificare o inserire in lista (es: 'Verifica le catene da neve a bordo ed esercitata a montarle' o 'Fissa le staffe delle biciclette sul portabici posteriore')"
                    },
                    category: {
                      type: import_genai.Type.STRING,
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
      const validCategories = ["Partenza", "Sosta", "Sicurezza", "Alimentari & Cucina"];
      const validatedItems = (parsed.items || []).map((item) => {
        let cat = item.category;
        if (!validCategories.includes(cat)) {
          if (cat === "Alimentari" || cat === "Cucina" || cat.toLowerCase().includes("alimentari")) {
            cat = "Alimentari & Cucina";
          } else if (cat.toLowerCase().includes("partenza")) {
            cat = "Partenza";
          } else if (cat.toLowerCase().includes("sosta")) {
            cat = "Sosta";
          } else {
            cat = "Sicurezza";
          }
        }
        return {
          text: item.text,
          category: cat
        };
      });
      res.json({ success: true, items: validatedItems });
    } catch (err) {
      console.log("[AI Checklist Info]: Error generated during AI checklist.", err.message);
      res.status(500).json({ error: "Errore durante la generazione della checklist AI: " + getFriendlyGeminiError(err) });
    }
  });
  app2.get("/sw.js", (req, res) => {
    const swPath = import_path.default.join(process.cwd(), "public", "sw.js");
    if (import_fs.default.existsSync(swPath)) {
      res.type("application/javascript");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.sendFile(swPath);
    } else {
      res.status(404).send("Service worker file not found on disk");
    }
  });
  app2.get("/manifest.json", (req, res) => {
    const manifestPath = import_path.default.join(process.cwd(), "public", "manifest.json");
    if (import_fs.default.existsSync(manifestPath)) {
      res.type("application/json");
      res.sendFile(manifestPath);
    } else {
      res.status(404).send("Manifest file not found on disk");
    }
  });
  app2.get("/api/public-places", async (req, res) => {
    try {
      const snapshot = await firestoreDb.collection("places").where("status", "==", "approved").get();
      const approved = [];
      snapshot.forEach((doc2) => {
        approved.push({ id: doc2.id, ...doc2.data() });
      });
      res.json(approved);
    } catch (err) {
      console.error("Error fetching approved places from Firestore:", err);
      const list = loadUserPlaces();
      const approved = list.filter((p) => p.status === "approved");
      res.json(approved);
    }
  });
  app2.get("/api/admin/pending-places", async (req, res) => {
    try {
      const snapshot = await firestoreDb.collection("places").where("status", "==", "pending").get();
      const pending = [];
      snapshot.forEach((doc2) => {
        pending.push({ id: doc2.id, ...doc2.data() });
      });
      res.json(pending);
    } catch (err) {
      console.error("Error fetching pending places from Firestore:", err);
      const list = loadUserPlaces();
      const pending = list.filter((p) => p.status === "pending");
      res.json(pending);
    }
  });
  app2.post("/api/check-profanity", async (req, res) => {
    try {
      const { text, author, type } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Testo mancante." });
      }
      const profanityResult = await checkContentForProfanity(text);
      if (!profanityResult.isClean) {
        await firestoreDb.collection("adminNotifications").add({
          type: type === "review" ? "rejected_review" : "rejected_content",
          reason: profanityResult.reason,
          author: author || "Anonimo",
          content: text,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        return res.status(400).json({ error: "non \xE8 una recensione o proposta pubblicabile" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error in check-profanity endpoint:", err);
      res.status(500).json({ error: "Unknown error" });
    }
  });
  app2.post("/api/propose-place", async (req, res) => {
    try {
      const newPlace = req.body;
      if (!newPlace.name || !newPlace.category || !newPlace.lat || !newPlace.lng) {
        return res.status(400).json({ error: "Dati obbligatori mancanti: nome, categoria, latitudine o longitudine." });
      }
      const textToCheck = `${newPlace.name} ${newPlace.address || ""}`;
      const profanityResult = await checkContentForProfanity(textToCheck);
      if (!profanityResult.isClean) {
        await firestoreDb.collection("adminNotifications").add({
          type: "rejected_proposal",
          reason: profanityResult.reason,
          author: newPlace.createdBy || "Anonimo",
          content: textToCheck,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        return res.status(400).json({ error: "non \xE8 una recensione o proposta pubblicabile" });
      }
      const placeId = `user_place_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let imageUrl = newPlace.imageUrl;
      if (!imageUrl && defaultIcons[newPlace.category]) {
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${defaultIcons[newPlace.category]}`;
      }
      if (!imageUrl) {
        imageUrl = "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600";
      }
      if (typeof imageUrl === "string" && imageUrl.startsWith("data:")) {
        const base64Data = imageUrl.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        const filename = `places/${placeId}.jpg`;
        const file = bucket.file(filename);
        const { randomUUID } = require("crypto");
        const downloadToken = randomUUID();
        await file.save(buffer, {
          contentType: "image/jpeg",
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
        priceInfo: newPlace.priceInfo || "Gratuito",
        priceEuro: Number(newPlace.priceEuro) || 0,
        phone: newPlace.phone || "",
        imageUrl,
        facilities: newPlace.facilities || [],
        hasMaxHeightLimit: newPlace.hasMaxHeightLimit ?? false,
        maxHeight: newPlace.maxHeight !== void 0 ? Number(newPlace.maxHeight) : null,
        hasMaxWeightLimit: newPlace.hasMaxWeightLimit ?? false,
        maxWeight: newPlace.maxWeight !== void 0 ? Number(newPlace.maxWeight) : null,
        isNarrowAccess: newPlace.isNarrowAccess ?? false,
        rating: Number(newPlace.rating) || 5,
        reviews: newPlace.reviews || [],
        createdBy: newPlace.createdBy || "",
        status: newPlace.proposedBy === "AI Gemini" ? "approved" : "pending",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await firestoreDb.collection("places").doc(placeId).set(removeUndefined(entry));
      console.log(`[Firestore Sync] Proposed new place: ${entry.name} (${placeId})`);
      if (entry.status === "pending") {
        await notifyModerators("places", "Nuova Sosta Proposta", `Una nuova sosta \xE8 in attesa di approvazione: ${entry.name}`, { placeId });
      }
      try {
        const list = loadUserPlaces();
        list.push({ id: placeId, ...entry });
        saveUserPlaces(list);
      } catch (backErr) {
      }
      const targetAdminEmail = process.env.ADMIN_EMAIL || "viacamperapp@gmail.com";
      if (process.env.RESEND_API_KEY && targetAdminEmail && entry.status === "pending") {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          resend.emails.send({
            from: "ViaCamperApp <onboarding@resend.dev>",
            to: targetAdminEmail,
            subject: `\u{1F4CD} Nuova proposta di sosta da approvare: ${entry.name}`,
            html: `
              <h2>\u{1F4CD} Nuova Proposta di Sosta Inviata dagli Utenti</h2>
              <p>Un utente ha proposto una nuova struttura su ViaCamperApp ed \xE8 in attesa di approvazione:</p>
              <ul>
                <li><strong>Nome Sosta:</strong> ${entry.name}</li>
                <li><strong>Categoria:</strong> ${entry.category}</li>
                <li><strong>Indirizzo:</strong> ${entry.address || "N/D"}</li>
                <li><strong>Coordinate:</strong> ${entry.lat}, ${entry.lng}</li>
                <li><strong>Prezzo:</strong> ${entry.priceInfo || "Gratuito"} (${entry.priceEuro}\u20AC)</li>
                <li><strong>Telefono:</strong> ${entry.phone || "N/D"}</li>
                <li><strong>Servizi:</strong> ${entry.facilities.length > 0 ? entry.facilities.join(", ") : "Nessuno"}</li>
                <li><strong>Inviata da (Email/Utente):</strong> ${entry.createdBy || "Anonimo / Non specificato"}</li>
                <li><strong>Data Invio:</strong> ${entry.createdAt}</li>
              </ul>
              <br/>
              <p>Puoi esaminare e approvare direttamente questa proposta accedendo al pannello amministratore dell'app (sezione <strong>Impostazioni > Amministrazione > Proposte Sosta</strong> o nella tab Mappa).</p>
            `
          }).then((emailRes) => {
            if (emailRes?.error) {
              console.log(`[Email Notice] Resend: ${emailRes.error.message || "validation notice"}`);
            } else {
              console.log(`[Email] Admin proposal notification sent successfully: ${entry.name}`);
            }
          }).catch((emailSendErr) => {
            console.log("Admin proposal email notification notice:", emailSendErr?.message || emailSendErr);
          });
          console.log(`[Email] Admin proposal notification triggered in background to: ${targetAdminEmail}`);
        } catch (emailErr) {
          console.error("Error setting up admin proposal email notification:", emailErr);
        }
      }
      if (entry.status === "pending" && targetAdminEmail) {
        sendPushNotification(
          targetAdminEmail,
          `\u{1F4CD} Nuova sosta proposta!`,
          `L'utente ${entry.createdBy || "Anonimo"} ha proposto la sosta "${entry.name}".`,
          { type: "new_proposal", placeId }
        ).catch((err) => console.error("[FCM Push] Failed to notify admin of new proposal:", err));
      }
      res.json({ success: true, place: { id: placeId, ...entry } });
    } catch (err) {
      console.error("Error proposing place to Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown error inside server" });
    }
  });
  app2.post("/api/admin/approve-place", async (req, res) => {
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
      try {
        const list = loadUserPlaces();
        const item = list.find((p) => p.id === id);
        if (item) {
          item.status = "approved";
          saveUserPlaces(list);
        }
      } catch (backErr) {
      }
      const placeData = docSnap.data();
      if (placeData && placeData.createdBy) {
        sendPushNotification(
          placeData.createdBy,
          `\u2705 Sosta approvata!`,
          `La tua sosta proposta "${placeData.name}" \xE8 stata approvata ed \xE8 ora visibile sulla mappa!`,
          { type: "proposal_approved", placeId: id }
        ).catch((err) => console.error("[FCM Push] Failed to notify user of proposal approval:", err));
      }
      res.json({ success: true, place: { id, ...docSnap.data(), status: "approved" } });
    } catch (err) {
      console.error("Error approving place in Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });
  app2.post("/api/admin/reject-place", async (req, res) => {
    try {
      const { id } = req.body;
      console.log(`[Admin API] Attempting to reject/delete place ID: ${id}`);
      if (!id) {
        console.error("[Admin API] Missing ID in reject request.");
        return res.status(400).json({ error: "ID mancante." });
      }
      await firestoreDb.collection("places").doc(id).delete();
      console.log(`[Firestore Sync] Rejected/Deleted place ID: ${id}`);
      try {
        const list = loadUserPlaces();
        const filtered = list.filter((p) => p.id !== id);
        saveUserPlaces(filtered);
      } catch (backErr) {
        console.warn("[Admin API] Failed to sync local backup:", backErr);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error rejecting place in Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });
  app2.post("/api/admin/update-place", async (req, res) => {
    try {
      const { id, updatedData } = req.body;
      if (!id || !updatedData) {
        return res.status(400).json({ error: "ID e dati aggiornati sono obbligatori." });
      }
      await firestoreDb.collection("places").doc(id).update(updatedData);
      console.log(`[Firestore Sync] Updated place ID: ${id}`);
      try {
        const list = loadUserPlaces();
        const index = list.findIndex((p) => p.id === id);
        if (index !== -1) {
          list[index] = { ...list[index], ...updatedData };
          saveUserPlaces(list);
        }
      } catch (backErr) {
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating place in Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });
  app2.get("/api/admin/all-places", async (req, res) => {
    try {
      const snapshot = await firestoreDb.collection("places").get();
      const places = [];
      snapshot.forEach((doc2) => {
        places.push({ id: doc2.id, ...doc2.data() });
      });
      res.json(places);
    } catch (err) {
      console.error("Error fetching all places from Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });
  app2.post("/api/register", async (req, res) => {
    try {
      const { email, password, name, surname, dob, nickname, inviteCode, profilePhoto } = req.body;
      if (!email || !password || !nickname) {
        return res.status(400).json({ error: "Email, password e nickname sono richiesti per la registrazione." });
      }
      const cleanEmail = email.toLowerCase().trim();
      const cleanNickname = nickname.trim();
      const usersRef = firestoreDb.collection("users");
      let emailTaken = false;
      try {
        const snapshot = await usersRef.where("email", "==", cleanEmail).get();
        snapshot.forEach((doc2) => {
          const data = doc2.data();
          const docEmail = (data.email || doc2.id).toLowerCase().trim();
          if (!isUserDeleted(docEmail)) {
            emailTaken = true;
          }
        });
      } catch (fsErr) {
        console.log("[Firestore Auth Fallback] Firestore email query fallback active.");
      }
      const cachedUsers = getCachedUsers();
      if (cachedUsers.some((u) => (u.email || "").toLowerCase().trim() === cleanEmail && !isUserDeleted(cleanEmail))) {
        emailTaken = true;
      }
      if (emailTaken) {
        return res.status(400).json({ error: "Indirizzo email gi\xE0 registrato." });
      }
      let nicknameTaken = false;
      try {
        const nicknameSnapshot = await usersRef.where("nickname", "==", cleanNickname).get();
        nicknameSnapshot.forEach((doc2) => {
          const data = doc2.data();
          const docEmail = (data.email || doc2.id).toLowerCase().trim();
          if (!isUserDeleted(docEmail)) {
            nicknameTaken = true;
          }
        });
      } catch (fsErr) {
        console.log("[Firestore Auth Fallback] Firestore nickname query fallback active.");
      }
      if (cachedUsers.some((u) => (u.nickname || "").trim().toLowerCase() === cleanNickname.toLowerCase() && !isUserDeleted(u.email))) {
        nicknameTaken = true;
      }
      if (nicknameTaken) {
        return res.status(400).json({ error: "Questo nickname \xE8 gi\xE0 stato scelto da un altro camperista." });
      }
      const adminEmail = (process.env.ADMIN_EMAIL || "viacamperapp@gmail.com").toLowerCase().trim();
      const isRegisteredUserAdmin = cleanEmail === adminEmail || cleanEmail === "viacamperapp@gmail.com" || cleanEmail === "sambucci.simone@gmail.com";
      const newUserDoc = {
        email: cleanEmail,
        password,
        name: name || "",
        surname: surname || "",
        dob: dob || "",
        nickname: cleanNickname,
        profilePhoto: profilePhoto || "",
        favorites: [],
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        approved: isRegisteredUserAdmin ? true : false
      };
      const overrides = getUserOverrides();
      if (overrides[cleanEmail]?.deleted) {
        delete overrides[cleanEmail].deleted;
        try {
          import_fs.default.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2), "utf-8");
        } catch (err) {
          console.error("Error updating overrides file:", err);
        }
      }
      try {
        await usersRef.doc(cleanEmail).set(newUserDoc);
        console.log(`[Firestore Auth] User registered successfully on Firestore: ${cleanEmail}`);
        if (!newUserDoc.approved) {
          notifyModerators("users", "Richiesta Iscrizione Utente", `Nuovo utente in attesa di approvazione: ${cleanNickname} (${cleanEmail})`, { email: cleanEmail, nickname: cleanNickname, type: "user_approval" }).catch((err) => console.warn("[Notification] Moderator alert failed:", err));
        }
      } catch (fsErr) {
        console.log(`[Firestore Auth Fallback] User ${cleanEmail} registered & saved locally.`);
      }
      const updatedCached = cachedUsers.filter((u) => (u.email || "").toLowerCase().trim() !== cleanEmail);
      updatedCached.push(newUserDoc);
      cacheUsers(updatedCached);
      const targetAdminEmailForReg = process.env.ADMIN_EMAIL || "viacamperapp@gmail.com";
      if (process.env.RESEND_API_KEY && targetAdminEmailForReg) {
        (async () => {
          try {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
              from: "ViaCamperApp <onboarding@resend.dev>",
              to: targetAdminEmailForReg,
              subject: `Richiesta di approvazione nuovo utente su ViaCamperApp [${newUserDoc.nickname}]`,
              html: `
                <h2>Richiesta di approvazione nuovo utente registrato</h2>
                <p>Un nuovo camperista si \xE8 appena iscritto ed \xE8 in attesa di essere approvato per accedere all'app:</p>
                <ul>
                  <li><strong>Email:</strong> ${newUserDoc.email}</li>
                  <li><strong>Nickname:</strong> ${newUserDoc.nickname}</li>
                  <li><strong>Nome:</strong> ${newUserDoc.name || "N/D"}</li>
                  <li><strong>Cognome:</strong> ${newUserDoc.surname || "N/D"}</li>
                  <li><strong>Data di Nascita:</strong> ${newUserDoc.dob || "N/D"}</li>
                  <li><strong>Data registrazione:</strong> ${newUserDoc.createdAt}</li>
                  <li><strong>Stato approvazione:</strong> IN ATTESA DI APPROVAZIONE</li>
                </ul>
                <br/>
                <p>Puoi approvare questo utente direttamente dal pannello amministratore di ViaCamperApp sotto la sezione <strong>Impostazioni > Amministrazione > Iscritti</strong>.</p>
              `
            });
            console.log(`[Email] Admin notification sent successfully for user: ${newUserDoc.email}`);
          } catch (emailErr) {
            console.log("Admin notification email notice:", emailErr?.message || emailErr);
          }
        })().catch(() => {
        });
      }
      const adminPushTargets = ["sambucci.simone@gmail.com", "viacamperapp@gmail.com"];
      if (process.env.ADMIN_EMAIL && !adminPushTargets.includes(process.env.ADMIN_EMAIL.toLowerCase().trim())) {
        adminPushTargets.push(process.env.ADMIN_EMAIL.toLowerCase().trim());
      }
      sendPushNotification(
        adminPushTargets,
        `\u{1F465} Nuovo camperista iscritto!`,
        `L'utente ${newUserDoc.nickname} (${newUserDoc.name || ""} ${newUserDoc.surname || ""}) si \xE8 registrato ed \xE8 in attesa di approvazione.`,
        { type: "new_registration", userEmail: newUserDoc.email, nickname: newUserDoc.nickname }
      ).catch((err) => console.error("[FCM Push] Failed to notify admin of new registration:", err));
      return res.json({ success: true, user: { email: newUserDoc.email, name: newUserDoc.name, nickname: newUserDoc.nickname, profilePhoto: newUserDoc.profilePhoto, approved: newUserDoc.approved } });
    } catch (err) {
      console.error("Error in register endpoint:", err);
      res.status(500).json({ error: err.message || "Unknown register error" });
    }
  });
  app2.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const cleanEmail = String(email || "").toLowerCase().trim();
      const cleanPass = String(password || "").trim();
      if (!cleanEmail || !cleanPass) {
        return res.status(400).json({ error: "Email e password sono richiesti per accedere." });
      }
      let userData = null;
      try {
        const userDoc = await firestoreDb.collection("users").doc(cleanEmail).get();
        if (userDoc.exists) {
          userData = userDoc.data();
        }
      } catch (fsErr) {
        console.log("[Firestore Auth Fallback] Firestore user lookup fallback active locally.");
      }
      userData = getOverrideAppliedUser(cleanEmail, userData);
      if (!userData) {
        return res.status(400).json({ error: "Nessun account registrato con questa email." });
      }
      const storedPass = String(userData.password || "").trim();
      if (storedPass !== cleanPass) {
        return res.status(400).json({ error: "Password errata. Se non la ricordi, usa la funzione 'Password dimenticata?'." });
      }
      if (userData.approved === false) {
        return res.status(403).json({ error: "Il tuo account \xE8 in attesa di approvazione da parte di un moderatore." });
      }
      console.log(`[Firestore Auth] User logged in: ${cleanEmail}`);
      res.json({
        success: true,
        user: {
          email: userData.email,
          name: userData.name,
          nickname: userData.nickname,
          profilePhoto: userData.profilePhoto || userData.avatarUrl || "",
          favorites: userData.favorites || [],
          isModerator: !!userData.isModerator
        }
      });
    } catch (err) {
      console.error("Error in login endpoint:", err);
      res.status(500).json({ error: err.message || "Unknown login error" });
    }
  });
  app2.post("/api/reset-password", async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email) {
        return res.status(400).json({ error: "L'indirizzo email \xE8 obbligatorio." });
      }
      const formattedEmail = email.toLowerCase().trim();
      const userRef = firestoreDb.collection("users").doc(formattedEmail);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "Nessun utente trovato con questo indirizzo email." });
      }
      let updatedPass = newPassword;
      if (!updatedPass || updatedPass.trim().length < 4) {
        updatedPass = "ViaCamper" + Math.floor(1e3 + Math.random() * 9e3);
      } else {
        updatedPass = updatedPass.trim();
      }
      await userRef.update({ password: updatedPass });
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          resend.emails.send({
            from: "ViaCamperApp <onboarding@resend.dev>",
            to: formattedEmail,
            subject: "\u{1F511} Ripristino Password ViaCamper",
            html: `<div style="font-family: sans-serif; padding: 20px;">
              <h2>Ripristino Password ViaCamper</h2>
              <p>Ciao <strong>${userDoc.data()?.nickname || "Camperista"}</strong>,</p>
              <p>La tua password per l'account <code>${formattedEmail}</code> \xE8 stata aggiornata:</p>
              <p style="font-size: 18px; font-weight: bold; background: #f1f5f9; padding: 10px; border-radius: 8px;">${updatedPass}</p>
              <p>Puoi accedere all'app utilizzando questa password.</p>
            </div>`
          }).then((res2) => {
            console.log("[Reset Password] Email sent successfully to:", formattedEmail);
          }).catch((e) => {
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
    } catch (err) {
      console.error("Error in reset-password endpoint:", err);
      res.status(500).json({ error: err.message || "Errore durante il ripristino password." });
    }
  });
  app2.post("/api/user/push-token", async (req, res) => {
    try {
      const { email, token, platform } = req.body;
      if (!email || !token) {
        return res.status(400).json({ error: "Email e token sono richiesti." });
      }
      const tokensRef = firestoreDb.collection("push_tokens");
      await tokensRef.doc(email.toLowerCase().trim()).set({
        email: email.toLowerCase().trim(),
        token,
        platform: platform || "unknown",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log(`[FCM Push] Token registered in Firestore for ${email}: ${token}`);
      res.json({ success: true, message: "Token push registrato con successo." });
    } catch (err) {
      console.error("Error storing push token:", err);
      res.status(500).json({ error: err.message || "Unknown error inside server" });
    }
  });
  app2.post("/api/user/update-profile", async (req, res) => {
    try {
      const { email, profilePhoto, nickname, name } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email mancante." });
      }
      const updateData = {};
      if (profilePhoto !== void 0) updateData.profilePhoto = profilePhoto;
      if (nickname) updateData.nickname = nickname.trim();
      if (name) updateData.name = name.trim();
      await firestoreDb.collection("users").doc(email.toLowerCase().trim()).update(updateData);
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating user profile:", err);
      res.status(500).json({ error: err.message || "Errore aggiornamento profilo" });
    }
  });
  app2.post("/api/admin/users/approve", async (req, res) => {
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
      } catch (fsErr) {
        console.log(`[Firestore Auth Fallback] Saved user ${cleanEmail} approval locally.`);
      }
      saveUserOverride(cleanEmail, { approved: true });
      const cached = getCachedUsers();
      const uIdx = cached.findIndex((u) => (u.email || "").toLowerCase().trim() === cleanEmail);
      if (uIdx !== -1) {
        cached[uIdx].approved = true;
        cacheUsers(cached);
      }
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          resend.emails.send({
            from: "ViaCamperApp <onboarding@resend.dev>",
            to: cleanEmail,
            subject: "Il tuo account ViaCamperApp \xE8 stato approvato! \u{1F389}",
            html: `
              <h2>Benvenuto su ViaCamperApp!</h2>
              <p>Siamo felici di comunicarti che il tuo account \xE8 stato approvato dall'amministratore.</p>
              <p>Ora puoi effettuare il login con la tua email e password e iniziare ad utilizzare l'applicazione.</p>
              <br/>
              <p>Buon viaggio! \u{1F690}\u{1F4A8}</p>
            `
          }).then((emailRes) => {
            if (emailRes?.error) {
              console.log(`[Email Notice] Resend approval: ${emailRes.error.message || "validation notice"}`);
            } else {
              console.log(`[Email] Approval notification sent successfully to user: ${cleanEmail}`);
            }
          }).catch((emailErr) => {
            console.log("Approval email notice to user:", emailErr?.message || emailErr);
          });
          console.log(`[Email] Approval notification triggered in background for user: ${cleanEmail}`);
        } catch (setupErr) {
          console.error("Error setting up approval email to user:", setupErr);
        }
      }
      res.json({ success: true, message: `Utente ${cleanEmail} approvato con successo.` });
    } catch (err) {
      console.error("Error approving user:", err);
      res.status(500).json({ error: err.message || "Errore durante l'approvazione." });
    }
  });
  app2.post("/api/admin/users/toggle-moderator", async (req, res) => {
    try {
      const { email, roles } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email mancante." });
      }
      const cleanEmail = email.toLowerCase().trim();
      const moderatorRoles = roles || {
        community: !!req.body.isModerator,
        places: !!req.body.isModerator,
        itineraries: !!req.body.isModerator
      };
      try {
        await firestoreDb.collection("users").doc(cleanEmail).update({
          moderatorRoles
        });
        console.log(`[Firestore Auth] User ${cleanEmail} moderator roles updated to:`, moderatorRoles);
      } catch (fsErr) {
        console.log(`[Firestore Auth Fallback] Saved user ${cleanEmail} moderator roles locally.`);
      }
      saveUserOverride(cleanEmail, { moderatorRoles });
      const cached = getCachedUsers();
      const uIdx = cached.findIndex((u) => (u.email || "").toLowerCase().trim() === cleanEmail);
      if (uIdx !== -1) {
        cached[uIdx].moderatorRoles = moderatorRoles;
        cacheUsers(cached);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating moderator status:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/admin/users", async (req, res) => {
    try {
      const userMap = /* @__PURE__ */ new Map();
      let proposalCounts = {};
      const cached = getCachedUsers();
      for (const u of cached) {
        if (u && u.email) {
          const clean = u.email.toLowerCase().trim();
          userMap.set(clean, { ...u, email: clean });
        }
      }
      try {
        const usersRef = firestoreDb.collection("users");
        const snapshot = await usersRef.get();
        snapshot.forEach((doc2) => {
          const data = doc2.data() || {};
          const clean = (data.email || doc2.id).toLowerCase().trim();
          const existing = userMap.get(clean) || {};
          userMap.set(clean, {
            ...existing,
            email: clean,
            name: data.name || existing.name || "",
            surname: data.surname || existing.surname || "",
            nickname: data.nickname || existing.nickname || "",
            dob: data.dob || existing.dob || "",
            createdAt: data.createdAt || existing.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
            isModerator: data.isModerator !== void 0 ? !!data.isModerator : !!existing.isModerator,
            approved: data.approved !== void 0 ? data.approved : existing.approved !== void 0 ? existing.approved : false,
            favoritesCount: (data.favorites || existing.favorites || []).length
          });
        });
        try {
          const placesSnapshot = await firestoreDb.collection("places").get();
          placesSnapshot.forEach((doc2) => {
            const placeData = doc2.data() || {};
            const creator = (placeData.createdBy || "").toLowerCase().trim();
            if (creator) {
              proposalCounts[creator] = (proposalCounts[creator] || 0) + 1;
            }
          });
        } catch (placeErr) {
          console.warn("Could not fetch place proposals for user counts:", placeErr);
        }
      } catch (fsErr) {
        console.log("[Firestore Auth Fallback] Reading users list from local cache due to Firestore notice.");
      }
      const rawUsers = Array.from(userMap.values());
      cacheUsers(rawUsers);
      const processedUsers = [];
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
      processedUsers.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      res.json(processedUsers);
    } catch (err) {
      console.error("Error loading users for admin:", err);
      res.status(500).json({ error: err.message || "Errore nel recupero degli utenti." });
    }
  });
  app2.get("/api/admin/users/:email/proposals", async (req, res) => {
    try {
      const email = req.params.email.toLowerCase().trim();
      const proposals = [];
      try {
        const snapshot = await firestoreDb.collection("places").get();
        snapshot.forEach((doc2) => {
          const data = doc2.data();
          const creator = (data.createdBy || "").toLowerCase().trim();
          if (creator === email) {
            proposals.push({
              id: doc2.id,
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
      } catch (fsErr) {
        console.warn("Could not fetch user proposals from Firestore:", fsErr.message);
      }
      proposals.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      res.json(proposals);
    } catch (err) {
      console.error("Error loading user proposals for admin:", err);
      res.status(500).json({ error: err.message || "Errore nel caricamento delle proposte." });
    }
  });
  app2.delete("/api/admin/users/:email", async (req, res) => {
    try {
      const email = req.params.email;
      if (!email) {
        return res.status(400).json({ error: "Email non specificata." });
      }
      const cleanEmail = email.toLowerCase().trim();
      try {
        await firestoreDb.collection("users").doc(cleanEmail).delete();
        console.log(`[Firestore Auth Admin] Fully deleted user account on Firestore: ${cleanEmail}`);
      } catch (fsErr) {
        console.log(`[Firestore Auth Fallback] Applied local deletion override for ${cleanEmail}.`);
      }
      saveUserOverride(cleanEmail, { deleted: true });
      const cached = getCachedUsers().filter((u) => (u.email || "").toLowerCase().trim() !== cleanEmail);
      cacheUsers(cached);
      res.json({ success: true, message: `Utente ${email} rimosso con successo.` });
    } catch (err) {
      console.error("Error deleting user for admin:", err);
      res.status(500).json({ error: err.message || "Errore durante l'eliminazione dell'utente." });
    }
  });
  app2.post("/api/user/delete-account", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email non specificata." });
      }
      const cleanEmail = email.toLowerCase().trim();
      if (firestoreDb) {
        await firestoreDb.collection("users").doc(cleanEmail).delete();
        try {
          const fuelLogs = await firestoreDb.collection(`users/${cleanEmail}/fuelLogs`).get();
          if (!fuelLogs.empty) {
            const batch = firestoreDb.batch();
            fuelLogs.forEach((doc2) => batch.delete(doc2.ref));
            await batch.commit();
          }
        } catch (subErr) {
          console.warn("[Firestore] Error deleting fuelLogs subcollection:", subErr);
        }
      }
      console.log(`[Firestore Auth] User self-deleted account: ${cleanEmail}`);
      res.json({ success: true, message: "Account ed i dati personali ad esso associati sono stati eliminati con successo." });
    } catch (err) {
      console.error("Error in user self-deletion:", err);
      res.status(500).json({ error: err.message || "Errore durante l'eliminazione dell'account." });
    }
  });
  app2.get("/api/user/favorites", async (req, res) => {
    try {
      const email = req.query.email;
      if (!email) {
        return res.status(400).json({ error: "Email non specificata." });
      }
      const userDoc = await firestoreDb.collection("users").doc(email.toLowerCase().trim()).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "Utente non trovato." });
      }
      const userData = userDoc.data() || {};
      res.json({ favorites: userData.favorites || [] });
    } catch (err) {
      console.error("Error fetching user favorites from Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });
  app2.post("/api/user/favorites", async (req, res) => {
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
    } catch (err) {
      console.error("Error updating user favorites in Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });
  app2.get("/api/fuel-logs/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const logsRef = firestoreDb.collection(`users/${email.toLowerCase().trim()}/fuelLogs`).orderBy("createdAt", "desc");
      const snapshot = await logsRef.get();
      const logs = snapshot.docs.map((doc2) => ({
        id: doc2.id,
        ...doc2.data()
      }));
      res.json(logs);
    } catch (err) {
      console.error("Error fetching fuel logs:", err);
      res.status(500).json({ error: err.message || "Unknown error fetching fuel logs" });
    }
  });
  app2.post("/api/fuel-logs/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const data = req.body;
      const newLog = {
        date: data.date,
        liters: data.liters,
        pricePerLiter: data.pricePerLiter,
        totalCost: data.totalCost,
        odometer: data.odometer,
        isFullTank: data.isFullTank || false,
        fuelCompany: data.fuelCompany || "Sconosciuta",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const newDocId = data.id || `fuel_${Date.now()}`;
      await firestoreDb.collection(`users/${email.toLowerCase().trim()}/fuelLogs`).doc(newDocId).set(newLog);
      res.json({ success: true, log: { id: newDocId, ...newLog } });
    } catch (err) {
      console.error("Error adding fuel log:", err);
      res.status(500).json({ error: err.message || "Unknown error adding fuel log" });
    }
  });
  app2.delete("/api/fuel-logs/:email/:logId", async (req, res) => {
    try {
      const { email, logId } = req.params;
      await firestoreDb.collection(`users/${email.toLowerCase().trim()}/fuelLogs`).doc(logId).delete();
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting fuel log:", err);
      res.status(500).json({ error: err.message || "Unknown error deleting fuel log" });
    }
  });
  const FAKE_USERS = /* @__PURE__ */ new Set([
    "Marco_Van78",
    "Elena_Camper91",
    "Simo_FamilyOnRoad",
    "BeppeVan",
    "TechCamper_Luca",
    "Valeria_Coast",
    "Pietro_Anto",
    "Stefano_Oasi",
    "Roberto_Mansardato",
    "Giada_Van",
    "Silvia_NORD",
    "Davide_Giramondo",
    "Mia_E_CaneToby",
    "GreenVan_Piero",
    "MeccanicoFaidate_Giuseppe",
    "ChefInViaggio_Chiara",
    "Andrea_Vento",
    "Giancarlo_Pioneer",
    "OfficinaCamper_Rino",
    "NomadFamily_Ilaria",
    "Bruno_CamperSicuro"
  ]);
  const FAKE_POST_IDS = /* @__PURE__ */ new Set([
    "m1",
    "m2",
    "m3",
    "m4",
    "social_post_1",
    "social_post_2",
    "social_post_3",
    "social_post_4",
    "chat_1",
    "chat_2"
  ]);
  function sanitizeServerCommunityMessage(docId, data) {
    if (!data) return null;
    const msgUser = data.user || "";
    if (FAKE_POST_IDS.has(docId) || FAKE_USERS.has(msgUser)) {
      return null;
    }
    const isInitialRolly = msgUser.includes("Rolly") || docId.startsWith("rolly_topic_") || docId.startsWith("social_post_rolly") || docId.startsWith("chat_rolly");
    const rawReplies = Array.isArray(data.replies) ? data.replies : [];
    const cleanReplies = rawReplies.filter((r) => {
      if (!r) return false;
      if (r.id && (r.id.startsWith("r_r") || r.id.startsWith("r_soc") || r.id.startsWith("r_chat"))) return false;
      if (r.user && FAKE_USERS.has(r.user)) return false;
      return true;
    });
    let likes = Number(data.likes) || 0;
    if (isInitialRolly) {
      likes = data.likedByCurrentUser ? 1 : 0;
    }
    let msgType = data.type;
    if (!msgType) {
      if (docId.startsWith("chat_") || data.text && (data.text.includes("chat live") || data.text.includes("quattro chiacchiere"))) {
        msgType = "chat";
      } else {
        msgType = "forum";
      }
    }
    let timestamp = data.timestamp;
    if (isInitialRolly) {
      const match = INITIAL_COMMUNITY_MESSAGES.find((m) => m.id === docId);
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
  app2.get("/api/community-messages", async (req, res) => {
    try {
      const snapshot = await firestoreDb.collection("communityMessages").orderBy("timestamp", "asc").limit(200).get();
      const hasRollyTopics = !snapshot.empty && snapshot.docs.some((doc2) => doc2.id && doc2.id.startsWith("rolly_topic_"));
      if (!hasRollyTopics) {
        console.log("[Firestore Seed] Triggering background seed for Rolly forum topics into Firestore...");
        Promise.all(
          INITIAL_COMMUNITY_MESSAGES.map(
            (msg) => firestoreDb.collection("communityMessages").doc(msg.id).set(msg, { merge: true }).catch((err) => console.error("Seed error:", err))
          )
        ).catch((e) => console.error("Batch seed error:", e));
      }
      const messages = [];
      snapshot.forEach((doc2) => {
        const rawData = doc2.data() || {};
        const sanitized = sanitizeServerCommunityMessage(doc2.id, rawData);
        if (sanitized) {
          messages.push(sanitized);
          const hadFakeReplies = (rawData.replies || []).length !== sanitized.replies.length;
          const hadFakeLikes = rawData.likes !== sanitized.likes;
          const hadMismatchedTimestamp = rawData.timestamp !== sanitized.timestamp;
          if (hadFakeReplies || hadFakeLikes || hadMismatchedTimestamp) {
            firestoreDb.collection("communityMessages").doc(doc2.id).update({
              likes: sanitized.likes,
              replies: sanitized.replies,
              timestamp: sanitized.timestamp
            }).catch((err) => console.error("Error updating cleaned Firestore doc:", err));
          }
        } else {
          firestoreDb.collection("communityMessages").doc(doc2.id).delete().catch((err) => console.error("Error deleting fake doc:", err));
        }
      });
      const fetchedIds = new Set(messages.map((m) => m.id));
      for (const initialMsg of INITIAL_COMMUNITY_MESSAGES) {
        if (!fetchedIds.has(initialMsg.id)) {
          const sanitizedInitial = sanitizeServerCommunityMessage(initialMsg.id, initialMsg);
          if (sanitizedInitial) {
            messages.push(sanitizedInitial);
          }
        }
      }
      res.json(messages);
    } catch (err) {
      console.error("Error loading community messages from Firestore:", err);
      const fallback = INITIAL_COMMUNITY_MESSAGES.map((m) => sanitizeServerCommunityMessage(m.id, m)).filter(Boolean);
      res.json(fallback);
    }
  });
  app2.post("/api/community-messages", async (req, res) => {
    try {
      const msg = req.body;
      if (!msg.user || !msg.text) {
        return res.status(400).json({ error: "Dati obbligatori mancanti: utente o testo." });
      }
      const msgId = msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const entry = {
        user: msg.user,
        avatar: msg.avatar || "\u{1F468}\u200D\u{1F4BB}",
        avatarColor: msg.avatarColor || "#86C232",
        title: msg.title || void 0,
        text: msg.text,
        timestamp: msg.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
        likes: Number(msg.likes) || 0,
        likedByCurrentUser: false,
        tag: msg.tag || "Generale",
        type: msg.type || (msgId.startsWith("chat_") ? "chat" : "forum"),
        locationName: msg.locationName || void 0,
        mediaUrl: msg.mediaUrl || void 0,
        mediaType: msg.mediaType || void 0,
        isResolved: msg.isResolved || false,
        replies: msg.replies || []
      };
      await firestoreDb.collection("communityMessages").doc(msgId).set(removeUndefined(entry));
      console.log(`[Firestore Chat] Shared message from ${msg.user} (Type: ${entry.type})`);
      if (entry.tag === "SOS" || entry.tag === "S.O.S.") {
        sendPushNotificationToAll(
          `\u{1F6A8} S.O.S. Camper Life!`,
          `${entry.user}: ${entry.text}`,
          { type: "sos_message", msgId }
        ).catch((err) => console.error("[FCM Push] Error sending SOS notification:", err));
      } else {
        sendPushNotificationToAll(
          `\u{1F4AC} Nuovo post in bacheca da ${entry.user}`,
          entry.text.length > 60 ? `${entry.text.substring(0, 60)}...` : entry.text,
          { type: "community_message", msgId }
        ).catch((err) => console.error("[FCM Push] Error sending post notification:", err));
      }
      res.json({ success: true, message: { id: msgId, ...entry } });
    } catch (err) {
      console.error("Error writing community message to Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown chat error" });
    }
  });
  app2.post("/api/community-messages/resolve", async (req, res) => {
    try {
      const { id, isResolved } = req.body;
      if (!id) {
        return res.status(400).json({ error: "ID mancante." });
      }
      await firestoreDb.collection("communityMessages").doc(id).update({
        isResolved: !!isResolved
      });
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating isResolved on Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/community-messages/like", async (req, res) => {
    try {
      const { id, likes } = req.body;
      if (!id) {
        return res.status(400).json({ error: "ID mancante." });
      }
      await firestoreDb.collection("communityMessages").doc(id).update({
        likes: Number(likes) || 0
      });
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating likes on Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/community-messages/reply", async (req, res) => {
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
        timestamp: reply.timestamp || (/* @__PURE__ */ new Date()).toISOString()
      };
      replies.push(newReply);
      await docRef.update({ replies });
      console.log(`[Firestore Chat] Thread reply in ${id} by ${newReply.user}`);
      try {
        const usersRef = firestoreDb.collection("users");
        const userSnap = await usersRef.where("nickname", "==", data.user).get();
        if (!userSnap.empty) {
          const userDoc = userSnap.docs[0].data();
          if (userDoc && userDoc.email && userDoc.email.toLowerCase().trim() !== (newReply.user || "").toLowerCase().trim()) {
            sendPushNotification(
              userDoc.email,
              `\u{1F4AC} ${newReply.user} ha risposto al tuo post`,
              newReply.text.length > 60 ? `${newReply.text.substring(0, 60)}...` : newReply.text,
              { type: "reply", parentId: id }
            ).catch((err) => console.error("[FCM Push] Error sending reply push:", err));
          }
        }
      } catch (fcmErr) {
        console.error("[FCM Push] Failed reply push notification logic:", fcmErr);
      }
      res.json({ success: true, reply: newReply });
    } catch (err) {
      console.error("Error posting chat reply in Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/community-messages/delete", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "ID mancante." });
      }
      await firestoreDb.collection("communityMessages").doc(id).delete();
      console.log(`[Firestore Chat] Message ${id} deleted by moderator`);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting community message on Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/community-messages/reply-delete", async (req, res) => {
    try {
      const { id, replies } = req.body;
      if (!id || !Array.isArray(replies)) {
        return res.status(400).json({ error: "Dati mancanti o non validi." });
      }
      await firestoreDb.collection("communityMessages").doc(id).update({
        replies
      });
      console.log(`[Firestore Chat] Thread replies updated for ${id}`);
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating replies array on Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/nominatim", async (req, res) => {
    try {
      const q = req.query.q;
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
    } catch (err) {
      console.error("Nominatim proxy error:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });
  app2.get("/api/google-places/search", async (req, res) => {
    try {
      const q = req.query.q;
      const lat = req.query.lat;
      const lng = req.query.lng;
      const clientKey = req.query.key;
      if (!q || !q.trim()) {
        return res.status(400).json({ error: "Missing parameter q" });
      }
      const googleKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || clientKey || "";
      const calcDistKm = (l1, n1, l2, n2) => {
        const R = 6371;
        const dLat = (l2 - l1) * Math.PI / 180;
        const dLon = (n2 - n1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(l1 * Math.PI / 180) * Math.cos(l2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
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
          const googleData = await googleRes.json();
          if (googleData.status === "OK" && Array.isArray(googleData.results) && googleData.results.length > 0) {
            let places = googleData.results.map((p) => {
              const photoRef = p.photos?.[0]?.photo_reference;
              const photoUrl = photoRef ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${photoRef}&key=${googleKey}` : null;
              const pLat = p.geometry?.location?.lat;
              const pLng = p.geometry?.location?.lng;
              const distanceKm = hasUserCoords && pLat !== void 0 && pLng !== void 0 ? calcDistKm(userLatNum, userLngNum, pLat, pLng) : void 0;
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
                photoUrl,
                source: "google_places",
                distanceKm
              };
            });
            if (hasUserCoords) {
              places.sort((a, b) => {
                if (a.distanceKm !== void 0 && b.distanceKm !== void 0) {
                  return a.distanceKm - b.distanceKm;
                }
                return 0;
              });
            }
            return res.json({ source: "google", places });
          }
        }
      }
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=10&addressdetails=1`;
      const nomRes = await fetch(nomUrl, {
        headers: {
          "User-Agent": "ViaCamperApp/2.0 (viacamperapp@gmail.com)"
        }
      });
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        let places = nomData.map((item) => {
          const pLat = parseFloat(item.lat);
          const pLng = parseFloat(item.lon);
          const distanceKm = hasUserCoords && !isNaN(pLat) && !isNaN(pLng) ? calcDistKm(userLatNum, userLngNum, pLat, pLng) : void 0;
          return {
            id: `osm-${item.place_id}`,
            place_id: String(item.place_id),
            name: item.display_name.split(",")[0] || "Localit\xE0",
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
          places.sort((a, b) => {
            if (a.distanceKm !== void 0 && b.distanceKm !== void 0) {
              return a.distanceKm - b.distanceKm;
            }
            return 0;
          });
        }
        return res.json({ source: "nominatim", places });
      }
      res.json({ source: "empty", places: [] });
    } catch (err) {
      console.error("Google Places proxy search error:", err);
      res.status(500).json({ error: err.message || "Search failed" });
    }
  });
  app2.get("/api/nominatim-reverse", async (req, res) => {
    try {
      const lat = req.query.lat;
      const lon = req.query.lon;
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
      } catch (e) {
        console.warn("[Proxy] Nominatim fetch failed, using fallback:", e);
      }
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
    } catch (err) {
      console.error("Nominatim reverse proxy error:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });
  const overpassCache = new globalThis.Map();
  const OVERPASS_CACHE_TTL = 24 * 60 * 60 * 1e3;
  const OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
  ];
  async function fetchSingleOverpass(url, bodyStr, timeoutMs = 6e3) {
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
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }
  app2.post("/api/map-data-proxy", async (req, res) => {
    try {
      const bodyStr = req.body.data || "";
      if (!bodyStr) {
        return res.status(400).json({ error: "Missing 'data' body field" });
      }
      console.log(`[Overpass Proxy] Received query: ${bodyStr.substring(0, 50)}...`);
      const now = Date.now();
      for (const [key, val] of overpassCache.entries()) {
        if (now - val.timestamp > OVERPASS_CACHE_TTL) {
          overpassCache.delete(key);
        }
      }
      if (overpassCache.has(bodyStr)) {
        const cached = overpassCache.get(bodyStr);
        if (now - cached.timestamp < OVERPASS_CACHE_TTL) {
          console.log(`[Overpass Proxy] Serving matching query from 24h cache \u{1F389}`);
          return res.json(cached.data);
        }
      }
      const shuffled = [...OVERPASS_SERVERS].sort(() => Math.random() - 0.5);
      let responseData = null;
      const batches = [
        [shuffled[0], shuffled[1]],
        [shuffled[2], shuffled[3]],
        [shuffled[4], shuffled[5]]
      ];
      for (const batch of batches) {
        try {
          responseData = await Promise.any(batch.map((url) => fetchSingleOverpass(url, bodyStr, 7e3)));
          if (responseData) break;
        } catch (_) {
        }
      }
      if (responseData) {
        overpassCache.set(bodyStr, { data: responseData, timestamp: Date.now() });
        return res.json(responseData);
      }
      if (overpassCache.has(bodyStr)) {
        console.log(`[Overpass Proxy] All mirrors busy, serving stale cache gracefully!`);
        return res.json(overpassCache.get(bodyStr).data);
      }
      console.log(`[Overpass Proxy] All Overpass mirrors busy and no cache available.`);
      return res.json({ elements: [] });
    } catch (err) {
      res.status(500).json({ error: err.message || "Unknown proxy error" });
    }
  });
  app2.get("/api/map-tile/:z/:x/:y", async (req, res) => {
    try {
      const { z, x, y } = req.params;
      const lyrs = req.query.lyrs || "m";
      const subdomains = ["mt0", "mt1", "mt2", "mt3"];
      let response = null;
      let lastError = null;
      const shuffledSubdomains = [...subdomains].sort(() => Math.random() - 0.5);
      for (const subdomain of shuffledSubdomains) {
        try {
          const targetUrl = `https://${subdomain}.google.com/vt/lyrs=${lyrs}&x=${x}&y=${y}&z=${z}`;
          response = await fetch(targetUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
            },
            signal: AbortSignal.timeout(4e3)
            // 4 seconds timeout per attempt
          });
          if (response && response.ok) {
            break;
          } else {
            lastError = new Error(response ? `Status ${response.status}` : "No response");
          }
        } catch (e) {
          lastError = e;
        }
      }
      if (!response || !response.ok) {
        throw lastError || new Error("Failed to fetch map tile after retrying all subdomains");
      }
      const contentType = response.headers.get("content-type") || "image/png";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    } catch (err) {
      console.warn("[Map Tile Proxy] Falling back to 1x1 transparent PNG due to fetch error:", err.message || err);
      const transparentPngBase64 = "iVBOR0w0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
      const buffer = Buffer.from(transparentPngBase64, "base64");
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(200).send(buffer);
    }
  });
  const osrmCache = /* @__PURE__ */ new Map();
  const brouterCache = /* @__PURE__ */ new Map();
  async function snapToRoad(coord, heading) {
    const bearingsQuery = heading !== void 0 && heading !== null && heading !== "" && !isNaN(Number(heading)) ? `&bearings=${Math.round((Number(heading) % 360 + 360) % 360)},45` : "";
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
          signal: AbortSignal.timeout(3e3)
          // 3.0s timeout for high performance but reliable snapping
        });
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        if (data.code === "Ok" && data.waypoints && data.waypoints[0]) {
          const loc = data.waypoints[0].location;
          return `${loc[0]},${loc[1]}`;
        }
        throw new Error("Invalid format");
      });
      return await Promise.any(fetchPromises);
    } catch (e) {
      if (bearingsQuery !== "") {
        return snapToRoad(coord, void 0);
      }
      console.log(`[OSRM Proxy] All parallel snapping servers returned busy/timeout for coord ${coord}. Using original.`);
      return coord;
    }
  }
  async function fetchBRouter(s, e, avoidHighways = "false", avoidTolls = "false", nogos) {
    const params = new URLSearchParams();
    params.append("lonlats", `${s}|${e}`);
    params.append("profile", "car-eco");
    params.append("format", "geojson");
    if (avoidHighways === "true") {
      params.append("avoid_motorways", "1");
    }
    if (avoidTolls === "true") {
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
      signal: AbortSignal.timeout(3e4)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[BRouter Proxy] BRouter error ${response.status}: ${errorText}`);
      throw new Error(`Failed to fetch from Brouter: status ${response.status}`);
    }
    const rawText = await response.text();
    try {
      return JSON.parse(rawText);
    } catch (e2) {
      console.error("[BRouter Proxy] Failed to parse BRouter JSON. Raw:", rawText.substring(0, 500));
      throw new Error("Failed to parse BRouter response as JSON");
    }
  }
  app2.get("/api/brouter", async (req, res) => {
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
      const [s, e] = [start, end];
      const data = await fetchBRouter(s, e, avoidHighways, avoidTolls, nogos);
      brouterCache.set(cacheKey, data);
      res.json(data);
    } catch (err) {
      console.error("Brouter proxy error:", err);
      res.status(502).json({ error: err.message || "Failed to fetch from Brouter" });
    }
  });
  app2.get("/api/osrm", async (req, res) => {
    try {
      const { start, end, heading, avoidHighways, avoidTolls } = req.query;
      if (!start || !end) {
        return res.status(400).json({ error: "Missing parameters start and/or end" });
      }
      const cacheKey = `${start}-${end}-${heading || ""}-${avoidHighways}-${avoidTolls}`;
      if (osrmCache.has(cacheKey)) {
        console.log(`[OSRM Proxy] Returning cached route for ${cacheKey}`);
        return res.json(osrmCache.get(cacheKey));
      }
      const convertBRouterToOSRM = (brouterData) => {
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
                coordinates,
                type: "LineString"
              },
              legs: [
                {
                  steps: [],
                  distance: trackLength,
                  duration: trackLength / 13
                  // approx 13 m/s (~50 km/h)
                }
              ],
              distance: trackLength,
              duration: trackLength / 13
            }
          ]
        };
      };
      const getRoute = async (s, e, h) => {
        const bearingsParam = h !== void 0 && h !== null && h !== "" && !isNaN(Number(h)) ? `&bearings=${Math.round((Number(h) % 360 + 360) % 360)},45;` : "";
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
              signal: AbortSignal.timeout(5e3)
              // Generous 5s timeout
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
        if (bearingsParam !== "") {
          console.log("[OSRM Proxy] Retrying route request without bearings constraint...");
          return getRoute(s, e, void 0);
        }
        throw new Error("All OSRM routing servers were busy");
      };
      console.log(`[OSRM Proxy] Snapping coordinates in parallel (heading: ${heading || "none"}): ${start} and ${end}`);
      const [snappedStart, snappedEnd] = await Promise.all([
        snapToRoad(start, heading),
        snapToRoad(end)
      ]);
      console.log(`[OSRM Proxy] Snapped coordinates: ${snappedStart} -> ${snappedEnd}`);
      let data;
      try {
        console.log(`[OSRM Proxy] Routing with snapped coordinates: ${snappedStart} -> ${snappedEnd}`);
        data = await getRoute(snappedStart, snappedEnd, heading);
      } catch (err) {
        console.log("[OSRM Proxy] Routing with snapped coordinates was unsuccessful. Retrying with original coordinates...");
        try {
          data = await getRoute(start, end, heading);
        } catch (retryErr) {
          console.log("[OSRM Proxy] All OSRM routing servers were busy. Fetching BRouter backup...");
          try {
            const brouterData = await fetchBRouter(start, end, avoidHighways, avoidTolls);
            data = convertBRouterToOSRM(brouterData);
            console.log("[OSRM Proxy] Successfully fell back to backend BRouter and converted to OSRM format.");
          } catch (brouterErr) {
            throw new Error("Failed to fetch route from both OSRM and BRouter");
          }
        }
      }
      osrmCache.set(cacheKey, data);
      res.json(data);
    } catch (err) {
      console.error("[OSRM Proxy] Final catch error:", err);
      res.status(502).json({ error: err.message || "Failed to fetch route" });
    }
  });
  const UPLOADS_DIR = import_path.default.join(process.cwd(), "uploads");
  if (!import_fs.default.existsSync(UPLOADS_DIR)) {
    import_fs.default.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app2.use("/uploads", import_express.default.static(UPLOADS_DIR));
  app2.use(import_express.default.static(import_path.default.join(process.cwd(), "public")));
  app2.post("/api/upload", async (req, res) => {
    try {
      const { name, base64, image, category } = req.body;
      const actualBase64 = base64 || image;
      if (!actualBase64) {
        return res.status(400).json({ error: "Nessun dato immagine fornito o caricato." });
      }
      const matches = actualBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let dataBuffer;
      let extension = "jpg";
      if (matches && matches.length === 3) {
        const type = matches[1];
        dataBuffer = Buffer.from(matches[2], "base64");
        if (type.includes("png")) {
          extension = "png";
        } else if (type.includes("webp")) {
          extension = "webp";
        } else if (type.includes("gif")) {
          extension = "gif";
        }
      } else {
        dataBuffer = Buffer.from(actualBase64, "base64");
      }
      if (dataBuffer.length > 20 * 1024 * 1024) {
        return res.status(400).json({ error: "L'immagine caricata supera il limite di 20 MB." });
      }
      if (category) {
        const publicDir = import_path.default.join(process.cwd(), "public");
        if (!import_fs.default.existsSync(publicDir)) {
          import_fs.default.mkdirSync(publicDir, { recursive: true });
        }
        const destPath = import_path.default.join(publicDir, `${category}.png`);
        let processedBuffer2 = dataBuffer;
        try {
          processedBuffer2 = await (0, import_sharp.default)(dataBuffer).resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9, quality: 75 }).toBuffer();
          console.log(`[Upload API] Sharp compressed from ${dataBuffer.length} to ${processedBuffer2.length} bytes for category default: ${category}.png`);
        } catch (sharpErr) {
          console.error("[Upload API] Sharp optimization failed for category. Saving original:", sharpErr);
        }
        import_fs.default.writeFileSync(destPath, processedBuffer2);
        const fileUrl2 = `/${category}.png`;
        console.log(`[Upload API] Permanent Category Image Saved: ${fileUrl2}`);
        return res.json({ success: true, url: fileUrl2 });
      }
      const cleanName = (name || "photo").replace(/[^a-zA-Z0-9.\-_]/g, "_").substring(0, 50);
      const fileExt = (cleanName.includes(".") ? cleanName.split(".").pop() : extension)?.toLowerCase() || "jpg";
      const fileName = `upload_${Date.now()}_${Math.floor(Math.random() * 1e5)}.${fileExt}`;
      const filePath = import_path.default.join(UPLOADS_DIR, fileName);
      let processedBuffer = dataBuffer;
      try {
        const sharpInstance = (0, import_sharp.default)(dataBuffer).resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true });
        if (fileExt === "png") {
          processedBuffer = await sharpInstance.png({ compressionLevel: 9, quality: 75 }).toBuffer();
        } else if (fileExt === "webp") {
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
          const { randomUUID } = require("crypto");
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
        const photoId = `photo_${Date.now()}_${Math.floor(Math.random() * 1e5)}`;
        const base64Data = processedBuffer.toString("base64");
        await firestoreDb.collection("shared_photos").doc(photoId).set({
          base64: base64Data,
          mimeType: `image/${fileExt}`
        });
        fileUrl = `/api/photos/${photoId}`;
        console.log(`[Upload API] Photo saved successfully to Firestore at: ${fileUrl}`);
      }
      res.json({ success: true, url: fileUrl });
    } catch (err) {
      console.error("Error in /api/upload:", err);
      res.status(500).json({ error: err.message || "Errore durante il salvataggio." });
    }
  });
  app2.get("/api/photos/:photoId", async (req, res) => {
    try {
      const doc2 = await firestoreDb.collection("shared_photos").doc(req.params.photoId).get();
      if (!doc2.exists) {
        return res.status(404).send("Image not found");
      }
      const data = doc2.data();
      const buffer = Buffer.from(data.base64, "base64");
      res.setHeader("Content-Type", data.mimeType || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=31536000");
      res.send(buffer);
    } catch (err) {
      console.error("Error in /api/photos GET:", err);
      res.status(500).send("Server Error");
    }
  });
  async function sendAdminNotificationEmail(subject, htmlContent) {
    const targetAdminEmail = process.env.ADMIN_EMAIL || "viacamperapp@gmail.com";
    console.log(`[Email Service] Preparing to send email to ${targetAdminEmail}: "${subject}"`);
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const res = await resend.emails.send({
          from: "ViaCamperApp <onboarding@resend.dev>",
          to: targetAdminEmail,
          subject,
          html: htmlContent
        });
        if (res?.error) {
          console.log(`[Email Service] Resend notice for ${targetAdminEmail}: ${res.error.message || "validation notice"}`);
          return { success: false, error: res.error };
        }
        console.log(`[Email Service] Email sent successfully via Resend to ${targetAdminEmail}:`, res.data);
        return { success: true, data: res.data };
      } catch (err) {
        console.error(`[Email Service] Failed to send email via Resend to ${targetAdminEmail}:`, err);
        return { success: false, error: err };
      }
    } else {
      console.warn(`[Email Service] RESEND_API_KEY non definita. Impossibile inviare email a ${targetAdminEmail} per: "${subject}". Imposta RESEND_API_KEY nelle variabili d'ambiente.`);
      return { success: false, reason: "RESEND_API_KEY missing" };
    }
  }
  app2.post("/api/notify-photo-submission", async (req, res) => {
    try {
      const {
        type = "concorso",
        // "concorso" | "area_sosta" | "proposta_sosta" | "generico"
        userName = "Utente ViaCamperApp",
        userEmail = "",
        title = "",
        placeName = "",
        location = "",
        imageUrl = "",
        caption = "",
        details = {}
      } = req.body;
      const labelType = type === "concorso" ? "\u{1F3C6} Concorso Foto Aree Sosta / Sfide" : type === "area_sosta" ? "\u{1F4CD} Nuova Foto Area di Sosta" : type === "proposta_sosta" ? "\u{1F195} Nuova Proposta Sosta con Foto" : "\u{1F4F8} Invio Foto Utente";
      const displayTitle = placeName || title || "Foto ViaCamperApp";
      const subject = `\u{1F4F8} Nuova foto ricevuta [${labelType}]: ${displayTitle}`;
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
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
      const targetAdminEmail = process.env.ADMIN_EMAIL || "viacamperapp@gmail.com";
      const isBase64 = imageUrl?.startsWith("data:");
      const imagePreviewHtml = imageUrl ? isBase64 ? `<div style="margin-top: 16px; text-align: center; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
               <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #475569;">Foto caricata dall'utente:</p>
               <img src="${imageUrl}" alt="Foto Utente" style="max-width: 100%; max-height: 420px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); object-fit: cover;" />
             </div>` : `<div style="margin-top: 16px; text-align: center; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
               <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #475569;">Foto caricata dall'utente:</p>
               <img src="${imageUrl}" alt="Foto Utente" style="max-width: 100%; max-height: 420px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); object-fit: cover;" />
               <p style="margin-top: 10px;"><a href="${imageUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background: #059669; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: bold;">Visualizza o scarica foto originale &rarr;</a></p>
             </div>` : `<p style="font-style: italic; color: #94a3b8;">(Nessun file immagine allegato)</p>`;
      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #f1f5f9; padding: 24px; border-radius: 18px;">
          <div style="background: linear-gradient(135deg, #1C3D2B 0%, #2D5A40 100%); padding: 20px 24px; border-radius: 14px; color: #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.15);">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #a7f3d0; margin-bottom: 4px;">ViaCamperApp \u2022 Notifica Amministratore</div>
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
                <td style="padding: 8px 0;"><strong>${userName}</strong> ${userEmail ? `<span style="color: #64748b;">(&lt;${userEmail}&gt;)</span>` : ""}</td>
              </tr>
              ${location ? `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Localit\xE0 / Luogo:</td>
                <td style="padding: 8px 0;">${location}</td>
              </tr>` : ""}
              ${caption ? `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Note / Descrizione:</td>
                <td style="padding: 8px 0; font-style: italic; color: #1e293b;">"${caption}"</td>
              </tr>` : ""}
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Data di invio:</td>
                <td style="padding: 8px 0;">${(/* @__PURE__ */ new Date()).toLocaleString("it-IT")}</td>
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
      const emailRes = await sendAdminNotificationEmail(subject, htmlContent);
      return res.json({
        success: true,
        message: "Notifica foto elaborata ed email inviata all'amministratore.",
        emailSent: emailRes.success
      });
    } catch (err) {
      console.error("Error in /api/notify-photo-submission:", err);
      return res.status(500).json({ error: err.message || "Errore durante l'invio della notifica foto." });
    }
  });
  app2.post("/api/feedback", (req, res) => {
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
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      list.push(newFeedback);
      saveFeedbacks(list);
      console.log(`[Feedback API] New feedback received: ${newFeedback.category} from ${newFeedback.name}`);
      res.json({ success: true, feedback: newFeedback });
    } catch (err) {
      console.error("Error submitting feedback:", err);
      res.status(500).json({ error: err.message || "Errore interno." });
    }
  });
  app2.get("/api/admin/feedbacks", (req, res) => {
    try {
      const list = loadFeedbacks();
      res.json(list);
    } catch (err) {
      console.error("Error loading feedbacks:", err);
      res.status(500).json({ error: err.message || "Errore interno." });
    }
  });
  app2.get("/api/admin/notifications", async (req, res) => {
    try {
      let snapshot;
      try {
        snapshot = await firestoreDb.collection("adminNotifications").orderBy("timestamp", "desc").get();
      } catch (err) {
        console.warn("Failed to fetch admin notifications with orderBy, falling back to unordered get:", err);
        snapshot = await firestoreDb.collection("adminNotifications").get();
      }
      const notifications = [];
      snapshot.forEach((doc2) => {
        notifications.push({ id: doc2.id, ...doc2.data() });
      });
      notifications.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      res.json(notifications);
    } catch (err) {
      console.error("Error loading admin notifications:", err);
      res.json([]);
    }
  });
  app2.post("/api/report-crash", async (req, res) => {
    try {
      const { message, stack, componentStack, userEmail, url, userAgent, appVersion } = req.body || {};
      if (!message) {
        return res.status(400).json({ error: "Messaggio errore obbligatorio" });
      }
      const report = {
        message: String(message).slice(0, 1e3),
        stack: stack ? String(stack).slice(0, 4e3) : "",
        componentStack: componentStack ? String(componentStack).slice(0, 4e3) : "",
        userEmail: userEmail ? String(userEmail).slice(0, 100) : "Anonimo",
        url: url ? String(url).slice(0, 300) : "",
        userAgent: userAgent ? String(userAgent).slice(0, 300) : "",
        appVersion: appVersion || "1.0.0",
        status: "open",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      console.error("[CRASH REPORT RECEIVED]", report.message, "| User:", report.userEmail);
      let docId = "crash-" + Date.now();
      try {
        const added = await firestoreDb.collection("crashReports").add(report);
        docId = added.id;
      } catch (fsErr) {
        console.warn("[Crash API] Firestore write failed, logged to console:", fsErr);
      }
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          const targetAdminEmail = process.env.ADMIN_EMAIL || "viacamperapp@gmail.com";
          resend.emails.send({
            from: "ViaCamperApp <onboarding@resend.dev>",
            to: targetAdminEmail,
            subject: `\u{1F6A8} ViaCamper: Nuovo Crash Log [${report.userEmail}]`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; background: #fff1f2; border-radius: 12px; border: 1px solid #fecdd3;">
                <h2 style="color: #9f1239; margin-top: 0;">\u{1F6A8} Segnalazione Crash / Errore Runtime</h2>
                <p><strong>Utente:</strong> ${report.userEmail}</p>
                <p><strong>Errore:</strong> ${report.message}</p>
                <p><strong>Pagina/URL:</strong> ${report.url}</p>
                <p><strong>Data/Ora:</strong> ${report.timestamp}</p>
                <pre style="background: #1e293b; color: #f8fafc; padding: 12px; border-radius: 8px; font-size: 11px; overflow-x: auto;">${report.stack || "Nessuno stack trace"}</pre>
                <p style="font-size: 12px; color: #475569;">Puoi gestire questo crash log direttamente dal Pannello Moderatore in ViaCamperApp sotto <strong>Crash & Logs</strong>.</p>
              </div>
            `
          }).then((res2) => {
            console.log("[Crash API] Email alert sent successfully to:", targetAdminEmail);
          }).catch((e) => {
            console.warn("[Crash API] Failed to send email alert in promise:", e);
          });
        } catch (e) {
          console.warn("[Crash API] Failed to setup email alert:", e);
        }
      }
      res.json({ success: true, id: docId });
    } catch (err) {
      console.error("Error saving crash report:", err);
      res.status(500).json({ error: "Errore durante il salvataggio del report." });
    }
  });
  app2.get("/api/admin/crash-reports", async (req, res) => {
    try {
      let snapshot;
      try {
        snapshot = await firestoreDb.collection("crashReports").orderBy("timestamp", "desc").get();
      } catch (e) {
        snapshot = await firestoreDb.collection("crashReports").get();
      }
      const reports = [];
      snapshot.forEach((doc2) => {
        reports.push({ id: doc2.id, ...doc2.data() });
      });
      reports.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      res.json(reports);
    } catch (err) {
      console.error("Error fetching crash reports:", err);
      res.json([]);
    }
  });
  app2.delete("/api/admin/crash-reports/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (id) {
        await firestoreDb.collection("crashReports").doc(id).delete();
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting crash report:", err);
      if (err.message && err.message.includes("RESOURCE_EXHAUSTED")) {
        res.status(429).json({ error: "Limite quota giornaliera raggiunto. Riprova domani." });
      } else {
        res.status(500).json({ error: "Errore eliminazione." });
      }
    }
  });
  app2.post("/api/admin/crash-reports/clear-all", async (req, res) => {
    try {
      const snapshot = await firestoreDb.collection("crashReports").get();
      const batch = firestoreDb.batch();
      snapshot.forEach((doc2) => {
        batch.delete(doc2.ref);
      });
      await batch.commit();
      res.json({ success: true });
    } catch (err) {
      console.error("Error clearing all crash reports:", err);
      if (err.message && err.message.includes("RESOURCE_EXHAUSTED")) {
        res.status(429).json({ error: "Limite quota giornaliera raggiunto. Riprova domani." });
      } else {
        res.status(500).json({ error: "Errore pulizia crash log." });
      }
    }
  });
  app2.post("/api/admin/reply-feedback", (req, res) => {
    try {
      const { id, reply } = req.body;
      if (!id || !reply) {
        return res.status(400).json({ error: "ID e risposta sono obbligatori." });
      }
      const list = loadFeedbacks();
      const feedback = list.find((f) => f.id === id);
      if (!feedback) {
        return res.status(404).json({ error: "Segnalazione/suggerimento non trovato." });
      }
      feedback.reply = reply;
      feedback.repliedAt = (/* @__PURE__ */ new Date()).toISOString();
      saveFeedbacks(list);
      console.log(`[Feedback API] Replied to feedback: ${id}`);
      res.json({ success: true, feedback });
    } catch (err) {
      console.error("Error replying to feedback:", err);
      res.status(500).json({ error: err.message || "Errore interno." });
    }
  });
  app2.post("/api/propose-community-itinerary", async (req, res) => {
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
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
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
      try {
        await firestoreDb.collection("community_itineraries").doc(itineraryId).set(removeUndefined(newItinerary));
      } catch (fsErr) {
        console.warn("[Community Itineraries API] Firestore write warning:", fsErr);
      }
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
        await notifyModerators("itineraries", "Nuovo Itinerario Proposto", `Un nuovo itinerario \xE8 in attesa di approvazione: ${title}`, { itineraryId });
      } catch (err) {
        console.warn("[Community Itineraries API] Could not write admin notification:", err);
      }
      const subject = `\u{1F5FA}\uFE0F Nuovo Itinerario Proposto da ${authorName}: "${title}"`;
      const htmlEmail = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; background: #f8fafc; padding: 24px; border-radius: 16px;">
          <div style="background: linear-gradient(135deg, #1C3D2B 0%, #3E4A35 100%); padding: 20px 24px; border-radius: 12px; color: #ffffff;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #a7f3d0; margin-bottom: 4px;">ViaCamperApp \u2022 Moderazione Itinerari</div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff;">\u{1F5FA}\uFE0F Nuovo Itinerario Proposto dalla Community</h2>
          </div>
          <div style="background: #ffffff; padding: 24px; border-radius: 12px; margin-top: 16px; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; color: #0f172a; font-size: 18px; font-weight: 800;">${title}</h3>
            <p style="color: #475569; font-size: 14px; line-height: 1.5;">${description}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
            <table style="width: 100%; font-size: 13px; color: #334155;">
              <tr><td style="padding: 4px 0; font-weight: bold; width: 130px;">Inviato da:</td><td>${authorName} ${authorEmail ? `(&lt;${authorEmail}&gt;)` : ""}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold;">Durata:</td><td>${durationDays} Giorni</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold;">Partenza & Arrivo:</td><td>${startLocation || "N/D"} \u2794 ${endLocation || "N/D"}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold;">Tappe principali:</td><td>${Array.isArray(waypoints) ? waypoints.join(", ") : "N/D"}</td></tr>
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
      const adminEmailForItin = process.env.ADMIN_EMAIL || "viacamperapp@gmail.com";
      if (adminEmailForItin) {
        sendPushNotification(
          adminEmailForItin,
          `\u{1F5FA}\uFE0F Nuovo itinerario proposto!`,
          `L'utente ${authorName} ha proposto l'itinerario "${title}".`,
          { type: "new_itinerary", itineraryId }
        ).catch((err) => console.error("[FCM Push] Failed to notify admin of new itinerary:", err));
      }
      res.json({ success: true, id: itineraryId, message: "Itinerario inviato per la moderazione con successo!" });
    } catch (err) {
      console.error("Error proposing community itinerary:", err);
      res.status(500).json({ error: err.message || "Errore durante l'invio dell'itinerario." });
    }
  });
  app2.get("/api/community-itineraries", async (req, res) => {
    try {
      const includePending = req.query.includePending === "true";
      const snapshot = await firestoreDb.collection("community_itineraries").get();
      const list = [];
      snapshot.forEach((doc2) => {
        const data = doc2.data();
        if (includePending || data.status === "approved") {
          list.push(data);
        }
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      res.json({ success: true, itineraries: list });
    } catch (err) {
      console.error("Error fetching community itineraries:", err);
      res.status(500).json({ error: err.message || "Errore durante il recupero degli itinerari." });
    }
  });
  app2.post("/api/admin/approve-community-itinerary", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "ID itinerario mancante." });
      const docRef = firestoreDb.collection("community_itineraries").doc(id);
      const docSnap = await docRef.get();
      await docRef.update({
        status: "approved",
        approvedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log(`[Community Itineraries API] Approved itinerary: ${id}`);
      if (docSnap.exists) {
        const authorEmail = docSnap.data()?.authorEmail;
        if (authorEmail) {
          sendPushNotification(
            authorEmail,
            `\u{1F5FA}\uFE0F Itinerario Approvato!`,
            `Il tuo itinerario "${docSnap.data().title}" \xE8 stato approvato ed \xE8 ora pubblicato nella Community!`,
            { type: "itinerary_approved", itineraryId: id }
          ).catch((err) => console.error("[FCM Push] Failed to notify user of itinerary approval:", err));
        }
      }
      res.json({ success: true, message: "Itinerario approvato e pubblicato nella Community!" });
    } catch (err) {
      console.error("Error approving itinerary:", err);
      res.status(500).json({ error: err.message || "Errore durante l'approvazione dell'itinerario." });
    }
  });
  app2.post("/api/admin/reject-community-itinerary", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "ID itinerario mancante." });
      await firestoreDb.collection("community_itineraries").doc(id).delete();
      console.log(`[Community Itineraries API] Rejected and deleted itinerary: ${id}`);
      res.json({ success: true, message: "Itinerario rifiutato ed eliminato." });
    } catch (err) {
      console.error("Error rejecting itinerary:", err);
      res.status(500).json({ error: err.message || "Errore durante il rifiuto dell'itinerario." });
    }
  });
  try {
    const rootDir = process.cwd();
    const publicDir = import_path.default.join(rootDir, "public");
    if (!import_fs.default.existsSync(publicDir)) {
      import_fs.default.mkdirSync(publicDir, { recursive: true });
    }
    const scanAndCopy = (dir) => {
      const items = import_fs.default.readdirSync(dir);
      for (const item of items) {
        if (item === "node_modules" || item === ".git" || item === "dist" || item === "public") continue;
        const fullPath = import_path.default.join(dir, item);
        let stat;
        try {
          stat = import_fs.default.statSync(fullPath);
        } catch (e) {
          continue;
        }
        if (item.includes("\\") || item.includes("public\\")) {
          const nameClean = item.split("\\").pop() || "";
          if (nameClean.endsWith(".png") || nameClean.endsWith(".svg") || nameClean.endsWith(".webp") || nameClean.endsWith(".jpg") || nameClean.endsWith(".jpeg")) {
            const destPath = import_path.default.join(publicDir, nameClean);
            const size = stat.size;
            if (size > 0 && (!import_fs.default.existsSync(destPath) || import_fs.default.statSync(destPath).size === 0)) {
              import_fs.default.copyFileSync(fullPath, destPath);
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
  app2.post("/api/admin/trigger-promo-test", async (req, res) => {
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
    } catch (err) {
      console.error("[Promo Push Test] Error sending manual test:", err);
      res.status(500).json({ error: "Errore durante l'invio del push di test.", details: err.message });
    }
  });
  app2.get("/api/push-simulation/latest", (req, res) => {
    res.json(latestPromoPushInMemory);
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true, hmr: false },
      appType: "spa"
    });
    app2.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app2.use(import_express.default.static(distPath));
    app2.use(import_express.default.static(import_path.default.join(process.cwd(), "public")));
    app2.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
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
      for (const doc2 of snapshot.docs) {
        const data = doc2.data();
        if (fakeNames.includes(data.name) || fakeNames.includes(data.roadName)) {
          await doc2.ref.delete();
          count++;
        }
      }
      if (count > 0) console.log(`[Cleanup] Deleted ${count} fake places from database.`);
    } catch (e) {
      console.error("[Cleanup] Error deleting fake places:", e);
    }
  }
  app2.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    cleanupFakePlaces().catch(console.error);
    console.log("[Promo Push] Initializing automatic promotional push scheduler...");
    setTimeout(() => {
      console.log("[Promo Push] Running initial boot-time promo push check...");
      checkAndSendPromotionalPush().catch(console.error);
    }, 15e3);
    setInterval(() => {
      console.log("[Promo Push] Running periodic hourly promo push check...");
      checkAndSendPromotionalPush().catch(console.error);
    }, 36e5);
  });
}
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
