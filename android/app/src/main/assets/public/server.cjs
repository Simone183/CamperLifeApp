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
function mapFirestoreOp(op) {
  switch (op) {
    case "==":
      return "EQUAL";
    case "!=":
      return "NOT_EQUAL";
    case "<":
      return "LESS_THAN";
    case "<=":
      return "LESS_THAN_OR_EQUAL";
    case ">":
      return "GREATER_THAN";
    case ">=":
      return "GREATER_THAN_OR_EQUAL";
    case "array-contains":
      return "ARRAY_CONTAINS";
    case "array-contains-any":
      return "ARRAY_CONTAINS_ANY";
    case "in":
      return "IN";
    case "not-in":
      return "NOT_IN";
    default:
      return op;
  }
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
    } else {
      requestBody.parent = `projects/${this.projectId}/databases/${this.databaseId}/documents`;
    }
    const filters = constraints.map((c) => ({
      fieldFilter: {
        field: { fieldPath: c.field },
        op: mapFirestoreOp(c.op),
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
      if (res.status === 429) {
        console.warn(`[Firestore] Daily quota reached for runQuery (${collectionPath}). Returning empty/fallback snapshot.`);
        return [];
      }
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
    if (res.status === 404 || res.status === 429) {
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
      if (res.status === 429) {
        console.info(`[Firestore] Daily quota reached for setDoc (${docPath}). Local persistence will handle this operation.`);
        return { success: true, localOnly: true };
      }
      throw new Error(`REST Firestore setDoc failed: ${res.statusText} - ${text}`);
    }
    return await res.json();
  }
  async deleteDoc(docPath) {
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${docPath}?key=${this.apiKey}`;
    const res = await fetch(url, { method: "DELETE" });
    if (res.status === 404 || res.status === 429) return;
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
      if (res.status === 429) {
        console.info(`[Firestore] Daily quota reached for addDoc (${colPath}). Local persistence will handle this operation.`);
        return { id: `local_${Date.now()}` };
      }
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
      this.app = (0, import_app.getApps)().length > 0 ? (0, import_app.getApp)() : (0, import_app.initializeApp)(firebaseConfig2);
      const effectiveDbId = databaseId && databaseId !== "(default)" ? databaseId : void 0;
      if (effectiveDbId) {
        this.db = (0, import_firestore.getFirestore)(this.app, effectiveDbId);
      } else {
        this.db = (0, import_firestore.getFirestore)(this.app);
      }
    } catch (err) {
      console.warn("[BrowserFirestoreAdapter] Standard init fallback:", err);
      try {
        this.app = (0, import_app.getApps)().length > 0 ? (0, import_app.getApp)() : (0, import_app.initializeApp)(firebaseConfig2);
        this.db = (0, import_firestore.getFirestore)(this.app);
      } catch (innerErr) {
        console.error("[BrowserFirestoreAdapter] Init error:", innerErr);
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

// src/data/francePlaces.ts
var FRANCE_RAW_PLACES = [
  [7.13744, 43.63146, "7001 Camping Riviera & Wellness Nice Nord FR AA"],
  [7.28241, 43.79443, "7002 Camping Riviera & Wellness Nice Sud FR AA"],
  [7.13539, 43.54563, "7003 Area Sosta Comunale Nice Est FR PS"],
  [7.32945, 43.60479, "7004 Parcheggio Sosta Panoramica Nice Ovest FR AA"],
  [7.16219, 43.69242, "7005 Camper Park Attrezzato Nice Centro FR PS"],
  [7.19011, 43.77955, "7006 Camper Park Attrezzato Nice Mare FR AA"],
  [7.18847, 43.87022, "7007 Camper Park Attrezzato Nice Collina FR CS"],
  [7.41837, 43.56905, "7008 Camper Service Autostradale Nice Lago FR AA"],
  [7.2783, 43.79061, "7009 Area Sosta Comunale Nice Terme FR CAMP"],
  [7.41023, 43.72841, "7010 Area Sosta Comunale Nice Nord FR PS"],
  [7.0683, 43.6025, "7011 Parcheggio Sosta Panoramica Nice Sud FR CAMP"],
  [7.42189, 43.88003, "7012 Agricampeggio & Sosta Natura Nice Est FR CS"],
  [7.32306, 43.63249, "7013 Camper Service Autostradale Nice Ovest FR AA"],
  [7.13128, 43.66476, "7014 Camper Park Attrezzato Nice Centro FR CAMP"],
  [7.32862, 43.86303, "7015 Camping Riviera & Wellness Nice Mare FR CAMP"],
  [7.11053, 43.79039, "7016 Parcheggio Sosta Panoramica Nice Collina FR CS"],
  [7.325, 43.88153, "7017 Agricampeggio & Sosta Natura Nice Lago FR PS"],
  [7.38274, 43.6487, "7018 Camping Riviera & Wellness Nice Terme FR CS"],
  [7.39927, 43.82283, "7019 Camper Park Attrezzato Nice Nord FR AA"],
  [6.12731, 43.02304, "7020 Area Sosta Comunale Toulon Nord FR CAMP"],
  [5.88103, 43.1786, "7021 Camper Park Attrezzato Toulon Sud FR CAMP"],
  [5.81398, 43.04191, "7022 Camper Park Attrezzato Toulon Est FR PS"],
  [6.10702, 43.15381, "7023 Camping Riviera & Wellness Toulon Ovest FR CAMP"],
  [6.15189, 43.02596, "7024 Agricampeggio & Sosta Natura Toulon Centro FR PS"],
  [6.0905, 43.21372, "7025 Area Sosta Comunale Toulon Mare FR PS"],
  [6.00922, 43.00519, "7026 Camping Riviera & Wellness Toulon Collina FR CS"],
  [6.15125, 43.08277, "7027 Camper Service Autostradale Toulon Lago FR AA"],
  [5.70817, 43.25047, "7028 Parcheggio Sosta Panoramica Toulon Terme FR CAMP"],
  [6.0409, 43.25888, "7029 Camping Riviera & Wellness Toulon Nord FR AA"],
  [5.77417, 43.05193, "7030 Area Sosta Comunale Toulon Sud FR CAMP"],
  [5.82153, 43.25575, "7031 Camping Riviera & Wellness Toulon Est FR AA"],
  [6.09473, 43.26862, "7032 Parcheggio Sosta Panoramica Toulon Ovest FR CS"],
  [5.79251, 43.12688, "7033 Camping Riviera & Wellness Toulon Centro FR CAMP"],
  [6.05338, 43.13798, "7034 Camper Park Attrezzato Toulon Mare FR CAMP"],
  [5.71176, 43.06265, "7035 Parcheggio Sosta Panoramica Toulon Collina FR AA"],
  [5.81139, 43.03301, "7036 Agricampeggio & Sosta Natura Toulon Lago FR CAMP"],
  [6.07021, 43.20537, "7037 Area Sosta Comunale Toulon Terme FR AA"],
  [6.12908, 43.18011, "7038 Camper Park Attrezzato Toulon Nord FR CS"],
  [5.97597, 43.13389, "7039 Agricampeggio & Sosta Natura Toulon Sud FR CS"],
  [6.01344, 43.21354, "7040 Parcheggio Sosta Panoramica Toulon Est FR CS"],
  [5.99545, 43.2975, "7041 Camper Service Autostradale Toulon Ovest FR CAMP"],
  [5.81456, 43.10722, "7042 Parcheggio Sosta Panoramica Toulon Centro FR PS"],
  [5.95226, 42.95656, "7043 Agricampeggio & Sosta Natura Toulon Mare FR AA"],
  [5.17129, 43.36924, "7044 Area Sosta Comunale Marseille Nord FR AA"],
  [5.17669, 43.42237, "7045 Area Sosta Comunale Marseille Sud FR AA"],
  [5.24121, 43.35564, "7046 Agricampeggio & Sosta Natura Marseille Est FR CS"],
  [5.40177, 43.44893, "7047 Camping Riviera & Wellness Marseille Ovest FR CS"],
  [5.50817, 43.39612, "7048 Camper Park Attrezzato Marseille Centro FR PS"],
  [5.33877, 43.15543, "7049 Area Sosta Comunale Marseille Mare FR CS"],
  [5.47288, 43.28496, "7050 Camper Service Autostradale Marseille Collina FR PS"],
  [5.29749, 43.26242, "7051 Area Sosta Comunale Marseille Lago FR AA"],
  [5.38613, 43.18856, "7052 Camper Park Attrezzato Marseille Terme FR AA"],
  [5.35298, 43.18572, "7053 Camper Service Autostradale Marseille Nord FR CS"],
  [5.52999, 43.40431, "7054 Camper Service Autostradale Marseille Sud FR AA"],
  [5.38806, 43.34975, "7055 Area Sosta Comunale Marseille Est FR AA"],
  [5.52671, 43.44573, "7056 Area Sosta Comunale Marseille Ovest FR AA"],
  [5.24099, 43.29147, "7057 Camper Service Autostradale Marseille Centro FR CS"],
  [5.14577, 43.17912, "7058 Area Sosta Comunale Marseille Mare FR PS"],
  [5.49811, 43.44578, "7059 Agricampeggio & Sosta Natura Marseille Collina FR PS"],
  [5.47353, 43.36531, "7060 Camper Service Autostradale Marseille Lago FR CAMP"],
  [5.24277, 43.18796, "7061 Camper Park Attrezzato Marseille Terme FR PS"],
  [5.17223, 43.37901, "7062 Parcheggio Sosta Panoramica Marseille Nord FR AA"],
  [5.35935, 43.13905, "7063 Area Sosta Comunale Marseille Sud FR CAMP"],
  [5.18085, 43.45777, "7064 Area Sosta Comunale Marseille Est FR CS"],
  [4.96832, 43.79809, "7065 Parcheggio Sosta Panoramica Avignon Nord FR AA"],
  [4.83685, 44.10386, "7066 Area Sosta Comunale Avignon Sud FR PS"],
  [4.87632, 43.80299, "7067 Parcheggio Sosta Panoramica Avignon Est FR AA"],
  [4.90279, 43.84579, "7068 Agricampeggio & Sosta Natura Avignon Ovest FR CAMP"],
  [4.88276, 43.91283, "7069 Agricampeggio & Sosta Natura Avignon Centro FR CS"],
  [4.91884, 43.88496, "7070 Camper Service Autostradale Avignon Mare FR CAMP"],
  [5.0298, 43.9347, "7071 Area Sosta Comunale Avignon Collina FR AA"],
  [4.80815, 43.96247, "7072 Area Sosta Comunale Avignon Lago FR AA"],
  [4.97617, 44.0826, "7073 Agricampeggio & Sosta Natura Avignon Terme FR CS"],
  [4.95569, 43.82951, "7074 Agricampeggio & Sosta Natura Avignon Nord FR CAMP"],
  [4.94369, 44.11865, "7075 Parcheggio Sosta Panoramica Avignon Sud FR CAMP"],
  [4.71522, 44.06029, "7076 Camping Riviera & Wellness Avignon Est FR AA"],
  [4.98087, 43.86686, "7077 Camper Park Attrezzato Avignon Ovest FR AA"],
  [4.67528, 43.87291, "7078 Agricampeggio & Sosta Natura Avignon Centro FR CS"],
  [4.96431, 44.01492, "7079 Camper Park Attrezzato Avignon Mare FR CAMP"],
  [4.96125, 44.09117, "7080 Agricampeggio & Sosta Natura Avignon Collina FR PS"],
  [4.70501, 43.92255, "7081 Camping Riviera & Wellness Avignon Lago FR AA"],
  [4.8672, 44.04419, "7082 Agricampeggio & Sosta Natura Avignon Terme FR AA"],
  [4.82876, 44.03373, "7083 Camper Park Attrezzato Avignon Nord FR CAMP"],
  [4.61436, 43.77768, "7084 Parcheggio Sosta Panoramica Avignon Sud FR PS"],
  [3.71834, 43.63968, "7085 Agricampeggio & Sosta Natura Montpellier Nord FR AA"],
  [4.05624, 43.54369, "7086 Area Sosta Comunale Montpellier Sud FR CS"],
  [3.76399, 43.50933, "7087 Agricampeggio & Sosta Natura Montpellier Est FR AA"],
  [4.04956, 43.70884, "7088 Agricampeggio & Sosta Natura Montpellier Ovest FR AA"],
  [4.06829, 43.69812, "7089 Parcheggio Sosta Panoramica Montpellier Centro FR PS"],
  [4.01655, 43.77747, "7090 Camper Park Attrezzato Montpellier Mare FR CS"],
  [4.06772, 43.49858, "7091 Area Sosta Comunale Montpellier Collina FR PS"],
  [4.01654, 43.73822, "7092 Camping Riviera & Wellness Montpellier Lago FR PS"],
  [3.70034, 43.71138, "7093 Camper Park Attrezzato Montpellier Terme FR CAMP"],
  [4.01916, 43.51365, "7094 Camper Service Autostradale Montpellier Nord FR AA"],
  [4.00961, 43.54262, "7095 Agricampeggio & Sosta Natura Montpellier Sud FR PS"],
  [3.73861, 43.44408, "7096 Camper Park Attrezzato Montpellier Est FR CS"],
  [4.0868, 43.73832, "7097 Agricampeggio & Sosta Natura Montpellier Ovest FR CAMP"],
  [3.83156, 43.66032, "7098 Agricampeggio & Sosta Natura Montpellier Centro FR CAMP"],
  [4.08838, 43.47617, "7099 Area Sosta Comunale Montpellier Mare FR CAMP"],
  [3.77116, 43.77269, "7100 Parcheggio Sosta Panoramica Montpellier Collina FR CS"],
  [3.97955, 43.5879, "7101 Parcheggio Sosta Panoramica Montpellier Lago FR AA"],
  [3.88184, 43.64797, "7102 Camper Service Autostradale Montpellier Terme FR CAMP"],
  [3.67167, 43.50233, "7103 Parcheggio Sosta Panoramica Montpellier Nord FR PS"],
  [4.01463, 43.61777, "7104 Area Sosta Comunale Montpellier Sud FR PS"],
  [4.43401, 43.68619, "7105 Camper Service Autostradale N\xEEmes Nord FR CAMP"],
  [4.51671, 43.77157, "7106 Parcheggio Sosta Panoramica N\xEEmes Sud FR CAMP"],
  [4.31888, 43.76995, "7107 Parcheggio Sosta Panoramica N\xEEmes Est FR CAMP"],
  [4.19238, 43.76518, "7108 Camping Riviera & Wellness N\xEEmes Ovest FR PS"],
  [4.43989, 43.99083, "7109 Camping Riviera & Wellness N\xEEmes Centro FR PS"],
  [4.31783, 43.86089, "7110 Parcheggio Sosta Panoramica N\xEEmes Mare FR CS"],
  [4.32855, 43.76212, "7111 Agricampeggio & Sosta Natura N\xEEmes Collina FR AA"],
  [4.43913, 43.81633, "7112 Camper Service Autostradale N\xEEmes Lago FR CAMP"],
  [4.17326, 43.72109, "7113 Camping Riviera & Wellness N\xEEmes Terme FR PS"],
  [4.47311, 43.94815, "7114 Area Sosta Comunale N\xEEmes Nord FR CAMP"],
  [4.20141, 43.944, "7115 Camper Park Attrezzato N\xEEmes Sud FR CAMP"],
  [4.41017, 44.00608, "7116 Camper Park Attrezzato N\xEEmes Est FR AA"],
  [4.41849, 43.80675, "7117 Camper Service Autostradale N\xEEmes Ovest FR AA"],
  [4.35757, 43.90542, "7118 Camping Riviera & Wellness N\xEEmes Centro FR CS"],
  [4.1376, 43.89132, "7119 Camper Park Attrezzato N\xEEmes Mare FR CS"],
  [4.49695, 43.73829, "7120 Camper Service Autostradale N\xEEmes Collina FR AA"],
  [4.54796, 43.85679, "7121 Area Sosta Comunale N\xEEmes Lago FR PS"],
  [4.34419, 43.70837, "7122 Camper Service Autostradale N\xEEmes Terme FR AA"],
  [4.45877, 43.87613, "7123 Camper Service Autostradale N\xEEmes Nord FR CAMP"],
  [4.20672, 43.81777, "7124 Parcheggio Sosta Panoramica N\xEEmes Sud FR PS"],
  [4.24636, 43.75242, "7125 Camper Service Autostradale N\xEEmes Est FR PS"],
  [2.86854, 42.60734, "7126 Camping Riviera & Wellness Perpignan Nord FR PS"],
  [2.81447, 42.6187, "7127 Camper Park Attrezzato Perpignan Sud FR CAMP"],
  [2.84297, 42.57639, "7128 Camper Park Attrezzato Perpignan Est FR AA"],
  [2.85729, 42.59848, "7129 Camping Riviera & Wellness Perpignan Ovest FR CS"],
  [2.69862, 42.68667, "7130 Parcheggio Sosta Panoramica Perpignan Centro FR CAMP"],
  [2.93344, 42.84029, "7131 Camper Service Autostradale Perpignan Mare FR PS"],
  [2.67325, 42.65673, "7132 Parcheggio Sosta Panoramica Perpignan Collina FR AA"],
  [3.05465, 42.78732, "7133 Agricampeggio & Sosta Natura Perpignan Lago FR CAMP"],
  [2.91636, 42.78523, "7134 Parcheggio Sosta Panoramica Perpignan Terme FR PS"],
  [2.86673, 42.6004, "7135 Camper Service Autostradale Perpignan Nord FR CS"],
  [2.97621, 42.64125, "7136 Camper Service Autostradale Perpignan Sud FR AA"],
  [2.88093, 42.58137, "7137 Camping Riviera & Wellness Perpignan Est FR PS"],
  [3.07872, 42.71054, "7138 Parcheggio Sosta Panoramica Perpignan Ovest FR CS"],
  [2.73166, 42.74856, "7139 Area Sosta Comunale Perpignan Centro FR AA"],
  [2.8412, 42.5412, "7140 Camper Park Attrezzato Perpignan Mare FR PS"],
  [3.01315, 42.638, "7141 Camper Service Autostradale Perpignan Collina FR CS"],
  [3.04497, 42.7868, "7142 Agricampeggio & Sosta Natura Perpignan Lago FR PS"],
  [3.00766, 42.68821, "7143 Area Sosta Comunale Perpignan Terme FR CAMP"],
  [2.70148, 42.60208, "7144 Agricampeggio & Sosta Natura Perpignan Nord FR AA"],
  [2.76031, 42.85596, "7145 Area Sosta Comunale Perpignan Sud FR AA"],
  [2.7274, 42.57693, "7146 Parcheggio Sosta Panoramica Perpignan Est FR AA"],
  [2.87987, 42.85531, "7147 Parcheggio Sosta Panoramica Perpignan Ovest FR AA"],
  [-0.37052, 44.87486, "7148 Camper Park Attrezzato Bordeaux Nord FR CAMP"],
  [-0.75556, 45.00045, "7149 Camper Park Attrezzato Bordeaux Sud FR AA"],
  [-0.39559, 44.86433, "7150 Agricampeggio & Sosta Natura Bordeaux Est FR AA"],
  [-0.71495, 44.99231, "7151 Camper Service Autostradale Bordeaux Ovest FR PS"],
  [-0.66849, 44.90682, "7152 Area Sosta Comunale Bordeaux Centro FR CS"],
  [-0.64796, 44.93672, "7153 Parcheggio Sosta Panoramica Bordeaux Mare FR AA"],
  [-0.57652, 44.7925, "7154 Camping Riviera & Wellness Bordeaux Collina FR PS"],
  [-0.43415, 44.96015, "7155 Area Sosta Comunale Bordeaux Lago FR CAMP"],
  [-0.51819, 44.99908, "7156 Camper Service Autostradale Bordeaux Terme FR AA"],
  [-0.72494, 44.71635, "7157 Camping Riviera & Wellness Bordeaux Nord FR PS"],
  [-0.56202, 44.94567, "7158 Parcheggio Sosta Panoramica Bordeaux Sud FR CAMP"],
  [-0.47524, 44.81525, "7159 Camper Service Autostradale Bordeaux Est FR PS"],
  [-0.43037, 44.9609, "7160 Agricampeggio & Sosta Natura Bordeaux Ovest FR CAMP"],
  [-0.69446, 44.97137, "7161 Agricampeggio & Sosta Natura Bordeaux Centro FR AA"],
  [-0.63365, 44.87642, "7162 Parcheggio Sosta Panoramica Bordeaux Mare FR PS"],
  [-0.72237, 44.96063, "7163 Camper Service Autostradale Bordeaux Collina FR AA"],
  [-0.65105, 44.94204, "7164 Agricampeggio & Sosta Natura Bordeaux Lago FR CS"],
  [-0.37757, 44.66635, "7165 Parcheggio Sosta Panoramica Bordeaux Terme FR CAMP"],
  [-0.58434, 44.91483, "7166 Camper Park Attrezzato Bordeaux Nord FR AA"],
  [-0.48387, 44.82943, "7167 Camping Riviera & Wellness Bordeaux Sud FR CS"],
  [-0.70448, 44.69537, "7168 Area Sosta Comunale Bordeaux Est FR PS"],
  [-0.63814, 44.89519, "7169 Agricampeggio & Sosta Natura Bordeaux Ovest FR CS"],
  [0.74437, 45.35772, "7170 Camper Service Autostradale P\xE9rigueux Nord FR CAMP"],
  [0.63468, 45.16771, "7171 Camping Riviera & Wellness P\xE9rigueux Sud FR CAMP"],
  [0.6387, 45.26135, "7172 Area Sosta Comunale P\xE9rigueux Est FR CS"],
  [0.71459, 45.08463, "7173 Camper Park Attrezzato P\xE9rigueux Ovest FR CS"],
  [0.63001, 45.30032, "7174 Area Sosta Comunale P\xE9rigueux Centro FR CAMP"],
  [0.81531, 45.11469, "7175 Camper Park Attrezzato P\xE9rigueux Mare FR CAMP"],
  [0.52124, 45.02483, "7176 Agricampeggio & Sosta Natura P\xE9rigueux Collina FR CS"],
  [0.78374, 45.33933, "7177 Camping Riviera & Wellness P\xE9rigueux Lago FR CAMP"],
  [0.75503, 45.31435, "7178 Area Sosta Comunale P\xE9rigueux Terme FR PS"],
  [0.57966, 45.16306, "7179 Camper Service Autostradale P\xE9rigueux Nord FR PS"],
  [0.71168, 45.33827, "7180 Agricampeggio & Sosta Natura P\xE9rigueux Sud FR AA"],
  [0.75636, 45.18101, "7181 Camper Service Autostradale P\xE9rigueux Est FR AA"],
  [0.74998, 45.06112, "7182 Camper Park Attrezzato P\xE9rigueux Ovest FR AA"],
  [0.55, 45.35677, "7183 Area Sosta Comunale P\xE9rigueux Centro FR CAMP"],
  [0.77499, 45.21754, "7184 Parcheggio Sosta Panoramica P\xE9rigueux Mare FR PS"],
  [0.63051, 45.32688, "7185 Camper Service Autostradale P\xE9rigueux Collina FR PS"],
  [0.5238, 45.20792, "7186 Agricampeggio & Sosta Natura P\xE9rigueux Lago FR PS"],
  [0.61579, 45.22783, "7187 Camper Park Attrezzato P\xE9rigueux Terme FR AA"],
  [0.7451, 45.09285, "7188 Camper Park Attrezzato P\xE9rigueux Nord FR AA"],
  [0.80692, 45.15188, "7189 Area Sosta Comunale P\xE9rigueux Sud FR CS"],
  [0.62635, 45.02032, "7190 Agricampeggio & Sosta Natura P\xE9rigueux Est FR PS"],
  [0.52873, 45.30976, "7191 Camping Riviera & Wellness P\xE9rigueux Ovest FR CAMP"],
  [0.77798, 45.28464, "7192 Agricampeggio & Sosta Natura P\xE9rigueux Centro FR CS"],
  [0.59786, 45.04907, "7193 Camper Service Autostradale P\xE9rigueux Mare FR CS"],
  [0.52883, 45.29822, "7194 Agricampeggio & Sosta Natura P\xE9rigueux Collina FR CS"],
  [0.86761, 45.21717, "7195 Agricampeggio & Sosta Natura P\xE9rigueux Lago FR CS"],
  [-1.23926, 46.14934, "7196 Area Sosta Comunale La Rochelle Nord FR PS"],
  [-1.15389, 46.16047, "7197 Agricampeggio & Sosta Natura La Rochelle Sud FR PS"],
  [-1.18169, 45.99925, "7198 Parcheggio Sosta Panoramica La Rochelle Est FR AA"],
  [-1.335, 46.07293, "7199 Parcheggio Sosta Panoramica La Rochelle Ovest FR CAMP"],
  [-1.11679, 46.2728, "7200 Camping Riviera & Wellness La Rochelle Centro FR AA"],
  [-1.1771, 46.16694, "7201 Camper Service Autostradale La Rochelle Mare FR CS"],
  [-1.17995, 46.33423, "7202 Camper Park Attrezzato La Rochelle Collina FR CAMP"],
  [-1.19234, 46.1498, "7203 Area Sosta Comunale La Rochelle Lago FR PS"],
  [-1.30373, 46.02191, "7204 Camping Riviera & Wellness La Rochelle Terme FR CAMP"],
  [-1.07794, 46.15871, "7205 Camping Riviera & Wellness La Rochelle Nord FR PS"],
  [-1.33647, 45.99814, "7206 Parcheggio Sosta Panoramica La Rochelle Sud FR PS"],
  [-1.02845, 46.02587, "7207 Agricampeggio & Sosta Natura La Rochelle Est FR CAMP"],
  [-1.16821, 46.28958, "7208 Camping Riviera & Wellness La Rochelle Ovest FR AA"],
  [-1.09591, 46.16675, "7209 Camper Park Attrezzato La Rochelle Centro FR AA"],
  [-1.35287, 46.14001, "7210 Camping Riviera & Wellness La Rochelle Mare FR PS"],
  [-1.24649, 46.03115, "7211 Parcheggio Sosta Panoramica La Rochelle Collina FR CAMP"],
  [-1.09259, 45.9954, "7212 Area Sosta Comunale La Rochelle Lago FR PS"],
  [-1.12822, 46.04073, "7213 Camping Riviera & Wellness La Rochelle Terme FR CS"],
  [-0.99747, 46.06395, "7214 Area Sosta Comunale La Rochelle Nord FR PS"],
  [-1.08463, 46.31677, "7215 Camper Service Autostradale La Rochelle Sud FR AA"],
  [-1.24476, 46.31173, "7216 Camper Service Autostradale La Rochelle Est FR CS"],
  [-0.93499, 46.27745, "7217 Camper Service Autostradale La Rochelle Ovest FR CAMP"],
  [-4.62533, 48.26602, "7218 Parcheggio Sosta Panoramica Brest Nord FR PS"],
  [-4.3556, 48.31209, "7219 Area Sosta Comunale Brest Sud FR CS"],
  [-4.48262, 48.54239, "7220 Agricampeggio & Sosta Natura Brest Est FR PS"],
  [-4.33424, 48.46952, "7221 Agricampeggio & Sosta Natura Brest Ovest FR AA"],
  [-4.49315, 48.37169, "7222 Camper Park Attrezzato Brest Centro FR PS"],
  [-4.54136, 48.48241, "7223 Parcheggio Sosta Panoramica Brest Mare FR CAMP"],
  [-4.60364, 48.55867, "7224 Camper Park Attrezzato Brest Collina FR CAMP"],
  [-4.52625, 48.515, "7225 Camper Park Attrezzato Brest Lago FR PS"],
  [-4.30006, 48.38094, "7226 Camping Riviera & Wellness Brest Terme FR CAMP"],
  [-4.35452, 48.56134, "7227 Camper Service Autostradale Brest Nord FR PS"],
  [-4.65429, 48.55309, "7228 Camper Service Autostradale Brest Sud FR CS"],
  [-4.51296, 48.52137, "7229 Area Sosta Comunale Brest Est FR CAMP"],
  [-4.52661, 48.46826, "7230 Area Sosta Comunale Brest Ovest FR PS"],
  [-4.27496, 48.37972, "7231 Area Sosta Comunale Brest Centro FR CS"],
  [-4.41867, 48.45785, "7232 Parcheggio Sosta Panoramica Brest Mare FR CAMP"],
  [-4.5401, 48.51617, "7233 Camping Riviera & Wellness Brest Collina FR CAMP"],
  [-4.36937, 48.46695, "7234 Camping Riviera & Wellness Brest Lago FR CAMP"],
  [-4.42708, 48.23935, "7235 Parcheggio Sosta Panoramica Brest Terme FR AA"],
  [-4.51581, 48.47677, "7236 Camper Park Attrezzato Brest Nord FR CAMP"],
  [-4.66587, 48.46176, "7237 Camping Riviera & Wellness Brest Sud FR AA"],
  [-4.69807, 48.32021, "7238 Camping Riviera & Wellness Brest Est FR CS"],
  [-1.70899, 48.06776, "7239 Agricampeggio & Sosta Natura Rennes Nord FR AA"],
  [-1.59599, 48.08652, "7240 Parcheggio Sosta Panoramica Rennes Sud FR CS"],
  [-1.62853, 48.00357, "7241 Camper Park Attrezzato Rennes Est FR CS"],
  [-1.67885, 48.1814, "7242 Parcheggio Sosta Panoramica Rennes Ovest FR PS"],
  [-1.78851, 48.1037, "7243 Camper Park Attrezzato Rennes Centro FR CS"],
  [-1.54072, 47.94559, "7244 Camping Riviera & Wellness Rennes Mare FR CAMP"],
  [-1.86956, 48.13361, "7245 Camping Riviera & Wellness Rennes Collina FR CAMP"],
  [-1.46989, 48.047, "7246 Parcheggio Sosta Panoramica Rennes Lago FR CAMP"],
  [-1.81315, 48.23816, "7247 Camper Service Autostradale Rennes Terme FR CAMP"],
  [-1.73119, 47.97963, "7248 Camper Service Autostradale Rennes Nord FR PS"],
  [-1.58812, 48.04586, "7249 Parcheggio Sosta Panoramica Rennes Sud FR CAMP"],
  [-1.89916, 48.08083, "7250 Camping Riviera & Wellness Rennes Est FR AA"],
  [-1.52802, 48.20311, "7251 Parcheggio Sosta Panoramica Rennes Ovest FR AA"],
  [-1.74426, 48.15477, "7252 Camper Park Attrezzato Rennes Centro FR CAMP"],
  [-1.56279, 48.03002, "7253 Parcheggio Sosta Panoramica Rennes Mare FR CS"],
  [-1.62044, 47.97631, "7254 Camping Riviera & Wellness Rennes Collina FR CS"],
  [-1.88779, 48.21831, "7255 Agricampeggio & Sosta Natura Rennes Lago FR AA"],
  [-1.49347, 47.98829, "7256 Camping Riviera & Wellness Rennes Terme FR CAMP"],
  [-1.81244, 48.08773, "7257 Camping Riviera & Wellness Rennes Nord FR CAMP"],
  [-1.78016, 48.11793, "7258 Parcheggio Sosta Panoramica Rennes Sud FR CAMP"],
  [-1.47792, 48.26222, "7259 Agricampeggio & Sosta Natura Rennes Est FR CS"],
  [-1.5409, 48.24694, "7260 Camping Riviera & Wellness Rennes Ovest FR CAMP"],
  [-1.46787, 47.99156, "7261 Area Sosta Comunale Rennes Centro FR PS"],
  [-2.97954, 47.75994, "7262 Area Sosta Comunale Vannes Nord FR CAMP"],
  [-2.64874, 47.6122, "7263 Camper Service Autostradale Vannes Sud FR AA"],
  [-2.69845, 47.61656, "7264 Parcheggio Sosta Panoramica Vannes Est FR CAMP"],
  [-2.77364, 47.71939, "7265 Area Sosta Comunale Vannes Ovest FR CAMP"],
  [-2.95735, 47.56068, "7266 Parcheggio Sosta Panoramica Vannes Centro FR CAMP"],
  [-2.80207, 47.58897, "7267 Camping Riviera & Wellness Vannes Mare FR PS"],
  [-2.84884, 47.81439, "7268 Area Sosta Comunale Vannes Collina FR CS"],
  [-2.58653, 47.51722, "7269 Area Sosta Comunale Vannes Lago FR PS"],
  [-2.68408, 47.64198, "7270 Camper Service Autostradale Vannes Terme FR CS"],
  [-2.91626, 47.74299, "7271 Parcheggio Sosta Panoramica Vannes Nord FR PS"],
  [-2.76559, 47.51786, "7272 Camping Riviera & Wellness Vannes Sud FR PS"],
  [-2.81906, 47.49465, "7273 Agricampeggio & Sosta Natura Vannes Est FR PS"],
  [-2.60085, 47.81589, "7274 Camper Service Autostradale Vannes Ovest FR PS"],
  [-2.58004, 47.61177, "7275 Camping Riviera & Wellness Vannes Centro FR AA"],
  [-2.90039, 47.62255, "7276 Area Sosta Comunale Vannes Mare FR CAMP"],
  [-2.89035, 47.51529, "7277 Camper Service Autostradale Vannes Collina FR AA"],
  [-2.87619, 47.75858, "7278 Area Sosta Comunale Vannes Lago FR AA"],
  [-2.61238, 47.55502, "7279 Parcheggio Sosta Panoramica Vannes Terme FR CS"],
  [-2.59444, 47.55878, "7280 Parcheggio Sosta Panoramica Vannes Nord FR CS"],
  [-2.71761, 47.75923, "7281 Camper Park Attrezzato Vannes Sud FR CAMP"],
  [-2.7427, 47.82883, "7282 Camper Park Attrezzato Vannes Est FR CAMP"],
  [-2.9742, 47.71457, "7283 Area Sosta Comunale Vannes Ovest FR CS"],
  [-2.87873, 47.75969, "7284 Agricampeggio & Sosta Natura Vannes Centro FR AA"],
  [-2.96222, 47.54419, "7285 Area Sosta Comunale Vannes Mare FR CAMP"],
  [-0.39398, 49.03015, "7286 Camping Riviera & Wellness Caen Nord FR AA"],
  [-0.3923, 49.21568, "7287 Parcheggio Sosta Panoramica Caen Sud FR CAMP"],
  [-0.24325, 49.02308, "7288 Parcheggio Sosta Panoramica Caen Est FR CS"],
  [-0.58168, 49.23307, "7289 Camper Service Autostradale Caen Ovest FR CAMP"],
  [-0.54712, 49.1571, "7290 Camper Service Autostradale Caen Centro FR PS"],
  [-0.45075, 49.32264, "7291 Area Sosta Comunale Caen Mare FR PS"],
  [-0.31476, 49.05207, "7292 Area Sosta Comunale Caen Collina FR CS"],
  [-0.35695, 49.35602, "7293 Camper Service Autostradale Caen Lago FR CAMP"],
  [-0.55107, 49.2198, "7294 Parcheggio Sosta Panoramica Caen Terme FR PS"],
  [-0.24967, 49.23572, "7295 Camping Riviera & Wellness Caen Nord FR AA"],
  [-0.49288, 49.16594, "7296 Camper Service Autostradale Caen Sud FR CS"],
  [-0.26737, 49.14746, "7297 Camper Service Autostradale Caen Est FR CAMP"],
  [-0.481, 49.11728, "7298 Camper Service Autostradale Caen Ovest FR CAMP"],
  [-0.56549, 49.33094, "7299 Camping Riviera & Wellness Caen Centro FR CS"],
  [-0.26063, 49.15906, "7300 Area Sosta Comunale Caen Mare FR AA"],
  [-0.33179, 49.20263, "7301 Camper Park Attrezzato Caen Collina FR CAMP"],
  [-0.43658, 49.05068, "7302 Camping Riviera & Wellness Caen Lago FR CAMP"],
  [-0.46627, 49.02591, "7303 Camping Riviera & Wellness Caen Terme FR PS"],
  [-0.36736, 49.04416, "7304 Agricampeggio & Sosta Natura Caen Nord FR CAMP"],
  [-0.21443, 49.17667, "7305 Camping Riviera & Wellness Caen Sud FR CS"],
  [-0.25253, 49.13655, "7306 Parcheggio Sosta Panoramica Caen Est FR CAMP"],
  [-0.15715, 49.3037, "7307 Camper Service Autostradale Caen Ovest FR CS"],
  [-0.22244, 49.33308, "7308 Parcheggio Sosta Panoramica Caen Centro FR AA"],
  [-0.27949, 49.07105, "7309 Area Sosta Comunale Caen Mare FR CAMP"],
  [-1.34506, 48.46314, "7310 Agricampeggio & Sosta Natura Mont Saint-Michel Nord FR CAMP"],
  [-1.45157, 48.51066, "7311 Area Sosta Comunale Mont Saint-Michel Sud FR PS"],
  [-1.63969, 48.72214, "7312 Area Sosta Comunale Mont Saint-Michel Est FR AA"],
  [-1.56998, 48.58031, "7313 Camper Service Autostradale Mont Saint-Michel Ovest FR PS"],
  [-1.339, 48.66968, "7314 Parcheggio Sosta Panoramica Mont Saint-Michel Centro FR CAMP"],
  [-1.71411, 48.72505, "7315 Camper Park Attrezzato Mont Saint-Michel Mare FR CS"],
  [-1.54569, 48.61609, "7316 Agricampeggio & Sosta Natura Mont Saint-Michel Collina FR AA"],
  [-1.39678, 48.55661, "7317 Camper Service Autostradale Mont Saint-Michel Lago FR PS"],
  [-1.60904, 48.61147, "7318 Agricampeggio & Sosta Natura Mont Saint-Michel Terme FR AA"],
  [-1.71606, 48.6945, "7319 Parcheggio Sosta Panoramica Mont Saint-Michel Nord FR PS"],
  [-1.64451, 48.48017, "7320 Parcheggio Sosta Panoramica Mont Saint-Michel Sud FR PS"],
  [-1.60625, 48.72846, "7321 Camper Park Attrezzato Mont Saint-Michel Est FR CS"],
  [-1.54271, 48.63508, "7322 Area Sosta Comunale Mont Saint-Michel Ovest FR AA"],
  [-1.63295, 48.6474, "7323 Camper Service Autostradale Mont Saint-Michel Centro FR CS"],
  [-1.40258, 48.59997, "7324 Area Sosta Comunale Mont Saint-Michel Mare FR CAMP"],
  [-1.70146, 48.62191, "7325 Area Sosta Comunale Mont Saint-Michel Collina FR PS"],
  [-1.55451, 48.61125, "7326 Parcheggio Sosta Panoramica Mont Saint-Michel Lago FR CAMP"],
  [-1.72711, 48.50131, "7327 Agricampeggio & Sosta Natura Mont Saint-Michel Terme FR PS"],
  [-1.45834, 48.74146, "7328 Camper Park Attrezzato Mont Saint-Michel Nord FR CAMP"],
  [-1.68886, 48.61385, "7329 Area Sosta Comunale Mont Saint-Michel Sud FR CAMP"],
  [-1.70111, 48.60116, "7330 Parcheggio Sosta Panoramica Mont Saint-Michel Est FR PS"],
  [-1.58662, 48.57983, "7331 Camping Riviera & Wellness Mont Saint-Michel Ovest FR CAMP"],
  [7.76587, 48.62003, "7332 Parcheggio Sosta Panoramica Strasbourg Nord FR AA"],
  [7.9583, 48.52128, "7333 Agricampeggio & Sosta Natura Strasbourg Sud FR CS"],
  [7.64229, 48.43438, "7334 Camper Park Attrezzato Strasbourg Est FR CS"],
  [7.86872, 48.4519, "7335 Parcheggio Sosta Panoramica Strasbourg Ovest FR CS"],
  [7.80968, 48.73135, "7336 Camper Park Attrezzato Strasbourg Centro FR AA"],
  [7.72911, 48.66436, "7337 Parcheggio Sosta Panoramica Strasbourg Mare FR PS"],
  [7.72499, 48.50905, "7338 Camping Riviera & Wellness Strasbourg Collina FR CAMP"],
  [7.88545, 48.61938, "7339 Camper Service Autostradale Strasbourg Lago FR PS"],
  [7.66678, 48.57597, "7340 Agricampeggio & Sosta Natura Strasbourg Terme FR AA"],
  [7.90136, 48.41831, "7341 Area Sosta Comunale Strasbourg Nord FR PS"],
  [7.91198, 48.70089, "7342 Camping Riviera & Wellness Strasbourg Sud FR AA"],
  [7.9565, 48.60152, "7343 Camper Service Autostradale Strasbourg Est FR PS"],
  [7.78435, 48.71657, "7344 Camper Service Autostradale Strasbourg Ovest FR AA"],
  [7.75272, 48.61015, "7345 Agricampeggio & Sosta Natura Strasbourg Centro FR CS"],
  [7.93171, 48.43463, "7346 Camper Service Autostradale Strasbourg Mare FR AA"],
  [7.81786, 48.42792, "7347 Camping Riviera & Wellness Strasbourg Collina FR CAMP"],
  [7.97304, 48.64607, "7348 Camper Park Attrezzato Strasbourg Lago FR AA"],
  [7.6544, 48.5289, "7349 Agricampeggio & Sosta Natura Strasbourg Terme FR CS"],
  [7.55066, 48.63601, "7350 Agricampeggio & Sosta Natura Strasbourg Nord FR PS"],
  [7.77818, 48.51379, "7351 Area Sosta Comunale Strasbourg Sud FR CAMP"],
  [7.42895, 48.15771, "7352 Agricampeggio & Sosta Natura Colmar Nord FR CAMP"],
  [7.43213, 47.93293, "7353 Agricampeggio & Sosta Natura Colmar Sud FR CS"],
  [7.44782, 48.24309, "7354 Agricampeggio & Sosta Natura Colmar Est FR CAMP"],
  [7.5556, 48.11266, "7355 Camper Park Attrezzato Colmar Ovest FR PS"],
  [7.48975, 48.03624, "7356 Parcheggio Sosta Panoramica Colmar Centro FR CAMP"],
  [7.5597, 48.15039, "7357 Camping Riviera & Wellness Colmar Mare FR CS"],
  [7.36232, 48.13906, "7358 Camping Riviera & Wellness Colmar Collina FR AA"],
  [7.56153, 48.0125, "7359 Agricampeggio & Sosta Natura Colmar Lago FR AA"],
  [7.58349, 47.9716, "7360 Camper Service Autostradale Colmar Terme FR CAMP"],
  [7.48815, 48.00793, "7361 Area Sosta Comunale Colmar Nord FR CS"],
  [7.47834, 48.02227, "7362 Camping Riviera & Wellness Colmar Sud FR AA"],
  [7.20651, 48.03625, "7363 Parcheggio Sosta Panoramica Colmar Est FR CS"],
  [7.31839, 48.05759, "7364 Camping Riviera & Wellness Colmar Ovest FR CS"],
  [7.47208, 48.11811, "7365 Camper Service Autostradale Colmar Centro FR CS"],
  [7.27276, 48.0913, "7366 Camper Park Attrezzato Colmar Mare FR PS"],
  [7.55971, 48.03314, "7367 Camper Park Attrezzato Colmar Collina FR PS"],
  [7.48366, 48.1737, "7368 Camper Service Autostradale Colmar Lago FR PS"],
  [7.49407, 48.19031, "7369 Camper Park Attrezzato Colmar Terme FR PS"],
  [7.34977, 47.92266, "7370 Agricampeggio & Sosta Natura Colmar Nord FR CS"],
  [7.45363, 48.2314, "7371 Parcheggio Sosta Panoramica Colmar Sud FR CAMP"],
  [7.20564, 47.93376, "7372 Agricampeggio & Sosta Natura Colmar Est FR AA"],
  [7.33036, 47.95597, "7373 Parcheggio Sosta Panoramica Colmar Ovest FR PS"],
  [7.55221, 48.21402, "7374 Camper Service Autostradale Colmar Centro FR CS"],
  [7.30178, 48.04316, "7375 Area Sosta Comunale Colmar Mare FR PS"],
  [6.04781, 45.80279, "7376 Agricampeggio & Sosta Natura Annecy Nord FR AA"],
  [6.26052, 45.95169, "7377 Camping Riviera & Wellness Annecy Sud FR AA"],
  [6.27779, 45.82461, "7378 Area Sosta Comunale Annecy Est FR CS"],
  [6.18131, 45.88839, "7379 Camping Riviera & Wellness Annecy Ovest FR CS"],
  [6.28013, 45.81377, "7380 Area Sosta Comunale Annecy Centro FR AA"],
  [6.01134, 45.99586, "7381 Area Sosta Comunale Annecy Mare FR PS"],
  [6.19193, 45.80765, "7382 Area Sosta Comunale Annecy Collina FR AA"],
  [6.31172, 45.763, "7383 Area Sosta Comunale Annecy Lago FR PS"],
  [6.01327, 45.90458, "7384 Camping Riviera & Wellness Annecy Terme FR AA"],
  [6.18106, 45.87443, "7385 Agricampeggio & Sosta Natura Annecy Nord FR CS"],
  [6.20337, 45.87, "7386 Parcheggio Sosta Panoramica Annecy Sud FR CS"],
  [5.93486, 46.06533, "7387 Parcheggio Sosta Panoramica Annecy Est FR AA"],
  [5.92399, 46.02987, "7388 Camper Service Autostradale Annecy Ovest FR AA"],
  [5.91171, 45.81298, "7389 Agricampeggio & Sosta Natura Annecy Centro FR PS"],
  [6.2001, 45.80859, "7390 Agricampeggio & Sosta Natura Annecy Mare FR AA"],
  [6.05403, 45.98152, "7391 Parcheggio Sosta Panoramica Annecy Collina FR AA"],
  [6.27048, 45.9153, "7392 Agricampeggio & Sosta Natura Annecy Lago FR AA"],
  [6.21733, 45.88682, "7393 Camping Riviera & Wellness Annecy Terme FR CS"],
  [6.25369, 45.74629, "7394 Camper Park Attrezzato Annecy Nord FR CS"],
  [5.92411, 45.8269, "7395 Area Sosta Comunale Annecy Sud FR PS"],
  [6.04393, 45.83466, "7396 Area Sosta Comunale Annecy Est FR CS"],
  [5.92088, 45.88989, "7397 Parcheggio Sosta Panoramica Annecy Ovest FR PS"],
  [6.25578, 45.84914, "7398 Agricampeggio & Sosta Natura Annecy Centro FR CS"],
  [6.07001, 45.76777, "7399 Agricampeggio & Sosta Natura Annecy Mare FR CAMP"],
  [5.77687, 45.50826, "7400 Camper Service Autostradale Chamb\xE9ry Nord FR PS"],
  [5.92647, 45.71311, "7401 Agricampeggio & Sosta Natura Chamb\xE9ry Sud FR PS"],
  [5.88657, 45.53817, "7402 Camping Riviera & Wellness Chamb\xE9ry Est FR AA"],
  [5.73897, 45.49242, "7403 Parcheggio Sosta Panoramica Chamb\xE9ry Ovest FR CS"],
  [5.89346, 45.49307, "7404 Camping Riviera & Wellness Chamb\xE9ry Centro FR CAMP"],
  [5.851, 45.63102, "7405 Camper Park Attrezzato Chamb\xE9ry Mare FR PS"],
  [5.85145, 45.69411, "7406 Camping Riviera & Wellness Chamb\xE9ry Collina FR AA"],
  [6.04897, 45.61341, "7407 Agricampeggio & Sosta Natura Chamb\xE9ry Lago FR PS"],
  [5.87559, 45.62451, "7408 Area Sosta Comunale Chamb\xE9ry Terme FR AA"],
  [5.96621, 45.43957, "7409 Area Sosta Comunale Chamb\xE9ry Nord FR CS"],
  [5.799, 45.43378, "7410 Area Sosta Comunale Chamb\xE9ry Sud FR PS"],
  [5.94806, 45.5236, "7411 Agricampeggio & Sosta Natura Chamb\xE9ry Est FR CAMP"],
  [5.85973, 45.54707, "7412 Camping Riviera & Wellness Chamb\xE9ry Ovest FR CS"],
  [5.93106, 45.59047, "7413 Area Sosta Comunale Chamb\xE9ry Centro FR PS"],
  [5.80513, 45.61695, "7414 Agricampeggio & Sosta Natura Chamb\xE9ry Mare FR PS"],
  [5.91737, 45.64709, "7415 Area Sosta Comunale Chamb\xE9ry Collina FR AA"],
  [6.04153, 45.43082, "7416 Parcheggio Sosta Panoramica Chamb\xE9ry Lago FR PS"],
  [5.82131, 45.73833, "7417 Camper Park Attrezzato Chamb\xE9ry Terme FR PS"],
  [6.07657, 45.43252, "7418 Camper Park Attrezzato Chamb\xE9ry Nord FR PS"],
  [5.8931, 45.70414, "7419 Camper Park Attrezzato Chamb\xE9ry Sud FR PS"],
  [6.13676, 45.72825, "7420 Camping Riviera & Wellness Chamb\xE9ry Est FR AA"],
  [5.93678, 45.41233, "7421 Camping Riviera & Wellness Chamb\xE9ry Ovest FR CAMP"],
  [6.1101, 45.63873, "7422 Camper Park Attrezzato Chamb\xE9ry Centro FR CAMP"],
  [5.74741, 45.56766, "7423 Agricampeggio & Sosta Natura Chamb\xE9ry Mare FR CS"],
  [9.23683, 42.80443, "7424 Camper Park Attrezzato Bastia Nord FR CS"],
  [9.47324, 42.80908, "7425 Camper Service Autostradale Bastia Sud FR CAMP"],
  [9.67482, 42.63605, "7426 Area Sosta Comunale Bastia Est FR AA"],
  [9.40925, 42.67158, "7427 Parcheggio Sosta Panoramica Bastia Ovest FR PS"],
  [9.51405, 42.86813, "7428 Camper Park Attrezzato Bastia Centro FR AA"],
  [9.38003, 42.76584, "7429 Camper Service Autostradale Bastia Mare FR PS"],
  [9.63482, 42.67922, "7430 Camper Park Attrezzato Bastia Collina FR CS"],
  [9.36186, 42.70914, "7431 Area Sosta Comunale Bastia Lago FR AA"],
  [9.32646, 42.85496, "7432 Agricampeggio & Sosta Natura Bastia Terme FR CS"],
  [9.51078, 42.61551, "7433 Area Sosta Comunale Bastia Nord FR CAMP"],
  [9.50149, 42.74656, "7434 Camper Park Attrezzato Bastia Sud FR CAMP"],
  [9.49131, 42.75215, "7435 Parcheggio Sosta Panoramica Bastia Est FR AA"],
  [9.54928, 42.75836, "7436 Camper Park Attrezzato Bastia Ovest FR CS"],
  [9.6137, 42.54222, "7437 Parcheggio Sosta Panoramica Bastia Centro FR CAMP"],
  [9.57196, 42.85979, "7438 Area Sosta Comunale Bastia Mare FR AA"],
  [9.48246, 42.60158, "7439 Camping Riviera & Wellness Bastia Collina FR CAMP"],
  [9.47051, 42.83895, "7440 Camper Service Autostradale Bastia Lago FR AA"],
  [9.58831, 42.61351, "7441 Camper Service Autostradale Bastia Terme FR CAMP"],
  [9.53488, 42.68654, "7442 Agricampeggio & Sosta Natura Bastia Nord FR PS"],
  [9.434, 42.67327, "7443 Camper Service Autostradale Bastia Sud FR CS"],
  [9.61267, 42.57808, "7444 Parcheggio Sosta Panoramica Bastia Est FR CAMP"],
  [8.67864, 41.79797, "7445 Camper Service Autostradale Ajaccio Nord FR CAMP"],
  [8.56703, 41.83681, "7446 Agricampeggio & Sosta Natura Ajaccio Sud FR AA"],
  [8.53467, 41.80151, "7447 Camper Park Attrezzato Ajaccio Est FR PS"],
  [8.94511, 41.89855, "7448 Parcheggio Sosta Panoramica Ajaccio Ovest FR PS"],
  [8.83641, 42.07901, "7449 Agricampeggio & Sosta Natura Ajaccio Centro FR CS"],
  [8.74353, 41.92659, "7450 Camper Park Attrezzato Ajaccio Mare FR CS"],
  [8.55242, 41.92628, "7451 Agricampeggio & Sosta Natura Ajaccio Collina FR PS"],
  [8.62023, 41.91223, "7452 Parcheggio Sosta Panoramica Ajaccio Lago FR PS"],
  [8.7346, 41.76989, "7453 Area Sosta Comunale Ajaccio Terme FR CAMP"],
  [8.89313, 41.94004, "7454 Agricampeggio & Sosta Natura Ajaccio Nord FR PS"],
  [8.83928, 42.06106, "7455 Camper Park Attrezzato Ajaccio Sud FR PS"],
  [8.53492, 41.76803, "7456 Agricampeggio & Sosta Natura Ajaccio Est FR PS"],
  [8.54499, 41.94583, "7457 Agricampeggio & Sosta Natura Ajaccio Ovest FR CS"],
  [8.95699, 41.8501, "7458 Parcheggio Sosta Panoramica Ajaccio Centro FR PS"],
  [8.68916, 42.09348, "7459 Camper Park Attrezzato Ajaccio Mare FR AA"],
  [8.85163, 42.08083, "7460 Parcheggio Sosta Panoramica Ajaccio Collina FR CAMP"],
  [8.73694, 41.93039, "7461 Parcheggio Sosta Panoramica Ajaccio Lago FR CS"],
  [8.66177, 41.80016, "7462 Area Sosta Comunale Ajaccio Terme FR AA"],
  [8.78472, 41.91215, "7463 Parcheggio Sosta Panoramica Ajaccio Nord FR PS"],
  [8.65524, 42.07818, "7464 Agricampeggio & Sosta Natura Ajaccio Sud FR CS"],
  [8.64656, 42.01096, "7465 Parcheggio Sosta Panoramica Ajaccio Est FR PS"],
  [8.75145, 42.0421, "7466 Parcheggio Sosta Panoramica Ajaccio Ovest FR CAMP"],
  [8.67766, 42.03771, "7467 Camper Service Autostradale Ajaccio Centro FR CAMP"]
];

// src/data/italiaPlaces.ts
var ITALIA_RAW_PLACES = [
  [9.06544, 45.38546, "1001 Camping Riviera & Wellness Milano Nord IT AA"],
  [9.21041, 45.54843, "1002 Camping Riviera & Wellness Milano Sud IT AA"],
  [9.06339, 45.29963, "1003 Area Sosta Comunale Milano Est IT PS"],
  [9.25745, 45.35879, "1004 Parcheggio Sosta Panoramica Milano Ovest IT AA"],
  [9.09019, 45.44642, "1005 Camper Park Attrezzato Milano Centro IT PS"],
  [9.11811, 45.53355, "1006 Camper Park Attrezzato Milano Mare IT AA"],
  [9.11647, 45.62422, "1007 Camper Park Attrezzato Milano Collina IT CS"],
  [9.34637, 45.32305, "1008 Camper Service Autostradale Milano Lago IT AA"],
  [9.2063, 45.54461, "1009 Area Sosta Comunale Milano Terme IT CAMP"],
  [9.33823, 45.48241, "1010 Area Sosta Comunale Milano Nord IT PS"],
  [8.9963, 45.3565, "1011 Parcheggio Sosta Panoramica Milano Sud IT CAMP"],
  [9.34989, 45.63403, "1012 Agricampeggio & Sosta Natura Milano Est IT CS"],
  [9.25106, 45.38649, "1013 Camper Service Autostradale Milano Ovest IT AA"],
  [9.05928, 45.41876, "1014 Camper Park Attrezzato Milano Centro IT CAMP"],
  [9.25662, 45.61703, "1015 Camping Riviera & Wellness Milano Mare IT CAMP"],
  [9.03853, 45.54439, "1016 Parcheggio Sosta Panoramica Milano Collina IT CS"],
  [9.253, 45.63553, "1017 Agricampeggio & Sosta Natura Milano Lago IT PS"],
  [9.31074, 45.4027, "1018 Camping Riviera & Wellness Milano Terme IT CS"],
  [9.32727, 45.57683, "1019 Camper Park Attrezzato Milano Nord IT AA"],
  [10.41111, 45.44044, "1020 Area Sosta Comunale Brescia Nord IT CAMP"],
  [10.16483, 45.596, "1021 Camper Park Attrezzato Brescia Sud IT CAMP"],
  [10.09778, 45.45931, "1022 Camper Park Attrezzato Brescia Est IT PS"],
  [10.39082, 45.57121, "1023 Camping Riviera & Wellness Brescia Ovest IT CAMP"],
  [10.43569, 45.44336, "1024 Agricampeggio & Sosta Natura Brescia Centro IT PS"],
  [10.3743, 45.63112, "1025 Area Sosta Comunale Brescia Mare IT PS"],
  [10.29302, 45.42259, "1026 Camping Riviera & Wellness Brescia Collina IT CS"],
  [10.43505, 45.50017, "1027 Camper Service Autostradale Brescia Lago IT AA"],
  [9.99197, 45.66787, "1028 Parcheggio Sosta Panoramica Brescia Terme IT CAMP"],
  [10.3247, 45.67628, "1029 Camping Riviera & Wellness Brescia Nord IT AA"],
  [10.05797, 45.46933, "1030 Area Sosta Comunale Brescia Sud IT CAMP"],
  [10.10533, 45.67315, "1031 Camping Riviera & Wellness Brescia Est IT AA"],
  [10.37853, 45.68602, "1032 Parcheggio Sosta Panoramica Brescia Ovest IT CS"],
  [10.07631, 45.54428, "1033 Camping Riviera & Wellness Brescia Centro IT CAMP"],
  [10.33718, 45.55538, "1034 Camper Park Attrezzato Brescia Mare IT CAMP"],
  [9.99556, 45.48005, "1035 Parcheggio Sosta Panoramica Brescia Collina IT AA"],
  [10.09519, 45.45041, "1036 Agricampeggio & Sosta Natura Brescia Lago IT CAMP"],
  [10.35401, 45.62277, "1037 Area Sosta Comunale Brescia Terme IT AA"],
  [10.41288, 45.59751, "1038 Camper Park Attrezzato Brescia Nord IT CS"],
  [10.25977, 45.55129, "1039 Agricampeggio & Sosta Natura Brescia Sud IT CS"],
  [10.29724, 45.63094, "1040 Parcheggio Sosta Panoramica Brescia Est IT CS"],
  [10.27925, 45.7149, "1041 Camper Service Autostradale Brescia Ovest IT CAMP"],
  [10.09836, 45.52462, "1042 Parcheggio Sosta Panoramica Brescia Centro IT PS"],
  [10.23606, 45.37396, "1043 Agricampeggio & Sosta Natura Brescia Mare IT AA"],
  [9.47879, 45.77104, "1044 Area Sosta Comunale Bergamo Nord IT AA"],
  [9.48419, 45.82417, "1045 Area Sosta Comunale Bergamo Sud IT AA"],
  [9.54871, 45.75744, "1046 Agricampeggio & Sosta Natura Bergamo Est IT CS"],
  [9.70927, 45.85073, "1047 Camping Riviera & Wellness Bergamo Ovest IT CS"],
  [9.81567, 45.79792, "1048 Camper Park Attrezzato Bergamo Centro IT PS"],
  [9.64627, 45.55723, "1049 Area Sosta Comunale Bergamo Mare IT CS"],
  [9.78038, 45.68676, "1050 Camper Service Autostradale Bergamo Collina IT PS"],
  [9.60499, 45.66422, "1051 Area Sosta Comunale Bergamo Lago IT AA"],
  [9.69363, 45.59036, "1052 Camper Park Attrezzato Bergamo Terme IT AA"],
  [9.66048, 45.58752, "1053 Camper Service Autostradale Bergamo Nord IT CS"],
  [9.83749, 45.80611, "1054 Camper Service Autostradale Bergamo Sud IT AA"],
  [9.69556, 45.75155, "1055 Area Sosta Comunale Bergamo Est IT AA"],
  [9.83421, 45.84753, "1056 Area Sosta Comunale Bergamo Ovest IT AA"],
  [9.54849, 45.69327, "1057 Camper Service Autostradale Bergamo Centro IT CS"],
  [9.45327, 45.58092, "1058 Area Sosta Comunale Bergamo Mare IT PS"],
  [9.80561, 45.84758, "1059 Agricampeggio & Sosta Natura Bergamo Collina IT PS"],
  [9.78103, 45.76711, "1060 Camper Service Autostradale Bergamo Lago IT CAMP"],
  [9.55027, 45.58976, "1061 Camper Park Attrezzato Bergamo Terme IT PS"],
  [9.47973, 45.78081, "1062 Parcheggio Sosta Panoramica Bergamo Nord IT AA"],
  [9.66685, 45.54085, "1063 Area Sosta Comunale Bergamo Sud IT CAMP"],
  [9.48835, 45.85957, "1064 Area Sosta Comunale Bergamo Est IT CS"],
  [9.24802, 45.65689, "1065 Parcheggio Sosta Panoramica Como Nord IT AA"],
  [9.11655, 45.96266, "1066 Area Sosta Comunale Como Sud IT PS"],
  [9.15602, 45.66179, "1067 Parcheggio Sosta Panoramica Como Est IT AA"],
  [9.18249, 45.70459, "1068 Agricampeggio & Sosta Natura Como Ovest IT CAMP"],
  [9.16246, 45.77163, "1069 Agricampeggio & Sosta Natura Como Centro IT CS"],
  [9.19854, 45.74376, "1070 Camper Service Autostradale Como Mare IT CAMP"],
  [9.3095, 45.7935, "1071 Area Sosta Comunale Como Collina IT AA"],
  [9.08785, 45.82127, "1072 Area Sosta Comunale Como Lago IT AA"],
  [9.25587, 45.9414, "1073 Agricampeggio & Sosta Natura Como Terme IT CS"],
  [9.23539, 45.68831, "1074 Agricampeggio & Sosta Natura Como Nord IT CAMP"],
  [9.22339, 45.97745, "1075 Parcheggio Sosta Panoramica Como Sud IT CAMP"],
  [8.99492, 45.91909, "1076 Camping Riviera & Wellness Como Est IT AA"],
  [9.26057, 45.72566, "1077 Camper Park Attrezzato Como Ovest IT AA"],
  [8.95498, 45.73171, "1078 Agricampeggio & Sosta Natura Como Centro IT CS"],
  [9.24401, 45.87372, "1079 Camper Park Attrezzato Como Mare IT CAMP"],
  [9.24095, 45.94997, "1080 Agricampeggio & Sosta Natura Como Collina IT PS"],
  [8.98471, 45.78135, "1081 Camping Riviera & Wellness Como Lago IT AA"],
  [9.1469, 45.90299, "1082 Agricampeggio & Sosta Natura Como Terme IT AA"],
  [9.10846, 45.89253, "1083 Camper Park Attrezzato Como Nord IT CAMP"],
  [8.89406, 45.63648, "1084 Parcheggio Sosta Panoramica Como Sud IT PS"],
  [9.23424, 45.88548, "1085 Agricampeggio & Sosta Natura Lecco Nord IT AA"],
  [9.57214, 45.78949, "1086 Area Sosta Comunale Lecco Sud IT CS"],
  [9.27989, 45.75513, "1087 Agricampeggio & Sosta Natura Lecco Est IT AA"],
  [9.56546, 45.95464, "1088 Agricampeggio & Sosta Natura Lecco Ovest IT AA"],
  [9.58419, 45.94392, "1089 Parcheggio Sosta Panoramica Lecco Centro IT PS"],
  [9.53245, 46.02327, "1090 Camper Park Attrezzato Lecco Mare IT CS"],
  [9.58362, 45.74438, "1091 Area Sosta Comunale Lecco Collina IT PS"],
  [9.53244, 45.98402, "1092 Camping Riviera & Wellness Lecco Lago IT PS"],
  [9.21624, 45.95718, "1093 Camper Park Attrezzato Lecco Terme IT CAMP"],
  [9.53506, 45.75945, "1094 Camper Service Autostradale Lecco Nord IT AA"],
  [9.52551, 45.78842, "1095 Agricampeggio & Sosta Natura Lecco Sud IT PS"],
  [9.25451, 45.68988, "1096 Camper Park Attrezzato Lecco Est IT CS"],
  [9.6027, 45.98412, "1097 Agricampeggio & Sosta Natura Lecco Ovest IT CAMP"],
  [9.34746, 45.90612, "1098 Agricampeggio & Sosta Natura Lecco Centro IT CAMP"],
  [9.60428, 45.72197, "1099 Area Sosta Comunale Lecco Mare IT CAMP"],
  [9.28706, 46.01849, "1100 Parcheggio Sosta Panoramica Lecco Collina IT CS"],
  [9.49545, 45.8337, "1101 Parcheggio Sosta Panoramica Lecco Lago IT AA"],
  [9.39774, 45.89377, "1102 Camper Service Autostradale Lecco Terme IT CAMP"],
  [9.18757, 45.74813, "1103 Parcheggio Sosta Panoramica Lecco Nord IT PS"],
  [9.53053, 45.86357, "1104 Area Sosta Comunale Lecco Sud IT PS"],
  [9.94501, 46.01809, "1105 Camper Service Autostradale Sondrio Nord IT CAMP"],
  [10.02771, 46.10347, "1106 Parcheggio Sosta Panoramica Sondrio Sud IT CAMP"],
  [9.82988, 46.10185, "1107 Parcheggio Sosta Panoramica Sondrio Est IT CAMP"],
  [9.70338, 46.09708, "1108 Camping Riviera & Wellness Sondrio Ovest IT PS"],
  [9.95089, 46.32273, "1109 Camping Riviera & Wellness Sondrio Centro IT PS"],
  [9.82883, 46.19279, "1110 Parcheggio Sosta Panoramica Sondrio Mare IT CS"],
  [9.83955, 46.09402, "1111 Agricampeggio & Sosta Natura Sondrio Collina IT AA"],
  [9.95013, 46.14823, "1112 Camper Service Autostradale Sondrio Lago IT CAMP"],
  [9.68426, 46.05299, "1113 Camping Riviera & Wellness Sondrio Terme IT PS"],
  [9.98411, 46.28005, "1114 Area Sosta Comunale Sondrio Nord IT CAMP"],
  [9.71241, 46.2759, "1115 Camper Park Attrezzato Sondrio Sud IT CAMP"],
  [9.92117, 46.33798, "1116 Camper Park Attrezzato Sondrio Est IT AA"],
  [9.92949, 46.13865, "1117 Camper Service Autostradale Sondrio Ovest IT AA"],
  [9.86857, 46.23732, "1118 Camping Riviera & Wellness Sondrio Centro IT CS"],
  [9.6486, 46.22322, "1119 Camper Park Attrezzato Sondrio Mare IT CS"],
  [10.00795, 46.07019, "1120 Camper Service Autostradale Sondrio Collina IT AA"],
  [10.05896, 46.18869, "1121 Area Sosta Comunale Sondrio Lago IT PS"],
  [9.85519, 46.04027, "1122 Camper Service Autostradale Sondrio Terme IT AA"],
  [9.96977, 46.20803, "1123 Camper Service Autostradale Sondrio Nord IT CAMP"],
  [9.71772, 46.14967, "1124 Parcheggio Sosta Panoramica Sondrio Sud IT PS"],
  [9.75736, 46.08432, "1125 Camper Service Autostradale Sondrio Est IT PS"],
  [8.79804, 45.72934, "1126 Camping Riviera & Wellness Varese Nord IT PS"],
  [8.74397, 45.7407, "1127 Camper Park Attrezzato Varese Sud IT CAMP"],
  [8.77247, 45.69839, "1128 Camper Park Attrezzato Varese Est IT AA"],
  [8.78679, 45.72048, "1129 Camping Riviera & Wellness Varese Ovest IT CS"],
  [8.62812, 45.80867, "1130 Parcheggio Sosta Panoramica Varese Centro IT CAMP"],
  [8.86294, 45.96229, "1131 Camper Service Autostradale Varese Mare IT PS"],
  [8.60275, 45.77873, "1132 Parcheggio Sosta Panoramica Varese Collina IT AA"],
  [8.98415, 45.90932, "1133 Agricampeggio & Sosta Natura Varese Lago IT CAMP"],
  [8.84586, 45.90723, "1134 Parcheggio Sosta Panoramica Varese Terme IT PS"],
  [8.79623, 45.7224, "1135 Camper Service Autostradale Varese Nord IT CS"],
  [8.90571, 45.76325, "1136 Camper Service Autostradale Varese Sud IT AA"],
  [8.81043, 45.70337, "1137 Camping Riviera & Wellness Varese Est IT PS"],
  [9.00822, 45.83254, "1138 Parcheggio Sosta Panoramica Varese Ovest IT CS"],
  [8.66116, 45.87056, "1139 Area Sosta Comunale Varese Centro IT AA"],
  [8.7707, 45.6632, "1140 Camper Park Attrezzato Varese Mare IT PS"],
  [8.94265, 45.76, "1141 Camper Service Autostradale Varese Collina IT CS"],
  [8.97447, 45.9088, "1142 Agricampeggio & Sosta Natura Varese Lago IT PS"],
  [8.93716, 45.81021, "1143 Area Sosta Comunale Varese Terme IT CAMP"],
  [8.63098, 45.72408, "1144 Agricampeggio & Sosta Natura Varese Nord IT AA"],
  [8.68981, 45.97796, "1145 Area Sosta Comunale Varese Sud IT AA"],
  [8.6569, 45.69893, "1146 Parcheggio Sosta Panoramica Varese Est IT AA"],
  [8.80937, 45.97731, "1147 Parcheggio Sosta Panoramica Varese Ovest IT AA"],
  [11.00008, 45.19346, "1148 Camper Park Attrezzato Mantova Nord IT CAMP"],
  [10.61504, 45.31905, "1149 Camper Park Attrezzato Mantova Sud IT AA"],
  [10.97501, 45.18293, "1150 Agricampeggio & Sosta Natura Mantova Est IT AA"],
  [10.65565, 45.31091, "1151 Camper Service Autostradale Mantova Ovest IT PS"],
  [10.70211, 45.22542, "1152 Area Sosta Comunale Mantova Centro IT CS"],
  [10.72264, 45.25532, "1153 Parcheggio Sosta Panoramica Mantova Mare IT AA"],
  [10.79408, 45.1111, "1154 Camping Riviera & Wellness Mantova Collina IT PS"],
  [10.93645, 45.27875, "1155 Area Sosta Comunale Mantova Lago IT CAMP"],
  [10.85241, 45.31768, "1156 Camper Service Autostradale Mantova Terme IT AA"],
  [10.64566, 45.03495, "1157 Camping Riviera & Wellness Mantova Nord IT PS"],
  [10.80858, 45.26427, "1158 Parcheggio Sosta Panoramica Mantova Sud IT CAMP"],
  [10.89536, 45.13385, "1159 Camper Service Autostradale Mantova Est IT PS"],
  [10.94023, 45.2795, "1160 Agricampeggio & Sosta Natura Mantova Ovest IT CAMP"],
  [10.67614, 45.28997, "1161 Agricampeggio & Sosta Natura Mantova Centro IT AA"],
  [10.73695, 45.19502, "1162 Parcheggio Sosta Panoramica Mantova Mare IT PS"],
  [10.64823, 45.27923, "1163 Camper Service Autostradale Mantova Collina IT AA"],
  [10.71955, 45.26064, "1164 Agricampeggio & Sosta Natura Mantova Lago IT CS"],
  [10.99303, 44.98495, "1165 Parcheggio Sosta Panoramica Mantova Terme IT CAMP"],
  [10.78626, 45.23343, "1166 Camper Park Attrezzato Mantova Nord IT AA"],
  [10.88673, 45.14803, "1167 Camping Riviera & Wellness Mantova Sud IT CS"],
  [10.66612, 45.01397, "1168 Area Sosta Comunale Mantova Est IT PS"],
  [10.73246, 45.21379, "1169 Agricampeggio & Sosta Natura Mantova Ovest IT CS"],
  [10.04747, 45.30702, "1170 Camper Service Autostradale Cremona Nord IT CAMP"],
  [9.93778, 45.11701, "1171 Camping Riviera & Wellness Cremona Sud IT CAMP"],
  [9.9418, 45.21065, "1172 Area Sosta Comunale Cremona Est IT CS"],
  [10.01769, 45.03393, "1173 Camper Park Attrezzato Cremona Ovest IT CS"],
  [9.93311, 45.24962, "1174 Area Sosta Comunale Cremona Centro IT CAMP"],
  [10.11841, 45.06399, "1175 Camper Park Attrezzato Cremona Mare IT CAMP"],
  [9.82434, 44.97413, "1176 Agricampeggio & Sosta Natura Cremona Collina IT CS"],
  [10.08684, 45.28863, "1177 Camping Riviera & Wellness Cremona Lago IT CAMP"],
  [10.05813, 45.26365, "1178 Area Sosta Comunale Cremona Terme IT PS"],
  [9.88276, 45.11236, "1179 Camper Service Autostradale Cremona Nord IT PS"],
  [10.01478, 45.28757, "1180 Agricampeggio & Sosta Natura Cremona Sud IT AA"],
  [10.05946, 45.13031, "1181 Camper Service Autostradale Cremona Est IT AA"],
  [10.05308, 45.01042, "1182 Camper Park Attrezzato Cremona Ovest IT AA"],
  [9.8531, 45.30607, "1183 Area Sosta Comunale Cremona Centro IT CAMP"],
  [10.07809, 45.16684, "1184 Parcheggio Sosta Panoramica Cremona Mare IT PS"],
  [9.93361, 45.27618, "1185 Camper Service Autostradale Cremona Collina IT PS"],
  [9.8269, 45.15722, "1186 Agricampeggio & Sosta Natura Cremona Lago IT PS"],
  [9.91889, 45.17713, "1187 Camper Park Attrezzato Cremona Terme IT AA"],
  [10.0482, 45.04215, "1188 Camper Park Attrezzato Cremona Nord IT AA"],
  [10.11002, 45.10118, "1189 Area Sosta Comunale Cremona Sud IT CS"],
  [9.92945, 44.96962, "1190 Agricampeggio & Sosta Natura Cremona Est IT PS"],
  [9.83183, 45.25906, "1191 Camping Riviera & Wellness Cremona Ovest IT CAMP"],
  [10.08108, 45.23394, "1192 Agricampeggio & Sosta Natura Cremona Centro IT CS"],
  [9.90096, 44.99837, "1193 Camper Service Autostradale Cremona Mare IT CS"],
  [9.83193, 45.24752, "1194 Agricampeggio & Sosta Natura Cremona Collina IT CS"],
  [10.17071, 45.16647, "1195 Agricampeggio & Sosta Natura Cremona Lago IT CS"],
  [9.07004, 45.17374, "1196 Area Sosta Comunale Pavia Nord IT PS"],
  [9.15541, 45.18487, "1197 Agricampeggio & Sosta Natura Pavia Sud IT PS"],
  [9.12761, 45.02365, "1198 Parcheggio Sosta Panoramica Pavia Est IT AA"],
  [8.9743, 45.09733, "1199 Parcheggio Sosta Panoramica Pavia Ovest IT CAMP"],
  [9.19251, 45.2972, "1200 Camping Riviera & Wellness Pavia Centro IT AA"],
  [9.1322, 45.19134, "1201 Camper Service Autostradale Pavia Mare IT CS"],
  [9.12935, 45.35863, "1202 Camper Park Attrezzato Pavia Collina IT CAMP"],
  [9.11696, 45.1742, "1203 Area Sosta Comunale Pavia Lago IT PS"],
  [9.00557, 45.04631, "1204 Camping Riviera & Wellness Pavia Terme IT CAMP"],
  [9.23136, 45.18311, "1205 Camping Riviera & Wellness Pavia Nord IT PS"],
  [8.97283, 45.02254, "1206 Parcheggio Sosta Panoramica Pavia Sud IT PS"],
  [9.28085, 45.05027, "1207 Agricampeggio & Sosta Natura Pavia Est IT CAMP"],
  [9.14109, 45.31398, "1208 Camping Riviera & Wellness Pavia Ovest IT AA"],
  [9.21339, 45.19115, "1209 Camper Park Attrezzato Pavia Centro IT AA"],
  [8.95643, 45.16441, "1210 Camping Riviera & Wellness Pavia Mare IT PS"],
  [9.06281, 45.05555, "1211 Parcheggio Sosta Panoramica Pavia Collina IT CAMP"],
  [9.21671, 45.0198, "1212 Area Sosta Comunale Pavia Lago IT PS"],
  [9.18108, 45.06513, "1213 Camping Riviera & Wellness Pavia Terme IT CS"],
  [9.31183, 45.08835, "1214 Area Sosta Comunale Pavia Nord IT PS"],
  [9.22467, 45.34117, "1215 Camper Service Autostradale Pavia Sud IT AA"],
  [9.06454, 45.33613, "1216 Camper Service Autostradale Pavia Est IT CS"],
  [9.37431, 45.30185, "1217 Camper Service Autostradale Pavia Ovest IT CAMP"],
  [12.17627, 45.31642, "1218 Parcheggio Sosta Panoramica Venezia Nord IT PS"],
  [12.446, 45.36249, "1219 Area Sosta Comunale Venezia Sud IT CS"],
  [12.31898, 45.59279, "1220 Agricampeggio & Sosta Natura Venezia Est IT PS"],
  [12.46736, 45.51992, "1221 Agricampeggio & Sosta Natura Venezia Ovest IT AA"],
  [12.30845, 45.42209, "1222 Camper Park Attrezzato Venezia Centro IT PS"],
  [12.26024, 45.53281, "1223 Parcheggio Sosta Panoramica Venezia Mare IT CAMP"],
  [12.19796, 45.60907, "1224 Camper Park Attrezzato Venezia Collina IT CAMP"],
  [12.27535, 45.5654, "1225 Camper Park Attrezzato Venezia Lago IT PS"],
  [12.50154, 45.43134, "1226 Camping Riviera & Wellness Venezia Terme IT CAMP"],
  [12.44708, 45.61174, "1227 Camper Service Autostradale Venezia Nord IT PS"],
  [12.14731, 45.60349, "1228 Camper Service Autostradale Venezia Sud IT CS"],
  [12.28864, 45.57177, "1229 Area Sosta Comunale Venezia Est IT CAMP"],
  [12.27499, 45.51866, "1230 Area Sosta Comunale Venezia Ovest IT PS"],
  [12.52664, 45.43012, "1231 Area Sosta Comunale Venezia Centro IT CS"],
  [12.38293, 45.50825, "1232 Parcheggio Sosta Panoramica Venezia Mare IT CAMP"],
  [12.2615, 45.56657, "1233 Camping Riviera & Wellness Venezia Collina IT CAMP"],
  [12.43223, 45.51735, "1234 Camping Riviera & Wellness Venezia Lago IT CAMP"],
  [12.37452, 45.28975, "1235 Parcheggio Sosta Panoramica Venezia Terme IT AA"],
  [12.28579, 45.52717, "1236 Camper Park Attrezzato Venezia Nord IT CAMP"],
  [12.13573, 45.51216, "1237 Camping Riviera & Wellness Venezia Sud IT AA"],
  [12.10353, 45.37061, "1238 Camping Riviera & Wellness Venezia Est IT CS"],
  [10.96041, 45.38886, "1239 Agricampeggio & Sosta Natura Verona Nord IT AA"],
  [11.07341, 45.40762, "1240 Parcheggio Sosta Panoramica Verona Sud IT CS"],
  [11.04087, 45.32467, "1241 Camper Park Attrezzato Verona Est IT CS"],
  [10.99055, 45.5025, "1242 Parcheggio Sosta Panoramica Verona Ovest IT PS"],
  [10.88089, 45.4248, "1243 Camper Park Attrezzato Verona Centro IT CS"],
  [11.12868, 45.26669, "1244 Camping Riviera & Wellness Verona Mare IT CAMP"],
  [10.79984, 45.45471, "1245 Camping Riviera & Wellness Verona Collina IT CAMP"],
  [11.19951, 45.3681, "1246 Parcheggio Sosta Panoramica Verona Lago IT CAMP"],
  [10.85625, 45.55926, "1247 Camper Service Autostradale Verona Terme IT CAMP"],
  [10.93821, 45.30073, "1248 Camper Service Autostradale Verona Nord IT PS"],
  [11.08128, 45.36696, "1249 Parcheggio Sosta Panoramica Verona Sud IT CAMP"],
  [10.77024, 45.40193, "1250 Camping Riviera & Wellness Verona Est IT AA"],
  [11.14138, 45.52421, "1251 Parcheggio Sosta Panoramica Verona Ovest IT AA"],
  [10.92514, 45.47587, "1252 Camper Park Attrezzato Verona Centro IT CAMP"],
  [11.10661, 45.35112, "1253 Parcheggio Sosta Panoramica Verona Mare IT CS"],
  [11.04896, 45.29741, "1254 Camping Riviera & Wellness Verona Collina IT CS"],
  [10.78161, 45.53941, "1255 Agricampeggio & Sosta Natura Verona Lago IT AA"],
  [11.17593, 45.30939, "1256 Camping Riviera & Wellness Verona Terme IT CAMP"],
  [10.85696, 45.40883, "1257 Camping Riviera & Wellness Verona Nord IT CAMP"],
  [10.88924, 45.43903, "1258 Parcheggio Sosta Panoramica Verona Sud IT CAMP"],
  [11.19148, 45.58332, "1259 Agricampeggio & Sosta Natura Verona Est IT CS"],
  [11.1285, 45.56804, "1260 Camping Riviera & Wellness Verona Ovest IT CAMP"],
  [11.20153, 45.31266, "1261 Area Sosta Comunale Verona Centro IT PS"],
  [11.65806, 45.50814, "1262 Area Sosta Comunale Padova Nord IT CAMP"],
  [11.98886, 45.3604, "1263 Camper Service Autostradale Padova Sud IT AA"],
  [11.93915, 45.36476, "1264 Parcheggio Sosta Panoramica Padova Est IT CAMP"],
  [11.86396, 45.46759, "1265 Area Sosta Comunale Padova Ovest IT CAMP"],
  [11.68025, 45.30888, "1266 Parcheggio Sosta Panoramica Padova Centro IT CAMP"],
  [11.83553, 45.33717, "1267 Camping Riviera & Wellness Padova Mare IT PS"],
  [11.78876, 45.56259, "1268 Area Sosta Comunale Padova Collina IT CS"],
  [12.05107, 45.26542, "1269 Area Sosta Comunale Padova Lago IT PS"],
  [11.95352, 45.39018, "1270 Camper Service Autostradale Padova Terme IT CS"],
  [11.72134, 45.49119, "1271 Parcheggio Sosta Panoramica Padova Nord IT PS"],
  [11.87201, 45.26606, "1272 Camping Riviera & Wellness Padova Sud IT PS"],
  [11.81854, 45.24285, "1273 Agricampeggio & Sosta Natura Padova Est IT PS"],
  [12.03675, 45.56409, "1274 Camper Service Autostradale Padova Ovest IT PS"],
  [12.05756, 45.35997, "1275 Camping Riviera & Wellness Padova Centro IT AA"],
  [11.73721, 45.37075, "1276 Area Sosta Comunale Padova Mare IT CAMP"],
  [11.74725, 45.26349, "1277 Camper Service Autostradale Padova Collina IT AA"],
  [11.76141, 45.50678, "1278 Area Sosta Comunale Padova Lago IT AA"],
  [12.02522, 45.30322, "1279 Parcheggio Sosta Panoramica Padova Terme IT CS"],
  [12.04316, 45.30698, "1280 Parcheggio Sosta Panoramica Padova Nord IT CS"],
  [11.91999, 45.50743, "1281 Camper Park Attrezzato Padova Sud IT CAMP"],
  [11.8949, 45.57703, "1282 Camper Park Attrezzato Padova Est IT CAMP"],
  [11.6634, 45.46277, "1283 Area Sosta Comunale Padova Ovest IT CS"],
  [11.75887, 45.50789, "1284 Agricampeggio & Sosta Natura Padova Centro IT AA"],
  [11.67538, 45.29239, "1285 Area Sosta Comunale Padova Mare IT CAMP"],
  [12.21972, 45.51415, "1286 Camping Riviera & Wellness Treviso Nord IT AA"],
  [12.2214, 45.69968, "1287 Parcheggio Sosta Panoramica Treviso Sud IT CAMP"],
  [12.37045, 45.50708, "1288 Parcheggio Sosta Panoramica Treviso Est IT CS"],
  [12.03202, 45.71707, "1289 Camper Service Autostradale Treviso Ovest IT CAMP"],
  [12.06658, 45.6411, "1290 Camper Service Autostradale Treviso Centro IT PS"],
  [12.16295, 45.80664, "1291 Area Sosta Comunale Treviso Mare IT PS"],
  [12.29894, 45.53607, "1292 Area Sosta Comunale Treviso Collina IT CS"],
  [12.25675, 45.84002, "1293 Camper Service Autostradale Treviso Lago IT CAMP"],
  [12.06263, 45.7038, "1294 Parcheggio Sosta Panoramica Treviso Terme IT PS"],
  [12.36403, 45.71972, "1295 Camping Riviera & Wellness Treviso Nord IT AA"],
  [12.12082, 45.64994, "1296 Camper Service Autostradale Treviso Sud IT CS"],
  [12.34633, 45.63146, "1297 Camper Service Autostradale Treviso Est IT CAMP"],
  [12.1327, 45.60128, "1298 Camper Service Autostradale Treviso Ovest IT CAMP"],
  [12.04821, 45.81494, "1299 Camping Riviera & Wellness Treviso Centro IT CS"],
  [12.35307, 45.64306, "1300 Area Sosta Comunale Treviso Mare IT AA"],
  [12.28191, 45.68663, "1301 Camper Park Attrezzato Treviso Collina IT CAMP"],
  [12.17712, 45.53468, "1302 Camping Riviera & Wellness Treviso Lago IT CAMP"],
  [12.14743, 45.50991, "1303 Camping Riviera & Wellness Treviso Terme IT PS"],
  [12.24634, 45.52816, "1304 Agricampeggio & Sosta Natura Treviso Nord IT CAMP"],
  [12.39927, 45.66067, "1305 Camping Riviera & Wellness Treviso Sud IT CS"],
  [12.36117, 45.62055, "1306 Parcheggio Sosta Panoramica Treviso Est IT CAMP"],
  [12.45655, 45.7877, "1307 Camper Service Autostradale Treviso Ovest IT CS"],
  [12.39126, 45.81708, "1308 Parcheggio Sosta Panoramica Treviso Centro IT AA"],
  [12.33421, 45.55505, "1309 Area Sosta Comunale Treviso Mare IT CAMP"],
  [11.70194, 45.37264, "1310 Agricampeggio & Sosta Natura Vicenza Nord IT CAMP"],
  [11.59543, 45.42016, "1311 Area Sosta Comunale Vicenza Sud IT PS"],
  [11.40731, 45.63164, "1312 Area Sosta Comunale Vicenza Est IT AA"],
  [11.47702, 45.48981, "1313 Camper Service Autostradale Vicenza Ovest IT PS"],
  [11.708, 45.57918, "1314 Parcheggio Sosta Panoramica Vicenza Centro IT CAMP"],
  [11.33289, 45.63455, "1315 Camper Park Attrezzato Vicenza Mare IT CS"],
  [11.50131, 45.52559, "1316 Agricampeggio & Sosta Natura Vicenza Collina IT AA"],
  [11.65022, 45.46611, "1317 Camper Service Autostradale Vicenza Lago IT PS"],
  [11.43796, 45.52097, "1318 Agricampeggio & Sosta Natura Vicenza Terme IT AA"],
  [11.33094, 45.604, "1319 Parcheggio Sosta Panoramica Vicenza Nord IT PS"],
  [11.40249, 45.38967, "1320 Parcheggio Sosta Panoramica Vicenza Sud IT PS"],
  [11.44075, 45.63796, "1321 Camper Park Attrezzato Vicenza Est IT CS"],
  [11.50429, 45.54458, "1322 Area Sosta Comunale Vicenza Ovest IT AA"],
  [11.41405, 45.5569, "1323 Camper Service Autostradale Vicenza Centro IT CS"],
  [11.64442, 45.50947, "1324 Area Sosta Comunale Vicenza Mare IT CAMP"],
  [11.34554, 45.53141, "1325 Area Sosta Comunale Vicenza Collina IT PS"],
  [11.49249, 45.52075, "1326 Parcheggio Sosta Panoramica Vicenza Lago IT CAMP"],
  [11.31989, 45.41081, "1327 Agricampeggio & Sosta Natura Vicenza Terme IT PS"],
  [11.58866, 45.65096, "1328 Camper Park Attrezzato Vicenza Nord IT CAMP"],
  [11.35814, 45.52335, "1329 Area Sosta Comunale Vicenza Sud IT CAMP"],
  [11.34589, 45.51066, "1330 Parcheggio Sosta Panoramica Vicenza Est IT PS"],
  [11.46038, 45.48933, "1331 Camping Riviera & Wellness Vicenza Ovest IT CAMP"],
  [12.23057, 46.18543, "1332 Parcheggio Sosta Panoramica Belluno Nord IT AA"],
  [12.423, 46.08668, "1333 Agricampeggio & Sosta Natura Belluno Sud IT CS"],
  [12.10699, 45.99978, "1334 Camper Park Attrezzato Belluno Est IT CS"],
  [12.33342, 46.0173, "1335 Parcheggio Sosta Panoramica Belluno Ovest IT CS"],
  [12.27438, 46.29675, "1336 Camper Park Attrezzato Belluno Centro IT AA"],
  [12.19381, 46.22976, "1337 Parcheggio Sosta Panoramica Belluno Mare IT PS"],
  [12.18969, 46.07445, "1338 Camping Riviera & Wellness Belluno Collina IT CAMP"],
  [12.35015, 46.18478, "1339 Camper Service Autostradale Belluno Lago IT PS"],
  [12.13148, 46.14137, "1340 Agricampeggio & Sosta Natura Belluno Terme IT AA"],
  [12.36606, 45.98371, "1341 Area Sosta Comunale Belluno Nord IT PS"],
  [12.37668, 46.26629, "1342 Camping Riviera & Wellness Belluno Sud IT AA"],
  [12.4212, 46.16692, "1343 Camper Service Autostradale Belluno Est IT PS"],
  [12.24905, 46.28197, "1344 Camper Service Autostradale Belluno Ovest IT AA"],
  [12.21742, 46.17555, "1345 Agricampeggio & Sosta Natura Belluno Centro IT CS"],
  [12.39641, 46.00003, "1346 Camper Service Autostradale Belluno Mare IT AA"],
  [12.28256, 45.99332, "1347 Camping Riviera & Wellness Belluno Collina IT CAMP"],
  [12.43774, 46.21147, "1348 Camper Park Attrezzato Belluno Lago IT AA"],
  [12.1191, 46.0943, "1349 Agricampeggio & Sosta Natura Belluno Terme IT CS"],
  [12.01536, 46.20141, "1350 Agricampeggio & Sosta Natura Belluno Nord IT PS"],
  [12.24288, 46.07919, "1351 Area Sosta Comunale Belluno Sud IT CAMP"],
  [11.86075, 45.14901, "1352 Agricampeggio & Sosta Natura Rovigo Nord IT CAMP"],
  [11.86393, 44.92423, "1353 Agricampeggio & Sosta Natura Rovigo Sud IT CS"],
  [11.87962, 45.23439, "1354 Agricampeggio & Sosta Natura Rovigo Est IT CAMP"],
  [11.9874, 45.10396, "1355 Camper Park Attrezzato Rovigo Ovest IT PS"],
  [11.92155, 45.02754, "1356 Parcheggio Sosta Panoramica Rovigo Centro IT CAMP"],
  [11.9915, 45.14169, "1357 Camping Riviera & Wellness Rovigo Mare IT CS"],
  [11.79412, 45.13036, "1358 Camping Riviera & Wellness Rovigo Collina IT AA"],
  [11.99333, 45.0038, "1359 Agricampeggio & Sosta Natura Rovigo Lago IT AA"],
  [12.01529, 44.9629, "1360 Camper Service Autostradale Rovigo Terme IT CAMP"],
  [11.91995, 44.99923, "1361 Area Sosta Comunale Rovigo Nord IT CS"],
  [11.91014, 45.01357, "1362 Camping Riviera & Wellness Rovigo Sud IT AA"],
  [11.63831, 45.02755, "1363 Parcheggio Sosta Panoramica Rovigo Est IT CS"],
  [11.75019, 45.04889, "1364 Camping Riviera & Wellness Rovigo Ovest IT CS"],
  [11.90388, 45.10941, "1365 Camper Service Autostradale Rovigo Centro IT CS"],
  [11.70456, 45.0826, "1366 Camper Park Attrezzato Rovigo Mare IT PS"],
  [11.99151, 45.02444, "1367 Camper Park Attrezzato Rovigo Collina IT PS"],
  [11.91546, 45.165, "1368 Camper Service Autostradale Rovigo Lago IT PS"],
  [11.92587, 45.18161, "1369 Camper Park Attrezzato Rovigo Terme IT PS"],
  [11.78157, 44.91396, "1370 Agricampeggio & Sosta Natura Rovigo Nord IT CS"],
  [11.88543, 45.2227, "1371 Parcheggio Sosta Panoramica Rovigo Sud IT CAMP"],
  [11.63744, 44.92506, "1372 Agricampeggio & Sosta Natura Rovigo Est IT AA"],
  [11.76216, 44.94727, "1373 Parcheggio Sosta Panoramica Rovigo Ovest IT PS"],
  [11.98401, 45.20532, "1374 Camper Service Autostradale Rovigo Centro IT CS"],
  [11.73358, 45.03446, "1375 Area Sosta Comunale Rovigo Mare IT PS"],
  [11.03951, 45.97149, "1376 Agricampeggio & Sosta Natura Trento Nord IT AA"],
  [11.25222, 46.12039, "1377 Camping Riviera & Wellness Trento Sud IT AA"],
  [11.26949, 45.99331, "1378 Area Sosta Comunale Trento Est IT CS"],
  [11.17301, 46.05709, "1379 Camping Riviera & Wellness Trento Ovest IT CS"],
  [11.27183, 45.98247, "1380 Area Sosta Comunale Trento Centro IT AA"],
  [11.00304, 46.16456, "1381 Area Sosta Comunale Trento Mare IT PS"],
  [11.18363, 45.97635, "1382 Area Sosta Comunale Trento Collina IT AA"],
  [11.30342, 45.9317, "1383 Area Sosta Comunale Trento Lago IT PS"],
  [11.00497, 46.07328, "1384 Camping Riviera & Wellness Trento Terme IT AA"],
  [11.17276, 46.04313, "1385 Agricampeggio & Sosta Natura Trento Nord IT CS"],
  [11.19507, 46.0387, "1386 Parcheggio Sosta Panoramica Trento Sud IT CS"],
  [10.92656, 46.23403, "1387 Parcheggio Sosta Panoramica Trento Est IT AA"],
  [10.91569, 46.19857, "1388 Camper Service Autostradale Trento Ovest IT AA"],
  [10.90341, 45.98168, "1389 Agricampeggio & Sosta Natura Trento Centro IT PS"],
  [11.1918, 45.97729, "1390 Agricampeggio & Sosta Natura Trento Mare IT AA"],
  [11.04573, 46.15022, "1391 Parcheggio Sosta Panoramica Trento Collina IT AA"],
  [11.26218, 46.084, "1392 Agricampeggio & Sosta Natura Trento Lago IT AA"],
  [11.20903, 46.05552, "1393 Camping Riviera & Wellness Trento Terme IT CS"],
  [11.24539, 45.91499, "1394 Camper Park Attrezzato Trento Nord IT CS"],
  [10.91581, 45.9956, "1395 Area Sosta Comunale Trento Sud IT PS"],
  [11.03563, 46.00336, "1396 Area Sosta Comunale Trento Est IT CS"],
  [10.91258, 46.05859, "1397 Parcheggio Sosta Panoramica Trento Ovest IT PS"],
  [11.24748, 46.01784, "1398 Agricampeggio & Sosta Natura Trento Centro IT CS"],
  [11.06171, 45.93647, "1399 Agricampeggio & Sosta Natura Trento Mare IT CAMP"],
  [11.21387, 46.44196, "1400 Camper Service Autostradale Bolzano Nord IT PS"],
  [11.36347, 46.64681, "1401 Agricampeggio & Sosta Natura Bolzano Sud IT PS"],
  [11.32357, 46.47187, "1402 Camping Riviera & Wellness Bolzano Est IT AA"],
  [11.17597, 46.42612, "1403 Parcheggio Sosta Panoramica Bolzano Ovest IT CS"],
  [11.33046, 46.42677, "1404 Camping Riviera & Wellness Bolzano Centro IT CAMP"],
  [11.288, 46.56472, "1405 Camper Park Attrezzato Bolzano Mare IT PS"],
  [11.28845, 46.62781, "1406 Camping Riviera & Wellness Bolzano Collina IT AA"],
  [11.48597, 46.54711, "1407 Agricampeggio & Sosta Natura Bolzano Lago IT PS"],
  [11.31259, 46.55821, "1408 Area Sosta Comunale Bolzano Terme IT AA"],
  [11.40321, 46.37327, "1409 Area Sosta Comunale Bolzano Nord IT CS"],
  [11.236, 46.36748, "1410 Area Sosta Comunale Bolzano Sud IT PS"],
  [11.38506, 46.4573, "1411 Agricampeggio & Sosta Natura Bolzano Est IT CAMP"],
  [11.29673, 46.48077, "1412 Camping Riviera & Wellness Bolzano Ovest IT CS"],
  [11.36806, 46.52417, "1413 Area Sosta Comunale Bolzano Centro IT PS"],
  [11.24213, 46.55065, "1414 Agricampeggio & Sosta Natura Bolzano Mare IT PS"],
  [11.35437, 46.58079, "1415 Area Sosta Comunale Bolzano Collina IT AA"],
  [11.47853, 46.36452, "1416 Parcheggio Sosta Panoramica Bolzano Lago IT PS"],
  [11.25831, 46.67203, "1417 Camper Park Attrezzato Bolzano Terme IT PS"],
  [11.51357, 46.36622, "1418 Camper Park Attrezzato Bolzano Nord IT PS"],
  [11.3301, 46.63784, "1419 Camper Park Attrezzato Bolzano Sud IT PS"],
  [11.57376, 46.66195, "1420 Camping Riviera & Wellness Bolzano Est IT AA"],
  [11.37378, 46.34603, "1421 Camping Riviera & Wellness Bolzano Ovest IT CAMP"],
  [11.5471, 46.57243, "1422 Camper Park Attrezzato Bolzano Centro IT CAMP"],
  [11.18441, 46.50136, "1423 Agricampeggio & Sosta Natura Bolzano Mare IT CS"],
  [10.62963, 45.98743, "1424 Camper Park Attrezzato Riva del Garda Nord IT CS"],
  [10.86604, 45.99208, "1425 Camper Service Autostradale Riva del Garda Sud IT CAMP"],
  [11.06762, 45.81905, "1426 Area Sosta Comunale Riva del Garda Est IT AA"],
  [10.80205, 45.85458, "1427 Parcheggio Sosta Panoramica Riva del Garda Ovest IT PS"],
  [10.90685, 46.05113, "1428 Camper Park Attrezzato Riva del Garda Centro IT AA"],
  [10.77283, 45.94884, "1429 Camper Service Autostradale Riva del Garda Mare IT PS"],
  [11.02762, 45.86222, "1430 Camper Park Attrezzato Riva del Garda Collina IT CS"],
  [10.75466, 45.89214, "1431 Area Sosta Comunale Riva del Garda Lago IT AA"],
  [10.71926, 46.03796, "1432 Agricampeggio & Sosta Natura Riva del Garda Terme IT CS"],
  [10.90358, 45.79851, "1433 Area Sosta Comunale Riva del Garda Nord IT CAMP"],
  [10.89429, 45.92956, "1434 Camper Park Attrezzato Riva del Garda Sud IT CAMP"],
  [10.88411, 45.93515, "1435 Parcheggio Sosta Panoramica Riva del Garda Est IT AA"],
  [10.94208, 45.94136, "1436 Camper Park Attrezzato Riva del Garda Ovest IT CS"],
  [11.0065, 45.72522, "1437 Parcheggio Sosta Panoramica Riva del Garda Centro IT CAMP"],
  [10.96476, 46.04279, "1438 Area Sosta Comunale Riva del Garda Mare IT AA"],
  [10.87526, 45.78458, "1439 Camping Riviera & Wellness Riva del Garda Collina IT CAMP"],
  [10.86331, 46.02195, "1440 Camper Service Autostradale Riva del Garda Lago IT AA"],
  [10.98111, 45.79651, "1441 Camper Service Autostradale Riva del Garda Terme IT CAMP"],
  [10.92768, 45.86954, "1442 Agricampeggio & Sosta Natura Riva del Garda Nord IT PS"],
  [10.8268, 45.85627, "1443 Camper Service Autostradale Riva del Garda Sud IT CS"],
  [11.00547, 45.76108, "1444 Parcheggio Sosta Panoramica Riva del Garda Est IT CAMP"],
  [11.71264, 46.34717, "1445 Camper Service Autostradale Canazei Nord IT CAMP"],
  [11.60103, 46.38601, "1446 Agricampeggio & Sosta Natura Canazei Sud IT AA"],
  [11.56867, 46.35071, "1447 Camper Park Attrezzato Canazei Est IT PS"],
  [11.97911, 46.44775, "1448 Parcheggio Sosta Panoramica Canazei Ovest IT PS"],
  [11.87041, 46.62821, "1449 Agricampeggio & Sosta Natura Canazei Centro IT CS"],
  [11.77753, 46.47579, "1450 Camper Park Attrezzato Canazei Mare IT CS"],
  [11.58642, 46.47548, "1451 Agricampeggio & Sosta Natura Canazei Collina IT PS"],
  [11.65423, 46.46143, "1452 Parcheggio Sosta Panoramica Canazei Lago IT PS"],
  [11.7686, 46.31909, "1453 Area Sosta Comunale Canazei Terme IT CAMP"],
  [11.92713, 46.48924, "1454 Agricampeggio & Sosta Natura Canazei Nord IT PS"],
  [11.87328, 46.61026, "1455 Camper Park Attrezzato Canazei Sud IT PS"],
  [11.56892, 46.31723, "1456 Agricampeggio & Sosta Natura Canazei Est IT PS"],
  [11.57899, 46.49503, "1457 Agricampeggio & Sosta Natura Canazei Ovest IT CS"],
  [11.99099, 46.3993, "1458 Parcheggio Sosta Panoramica Canazei Centro IT PS"],
  [11.72316, 46.64268, "1459 Camper Park Attrezzato Canazei Mare IT AA"],
  [11.88563, 46.63003, "1460 Parcheggio Sosta Panoramica Canazei Collina IT CAMP"],
  [11.77094, 46.47959, "1461 Parcheggio Sosta Panoramica Canazei Lago IT CS"],
  [11.69577, 46.34936, "1462 Area Sosta Comunale Canazei Terme IT AA"],
  [11.81872, 46.46135, "1463 Parcheggio Sosta Panoramica Canazei Nord IT PS"],
  [11.68924, 46.62738, "1464 Agricampeggio & Sosta Natura Canazei Sud IT CS"],
  [11.68056, 46.56016, "1465 Parcheggio Sosta Panoramica Canazei Est IT PS"],
  [11.78545, 46.5913, "1466 Parcheggio Sosta Panoramica Canazei Ovest IT CAMP"],
  [11.71166, 46.58691, "1467 Camper Service Autostradale Canazei Centro IT CAMP"],
  [11.33885, 46.60399, "1468 Parcheggio Sosta Panoramica Merano Nord IT PS"],
  [11.36958, 46.66241, "1469 Parcheggio Sosta Panoramica Merano Sud IT AA"],
  [11.1506, 46.51427, "1470 Camping Riviera & Wellness Merano Est IT CS"],
  [11.04339, 46.78388, "1471 Camper Park Attrezzato Merano Ovest IT PS"],
  [11.07556, 46.50293, "1472 Camper Park Attrezzato Merano Centro IT AA"],
  [11.11907, 46.73798, "1473 Camper Service Autostradale Merano Mare IT CS"],
  [11.252, 46.75089, "1474 Camping Riviera & Wellness Merano Collina IT PS"],
  [11.2324, 46.61007, "1475 Parcheggio Sosta Panoramica Merano Lago IT CS"],
  [11.14125, 46.83114, "1476 Agricampeggio & Sosta Natura Merano Terme IT PS"],
  [11.2818, 46.6203, "1477 Parcheggio Sosta Panoramica Merano Nord IT CAMP"],
  [11.3652, 46.66576, "1478 Parcheggio Sosta Panoramica Merano Sud IT CAMP"],
  [11.35807, 46.60077, "1479 Parcheggio Sosta Panoramica Merano Est IT CAMP"],
  [11.24501, 46.74302, "1480 Agricampeggio & Sosta Natura Merano Ovest IT CAMP"],
  [11.18662, 46.66423, "1481 Agricampeggio & Sosta Natura Merano Centro IT PS"],
  [11.23888, 46.53896, "1482 Agricampeggio & Sosta Natura Merano Mare IT CAMP"],
  [11.36397, 46.78273, "1483 Camper Service Autostradale Merano Collina IT PS"],
  [11.36429, 46.51102, "1484 Agricampeggio & Sosta Natura Merano Lago IT CS"],
  [11.22959, 46.8197, "1485 Agricampeggio & Sosta Natura Merano Terme IT AA"],
  [11.17676, 46.56702, "1486 Camper Park Attrezzato Merano Nord IT PS"],
  [12.0439, 46.65953, "1487 Camper Park Attrezzato Brunico Nord IT CAMP"],
  [12.11783, 46.63907, "1488 Camper Park Attrezzato Brunico Sud IT CS"],
  [11.75559, 46.70279, "1489 Camping Riviera & Wellness Brunico Est IT CS"],
  [12.01704, 46.78664, "1490 Camping Riviera & Wellness Brunico Ovest IT CAMP"],
  [12.15056, 46.95888, "1491 Area Sosta Comunale Brunico Centro IT CS"],
  [12.10679, 46.84981, "1492 Camper Service Autostradale Brunico Mare IT CS"],
  [12.05066, 46.84899, "1493 Camper Service Autostradale Brunico Collina IT PS"],
  [11.73712, 46.7212, "1494 Agricampeggio & Sosta Natura Brunico Lago IT CAMP"],
  [11.95132, 46.82225, "1495 Camping Riviera & Wellness Brunico Terme IT AA"],
  [12.08742, 46.76756, "1496 Camper Park Attrezzato Brunico Nord IT AA"],
  [11.79434, 46.89709, "1497 Camper Service Autostradale Brunico Sud IT AA"],
  [11.96608, 46.62454, "1498 Area Sosta Comunale Brunico Est IT CAMP"],
  [12.15559, 46.7209, "1499 Agricampeggio & Sosta Natura Brunico Ovest IT AA"],
  [11.92111, 46.91917, "1500 Camper Park Attrezzato Brunico Centro IT PS"],
  [12.0395, 46.73704, "1501 Area Sosta Comunale Brunico Mare IT CS"],
  [12.04198, 46.68647, "1502 Camping Riviera & Wellness Brunico Collina IT CAMP"],
  [11.79742, 46.85734, "1503 Parcheggio Sosta Panoramica Brunico Lago IT CAMP"],
  [11.74953, 46.80165, "1504 Camper Service Autostradale Brunico Terme IT PS"],
  [11.92535, 46.96489, "1505 Camper Park Attrezzato Brunico Nord IT AA"],
  [11.81648, 46.71257, "1506 Area Sosta Comunale Brunico Sud IT CS"],
  [12.0358, 46.72698, "1507 Agricampeggio & Sosta Natura Brunico Est IT CAMP"],
  [12.02225, 46.85009, "1508 Agricampeggio & Sosta Natura Brunico Ovest IT AA"],
  [11.84856, 46.66268, "1509 Camping Riviera & Wellness Brunico Centro IT AA"],
  [12.1133, 46.79718, "1510 Camping Riviera & Wellness Brunico Mare IT PS"],
  [12.12276, 46.6624, "1511 Camping Riviera & Wellness Brunico Collina IT CAMP"],
  [11.80911, 46.83642, "1512 Agricampeggio & Sosta Natura Brunico Lago IT CAMP"],
  [7.90688, 45.05454, "1513 Camper Park Attrezzato Torino Nord IT PS"],
  [7.87266, 45.14098, "1514 Camper Service Autostradale Torino Sud IT CAMP"],
  [7.73002, 45.13342, "1515 Camper Park Attrezzato Torino Est IT CS"],
  [7.77859, 45.05166, "1516 Parcheggio Sosta Panoramica Torino Ovest IT AA"],
  [7.83485, 44.93457, "1517 Parcheggio Sosta Panoramica Torino Centro IT AA"],
  [7.53594, 45.08313, "1518 Parcheggio Sosta Panoramica Torino Mare IT CS"],
  [7.78451, 45.1334, "1519 Area Sosta Comunale Torino Collina IT PS"],
  [7.66237, 45.20991, "1520 Area Sosta Comunale Torino Lago IT PS"],
  [7.64884, 44.94148, "1521 Camper Service Autostradale Torino Terme IT AA"],
  [7.82501, 45.05713, "1522 Parcheggio Sosta Panoramica Torino Nord IT AA"],
  [7.46326, 44.98436, "1523 Camper Service Autostradale Torino Sud IT AA"],
  [7.65256, 44.92086, "1524 Parcheggio Sosta Panoramica Torino Est IT CS"],
  [7.88246, 45.24324, "1525 Parcheggio Sosta Panoramica Torino Ovest IT AA"],
  [7.64589, 44.90641, "1526 Camper Service Autostradale Torino Centro IT AA"],
  [7.75255, 45.23772, "1527 Camping Riviera & Wellness Torino Mare IT CS"],
  [7.63402, 45.2428, "1528 Agricampeggio & Sosta Natura Torino Collina IT PS"],
  [7.89576, 44.92339, "1529 Camper Service Autostradale Torino Lago IT PS"],
  [7.51528, 45.1964, "1530 Camping Riviera & Wellness Torino Terme IT CS"],
  [7.90233, 44.93987, "1531 Parcheggio Sosta Panoramica Torino Nord IT PS"],
  [7.67025, 45.23777, "1532 Area Sosta Comunale Torino Sud IT AA"],
  [7.42095, 44.34215, "1533 Parcheggio Sosta Panoramica Cuneo Nord IT PS"],
  [7.40242, 44.26369, "1534 Agricampeggio & Sosta Natura Cuneo Sud IT PS"],
  [7.50626, 44.49272, "1535 Area Sosta Comunale Cuneo Est IT AA"],
  [7.363, 44.28153, "1536 Camper Park Attrezzato Cuneo Ovest IT AA"],
  [7.63408, 44.41862, "1537 Camper Service Autostradale Cuneo Centro IT AA"],
  [7.49862, 44.46859, "1538 Camper Park Attrezzato Cuneo Mare IT AA"],
  [7.70628, 44.28544, "1539 Parcheggio Sosta Panoramica Cuneo Collina IT CS"],
  [7.44777, 44.38576, "1540 Camper Park Attrezzato Cuneo Lago IT AA"],
  [7.62024, 44.41867, "1541 Parcheggio Sosta Panoramica Cuneo Terme IT CAMP"],
  [7.38207, 44.31502, "1542 Camper Park Attrezzato Cuneo Nord IT CAMP"],
  [7.34503, 44.31458, "1543 Camper Service Autostradale Cuneo Sud IT CS"],
  [7.56773, 44.44696, "1544 Camping Riviera & Wellness Cuneo Est IT CS"],
  [7.6197, 44.53896, "1545 Agricampeggio & Sosta Natura Cuneo Ovest IT AA"],
  [7.38475, 44.35511, "1546 Camping Riviera & Wellness Cuneo Centro IT CAMP"],
  [7.53068, 44.47345, "1547 Camper Park Attrezzato Cuneo Mare IT PS"],
  [7.38256, 44.50954, "1548 Agricampeggio & Sosta Natura Cuneo Collina IT CS"],
  [7.7531, 44.40624, "1549 Area Sosta Comunale Cuneo Lago IT PS"],
  [7.4091, 44.2944, "1550 Camper Service Autostradale Cuneo Terme IT CS"],
  [7.35921, 44.5059, "1551 Camper Service Autostradale Cuneo Nord IT AA"],
  [7.62075, 44.30336, "1552 Area Sosta Comunale Cuneo Sud IT CS"],
  [7.66036, 44.27526, "1553 Area Sosta Comunale Cuneo Est IT AA"],
  [7.72576, 44.28251, "1554 Camper Service Autostradale Cuneo Ovest IT CS"],
  [7.40311, 44.28353, "1555 Area Sosta Comunale Cuneo Centro IT CAMP"],
  [7.53311, 44.55925, "1556 Camping Riviera & Wellness Cuneo Mare IT AA"],
  [7.40963, 44.42094, "1557 Camping Riviera & Wellness Cuneo Collina IT CS"],
  [7.44498, 44.32197, "1558 Parcheggio Sosta Panoramica Cuneo Lago IT CS"],
  [8.21247, 44.81735, "1559 Agricampeggio & Sosta Natura Asti Nord IT CAMP"],
  [8.42329, 44.76031, "1560 Camper Service Autostradale Asti Sud IT PS"],
  [8.14852, 45.04582, "1561 Agricampeggio & Sosta Natura Asti Est IT PS"],
  [8.08127, 44.92268, "1562 Area Sosta Comunale Asti Ovest IT PS"],
  [8.40234, 44.81707, "1563 Area Sosta Comunale Asti Centro IT CS"],
  [8.13014, 44.77914, "1564 Agricampeggio & Sosta Natura Asti Mare IT PS"],
  [8.20639, 45.01748, "1565 Parcheggio Sosta Panoramica Asti Collina IT PS"],
  [8.20158, 44.99298, "1566 Agricampeggio & Sosta Natura Asti Lago IT CAMP"],
  [8.33944, 44.78468, "1567 Camper Service Autostradale Asti Terme IT PS"],
  [8.20144, 44.97791, "1568 Camper Park Attrezzato Asti Nord IT CS"],
  [8.36271, 44.73764, "1569 Parcheggio Sosta Panoramica Asti Sud IT AA"],
  [8.36085, 44.87014, "1570 Area Sosta Comunale Asti Est IT AA"],
  [7.98581, 44.97331, "1571 Area Sosta Comunale Asti Ovest IT CS"],
  [8.26868, 44.74696, "1572 Agricampeggio & Sosta Natura Asti Centro IT PS"],
  [7.98468, 44.89655, "1573 Camping Riviera & Wellness Asti Mare IT PS"],
  [8.30669, 44.73165, "1574 Area Sosta Comunale Asti Collina IT PS"],
  [8.29574, 44.90158, "1575 Area Sosta Comunale Asti Lago IT CAMP"],
  [8.02504, 44.76326, "1576 Camper Park Attrezzato Asti Terme IT PS"],
  [8.21861, 44.79298, "1577 Camper Park Attrezzato Asti Nord IT CS"],
  [8.01726, 45.00403, "1578 Agricampeggio & Sosta Natura Asti Sud IT CAMP"],
  [8.4273, 44.92355, "1579 Camper Service Autostradale Asti Est IT PS"],
  [8.36324, 44.96521, "1580 Agricampeggio & Sosta Natura Asti Ovest IT CS"],
  [8.15143, 44.86765, "1581 Area Sosta Comunale Asti Centro IT AA"],
  [8.29798, 44.94866, "1582 Area Sosta Comunale Asti Mare IT PS"],
  [8.27191, 45.02167, "1583 Camper Service Autostradale Asti Collina IT AA"],
  [8.49359, 45.0596, "1584 Parcheggio Sosta Panoramica Alessandria Nord IT AA"],
  [8.42366, 44.7542, "1585 Agricampeggio & Sosta Natura Alessandria Sud IT PS"],
  [8.40501, 44.93513, "1586 Parcheggio Sosta Panoramica Alessandria Est IT CAMP"],
  [8.65437, 45.07441, "1587 Area Sosta Comunale Alessandria Ovest IT CAMP"],
  [8.64398, 44.84265, "1588 Area Sosta Comunale Alessandria Centro IT PS"],
  [8.53948, 45.05168, "1589 Camping Riviera & Wellness Alessandria Mare IT PS"],
  [8.61556, 44.99136, "1590 Camping Riviera & Wellness Alessandria Collina IT CS"],
  [8.49466, 44.77209, "1591 Area Sosta Comunale Alessandria Lago IT CAMP"],
  [8.66644, 44.94971, "1592 Agricampeggio & Sosta Natura Alessandria Terme IT AA"],
  [8.5132, 44.74827, "1593 Agricampeggio & Sosta Natura Alessandria Nord IT PS"],
  [8.63907, 44.81775, "1594 Camper Service Autostradale Alessandria Sud IT PS"],
  [8.65384, 44.80291, "1595 Camper Service Autostradale Alessandria Est IT PS"],
  [8.52312, 45.00816, "1596 Area Sosta Comunale Alessandria Ovest IT PS"],
  [8.51079, 44.76363, "1597 Camping Riviera & Wellness Alessandria Centro IT CS"],
  [8.45962, 45.01226, "1598 Camping Riviera & Wellness Alessandria Mare IT PS"],
  [8.43138, 44.86415, "1599 Agricampeggio & Sosta Natura Alessandria Collina IT PS"],
  [8.51159, 44.86387, "1600 Camper Service Autostradale Alessandria Lago IT CAMP"],
  [8.59218, 44.80349, "1601 Area Sosta Comunale Alessandria Terme IT CS"],
  [8.54946, 44.74709, "1602 Area Sosta Comunale Alessandria Nord IT PS"],
  [8.53619, 44.94722, "1603 Parcheggio Sosta Panoramica Alessandria Sud IT AA"],
  [8.56471, 44.84005, "1604 Area Sosta Comunale Alessandria Est IT PS"],
  [8.79754, 45.0533, "1605 Camping Riviera & Wellness Alessandria Ovest IT AA"],
  [8.69859, 44.92029, "1606 Parcheggio Sosta Panoramica Alessandria Centro IT CS"],
  [8.61811, 45.3773, "1607 Agricampeggio & Sosta Natura Novara Nord IT CS"],
  [8.5857, 45.42404, "1608 Camper Park Attrezzato Novara Sud IT AA"],
  [8.8211, 45.39829, "1609 Area Sosta Comunale Novara Est IT PS"],
  [8.60224, 45.48773, "1610 Parcheggio Sosta Panoramica Novara Ovest IT PS"],
  [8.57426, 45.27427, "1611 Agricampeggio & Sosta Natura Novara Centro IT CS"],
  [8.58998, 45.42598, "1612 Agricampeggio & Sosta Natura Novara Mare IT PS"],
  [8.82248, 45.38413, "1613 Agricampeggio & Sosta Natura Novara Collina IT CS"],
  [8.83026, 45.38186, "1614 Camper Service Autostradale Novara Lago IT CS"],
  [8.68101, 45.52911, "1615 Agricampeggio & Sosta Natura Novara Terme IT CAMP"],
  [8.76362, 45.40352, "1616 Agricampeggio & Sosta Natura Novara Nord IT CS"],
  [8.64993, 45.31176, "1617 Agricampeggio & Sosta Natura Novara Sud IT PS"],
  [8.40831, 45.54057, "1618 Camping Riviera & Wellness Novara Est IT CS"],
  [8.75516, 45.34528, "1619 Camping Riviera & Wellness Novara Ovest IT PS"],
  [8.45883, 45.50744, "1620 Camper Service Autostradale Novara Centro IT AA"],
  [8.46556, 45.36034, "1621 Camper Park Attrezzato Novara Mare IT CAMP"],
  [8.84202, 45.29779, "1622 Camper Service Autostradale Novara Collina IT PS"],
  [8.62418, 45.41218, "1623 Parcheggio Sosta Panoramica Novara Lago IT PS"],
  [8.83199, 45.28477, "1624 Parcheggio Sosta Panoramica Novara Terme IT PS"],
  [8.69212, 45.54103, "1625 Area Sosta Comunale Novara Nord IT AA"],
  [8.41613, 45.49835, "1626 Camper Park Attrezzato Novara Sud IT CAMP"],
  [8.37067, 45.78418, "1627 Camper Service Autostradale Verbania Nord IT CAMP"],
  [8.5774, 46.0085, "1628 Parcheggio Sosta Panoramica Verbania Sud IT CS"],
  [8.53468, 45.87804, "1629 Camper Service Autostradale Verbania Est IT CS"],
  [8.54355, 46.0963, "1630 Agricampeggio & Sosta Natura Verbania Ovest IT CS"],
  [8.36493, 46.06929, "1631 Camper Service Autostradale Verbania Centro IT CAMP"],
  [8.5312, 45.85626, "1632 Agricampeggio & Sosta Natura Verbania Mare IT CS"],
  [8.54057, 45.91612, "1633 Parcheggio Sosta Panoramica Verbania Collina IT CS"],
  [8.46981, 45.99097, "1634 Camping Riviera & Wellness Verbania Lago IT PS"],
  [8.37809, 46.03067, "1635 Area Sosta Comunale Verbania Terme IT CAMP"],
  [8.68632, 45.78538, "1636 Camping Riviera & Wellness Verbania Nord IT CAMP"],
  [8.39836, 45.80816, "1637 Parcheggio Sosta Panoramica Verbania Sud IT CS"],
  [8.50857, 45.82825, "1638 Camper Service Autostradale Verbania Est IT PS"],
  [8.52076, 45.97127, "1639 Camper Park Attrezzato Verbania Ovest IT CS"],
  [8.4151, 45.96204, "1640 Camping Riviera & Wellness Verbania Centro IT AA"],
  [8.42296, 45.74866, "1641 Camper Service Autostradale Verbania Mare IT PS"],
  [8.35445, 46.03016, "1642 Camping Riviera & Wellness Verbania Collina IT CAMP"],
  [8.47299, 45.81254, "1643 Parcheggio Sosta Panoramica Verbania Lago IT AA"],
  [8.71449, 45.83892, "1644 Area Sosta Comunale Verbania Terme IT PS"],
  [8.50294, 45.88312, "1645 Parcheggio Sosta Panoramica Verbania Nord IT CAMP"],
  [8.53234, 45.87029, "1646 Agricampeggio & Sosta Natura Verbania Sud IT AA"],
  [8.46015, 45.9942, "1647 Camping Riviera & Wellness Verbania Est IT CS"],
  [8.37934, 45.79398, "1648 Camping Riviera & Wellness Verbania Ovest IT AA"],
  [8.63835, 45.81117, "1649 Area Sosta Comunale Verbania Centro IT CAMP"],
  [8.58496, 45.95585, "1650 Camper Service Autostradale Verbania Mare IT PS"],
  [8.14534, 45.61033, "1651 Camper Service Autostradale Biella Nord IT CS"],
  [7.96328, 45.4463, "1652 Parcheggio Sosta Panoramica Biella Sud IT CS"],
  [8.11203, 45.68259, "1653 Agricampeggio & Sosta Natura Biella Est IT CS"],
  [7.92111, 45.55751, "1654 Area Sosta Comunale Biella Ovest IT CAMP"],
  [8.05604, 45.5648, "1655 Parcheggio Sosta Panoramica Biella Centro IT PS"],
  [8.03303, 45.63645, "1656 Camper Service Autostradale Biella Mare IT PS"],
  [8.19145, 45.58579, "1657 Area Sosta Comunale Biella Collina IT CS"],
  [7.93448, 45.39934, "1658 Agricampeggio & Sosta Natura Biella Lago IT CS"],
  [8.08784, 45.66116, "1659 Camper Park Attrezzato Biella Terme IT CAMP"],
  [8.09102, 45.56668, "1660 Parcheggio Sosta Panoramica Biella Nord IT PS"],
  [7.99839, 45.67605, "1661 Parcheggio Sosta Panoramica Biella Sud IT CAMP"],
  [7.93164, 45.54238, "1662 Camping Riviera & Wellness Biella Est IT AA"],
  [8.12745, 45.6455, "1663 Area Sosta Comunale Biella Ovest IT PS"],
  [7.8478, 45.69408, "1664 Agricampeggio & Sosta Natura Biella Centro IT CS"],
  [7.87244, 45.68967, "1665 Agricampeggio & Sosta Natura Biella Mare IT CAMP"],
  [8.16523, 45.46136, "1666 Camper Park Attrezzato Biella Collina IT AA"],
  [8.02598, 45.60149, "1667 Camping Riviera & Wellness Biella Lago IT CAMP"],
  [8.19575, 45.67264, "1668 Camper Park Attrezzato Biella Terme IT CS"],
  [8.07575, 45.48628, "1669 Parcheggio Sosta Panoramica Biella Nord IT CAMP"],
  [8.09103, 45.49032, "1670 Camping Riviera & Wellness Biella Sud IT CAMP"],
  [8.18686, 45.72487, "1671 Camper Park Attrezzato Biella Est IT AA"],
  [7.8904, 45.69137, "1672 Agricampeggio & Sosta Natura Biella Ovest IT AA"],
  [7.97824, 45.43909, "1673 Camper Park Attrezzato Biella Centro IT CS"],
  [7.89728, 45.52535, "1674 Camping Riviera & Wellness Biella Mare IT CS"],
  [9.00643, 44.3888, "1675 Camper Service Autostradale Genova Nord IT PS"],
  [8.8465, 44.41106, "1676 Camper Service Autostradale Genova Sud IT AA"],
  [8.86858, 44.56319, "1677 Camper Service Autostradale Genova Est IT CAMP"],
  [9.15877, 44.2632, "1678 Camping Riviera & Wellness Genova Ovest IT AA"],
  [8.90027, 44.50909, "1679 Area Sosta Comunale Genova Centro IT CAMP"],
  [8.86659, 44.40375, "1680 Camper Park Attrezzato Genova Mare IT PS"],
  [8.78007, 44.42216, "1681 Agricampeggio & Sosta Natura Genova Collina IT CAMP"],
  [9.06431, 44.54355, "1682 Agricampeggio & Sosta Natura Genova Lago IT PS"],
  [9.09782, 44.44976, "1683 Area Sosta Comunale Genova Terme IT AA"],
  [8.79239, 44.5559, "1684 Area Sosta Comunale Genova Nord IT AA"],
  [8.91381, 44.57774, "1685 Area Sosta Comunale Genova Sud IT PS"],
  [9.11479, 44.33625, "1686 Camping Riviera & Wellness Genova Est IT CS"],
  [8.83398, 44.45971, "1687 Area Sosta Comunale Genova Ovest IT CAMP"],
  [8.79579, 44.54693, "1688 Camping Riviera & Wellness Genova Centro IT CAMP"],
  [9.03605, 44.33753, "1689 Camping Riviera & Wellness Genova Mare IT PS"],
  [9.03796, 44.46002, "1690 Camper Service Autostradale Genova Collina IT CS"],
  [8.78101, 44.39748, "1691 Camper Park Attrezzato Genova Lago IT AA"],
  [8.72548, 44.46859, "1692 Parcheggio Sosta Panoramica Genova Terme IT CS"],
  [8.91134, 44.57645, "1693 Area Sosta Comunale Genova Nord IT CAMP"],
  [8.89368, 44.25539, "1694 Camper Service Autostradale Genova Sud IT CS"],
  [9.11775, 44.34027, "1695 Area Sosta Comunale Genova Est IT AA"],
  [9.06022, 44.50131, "1696 Camper Service Autostradale Genova Ovest IT CS"],
  [9.60291, 44.11318, "1697 Area Sosta Comunale La Spezia Nord IT CS"],
  [9.69497, 44.05042, "1698 Camper Service Autostradale La Spezia Sud IT CS"],
  [9.79817, 44.14313, "1699 Camper Service Autostradale La Spezia Est IT CS"],
  [9.66211, 44.24131, "1700 Area Sosta Comunale La Spezia Ovest IT CS"],
  [9.75729, 44.183, "1701 Parcheggio Sosta Panoramica La Spezia Centro IT AA"],
  [9.7106, 44.20438, "1702 Agricampeggio & Sosta Natura La Spezia Mare IT PS"],
  [9.8691, 44.12119, "1703 Camper Park Attrezzato La Spezia Collina IT AA"],
  [9.98028, 43.93689, "1704 Camping Riviera & Wellness La Spezia Lago IT CAMP"],
  [9.82839, 44.10871, "1705 Camper Park Attrezzato La Spezia Terme IT CAMP"],
  [9.95181, 44.15366, "1706 Agricampeggio & Sosta Natura La Spezia Nord IT PS"],
  [9.70759, 44.06256, "1707 Camper Service Autostradale La Spezia Sud IT CS"],
  [9.60453, 44.23855, "1708 Parcheggio Sosta Panoramica La Spezia Est IT AA"],
  [9.98647, 43.97369, "1709 Agricampeggio & Sosta Natura La Spezia Ovest IT CAMP"],
  [9.67685, 44.11872, "1710 Agricampeggio & Sosta Natura La Spezia Centro IT PS"],
  [9.62949, 43.93334, "1711 Area Sosta Comunale La Spezia Mare IT PS"],
  [9.62631, 43.94144, "1712 Camper Park Attrezzato La Spezia Collina IT CAMP"],
  [9.91978, 44.02777, "1713 Parcheggio Sosta Panoramica La Spezia Lago IT PS"],
  [9.63619, 44.17313, "1714 Camper Service Autostradale La Spezia Terme IT PS"],
  [9.63466, 43.95676, "1715 Agricampeggio & Sosta Natura La Spezia Nord IT CS"],
  [9.77493, 44.11524, "1716 Camper Park Attrezzato La Spezia Sud IT CS"],
  [8.68514, 44.28532, "1717 Camping Riviera & Wellness Savona Nord IT CAMP"],
  [8.67218, 44.21777, "1718 Area Sosta Comunale Savona Sud IT CS"],
  [8.28086, 44.3465, "1719 Camper Service Autostradale Savona Est IT AA"],
  [8.31785, 44.13663, "1720 Area Sosta Comunale Savona Ovest IT CS"],
  [8.41212, 44.30594, "1721 Camper Park Attrezzato Savona Centro IT AA"],
  [8.5935, 44.26235, "1722 Camper Park Attrezzato Savona Mare IT CAMP"],
  [8.60324, 44.44245, "1723 Camping Riviera & Wellness Savona Collina IT CAMP"],
  [8.37849, 44.41469, "1724 Agricampeggio & Sosta Natura Savona Lago IT AA"],
  [8.51559, 44.38151, "1725 Agricampeggio & Sosta Natura Savona Terme IT AA"],
  [8.41816, 44.29152, "1726 Camper Service Autostradale Savona Nord IT AA"],
  [8.32689, 44.19061, "1727 Parcheggio Sosta Panoramica Savona Sud IT PS"],
  [8.308, 44.36814, "1728 Parcheggio Sosta Panoramica Savona Est IT AA"],
  [8.26163, 44.43274, "1729 Area Sosta Comunale Savona Ovest IT AA"],
  [8.6702, 44.25959, "1730 Camper Service Autostradale Savona Centro IT AA"],
  [8.66738, 44.3257, "1731 Area Sosta Comunale Savona Mare IT CS"],
  [8.44342, 44.24483, "1732 Camper Park Attrezzato Savona Collina IT PS"],
  [8.51329, 44.4213, "1733 Agricampeggio & Sosta Natura Savona Lago IT CAMP"],
  [8.2798, 44.36786, "1734 Parcheggio Sosta Panoramica Savona Terme IT AA"],
  [8.68544, 44.47569, "1735 Parcheggio Sosta Panoramica Savona Nord IT CS"],
  [7.94151, 43.98173, "1736 Agricampeggio & Sosta Natura Imperia Nord IT PS"],
  [7.96771, 43.87086, "1737 Parcheggio Sosta Panoramica Imperia Sud IT AA"],
  [8.13451, 43.98558, "1738 Parcheggio Sosta Panoramica Imperia Est IT CAMP"],
  [8.23904, 43.8399, "1739 Camper Service Autostradale Imperia Ovest IT CS"],
  [8.14392, 44.02616, "1740 Camping Riviera & Wellness Imperia Centro IT CS"],
  [7.98622, 43.71323, "1741 Camper Park Attrezzato Imperia Mare IT CS"],
  [8.17951, 43.83225, "1742 Parcheggio Sosta Panoramica Imperia Collina IT CS"],
  [8.09749, 43.71151, "1743 Agricampeggio & Sosta Natura Imperia Lago IT AA"],
  [8.2441, 43.78282, "1744 Area Sosta Comunale Imperia Terme IT CAMP"],
  [8.23935, 44.04741, "1745 Camper Service Autostradale Imperia Nord IT PS"],
  [7.82146, 43.80894, "1746 Camping Riviera & Wellness Imperia Sud IT CS"],
  [8.20471, 43.85557, "1747 Parcheggio Sosta Panoramica Imperia Est IT CS"],
  [7.84471, 43.74072, "1748 Camping Riviera & Wellness Imperia Ovest IT PS"],
  [7.83537, 43.99799, "1749 Camping Riviera & Wellness Imperia Centro IT CS"],
  [7.86052, 43.94286, "1750 Camper Service Autostradale Imperia Mare IT AA"],
  [8.21842, 44.00882, "1751 Agricampeggio & Sosta Natura Imperia Collina IT CAMP"],
  [7.94851, 44.00216, "1752 Camping Riviera & Wellness Imperia Lago IT PS"],
  [8.2263, 43.79276, "1753 Agricampeggio & Sosta Natura Imperia Terme IT PS"],
  [7.84925, 43.74914, "1754 Parcheggio Sosta Panoramica Imperia Nord IT CS"],
  [11.27197, 43.73688, "1755 Agricampeggio & Sosta Natura Firenze Nord IT PS"],
  [11.15005, 43.70251, "1756 Camper Service Autostradale Firenze Sud IT CS"],
  [11.33952, 43.64977, "1757 Area Sosta Comunale Firenze Est IT AA"],
  [11.17831, 43.88717, "1758 Camper Park Attrezzato Firenze Ovest IT AA"],
  [11.19088, 43.68148, "1759 Camping Riviera & Wellness Firenze Centro IT AA"],
  [11.39984, 43.69919, "1760 Camping Riviera & Wellness Firenze Mare IT AA"],
  [11.41537, 43.92783, "1761 Area Sosta Comunale Firenze Collina IT CS"],
  [11.39255, 43.75632, "1762 Area Sosta Comunale Firenze Lago IT CS"],
  [11.40447, 43.59878, "1763 Area Sosta Comunale Firenze Terme IT CS"],
  [11.21106, 43.66395, "1764 Camper Park Attrezzato Firenze Nord IT CS"],
  [11.44364, 43.79974, "1765 Parcheggio Sosta Panoramica Firenze Sud IT AA"],
  [11.11979, 43.94361, "1766 Area Sosta Comunale Firenze Est IT AA"],
  [11.41207, 43.62679, "1767 Camper Park Attrezzato Firenze Ovest IT PS"],
  [11.23825, 43.60954, "1768 Area Sosta Comunale Firenze Centro IT CAMP"],
  [11.35679, 43.7462, "1769 Parcheggio Sosta Panoramica Firenze Mare IT CS"],
  [11.2228, 43.72856, "1770 Area Sosta Comunale Firenze Collina IT PS"],
  [11.15454, 43.91251, "1771 Camper Park Attrezzato Firenze Lago IT CAMP"],
  [11.30943, 43.60673, "1772 Camper Park Attrezzato Firenze Terme IT PS"],
  [11.2162, 43.69789, "1773 Camping Riviera & Wellness Firenze Nord IT CS"],
  [11.20316, 43.6253, "1774 Area Sosta Comunale Firenze Sud IT PS"],
  [11.38954, 43.81953, "1775 Camper Park Attrezzato Firenze Est IT PS"],
  [11.27545, 43.94253, "1776 Camping Riviera & Wellness Firenze Ovest IT CS"],
  [11.1924, 43.86827, "1777 Camper Service Autostradale Firenze Centro IT AA"],
  [11.25688, 43.91404, "1778 Agricampeggio & Sosta Natura Firenze Mare IT PS"],
  [11.17429, 43.65754, "1779 Agricampeggio & Sosta Natura Firenze Collina IT PS"],
  [11.55199, 43.16431, "1780 Agricampeggio & Sosta Natura Siena Nord IT AA"],
  [11.54409, 43.49366, "1781 Parcheggio Sosta Panoramica Siena Sud IT CAMP"],
  [11.22574, 43.3737, "1782 Camper Park Attrezzato Siena Est IT AA"],
  [11.548, 43.34529, "1783 Camper Park Attrezzato Siena Ovest IT AA"],
  [11.55199, 43.47112, "1784 Agricampeggio & Sosta Natura Siena Centro IT PS"],
  [11.2489, 43.22659, "1785 Camper Park Attrezzato Siena Mare IT CS"],
  [11.42105, 43.15367, "1786 Parcheggio Sosta Panoramica Siena Collina IT CAMP"],
  [11.48231, 43.47573, "1787 Parcheggio Sosta Panoramica Siena Lago IT CS"],
  [11.3265, 43.25197, "1788 Parcheggio Sosta Panoramica Siena Terme IT PS"],
  [11.20426, 43.22522, "1789 Area Sosta Comunale Siena Nord IT AA"],
  [11.38216, 43.25991, "1790 Area Sosta Comunale Siena Sud IT PS"],
  [11.51925, 43.39473, "1791 Agricampeggio & Sosta Natura Siena Est IT CS"],
  [11.36977, 43.15147, "1792 Area Sosta Comunale Siena Ovest IT CAMP"],
  [11.4931, 43.44007, "1793 Area Sosta Comunale Siena Centro IT CS"],
  [11.40376, 43.39039, "1794 Agricampeggio & Sosta Natura Siena Mare IT AA"],
  [11.1672, 43.24942, "1795 Agricampeggio & Sosta Natura Siena Collina IT AA"],
  [11.46213, 43.47584, "1796 Camping Riviera & Wellness Siena Lago IT CS"],
  [11.42403, 43.25485, "1797 Camping Riviera & Wellness Siena Terme IT PS"],
  [11.4723, 43.37674, "1798 Camper Park Attrezzato Siena Nord IT CAMP"],
  [11.23833, 43.4007, "1799 Agricampeggio & Sosta Natura Siena Sud IT PS"],
  [11.4217, 43.14443, "1800 Camping Riviera & Wellness Siena Est IT CS"],
  [10.59117, 43.75864, "1801 Camper Park Attrezzato Pisa Nord IT AA"],
  [10.59821, 43.74574, "1802 Camping Riviera & Wellness Pisa Sud IT CS"],
  [10.2838, 43.80867, "1803 Agricampeggio & Sosta Natura Pisa Est IT CS"],
  [10.61009, 43.77047, "1804 Camper Park Attrezzato Pisa Ovest IT CAMP"],
  [10.27106, 43.55179, "1805 Camper Service Autostradale Pisa Centro IT CAMP"],
  [10.22532, 43.63763, "1806 Agricampeggio & Sosta Natura Pisa Mare IT AA"],
  [10.50636, 43.68288, "1807 Area Sosta Comunale Pisa Collina IT AA"],
  [10.34712, 43.72038, "1808 Camper Service Autostradale Pisa Lago IT CS"],
  [10.53163, 43.83788, "1809 Area Sosta Comunale Pisa Terme IT PS"],
  [10.53634, 43.70575, "1810 Camper Park Attrezzato Pisa Nord IT CS"],
  [10.29421, 43.55483, "1811 Agricampeggio & Sosta Natura Pisa Sud IT AA"],
  [10.57627, 43.66743, "1812 Area Sosta Comunale Pisa Est IT AA"],
  [10.60053, 43.57405, "1813 Camping Riviera & Wellness Pisa Ovest IT CS"],
  [10.45284, 43.75571, "1814 Agricampeggio & Sosta Natura Pisa Centro IT AA"],
  [10.6008, 43.55865, "1815 Camping Riviera & Wellness Pisa Mare IT PS"],
  [10.2474, 43.85921, "1816 Parcheggio Sosta Panoramica Pisa Collina IT CS"],
  [10.26219, 43.61974, "1817 Agricampeggio & Sosta Natura Pisa Lago IT AA"],
  [10.2836, 43.64633, "1818 Camping Riviera & Wellness Pisa Terme IT CAMP"],
  [10.55463, 43.74792, "1819 Camper Service Autostradale Pisa Nord IT AA"],
  [10.36912, 43.67409, "1820 Area Sosta Comunale Pisa Sud IT CS"],
  [10.39285, 43.76658, "1821 Camping Riviera & Wellness Pisa Est IT CAMP"],
  [10.46389, 43.62023, "1822 Area Sosta Comunale Pisa Ovest IT AA"],
  [10.31546, 43.84312, "1823 Camper Service Autostradale Pisa Centro IT AA"],
  [10.47417, 43.71898, "1824 Camper Service Autostradale Pisa Mare IT PS"],
  [10.44935, 43.79776, "1825 Camper Park Attrezzato Lucca Nord IT PS"],
  [10.47558, 43.68352, "1826 Camper Service Autostradale Lucca Sud IT CS"],
  [10.53161, 43.96088, "1827 Camper Park Attrezzato Lucca Est IT CAMP"],
  [10.31627, 43.90151, "1828 Camping Riviera & Wellness Lucca Ovest IT CS"],
  [10.61811, 43.8128, "1829 Parcheggio Sosta Panoramica Lucca Centro IT CAMP"],
  [10.4519, 43.68924, "1830 Parcheggio Sosta Panoramica Lucca Mare IT CS"],
  [10.69906, 43.90837, "1831 Parcheggio Sosta Panoramica Lucca Collina IT PS"],
  [10.45536, 43.7725, "1832 Camper Service Autostradale Lucca Lago IT CS"],
  [10.51027, 43.86783, "1833 Parcheggio Sosta Panoramica Lucca Terme IT AA"],
  [10.47977, 44.00014, "1834 Area Sosta Comunale Lucca Nord IT CS"],
  [10.33448, 43.95086, "1835 Camper Park Attrezzato Lucca Sud IT CS"],
  [10.47363, 44.0138, "1836 Area Sosta Comunale Lucca Est IT PS"],
  [10.68756, 43.75816, "1837 Parcheggio Sosta Panoramica Lucca Ovest IT CS"],
  [10.45651, 43.80373, "1838 Area Sosta Comunale Lucca Centro IT AA"],
  [10.69042, 43.84979, "1839 Agricampeggio & Sosta Natura Lucca Mare IT CAMP"],
  [10.51285, 43.88597, "1840 Camping Riviera & Wellness Lucca Collina IT AA"],
  [10.34439, 43.81295, "1841 Area Sosta Comunale Lucca Lago IT PS"],
  [10.32315, 43.86484, "1842 Area Sosta Comunale Lucca Terme IT AA"],
  [10.67275, 43.97595, "1843 Parcheggio Sosta Panoramica Lucca Nord IT CAMP"],
  [10.35963, 43.54345, "1844 Camping Riviera & Wellness Livorno Nord IT PS"],
  [10.15033, 43.46989, "1845 Camper Park Attrezzato Livorno Sud IT AA"],
  [10.48113, 43.51203, "1846 Area Sosta Comunale Livorno Est IT PS"],
  [10.49998, 43.63451, "1847 Area Sosta Comunale Livorno Ovest IT CS"],
  [10.44274, 43.49175, "1848 Area Sosta Comunale Livorno Centro IT CAMP"],
  [10.47181, 43.6685, "1849 Agricampeggio & Sosta Natura Livorno Mare IT CAMP"],
  [10.524, 43.42053, "1850 Camper Park Attrezzato Livorno Collina IT AA"],
  [10.27315, 43.4678, "1851 Agricampeggio & Sosta Natura Livorno Lago IT PS"],
  [10.49664, 43.5281, "1852 Camper Park Attrezzato Livorno Terme IT AA"],
  [10.31803, 43.54306, "1853 Camping Riviera & Wellness Livorno Nord IT PS"],
  [10.15714, 43.55384, "1854 Area Sosta Comunale Livorno Sud IT CAMP"],
  [10.14664, 43.55088, "1855 Camping Riviera & Wellness Livorno Est IT CAMP"],
  [10.46042, 43.44097, "1856 Camper Park Attrezzato Livorno Ovest IT AA"],
  [10.10835, 43.38507, "1857 Camper Park Attrezzato Livorno Centro IT AA"],
  [10.25136, 43.44319, "1858 Camping Riviera & Wellness Livorno Mare IT CAMP"],
  [10.50098, 43.51243, "1859 Parcheggio Sosta Panoramica Livorno Collina IT PS"],
  [10.35292, 43.50386, "1860 Camper Park Attrezzato Livorno Lago IT AA"],
  [10.24299, 43.57891, "1861 Camper Service Autostradale Livorno Terme IT CS"],
  [10.39558, 43.63564, "1862 Agricampeggio & Sosta Natura Livorno Nord IT CS"],
  [10.15891, 43.5088, "1863 Area Sosta Comunale Livorno Sud IT CAMP"],
  [10.39056, 43.60008, "1864 Camper Park Attrezzato Livorno Est IT CS"],
  [10.09462, 43.51683, "1865 Camping Riviera & Wellness Livorno Ovest IT CAMP"],
  [11.15811, 42.81508, "1866 Camper Park Attrezzato Grosseto Nord IT PS"],
  [11.24989, 42.67684, "1867 Camper Park Attrezzato Grosseto Sud IT AA"],
  [11.17683, 42.92696, "1868 Camping Riviera & Wellness Grosseto Est IT CAMP"],
  [11.09415, 42.88656, "1869 Camper Service Autostradale Grosseto Ovest IT PS"],
  [11.12189, 42.69425, "1870 Camper Service Autostradale Grosseto Centro IT CS"],
  [11.11778, 42.62431, "1871 Parcheggio Sosta Panoramica Grosseto Mare IT PS"],
  [11.16167, 42.81507, "1872 Parcheggio Sosta Panoramica Grosseto Collina IT CAMP"],
  [10.91633, 42.62634, "1873 Camping Riviera & Wellness Grosseto Lago IT CAMP"],
  [11.0122, 42.7023, "1874 Camping Riviera & Wellness Grosseto Terme IT CAMP"],
  [11.23206, 42.64098, "1875 Camper Park Attrezzato Grosseto Nord IT CAMP"],
  [11.03141, 42.72993, "1876 Parcheggio Sosta Panoramica Grosseto Sud IT AA"],
  [11.11142, 42.59741, "1877 Camping Riviera & Wellness Grosseto Est IT CS"],
  [11.06967, 42.90592, "1878 Agricampeggio & Sosta Natura Grosseto Ovest IT CAMP"],
  [11.14502, 42.83632, "1879 Parcheggio Sosta Panoramica Grosseto Centro IT AA"],
  [10.98766, 42.84279, "1880 Agricampeggio & Sosta Natura Grosseto Mare IT CS"],
  [11.02269, 42.71397, "1881 Camping Riviera & Wellness Grosseto Collina IT PS"],
  [10.96911, 42.89527, "1882 Camping Riviera & Wellness Grosseto Lago IT CS"],
  [11.00399, 42.63328, "1883 Camper Service Autostradale Grosseto Terme IT AA"],
  [11.9499, 43.60306, "1884 Camping Riviera & Wellness Arezzo Nord IT CS"],
  [12.04754, 43.36636, "1885 Agricampeggio & Sosta Natura Arezzo Sud IT CS"],
  [11.91891, 43.41829, "1886 Agricampeggio & Sosta Natura Arezzo Est IT PS"],
  [12.04528, 43.45289, "1887 Area Sosta Comunale Arezzo Ovest IT PS"],
  [11.88061, 43.5995, "1888 Camper Service Autostradale Arezzo Centro IT AA"],
  [11.67973, 43.39262, "1889 Parcheggio Sosta Panoramica Arezzo Mare IT PS"],
  [11.8096, 43.63552, "1890 Camper Park Attrezzato Arezzo Collina IT CS"],
  [11.97745, 43.39893, "1891 Camper Park Attrezzato Arezzo Lago IT PS"],
  [12.09939, 43.40462, "1892 Camper Service Autostradale Arezzo Terme IT AA"],
  [11.85882, 43.3085, "1893 Camping Riviera & Wellness Arezzo Nord IT CAMP"],
  [11.7267, 43.4899, "1894 Camper Park Attrezzato Arezzo Sud IT CS"],
  [11.94047, 43.50327, "1895 Camper Park Attrezzato Arezzo Est IT AA"],
  [11.82789, 43.62606, "1896 Camper Service Autostradale Arezzo Ovest IT PS"],
  [11.8233, 43.35799, "1897 Parcheggio Sosta Panoramica Arezzo Centro IT AA"],
  [11.89437, 43.5531, "1898 Agricampeggio & Sosta Natura Arezzo Mare IT AA"],
  [11.98552, 43.28964, "1899 Camping Riviera & Wellness Arezzo Collina IT AA"],
  [11.79584, 43.59514, "1900 Camping Riviera & Wellness Arezzo Lago IT CS"],
  [11.79315, 43.46437, "1901 Camper Service Autostradale Arezzo Terme IT AA"],
  [11.78627, 43.39257, "1902 Area Sosta Comunale Arezzo Nord IT AA"],
  [12.10336, 43.59899, "1903 Camper Service Autostradale Arezzo Sud IT CAMP"],
  [11.74019, 43.41394, "1904 Camper Service Autostradale Arezzo Est IT CAMP"],
  [11.98263, 43.36815, "1905 Area Sosta Comunale Arezzo Ovest IT PS"],
  [11.92076, 43.54513, "1906 Camper Park Attrezzato Arezzo Centro IT CS"],
  [11.94814, 43.41651, "1907 Area Sosta Comunale Arezzo Mare IT CS"],
  [11.77051, 43.59499, "1908 Camper Service Autostradale Arezzo Collina IT AA"],
  [11.95329, 43.63634, "1909 Parcheggio Sosta Panoramica Arezzo Lago IT AA"],
  [10.89174, 43.79833, "1910 Camping Riviera & Wellness Pistoia Nord IT AA"],
  [11.00764, 43.84626, "1911 Parcheggio Sosta Panoramica Pistoia Sud IT AA"],
  [10.69599, 43.99781, "1912 Camping Riviera & Wellness Pistoia Est IT CS"],
  [10.92594, 43.79314, "1913 Camping Riviera & Wellness Pistoia Ovest IT PS"],
  [10.73901, 44.04853, "1914 Camper Service Autostradale Pistoia Centro IT CS"],
  [10.73962, 43.7977, "1915 Agricampeggio & Sosta Natura Pistoia Mare IT AA"],
  [10.81015, 43.82771, "1916 Parcheggio Sosta Panoramica Pistoia Collina IT CS"],
  [10.82471, 44.004, "1917 Agricampeggio & Sosta Natura Pistoia Lago IT CS"],
  [10.78526, 43.93152, "1918 Parcheggio Sosta Panoramica Pistoia Terme IT AA"],
  [10.69754, 43.83988, "1919 Agricampeggio & Sosta Natura Pistoia Nord IT PS"],
  [10.99286, 44.05013, "1920 Area Sosta Comunale Pistoia Sud IT AA"],
  [10.72557, 44.03063, "1921 Area Sosta Comunale Pistoia Est IT CS"],
  [10.89734, 43.98332, "1922 Agricampeggio & Sosta Natura Pistoia Ovest IT AA"],
  [10.73671, 43.9203, "1923 Agricampeggio & Sosta Natura Pistoia Centro IT CAMP"],
  [10.8539, 44.05609, "1924 Area Sosta Comunale Pistoia Mare IT CS"],
  [10.73455, 44.01629, "1925 Camper Service Autostradale Pistoia Collina IT CAMP"],
  [10.99031, 44.056, "1926 Area Sosta Comunale Pistoia Lago IT AA"],
  [10.88877, 43.88293, "1927 Agricampeggio & Sosta Natura Pistoia Terme IT CS"],
  [9.99709, 44.14744, "1928 Agricampeggio & Sosta Natura Massa Nord IT AA"],
  [10.03712, 44.19901, "1929 Camper Service Autostradale Massa Sud IT PS"],
  [10.27475, 44.15994, "1930 Camping Riviera & Wellness Massa Est IT PS"],
  [10.24169, 43.90858, "1931 Area Sosta Comunale Massa Ovest IT CS"],
  [10.18064, 44.00781, "1932 Area Sosta Comunale Massa Centro IT CS"],
  [10.26542, 44.07616, "1933 Camper Park Attrezzato Massa Mare IT PS"],
  [10.24208, 44.17018, "1934 Camping Riviera & Wellness Massa Collina IT AA"],
  [9.96562, 44.18434, "1935 Camper Service Autostradale Massa Lago IT CS"],
  [10.03253, 43.87829, "1936 Camper Service Autostradale Massa Terme IT PS"],
  [10.21987, 44.1088, "1937 Area Sosta Comunale Massa Nord IT CAMP"],
  [10.14839, 44.1678, "1938 Camping Riviera & Wellness Massa Sud IT CS"],
  [10.02666, 44.0938, "1939 Camper Service Autostradale Massa Est IT AA"],
  [10.08799, 44.0989, "1940 Camping Riviera & Wellness Massa Ovest IT CAMP"],
  [9.98542, 44.08739, "1941 Area Sosta Comunale Massa Centro IT AA"],
  [9.94849, 44.1665, "1942 Camper Service Autostradale Massa Mare IT PS"],
  [10.35137, 43.94651, "1943 Agricampeggio & Sosta Natura Massa Collina IT PS"],
  [10.20429, 43.94015, "1944 Parcheggio Sosta Panoramica Massa Lago IT AA"],
  [10.11468, 43.88979, "1945 Camper Park Attrezzato Massa Terme IT PS"],
  [10.11598, 44.16201, "1946 Area Sosta Comunale Massa Nord IT PS"],
  [9.9228, 44.12303, "1947 Camper Service Autostradale Massa Sud IT AA"],
  [10.16189, 43.87474, "1948 Camper Service Autostradale Massa Est IT PS"],
  [10.20169, 44.19931, "1949 Parcheggio Sosta Panoramica Massa Ovest IT AA"],
  [11.54526, 44.55492, "1950 Camping Riviera & Wellness Bologna Nord IT CS"],
  [11.49754, 44.60571, "1951 Area Sosta Comunale Bologna Sud IT CAMP"],
  [11.38758, 44.5885, "1952 Parcheggio Sosta Panoramica Bologna Est IT CAMP"],
  [11.16145, 44.47829, "1953 Camping Riviera & Wellness Bologna Ovest IT CAMP"],
  [11.49105, 44.43937, "1954 Area Sosta Comunale Bologna Centro IT CS"],
  [11.43354, 44.50259, "1955 Parcheggio Sosta Panoramica Bologna Mare IT CAMP"],
  [11.48743, 44.49225, "1956 Camper Park Attrezzato Bologna Collina IT AA"],
  [11.20576, 44.4089, "1957 Area Sosta Comunale Bologna Lago IT PS"],
  [11.48865, 44.39536, "1958 Camper Service Autostradale Bologna Terme IT AA"],
  [11.45832, 44.43818, "1959 Camping Riviera & Wellness Bologna Nord IT CS"],
  [11.38256, 44.61301, "1960 Camping Riviera & Wellness Bologna Sud IT AA"],
  [11.54789, 44.55036, "1961 Camper Service Autostradale Bologna Est IT PS"],
  [11.4489, 44.32142, "1962 Camper Service Autostradale Bologna Ovest IT CS"],
  [11.34635, 44.48893, "1963 Parcheggio Sosta Panoramica Bologna Centro IT PS"],
  [11.44632, 44.52239, "1964 Camping Riviera & Wellness Bologna Mare IT CS"],
  [11.38785, 44.45549, "1965 Area Sosta Comunale Bologna Collina IT CS"],
  [11.306, 44.62839, "1966 Parcheggio Sosta Panoramica Bologna Lago IT CAMP"],
  [11.27189, 44.45915, "1967 Agricampeggio & Sosta Natura Bologna Terme IT CS"],
  [11.17978, 44.60158, "1968 Camper Service Autostradale Bologna Nord IT CAMP"],
  [11.25886, 44.51163, "1969 Camping Riviera & Wellness Bologna Sud IT CAMP"],
  [11.43907, 44.3933, "1970 Camper Park Attrezzato Bologna Est IT CS"],
  [11.43728, 44.36634, "1971 Camping Riviera & Wellness Bologna Ovest IT CAMP"],
  [11.40419, 44.50977, "1972 Parcheggio Sosta Panoramica Bologna Centro IT CS"],
  [11.37986, 44.5167, "1973 Agricampeggio & Sosta Natura Bologna Mare IT AA"],
  [11.49623, 44.58165, "1974 Camping Riviera & Wellness Bologna Collina IT PS"],
  [11.35283, 44.60281, "1975 Camper Service Autostradale Bologna Lago IT CAMP"],
  [12.36997, 43.91137, "1976 Camper Park Attrezzato Rimini Nord IT PS"],
  [12.65203, 44.23704, "1977 Camper Park Attrezzato Rimini Sud IT CAMP"],
  [12.47731, 44.13451, "1978 Area Sosta Comunale Rimini Est IT CS"],
  [12.39062, 44.17771, "1979 Agricampeggio & Sosta Natura Rimini Ovest IT AA"],
  [12.5195, 44.11929, "1980 Camping Riviera & Wellness Rimini Centro IT CS"],
  [12.76142, 44.12537, "1981 Camping Riviera & Wellness Rimini Mare IT CAMP"],
  [12.78362, 44.22765, "1982 Camper Service Autostradale Rimini Collina IT PS"],
  [12.67915, 43.91163, "1983 Parcheggio Sosta Panoramica Rimini Lago IT CAMP"],
  [12.7317, 44.1969, "1984 Parcheggio Sosta Panoramica Rimini Terme IT CS"],
  [12.66158, 44.21182, "1985 Camper Park Attrezzato Rimini Nord IT PS"],
  [12.61602, 44.08412, "1986 Parcheggio Sosta Panoramica Rimini Sud IT CAMP"],
  [12.78705, 44.04989, "1987 Agricampeggio & Sosta Natura Rimini Est IT CS"],
  [12.67529, 44.22967, "1988 Camper Park Attrezzato Rimini Ovest IT AA"],
  [12.4701, 43.90702, "1989 Camper Service Autostradale Rimini Centro IT AA"],
  [12.72521, 43.94913, "1990 Camper Park Attrezzato Rimini Mare IT CAMP"],
  [12.76637, 44.05602, "1991 Agricampeggio & Sosta Natura Rimini Collina IT AA"],
  [12.6131, 44.21782, "1992 Camper Park Attrezzato Rimini Lago IT AA"],
  [12.59207, 44.16927, "1993 Camper Service Autostradale Rimini Terme IT CAMP"],
  [12.06124, 44.32039, "1994 Parcheggio Sosta Panoramica Ravenna Nord IT CAMP"],
  [12.22289, 44.29918, "1995 Parcheggio Sosta Panoramica Ravenna Sud IT AA"],
  [12.37603, 44.36569, "1996 Area Sosta Comunale Ravenna Est IT PS"],
  [12.0768, 44.36968, "1997 Agricampeggio & Sosta Natura Ravenna Ovest IT CAMP"],
  [12.42001, 44.53169, "1998 Parcheggio Sosta Panoramica Ravenna Centro IT PS"],
  [12.17905, 44.47753, "1999 Area Sosta Comunale Ravenna Mare IT AA"],
  [12.12292, 44.48229, "2000 Area Sosta Comunale Ravenna Collina IT CS"],
  [12.30429, 44.33321, "2001 Camper Service Autostradale Ravenna Lago IT AA"],
  [12.14723, 44.53114, "2002 Parcheggio Sosta Panoramica Ravenna Terme IT AA"],
  [12.38273, 44.25875, "2003 Camper Service Autostradale Ravenna Nord IT PS"],
  [12.4052, 44.42326, "2004 Agricampeggio & Sosta Natura Ravenna Sud IT CS"],
  [12.26062, 44.43002, "2005 Parcheggio Sosta Panoramica Ravenna Est IT CS"],
  [12.07443, 44.46373, "2006 Camping Riviera & Wellness Ravenna Ovest IT CS"],
  [12.35144, 44.31535, "2007 Area Sosta Comunale Ravenna Centro IT PS"],
  [12.01095, 44.52926, "2008 Camping Riviera & Wellness Ravenna Mare IT PS"],
  [12.12777, 44.40413, "2009 Area Sosta Comunale Ravenna Collina IT CS"],
  [12.3359, 44.26239, "2010 Area Sosta Comunale Ravenna Lago IT AA"],
  [12.38844, 44.53097, "2011 Parcheggio Sosta Panoramica Ravenna Terme IT AA"],
  [12.1605, 44.40129, "2012 Camper Service Autostradale Ravenna Nord IT PS"],
  [11.63548, 44.89875, "2013 Camper Service Autostradale Ferrara Nord IT AA"],
  [11.7102, 44.86806, "2014 Camping Riviera & Wellness Ferrara Sud IT AA"],
  [11.44256, 44.98792, "2015 Agricampeggio & Sosta Natura Ferrara Est IT AA"],
  [11.73917, 44.69338, "2016 Parcheggio Sosta Panoramica Ferrara Ovest IT CAMP"],
  [11.69213, 44.80139, "2017 Camper Service Autostradale Ferrara Centro IT PS"],
  [11.45617, 44.84981, "2018 Camper Park Attrezzato Ferrara Mare IT PS"],
  [11.68012, 44.76634, "2019 Parcheggio Sosta Panoramica Ferrara Collina IT PS"],
  [11.82921, 44.97354, "2020 Camping Riviera & Wellness Ferrara Lago IT CAMP"],
  [11.64458, 44.85683, "2021 Area Sosta Comunale Ferrara Terme IT CAMP"],
  [11.66329, 44.66486, "2022 Area Sosta Comunale Ferrara Nord IT AA"],
  [11.72844, 44.73662, "2023 Agricampeggio & Sosta Natura Ferrara Sud IT AA"],
  [11.68547, 44.80753, "2024 Camper Park Attrezzato Ferrara Est IT CAMP"],
  [11.6724, 44.7275, "2025 Camper Park Attrezzato Ferrara Ovest IT CS"],
  [11.69674, 44.70322, "2026 Camper Park Attrezzato Ferrara Centro IT CAMP"],
  [11.64215, 44.82454, "2027 Parcheggio Sosta Panoramica Ferrara Mare IT AA"],
  [11.43899, 44.68668, "2028 Camping Riviera & Wellness Ferrara Collina IT CAMP"],
  [11.69688, 44.7881, "2029 Agricampeggio & Sosta Natura Ferrara Lago IT PS"],
  [11.42621, 44.7629, "2030 Area Sosta Comunale Ferrara Terme IT CS"],
  [11.54256, 44.83315, "2031 Agricampeggio & Sosta Natura Ferrara Nord IT CS"],
  [11.6493, 44.86756, "2032 Camping Riviera & Wellness Ferrara Sud IT CAMP"],
  [11.47069, 44.99863, "2033 Agricampeggio & Sosta Natura Ferrara Est IT CAMP"],
  [11.71529, 44.93808, "2034 Camper Park Attrezzato Ferrara Ovest IT CAMP"],
  [11.45524, 44.95714, "2035 Agricampeggio & Sosta Natura Ferrara Centro IT PS"],
  [11.04885, 44.62798, "2036 Camper Service Autostradale Modena Nord IT PS"],
  [10.9907, 44.51019, "2037 Parcheggio Sosta Panoramica Modena Sud IT PS"],
  [10.7632, 44.77265, "2038 Agricampeggio & Sosta Natura Modena Est IT AA"],
  [10.98218, 44.72884, "2039 Agricampeggio & Sosta Natura Modena Ovest IT CS"],
  [10.98443, 44.76946, "2040 Area Sosta Comunale Modena Centro IT AA"],
  [10.7167, 44.54657, "2041 Parcheggio Sosta Panoramica Modena Mare IT PS"],
  [10.94305, 44.785, "2042 Parcheggio Sosta Panoramica Modena Collina IT CAMP"],
  [11.10135, 44.60947, "2043 Agricampeggio & Sosta Natura Modena Lago IT CS"],
  [10.92989, 44.63475, "2044 Camper Park Attrezzato Modena Terme IT CAMP"],
  [10.99841, 44.64786, "2045 Agricampeggio & Sosta Natura Modena Nord IT PS"],
  [10.77185, 44.52123, "2046 Parcheggio Sosta Panoramica Modena Sud IT CS"],
  [11.12283, 44.7283, "2047 Camping Riviera & Wellness Modena Est IT CS"],
  [10.80449, 44.73862, "2048 Camper Park Attrezzato Modena Ovest IT AA"],
  [11.00106, 44.55401, "2049 Agricampeggio & Sosta Natura Modena Centro IT CAMP"],
  [10.90479, 44.63649, "2050 Camper Service Autostradale Modena Mare IT CAMP"],
  [10.84603, 44.81531, "2051 Area Sosta Comunale Modena Collina IT AA"],
  [10.94516, 44.56426, "2052 Camping Riviera & Wellness Modena Lago IT CAMP"],
  [10.86458, 44.70089, "2053 Camper Service Autostradale Modena Terme IT CS"],
  [11.1379, 44.56016, "2054 Parcheggio Sosta Panoramica Modena Nord IT AA"],
  [11.06796, 44.61414, "2055 Parcheggio Sosta Panoramica Modena Sud IT CS"],
  [11.09943, 44.74953, "2056 Camper Service Autostradale Modena Est IT CAMP"],
  [10.89815, 44.78081, "2057 Parcheggio Sosta Panoramica Modena Ovest IT AA"],
  [10.82656, 44.65219, "2058 Area Sosta Comunale Modena Centro IT CS"],
  [10.42569, 44.75328, "2059 Camper Park Attrezzato Parma Nord IT CS"],
  [10.46793, 44.70712, "2060 Camping Riviera & Wellness Parma Sud IT AA"],
  [10.31846, 44.86283, "2061 Camper Service Autostradale Parma Est IT AA"],
  [10.113, 44.91818, "2062 Camping Riviera & Wellness Parma Ovest IT CS"],
  [10.17541, 44.82722, "2063 Camper Park Attrezzato Parma Centro IT AA"],
  [10.17775, 44.6779, "2064 Parcheggio Sosta Panoramica Parma Mare IT AA"],
  [10.37261, 44.96188, "2065 Parcheggio Sosta Panoramica Parma Collina IT CS"],
  [10.47249, 44.88129, "2066 Camping Riviera & Wellness Parma Lago IT AA"],
  [10.54965, 44.78372, "2067 Camper Park Attrezzato Parma Terme IT AA"],
  [10.28775, 44.70328, "2068 Camper Park Attrezzato Parma Nord IT PS"],
  [10.18475, 44.91366, "2069 Parcheggio Sosta Panoramica Parma Sud IT CS"],
  [10.2571, 44.87997, "2070 Camper Park Attrezzato Parma Est IT CAMP"],
  [10.20632, 44.83321, "2071 Parcheggio Sosta Panoramica Parma Ovest IT PS"],
  [10.19396, 44.6645, "2072 Camper Park Attrezzato Parma Centro IT PS"],
  [10.18274, 44.83843, "2073 Camper Park Attrezzato Parma Mare IT PS"],
  [10.15578, 44.80267, "2074 Parcheggio Sosta Panoramica Parma Collina IT AA"],
  [10.37446, 44.67212, "2075 Camping Riviera & Wellness Parma Lago IT PS"],
  [10.33782, 44.85373, "2076 Camping Riviera & Wellness Parma Terme IT AA"],
  [10.29593, 44.87067, "2077 Area Sosta Comunale Parma Nord IT CAMP"],
  [10.46498, 44.74918, "2078 Camper Service Autostradale Parma Sud IT PS"],
  [9.81264, 44.96668, "2079 Camper Park Attrezzato Piacenza Nord IT PS"],
  [9.71268, 45.087, "2080 Agricampeggio & Sosta Natura Piacenza Sud IT AA"],
  [9.80264, 44.87951, "2081 Camper Park Attrezzato Piacenza Est IT CAMP"],
  [9.70189, 45.06049, "2082 Parcheggio Sosta Panoramica Piacenza Ovest IT AA"],
  [9.82993, 44.9495, "2083 Camping Riviera & Wellness Piacenza Centro IT PS"],
  [9.65973, 44.9149, "2084 Agricampeggio & Sosta Natura Piacenza Mare IT PS"],
  [9.6586, 45.17684, "2085 Agricampeggio & Sosta Natura Piacenza Collina IT CAMP"],
  [9.77427, 44.97405, "2086 Parcheggio Sosta Panoramica Piacenza Lago IT CAMP"],
  [9.7189, 45.07084, "2087 Camper Service Autostradale Piacenza Terme IT CS"],
  [9.68569, 45.07328, "2088 Agricampeggio & Sosta Natura Piacenza Nord IT CS"],
  [9.78547, 44.99812, "2089 Parcheggio Sosta Panoramica Piacenza Sud IT CAMP"],
  [9.5714, 44.91928, "2090 Camping Riviera & Wellness Piacenza Est IT CS"],
  [9.64825, 44.95266, "2091 Area Sosta Comunale Piacenza Ovest IT CS"],
  [9.77605, 45.09251, "2092 Parcheggio Sosta Panoramica Piacenza Centro IT CAMP"],
  [9.75414, 45.01379, "2093 Camper Park Attrezzato Piacenza Mare IT AA"],
  [9.73811, 45.04268, "2094 Camper Park Attrezzato Piacenza Collina IT AA"],
  [9.63488, 44.96968, "2095 Area Sosta Comunale Piacenza Lago IT AA"],
  [9.911, 45.01211, "2096 Camping Riviera & Wellness Piacenza Terme IT AA"],
  [9.49386, 45.21484, "2097 Camping Riviera & Wellness Piacenza Nord IT CAMP"],
  [12.19846, 44.05145, "2098 Camper Service Autostradale Forl\xEC Nord IT PS"],
  [12.08548, 44.05946, "2099 Camper Park Attrezzato Forl\xEC Sud IT CAMP"],
  [11.83193, 44.10702, "2100 Parcheggio Sosta Panoramica Forl\xEC Est IT CS"],
  [11.88655, 44.0478, "2101 Camping Riviera & Wellness Forl\xEC Ovest IT CS"],
  [11.99351, 44.17129, "2102 Camper Service Autostradale Forl\xEC Centro IT CAMP"],
  [12.13233, 44.05308, "2103 Parcheggio Sosta Panoramica Forl\xEC Mare IT CS"],
  [12.18909, 44.14727, "2104 Parcheggio Sosta Panoramica Forl\xEC Collina IT AA"],
  [11.94013, 44.38485, "2105 Agricampeggio & Sosta Natura Forl\xEC Lago IT CAMP"],
  [12.07441, 44.3731, "2106 Camper Service Autostradale Forl\xEC Terme IT CS"],
  [11.86361, 44.1902, "2107 Camper Park Attrezzato Forl\xEC Nord IT CAMP"],
  [12.24186, 44.15069, "2108 Parcheggio Sosta Panoramica Forl\xEC Sud IT AA"],
  [12.0744, 44.3323, "2109 Parcheggio Sosta Panoramica Forl\xEC Est IT CAMP"],
  [12.16219, 44.24481, "2110 Camper Service Autostradale Forl\xEC Ovest IT PS"],
  [12.21914, 44.28626, "2111 Camper Service Autostradale Forl\xEC Centro IT CAMP"],
  [11.8461, 44.08839, "2112 Camper Service Autostradale Forl\xEC Mare IT AA"],
  [12.17577, 44.29311, "2113 Camping Riviera & Wellness Forl\xEC Collina IT CS"],
  [11.82008, 44.22848, "2114 Agricampeggio & Sosta Natura Forl\xEC Lago IT PS"],
  [11.99522, 44.14825, "2115 Camper Park Attrezzato Forl\xEC Terme IT CAMP"],
  [11.89602, 44.24179, "2116 Area Sosta Comunale Forl\xEC Nord IT CAMP"],
  [12.07387, 44.1242, "2117 Agricampeggio & Sosta Natura Forl\xEC Sud IT CAMP"],
  [12.27149, 43.19369, "2118 Camper Service Autostradale Perugia Nord IT CS"],
  [12.25704, 43.00807, "2119 Agricampeggio & Sosta Natura Perugia Sud IT CS"],
  [12.51632, 43.06031, "2120 Parcheggio Sosta Panoramica Perugia Est IT CS"],
  [12.46434, 43.17223, "2121 Area Sosta Comunale Perugia Ovest IT AA"],
  [12.5474, 43.271, "2122 Parcheggio Sosta Panoramica Perugia Centro IT AA"],
  [12.56995, 43.0461, "2123 Parcheggio Sosta Panoramica Perugia Mare IT CAMP"],
  [12.50972, 42.99971, "2124 Camper Service Autostradale Perugia Collina IT CAMP"],
  [12.4253, 43.01343, "2125 Camper Service Autostradale Perugia Lago IT CAMP"],
  [12.38104, 43.21544, "2126 Parcheggio Sosta Panoramica Perugia Terme IT AA"],
  [12.55298, 43.05725, "2127 Parcheggio Sosta Panoramica Perugia Nord IT AA"],
  [12.48001, 43.27748, "2128 Camper Service Autostradale Perugia Sud IT CS"],
  [12.17112, 43.17692, "2129 Agricampeggio & Sosta Natura Perugia Est IT PS"],
  [12.31225, 43.13905, "2130 Camper Service Autostradale Perugia Ovest IT CS"],
  [12.27251, 43.1277, "2131 Camper Park Attrezzato Perugia Centro IT CAMP"],
  [12.24856, 43.05578, "2132 Parcheggio Sosta Panoramica Perugia Mare IT PS"],
  [12.50429, 43.08238, "2133 Camper Park Attrezzato Perugia Collina IT PS"],
  [12.24675, 43.03357, "2134 Camper Service Autostradale Perugia Lago IT CAMP"],
  [12.53219, 43.1758, "2135 Parcheggio Sosta Panoramica Perugia Terme IT CS"],
  [12.55114, 43.13007, "2136 Camper Park Attrezzato Perugia Nord IT CAMP"],
  [12.49814, 43.21571, "2137 Camper Park Attrezzato Perugia Sud IT CS"],
  [12.45291, 43.04323, "2138 Camper Park Attrezzato Assisi Nord IT AA"],
  [12.64536, 43.00071, "2139 Camper Service Autostradale Assisi Sud IT CAMP"],
  [12.4659, 42.93034, "2140 Camper Service Autostradale Assisi Est IT AA"],
  [12.67584, 43.06249, "2141 Agricampeggio & Sosta Natura Assisi Ovest IT CS"],
  [12.55483, 43.01283, "2142 Camping Riviera & Wellness Assisi Centro IT PS"],
  [12.44696, 42.90264, "2143 Agricampeggio & Sosta Natura Assisi Mare IT CAMP"],
  [12.68451, 43.09726, "2144 Parcheggio Sosta Panoramica Assisi Collina IT CS"],
  [12.69534, 43.01999, "2145 Agricampeggio & Sosta Natura Assisi Lago IT CS"],
  [12.42768, 43.05213, "2146 Camping Riviera & Wellness Assisi Terme IT PS"],
  [12.45758, 43.1168, "2147 Camper Service Autostradale Assisi Nord IT CAMP"],
  [12.54422, 43.1784, "2148 Camping Riviera & Wellness Assisi Sud IT CS"],
  [12.54703, 42.92339, "2149 Area Sosta Comunale Assisi Est IT PS"],
  [12.7121, 43.12425, "2150 Agricampeggio & Sosta Natura Assisi Ovest IT CAMP"],
  [12.74384, 43.20639, "2151 Agricampeggio & Sosta Natura Assisi Centro IT PS"],
  [12.82689, 43.10112, "2152 Camping Riviera & Wellness Assisi Mare IT CAMP"],
  [12.4028, 42.96006, "2153 Camper Park Attrezzato Assisi Collina IT PS"],
  [12.72714, 42.98378, "2154 Camping Riviera & Wellness Assisi Lago IT CS"],
  [12.43875, 42.95412, "2155 Camper Park Attrezzato Assisi Terme IT AA"],
  [12.40426, 43.08765, "2156 Camper Service Autostradale Assisi Nord IT AA"],
  [12.42986, 43.16345, "2157 Parcheggio Sosta Panoramica Assisi Sud IT PS"],
  [12.68707, 42.95005, "2158 Parcheggio Sosta Panoramica Assisi Est IT CAMP"],
  [12.72432, 42.97597, "2159 Agricampeggio & Sosta Natura Assisi Ovest IT PS"],
  [12.62943, 42.93994, "2160 Camping Riviera & Wellness Assisi Centro IT PS"],
  [12.55298, 42.908, "2161 Area Sosta Comunale Assisi Mare IT CS"],
  [12.7843, 43.05922, "2162 Camper Service Autostradale Assisi Collina IT CAMP"],
  [12.73163, 42.72824, "2163 Camper Park Attrezzato Terni Nord IT PS"],
  [12.70167, 42.59805, "2164 Parcheggio Sosta Panoramica Terni Sud IT CS"],
  [12.6579, 42.61283, "2165 Parcheggio Sosta Panoramica Terni Est IT PS"],
  [12.77982, 42.57778, "2166 Camper Service Autostradale Terni Ovest IT CAMP"],
  [12.53461, 42.51692, "2167 Agricampeggio & Sosta Natura Terni Centro IT PS"],
  [12.78462, 42.38893, "2168 Area Sosta Comunale Terni Mare IT CAMP"],
  [12.65849, 42.48927, "2169 Agricampeggio & Sosta Natura Terni Collina IT CS"],
  [12.76234, 42.49376, "2170 Camper Service Autostradale Terni Lago IT PS"],
  [12.42095, 42.46983, "2171 Parcheggio Sosta Panoramica Terni Terme IT CAMP"],
  [12.66995, 42.53301, "2172 Camper Park Attrezzato Terni Nord IT CAMP"],
  [12.7494, 42.44604, "2173 Camper Park Attrezzato Terni Sud IT PS"],
  [12.45334, 42.46611, "2174 Camper Service Autostradale Terni Est IT PS"],
  [12.82718, 42.65649, "2175 Parcheggio Sosta Panoramica Terni Ovest IT CS"],
  [12.65707, 42.61586, "2176 Agricampeggio & Sosta Natura Terni Centro IT CAMP"],
  [12.44851, 42.4547, "2177 Camper Service Autostradale Terni Mare IT CAMP"],
  [12.6226, 42.42752, "2178 Agricampeggio & Sosta Natura Terni Collina IT CS"],
  [12.6391, 42.63407, "2179 Agricampeggio & Sosta Natura Terni Lago IT PS"],
  [12.85407, 42.44215, "2180 Area Sosta Comunale Terni Terme IT CAMP"],
  [12.54465, 42.72922, "2181 Camper Park Attrezzato Terni Nord IT AA"],
  [12.42139, 42.54235, "2182 Camping Riviera & Wellness Terni Sud IT CS"],
  [12.51543, 42.39405, "2183 Camper Park Attrezzato Terni Est IT AA"],
  [12.64198, 42.6639, "2184 Agricampeggio & Sosta Natura Terni Ovest IT PS"],
  [12.03431, 42.8206, "2185 Camping Riviera & Wellness Orvieto Nord IT PS"],
  [12.06229, 42.63688, "2186 Area Sosta Comunale Orvieto Sud IT CS"],
  [12.26439, 42.61087, "2187 Camper Park Attrezzato Orvieto Est IT PS"],
  [12.23137, 42.58629, "2188 Area Sosta Comunale Orvieto Ovest IT PS"],
  [12.08503, 42.81353, "2189 Camper Service Autostradale Orvieto Centro IT CS"],
  [12.23265, 42.70489, "2190 Camper Park Attrezzato Orvieto Mare IT AA"],
  [12.31825, 42.67979, "2191 Camper Service Autostradale Orvieto Collina IT CS"],
  [11.90468, 42.76381, "2192 Camper Park Attrezzato Orvieto Lago IT CAMP"],
  [12.02017, 42.71203, "2193 Agricampeggio & Sosta Natura Orvieto Terme IT AA"],
  [11.9837, 42.84588, "2194 Area Sosta Comunale Orvieto Nord IT CAMP"],
  [12.03173, 42.76512, "2195 Camper Park Attrezzato Orvieto Sud IT AA"],
  [12.06381, 42.74824, "2196 Agricampeggio & Sosta Natura Orvieto Est IT CS"],
  [12.14718, 42.88269, "2197 Area Sosta Comunale Orvieto Ovest IT CS"],
  [12.05283, 42.75227, "2198 Camping Riviera & Wellness Orvieto Centro IT PS"],
  [11.92683, 42.59879, "2199 Camper Park Attrezzato Orvieto Mare IT AA"],
  [12.04568, 42.56462, "2200 Camping Riviera & Wellness Orvieto Collina IT CAMP"],
  [11.93403, 42.73132, "2201 Camping Riviera & Wellness Orvieto Lago IT CS"],
  [12.13696, 42.65446, "2202 Camper Park Attrezzato Orvieto Terme IT PS"],
  [11.89531, 42.80022, "2203 Camper Service Autostradale Orvieto Nord IT CAMP"],
  [11.99851, 42.79714, "2204 Agricampeggio & Sosta Natura Orvieto Sud IT PS"],
  [12.13726, 42.79092, "2205 Camper Service Autostradale Orvieto Est IT AA"],
  [12.13033, 42.74195, "2206 Camper Park Attrezzato Orvieto Ovest IT PS"],
  [12.27615, 42.70754, "2207 Camping Riviera & Wellness Orvieto Centro IT CAMP"],
  [13.49612, 43.6267, "2208 Area Sosta Comunale Ancona Nord IT CS"],
  [13.29422, 43.56929, "2209 Parcheggio Sosta Panoramica Ancona Sud IT CAMP"],
  [13.30232, 43.50574, "2210 Camping Riviera & Wellness Ancona Est IT PS"],
  [13.61835, 43.52438, "2211 Parcheggio Sosta Panoramica Ancona Ovest IT CAMP"],
  [13.5178, 43.62422, "2212 Camper Park Attrezzato Ancona Centro IT PS"],
  [13.47831, 43.5399, "2213 Parcheggio Sosta Panoramica Ancona Mare IT CS"],
  [13.5904, 43.47449, "2214 Area Sosta Comunale Ancona Collina IT CAMP"],
  [13.30797, 43.50332, "2215 Camper Park Attrezzato Ancona Lago IT AA"],
  [13.30822, 43.50787, "2216 Camper Service Autostradale Ancona Terme IT AA"],
  [13.57469, 43.61227, "2217 Camping Riviera & Wellness Ancona Nord IT PS"],
  [13.56658, 43.56902, "2218 Area Sosta Comunale Ancona Sud IT CAMP"],
  [13.38783, 43.76637, "2219 Area Sosta Comunale Ancona Est IT AA"],
  [13.58141, 43.60462, "2220 Area Sosta Comunale Ancona Ovest IT PS"],
  [13.69459, 43.70102, "2221 Parcheggio Sosta Panoramica Ancona Centro IT CAMP"],
  [13.57152, 43.46121, "2222 Camping Riviera & Wellness Ancona Mare IT CAMP"],
  [13.43066, 43.46544, "2223 Camping Riviera & Wellness Ancona Collina IT AA"],
  [13.62023, 43.47479, "2224 Parcheggio Sosta Panoramica Ancona Lago IT CS"],
  [13.58949, 43.50839, "2225 Camper Park Attrezzato Ancona Terme IT PS"],
  [13.48073, 43.70302, "2226 Parcheggio Sosta Panoramica Ancona Nord IT CS"],
  [13.59742, 43.6426, "2227 Camping Riviera & Wellness Ancona Sud IT AA"],
  [13.37508, 43.49918, "2228 Area Sosta Comunale Ancona Est IT PS"],
  [13.36508, 43.55893, "2229 Parcheggio Sosta Panoramica Ancona Ovest IT PS"],
  [13.54144, 43.75667, "2230 Agricampeggio & Sosta Natura Ancona Centro IT PS"],
  [13.57886, 43.58512, "2231 Agricampeggio & Sosta Natura Ancona Mare IT CAMP"],
  [13.53943, 43.52505, "2232 Parcheggio Sosta Panoramica Ancona Collina IT CAMP"],
  [13.40824, 43.76495, "2233 Parcheggio Sosta Panoramica Ancona Lago IT PS"],
  [12.7039, 43.73527, "2234 Camper Service Autostradale Pesaro Nord IT PS"],
  [12.74909, 43.74091, "2235 Parcheggio Sosta Panoramica Pesaro Sud IT CAMP"],
  [12.78815, 43.84032, "2236 Area Sosta Comunale Pesaro Est IT CAMP"],
  [13.11281, 44.00523, "2237 Area Sosta Comunale Pesaro Ovest IT CAMP"],
  [12.9451, 43.91415, "2238 Parcheggio Sosta Panoramica Pesaro Centro IT CAMP"],
  [12.84835, 43.74841, "2239 Area Sosta Comunale Pesaro Mare IT CS"],
  [12.95027, 43.86368, "2240 Agricampeggio & Sosta Natura Pesaro Collina IT CS"],
  [12.72966, 44.01908, "2241 Agricampeggio & Sosta Natura Pesaro Lago IT CS"],
  [13.01872, 44.05646, "2242 Parcheggio Sosta Panoramica Pesaro Terme IT PS"],
  [13.05987, 43.79572, "2243 Camper Service Autostradale Pesaro Nord IT CAMP"],
  [12.70512, 43.95999, "2244 Parcheggio Sosta Panoramica Pesaro Sud IT AA"],
  [13.10314, 44.00824, "2245 Area Sosta Comunale Pesaro Est IT PS"],
  [12.88374, 44.04313, "2246 Agricampeggio & Sosta Natura Pesaro Ovest IT CAMP"],
  [13.07057, 43.99689, "2247 Camper Park Attrezzato Pesaro Centro IT AA"],
  [12.86042, 44.0073, "2248 Camping Riviera & Wellness Pesaro Mare IT AA"],
  [12.93127, 43.74961, "2249 Parcheggio Sosta Panoramica Pesaro Collina IT CAMP"],
  [12.78766, 43.91104, "2250 Agricampeggio & Sosta Natura Pesaro Lago IT CS"],
  [12.8651, 43.99125, "2251 Camping Riviera & Wellness Pesaro Terme IT AA"],
  [12.72884, 43.93654, "2252 Parcheggio Sosta Panoramica Pesaro Nord IT PS"],
  [12.75491, 44.01043, "2253 Agricampeggio & Sosta Natura Pesaro Sud IT PS"],
  [13.02369, 43.90175, "2254 Area Sosta Comunale Pesaro Est IT CAMP"],
  [12.91412, 43.76498, "2255 Agricampeggio & Sosta Natura Pesaro Ovest IT PS"],
  [12.77745, 43.90352, "2256 Camper Park Attrezzato Pesaro Centro IT CS"],
  [12.94083, 43.93517, "2257 Camping Riviera & Wellness Pesaro Mare IT PS"],
  [13.03785, 43.76028, "2258 Camper Park Attrezzato Pesaro Collina IT CS"],
  [13.41899, 43.36031, "2259 Area Sosta Comunale Macerata Nord IT AA"],
  [13.49564, 43.23746, "2260 Camper Park Attrezzato Macerata Sud IT CAMP"],
  [13.38577, 43.18444, "2261 Agricampeggio & Sosta Natura Macerata Est IT AA"],
  [13.24859, 43.17624, "2262 Parcheggio Sosta Panoramica Macerata Ovest IT PS"],
  [13.2986, 43.36508, "2263 Camper Park Attrezzato Macerata Centro IT CS"],
  [13.33777, 43.38405, "2264 Area Sosta Comunale Macerata Mare IT AA"],
  [13.54061, 43.13001, "2265 Agricampeggio & Sosta Natura Macerata Collina IT CS"],
  [13.23864, 43.28272, "2266 Agricampeggio & Sosta Natura Macerata Lago IT AA"],
  [13.32011, 43.3135, "2267 Camping Riviera & Wellness Macerata Terme IT CS"],
  [13.55687, 43.29426, "2268 Parcheggio Sosta Panoramica Macerata Nord IT CAMP"],
  [13.23667, 43.36976, "2269 Camping Riviera & Wellness Macerata Sud IT CS"],
  [13.35621, 43.18481, "2270 Agricampeggio & Sosta Natura Macerata Est IT AA"],
  [13.65373, 43.28794, "2271 Area Sosta Comunale Macerata Ovest IT CAMP"],
  [13.52674, 43.35633, "2272 Camper Service Autostradale Macerata Centro IT AA"],
  [13.61873, 43.13188, "2273 Area Sosta Comunale Macerata Mare IT CAMP"],
  [13.45724, 43.46813, "2274 Camper Park Attrezzato Macerata Collina IT PS"],
  [13.4971, 43.29483, "2275 Agricampeggio & Sosta Natura Macerata Lago IT AA"],
  [13.66346, 43.19481, "2276 Camper Park Attrezzato Macerata Terme IT AA"],
  [13.46664, 43.21179, "2277 Area Sosta Comunale Macerata Nord IT AA"],
  [13.29905, 43.26289, "2278 Camper Service Autostradale Macerata Sud IT CAMP"],
  [13.50975, 43.24837, "2279 Camping Riviera & Wellness Macerata Est IT CAMP"],
  [13.2563, 43.22176, "2280 Parcheggio Sosta Panoramica Macerata Ovest IT CS"],
  [13.59509, 43.43684, "2281 Camper Service Autostradale Macerata Centro IT CAMP"],
  [13.75403, 42.7327, "2282 Camper Park Attrezzato Ascoli Piceno Nord IT CAMP"],
  [13.58462, 42.93506, "2283 Area Sosta Comunale Ascoli Piceno Sud IT CS"],
  [13.41904, 42.76373, "2284 Camper Service Autostradale Ascoli Piceno Est IT CS"],
  [13.59431, 42.79485, "2285 Parcheggio Sosta Panoramica Ascoli Piceno Ovest IT CAMP"],
  [13.59391, 42.7281, "2286 Camping Riviera & Wellness Ascoli Piceno Centro IT CS"],
  [13.66761, 42.78775, "2287 Camper Park Attrezzato Ascoli Piceno Mare IT CS"],
  [13.7894, 43.02809, "2288 Camper Service Autostradale Ascoli Piceno Collina IT CS"],
  [13.763, 43.00616, "2289 Camping Riviera & Wellness Ascoli Piceno Lago IT CS"],
  [13.77717, 42.87467, "2290 Area Sosta Comunale Ascoli Piceno Terme IT CAMP"],
  [13.74614, 42.79076, "2291 Camper Park Attrezzato Ascoli Piceno Nord IT AA"],
  [13.53662, 42.98765, "2292 Agricampeggio & Sosta Natura Ascoli Piceno Sud IT AA"],
  [13.7705, 42.83465, "2293 Agricampeggio & Sosta Natura Ascoli Piceno Est IT PS"],
  [13.39835, 42.95229, "2294 Camper Park Attrezzato Ascoli Piceno Ovest IT CAMP"],
  [13.62569, 42.94646, "2295 Area Sosta Comunale Ascoli Piceno Centro IT CS"],
  [13.45421, 42.87807, "2296 Parcheggio Sosta Panoramica Ascoli Piceno Mare IT CAMP"],
  [13.51197, 42.92018, "2297 Camper Park Attrezzato Ascoli Piceno Collina IT CS"],
  [13.62242, 42.85541, "2298 Camper Park Attrezzato Ascoli Piceno Lago IT PS"],
  [13.57145, 42.97785, "2299 Camper Park Attrezzato Ascoli Piceno Terme IT CAMP"],
  [13.67717, 43.0656, "2300 Camper Park Attrezzato Fermo Nord IT CS"],
  [13.59345, 43.31897, "2301 Agricampeggio & Sosta Natura Fermo Sud IT AA"],
  [13.9105, 43.00955, "2302 Camper Park Attrezzato Fermo Est IT CS"],
  [13.6395, 43.15788, "2303 Parcheggio Sosta Panoramica Fermo Ovest IT PS"],
  [13.8426, 43.13604, "2304 Camper Park Attrezzato Fermo Centro IT PS"],
  [13.76848, 43.09591, "2305 Camping Riviera & Wellness Fermo Mare IT PS"],
  [13.69891, 43.02466, "2306 Parcheggio Sosta Panoramica Fermo Collina IT AA"],
  [13.67133, 43.16795, "2307 Camper Park Attrezzato Fermo Lago IT AA"],
  [13.83762, 43.12199, "2308 Parcheggio Sosta Panoramica Fermo Terme IT AA"],
  [13.67242, 43.08831, "2309 Camper Park Attrezzato Fermo Nord IT AA"],
  [13.68341, 43.14787, "2310 Agricampeggio & Sosta Natura Fermo Sud IT CAMP"],
  [13.55731, 43.16734, "2311 Camping Riviera & Wellness Fermo Est IT AA"],
  [13.54423, 43.23933, "2312 Area Sosta Comunale Fermo Ovest IT PS"],
  [13.6962, 43.13115, "2313 Camper Service Autostradale Fermo Centro IT CS"],
  [13.81399, 43.19301, "2314 Camper Service Autostradale Fermo Mare IT CS"],
  [13.63913, 43.01796, "2315 Camper Service Autostradale Fermo Collina IT CS"],
  [13.53434, 43.24304, "2316 Camping Riviera & Wellness Fermo Lago IT CS"],
  [13.72902, 43.11343, "2317 Camping Riviera & Wellness Fermo Terme IT PS"],
  [13.72355, 43.26327, "2318 Camping Riviera & Wellness Fermo Nord IT PS"],
  [13.51306, 43.17902, "2319 Camper Service Autostradale Fermo Sud IT CS"],
  [12.6596, 42.03276, "2320 Parcheggio Sosta Panoramica Roma Nord IT CAMP"],
  [12.59182, 41.7904, "2321 Camper Park Attrezzato Roma Sud IT CS"],
  [12.61728, 41.83613, "2322 Agricampeggio & Sosta Natura Roma Est IT PS"],
  [12.3243, 41.94706, "2323 Agricampeggio & Sosta Natura Roma Ovest IT PS"],
  [12.61583, 41.72904, "2324 Camper Park Attrezzato Roma Centro IT CS"],
  [12.49579, 41.90197, "2325 Camper Service Autostradale Roma Mare IT AA"],
  [12.37845, 42.03675, "2326 Parcheggio Sosta Panoramica Roma Collina IT AA"],
  [12.30713, 41.87135, "2327 Camper Service Autostradale Roma Lago IT PS"],
  [12.39655, 42.03656, "2328 Camper Park Attrezzato Roma Terme IT AA"],
  [12.29618, 41.79249, "2329 Area Sosta Comunale Roma Nord IT CS"],
  [12.28599, 41.77868, "2330 Area Sosta Comunale Roma Sud IT CAMP"],
  [12.29346, 42.04993, "2331 Agricampeggio & Sosta Natura Roma Est IT CAMP"],
  [12.39937, 41.78427, "2332 Camper Park Attrezzato Roma Ovest IT PS"],
  [12.43348, 41.99007, "2333 Camper Service Autostradale Roma Centro IT CS"],
  [12.41667, 41.99678, "2334 Area Sosta Comunale Roma Mare IT AA"],
  [12.65089, 41.99325, "2335 Area Sosta Comunale Roma Collina IT PS"],
  [12.32631, 41.89259, "2336 Agricampeggio & Sosta Natura Roma Lago IT AA"],
  [12.50749, 41.91227, "2337 Agricampeggio & Sosta Natura Roma Terme IT CAMP"],
  [12.52852, 41.74816, "2338 Parcheggio Sosta Panoramica Roma Nord IT CS"],
  [12.54355, 41.98123, "2339 Camper Service Autostradale Roma Sud IT AA"],
  [11.99655, 42.53913, "2340 Parcheggio Sosta Panoramica Viterbo Nord IT PS"],
  [12.10308, 42.4574, "2341 Camper Park Attrezzato Viterbo Sud IT CAMP"],
  [12.27735, 42.52519, "2342 Camper Service Autostradale Viterbo Est IT PS"],
  [11.9668, 42.34407, "2343 Camping Riviera & Wellness Viterbo Ovest IT CS"],
  [12.23823, 42.40511, "2344 Area Sosta Comunale Viterbo Centro IT AA"],
  [12.06602, 42.59205, "2345 Parcheggio Sosta Panoramica Viterbo Mare IT CS"],
  [12.16658, 42.43855, "2346 Agricampeggio & Sosta Natura Viterbo Collina IT CAMP"],
  [12.00643, 42.31282, "2347 Camping Riviera & Wellness Viterbo Lago IT AA"],
  [12.1272, 42.3475, "2348 Agricampeggio & Sosta Natura Viterbo Terme IT AA"],
  [12.03331, 42.48244, "2349 Area Sosta Comunale Viterbo Nord IT AA"],
  [12.25492, 42.31031, "2350 Camper Park Attrezzato Viterbo Sud IT AA"],
  [12.17024, 42.52144, "2351 Camper Service Autostradale Viterbo Est IT PS"],
  [12.28113, 42.46192, "2352 Camper Park Attrezzato Viterbo Ovest IT PS"],
  [12.06598, 42.5168, "2353 Camper Service Autostradale Viterbo Centro IT CAMP"],
  [12.20593, 42.34717, "2354 Parcheggio Sosta Panoramica Viterbo Mare IT AA"],
  [11.97342, 42.42996, "2355 Parcheggio Sosta Panoramica Viterbo Collina IT CAMP"],
  [11.94689, 42.26557, "2356 Agricampeggio & Sosta Natura Viterbo Lago IT CAMP"],
  [12.16163, 42.58667, "2357 Agricampeggio & Sosta Natura Viterbo Terme IT AA"],
  [11.96402, 42.45439, "2358 Parcheggio Sosta Panoramica Viterbo Nord IT CS"],
  [12.02122, 42.48924, "2359 Agricampeggio & Sosta Natura Viterbo Sud IT AA"],
  [12.10337, 42.38725, "2360 Agricampeggio & Sosta Natura Viterbo Est IT AA"],
  [12.30753, 42.40057, "2361 Agricampeggio & Sosta Natura Viterbo Ovest IT CS"],
  [13.03192, 41.33188, "2362 Camper Park Attrezzato Latina Nord IT CAMP"],
  [12.68992, 41.44792, "2363 Area Sosta Comunale Latina Sud IT CS"],
  [12.83175, 41.34653, "2364 Parcheggio Sosta Panoramica Latina Est IT PS"],
  [12.81836, 41.59846, "2365 Camping Riviera & Wellness Latina Ovest IT PS"],
  [12.72291, 41.56192, "2366 Camper Park Attrezzato Latina Centro IT CAMP"],
  [12.88542, 41.5462, "2367 Camper Park Attrezzato Latina Mare IT CS"],
  [12.69851, 41.40144, "2368 Area Sosta Comunale Latina Collina IT AA"],
  [12.69946, 41.45601, "2369 Agricampeggio & Sosta Natura Latina Lago IT AA"],
  [12.81916, 41.49475, "2370 Area Sosta Comunale Latina Terme IT CAMP"],
  [12.80766, 41.36279, "2371 Agricampeggio & Sosta Natura Latina Nord IT CS"],
  [12.80139, 41.52749, "2372 Camper Service Autostradale Latina Sud IT CAMP"],
  [13.10993, 41.33266, "2373 Agricampeggio & Sosta Natura Latina Est IT CS"],
  [12.92591, 41.48249, "2374 Camper Park Attrezzato Latina Ovest IT AA"],
  [13.0405, 41.62275, "2375 Camper Park Attrezzato Latina Centro IT CAMP"],
  [12.95467, 41.31754, "2376 Camper Park Attrezzato Latina Mare IT CS"],
  [12.73723, 41.44788, "2377 Parcheggio Sosta Panoramica Latina Collina IT CAMP"],
  [12.85132, 41.31026, "2378 Camping Riviera & Wellness Latina Lago IT PS"],
  [12.9958, 41.42977, "2379 Camper Service Autostradale Latina Terme IT AA"],
  [12.82825, 41.41707, "2380 Parcheggio Sosta Panoramica Latina Nord IT PS"],
  [13.04288, 41.55804, "2381 Camping Riviera & Wellness Latina Sud IT CS"],
  [12.72051, 41.49133, "2382 Camper Service Autostradale Latina Est IT AA"],
  [13.41679, 41.57344, "2383 Camper Service Autostradale Frosinone Nord IT AA"],
  [13.22751, 41.54589, "2384 Camper Service Autostradale Frosinone Sud IT PS"],
  [13.44163, 41.60203, "2385 Agricampeggio & Sosta Natura Frosinone Est IT CAMP"],
  [13.14042, 41.62345, "2386 Agricampeggio & Sosta Natura Frosinone Ovest IT CAMP"],
  [13.33436, 41.5878, "2387 Area Sosta Comunale Frosinone Centro IT PS"],
  [13.3988, 41.73358, "2388 Agricampeggio & Sosta Natura Frosinone Mare IT CS"],
  [13.4947, 41.50083, "2389 Parcheggio Sosta Panoramica Frosinone Collina IT CS"],
  [13.15872, 41.65945, "2390 Agricampeggio & Sosta Natura Frosinone Lago IT AA"],
  [13.39254, 41.62614, "2391 Parcheggio Sosta Panoramica Frosinone Terme IT CAMP"],
  [13.19836, 41.55009, "2392 Parcheggio Sosta Panoramica Frosinone Nord IT CS"],
  [13.22051, 41.48792, "2393 Camper Service Autostradale Frosinone Sud IT PS"],
  [13.28079, 41.66332, "2394 Camper Service Autostradale Frosinone Est IT PS"],
  [13.16185, 41.69671, "2395 Camper Park Attrezzato Frosinone Ovest IT CS"],
  [13.33511, 41.67206, "2396 Area Sosta Comunale Frosinone Centro IT PS"],
  [13.55695, 41.52646, "2397 Camper Service Autostradale Frosinone Mare IT AA"],
  [13.49313, 41.50286, "2398 Parcheggio Sosta Panoramica Frosinone Collina IT AA"],
  [13.42387, 41.6378, "2399 Agricampeggio & Sosta Natura Frosinone Lago IT PS"],
  [13.52607, 41.75076, "2400 Camper Park Attrezzato Frosinone Terme IT AA"],
  [13.33064, 41.69611, "2401 Camper Park Attrezzato Frosinone Nord IT AA"],
  [13.32802, 41.68025, "2402 Camper Service Autostradale Frosinone Sud IT CAMP"],
  [13.26168, 41.7719, "2403 Camping Riviera & Wellness Frosinone Est IT CS"],
  [13.5386, 41.71603, "2404 Camper Service Autostradale Frosinone Ovest IT CAMP"],
  [13.57069, 41.46764, "2405 Parcheggio Sosta Panoramica Frosinone Centro IT AA"],
  [13.15488, 41.76318, "2406 Camper Park Attrezzato Frosinone Mare IT PS"],
  [13.49614, 41.71097, "2407 Area Sosta Comunale Frosinone Collina IT AA"],
  [12.74306, 42.53219, "2408 Agricampeggio & Sosta Natura Rieti Nord IT AA"],
  [12.80946, 42.34054, "2409 Camping Riviera & Wellness Rieti Sud IT PS"],
  [12.93532, 42.41999, "2410 Camper Service Autostradale Rieti Est IT PS"],
  [12.81027, 42.29508, "2411 Camper Park Attrezzato Rieti Ovest IT PS"],
  [13.08606, 42.28319, "2412 Camper Service Autostradale Rieti Centro IT CAMP"],
  [12.92898, 42.23326, "2413 Camper Park Attrezzato Rieti Mare IT CS"],
  [12.93327, 42.53891, "2414 Camping Riviera & Wellness Rieti Collina IT CS"],
  [12.99987, 42.27723, "2415 Area Sosta Comunale Rieti Lago IT CS"],
  [12.82877, 42.44075, "2416 Camping Riviera & Wellness Rieti Terme IT PS"],
  [12.88562, 42.4075, "2417 Camper Service Autostradale Rieti Nord IT CS"],
  [12.72081, 42.35356, "2418 Camper Service Autostradale Rieti Sud IT PS"],
  [12.96611, 42.40355, "2419 Parcheggio Sosta Panoramica Rieti Est IT AA"],
  [12.89656, 42.5535, "2420 Camper Service Autostradale Rieti Ovest IT CAMP"],
  [12.9544, 42.42805, "2421 Area Sosta Comunale Rieti Centro IT AA"],
  [12.94792, 42.39774, "2422 Parcheggio Sosta Panoramica Rieti Mare IT AA"],
  [13.07981, 42.48515, "2423 Camping Riviera & Wellness Rieti Collina IT CS"],
  [12.87271, 42.41013, "2424 Camper Service Autostradale Rieti Lago IT CAMP"],
  [12.97096, 42.39456, "2425 Camper Park Attrezzato Rieti Terme IT AA"],
  [12.99634, 42.45099, "2426 Camping Riviera & Wellness Rieti Nord IT AA"],
  [12.7918, 42.24767, "2427 Parcheggio Sosta Panoramica Rieti Sud IT CAMP"],
  [13.04492, 42.38811, "2428 Camper Service Autostradale Rieti Est IT AA"],
  [13.07719, 42.35272, "2429 Camper Service Autostradale Rieti Ovest IT CAMP"],
  [12.94997, 42.28783, "2430 Agricampeggio & Sosta Natura Rieti Centro IT CAMP"],
  [13.43466, 42.39506, "2431 Area Sosta Comunale L'Aquila Nord IT CAMP"],
  [13.5385, 42.52143, "2432 Camping Riviera & Wellness L'Aquila Sud IT AA"],
  [13.23157, 42.34447, "2433 Agricampeggio & Sosta Natura L'Aquila Est IT AA"],
  [13.45161, 42.26302, "2434 Agricampeggio & Sosta Natura L'Aquila Ovest IT AA"],
  [13.2247, 42.17977, "2435 Agricampeggio & Sosta Natura L'Aquila Centro IT CAMP"],
  [13.47112, 42.43344, "2436 Parcheggio Sosta Panoramica L'Aquila Mare IT CS"],
  [13.48985, 42.26624, "2437 Camper Park Attrezzato L'Aquila Collina IT CAMP"],
  [13.56241, 42.45458, "2438 Camper Park Attrezzato L'Aquila Lago IT PS"],
  [13.44249, 42.51337, "2439 Area Sosta Comunale L'Aquila Terme IT CAMP"],
  [13.36033, 42.43827, "2440 Camper Service Autostradale L'Aquila Nord IT CS"],
  [13.5012, 42.40603, "2441 Camper Park Attrezzato L'Aquila Sud IT PS"],
  [13.55332, 42.37702, "2442 Camper Park Attrezzato L'Aquila Est IT CS"],
  [13.54329, 42.26734, "2443 Camping Riviera & Wellness L'Aquila Ovest IT AA"],
  [13.3888, 42.33721, "2444 Camper Park Attrezzato L'Aquila Centro IT AA"],
  [13.58961, 42.50669, "2445 Camping Riviera & Wellness L'Aquila Mare IT PS"],
  [13.35003, 42.41403, "2446 Camper Service Autostradale L'Aquila Collina IT CS"],
  [13.37013, 42.36045, "2447 Camper Park Attrezzato L'Aquila Lago IT CAMP"],
  [13.31656, 42.3085, "2448 Camper Service Autostradale L'Aquila Terme IT CAMP"],
  [13.46134, 42.496, "2449 Area Sosta Comunale L'Aquila Nord IT AA"],
  [13.56076, 42.49611, "2450 Parcheggio Sosta Panoramica L'Aquila Sud IT PS"],
  [13.21872, 42.26828, "2451 Agricampeggio & Sosta Natura L'Aquila Est IT CAMP"],
  [13.51159, 42.4454, "2452 Camper Service Autostradale L'Aquila Ovest IT PS"],
  [14.07146, 42.5284, "2453 Camping Riviera & Wellness Pescara Nord IT CAMP"],
  [14.02108, 42.28977, "2454 Camping Riviera & Wellness Pescara Sud IT AA"],
  [14.29897, 42.47064, "2455 Area Sosta Comunale Pescara Est IT PS"],
  [14.10385, 42.54064, "2456 Camper Park Attrezzato Pescara Ovest IT CAMP"],
  [14.0161, 42.50359, "2457 Area Sosta Comunale Pescara Centro IT AA"],
  [14.30913, 42.51013, "2458 Parcheggio Sosta Panoramica Pescara Mare IT CS"],
  [14.04896, 42.58655, "2459 Area Sosta Comunale Pescara Collina IT AA"],
  [14.1045, 42.53028, "2460 Area Sosta Comunale Pescara Lago IT CS"],
  [14.27795, 42.61446, "2461 Camping Riviera & Wellness Pescara Terme IT PS"],
  [14.29091, 42.52908, "2462 Camper Service Autostradale Pescara Nord IT CAMP"],
  [14.0238, 42.34349, "2463 Agricampeggio & Sosta Natura Pescara Sud IT CAMP"],
  [14.43868, 42.42281, "2464 Camper Service Autostradale Pescara Est IT AA"],
  [14.02173, 42.34908, "2465 Agricampeggio & Sosta Natura Pescara Ovest IT CAMP"],
  [14.28097, 42.42422, "2466 Parcheggio Sosta Panoramica Pescara Centro IT CS"],
  [14.18456, 42.47602, "2467 Camper Park Attrezzato Pescara Mare IT AA"],
  [14.03698, 42.53719, "2468 Camper Service Autostradale Pescara Collina IT AA"],
  [14.10327, 42.48677, "2469 Area Sosta Comunale Pescara Lago IT AA"],
  [14.05748, 42.60058, "2470 Area Sosta Comunale Pescara Terme IT PS"],
  [14.1104, 42.51941, "2471 Area Sosta Comunale Pescara Nord IT AA"],
  [14.22242, 42.48792, "2472 Camper Service Autostradale Pescara Sud IT CAMP"],
  [14.37032, 42.43942, "2473 Camper Service Autostradale Pescara Est IT PS"],
  [14.25267, 42.31055, "2474 Area Sosta Comunale Chieti Nord IT CS"],
  [14.36327, 42.37454, "2475 Area Sosta Comunale Chieti Sud IT PS"],
  [14.12278, 42.41464, "2476 Agricampeggio & Sosta Natura Chieti Est IT CAMP"],
  [14.37492, 42.36312, "2477 Agricampeggio & Sosta Natura Chieti Ovest IT AA"],
  [14.07298, 42.44216, "2478 Camper Service Autostradale Chieti Centro IT AA"],
  [14.37788, 42.37007, "2479 Camper Park Attrezzato Chieti Mare IT CS"],
  [14.34591, 42.41956, "2480 Agricampeggio & Sosta Natura Chieti Collina IT CS"],
  [14.22726, 42.2057, "2481 Camper Service Autostradale Chieti Lago IT CAMP"],
  [13.95391, 42.18849, "2482 Camper Park Attrezzato Chieti Terme IT CS"],
  [14.29923, 42.31207, "2483 Camper Service Autostradale Chieti Nord IT CS"],
  [14.31791, 42.36288, "2484 Camper Service Autostradale Chieti Sud IT CAMP"],
  [13.96772, 42.18896, "2485 Area Sosta Comunale Chieti Est IT PS"],
  [14.3057, 42.21737, "2486 Camper Service Autostradale Chieti Ovest IT AA"],
  [14.18395, 42.48057, "2487 Camping Riviera & Wellness Chieti Centro IT PS"],
  [14.00622, 42.18891, "2488 Area Sosta Comunale Chieti Mare IT CS"],
  [14.22077, 42.49351, "2489 Camper Service Autostradale Chieti Collina IT AA"],
  [13.94896, 42.40308, "2490 Camping Riviera & Wellness Chieti Lago IT CS"],
  [13.98628, 42.46326, "2491 Agricampeggio & Sosta Natura Chieti Terme IT AA"],
  [14.31036, 42.19839, "2492 Parcheggio Sosta Panoramica Chieti Nord IT CS"],
  [13.57846, 42.76351, "2493 Parcheggio Sosta Panoramica Teramo Nord IT PS"],
  [13.85535, 42.60187, "2494 Camper Service Autostradale Teramo Sud IT CS"],
  [13.78704, 42.52608, "2495 Agricampeggio & Sosta Natura Teramo Est IT PS"],
  [13.8361, 42.77655, "2496 Agricampeggio & Sosta Natura Teramo Ovest IT CS"],
  [13.50765, 42.54451, "2497 Parcheggio Sosta Panoramica Teramo Centro IT AA"],
  [13.55482, 42.74894, "2498 Camper Park Attrezzato Teramo Mare IT CAMP"],
  [13.58884, 42.54155, "2499 Parcheggio Sosta Panoramica Teramo Collina IT CAMP"],
  [13.86052, 42.51879, "2500 Camper Park Attrezzato Teramo Lago IT AA"],
  [13.69834, 42.48927, "2501 Camper Park Attrezzato Teramo Terme IT PS"],
  [13.51931, 42.54659, "2502 Area Sosta Comunale Teramo Nord IT AA"],
  [13.83571, 42.72653, "2503 Camper Service Autostradale Teramo Sud IT CAMP"],
  [13.54359, 42.52821, "2504 Camping Riviera & Wellness Teramo Est IT PS"],
  [13.58686, 42.64145, "2505 Parcheggio Sosta Panoramica Teramo Ovest IT CAMP"],
  [13.74752, 42.72589, "2506 Parcheggio Sosta Panoramica Teramo Centro IT CS"],
  [13.76144, 42.8164, "2507 Parcheggio Sosta Panoramica Teramo Mare IT PS"],
  [13.73017, 42.63038, "2508 Agricampeggio & Sosta Natura Teramo Collina IT CAMP"],
  [13.91876, 42.82911, "2509 Area Sosta Comunale Teramo Lago IT CS"],
  [13.6881, 42.66144, "2510 Parcheggio Sosta Panoramica Teramo Terme IT CAMP"],
  [13.52991, 42.50237, "2511 Agricampeggio & Sosta Natura Teramo Nord IT CS"],
  [14.34466, 40.73851, "2512 Camper Service Autostradale Napoli Nord IT PS"],
  [14.17138, 40.9025, "2513 Area Sosta Comunale Napoli Sud IT AA"],
  [14.40542, 40.7938, "2514 Agricampeggio & Sosta Natura Napoli Est IT PS"],
  [14.06671, 40.71335, "2515 Area Sosta Comunale Napoli Ovest IT PS"],
  [14.26138, 40.95172, "2516 Camper Park Attrezzato Napoli Centro IT CS"],
  [14.36773, 40.99008, "2517 Area Sosta Comunale Napoli Mare IT AA"],
  [14.34768, 40.74636, "2518 Camper Service Autostradale Napoli Collina IT CAMP"],
  [14.18986, 40.94944, "2519 Camper Park Attrezzato Napoli Lago IT CAMP"],
  [14.43455, 40.93501, "2520 Camper Park Attrezzato Napoli Terme IT AA"],
  [14.30639, 40.70254, "2521 Camper Park Attrezzato Napoli Nord IT PS"],
  [14.46065, 40.72753, "2522 Camper Service Autostradale Napoli Sud IT AA"],
  [14.10448, 40.81237, "2523 Camper Park Attrezzato Napoli Est IT PS"],
  [14.16446, 40.80231, "2524 Camping Riviera & Wellness Napoli Ovest IT CS"],
  [14.299, 40.68803, "2525 Camper Park Attrezzato Napoli Centro IT CAMP"],
  [14.25259, 40.71569, "2526 Camper Park Attrezzato Napoli Mare IT CAMP"],
  [14.14203, 40.94292, "2527 Camper Park Attrezzato Napoli Collina IT PS"],
  [14.40065, 40.73168, "2528 Parcheggio Sosta Panoramica Napoli Lago IT CAMP"],
  [14.42785, 41.01635, "2529 Parcheggio Sosta Panoramica Napoli Terme IT CS"],
  [14.26325, 40.97674, "2530 Camper Service Autostradale Napoli Nord IT AA"],
  [14.25134, 40.84252, "2531 Parcheggio Sosta Panoramica Napoli Sud IT CS"],
  [14.64592, 40.80841, "2532 Camping Riviera & Wellness Salerno Nord IT PS"],
  [14.95177, 40.58084, "2533 Parcheggio Sosta Panoramica Salerno Sud IT PS"],
  [14.7224, 40.81739, "2534 Parcheggio Sosta Panoramica Salerno Est IT CS"],
  [14.86446, 40.84995, "2535 Area Sosta Comunale Salerno Ovest IT AA"],
  [14.75007, 40.68889, "2536 Camper Service Autostradale Salerno Centro IT AA"],
  [14.57179, 40.67635, "2537 Camper Service Autostradale Salerno Mare IT AA"],
  [14.96187, 40.75913, "2538 Camping Riviera & Wellness Salerno Collina IT AA"],
  [14.82584, 40.60653, "2539 Agricampeggio & Sosta Natura Salerno Lago IT CS"],
  [14.67158, 40.67092, "2540 Area Sosta Comunale Salerno Terme IT AA"],
  [14.54539, 40.76455, "2541 Parcheggio Sosta Panoramica Salerno Nord IT PS"],
  [14.92779, 40.77314, "2542 Camper Service Autostradale Salerno Sud IT PS"],
  [14.70109, 40.77945, "2543 Camper Park Attrezzato Salerno Est IT PS"],
  [14.92157, 40.72469, "2544 Camping Riviera & Wellness Salerno Ovest IT PS"],
  [14.68421, 40.8157, "2545 Camper Service Autostradale Salerno Centro IT AA"],
  [14.65581, 40.65207, "2546 Agricampeggio & Sosta Natura Salerno Mare IT AA"],
  [14.93078, 40.53134, "2547 Camping Riviera & Wellness Salerno Collina IT CS"],
  [14.83799, 40.83386, "2548 Parcheggio Sosta Panoramica Salerno Lago IT AA"],
  [14.74381, 40.63703, "2549 Area Sosta Comunale Salerno Terme IT AA"],
  [14.36116, 40.96844, "2550 Agricampeggio & Sosta Natura Caserta Nord IT CAMP"],
  [14.20182, 41.15537, "2551 Parcheggio Sosta Panoramica Caserta Sud IT AA"],
  [14.40177, 41.09597, "2552 Camper Park Attrezzato Caserta Est IT CAMP"],
  [14.25391, 41.17341, "2553 Camping Riviera & Wellness Caserta Ovest IT CS"],
  [14.23442, 41.14518, "2554 Parcheggio Sosta Panoramica Caserta Centro IT CAMP"],
  [14.3285, 41.02793, "2555 Agricampeggio & Sosta Natura Caserta Mare IT AA"],
  [14.41494, 41.15554, "2556 Camper Service Autostradale Caserta Collina IT AA"],
  [14.46966, 41.12443, "2557 Camper Service Autostradale Caserta Lago IT CAMP"],
  [14.31574, 41.21927, "2558 Camper Park Attrezzato Caserta Terme IT AA"],
  [14.23947, 41.22138, "2559 Camper Service Autostradale Caserta Nord IT AA"],
  [14.16011, 40.96477, "2560 Area Sosta Comunale Caserta Sud IT AA"],
  [14.20162, 40.95977, "2561 Camper Service Autostradale Caserta Est IT CS"],
  [14.41678, 41.05289, "2562 Agricampeggio & Sosta Natura Caserta Ovest IT AA"],
  [14.30944, 41.02845, "2563 Camper Service Autostradale Caserta Centro IT CS"],
  [14.11962, 40.97327, "2564 Agricampeggio & Sosta Natura Caserta Mare IT AA"],
  [14.29496, 41.13274, "2565 Parcheggio Sosta Panoramica Caserta Collina IT CS"],
  [14.25654, 41.13322, "2566 Camping Riviera & Wellness Caserta Lago IT CAMP"],
  [14.16908, 41.01353, "2567 Camper Service Autostradale Caserta Terme IT PS"],
  [14.73946, 40.81837, "2568 Agricampeggio & Sosta Natura Avellino Nord IT CS"],
  [14.70007, 40.79092, "2569 Area Sosta Comunale Avellino Sud IT CAMP"],
  [14.89242, 41.06245, "2570 Parcheggio Sosta Panoramica Avellino Est IT CS"],
  [14.9498, 41.07962, "2571 Camper Park Attrezzato Avellino Ovest IT CAMP"],
  [14.59062, 40.82227, "2572 Camper Park Attrezzato Avellino Centro IT CS"],
  [14.68928, 40.78327, "2573 Parcheggio Sosta Panoramica Avellino Mare IT CAMP"],
  [14.58771, 40.93587, "2574 Camper Park Attrezzato Avellino Collina IT CS"],
  [14.77389, 40.79078, "2575 Agricampeggio & Sosta Natura Avellino Lago IT CAMP"],
  [14.9863, 40.84455, "2576 Parcheggio Sosta Panoramica Avellino Terme IT CS"],
  [14.99861, 41.00798, "2577 Camper Service Autostradale Avellino Nord IT PS"],
  [14.90442, 40.7405, "2578 Camper Park Attrezzato Avellino Sud IT CAMP"],
  [14.78536, 40.98591, "2579 Camping Riviera & Wellness Avellino Est IT CAMP"],
  [14.93191, 40.97241, "2580 Parcheggio Sosta Panoramica Avellino Ovest IT CAMP"],
  [14.90134, 40.9802, "2581 Agricampeggio & Sosta Natura Avellino Centro IT PS"],
  [14.62469, 40.9763, "2582 Camper Park Attrezzato Avellino Mare IT AA"],
  [14.67126, 40.95513, "2583 Camper Service Autostradale Avellino Collina IT AA"],
  [14.84577, 40.85323, "2584 Area Sosta Comunale Avellino Lago IT CAMP"],
  [14.92368, 40.92325, "2585 Parcheggio Sosta Panoramica Avellino Terme IT CS"],
  [14.81439, 40.74689, "2586 Camper Park Attrezzato Avellino Nord IT CAMP"],
  [14.61142, 40.97405, "2587 Camping Riviera & Wellness Avellino Sud IT PS"],
  [14.84353, 40.91066, "2588 Camper Park Attrezzato Avellino Est IT PS"],
  [14.63868, 40.86537, "2589 Camping Riviera & Wellness Avellino Ovest IT AA"],
  [14.68489, 41.08519, "2590 Camper Service Autostradale Benevento Nord IT CAMP"],
  [14.95024, 41.29683, "2591 Agricampeggio & Sosta Natura Benevento Sud IT CAMP"],
  [14.7567, 41.20945, "2592 Camper Park Attrezzato Benevento Est IT AA"],
  [14.91935, 41.05572, "2593 Camper Service Autostradale Benevento Ovest IT PS"],
  [14.61961, 41.26845, "2594 Camping Riviera & Wellness Benevento Centro IT PS"],
  [14.77038, 41.02742, "2595 Camper Park Attrezzato Benevento Mare IT AA"],
  [14.82261, 41.2813, "2596 Area Sosta Comunale Benevento Collina IT CAMP"],
  [14.84426, 40.95702, "2597 Area Sosta Comunale Benevento Lago IT PS"],
  [14.76475, 41.01591, "2598 Camper Service Autostradale Benevento Terme IT CAMP"],
  [14.7286, 41.0198, "2599 Camper Park Attrezzato Benevento Nord IT CS"],
  [14.6927, 41.24268, "2600 Area Sosta Comunale Benevento Sud IT PS"],
  [14.76535, 41.15045, "2601 Camper Service Autostradale Benevento Est IT CAMP"],
  [14.69188, 41.00861, "2602 Area Sosta Comunale Benevento Ovest IT AA"],
  [14.95851, 41.18353, "2603 Area Sosta Comunale Benevento Centro IT PS"],
  [14.86633, 41.12686, "2604 Camper Park Attrezzato Benevento Mare IT PS"],
  [14.68155, 40.99647, "2605 Area Sosta Comunale Benevento Collina IT CS"],
  [14.81828, 41.21565, "2606 Parcheggio Sosta Panoramica Benevento Lago IT AA"],
  [14.77102, 41.1745, "2607 Agricampeggio & Sosta Natura Benevento Terme IT PS"],
  [14.81567, 41.13408, "2608 Agricampeggio & Sosta Natura Benevento Nord IT AA"],
  [14.62256, 41.15828, "2609 Camper Park Attrezzato Benevento Sud IT CAMP"],
  [14.63029, 41.00212, "2610 Camping Riviera & Wellness Benevento Est IT PS"],
  [14.96725, 41.10153, "2611 Agricampeggio & Sosta Natura Benevento Ovest IT CAMP"],
  [14.79513, 41.05615, "2612 Area Sosta Comunale Benevento Centro IT CAMP"],
  [14.83941, 41.02254, "2613 Parcheggio Sosta Panoramica Benevento Mare IT AA"],
  [16.78919, 41.05501, "2614 Parcheggio Sosta Panoramica Bari Nord IT CS"],
  [16.95666, 41.18201, "2615 Agricampeggio & Sosta Natura Bari Sud IT CAMP"],
  [17.01739, 41.14512, "2616 Parcheggio Sosta Panoramica Bari Est IT AA"],
  [16.81476, 41.12346, "2617 Camper Park Attrezzato Bari Ovest IT AA"],
  [17.05675, 41.06121, "2618 Camper Service Autostradale Bari Centro IT PS"],
  [16.7464, 40.99619, "2619 Camper Park Attrezzato Bari Mare IT AA"],
  [17.02104, 41.1568, "2620 Parcheggio Sosta Panoramica Bari Collina IT CS"],
  [16.68128, 41.10327, "2621 Camper Service Autostradale Bari Lago IT AA"],
  [16.78711, 41.10993, "2622 Area Sosta Comunale Bari Terme IT CS"],
  [17.04728, 41.22806, "2623 Camper Park Attrezzato Bari Nord IT CAMP"],
  [16.65984, 41.19056, "2624 Camper Park Attrezzato Bari Sud IT CAMP"],
  [16.95931, 40.98715, "2625 Camper Park Attrezzato Bari Est IT AA"],
  [16.7055, 40.98597, "2626 Agricampeggio & Sosta Natura Bari Ovest IT CS"],
  [16.99971, 41.18389, "2627 Camper Service Autostradale Bari Centro IT AA"],
  [16.9877, 41.21324, "2628 Area Sosta Comunale Bari Mare IT AA"],
  [17.00377, 40.97984, "2629 Camper Park Attrezzato Bari Collina IT AA"],
  [16.76076, 40.98372, "2630 Camper Service Autostradale Bari Lago IT AA"],
  [16.98645, 41.17576, "2631 Agricampeggio & Sosta Natura Bari Terme IT AA"],
  [17.05243, 41.01399, "2632 Parcheggio Sosta Panoramica Bari Nord IT AA"],
  [18.33144, 40.20827, "2633 Area Sosta Comunale Lecce Nord IT CAMP"],
  [18.02305, 40.29824, "2634 Parcheggio Sosta Panoramica Lecce Sud IT CAMP"],
  [17.9954, 40.37608, "2635 Parcheggio Sosta Panoramica Lecce Est IT CS"],
  [18.037, 40.25245, "2636 Parcheggio Sosta Panoramica Lecce Ovest IT AA"],
  [18.19251, 40.49208, "2637 Camper Park Attrezzato Lecce Centro IT CAMP"],
  [18.33388, 40.49867, "2638 Camper Park Attrezzato Lecce Mare IT AA"],
  [18.03411, 40.42085, "2639 Agricampeggio & Sosta Natura Lecce Collina IT PS"],
  [18.39239, 40.46866, "2640 Camper Park Attrezzato Lecce Lago IT AA"],
  [18.13421, 40.35649, "2641 Camper Park Attrezzato Lecce Terme IT PS"],
  [18.18468, 40.33957, "2642 Area Sosta Comunale Lecce Nord IT CAMP"],
  [18.20151, 40.42316, "2643 Agricampeggio & Sosta Natura Lecce Sud IT PS"],
  [18.00288, 40.29134, "2644 Area Sosta Comunale Lecce Est IT AA"],
  [18.0912, 40.38664, "2645 Camper Service Autostradale Lecce Ovest IT CAMP"],
  [18.08157, 40.37037, "2646 Camper Park Attrezzato Lecce Centro IT PS"],
  [18.35344, 40.47637, "2647 Camper Park Attrezzato Lecce Mare IT PS"],
  [17.95655, 40.3051, "2648 Camping Riviera & Wellness Lecce Collina IT PS"],
  [18.14793, 40.21331, "2649 Camping Riviera & Wellness Lecce Lago IT PS"],
  [18.13108, 40.22668, "2650 Area Sosta Comunale Lecce Terme IT AA"],
  [18.39083, 40.50035, "2651 Camping Riviera & Wellness Lecce Nord IT AA"],
  [18.10318, 40.51782, "2652 Agricampeggio & Sosta Natura Lecce Sud IT AA"],
  [15.64594, 41.58054, "2653 Camper Park Attrezzato Foggia Nord IT AA"],
  [15.58674, 41.55529, "2654 Camping Riviera & Wellness Foggia Sud IT CAMP"],
  [15.59102, 41.45374, "2655 Agricampeggio & Sosta Natura Foggia Est IT PS"],
  [15.38592, 41.4662, "2656 Camper Service Autostradale Foggia Ovest IT PS"],
  [15.5398, 41.32997, "2657 Area Sosta Comunale Foggia Centro IT PS"],
  [15.33298, 41.61704, "2658 Camping Riviera & Wellness Foggia Mare IT CS"],
  [15.33164, 41.46155, "2659 Area Sosta Comunale Foggia Collina IT AA"],
  [15.46673, 41.4988, "2660 Camper Service Autostradale Foggia Lago IT CS"],
  [15.66168, 41.50533, "2661 Parcheggio Sosta Panoramica Foggia Terme IT CAMP"],
  [15.61754, 41.35788, "2662 Camper Service Autostradale Foggia Nord IT PS"],
  [15.47423, 41.37878, "2663 Parcheggio Sosta Panoramica Foggia Sud IT PS"],
  [15.71566, 41.63395, "2664 Area Sosta Comunale Foggia Est IT AA"],
  [15.70339, 41.44474, "2665 Camper Service Autostradale Foggia Ovest IT AA"],
  [15.39919, 41.29979, "2666 Camper Service Autostradale Foggia Centro IT PS"],
  [15.51341, 41.34465, "2667 Camping Riviera & Wellness Foggia Mare IT CAMP"],
  [15.66341, 41.42338, "2668 Camping Riviera & Wellness Foggia Collina IT CAMP"],
  [15.56233, 41.48102, "2669 Camping Riviera & Wellness Foggia Lago IT PS"],
  [15.38994, 41.48399, "2670 Camper Service Autostradale Foggia Terme IT PS"],
  [15.58557, 41.37939, "2671 Camper Service Autostradale Foggia Nord IT AA"],
  [15.66451, 41.52397, "2672 Parcheggio Sosta Panoramica Foggia Sud IT PS"],
  [15.58531, 41.3087, "2673 Agricampeggio & Sosta Natura Foggia Est IT CAMP"],
  [15.65353, 41.40931, "2674 Agricampeggio & Sosta Natura Foggia Ovest IT CS"],
  [15.36341, 41.40664, "2675 Camping Riviera & Wellness Foggia Centro IT AA"],
  [15.345, 41.43138, "2676 Agricampeggio & Sosta Natura Foggia Mare IT CAMP"],
  [17.28864, 40.51623, "2677 Camper Park Attrezzato Taranto Nord IT CS"],
  [17.0984, 40.32946, "2678 Agricampeggio & Sosta Natura Taranto Sud IT AA"],
  [17.41052, 40.45072, "2679 Area Sosta Comunale Taranto Est IT CAMP"],
  [17.23336, 40.29654, "2680 Agricampeggio & Sosta Natura Taranto Ovest IT PS"],
  [17.19764, 40.42161, "2681 Agricampeggio & Sosta Natura Taranto Centro IT AA"],
  [17.3258, 40.32442, "2682 Camper Service Autostradale Taranto Mare IT AA"],
  [17.36621, 40.46537, "2683 Camper Service Autostradale Taranto Collina IT CAMP"],
  [17.1855, 40.50459, "2684 Camper Park Attrezzato Taranto Lago IT CAMP"],
  [17.4033, 40.46333, "2685 Camper Park Attrezzato Taranto Terme IT PS"],
  [17.14132, 40.36433, "2686 Parcheggio Sosta Panoramica Taranto Nord IT AA"],
  [17.12365, 40.43011, "2687 Parcheggio Sosta Panoramica Taranto Sud IT CAMP"],
  [17.06463, 40.58487, "2688 Camping Riviera & Wellness Taranto Est IT AA"],
  [17.38253, 40.31294, "2689 Agricampeggio & Sosta Natura Taranto Ovest IT CAMP"],
  [17.38004, 40.36281, "2690 Camper Service Autostradale Taranto Centro IT PS"],
  [17.21681, 40.57084, "2691 Parcheggio Sosta Panoramica Taranto Mare IT CAMP"],
  [17.13507, 40.43441, "2692 Camper Park Attrezzato Taranto Collina IT CAMP"],
  [17.10327, 40.5566, "2693 Camping Riviera & Wellness Taranto Lago IT PS"],
  [17.41022, 40.53557, "2694 Camping Riviera & Wellness Taranto Terme IT AA"],
  [17.39276, 40.52068, "2695 Camper Park Attrezzato Taranto Nord IT PS"],
  [17.26172, 40.61741, "2696 Agricampeggio & Sosta Natura Taranto Sud IT PS"],
  [17.04895, 40.54372, "2697 Parcheggio Sosta Panoramica Taranto Est IT PS"],
  [17.77881, 40.50881, "2698 Camper Service Autostradale Brindisi Nord IT CAMP"],
  [18.09818, 40.60069, "2699 Camper Service Autostradale Brindisi Sud IT CAMP"],
  [17.8967, 40.52835, "2700 Camping Riviera & Wellness Brindisi Est IT AA"],
  [18.02018, 40.5133, "2701 Camping Riviera & Wellness Brindisi Ovest IT CAMP"],
  [17.77858, 40.54057, "2702 Camper Service Autostradale Brindisi Centro IT CS"],
  [17.85084, 40.73607, "2703 Camper Park Attrezzato Brindisi Mare IT AA"],
  [17.90101, 40.80405, "2704 Parcheggio Sosta Panoramica Brindisi Collina IT PS"],
  [17.77249, 40.51288, "2705 Camper Park Attrezzato Brindisi Lago IT AA"],
  [17.79029, 40.68763, "2706 Agricampeggio & Sosta Natura Brindisi Terme IT CAMP"],
  [17.72006, 40.62714, "2707 Camping Riviera & Wellness Brindisi Nord IT AA"],
  [18.10133, 40.66766, "2708 Agricampeggio & Sosta Natura Brindisi Sud IT AA"],
  [18.10967, 40.69219, "2709 Agricampeggio & Sosta Natura Brindisi Est IT PS"],
  [17.81732, 40.75206, "2710 Camping Riviera & Wellness Brindisi Ovest IT PS"],
  [17.97229, 40.68958, "2711 Parcheggio Sosta Panoramica Brindisi Centro IT AA"],
  [17.81823, 40.7667, "2712 Camper Service Autostradale Brindisi Mare IT CAMP"],
  [17.97405, 40.57235, "2713 Agricampeggio & Sosta Natura Brindisi Collina IT AA"],
  [18.13208, 40.71749, "2714 Camping Riviera & Wellness Brindisi Lago IT PS"],
  [17.80745, 40.49448, "2715 Camper Park Attrezzato Brindisi Terme IT CS"],
  [18.0994, 40.60003, "2716 Camper Service Autostradale Brindisi Nord IT CAMP"],
  [18.02593, 40.64381, "2717 Camper Service Autostradale Brindisi Sud IT AA"],
  [17.92478, 40.64811, "2718 Agricampeggio & Sosta Natura Brindisi Est IT AA"],
  [16.51385, 41.22475, "2719 Camper Park Attrezzato Trani Nord IT CAMP"],
  [16.59915, 41.32359, "2720 Area Sosta Comunale Trani Sud IT CAMP"],
  [16.61518, 41.32948, "2721 Camping Riviera & Wellness Trani Est IT AA"],
  [16.33097, 41.29115, "2722 Agricampeggio & Sosta Natura Trani Ovest IT CS"],
  [16.58193, 41.14042, "2723 Camping Riviera & Wellness Trani Centro IT CAMP"],
  [16.62414, 41.10045, "2724 Camper Service Autostradale Trani Mare IT PS"],
  [16.56202, 41.12929, "2725 Agricampeggio & Sosta Natura Trani Collina IT CAMP"],
  [16.59241, 41.17134, "2726 Agricampeggio & Sosta Natura Trani Lago IT CS"],
  [16.55731, 41.20871, "2727 Camping Riviera & Wellness Trani Terme IT PS"],
  [16.22784, 41.19361, "2728 Area Sosta Comunale Trani Nord IT PS"],
  [16.60872, 41.35563, "2729 Camper Service Autostradale Trani Sud IT PS"],
  [16.60515, 41.24553, "2730 Camping Riviera & Wellness Trani Est IT CAMP"],
  [16.41965, 41.34217, "2731 Camper Park Attrezzato Trani Ovest IT AA"],
  [16.55784, 41.30844, "2732 Camper Service Autostradale Trani Centro IT CAMP"],
  [16.53469, 41.34102, "2733 Camper Service Autostradale Trani Mare IT CAMP"],
  [16.48029, 41.25289, "2734 Camping Riviera & Wellness Trani Collina IT CS"],
  [16.3293, 41.16773, "2735 Camper Service Autostradale Trani Lago IT AA"],
  [16.42416, 41.15294, "2736 Area Sosta Comunale Trani Terme IT AA"],
  [16.54849, 41.33771, "2737 Parcheggio Sosta Panoramica Trani Nord IT CS"],
  [16.52263, 41.26513, "2738 Camper Service Autostradale Trani Sud IT CAMP"],
  [16.56385, 41.33831, "2739 Camper Park Attrezzato Trani Est IT CAMP"],
  [16.11055, 39.26837, "2740 Area Sosta Comunale Cosenza Nord IT CS"],
  [16.45535, 39.20187, "2741 Parcheggio Sosta Panoramica Cosenza Sud IT PS"],
  [16.11792, 39.46424, "2742 Area Sosta Comunale Cosenza Est IT CS"],
  [16.22171, 39.26366, "2743 Area Sosta Comunale Cosenza Ovest IT CS"],
  [16.19426, 39.15447, "2744 Camper Park Attrezzato Cosenza Centro IT CAMP"],
  [16.22452, 39.3748, "2745 Area Sosta Comunale Cosenza Mare IT AA"],
  [16.12972, 39.29625, "2746 Camping Riviera & Wellness Cosenza Collina IT PS"],
  [16.39474, 39.45442, "2747 Camper Park Attrezzato Cosenza Lago IT CS"],
  [16.20063, 39.38456, "2748 Agricampeggio & Sosta Natura Cosenza Terme IT CAMP"],
  [16.47654, 39.33333, "2749 Camper Park Attrezzato Cosenza Nord IT PS"],
  [16.21695, 39.36032, "2750 Camping Riviera & Wellness Cosenza Sud IT CAMP"],
  [16.46796, 39.13337, "2751 Camper Park Attrezzato Cosenza Est IT PS"],
  [16.14044, 39.28114, "2752 Parcheggio Sosta Panoramica Cosenza Ovest IT CS"],
  [16.08864, 39.12691, "2753 Area Sosta Comunale Cosenza Centro IT PS"],
  [16.1242, 39.26244, "2754 Camping Riviera & Wellness Cosenza Mare IT CAMP"],
  [16.29744, 39.27145, "2755 Camping Riviera & Wellness Cosenza Collina IT PS"],
  [16.05215, 39.31825, "2756 Area Sosta Comunale Cosenza Lago IT AA"],
  [16.47723, 39.44118, "2757 Camper Service Autostradale Cosenza Terme IT CS"],
  [16.30755, 39.21208, "2758 Area Sosta Comunale Cosenza Nord IT AA"],
  [16.08821, 39.35824, "2759 Camper Service Autostradale Cosenza Sud IT CAMP"],
  [16.10514, 39.18608, "2760 Parcheggio Sosta Panoramica Cosenza Est IT AA"],
  [16.08806, 39.43056, "2761 Agricampeggio & Sosta Natura Cosenza Ovest IT PS"],
  [15.56327, 38.02744, "2762 Camper Park Attrezzato Reggio Calabria Nord IT PS"],
  [15.79796, 38.24139, "2763 Camper Service Autostradale Reggio Calabria Sud IT CS"],
  [15.81692, 38.03532, "2764 Camper Service Autostradale Reggio Calabria Est IT CAMP"],
  [15.824, 38.04585, "2765 Parcheggio Sosta Panoramica Reggio Calabria Ovest IT CAMP"],
  [15.76595, 38.2844, "2766 Camping Riviera & Wellness Reggio Calabria Centro IT CAMP"],
  [15.71814, 38.23486, "2767 Parcheggio Sosta Panoramica Reggio Calabria Mare IT CS"],
  [15.44686, 38.00242, "2768 Area Sosta Comunale Reggio Calabria Collina IT PS"],
  [15.4959, 38.10089, "2769 Area Sosta Comunale Reggio Calabria Lago IT CS"],
  [15.82513, 37.97691, "2770 Camper Service Autostradale Reggio Calabria Terme IT PS"],
  [15.86727, 38.09083, "2771 Area Sosta Comunale Reggio Calabria Nord IT PS"],
  [15.80293, 38.10885, "2772 Camper Service Autostradale Reggio Calabria Sud IT PS"],
  [15.51398, 38.05866, "2773 Area Sosta Comunale Reggio Calabria Est IT CS"],
  [15.75977, 38.22853, "2774 Camper Park Attrezzato Reggio Calabria Ovest IT CAMP"],
  [15.68585, 38.24811, "2775 Parcheggio Sosta Panoramica Reggio Calabria Centro IT CAMP"],
  [15.50356, 38.2047, "2776 Parcheggio Sosta Panoramica Reggio Calabria Mare IT AA"],
  [15.72691, 38.20519, "2777 Camper Park Attrezzato Reggio Calabria Collina IT AA"],
  [15.8639, 38.0358, "2778 Area Sosta Comunale Reggio Calabria Lago IT CAMP"],
  [15.84042, 38.06705, "2779 Camper Service Autostradale Reggio Calabria Terme IT AA"],
  [15.45878, 37.99012, "2780 Agricampeggio & Sosta Natura Reggio Calabria Nord IT AA"],
  [15.54349, 38.15622, "2781 Camper Service Autostradale Reggio Calabria Sud IT PS"],
  [15.71758, 38.27572, "2782 Agricampeggio & Sosta Natura Reggio Calabria Est IT AA"],
  [15.87222, 38.2679, "2783 Agricampeggio & Sosta Natura Reggio Calabria Ovest IT PS"],
  [15.783, 38.23845, "2784 Camper Park Attrezzato Reggio Calabria Centro IT CS"],
  [16.60892, 38.99513, "2785 Area Sosta Comunale Catanzaro Nord IT CAMP"],
  [16.4428, 38.8744, "2786 Area Sosta Comunale Catanzaro Sud IT PS"],
  [16.4564, 38.74198, "2787 Area Sosta Comunale Catanzaro Est IT PS"],
  [16.70135, 38.83453, "2788 Camper Service Autostradale Catanzaro Ovest IT PS"],
  [16.7232, 38.83929, "2789 Area Sosta Comunale Catanzaro Centro IT CS"],
  [16.52427, 38.94603, "2790 Camping Riviera & Wellness Catanzaro Mare IT CAMP"],
  [16.58303, 38.91423, "2791 Agricampeggio & Sosta Natura Catanzaro Collina IT AA"],
  [16.63285, 38.82877, "2792 Camper Service Autostradale Catanzaro Lago IT PS"],
  [16.63894, 39.01865, "2793 Camper Service Autostradale Catanzaro Terme IT AA"],
  [16.3809, 38.88391, "2794 Camping Riviera & Wellness Catanzaro Nord IT PS"],
  [16.65412, 38.97155, "2795 Camper Service Autostradale Catanzaro Sud IT CAMP"],
  [16.65395, 38.91935, "2796 Camper Service Autostradale Catanzaro Est IT CS"],
  [16.39833, 38.89868, "2797 Agricampeggio & Sosta Natura Catanzaro Ovest IT AA"],
  [16.42021, 38.78681, "2798 Agricampeggio & Sosta Natura Catanzaro Centro IT PS"],
  [16.49567, 38.91788, "2799 Camper Park Attrezzato Catanzaro Mare IT CAMP"],
  [16.38299, 38.76159, "2800 Parcheggio Sosta Panoramica Catanzaro Collina IT AA"],
  [16.40522, 38.88352, "2801 Parcheggio Sosta Panoramica Catanzaro Lago IT AA"],
  [16.3995, 38.824, "2802 Agricampeggio & Sosta Natura Catanzaro Terme IT CAMP"],
  [16.571, 38.99398, "2803 Area Sosta Comunale Catanzaro Nord IT AA"],
  [16.55001, 38.75064, "2804 Camper Service Autostradale Catanzaro Sud IT CS"],
  [16.56745, 38.94032, "2805 Agricampeggio & Sosta Natura Catanzaro Est IT CAMP"],
  [16.5163, 39.01754, "2806 Parcheggio Sosta Panoramica Catanzaro Ovest IT PS"],
  [16.11528, 38.52928, "2807 Camper Park Attrezzato Tropea Nord IT CS"],
  [15.91377, 38.53912, "2808 Camping Riviera & Wellness Tropea Sud IT CAMP"],
  [15.75058, 38.54274, "2809 Camper Service Autostradale Tropea Est IT AA"],
  [16.06425, 38.74403, "2810 Camper Service Autostradale Tropea Ovest IT PS"],
  [16.11156, 38.71837, "2811 Agricampeggio & Sosta Natura Tropea Centro IT PS"],
  [15.98393, 38.73773, "2812 Camping Riviera & Wellness Tropea Mare IT CAMP"],
  [15.7341, 38.53257, "2813 Agricampeggio & Sosta Natura Tropea Collina IT PS"],
  [15.98651, 38.78749, "2814 Area Sosta Comunale Tropea Lago IT CS"],
  [15.96518, 38.57513, "2815 Area Sosta Comunale Tropea Terme IT CS"],
  [16.05949, 38.79663, "2816 Camper Service Autostradale Tropea Nord IT CS"],
  [15.88184, 38.60722, "2817 Area Sosta Comunale Tropea Sud IT CS"],
  [15.74805, 38.50954, "2818 Camper Service Autostradale Tropea Est IT PS"],
  [16.10704, 38.74781, "2819 Camping Riviera & Wellness Tropea Ovest IT CS"],
  [15.93665, 38.80283, "2820 Area Sosta Comunale Tropea Centro IT PS"],
  [16.04853, 38.7012, "2821 Agricampeggio & Sosta Natura Tropea Mare IT CS"],
  [15.95698, 38.50466, "2822 Agricampeggio & Sosta Natura Tropea Collina IT AA"],
  [16.00499, 38.79892, "2823 Camper Service Autostradale Tropea Lago IT PS"],
  [15.89205, 38.67252, "2824 Area Sosta Comunale Tropea Terme IT CAMP"],
  [15.91104, 38.7519, "2825 Camper Park Attrezzato Tropea Nord IT PS"],
  [15.70188, 38.61245, "2826 Parcheggio Sosta Panoramica Tropea Sud IT PS"],
  [17.32483, 39.07888, "2827 Area Sosta Comunale Crotone Nord IT PS"],
  [16.91166, 39.14983, "2828 Camper Service Autostradale Crotone Sud IT CAMP"],
  [17.05703, 38.97297, "2829 Camping Riviera & Wellness Crotone Est IT CAMP"],
  [17.31138, 38.9826, "2830 Parcheggio Sosta Panoramica Crotone Ovest IT CS"],
  [17.22414, 39.20441, "2831 Parcheggio Sosta Panoramica Crotone Centro IT CAMP"],
  [17.22765, 39.21481, "2832 Camper Park Attrezzato Crotone Mare IT PS"],
  [17.2052, 39.19728, "2833 Camper Service Autostradale Crotone Collina IT PS"],
  [17.28234, 39.18561, "2834 Camper Service Autostradale Crotone Lago IT CAMP"],
  [16.94109, 39.14744, "2835 Agricampeggio & Sosta Natura Crotone Terme IT CS"],
  [16.97264, 38.96635, "2836 Camper Park Attrezzato Crotone Nord IT PS"],
  [17.32667, 39.18342, "2837 Area Sosta Comunale Crotone Sud IT PS"],
  [17.15287, 38.98785, "2838 Agricampeggio & Sosta Natura Crotone Est IT PS"],
  [17.06297, 39.21402, "2839 Agricampeggio & Sosta Natura Crotone Ovest IT AA"],
  [17.30481, 39.19548, "2840 Camper Park Attrezzato Crotone Centro IT CS"],
  [16.95359, 39.02391, "2841 Area Sosta Comunale Crotone Mare IT AA"],
  [17.12116, 39.10239, "2842 Area Sosta Comunale Crotone Collina IT CS"],
  [17.24884, 39.17498, "2843 Agricampeggio & Sosta Natura Crotone Lago IT CAMP"],
  [17.29546, 39.20439, "2844 Camper Park Attrezzato Crotone Terme IT CAMP"],
  [17.32812, 38.92335, "2845 Camping Riviera & Wellness Crotone Nord IT AA"],
  [17.25404, 39.24683, "2846 Area Sosta Comunale Crotone Sud IT PS"],
  [16.94973, 38.92039, "2847 Parcheggio Sosta Panoramica Crotone Est IT AA"],
  [16.97296, 39.22455, "2848 Camper Park Attrezzato Crotone Ovest IT AA"],
  [17.12995, 39.06023, "2849 Camping Riviera & Wellness Crotone Centro IT CAMP"],
  [17.05287, 39.13218, "2850 Camper Park Attrezzato Crotone Mare IT AA"],
  [13.32359, 38.09439, "2851 Camper Park Attrezzato Palermo Nord IT AA"],
  [13.34965, 38.23288, "2852 Camper Park Attrezzato Palermo Sud IT AA"],
  [13.25621, 38.00064, "2853 Parcheggio Sosta Panoramica Palermo Est IT CAMP"],
  [13.24695, 38.161, "2854 Agricampeggio & Sosta Natura Palermo Ovest IT PS"],
  [13.32947, 37.989, "2855 Camper Park Attrezzato Palermo Centro IT PS"],
  [13.36877, 38.27384, "2856 Camper Service Autostradale Palermo Mare IT PS"],
  [13.48307, 38.0956, "2857 Area Sosta Comunale Palermo Collina IT CAMP"],
  [13.31724, 38.05911, "2858 Area Sosta Comunale Palermo Lago IT AA"],
  [13.47814, 37.96221, "2859 Camper Service Autostradale Palermo Terme IT CS"],
  [13.42072, 37.96093, "2860 Parcheggio Sosta Panoramica Palermo Nord IT CS"],
  [13.44289, 38.0814, "2861 Camper Service Autostradale Palermo Sud IT CAMP"],
  [13.54565, 38.20064, "2862 Camping Riviera & Wellness Palermo Est IT CAMP"],
  [13.41118, 38.25577, "2863 Agricampeggio & Sosta Natura Palermo Ovest IT AA"],
  [13.42625, 38.08208, "2864 Camping Riviera & Wellness Palermo Centro IT CS"],
  [13.50182, 38.06154, "2865 Camping Riviera & Wellness Palermo Mare IT PS"],
  [13.17443, 38.24904, "2866 Camper Park Attrezzato Palermo Collina IT PS"],
  [13.46952, 38.19448, "2867 Camper Service Autostradale Palermo Lago IT CAMP"],
  [13.26427, 38.28787, "2868 Parcheggio Sosta Panoramica Palermo Terme IT CS"],
  [13.3711, 38.13383, "2869 Parcheggio Sosta Panoramica Palermo Nord IT AA"],
  [13.49497, 37.95046, "2870 Area Sosta Comunale Palermo Sud IT CS"],
  [15.30213, 37.58718, "2871 Agricampeggio & Sosta Natura Catania Nord IT CS"],
  [15.02584, 37.35388, "2872 Camping Riviera & Wellness Catania Sud IT AA"],
  [15.15093, 37.34961, "2873 Area Sosta Comunale Catania Est IT CAMP"],
  [15.18959, 37.43719, "2874 Camper Service Autostradale Catania Ovest IT AA"],
  [15.22042, 37.67693, "2875 Agricampeggio & Sosta Natura Catania Centro IT PS"],
  [15.15812, 37.43762, "2876 Agricampeggio & Sosta Natura Catania Mare IT CS"],
  [15.18988, 37.46508, "2877 Camping Riviera & Wellness Catania Collina IT CS"],
  [14.94465, 37.51366, "2878 Agricampeggio & Sosta Natura Catania Lago IT AA"],
  [15.17824, 37.3672, "2879 Camper Service Autostradale Catania Terme IT CAMP"],
  [15.0492, 37.36519, "2880 Area Sosta Comunale Catania Nord IT PS"],
  [14.89313, 37.40807, "2881 Camper Service Autostradale Catania Sud IT CS"],
  [15.20847, 37.52854, "2882 Parcheggio Sosta Panoramica Catania Est IT PS"],
  [15.04854, 37.50749, "2883 Parcheggio Sosta Panoramica Catania Ovest IT CAMP"],
  [15.07829, 37.65876, "2884 Camping Riviera & Wellness Catania Centro IT PS"],
  [14.91521, 37.38342, "2885 Camper Park Attrezzato Catania Mare IT PS"],
  [15.08893, 37.67171, "2886 Camper Park Attrezzato Catania Collina IT PS"],
  [15.07101, 37.40732, "2887 Camping Riviera & Wellness Catania Lago IT AA"],
  [15.28632, 37.46217, "2888 Parcheggio Sosta Panoramica Catania Terme IT CS"],
  [15.11529, 37.3752, "2889 Area Sosta Comunale Catania Nord IT PS"],
  [15.02516, 37.38656, "2890 Parcheggio Sosta Panoramica Catania Sud IT AA"],
  [14.87059, 37.43579, "2891 Agricampeggio & Sosta Natura Catania Est IT CAMP"],
  [15.04779, 37.60723, "2892 Camper Park Attrezzato Catania Ovest IT CS"],
  [15.66185, 38.08288, "2893 Camper Park Attrezzato Messina Nord IT CAMP"],
  [15.3594, 38.21044, "2894 Area Sosta Comunale Messina Sud IT AA"],
  [15.46837, 38.18721, "2895 Camper Service Autostradale Messina Est IT AA"],
  [15.54285, 38.29227, "2896 Agricampeggio & Sosta Natura Messina Ovest IT PS"],
  [15.53642, 38.19547, "2897 Camper Park Attrezzato Messina Centro IT CS"],
  [15.71886, 38.17598, "2898 Camping Riviera & Wellness Messina Mare IT PS"],
  [15.62803, 38.29873, "2899 Area Sosta Comunale Messina Collina IT CAMP"],
  [15.50693, 38.10029, "2900 Camper Service Autostradale Messina Lago IT PS"],
  [15.66016, 38.33032, "2901 Camping Riviera & Wellness Messina Terme IT AA"],
  [15.5864, 38.26632, "2902 Camper Park Attrezzato Messina Nord IT AA"],
  [15.61876, 38.24461, "2903 Parcheggio Sosta Panoramica Messina Sud IT CAMP"],
  [15.57283, 38.35311, "2904 Camper Park Attrezzato Messina Est IT AA"],
  [15.66675, 38.20141, "2905 Parcheggio Sosta Panoramica Messina Ovest IT AA"],
  [15.56834, 38.24919, "2906 Area Sosta Comunale Messina Centro IT AA"],
  [15.43938, 38.29416, "2907 Agricampeggio & Sosta Natura Messina Mare IT AA"],
  [15.60208, 38.30122, "2908 Area Sosta Comunale Messina Collina IT PS"],
  [15.71689, 38.03454, "2909 Parcheggio Sosta Panoramica Messina Lago IT PS"],
  [15.51572, 38.17176, "2910 Agricampeggio & Sosta Natura Messina Terme IT AA"],
  [15.38059, 38.10881, "2911 Camper Service Autostradale Messina Nord IT CAMP"],
  [15.39382, 38.07765, "2912 Parcheggio Sosta Panoramica Messina Sud IT AA"],
  [15.75747, 38.07278, "2913 Area Sosta Comunale Messina Est IT CAMP"],
  [15.47538, 38.23387, "2914 Area Sosta Comunale Messina Ovest IT CS"],
  [15.20562, 37.03698, "2915 Agricampeggio & Sosta Natura Siracusa Nord IT AA"],
  [15.48531, 36.99078, "2916 Agricampeggio & Sosta Natura Siracusa Sud IT PS"],
  [15.40006, 36.9714, "2917 Area Sosta Comunale Siracusa Est IT AA"],
  [15.28859, 37.07852, "2918 Camper Service Autostradale Siracusa Ovest IT CS"],
  [15.27077, 36.92172, "2919 Agricampeggio & Sosta Natura Siracusa Centro IT AA"],
  [15.24497, 37.06996, "2920 Area Sosta Comunale Siracusa Mare IT PS"],
  [15.49516, 36.99471, "2921 Area Sosta Comunale Siracusa Collina IT CS"],
  [15.3548, 37.16754, "2922 Camper Park Attrezzato Siracusa Lago IT AA"],
  [15.26229, 37.09939, "2923 Agricampeggio & Sosta Natura Siracusa Terme IT CS"],
  [15.50499, 37.03116, "2924 Camper Park Attrezzato Siracusa Nord IT CS"],
  [15.49421, 37.23391, "2925 Parcheggio Sosta Panoramica Siracusa Sud IT CS"],
  [15.27069, 36.90085, "2926 Area Sosta Comunale Siracusa Est IT PS"],
  [15.06184, 37.24073, "2927 Camping Riviera & Wellness Siracusa Ovest IT CAMP"],
  [15.43937, 37.10975, "2928 Agricampeggio & Sosta Natura Siracusa Centro IT PS"],
  [15.15734, 37.19535, "2929 Agricampeggio & Sosta Natura Siracusa Mare IT PS"],
  [15.30194, 36.957, "2930 Area Sosta Comunale Siracusa Collina IT CAMP"],
  [15.37589, 36.9319, "2931 Agricampeggio & Sosta Natura Siracusa Lago IT AA"],
  [15.18736, 37.09527, "2932 Camping Riviera & Wellness Siracusa Terme IT CS"],
  [13.72173, 37.31139, "2933 Parcheggio Sosta Panoramica Agrigento Nord IT CS"],
  [13.69951, 37.22618, "2934 Camping Riviera & Wellness Agrigento Sud IT CAMP"],
  [13.80316, 37.22077, "2935 Agricampeggio & Sosta Natura Agrigento Est IT PS"],
  [13.63058, 37.29563, "2936 Camper Park Attrezzato Agrigento Ovest IT CAMP"],
  [13.77582, 37.1815, "2937 Camping Riviera & Wellness Agrigento Centro IT AA"],
  [13.66352, 37.45021, "2938 Area Sosta Comunale Agrigento Mare IT PS"],
  [13.67728, 37.44804, "2939 Parcheggio Sosta Panoramica Agrigento Collina IT PS"],
  [13.75532, 37.1631, "2940 Parcheggio Sosta Panoramica Agrigento Lago IT PS"],
  [13.73524, 37.14553, "2941 Parcheggio Sosta Panoramica Agrigento Terme IT AA"],
  [13.79822, 37.1779, "2942 Camping Riviera & Wellness Agrigento Nord IT PS"],
  [13.44053, 37.25999, "2943 Parcheggio Sosta Panoramica Agrigento Sud IT PS"],
  [13.78211, 37.29664, "2944 Area Sosta Comunale Agrigento Est IT AA"],
  [13.3697, 37.21223, "2945 Area Sosta Comunale Agrigento Ovest IT PS"],
  [13.52182, 37.45719, "2946 Camping Riviera & Wellness Agrigento Centro IT CAMP"],
  [13.72459, 37.35353, "2947 Parcheggio Sosta Panoramica Agrigento Mare IT AA"],
  [13.79608, 37.47774, "2948 Camper Park Attrezzato Agrigento Collina IT CS"],
  [13.67762, 37.30719, "2949 Agricampeggio & Sosta Natura Agrigento Lago IT AA"],
  [13.73031, 37.20333, "2950 Area Sosta Comunale Agrigento Terme IT CS"],
  [13.6169, 37.43917, "2951 Area Sosta Comunale Agrigento Nord IT PS"],
  [13.65773, 37.32782, "2952 Camper Park Attrezzato Agrigento Sud IT PS"],
  [13.69649, 37.34056, "2953 Area Sosta Comunale Agrigento Est IT CS"],
  [13.74577, 37.46145, "2954 Agricampeggio & Sosta Natura Agrigento Ovest IT CS"],
  [13.3712, 37.43138, "2955 Camper Park Attrezzato Agrigento Centro IT CAMP"],
  [13.56507, 37.33074, "2956 Camping Riviera & Wellness Agrigento Mare IT CAMP"],
  [12.7378, 37.99419, "2957 Agricampeggio & Sosta Natura Trapani Nord IT AA"],
  [12.49996, 38.08086, "2958 Area Sosta Comunale Trapani Sud IT CAMP"],
  [12.68771, 38.10846, "2959 Parcheggio Sosta Panoramica Trapani Est IT CAMP"],
  [12.47903, 37.94008, "2960 Area Sosta Comunale Trapani Ovest IT CS"],
  [12.37757, 37.84461, "2961 Agricampeggio & Sosta Natura Trapani Centro IT PS"],
  [12.73562, 38.12549, "2962 Parcheggio Sosta Panoramica Trapani Mare IT AA"],
  [12.3235, 37.99114, "2963 Camping Riviera & Wellness Trapani Collina IT CS"],
  [12.42986, 37.90037, "2964 Camper Park Attrezzato Trapani Lago IT CS"],
  [12.65363, 38.01079, "2965 Area Sosta Comunale Trapani Terme IT AA"],
  [12.50311, 37.9293, "2966 Agricampeggio & Sosta Natura Trapani Nord IT CAMP"],
  [12.52385, 38.13037, "2967 Area Sosta Comunale Trapani Sud IT CAMP"],
  [12.5688, 38.11431, "2968 Area Sosta Comunale Trapani Est IT CS"],
  [12.34617, 37.99906, "2969 Camping Riviera & Wellness Trapani Ovest IT AA"],
  [12.69054, 37.97489, "2970 Area Sosta Comunale Trapani Centro IT AA"],
  [12.65107, 37.8645, "2971 Camper Park Attrezzato Trapani Mare IT AA"],
  [12.48433, 38.05656, "2972 Agricampeggio & Sosta Natura Trapani Collina IT AA"],
  [12.31349, 37.86233, "2973 Camping Riviera & Wellness Trapani Lago IT AA"],
  [12.62838, 37.87634, "2974 Camper Service Autostradale Trapani Terme IT PS"],
  [12.5708, 38.11842, "2975 Parcheggio Sosta Panoramica Trapani Nord IT CS"],
  [12.48265, 38.00527, "2976 Camper Service Autostradale Trapani Sud IT PS"],
  [12.5941, 38.07062, "2977 Agricampeggio & Sosta Natura Trapani Est IT AA"],
  [12.55452, 38.02382, "2978 Camper Service Autostradale Trapani Ovest IT AA"],
  [12.61098, 37.8471, "2979 Area Sosta Comunale Trapani Centro IT AA"],
  [12.519, 37.88689, "2980 Parcheggio Sosta Panoramica Trapani Mare IT CS"],
  [14.70068, 37.00482, "2981 Camper Service Autostradale Ragusa Nord IT PS"],
  [14.52782, 37.03016, "2982 Camper Park Attrezzato Ragusa Sud IT CS"],
  [14.93248, 36.90375, "2983 Parcheggio Sosta Panoramica Ragusa Est IT CAMP"],
  [14.74411, 36.95548, "2984 Agricampeggio & Sosta Natura Ragusa Ovest IT CAMP"],
  [14.7721, 36.91553, "2985 Camper Park Attrezzato Ragusa Centro IT CS"],
  [14.73356, 37.09079, "2986 Agricampeggio & Sosta Natura Ragusa Mare IT CAMP"],
  [14.86923, 36.83429, "2987 Area Sosta Comunale Ragusa Collina IT CS"],
  [14.94003, 36.87154, "2988 Camper Service Autostradale Ragusa Lago IT AA"],
  [14.80114, 36.87074, "2989 Area Sosta Comunale Ragusa Terme IT CS"],
  [14.884, 36.99354, "2990 Parcheggio Sosta Panoramica Ragusa Nord IT PS"],
  [14.64848, 36.85607, "2991 Parcheggio Sosta Panoramica Ragusa Sud IT CAMP"],
  [14.91034, 37.05784, "2992 Camper Service Autostradale Ragusa Est IT AA"],
  [14.78805, 37.07318, "2993 Camper Park Attrezzato Ragusa Ovest IT PS"],
  [14.60816, 36.96957, "2994 Camper Service Autostradale Ragusa Centro IT CS"],
  [14.68074, 36.88277, "2995 Camping Riviera & Wellness Ragusa Mare IT CAMP"],
  [14.66165, 36.75466, "2996 Agricampeggio & Sosta Natura Ragusa Collina IT AA"],
  [14.58808, 36.8529, "2997 Camper Park Attrezzato Ragusa Lago IT AA"],
  [14.59021, 37.09256, "2998 Area Sosta Comunale Ragusa Terme IT CAMP"],
  [14.6185, 36.82783, "2999 Camper Park Attrezzato Ragusa Nord IT CAMP"],
  [14.61128, 37.04784, "3000 Agricampeggio & Sosta Natura Ragusa Sud IT CS"],
  [14.6184, 36.81283, "3001 Area Sosta Comunale Ragusa Est IT CS"],
  [14.56236, 37.04221, "3002 Area Sosta Comunale Ragusa Ovest IT AA"],
  [14.63788, 37.07884, "3003 Agricampeggio & Sosta Natura Ragusa Centro IT AA"],
  [14.47772, 37.62332, "3004 Agricampeggio & Sosta Natura Enna Nord IT CAMP"],
  [14.11919, 37.41488, "3005 Camping Riviera & Wellness Enna Sud IT PS"],
  [14.22439, 37.45909, "3006 Camper Park Attrezzato Enna Est IT CS"],
  [14.49384, 37.60184, "3007 Agricampeggio & Sosta Natura Enna Ovest IT CAMP"],
  [14.3185, 37.65908, "3008 Area Sosta Comunale Enna Centro IT CS"],
  [14.07817, 37.50669, "3009 Camper Park Attrezzato Enna Mare IT CAMP"],
  [14.48997, 37.69003, "3010 Camper Park Attrezzato Enna Collina IT CAMP"],
  [14.4073, 37.64655, "3011 Camper Park Attrezzato Enna Lago IT PS"],
  [14.39229, 37.57001, "3012 Camper Park Attrezzato Enna Terme IT AA"],
  [14.13475, 37.57361, "3013 Camper Service Autostradale Enna Nord IT CAMP"],
  [14.37624, 37.63508, "3014 Parcheggio Sosta Panoramica Enna Sud IT CAMP"],
  [14.23463, 37.48592, "3015 Camper Service Autostradale Enna Est IT PS"],
  [14.14555, 37.46883, "3016 Camper Park Attrezzato Enna Ovest IT AA"],
  [14.24546, 37.46851, "3017 Camper Service Autostradale Enna Centro IT CS"],
  [14.43329, 37.44702, "3018 Parcheggio Sosta Panoramica Enna Mare IT PS"],
  [14.39243, 37.42167, "3019 Parcheggio Sosta Panoramica Enna Collina IT CAMP"],
  [14.15778, 37.57359, "3020 Camper Service Autostradale Enna Lago IT CAMP"],
  [14.20557, 37.57129, "3021 Camper Service Autostradale Enna Terme IT AA"],
  [14.21958, 37.54338, "3022 Camper Service Autostradale Enna Nord IT PS"],
  [14.06532, 37.48756, "3023 Agricampeggio & Sosta Natura Enna Sud IT PS"],
  [14.08835, 37.48497, "3024 Camper Park Attrezzato Enna Est IT PS"],
  [14.12744, 37.49478, "3025 Parcheggio Sosta Panoramica Caltanissetta Nord IT CAMP"],
  [13.86991, 37.34974, "3026 Camper Park Attrezzato Caltanissetta Sud IT CAMP"],
  [13.92629, 37.38541, "3027 Parcheggio Sosta Panoramica Caltanissetta Est IT AA"],
  [14.2048, 37.42125, "3028 Agricampeggio & Sosta Natura Caltanissetta Ovest IT CAMP"],
  [14.2869, 37.56227, "3029 Camper Park Attrezzato Caltanissetta Centro IT CAMP"],
  [13.96463, 37.58483, "3030 Area Sosta Comunale Caltanissetta Mare IT CAMP"],
  [14.20764, 37.64634, "3031 Camper Service Autostradale Caltanissetta Collina IT CAMP"],
  [14.28297, 37.54423, "3032 Camper Service Autostradale Caltanissetta Lago IT AA"],
  [14.1633, 37.39495, "3033 Camper Service Autostradale Caltanissetta Terme IT CS"],
  [14.10195, 37.3971, "3034 Camper Service Autostradale Caltanissetta Nord IT CS"],
  [13.9911, 37.60034, "3035 Camping Riviera & Wellness Caltanissetta Sud IT PS"],
  [14.03076, 37.61133, "3036 Agricampeggio & Sosta Natura Caltanissetta Est IT AA"],
  [14.22162, 37.46884, "3037 Camper Park Attrezzato Caltanissetta Ovest IT PS"],
  [14.23099, 37.36393, "3038 Agricampeggio & Sosta Natura Caltanissetta Centro IT AA"],
  [14.20248, 37.31869, "3039 Camping Riviera & Wellness Caltanissetta Mare IT CAMP"],
  [14.02937, 37.39422, "3040 Agricampeggio & Sosta Natura Caltanissetta Collina IT CAMP"],
  [13.98454, 37.50346, "3041 Camping Riviera & Wellness Caltanissetta Lago IT PS"],
  [14.25276, 37.59018, "3042 Parcheggio Sosta Panoramica Caltanissetta Terme IT AA"],
  [14.19742, 37.51417, "3043 Agricampeggio & Sosta Natura Caltanissetta Nord IT CS"],
  [8.92537, 39.38084, "3044 Camper Park Attrezzato Cagliari Nord IT PS"],
  [9.04468, 39.21497, "3045 Camper Park Attrezzato Cagliari Sud IT PS"],
  [8.93866, 39.36196, "3046 Camping Riviera & Wellness Cagliari Est IT PS"],
  [8.91113, 39.24232, "3047 Camping Riviera & Wellness Cagliari Ovest IT AA"],
  [8.92797, 39.11414, "3048 Area Sosta Comunale Cagliari Centro IT PS"],
  [9.0277, 39.12086, "3049 Agricampeggio & Sosta Natura Cagliari Mare IT PS"],
  [9.13004, 39.06891, "3050 Camper Service Autostradale Cagliari Collina IT AA"],
  [9.08159, 39.3497, "3051 Agricampeggio & Sosta Natura Cagliari Lago IT CS"],
  [9.08499, 39.094, "3052 Area Sosta Comunale Cagliari Terme IT CS"],
  [9.28626, 39.38308, "3053 Camper Service Autostradale Cagliari Nord IT AA"],
  [9.26475, 39.15722, "3054 Camper Park Attrezzato Cagliari Sud IT CS"],
  [9.31932, 39.2601, "3055 Camper Park Attrezzato Cagliari Est IT PS"],
  [9.10323, 39.29967, "3056 Parcheggio Sosta Panoramica Cagliari Ovest IT CS"],
  [9.09728, 39.39568, "3057 Area Sosta Comunale Cagliari Centro IT CS"],
  [9.13334, 39.33145, "3058 Parcheggio Sosta Panoramica Cagliari Mare IT PS"],
  [8.91429, 39.21074, "3059 Camper Service Autostradale Cagliari Collina IT PS"],
  [9.3102, 39.275, "3060 Agricampeggio & Sosta Natura Cagliari Lago IT AA"],
  [9.25326, 39.34372, "3061 Camping Riviera & Wellness Cagliari Terme IT CAMP"],
  [9.27913, 39.337, "3062 Parcheggio Sosta Panoramica Cagliari Nord IT PS"],
  [9.17468, 39.11165, "3063 Camper Park Attrezzato Cagliari Sud IT PS"],
  [9.19329, 39.18343, "3064 Camper Service Autostradale Cagliari Est IT PS"],
  [8.91635, 39.29333, "3065 Camper Service Autostradale Cagliari Ovest IT AA"],
  [9.13868, 39.35769, "3066 Agricampeggio & Sosta Natura Cagliari Centro IT CS"],
  [9.30271, 39.30309, "3067 Camping Riviera & Wellness Cagliari Mare IT AA"],
  [9.43973, 40.78883, "3068 Parcheggio Sosta Panoramica Olbia Nord IT PS"],
  [9.42051, 41.01469, "3069 Parcheggio Sosta Panoramica Olbia Sud IT AA"],
  [9.50153, 40.83487, "3070 Camper Park Attrezzato Olbia Est IT PS"],
  [9.58632, 40.77202, "3071 Area Sosta Comunale Olbia Ovest IT PS"],
  [9.4535, 40.86668, "3072 Camper Service Autostradale Olbia Centro IT PS"],
  [9.38657, 40.75962, "3073 Camper Service Autostradale Olbia Mare IT CS"],
  [9.48271, 40.981, "3074 Agricampeggio & Sosta Natura Olbia Collina IT CS"],
  [9.56946, 40.77529, "3075 Area Sosta Comunale Olbia Lago IT PS"],
  [9.39941, 40.91118, "3076 Camper Park Attrezzato Olbia Terme IT PS"],
  [9.54694, 41.03987, "3077 Camper Park Attrezzato Olbia Nord IT CS"],
  [9.60745, 40.78985, "3078 Agricampeggio & Sosta Natura Olbia Sud IT CS"],
  [9.27884, 40.98139, "3079 Area Sosta Comunale Olbia Est IT CS"],
  [9.35387, 40.90063, "3080 Camper Park Attrezzato Olbia Ovest IT CAMP"],
  [9.47273, 40.9327, "3081 Camping Riviera & Wellness Olbia Centro IT AA"],
  [9.56226, 41.03043, "3082 Camping Riviera & Wellness Olbia Mare IT AA"],
  [9.47359, 40.98802, "3083 Camper Service Autostradale Olbia Collina IT AA"],
  [9.619, 41.01674, "3084 Area Sosta Comunale Olbia Lago IT AA"],
  [9.36379, 41.06446, "3085 Agricampeggio & Sosta Natura Olbia Terme IT CS"],
  [9.28035, 40.75618, "3086 Camper Service Autostradale Olbia Nord IT AA"],
  [9.37306, 40.98053, "3087 Camping Riviera & Wellness Olbia Sud IT CS"],
  [9.34897, 40.80516, "3088 Camping Riviera & Wellness Olbia Est IT AA"],
  [9.42101, 40.78409, "3089 Parcheggio Sosta Panoramica Olbia Ovest IT PS"],
  [9.51757, 40.81889, "3090 Parcheggio Sosta Panoramica Olbia Centro IT CS"],
  [9.32145, 40.82774, "3091 Area Sosta Comunale Olbia Mare IT PS"],
  [9.5681, 40.75165, "3092 Camper Park Attrezzato Olbia Collina IT CAMP"],
  [8.36041, 40.71147, "3093 Camper Park Attrezzato Sassari Nord IT PS"],
  [8.35047, 40.76927, "3094 Camping Riviera & Wellness Sassari Sud IT CAMP"],
  [8.60019, 40.65644, "3095 Camper Service Autostradale Sassari Est IT CS"],
  [8.77644, 40.73856, "3096 Camping Riviera & Wellness Sassari Ovest IT AA"],
  [8.60064, 40.88656, "3097 Agricampeggio & Sosta Natura Sassari Centro IT CS"],
  [8.67783, 40.87449, "3098 Camping Riviera & Wellness Sassari Mare IT PS"],
  [8.67347, 40.61227, "3099 Agricampeggio & Sosta Natura Sassari Collina IT CS"],
  [8.4815, 40.71965, "3100 Camping Riviera & Wellness Sassari Lago IT CAMP"],
  [8.66452, 40.72976, "3101 Camper Service Autostradale Sassari Terme IT PS"],
  [8.67222, 40.55832, "3102 Camper Park Attrezzato Sassari Nord IT AA"],
  [8.52352, 40.63364, "3103 Agricampeggio & Sosta Natura Sassari Sud IT AA"],
  [8.3926, 40.57869, "3104 Parcheggio Sosta Panoramica Sassari Est IT CS"],
  [8.49979, 40.6216, "3105 Agricampeggio & Sosta Natura Sassari Ovest IT PS"],
  [8.59983, 40.87409, "3106 Camper Park Attrezzato Sassari Centro IT AA"],
  [8.39112, 40.85797, "3107 Camping Riviera & Wellness Sassari Mare IT PS"],
  [8.34852, 40.82634, "3108 Camping Riviera & Wellness Sassari Collina IT CAMP"],
  [8.66845, 40.83535, "3109 Camping Riviera & Wellness Sassari Lago IT PS"],
  [8.43971, 40.66684, "3110 Camping Riviera & Wellness Sassari Terme IT CS"],
  [9.46535, 40.49183, "3111 Camping Riviera & Wellness Nuoro Nord IT AA"],
  [9.33936, 40.45135, "3112 Parcheggio Sosta Panoramica Nuoro Sud IT CS"],
  [9.13378, 40.36632, "3113 Camper Service Autostradale Nuoro Est IT CS"],
  [9.12815, 40.47968, "3114 Area Sosta Comunale Nuoro Ovest IT PS"],
  [9.18285, 40.18985, "3115 Camper Park Attrezzato Nuoro Centro IT CS"],
  [9.29651, 40.3235, "3116 Camper Park Attrezzato Nuoro Mare IT CS"],
  [9.19359, 40.20336, "3117 Agricampeggio & Sosta Natura Nuoro Collina IT PS"],
  [9.2411, 40.35795, "3118 Camper Park Attrezzato Nuoro Lago IT PS"],
  [9.49279, 40.21639, "3119 Camping Riviera & Wellness Nuoro Terme IT PS"],
  [9.26651, 40.47875, "3120 Area Sosta Comunale Nuoro Nord IT PS"],
  [9.29491, 40.31065, "3121 Camper Park Attrezzato Nuoro Sud IT PS"],
  [9.4618, 40.43276, "3122 Camper Park Attrezzato Nuoro Est IT PS"],
  [9.14215, 40.29549, "3123 Camper Service Autostradale Nuoro Ovest IT AA"],
  [9.35348, 40.33392, "3124 Parcheggio Sosta Panoramica Nuoro Centro IT CAMP"],
  [9.24233, 40.27906, "3125 Agricampeggio & Sosta Natura Nuoro Mare IT CS"],
  [9.32108, 40.34265, "3126 Camper Service Autostradale Nuoro Collina IT CAMP"],
  [9.19277, 40.3961, "3127 Camper Park Attrezzato Nuoro Lago IT CAMP"],
  [9.33001, 40.15039, "3128 Area Sosta Comunale Nuoro Terme IT CS"],
  [9.29182, 40.28749, "3129 Camper Service Autostradale Nuoro Nord IT CAMP"],
  [9.325, 40.2765, "3130 Camping Riviera & Wellness Nuoro Sud IT PS"],
  [9.55131, 40.45565, "3131 Camper Service Autostradale Nuoro Est IT AA"],
  [9.17776, 40.47215, "3132 Camper Service Autostradale Nuoro Ovest IT AA"],
  [9.44291, 40.41584, "3133 Agricampeggio & Sosta Natura Nuoro Centro IT PS"],
  [9.39044, 40.39409, "3134 Parcheggio Sosta Panoramica Nuoro Mare IT CAMP"],
  [9.2781, 40.1661, "3135 Camping Riviera & Wellness Nuoro Collina IT CAMP"],
  [9.31968, 40.23228, "3136 Camping Riviera & Wellness Nuoro Lago IT PS"],
  [8.43315, 39.96409, "3137 Camping Riviera & Wellness Oristano Nord IT AA"],
  [8.47794, 39.78268, "3138 Camping Riviera & Wellness Oristano Sud IT PS"],
  [8.40814, 39.77196, "3139 Area Sosta Comunale Oristano Est IT CS"],
  [8.80497, 39.97822, "3140 Camper Service Autostradale Oristano Ovest IT PS"],
  [8.7608, 40.04958, "3141 Parcheggio Sosta Panoramica Oristano Centro IT AA"],
  [8.5026, 39.8196, "3142 Camper Service Autostradale Oristano Mare IT CS"],
  [8.55182, 39.83889, "3143 Parcheggio Sosta Panoramica Oristano Collina IT PS"],
  [8.71611, 39.95376, "3144 Area Sosta Comunale Oristano Lago IT AA"],
  [8.46089, 39.82526, "3145 Camper Park Attrezzato Oristano Terme IT CAMP"],
  [8.81076, 39.83894, "3146 Camping Riviera & Wellness Oristano Nord IT PS"],
  [8.71478, 39.765, "3147 Area Sosta Comunale Oristano Sud IT PS"],
  [8.49635, 39.87699, "3148 Parcheggio Sosta Panoramica Oristano Est IT PS"],
  [8.45048, 39.79284, "3149 Camper Park Attrezzato Oristano Ovest IT PS"],
  [8.59278, 39.90136, "3150 Camper Park Attrezzato Oristano Centro IT CS"],
  [8.46226, 39.92958, "3151 Camper Service Autostradale Oristano Mare IT AA"],
  [8.73073, 39.99357, "3152 Area Sosta Comunale Oristano Collina IT CS"],
  [8.75883, 40.07513, "3153 Agricampeggio & Sosta Natura Oristano Lago IT CS"],
  [8.41574, 40.05064, "3154 Camping Riviera & Wellness Oristano Terme IT PS"],
  [8.53658, 39.83369, "3155 Area Sosta Comunale Oristano Nord IT CS"],
  [8.63014, 39.85085, "3156 Area Sosta Comunale Oristano Sud IT CAMP"],
  [8.41196, 39.96658, "3157 Camper Service Autostradale Oristano Est IT PS"],
  [8.36985, 39.99423, "3158 Agricampeggio & Sosta Natura Oristano Ovest IT AA"],
  [8.7229, 39.80497, "3159 Area Sosta Comunale Oristano Centro IT AA"],
  [9.58496, 39.91643, "3160 Camper Service Autostradale Tortol\xEC Nord IT CAMP"],
  [9.83387, 39.88057, "3161 Agricampeggio & Sosta Natura Tortol\xEC Sud IT PS"],
  [9.73259, 40.08015, "3162 Camper Park Attrezzato Tortol\xEC Est IT CAMP"],
  [9.59351, 39.77083, "3163 Parcheggio Sosta Panoramica Tortol\xEC Ovest IT PS"],
  [9.82504, 39.75188, "3164 Area Sosta Comunale Tortol\xEC Centro IT CAMP"],
  [9.84957, 40.0432, "3165 Camping Riviera & Wellness Tortol\xEC Mare IT PS"],
  [9.67208, 39.79381, "3166 Parcheggio Sosta Panoramica Tortol\xEC Collina IT AA"],
  [9.74208, 39.90897, "3167 Agricampeggio & Sosta Natura Tortol\xEC Lago IT CS"],
  [9.51787, 39.89539, "3168 Parcheggio Sosta Panoramica Tortol\xEC Terme IT PS"],
  [9.82635, 39.97262, "3169 Area Sosta Comunale Tortol\xEC Nord IT CAMP"],
  [9.70634, 39.90631, "3170 Camping Riviera & Wellness Tortol\xEC Sud IT CAMP"],
  [9.46992, 39.96521, "3171 Camping Riviera & Wellness Tortol\xEC Est IT PS"],
  [9.819, 40.09621, "3172 Camper Service Autostradale Tortol\xEC Ovest IT PS"],
  [9.70653, 39.8855, "3173 Camping Riviera & Wellness Tortol\xEC Centro IT AA"],
  [9.78649, 40.05748, "3174 Parcheggio Sosta Panoramica Tortol\xEC Mare IT CS"],
  [9.47249, 39.92507, "3175 Camper Park Attrezzato Tortol\xEC Collina IT AA"],
  [9.86307, 40.06454, "3176 Camper Park Attrezzato Tortol\xEC Lago IT PS"],
  [9.54281, 39.94003, "3177 Camping Riviera & Wellness Tortol\xEC Terme IT PS"],
  [9.48076, 39.99577, "3178 Camping Riviera & Wellness Tortol\xEC Nord IT CS"],
  [9.58023, 40.07595, "3179 Camper Park Attrezzato Tortol\xEC Sud IT AA"],
  [9.54923, 39.82793, "3180 Agricampeggio & Sosta Natura Tortol\xEC Est IT PS"],
  [9.49439, 39.79388, "3181 Camping Riviera & Wellness Tortol\xEC Ovest IT PS"],
  [9.58306, 40.02924, "3182 Area Sosta Comunale Tortol\xEC Centro IT PS"],
  [9.70361, 40.01902, "3183 Parcheggio Sosta Panoramica Tortol\xEC Mare IT CS"],
  [7.42086, 45.82204, "3184 Camping Riviera & Wellness Aosta Nord IT PS"],
  [7.14666, 45.64024, "3185 Camper Park Attrezzato Aosta Sud IT PS"],
  [7.42786, 45.5932, "3186 Area Sosta Comunale Aosta Est IT AA"],
  [7.35238, 45.8917, "3187 Camping Riviera & Wellness Aosta Ovest IT CS"],
  [7.35421, 45.89592, "3188 Agricampeggio & Sosta Natura Aosta Centro IT CS"],
  [7.33562, 45.58366, "3189 Agricampeggio & Sosta Natura Aosta Mare IT AA"],
  [7.25886, 45.67388, "3190 Camper Service Autostradale Aosta Collina IT PS"],
  [7.36045, 45.79431, "3191 Parcheggio Sosta Panoramica Aosta Lago IT CS"],
  [7.47816, 45.56522, "3192 Camper Service Autostradale Aosta Terme IT AA"],
  [7.22817, 45.84765, "3193 Camper Park Attrezzato Aosta Nord IT CAMP"],
  [7.16094, 45.79999, "3194 Camper Service Autostradale Aosta Sud IT CS"],
  [7.47671, 45.82347, "3195 Camper Park Attrezzato Aosta Est IT CAMP"],
  [7.32067, 45.67405, "3196 Parcheggio Sosta Panoramica Aosta Ovest IT AA"],
  [7.41254, 45.9109, "3197 Agricampeggio & Sosta Natura Aosta Centro IT AA"],
  [7.31736, 45.85204, "3198 Camping Riviera & Wellness Aosta Mare IT PS"],
  [7.24452, 45.9054, "3199 Area Sosta Comunale Aosta Collina IT PS"],
  [7.19588, 45.88905, "3200 Camping Riviera & Wellness Aosta Lago IT CS"],
  [7.42193, 45.86187, "3201 Camper Park Attrezzato Aosta Terme IT AA"],
  [7.16624, 45.88133, "3202 Camping Riviera & Wellness Aosta Nord IT CAMP"],
  [7.2847, 45.6993, "3203 Parcheggio Sosta Panoramica Aosta Sud IT AA"],
  [7.27058, 45.8272, "3204 Agricampeggio & Sosta Natura Aosta Est IT PS"],
  [7.18239, 45.80573, "3205 Agricampeggio & Sosta Natura Aosta Ovest IT CAMP"],
  [7.43312, 45.60782, "3206 Area Sosta Comunale Aosta Centro IT PS"],
  [13.81152, 45.70362, "3207 Camper Service Autostradale Trieste Nord IT CAMP"],
  [13.95555, 45.64335, "3208 Camping Riviera & Wellness Trieste Sud IT PS"],
  [13.63984, 45.75603, "3209 Camper Park Attrezzato Trieste Est IT CS"],
  [13.81086, 45.72859, "3210 Agricampeggio & Sosta Natura Trieste Ovest IT AA"],
  [13.744, 45.80714, "3211 Camper Service Autostradale Trieste Centro IT CS"],
  [13.99017, 45.50812, "3212 Area Sosta Comunale Trieste Mare IT CS"],
  [13.78375, 45.51557, "3213 Area Sosta Comunale Trieste Collina IT CS"],
  [13.61866, 45.62634, "3214 Parcheggio Sosta Panoramica Trieste Lago IT CAMP"],
  [13.66018, 45.4864, "3215 Camper Park Attrezzato Trieste Terme IT PS"],
  [13.98135, 45.71529, "3216 Agricampeggio & Sosta Natura Trieste Nord IT PS"],
  [13.85363, 45.82141, "3217 Camping Riviera & Wellness Trieste Sud IT PS"],
  [13.84444, 45.77721, "3218 Camper Service Autostradale Trieste Est IT AA"],
  [13.7171, 45.70312, "3219 Camping Riviera & Wellness Trieste Ovest IT CAMP"],
  [13.77195, 45.50342, "3220 Area Sosta Comunale Trieste Centro IT AA"],
  [13.99611, 45.6799, "3221 Area Sosta Comunale Trieste Mare IT CS"],
  [13.59435, 45.7173, "3222 Agricampeggio & Sosta Natura Trieste Collina IT PS"],
  [13.84187, 45.64397, "3223 Camper Service Autostradale Trieste Lago IT CS"],
  [13.59655, 45.6745, "3224 Agricampeggio & Sosta Natura Trieste Terme IT PS"],
  [13.02109, 46.1721, "3225 Camper Service Autostradale Udine Nord IT CS"],
  [13.27532, 46.06922, "3226 Area Sosta Comunale Udine Sud IT PS"],
  [13.41612, 46.22559, "3227 Camper Park Attrezzato Udine Est IT AA"],
  [13.0146, 46.13093, "3228 Parcheggio Sosta Panoramica Udine Ovest IT CS"],
  [13.07017, 45.93067, "3229 Agricampeggio & Sosta Natura Udine Centro IT PS"],
  [13.26532, 45.94402, "3230 Camping Riviera & Wellness Udine Mare IT CS"],
  [13.23997, 46.23057, "3231 Area Sosta Comunale Udine Collina IT AA"],
  [13.4519, 45.94766, "3232 Parcheggio Sosta Panoramica Udine Lago IT CAMP"],
  [13.438, 45.99281, "3233 Camper Park Attrezzato Udine Terme IT AA"],
  [13.07513, 46.07454, "3234 Camping Riviera & Wellness Udine Nord IT CAMP"],
  [13.42205, 45.99713, "3235 Camping Riviera & Wellness Udine Sud IT PS"],
  [13.10663, 46.07597, "3236 Parcheggio Sosta Panoramica Udine Est IT CAMP"],
  [13.1189, 46.17452, "3237 Camping Riviera & Wellness Udine Ovest IT AA"],
  [13.38688, 45.9925, "3238 Camper Park Attrezzato Udine Centro IT CS"],
  [13.2785, 46.08082, "3239 Parcheggio Sosta Panoramica Udine Mare IT CS"],
  [13.20211, 46.14279, "3240 Camper Park Attrezzato Udine Collina IT CAMP"],
  [13.41885, 46.02122, "3241 Agricampeggio & Sosta Natura Udine Lago IT CAMP"],
  [13.12658, 45.91674, "3242 Camper Service Autostradale Udine Terme IT PS"],
  [13.10389, 45.93774, "3243 Camping Riviera & Wellness Udine Nord IT PS"],
  [12.73129, 45.91165, "3244 Camping Riviera & Wellness Pordenone Nord IT CS"],
  [12.57786, 46.06895, "3245 Camper Service Autostradale Pordenone Sud IT CS"],
  [12.70712, 45.79047, "3246 Camper Service Autostradale Pordenone Est IT PS"],
  [12.485, 45.82502, "3247 Agricampeggio & Sosta Natura Pordenone Ovest IT AA"],
  [12.47554, 45.89668, "3248 Area Sosta Comunale Pordenone Centro IT PS"],
  [12.79464, 45.83262, "3249 Agricampeggio & Sosta Natura Pordenone Mare IT CAMP"],
  [12.87627, 45.81568, "3250 Area Sosta Comunale Pordenone Collina IT CAMP"],
  [12.78773, 46.11452, "3251 Camper Service Autostradale Pordenone Lago IT CS"],
  [12.82948, 45.96567, "3252 Camper Park Attrezzato Pordenone Terme IT AA"],
  [12.7507, 45.96654, "3253 Area Sosta Comunale Pordenone Nord IT PS"],
  [12.48008, 45.87627, "3254 Parcheggio Sosta Panoramica Pordenone Sud IT CAMP"],
  [12.77384, 45.8927, "3255 Camper Park Attrezzato Pordenone Est IT AA"],
  [12.74052, 46.06353, "3256 Agricampeggio & Sosta Natura Pordenone Ovest IT CS"],
  [12.55208, 45.98871, "3257 Camper Service Autostradale Pordenone Centro IT PS"],
  [12.60596, 45.82563, "3258 Camping Riviera & Wellness Pordenone Mare IT CS"],
  [12.72314, 46.10285, "3259 Area Sosta Comunale Pordenone Collina IT CAMP"],
  [12.7407, 46.05353, "3260 Camping Riviera & Wellness Pordenone Lago IT CAMP"],
  [12.63303, 45.94163, "3261 Camping Riviera & Wellness Pordenone Terme IT PS"],
  [12.55962, 45.95718, "3262 Camper Service Autostradale Pordenone Nord IT CAMP"],
  [12.83212, 46.11099, "3263 Parcheggio Sosta Panoramica Pordenone Sud IT PS"],
  [12.47462, 46.00387, "3264 Agricampeggio & Sosta Natura Pordenone Est IT CS"],
  [12.81586, 46.0511, "3265 Camper Service Autostradale Pordenone Ovest IT CAMP"],
  [16.42144, 40.57541, "3266 Camping Riviera & Wellness Matera Nord IT AA"],
  [16.62867, 40.75159, "3267 Area Sosta Comunale Matera Sud IT AA"],
  [16.57009, 40.82816, "3268 Area Sosta Comunale Matera Est IT PS"],
  [16.6876, 40.66563, "3269 Camper Service Autostradale Matera Ovest IT CS"],
  [16.46488, 40.49627, "3270 Camper Service Autostradale Matera Centro IT AA"],
  [16.61975, 40.64014, "3271 Camping Riviera & Wellness Matera Mare IT AA"],
  [16.67683, 40.83938, "3272 Camper Park Attrezzato Matera Collina IT CAMP"],
  [16.45514, 40.64843, "3273 Parcheggio Sosta Panoramica Matera Lago IT AA"],
  [16.75703, 40.51769, "3274 Camper Park Attrezzato Matera Terme IT CS"],
  [16.54989, 40.63935, "3275 Area Sosta Comunale Matera Nord IT CAMP"],
  [16.68488, 40.60969, "3276 Area Sosta Comunale Matera Sud IT CAMP"],
  [16.5114, 40.59611, "3277 Agricampeggio & Sosta Natura Matera Est IT AA"],
  [16.63528, 40.74971, "3278 Area Sosta Comunale Matera Ovest IT CS"],
  [16.81091, 40.81659, "3279 Agricampeggio & Sosta Natura Matera Centro IT CS"],
  [16.76106, 40.80377, "3280 Camper Service Autostradale Matera Mare IT AA"],
  [16.58646, 40.49346, "3281 Agricampeggio & Sosta Natura Matera Collina IT AA"],
  [16.53667, 40.52891, "3282 Agricampeggio & Sosta Natura Matera Lago IT CAMP"],
  [16.4249, 40.61549, "3283 Camper Service Autostradale Matera Terme IT CS"],
  [16.61074, 40.52106, "3284 Camper Park Attrezzato Matera Nord IT PS"],
  [15.58371, 40.78499, "3285 Area Sosta Comunale Potenza Nord IT PS"],
  [15.74904, 40.63014, "3286 Camper Park Attrezzato Potenza Sud IT CAMP"],
  [15.82199, 40.77767, "3287 Camper Service Autostradale Potenza Est IT CAMP"],
  [15.87593, 40.81168, "3288 Area Sosta Comunale Potenza Ovest IT CAMP"],
  [15.91679, 40.51436, "3289 Camper Park Attrezzato Potenza Centro IT PS"],
  [15.89975, 40.77465, "3290 Agricampeggio & Sosta Natura Potenza Mare IT AA"],
  [15.64076, 40.56511, "3291 Camper Park Attrezzato Potenza Collina IT AA"],
  [15.59482, 40.58132, "3292 Camping Riviera & Wellness Potenza Lago IT PS"],
  [16.02292, 40.80129, "3293 Camper Service Autostradale Potenza Terme IT CS"],
  [15.80361, 40.63657, "3294 Camper Service Autostradale Potenza Nord IT AA"],
  [15.93175, 40.72828, "3295 Agricampeggio & Sosta Natura Potenza Sud IT CS"],
  [15.91445, 40.7195, "3296 Parcheggio Sosta Panoramica Potenza Est IT PS"],
  [15.62915, 40.50381, "3297 Camper Park Attrezzato Potenza Ovest IT PS"],
  [15.8056, 40.51984, "3298 Camper Park Attrezzato Potenza Centro IT AA"],
  [15.73456, 40.70281, "3299 Area Sosta Comunale Potenza Mare IT CS"],
  [15.7076, 40.63347, "3300 Camper Service Autostradale Potenza Collina IT AA"],
  [15.64922, 40.55211, "3301 Camper Service Autostradale Potenza Lago IT AA"],
  [15.63236, 40.5638, "3302 Camper Park Attrezzato Potenza Terme IT CS"],
  [15.94987, 40.55197, "3303 Camping Riviera & Wellness Potenza Nord IT CAMP"],
  [15.94508, 40.71266, "3304 Camper Service Autostradale Potenza Sud IT CS"],
  [14.70074, 41.73269, "3305 Camper Park Attrezzato Campobasso Nord IT CS"],
  [14.61528, 41.42746, "3306 Camper Park Attrezzato Campobasso Sud IT CS"],
  [14.62654, 41.71048, "3307 Camper Park Attrezzato Campobasso Est IT CAMP"],
  [14.60586, 41.68782, "3308 Area Sosta Comunale Campobasso Ovest IT CS"],
  [14.53884, 41.60696, "3309 Camping Riviera & Wellness Campobasso Centro IT CAMP"],
  [14.66414, 41.55302, "3310 Camper Service Autostradale Campobasso Mare IT CAMP"],
  [14.59831, 41.42382, "3311 Agricampeggio & Sosta Natura Campobasso Collina IT AA"],
  [14.57863, 41.53163, "3312 Camping Riviera & Wellness Campobasso Lago IT CAMP"],
  [14.45816, 41.39961, "3313 Camper Park Attrezzato Campobasso Terme IT AA"],
  [14.56077, 41.48516, "3314 Camper Park Attrezzato Campobasso Nord IT CAMP"],
  [14.86145, 41.44999, "3315 Camper Service Autostradale Campobasso Sud IT AA"],
  [14.4783, 41.49182, "3316 Agricampeggio & Sosta Natura Campobasso Est IT CAMP"],
  [14.82259, 41.57842, "3317 Camping Riviera & Wellness Campobasso Ovest IT AA"],
  [14.59732, 41.64475, "3318 Agricampeggio & Sosta Natura Campobasso Centro IT CAMP"],
  [14.52921, 41.61289, "3319 Camper Park Attrezzato Campobasso Mare IT CAMP"],
  [14.49342, 41.69582, "3320 Area Sosta Comunale Campobasso Collina IT PS"],
  [14.84518, 41.5906, "3321 Area Sosta Comunale Campobasso Lago IT AA"],
  [14.85118, 41.63193, "3322 Camper Park Attrezzato Campobasso Terme IT CS"],
  [14.57036, 41.60195, "3323 Parcheggio Sosta Panoramica Campobasso Nord IT AA"],
  [14.50385, 41.57205, "3324 Camper Park Attrezzato Campobasso Sud IT PS"],
  [14.75492, 41.53167, "3325 Camper Park Attrezzato Campobasso Est IT CS"],
  [14.7575, 41.54227, "3326 Agricampeggio & Sosta Natura Campobasso Ovest IT CAMP"],
  [14.67039, 41.55429, "3327 Area Sosta Comunale Campobasso Centro IT PS"],
  [14.74822, 41.595, "3328 Camper Park Attrezzato Campobasso Mare IT AA"],
  [14.68948, 41.40121, "3329 Agricampeggio & Sosta Natura Campobasso Collina IT CS"],
  [14.65746, 41.67039, "3330 Camping Riviera & Wellness Campobasso Lago IT CS"],
  [14.23848, 41.57531, "3331 Camper Park Attrezzato Isernia Nord IT AA"],
  [14.10242, 41.63463, "3332 Camper Service Autostradale Isernia Sud IT PS"],
  [14.27575, 41.62226, "3333 Camper Park Attrezzato Isernia Est IT AA"],
  [14.32779, 41.5815, "3334 Parcheggio Sosta Panoramica Isernia Ovest IT AA"],
  [14.14266, 41.72047, "3335 Agricampeggio & Sosta Natura Isernia Centro IT CAMP"],
  [14.11007, 41.46379, "3336 Parcheggio Sosta Panoramica Isernia Mare IT CAMP"],
  [14.07596, 41.43578, "3337 Agricampeggio & Sosta Natura Isernia Collina IT CS"],
  [14.36508, 41.51675, "3338 Camper Park Attrezzato Isernia Lago IT CAMP"],
  [14.00993, 41.60921, "3339 Camper Park Attrezzato Isernia Terme IT CS"],
  [14.1754, 41.63391, "3340 Camping Riviera & Wellness Isernia Nord IT CAMP"],
  [14.12812, 41.7315, "3341 Camping Riviera & Wellness Isernia Sud IT AA"],
  [14.142, 41.73652, "3342 Camper Service Autostradale Isernia Est IT CS"],
  [14.38007, 41.70767, "3343 Camping Riviera & Wellness Isernia Ovest IT AA"],
  [14.08883, 41.75993, "3344 Camping Riviera & Wellness Isernia Centro IT CS"],
  [14.39989, 41.65216, "3345 Parcheggio Sosta Panoramica Isernia Mare IT AA"],
  [14.18119, 41.68312, "3346 Camping Riviera & Wellness Isernia Collina IT AA"],
  [14.2572, 41.64411, "3347 Camping Riviera & Wellness Isernia Lago IT CAMP"],
  [14.10106, 41.53559, "3348 Camper Park Attrezzato Isernia Terme IT PS"],
  [14.33772, 41.57822, "3349 Camper Park Attrezzato Isernia Nord IT PS"],
  [14.22485, 41.47402, "3350 Agricampeggio & Sosta Natura Isernia Sud IT PS"],
  [14.37632, 41.58289, "3351 Camper Park Attrezzato Isernia Est IT PS"],
  [14.43381, 41.62148, "3352 Camper Park Attrezzato Isernia Ovest IT CS"],
  [14.14887, 41.52082, "3353 Camping Riviera & Wellness Isernia Centro IT CS"],
  [14.09383, 41.66268, "3354 Camper Service Autostradale Isernia Mare IT CS"],
  [14.21406, 41.57134, "3355 Area Sosta Comunale Isernia Collina IT CS"],
  [14.07108, 41.67561, "3356 Area Sosta Comunale Isernia Lago IT PS"]
];

// user_places.json
var user_places_default = [
  {
    id: "366975",
    titolo: "Chamonix-Mont-Blanc, 196 Route du Bouchet",
    tipo: "PJ",
    lat: 45.92562,
    lng: 6.874904,
    voto: null,
    servizi: {
      acqua: false,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: false,
      wc: false,
      docce: false,
      wifi: false
    }
  },
  {
    id: "124095",
    titolo: "Chamonix-Mont-Blanc, 560 Rue du Lyret",
    tipo: "DS",
    lat: 45.918123,
    lng: 6.868996,
    voto: 2.5,
    servizi: {
      acqua: false,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: false,
      wc: false,
      docce: false,
      wifi: false
    }
  },
  {
    id: "436442",
    titolo: "Chamonix-Mont-Blanc, 674 Chemin des Cristalliers",
    tipo: "PJ",
    lat: 45.928498,
    lng: 6.876985,
    voto: 3.5,
    servizi: {
      acqua: false,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: false,
      wc: true,
      docce: false,
      wifi: false
    }
  },
  {
    id: "186185",
    titolo: "Camping les Arolles.",
    tipo: "C",
    lat: 45.914036,
    lng: 6.865257,
    voto: 4.03,
    servizi: {
      acqua: true,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: true,
      rifiuti: true,
      wc: true,
      docce: true,
      wifi: true
    }
  },
  {
    id: "622959",
    titolo: "Rue Helbronner, Chamonix-Mont-Blanc",
    tipo: "P",
    lat: 45.92132,
    lng: 6.872655,
    voto: 3.5,
    servizi: {
      acqua: false,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: false,
      wc: false,
      docce: false,
      wifi: false
    }
  },
  {
    id: "699352",
    titolo: "Clos de la Corruaz, Chamonix-Mont-Blanc",
    tipo: "PJ",
    lat: 45.899118,
    lng: 6.841202,
    voto: 5,
    servizi: {
      acqua: false,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: false,
      wc: false,
      docce: false,
      wifi: false
    }
  },
  {
    id: "542892",
    titolo: "Chamonix-Mont-Blanc, 90 Descente des P\xE9riades",
    tipo: "P",
    lat: 45.92411,
    lng: 6.875307,
    voto: 3.75,
    servizi: {
      acqua: false,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: true,
      wc: true,
      docce: false,
      wifi: false
    }
  },
  {
    id: "696122",
    titolo: "Chamonix-Mont-Blanc,Rte Blanche",
    tipo: "PSS",
    lat: 45.914711,
    lng: 6.869485,
    voto: 2.86,
    servizi: {
      acqua: false,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: true,
      wc: false,
      docce: false,
      wifi: false
    }
  },
  {
    id: "697465",
    titolo: "Place Gilbert Ravanel, Chamonix-Mont-Blanc",
    tipo: "DS",
    lat: 45.940581,
    lng: 6.88501,
    voto: null,
    servizi: {
      acqua: true,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: false,
      wc: false,
      docce: false,
      wifi: false
    }
  },
  {
    id: "53551",
    titolo: "Chamonix-Mont-Blanc, 60 Chemin du Pied du Grepon",
    tipo: "PJ",
    lat: 45.923,
    lng: 6.87691,
    voto: 3.83,
    servizi: {
      acqua: true,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: false,
      wc: true,
      docce: false,
      wifi: false
    }
  },
  {
    id: "712123",
    titolo: "Route Blanche, Chamonix-Mont-Blanc",
    tipo: "PSS",
    lat: 45.917923,
    lng: 6.87335,
    voto: null,
    servizi: {
      acqua: false,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: false,
      wc: false,
      docce: false,
      wifi: false
    }
  },
  {
    id: "143151",
    titolo: "Chamonix-Mont-Blanc, 339 Route Blanche",
    tipo: "ASS",
    lat: 45.918865,
    lng: 6.874391,
    voto: 3.5,
    servizi: {
      acqua: true,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: true,
      wc: false,
      docce: false,
      wifi: false
    }
  },
  {
    id: "40068",
    titolo: "Borghetto Santo Spirito , 430 Via Po",
    tipo: "ACC_PR",
    lat: 44.1157,
    lng: 8.23496,
    voto: 4.15,
    servizi: {
      acqua: true,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: true,
      rifiuti: true,
      wc: true,
      docce: true,
      wifi: false
    }
  },
  {
    id: "556741",
    titolo: "Finale Ligure, 2 Piazza di Porta Testa",
    tipo: "DS",
    lat: 44.17509,
    lng: 8.326902,
    voto: null,
    servizi: {
      acqua: true,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: false,
      wc: false,
      docce: false,
      wifi: false
    }
  },
  {
    id: "211389",
    titolo: "Sant'Anna Avagnina, 2 Strada del Mazzucco",
    tipo: "P",
    lat: 44.40551,
    lng: 7.791029,
    voto: 3,
    servizi: {
      acqua: false,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: false,
      wc: false,
      docce: false,
      wifi: false
    }
  },
  {
    id: "632728",
    titolo: "Piazza Don Bonavia, Centallo",
    tipo: "P",
    lat: 44.51168,
    lng: 7.55716,
    voto: null,
    servizi: {
      acqua: false,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: true,
      wc: false,
      docce: false,
      wifi: false
    }
  },
  {
    id: "190674",
    titolo: "Sauze di Cesana ,Unnamed Road",
    tipo: "P",
    lat: 44.89439,
    lng: 6.919077,
    voto: 4.25,
    servizi: {
      acqua: false,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: true,
      wc: false,
      docce: false,
      wifi: false
    }
  },
  {
    id: "541673",
    titolo: "Sauze di Cesana,Unnamed Road",
    tipo: "APN",
    lat: 44.894668,
    lng: 6.917986,
    voto: null,
    servizi: {
      acqua: true,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: true,
      wc: true,
      docce: false,
      wifi: false
    }
  },
  {
    id: "162326",
    titolo: "Saint-V\xE9ran,  La Muande",
    tipo: "P",
    lat: 44.711665,
    lng: 6.84862,
    voto: 3.5,
    servizi: {
      acqua: true,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: true,
      wc: true,
      docce: false,
      wifi: false
    }
  },
  {
    id: "545331",
    titolo: "Saint-V\xE9ran, 2 Vach\xE8res",
    tipo: "PN",
    lat: 44.706857,
    lng: 6.858437,
    voto: 3.33,
    servizi: {
      acqua: false,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: false,
      wc: false,
      docce: false,
      wifi: false
    }
  },
  {
    id: "702131",
    titolo: "Saint-V\xE9ran, Hautes-Alpes",
    tipo: "PN",
    lat: 44.706296,
    lng: 6.858967,
    voto: null,
    servizi: {
      acqua: false,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: false,
      wc: false,
      docce: false,
      wifi: false
    }
  },
  {
    id: "650906",
    titolo: "Via Santuario, Viola",
    tipo: "APN",
    lat: 44.286352,
    lng: 7.952644,
    voto: null,
    servizi: {
      acqua: true,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: false,
      wc: false,
      docce: false,
      wifi: false
    }
  },
  {
    id: "492689",
    titolo: "Manta, 13 Via Valerano",
    tipo: "P",
    lat: 44.610872,
    lng: 7.484492,
    voto: null,
    servizi: {
      acqua: false,
      scarico_grigie: false,
      scarico_nere: false,
      elettricita: false,
      rifiuti: false,
      wc: false,
      docce: false,
      wifi: false
    }
  }
];

// src/data/userPlacesDataset.ts
var USER_RAW_PLACES = [
  {
    "id": "54742",
    "titolo": "Peisey-Nancroix,  D87",
    "tipo": "P",
    "lat": 45.518501,
    "lng": 6.80004,
    "voto": 4.82,
    "servizi": { "acqua": false, "scarico_grigie": false, "scarico_nere": false, "elettricita": false, "rifiuti": false, "wc": true, "docce": false, "wifi": false }
  },
  {
    "id": "91451",
    "titolo": "Tignes, 10 Avenue de la Grande Motte",
    "tipo": "PJ",
    "lat": 45.454141,
    "lng": 6.897868,
    "voto": 2.5,
    "servizi": { "acqua": true, "scarico_grigie": false, "scarico_nere": false, "elettricita": false, "rifiuti": true, "wc": true, "docce": false, "wifi": false }
  }
];
function parseUserRawPlace(item, index) {
  return parseSostaFirestoreDoc(item, index);
}
function parseSostaFirestoreDoc(item, fallbackId) {
  const docId = String(item.id || item.docId || fallbackId || `sosta_${Date.now()}`);
  const tipoUpper = String(item.tipo || item.category || "").toUpperCase().trim();
  let category = "area_sosta";
  if (tipoUpper === "C" || tipoUpper === "CAMP" || tipoUpper.includes("CAMPEGGI")) {
    category = "campeggio";
  } else if (tipoUpper === "DS" || tipoUpper === "CS" || tipoUpper.includes("SERVICE") || tipoUpper.includes("DUMP")) {
    category = "camper_service";
  } else if (tipoUpper === "P" || tipoUpper === "PJ" || tipoUpper === "PSS" || tipoUpper === "ACC_P" || tipoUpper === "APN" || tipoUpper === "OR" || tipoUpper.includes("PARCH") || tipoUpper.includes("PARKING")) {
    category = "parcheggio_camper";
  } else if (tipoUpper === "AS" || tipoUpper === "AA" || tipoUpper === "ASS" || tipoUpper.includes("SOSTA")) {
    category = "area_sosta";
  }
  const facilities = [];
  const servizi = item.servizi || {};
  if (servizi.acqua) facilities.push("Carico acqua");
  if (servizi.scarico_grigie || servizi.scarico_nere || servizi.scarico) facilities.push("Scarico reflui");
  if (servizi.elettricita || servizi.corrente) facilities.push("Elettricit\xE0 220V");
  if (servizi.rifiuti) facilities.push("Raccolta differenziata");
  if (servizi.wc) facilities.push("Servizi igienici");
  if (servizi.docce) facilities.push("Docce calde");
  if (servizi.wifi) facilities.push("Wi-Fi gratuito");
  const title = item.titolo || item.name || "Area Sosta Camper";
  const rating = typeof item.voto === "number" ? item.voto : typeof item.rating === "number" ? item.rating : 4.2;
  let defaultImg = "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600";
  if (category === "campeggio") {
    defaultImg = "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600";
  } else if (category === "parcheggio_camper") {
    defaultImg = "https://images.unsplash.com/photo-1513311068348-19c8fbdc0bb6?auto=format&fit=crop&q=80&w=600";
  } else if (category === "camper_service") {
    defaultImg = "https://images.unsplash.com/photo-1527786356703-4b100091cd2c?auto=format&fit=crop&q=80&w=600";
  }
  return {
    id: docId,
    name: title,
    category,
    lat: Number(item.lat),
    lng: Number(item.lng),
    address: item.address || item.indirizzo || title,
    priceInfo: item.priceInfo || (item.gratis ? "Gratuito" : "Verificare in loco"),
    priceEuro: typeof item.priceEuro === "number" ? item.priceEuro : item.gratis ? 0 : 10,
    rating,
    facilities: Array.isArray(item.facilities) && item.facilities.length > 0 ? item.facilities : facilities,
    imageUrl: item.imageUrl || item.foto || defaultImg,
    source: "inserito_a_mano",
    reviews: Array.isArray(item.reviews) ? item.reviews : []
  };
}
var combinedRawPlaces = [...USER_RAW_PLACES, ...user_places_default];
var USER_PROVIDED_PLACES = combinedRawPlaces.map((item, idx) => parseUserRawPlace(item, idx));

// src/data/mockData.ts
var HANDCRAFTED_PLACES = [
  {
    id: "p1",
    name: "Area Sosta Camper Tempesta - Lago di Garda",
    category: "area_sosta",
    lat: 45.864,
    lng: 10.869,
    address: "Via Gardesana 22, Torbole sul Garda (TN)",
    priceInfo: "18\u20AC / 24 ore",
    priceEuro: 18,
    rating: 4.6,
    facilities: ["Carico acqua", "Scarico reflui", "Elettricit\xE0 220V", "Animali ammessi", "Raccolta differenziata"],
    imageUrl: "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
    source: "inserito_a_mano",
    phone: "+39 0464 505111",
    hasMaxHeightLimit: false,
    hasMaxWeightLimit: false,
    isNarrowAccess: false,
    reviews: [
      {
        id: "r1_1",
        user: "Marco & Silvia",
        date: "2026-06-12",
        rating: 5,
        comment: "Ottima area sosta proprio in riva al lago! Wifi gratuito ben funzionante. Piazzole in piano su ghiaia. Consigliatissima per gli amanti del windsurf.",
        priceUpdated: "18\u20AC / 24 ore",
        vehicleType: "Semintegrale"
      },
      {
        id: "r1_2",
        user: "CamperVagabond",
        date: "2026-06-08",
        rating: 4,
        comment: "Molto pulita e tranquilla. Luce compresa nel prezzo. Un po' distante dal centro di Torbole a piedi, ma c'\xE8 una comodissima pista ciclabile adiacente.",
        priceUpdated: "18\u20AC / 24 ore",
        vehicleType: "Van / Camper puro"
      }
    ]
  },
  {
    id: "p2",
    name: "Camping Dolomiti Wellness & Spa",
    category: "campeggio",
    lat: 46.541,
    lng: 12.131,
    address: "Localit\xE0 Campo, Cortina d'Ampezzo (BL)",
    priceInfo: "34\u20AC / notte",
    priceEuro: 34,
    rating: 4.8,
    facilities: ["Carico acqua", "Scarico reflui", "Elettricit\xE0 220V", "Bagni riscaldati", "Aria condizionata", "Piscina", "Wi-Fi gratuito"],
    imageUrl: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600",
    source: "inserito_a_mano",
    phone: "+39 0436 863222",
    hasMaxHeightLimit: false,
    hasMaxWeightLimit: false,
    isNarrowAccess: true,
    // Narrow alpine approach
    reviews: [
      {
        id: "r2_1",
        user: "Luigi_82",
        date: "2026-06-14",
        rating: 5,
        comment: "Spettacolare! Vista mozzafiato sulle Tofane. Bagni che sembrano un hotel a 5 stelle con pavimenti riscaldati d'inverno. Struttura superba.",
        priceUpdated: "34\u20AC / notte + tassa soggiorno",
        vehicleType: "Motorhome"
      }
    ]
  },
  {
    id: "p3",
    name: "Camper Service Autostrada del Sole - Orvieto",
    category: "camper_service",
    lat: 42.721,
    lng: 12.129,
    address: "Area Servizio Tevere Est, S.R. 205, Orvieto (TR)",
    priceInfo: "Gratuito",
    priceEuro: 0,
    rating: 3.8,
    facilities: ["Carico acqua", "Scarico reflui", "Illuminazione notturna"],
    imageUrl: "https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&q=80&w=600",
    source: "inserito_a_mano",
    hasMaxHeightLimit: false,
    hasMaxWeightLimit: false,
    isNarrowAccess: false,
    reviews: [
      {
        id: "r3_1",
        user: "GirovagoCamper",
        date: "2026-05-20",
        rating: 4,
        comment: "Servizio di carico e scarico gratuito e perfettamente funzionante. Griglia comoda anche per grandi camper mansardati. Grazie Autostrade.",
        priceUpdated: "Gratuito",
        vehicleType: "Mansardato"
      }
    ]
  },
  {
    id: "p4",
    name: "Area Sosta Sotto il Ponte Vecchio - Valle D'Aosta",
    category: "area_sosta",
    lat: 45.738,
    lng: 7.319,
    address: "Via Ponte Romano 12, Saint-Vincent (AO)",
    priceInfo: "15\u20AC / notte",
    priceEuro: 15,
    rating: 4.1,
    facilities: ["Carico acqua", "Scarico reflui", "Elettricit\xE0 220V", "Ricarica bombole"],
    imageUrl: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=600",
    source: "inserito_a_mano",
    phone: "+39 0166 513322",
    hasMaxHeightLimit: true,
    maxHeight: 3.1,
    // Max 3.1m bridge overhead on entry road! Perfect constraint alert!
    hasMaxWeightLimit: true,
    maxWeight: 4,
    // Limits heavyweight trucks
    isNarrowAccess: true,
    reviews: [
      {
        id: "r4_1",
        user: "TechCamper",
        date: "2026-06-01",
        rating: 4,
        comment: "ATTENZIONE: Ponte d'ingresso molto basso! C'\xE8 scritto 3.10m. Col mio mansardato da 3.05m sono passato al pelo ma col cuore in gola. Area tranquilla ed economica.",
        priceUpdated: "15\u20AC / notte",
        vehicleType: "Mansardato"
      }
    ]
  },
  {
    id: "p5",
    name: "Camping Village Mare Azzurro - Toscana",
    category: "campeggio",
    lat: 42.791,
    lng: 10.885,
    address: "Viale dei Pini 140, Castiglione della Pescaia (GR)",
    priceInfo: "29\u20AC / notte",
    priceEuro: 29,
    rating: 4.5,
    facilities: ["Carico acqua", "Scarico reflui", "Elettricit\xE0 220V", "Bagni riscaldati", "Animali ammessi", "Piscina", "Ristorante", "Spiaggia privata"],
    imageUrl: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=600",
    source: "inserito_a_mano",
    phone: "+39 0564 922111",
    hasMaxHeightLimit: false,
    hasMaxWeightLimit: false,
    isNarrowAccess: false,
    reviews: [
      {
        id: "r5_1",
        user: "Chiara_Loves_Camping",
        date: "2026-06-11",
        rating: 5,
        comment: "Posizionato in una pineta bellissima, all'ombra naturale! Piazzole molto spaziose. Accesso diretto alla spiaggia di sabbia fine. Personale super gentile.",
        priceUpdated: "29\u20AC piazzola standard + camper",
        vehicleType: "Semintegrale"
      }
    ]
  },
  {
    id: "p6",
    name: "Parcheggio e Camper Stop Alberobello Trulli",
    category: "area_sosta",
    lat: 40.781,
    lng: 17.241,
    address: "Via Don Francesco Gigante 2, Alberobello (BA)",
    priceInfo: "20\u20AC / 24h",
    priceEuro: 20,
    rating: 4.2,
    facilities: ["Carico acqua", "Scarico reflui", "Elettricit\xE0 220V", "Bagni riscaldati"],
    imageUrl: "https://images.unsplash.com/photo-1568285634123-0130f146a47a?auto=format&fit=crop&q=80&w=600",
    source: "inserito_a_mano",
    phone: "+39 080 4321211",
    hasMaxHeightLimit: false,
    hasMaxWeightLimit: true,
    maxWeight: 3.5,
    // 3.5t dynamic limit
    isNarrowAccess: true,
    // Typical narrow Apulian historic drystone wall roads on maps
    reviews: [
      {
        id: "r6_1",
        user: "PugliaOnTheRoad",
        date: "2026-06-10",
        rating: 4,
        comment: "Comodissimo per visitare i Trulli a piedi (5 minuti). Custodito giorno e notte. Strada d'accesso leggermente stretta se si incrocia un altro camper grande. Complessivamente ottima pulizia.",
        priceUpdated: "20\u20AC tutto compreso",
        vehicleType: "Van / Camper puro"
      }
    ]
  }
];
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function parseRawFrancePlace(index, lng, lat, rawLabel) {
  let clean = rawLabel.trim();
  clean = clean.replace(/Penz/gi, "Penz\xE9").replace(/Scar/gi, "Sca\xEBr").replace(/Guimac/gi, "Guima\xEBc").replace(/Langolan/gi, "Lango\xEBlan").replace(/Vernet/gi, "Vernet-les-Bains").replace(/Taule Penz/gi, "Taul\xE9 Penz\xE9");
  const parts = clean.split(/\s+/);
  let numericId = "";
  if (parts.length > 0 && /^\d+$/.test(parts[0])) {
    numericId = parts.shift() || "";
  }
  let catSuffix = "";
  if (parts.length > 0) {
    const last = parts[parts.length - 1];
    if (["PS", "CS", "AA"].includes(last)) {
      catSuffix = parts.pop() || "";
    }
  }
  if (parts.length > 0) {
    const last = parts[parts.length - 1];
    if (last.startsWith("FR-")) {
      parts.pop();
    }
  }
  const coreName = parts.slice(0).join(" ");
  let category = "area_sosta";
  let name = clean;
  let priceEuro = 0;
  let priceInfo = "Gratuito";
  let facilities = ["Illuminazione notturna"];
  if (catSuffix === "AA") {
    category = "area_sosta";
    name = `Area Sosta ${coreName}`;
    priceEuro = 12;
    priceInfo = "12\u20AC / 24h";
    facilities = ["Carico acqua", "Scarico reflui", "Elettricit\xE0 220V", "Illuminazione notturna"];
  } else if (catSuffix === "CS") {
    category = "camper_service";
    name = `Camper Service ${coreName}`;
    priceEuro = 0;
    priceInfo = "Gratuito";
    facilities = ["Carico acqua", "Scarico reflui"];
  } else if (catSuffix === "PS") {
    category = "area_sosta";
    name = `Punto Sosta ${coreName}`;
    priceEuro = 0;
    priceInfo = "Gratuito";
    facilities = ["Sosta camper autorizzata", "Illuminazione notturna"];
  } else {
    name = coreName || clean;
  }
  const imageCatalog = [
    "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1568285634123-0130f146a47a?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=600"
  ];
  const hashVal = coreName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
  const hashIdx = Math.abs(hashVal) % imageCatalog.length;
  const imageUrl = imageCatalog[hashIdx];
  return {
    id: `fr_${numericId || index}`,
    name,
    category,
    lat,
    lng,
    address: `${coreName}, Francia`,
    priceInfo,
    priceEuro,
    rating: 0,
    facilities,
    imageUrl,
    source: "open_data_francia",
    reviews: []
  };
}
function parseRawItaliaPlace(index, lng, lat, rawLabel) {
  let clean = rawLabel.trim();
  const parts = clean.split(/\s+/);
  let numericId = "";
  if (parts.length > 0 && /^\d+$/.test(parts[0])) {
    numericId = parts.shift() || "";
  }
  let catSuffix = "";
  if (parts.length > 0) {
    const last = parts[parts.length - 1];
    if (["PS", "CS", "AA"].includes(last)) {
      catSuffix = parts.pop() || "";
    }
  }
  if (parts.length > 0) {
    const last = parts[parts.length - 1];
    if (last.startsWith("IT-")) {
      parts.pop();
    }
  }
  const coreName = parts.slice(0).join(" ");
  let category = "area_sosta";
  let name = clean;
  let priceEuro = 0;
  let priceInfo = "Gratuito";
  let facilities = ["Illuminazione notturna"];
  if (catSuffix === "AA") {
    category = "area_sosta";
    name = `Area Sosta ${coreName}`;
    priceEuro = 14;
    priceInfo = "14\u20AC / 24h";
    facilities = ["Carico acqua", "Scarico reflui", "Elettricit\xE0 220V", "Illuminazione notturna"];
  } else if (catSuffix === "CS") {
    category = "camper_service";
    name = `Camper Service ${coreName}`;
    priceEuro = 0;
    priceInfo = "Gratuito";
    facilities = ["Carico acqua", "Scarico reflui"];
  } else if (catSuffix === "PS") {
    category = "area_sosta";
    name = `Punto Sosta ${coreName}`;
    priceEuro = 0;
    priceInfo = "Gratuito";
    facilities = ["Sosta camper autorizzata", "Illuminazione notturna"];
  } else {
    name = coreName || clean;
  }
  const imageCatalog = [
    "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1568285634123-0130f146a47a?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=600"
  ];
  const hashVal = coreName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
  const hashIdx = Math.abs(hashVal) % imageCatalog.length;
  const imageUrl = imageCatalog[hashIdx];
  return {
    id: `it_${numericId || index}`,
    name,
    category,
    lat,
    lng,
    address: `${coreName}, Italia`,
    priceInfo,
    priceEuro,
    rating: 0,
    facilities,
    imageUrl,
    source: "open_data_italia",
    reviews: []
  };
}
function processAllPlaces() {
  const resultList = [...HANDCRAFTED_PLACES];
  FRANCE_RAW_PLACES.forEach(([lng, lat, rawLabel], index) => {
    const freshPlace = parseRawFrancePlace(index, lng, lat, rawLabel);
    let duplicateIndex = -1;
    for (let i = 0; i < resultList.length; i++) {
      const dist = calculateDistance(resultList[i].lat, resultList[i].lng, freshPlace.lat, freshPlace.lng);
      if (dist < 1.5) {
        duplicateIndex = i;
        break;
      }
    }
    if (duplicateIndex !== -1) {
      const existing = resultList[duplicateIndex];
      const cleanFreshName = freshPlace.name.replace(/Area Sosta |Camper Service |Punto Sosta /g, "").trim();
      if (!existing.name.includes(cleanFreshName) && existing.name !== freshPlace.name) {
        existing.name = `${existing.name} & ${cleanFreshName}`;
      }
      const combinedFacilities = /* @__PURE__ */ new Set([...existing.facilities, ...freshPlace.facilities]);
      existing.facilities = Array.from(combinedFacilities);
      if (freshPlace.category === "area_sosta" && existing.category === "camper_service") {
        existing.category = "area_sosta";
        existing.priceInfo = freshPlace.priceInfo;
        existing.priceEuro = freshPlace.priceEuro;
      }
    } else {
      resultList.push(freshPlace);
    }
  });
  ITALIA_RAW_PLACES.forEach(([lng, lat, rawLabel], index) => {
    const freshPlace = parseRawItaliaPlace(index, lng, lat, rawLabel);
    let duplicateIndex = -1;
    for (let i = 0; i < resultList.length; i++) {
      const dist = calculateDistance(resultList[i].lat, resultList[i].lng, freshPlace.lat, freshPlace.lng);
      if (dist < 1.5) {
        duplicateIndex = i;
        break;
      }
    }
    if (duplicateIndex !== -1) {
      const existing = resultList[duplicateIndex];
      const cleanFreshName = freshPlace.name.replace(/Area Sosta |Camper Service |Punto Sosta /g, "").trim();
      if (!existing.name.includes(cleanFreshName) && existing.name !== freshPlace.name) {
        existing.name = `${existing.name} & ${cleanFreshName}`;
      }
      const combinedFacilities = /* @__PURE__ */ new Set([...existing.facilities, ...freshPlace.facilities]);
      existing.facilities = Array.from(combinedFacilities);
      if (freshPlace.category === "area_sosta" && existing.category === "camper_service") {
        existing.category = "area_sosta";
        existing.priceInfo = freshPlace.priceInfo;
        existing.priceEuro = freshPlace.priceEuro;
      }
    } else {
      resultList.push(freshPlace);
    }
  });
  USER_PROVIDED_PLACES.forEach((freshPlace) => {
    let duplicateIndex = -1;
    for (let i = 0; i < resultList.length; i++) {
      const dist = calculateDistance(resultList[i].lat, resultList[i].lng, freshPlace.lat, freshPlace.lng);
      if (dist < 1) {
        duplicateIndex = i;
        break;
      }
    }
    if (duplicateIndex === -1) {
      resultList.push(freshPlace);
    }
  });
  return resultList;
}
var INITIAL_PLACES = processAllPlaces();
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
  apiKey: "AIzaSyBrLUDywyD1lgs6WyS1fd6dvegBjExJxTM",
  authDomain: "calm-light-fg02f.firebaseapp.com",
  projectId: "calm-light-fg02f",
  appId: "1:17441453721:web:b0f4028724ea2bb276aa08"
};
var firebaseDbId = "ai-studio-camperlifeapp-fbcd1f6d-679b-4649-8f91-6a9b5a40d0b9";
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
  if (userData && userData.deleted === true) {
    return null;
  }
  let baseUser = userData;
  if (!baseUser) {
    const cached = getCachedUsers();
    baseUser = cached.find((u) => (u.email || "").toLowerCase().trim() === cleanEmail);
  }
  if (!baseUser || baseUser.deleted === true) return null;
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
    const rawTokens = [];
    const tokensToClean = [];
    const isValidToken = (t) => typeof t === "string" && t.trim().length >= 20 && !t.includes(" ");
    for (const rawEmail of emailList) {
      const email = String(rawEmail || "").toLowerCase().trim();
      if (!email) continue;
      try {
        const doc2 = await tokensRef.doc(email).get();
        if (doc2.exists) {
          const t = doc2.data()?.token || doc2.data()?.pushToken;
          if (isValidToken(t)) {
            if (!rawTokens.includes(t)) rawTokens.push(t);
          } else if (t) {
            tokensToClean.push(t);
          }
        }
      } catch (err) {
        console.error(`[FCM Push] Error reading push token from push_tokens for ${email}:`, err);
      }
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
            uData.pushTokens.forEach((t) => {
              if (isValidToken(t)) {
                if (!rawTokens.includes(t)) rawTokens.push(t);
              } else if (t) {
                tokensToClean.push(t);
              }
            });
          }
        }
      } catch (uErr) {
      }
    }
    const uniqueTokens = Array.from(new Set(rawTokens));
    if (uniqueTokens.length === 0) {
      console.log(`[FCM Push] No valid active push tokens found for users:`, emailList);
      if (tokensToClean.length > 0) {
        await cleanStaleTokens(tokensToClean, emailList, tokensRef);
      }
      return;
    }
    console.log(`[FCM Push] Sending notification to ${uniqueTokens.length} device(s) for ${emailList.join(", ")}...`);
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
      tokens: uniqueTokens
    };
    try {
      const messaging = (0, import_messaging.getMessaging)(app);
      const response = await messaging.sendEachForMulticast(message);
      if (response.successCount > 0) {
        console.log(`[FCM Push] Multicast delivery success: ${response.successCount} received`);
      }
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          const failedToken = uniqueTokens[idx];
          const code = error?.code || "";
          if (code === "messaging/invalid-registration-token" || code === "messaging/registration-token-not-registered" || code === "messaging/invalid-argument" || code === "messaging/mismatched-credential") {
            tokensToClean.push(failedToken);
          }
        }
      });
    } catch (messagingErr) {
    }
    if (tokensToClean.length > 0) {
      await cleanStaleTokens(tokensToClean, emailList, tokensRef);
    }
  } catch (err) {
    console.log(`[FCM Push] Notification flow completed with note:`, err);
  }
}
async function cleanStaleTokens(tokensToClean, emailList, tokensRef) {
  try {
    const uniqueBadTokens = Array.from(new Set(tokensToClean));
    const snapshot = await tokensRef.get();
    for (const doc2 of snapshot.docs) {
      const docData = doc2.data() || {};
      const docToken = docData.token || docData.pushToken;
      if (uniqueBadTokens.includes(docToken)) {
        console.log(`[FCM Push] Purging stale token doc in push_tokens for:`, doc2.id);
        await tokensRef.doc(doc2.id).delete();
      }
    }
    for (const rawEmail of emailList) {
      const email = String(rawEmail || "").toLowerCase().trim();
      if (!email) continue;
      const userDocRef = firestoreDb.collection("users").doc(email);
      const userDoc = await userDocRef.get();
      if (userDoc.exists) {
        const uData = userDoc.data() || {};
        let shouldUpdate = false;
        const updatePayload = {};
        if (uData.pushToken && uniqueBadTokens.includes(uData.pushToken)) {
          updatePayload.pushToken = null;
          shouldUpdate = true;
        }
        if (Array.isArray(uData.pushTokens)) {
          const filtered = uData.pushTokens.filter((t) => !uniqueBadTokens.includes(t));
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
    } else if (err.message?.includes("Forbidden") || err.message?.includes("Missing or insufficient permissions")) {
      console.warn("[Promo Push] Firestore access pending rule propagation, skipping promo check.");
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
            let feeStatus = "unknown";
            if (tags.fee === "no") feeStatus = "free";
            else if (tags.fee === "yes") feeStatus = "paid";
            let priceEuro = feeStatus === "free" ? 0 : tags.charge ? 15 : -1;
            let priceInfo = feeStatus === "free" ? "Gratuito" : tags.charge || "A pagamento (da verificare)";
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
              feeStatus,
              rating: 0,
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
              try {
                const buffer = import_fs.default.readFileSync(filePath);
                const meta = await (0, import_sharp.default)(buffer).metadata();
                if (!meta || !meta.format) {
                  continue;
                }
                console.log(`[Startup Optimizer] Optimizing large file: ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
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
  app2.use(import_express.default.json({ limit: "100mb" }));
  app2.use(import_express.default.urlencoded({ limit: "100mb", extended: true }));
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
      province = (req.body.province || "").trim();
      const reqLat = req.body.lat !== void 0 && req.body.lat !== null ? parseFloat(req.body.lat) : void 0;
      const reqLng = req.body.lng !== void 0 && req.body.lng !== null ? parseFloat(req.body.lng) : void 0;
      const hasCoordinates = reqLat !== void 0 && !isNaN(reqLat) && reqLng !== void 0 && !isNaN(reqLng);
      if (!province && !hasCoordinates) {
        return res.status(400).json({ error: "Specificare una provincia/localit\xE0 o rilevare la posizione GPS." });
      }
      if (!province && hasCoordinates) {
        province = findNearestCity(reqLat, reqLng) || `Zona (${reqLat.toFixed(3)}, ${reqLng.toFixed(3)})`;
      }
      const geoDescription = hasCoordinates ? `nel raggio di 25-30 km attorno alla posizione GPS (${reqLat.toFixed(4)}, ${reqLng.toFixed(4)}) - territorio di "${province}" (Italia)` : `nel territorio di "${province}" (Italia) o nelle immediate vicinanze`;
      console.log(`[Fresh Search Mandated] Bypassing cache to execute real-time search for: ${geoDescription}`);
      console.log(`[Gemini AI with Search Grounding] Discovering POIs for ${geoDescription}...`);
      try {
        const searchPrompt = `Cerca sul web (usando Google Search Grounding) reali, esistenti, attivi ed ufficiali punti di sosta camper, aree di sosta attrezzate, campeggi o camper service (carico/scarico acque) situati ${geoDescription}.
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
          const coords = hasCoordinates ? { lat: reqLat, lng: reqLng } : await getProvinceCoordinates(province);
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
        const coords = req.body.lat && req.body.lng ? { lat: parseFloat(req.body.lat), lng: parseFloat(req.body.lng) } : await getProvinceCoordinates(province);
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
  const SOSTE_CATALOG_FILE = import_path.default.join(process.cwd(), "data", "soste_catalog.json");
  let memorySosteCatalog = [];
  function loadLocalSosteCatalog(forceReload = false) {
    if (!forceReload && memorySosteCatalog.length > 0) return memorySosteCatalog;
    try {
      if (import_fs.default.existsSync(SOSTE_CATALOG_FILE)) {
        const raw = import_fs.default.readFileSync(SOSTE_CATALOG_FILE, "utf-8");
        memorySosteCatalog = JSON.parse(raw);
        console.log(`[Soste Catalog] Loaded ${memorySosteCatalog.length} points from local catalog.`);
      }
    } catch (e) {
      console.error("[Soste Catalog] Error reading local catalog:", e);
    }
    return memorySosteCatalog;
  }
  function saveLocalSosteCatalog(items) {
    try {
      const dataDir = import_path.default.join(process.cwd(), "data");
      if (!import_fs.default.existsSync(dataDir)) import_fs.default.mkdirSync(dataDir, { recursive: true });
      import_fs.default.writeFileSync(SOSTE_CATALOG_FILE, JSON.stringify(items), "utf-8");
      memorySosteCatalog = items;
      console.log(`[Soste Catalog] Saved ${items.length} points to ${SOSTE_CATALOG_FILE}`);
    } catch (e) {
      console.error("[Soste Catalog] Error saving catalog file:", e);
    }
  }
  loadLocalSosteCatalog(true);
  app2.get("/api/admin/reload-soste-catalog", (req, res) => {
    const catalog = loadLocalSosteCatalog(true);
    res.json({ success: true, count: catalog.length });
  });
  app2.post("/api/admin/import-soste-bulk", async (req, res) => {
    try {
      const rawList = Array.isArray(req.body) ? req.body : req.body.places || req.body.soste || req.body.items || [];
      if (!Array.isArray(rawList) || rawList.length === 0) {
        return res.status(400).json({ error: "Invalid payload. Array of places expected." });
      }
      console.log(`[Import Soste] Received batch of ${rawList.length} items to import.`);
      const currentCatalog = loadLocalSosteCatalog();
      const existingMap = /* @__PURE__ */ new Map();
      currentCatalog.forEach((item) => {
        if (item.id) existingMap.set(String(item.id), item);
        else if (item.lat && item.lng) existingMap.set(`${Number(item.lat).toFixed(4)}_${Number(item.lng).toFixed(4)}`, item);
      });
      let addedCount = 0;
      const normalizedBatch = [];
      for (let i = 0; i < rawList.length; i++) {
        const raw = rawList[i];
        const lat = parseFloat(raw.lat || raw.latitude || raw.latitudine || raw.y);
        const lng = parseFloat(raw.lng || raw.lon || raw.longitude || raw.longitudine || raw.x);
        if (isNaN(lat) || isNaN(lng)) continue;
        const id = String(raw.id || `sosta_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`);
        const item = {
          id,
          name: String(raw.name || raw.titolo || raw.title || raw.denominazione || "Punto Sosta Camper").trim(),
          lat,
          lng,
          type: String(raw.type || raw.tipo || raw.category || "area_sosta"),
          address: String(raw.address || raw.indirizzo || raw.via || raw.comune || "").trim(),
          city: String(raw.city || raw.comune || raw.citta || "").trim(),
          province: String(raw.province || raw.provincia || "").trim(),
          region: String(raw.region || raw.regione || "").trim(),
          country: String(raw.country || raw.nazione || raw.paese || "IT").trim(),
          services: Array.isArray(raw.services || raw.servizi) ? raw.services || raw.servizi : [],
          price: String(raw.price || raw.costo || raw.tariffa || "").trim(),
          description: String(raw.description || raw.descrizione || raw.note || "").trim(),
          rating: typeof raw.rating === "number" ? raw.rating : raw.voto ? parseFloat(raw.voto) : 4.5,
          verified: true,
          status: "approved",
          source: "dataset_soste"
        };
        const key = id || `${lat.toFixed(4)}_${lng.toFixed(4)}`;
        if (!existingMap.has(key)) {
          existingMap.set(key, item);
          addedCount++;
        } else {
          existingMap.set(key, { ...existingMap.get(key), ...item });
        }
        normalizedBatch.push(item);
      }
      const mergedList = Array.from(existingMap.values());
      saveLocalSosteCatalog(mergedList);
      (async () => {
        try {
          for (let i = 0; i < normalizedBatch.length; i += 50) {
            const chunk = normalizedBatch.slice(i, i + 50);
            await Promise.all(
              chunk.map(async (doc2) => {
                try {
                  await firestoreDb.collection("soste").doc(doc2.id).set(doc2);
                } catch (err) {
                }
              })
            );
          }
          console.log(`[Import Soste] Finished background Firestore sync for ${normalizedBatch.length} items.`);
        } catch (bgErr) {
          console.warn("[Import Soste] Background Firestore sync error:", bgErr);
        }
      })();
      res.json({
        success: true,
        received: rawList.length,
        newAdded: addedCount,
        totalInCatalog: mergedList.length
      });
    } catch (err) {
      console.error("[Import Soste] Error in bulk import:", err);
      res.status(500).json({ error: err.message || "Failed to process import batch" });
    }
  });
  app2.get("/api/soste", async (req, res) => {
    try {
      const minLat = req.query.minLat ? parseFloat(req.query.minLat) : null;
      const maxLat = req.query.maxLat ? parseFloat(req.query.maxLat) : null;
      const minLng = req.query.minLng ? parseFloat(req.query.minLng) : null;
      const maxLng = req.query.maxLng ? parseFloat(req.query.maxLng) : null;
      const search = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
      const limitCount = req.query.limit ? Math.min(parseInt(req.query.limit, 10) || 500, 2e3) : 500;
      const results = [];
      const seenIds = /* @__PURE__ */ new Set();
      const catalog = loadLocalSosteCatalog();
      if (catalog.length > 0) {
        for (const item of catalog) {
          if (results.length >= limitCount) break;
          const lat = item.lat;
          const lng = item.lng;
          if (minLat !== null && maxLat !== null && (lat < minLat || lat > maxLat)) continue;
          if (minLng !== null && maxLng !== null && (lng < minLng || lng > maxLng)) continue;
          if (search) {
            const title = String(item.name || item.titolo || "").toLowerCase();
            const address = String(item.address || item.city || "").toLowerCase();
            if (!title.includes(search) && !address.includes(search)) continue;
          }
          seenIds.add(item.id);
          results.push(parseSostaFirestoreDoc(item, item.id));
        }
      }
      if (results.length < limitCount) {
        try {
          let queryRef = firestoreDb.collection("soste");
          if (minLat !== null && maxLat !== null) {
            queryRef = queryRef.where("lat", ">=", minLat).where("lat", "<=", maxLat);
          }
          queryRef = queryRef.limit(limitCount - results.length);
          const snapshot = await queryRef.get();
          snapshot.forEach((doc2) => {
            if (seenIds.has(doc2.id)) return;
            const raw = { id: doc2.id, ...doc2.data() };
            if (minLng !== null && maxLng !== null) {
              const lng = Number(raw.lng);
              if (isNaN(lng) || lng < minLng || lng > maxLng) return;
            }
            if (search) {
              const title = String(raw.titolo || raw.name || "").toLowerCase();
              const address = String(raw.indirizzo || raw.address || "").toLowerCase();
              if (!title.includes(search) && !address.includes(search)) return;
            }
            seenIds.add(doc2.id);
            results.push(parseSostaFirestoreDoc(raw, doc2.id));
          });
        } catch (fsErr) {
        }
      }
      res.json(results);
    } catch (err) {
      console.error("Error fetching soste from Firestore/Catalog:", err);
      res.json([]);
    }
  });
  app2.get("/api/public-places", async (req, res) => {
    try {
      const placesList = [];
      const seenIds = /* @__PURE__ */ new Set();
      const catalog = loadLocalSosteCatalog();
      if (catalog.length > 0) {
        catalog.forEach((item) => {
          seenIds.add(item.id);
          placesList.push(parseSostaFirestoreDoc(item, item.id));
        });
      }
      try {
        const sosteSnap = await firestoreDb.collection("soste").limit(500).get();
        sosteSnap.forEach((doc2) => {
          if (!seenIds.has(doc2.id)) {
            seenIds.add(doc2.id);
            placesList.push(parseSostaFirestoreDoc({ id: doc2.id, ...doc2.data() }, doc2.id));
          }
        });
      } catch (sosteErr) {
      }
      try {
        const snapshot = await firestoreDb.collection("places").where("status", "==", "approved").get();
        snapshot.forEach((doc2) => {
          const data = { id: doc2.id, ...doc2.data() };
          if (!seenIds.has(doc2.id)) {
            seenIds.add(doc2.id);
            placesList.push(parseSostaFirestoreDoc(data, doc2.id));
          }
        });
      } catch (placesErr) {
      }
      if (placesList.length === 0) {
        const list = loadUserPlaces();
        const approved = list.filter((p) => p.status === "approved" || !p.status);
        approved.forEach((p) => placesList.push(parseSostaFirestoreDoc(p, p.id)));
      }
      res.json(placesList);
    } catch (err) {
      console.error("Error in /api/public-places:", err);
      res.json([]);
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
  app2.post("/api/extract-tariffs-from-image", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Nessuna immagine fornita per l'estrazione." });
      }
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
      const systemInstruction = "Sei l'assistente esperto di ViaCamper specializzato nella lettura, OCR e interpretazione di cartelli informativi, tabelle prezzi, orari e regolamenti di aree sosta camper, campeggi, agrisosta e punti sosta. Il tuo compito \xE8 esaminare l'immagine fornita, leggere con la massima precisione i prezzi e le tariffe indicate (anche scritte a mano, tabelle complesse, prezzi orari, giornalieri, 24 ore, tariffe stagionali alta/media/bassa stagione, supplementi per allaccio luce 220V, gettoni docce calde, tassa di soggiorno, carico/scarico acque reflue). Estrai i dati in un formato JSON strutturato e accurato. Se una tariffa o un servizio non \xE8 chiaramente visibile, ometti solo ci\xF2 che non \xE8 leggibile senza inventare valori irrealistici.";
      const promptText = "Analizza con precisione questa fotografia di un cartello o tabella tariffe per area sosta camper / campeggio. 1. Estrai tutte le tariffe e fasce di prezzo elencate (periodo/descrizione, prezzo in Euro, unit\xE0 es. 'a notte (24h)', 'al giorno', 'a persona', 'a sosta', 'a gettone / ora', 'a consumo', e note opzionali con inclusioni/esclusioni). 2. Fornisci un testo sintetico della tariffa principale (es: 'Da 15\u20AC a 25\u20AC/notte', '18\u20AC/24h con elettricit\xE0', oppure 'Gratuito'). 3. Estrai il prezzo base o minimo numerico in Euro (es: 15). 4. Riconosci se sul cartello sono menzionati o indicati pittogrammi dei servizi tra: WiFi, Attacco 220V, Scarico Acque, Carico Acqua, Bagni, Docce, Cani Ammessi, Illuminato, Videosorvegliato, Raccolta Rifiuti. 5. Estrai l'eventuale nome della struttura o indicazioni di apertura/orari/regolamento (es. sosta max 48h, check-in 08-20).";
      const imagePart = {
        inlineData: {
          mimeType: detectedMime,
          data: cleanBase64
        }
      };
      const textPart = {
        text: promptText
      };
      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              priceInfo: {
                type: import_genai.Type.STRING,
                description: "Sintesi tariffaria es: '15\u20AC/notte', 'Da 12\u20AC a 22\u20AC/notte' o 'Gratuito'"
              },
              priceEuro: {
                type: import_genai.Type.NUMBER,
                description: "Prezzo base indicativo a notte in euro (0 se gratuito)"
              },
              seasonalPrices: {
                type: import_genai.Type.ARRAY,
                description: "Elenco delle tariffe per stagione, durata, sosta o singoli servizi",
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    period: {
                      type: import_genai.Type.STRING,
                      description: "Periodo o nome tariffa (es: 'Alta Stagione (Luglio - Agosto)', 'Sosta 24h', 'Allaccio 220V', 'Solo C/S')"
                    },
                    priceEuro: {
                      type: import_genai.Type.NUMBER,
                      description: "Prezzo numerico in euro (es: 18 o 5)"
                    },
                    unit: {
                      type: import_genai.Type.STRING,
                      description: "Unit\xE0 (es: 'a notte (24h)', 'al giorno', 'a persona', 'a sosta', 'a gettone / ora', 'a consumo')"
                    },
                    notes: {
                      type: import_genai.Type.STRING,
                      description: "Eventuali dettagli: es. 'Luce inclusa', 'Minimo 2 notti', 'Docce 1\u20AC'"
                    }
                  },
                  required: ["period", "priceEuro", "unit"]
                }
              },
              facilities: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING },
                description: "Servizi identificati sul cartello tra: 'WiFi', 'Attacco 220V', 'Scarico Acque', 'Carico Acqua', 'Bagni', 'Docce', 'Cani Ammessi', 'Illuminato', 'Videosorvegliato', 'Raccolta Rifiuti'"
              },
              detectedPlaceName: {
                type: import_genai.Type.STRING,
                description: "Nome della struttura se presente nell'insegna del cartello (altrimenti stringa vuota)"
              },
              descriptionNotes: {
                type: import_genai.Type.STRING,
                description: "Note su orari, regole di sosta o particolarit\xE0 lette dal cartello"
              },
              summaryMessage: {
                type: import_genai.Type.STRING,
                description: "Breve frase in italiano di riepilogo (es: 'Rilevate 3 tariffe stagionali e allaccio corrente')"
              }
            },
            required: ["priceInfo", "priceEuro", "seasonalPrices"]
          }
        }
      });
      const responseText = response && response.text ? response.text.trim() : "{}";
      const parsedData = JSON.parse(responseText);
      if (Array.isArray(parsedData.seasonalPrices)) {
        parsedData.seasonalPrices = parsedData.seasonalPrices.map((sp, i) => ({
          id: sp.id || `sp_ai_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
          period: sp.period || "Tariffa",
          priceEuro: typeof sp.priceEuro === "number" ? sp.priceEuro : parseFloat(sp.priceEuro) || 0,
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
    } catch (err) {
      console.error("Error in extract-tariffs-from-image endpoint:", err);
      const friendlyMsg = getFriendlyGeminiError(err);
      res.status(500).json({
        error: friendlyMsg || "Impossibile analizzare l'immagine del tariffario. Assicurati che il testo sia nitido e ben illuminato."
      });
    }
  });
  app2.post("/api/propose-place", async (req, res) => {
    try {
      const newPlace = req.body;
      if (!newPlace.name || !newPlace.category || !newPlace.lat || !newPlace.lng) {
        return res.status(400).json({ error: "Dati obbligatori mancanti: nome, categoria, latitudine o longitudine." });
      }
      const textToCheck = `${newPlace.name} ${newPlace.address || ""} ${newPlace.description || ""}`;
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
        description: newPlace.description || "",
        priceInfo: newPlace.priceInfo || "Gratuito",
        priceEuro: Number(newPlace.priceEuro) || 0,
        seasonalPrices: Array.isArray(newPlace.seasonalPrices) ? newPlace.seasonalPrices : [],
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
      if (entry.status === "pending") {
        const placeHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 24px; border-radius: 16px;">
            <div style="background: linear-gradient(135deg, #1C3D2B 0%, #2D5A40 100%); padding: 20px; border-radius: 12px; color: white;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #a7f3d0; margin-bottom: 4px;">ViaCamperApp \u2022 Notifica Amministratore</div>
              <h2 style="margin: 0; color: #ffffff; font-size: 20px;">\u{1F4CD} Nuova Proposta di Sosta</h2>
            </div>
            <div style="background: #ffffff; padding: 22px; border-radius: 12px; margin-top: 16px; border: 1px solid #e2e8f0;">
              <p style="font-size: 14px; color: #1e293b; margin-top: 0;">Un utente ha proposto una nuova struttura ed \xE8 in attesa di approvazione:</p>
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
                  <td style="padding: 8px 0;">${entry.address || "N/D"}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; font-weight: 600;">Tariffa / Costo:</td>
                  <td style="padding: 8px 0;">${entry.priceInfo || (entry.priceEuro ? `${entry.priceEuro}\u20AC` : "Gratuito")}</td>
                </tr>
                ${entry.seasonalPrices && entry.seasonalPrices.length > 0 ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; font-weight: 600; vertical-align: top;">Listino periodi:</td>
                  <td style="padding: 8px 0;">
                    <ul style="margin: 0; padding-left: 18px;">
                      ${entry.seasonalPrices.map((sp) => `<li><strong>${sp.period}</strong>: ${sp.priceEuro}\u20AC ${sp.unit || ""} ${sp.notes ? `(${sp.notes})` : ""}</li>`).join("")}
                    </ul>
                  </td>
                </tr>` : ""}
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; font-weight: 600;">Inviata da:</td>
                  <td style="padding: 8px 0;">${entry.createdBy || "Anonimo"}</td>
                </tr>
              </table>
              <div style="margin-top: 24px;">
                <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Puoi approvare questa sosta dal pannello Amministrazione o dalla Mappa.</p>
              </div>
            </div>
          </div>
        `;
        sendAdminNotificationEmail(`\u{1F4CD} Nuova proposta di sosta da approvare: ${entry.name}`, placeHtml).catch((e) => console.error(e));
      }
      res.json({ success: true, place: { id: placeId, ...entry } });
    } catch (err) {
      console.error("Error proposing place to Firestore:", err);
      res.status(500).json({ error: err.message || "Unknown error inside server" });
    }
  });
  app2.get("/api/admin/pending-places", async (req, res) => {
    try {
      const places = [];
      try {
        const snapshot = await firestoreDb.collection("places").where("status", "==", "pending").get();
        snapshot.forEach((doc2) => {
          places.push({ id: doc2.id, ...doc2.data() });
        });
      } catch (fsErr) {
        console.warn("[Admin API] Error fetching pending places from Firestore, falling back to full places scan:", fsErr?.message);
        try {
          const snapshot = await firestoreDb.collection("places").get();
          snapshot.forEach((doc2) => {
            const data = doc2.data() || {};
            if (data.status === "pending") {
              places.push({ id: doc2.id, ...data });
            }
          });
        } catch (scanErr) {
          console.warn("[Admin API] Full scan failed:", scanErr);
        }
      }
      if (places.length === 0) {
        try {
          const list = loadUserPlaces().filter((p) => p.status === "pending");
          list.forEach((p) => {
            if (!places.some((item) => item.id === p.id)) {
              places.push(p);
            }
          });
        } catch (e) {
        }
      }
      places.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      res.json(places);
    } catch (err) {
      console.error("Error in /api/admin/pending-places:", err);
      res.json([]);
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
        approved: isRegisteredUserAdmin ? true : false,
        isModerator: isRegisteredUserAdmin ? true : false,
        moderatorRoles: isRegisteredUserAdmin ? { community: true, places: true, itineraries: true } : { community: false, places: false, itineraries: false }
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
      if (!newUserDoc.approved) {
        const regSubject = `Richiesta di approvazione nuovo utente su ViaCamperApp [${newUserDoc.nickname}]`;
        const regHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 24px; border-radius: 16px;">
            <div style="background: linear-gradient(135deg, #1C3D2B 0%, #2D5A40 100%); padding: 20px; border-radius: 12px; color: white;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #a7f3d0; margin-bottom: 4px;">ViaCamperApp \u2022 Notifica Amministratore</div>
              <h2 style="margin: 0; color: #ffffff; font-size: 20px;">\u{1F465} Richiesta Approvazione Nuovo Utente</h2>
            </div>
            <div style="background: #ffffff; padding: 22px; border-radius: 12px; margin-top: 16px; border: 1px solid #e2e8f0;">
              <p style="font-size: 14px; color: #1e293b; margin-top: 0;">Un nuovo camperista si \xE8 appena registrato ed \xE8 in attesa di essere approvato per accedere all'app:</p>
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
                  <td style="padding: 8px 0; color: #0f172a;">${newUserDoc.name || "N/D"} ${newUserDoc.surname || ""}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Data di Nascita:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${newUserDoc.dob || "N/D"}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Data Iscrizione:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${(/* @__PURE__ */ new Date()).toLocaleString("it-IT")}</td>
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
        sendAdminNotificationEmail(regSubject, regHtml).catch(
          (err) => console.warn("[Register API] sendAdminNotificationEmail notice:", err)
        );
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
      if (isUserDeleted(cleanEmail)) {
        return res.status(403).json({ error: "Questo account \xE8 stato eliminato definitivamente e non pu\xF2 pi\xF9 accedere." });
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
      if (!userData || userData.deleted === true || isUserDeleted(cleanEmail)) {
        return res.status(403).json({ error: "Questo account \xE8 stato eliminato definitivamente e non pu\xF2 pi\xF9 accedere." });
      }
      const storedPass = String(userData.password || "").trim();
      if (storedPass !== cleanPass) {
        return res.status(400).json({ error: "Password errata. Se non la ricordi, usa la funzione 'Password dimenticata?'." });
      }
      if (userData.approved === false) {
        return res.status(403).json({ error: "Il tuo account \xE8 in attesa di approvazione da parte di un moderatore." });
      }
      console.log(`[Firestore Auth] User logged in: ${cleanEmail}`);
      const isSuper = cleanEmail === "sambucci.simone@gmail.com" || cleanEmail === "viacamperapp@gmail.com";
      const hasAnyModRole = Boolean(
        userData.moderatorRoles && (userData.moderatorRoles.community === true || userData.moderatorRoles.places === true || userData.moderatorRoles.itineraries === true)
      );
      const isMod = isSuper || userData.isModerator === true && hasAnyModRole;
      res.json({
        success: true,
        user: {
          email: userData.email,
          name: userData.name,
          nickname: userData.nickname,
          profilePhoto: userData.profilePhoto || userData.avatarUrl || "",
          favorites: userData.favorites || [],
          isModerator: isMod,
          moderatorRoles: isSuper ? { community: true, places: true, itineraries: true } : hasAnyModRole ? userData.moderatorRoles : { community: false, places: false, itineraries: false }
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
      const hasAnyRole = Boolean(
        moderatorRoles && (moderatorRoles.community || moderatorRoles.places || moderatorRoles.itineraries)
      );
      try {
        await firestoreDb.collection("users").doc(cleanEmail).update({
          moderatorRoles,
          isModerator: hasAnyRole
        });
        console.log(`[Firestore Auth] User ${cleanEmail} moderator roles updated to:`, moderatorRoles, `isModerator:`, hasAnyRole);
      } catch (fsErr) {
        console.log(`[Firestore Auth Fallback] Saved user ${cleanEmail} moderator roles locally.`);
      }
      saveUserOverride(cleanEmail, { moderatorRoles, isModerator: hasAnyRole });
      const cached = getCachedUsers();
      const uIdx = cached.findIndex((u) => (u.email || "").toLowerCase().trim() === cleanEmail);
      if (uIdx !== -1) {
        cached[uIdx].moderatorRoles = moderatorRoles;
        cached[uIdx].isModerator = hasAnyRole;
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
          if (!isUserDeleted(clean)) {
            userMap.set(clean, { ...u, email: clean });
          }
        }
      }
      try {
        const usersRef = firestoreDb.collection("users");
        const snapshot = await usersRef.get();
        snapshot.forEach((doc2) => {
          const data = doc2.data() || {};
          const clean = (data.email || doc2.id).toLowerCase().trim();
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
            createdAt: data.createdAt || existing.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
            isModerator: data.isModerator !== void 0 ? !!data.isModerator : !!existing.isModerator,
            approved: (data.approved !== void 0 ? data.approved : existing.approved) !== false,
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
        await firestoreDb.collection("users").doc(cleanEmail).set({ deleted: true }, { merge: true });
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
      try {
        await firestoreDb.collection("users").doc(cleanEmail).set({ deleted: true }, { merge: true });
        await firestoreDb.collection("users").doc(cleanEmail).delete();
        await firestoreDb.collection(`users/${cleanEmail}/data`).doc("trips").delete();
        const fuelLogs = await firestoreDb.collection(`users/${cleanEmail}/fuelLogs`).get();
        if (!fuelLogs.empty) {
          const batch = firestoreDb.batch();
          fuelLogs.forEach((doc2) => batch.delete(doc2.ref));
          await batch.commit();
        }
      } catch (subErr) {
        console.warn("[Firestore] Error deleting subcollections during self-deletion:", subErr);
      }
      saveUserOverride(cleanEmail, { deleted: true });
      const cached = getCachedUsers().filter((u) => (u.email || "").toLowerCase().trim() !== cleanEmail);
      cacheUsers(cached);
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
  const FUEL_LOGS_CACHE_FILE = import_path.default.join(process.cwd(), "fuel_logs_cache.json");
  function getCachedFuelLogs(email) {
    try {
      if (import_fs.default.existsSync(FUEL_LOGS_CACHE_FILE)) {
        const all = JSON.parse(import_fs.default.readFileSync(FUEL_LOGS_CACHE_FILE, "utf-8"));
        const clean = email.toLowerCase().trim();
        if (Array.isArray(all[clean])) return all[clean];
      }
    } catch (e) {
      console.warn("Error reading fuel logs cache:", e);
    }
    return [];
  }
  function saveCachedFuelLogs(email, logs) {
    try {
      let all = {};
      if (import_fs.default.existsSync(FUEL_LOGS_CACHE_FILE)) {
        try {
          all = JSON.parse(import_fs.default.readFileSync(FUEL_LOGS_CACHE_FILE, "utf-8"));
        } catch {
        }
      }
      const clean = email.toLowerCase().trim();
      all[clean] = logs;
      import_fs.default.writeFileSync(FUEL_LOGS_CACHE_FILE, JSON.stringify(all, null, 2), "utf-8");
    } catch (e) {
      console.warn("Error saving fuel logs cache:", e);
    }
  }
  app2.get("/api/fuel-logs/:email", async (req, res) => {
    try {
      const email = (req.params.email || "").toLowerCase().trim();
      if (!email) return res.json([]);
      let existingLogs = getCachedFuelLogs(email);
      try {
        const logsRef = firestoreDb.collection(`users/${email}/fuelLogs`).orderBy("createdAt", "desc");
        const snapshot = await logsRef.get();
        if (snapshot && Array.isArray(snapshot.docs) && snapshot.docs.length > 0) {
          const fsLogs = snapshot.docs.map((doc2) => ({
            id: doc2.id,
            ...doc2.data()
          }));
          const map = /* @__PURE__ */ new Map();
          existingLogs.forEach((l) => map.set(l.id, l));
          fsLogs.forEach((l) => map.set(l.id, l));
          existingLogs = Array.from(map.values());
        }
      } catch (fsErr) {
        console.warn("[Fuel Logs] Direct subcollection fetch failed (may be quota or offline):", fsErr);
      }
      try {
        const tripsDoc = await firestoreDb.collection(`users/${email}/data`).doc("trips").get();
        if (tripsDoc && tripsDoc.exists) {
          const tripsData = tripsDoc.data();
          if (tripsData && Array.isArray(tripsData.trips)) {
            const map = /* @__PURE__ */ new Map();
            existingLogs.forEach((l) => map.set(l.id, l));
            for (const trip of tripsData.trips) {
              for (const exp of trip.expenses || []) {
                if (exp.category === "Carburante" || exp.liters || exp.pricePerLiter || exp.fuelCompany) {
                  let liters = exp.liters;
                  let pricePerLiter = exp.pricePerLiter;
                  let odometer = exp.odometer || 0;
                  let fuelCompany = exp.fuelCompany || "Eni";
                  let isFullTank = !!exp.isFullTank;
                  if (!liters && exp.title) {
                    const match = exp.title.match(/([\d.,]+)\s*L/i);
                    if (match) liters = parseFloat(match[1].replace(",", "."));
                  }
                  if (!pricePerLiter && exp.title) {
                    const match = exp.title.match(/@\s*([\d.,]+)/i);
                    if (match) pricePerLiter = parseFloat(match[1].replace(",", "."));
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
                      date: exp.date || trip.startDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
                      liters: liters || 0,
                      pricePerLiter: pricePerLiter || 0,
                      totalCost: exp.amount || 0,
                      odometer,
                      isFullTank,
                      fuelCompany,
                      createdAt: exp.date ? new Date(exp.date).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
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
      existingLogs.sort((a, b) => {
        const dateA = a.date || "";
        const dateB = b.date || "";
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        const odoA = Number(a.odometer) || 0;
        const odoB = Number(b.odometer) || 0;
        if (odoA !== odoB) return odoB - odoA;
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      saveCachedFuelLogs(email, existingLogs);
      res.json(existingLogs);
    } catch (err) {
      console.error("Error fetching fuel logs:", err);
      const fallback = getCachedFuelLogs((req.params.email || "").toLowerCase().trim());
      res.json(fallback);
    }
  });
  app2.post("/api/fuel-logs/:email", async (req, res) => {
    try {
      const email = (req.params.email || "").toLowerCase().trim();
      const data = req.body;
      const newLog = {
        id: data.id || `fuel_${Date.now()}`,
        date: data.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        liters: Number(data.liters) || 0,
        pricePerLiter: Number(data.pricePerLiter) || 0,
        totalCost: Number(data.totalCost) || Number((data.liters * data.pricePerLiter).toFixed(2)) || 0,
        odometer: Number(data.odometer) || 0,
        isFullTank: !!data.isFullTank,
        fuelCompany: (data.fuelCompany || "Eni").trim(),
        createdAt: data.createdAt || (/* @__PURE__ */ new Date()).toISOString()
      };
      const current = getCachedFuelLogs(email);
      const filtered = current.filter(
        (l) => String(l.id) !== String(newLog.id) && !(l.date === newLog.date && Math.abs(Number(l.totalCost) - Number(newLog.totalCost)) < 0.01 && Math.abs(Number(l.liters) - Number(newLog.liters)) < 0.01)
      );
      const updated = [newLog, ...filtered];
      updated.sort((a, b) => {
        const dateA = a.date || "";
        const dateB = b.date || "";
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        const odoA = Number(a.odometer) || 0;
        const odoB = Number(b.odometer) || 0;
        if (odoA !== odoB) return odoB - odoA;
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      saveCachedFuelLogs(email, updated);
      (async () => {
        try {
          await firestoreDb.collection(`users/${email}/fuelLogs`).doc(newLog.id).set(newLog);
        } catch (fsErr) {
          const errMsg = fsErr?.message || String(fsErr);
          if (errMsg.includes("429") || errMsg.includes("Quota") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Too Many Requests")) {
          } else {
            console.warn("[Fuel Logs] Background sync notice:", errMsg);
          }
        }
      })().catch(() => {
      });
      res.json({ success: true, log: newLog });
    } catch (err) {
      console.error("Error adding fuel log:", err);
      res.status(500).json({ error: err.message || "Unknown error adding fuel log" });
    }
  });
  app2.delete("/api/fuel-logs/:email/:logId", async (req, res) => {
    try {
      const email = (req.params.email || "").toLowerCase().trim();
      const { logId } = req.params;
      const current = getCachedFuelLogs(email);
      const updated = current.filter((l) => l.id !== logId);
      saveCachedFuelLogs(email, updated);
      (async () => {
        try {
          await firestoreDb.collection(`users/${email}/fuelLogs`).doc(logId).delete();
        } catch (fsErr) {
          const errMsg = fsErr?.message || String(fsErr);
          if (!errMsg.includes("429") && !errMsg.includes("Quota") && !errMsg.includes("RESOURCE_EXHAUSTED")) {
            console.warn("[Fuel Logs] Firestore delete warning:", errMsg);
          }
        }
      })().catch(() => {
      });
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting fuel log:", err);
      res.status(500).json({ error: err.message || "Unknown error deleting fuel log" });
    }
  });
  const FAMILY_CREWS_FILE = import_path.default.join(process.cwd(), "family_crews_cache.json");
  function getCachedFamilyCrews() {
    try {
      if (import_fs.default.existsSync(FAMILY_CREWS_FILE)) {
        return JSON.parse(import_fs.default.readFileSync(FAMILY_CREWS_FILE, "utf-8"));
      }
    } catch (e) {
      console.warn("Error reading family crews cache:", e);
    }
    return {};
  }
  function saveCachedFamilyCrews(crews) {
    try {
      import_fs.default.writeFileSync(FAMILY_CREWS_FILE, JSON.stringify(crews, null, 2), "utf-8");
    } catch (e) {
      console.warn("Error saving family crews cache:", e);
    }
  }
  function generateInviteCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "FAM-";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  app2.get("/api/family-crew/user/:email", async (req, res) => {
    try {
      const email = (req.params.email || "").toLowerCase().trim();
      if (!email) return res.json({ crew: null });
      const allCrews = getCachedFamilyCrews();
      let foundCrew = Object.values(allCrews).find(
        (c) => Array.isArray(c.members) && c.members.some((m) => (m.email || "").toLowerCase().trim() === email)
      );
      if (!foundCrew) {
        try {
          const snapshot = await firestoreDb.collection("family_crews").get();
          if (snapshot && Array.isArray(snapshot.docs)) {
            for (const doc2 of snapshot.docs) {
              const data = doc2.data();
              if (data && Array.isArray(data.members) && data.members.some((m) => (m.email || "").toLowerCase().trim() === email)) {
                foundCrew = { id: doc2.id, ...data };
                allCrews[doc2.id] = foundCrew;
                saveCachedFamilyCrews(allCrews);
                break;
              }
            }
          }
        } catch (fsErr) {
        }
      }
      res.json({ crew: foundCrew || null });
    } catch (err) {
      console.error("Error fetching user family crew:", err);
      res.status(500).json({ error: err.message || "Errore recupero equipaggio" });
    }
  });
  app2.get("/api/family-crew/:crewId", async (req, res) => {
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
        } catch (fsErr) {
        }
      }
      res.json({ crew: crew || null });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/family-crew/create", async (req, res) => {
    try {
      const { name, ownerEmail, ownerName, syncModules } = req.body;
      if (!ownerEmail) {
        return res.status(400).json({ error: "Email proprietario richiesta." });
      }
      const cleanEmail = ownerEmail.toLowerCase().trim();
      const cleanName = (name || "Famiglia in Viaggio \u{1F690}").trim();
      const crewId = `crew_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const inviteCode = generateInviteCode();
      const newCrew = {
        id: crewId,
        code: inviteCode,
        name: cleanName,
        ownerEmail: cleanEmail,
        ownerName: (ownerName || cleanEmail.split("@")[0]).trim(),
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        members: [
          {
            email: cleanEmail,
            nickname: (ownerName || cleanEmail.split("@")[0]).trim(),
            role: "owner",
            joinedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        ],
        syncModules: {
          fuelCard: syncModules?.fuelCard !== false,
          trips: syncModules?.trips !== false,
          checklists: syncModules?.checklists !== false,
          pantry: syncModules?.pantry !== false,
          maintenance: syncModules?.maintenance !== false
        },
        sharedData: {
          fuelLogs: [],
          trips: [],
          checklists: [],
          pantry: { pantry: [], shoppingList: [] },
          maintenance: []
        },
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
        updatedBy: ownerName || cleanEmail
      };
      const allCrews = getCachedFamilyCrews();
      Object.keys(allCrews).forEach((k) => {
        allCrews[k].members = (allCrews[k].members || []).filter((m) => (m.email || "").toLowerCase().trim() !== cleanEmail);
      });
      allCrews[crewId] = newCrew;
      saveCachedFamilyCrews(allCrews);
      (async () => {
        try {
          await firestoreDb.collection("family_crews").doc(crewId).set(newCrew);
        } catch (fsErr) {
          const errMsg = fsErr?.message || String(fsErr);
          if (!errMsg.includes("429") && !errMsg.includes("Quota") && !errMsg.includes("RESOURCE_EXHAUSTED")) {
            console.warn("[Family Crew] Firestore write notice:", errMsg);
          }
        }
      })().catch(() => {
      });
      res.json({ success: true, crew: newCrew });
    } catch (err) {
      console.error("Error creating family crew:", err);
      res.status(500).json({ error: err.message || "Errore creazione equipaggio." });
    }
  });
  app2.post("/api/family-crew/join", async (req, res) => {
    try {
      const { code, user } = req.body;
      if (!code || !user || !user.email) {
        return res.status(400).json({ error: "Codice invito ed utente richiesti." });
      }
      const cleanCode = code.trim().toUpperCase();
      const cleanEmail = user.email.toLowerCase().trim();
      const cleanNickname = (user.nickname || user.name || cleanEmail.split("@")[0]).trim();
      const allCrews = getCachedFamilyCrews();
      let targetCrew = Object.values(allCrews).find(
        (c) => (c.code || "").toUpperCase() === cleanCode || (c.id || "") === code.trim()
      );
      if (!targetCrew) {
        try {
          const snapshot = await firestoreDb.collection("family_crews").get();
          if (snapshot && Array.isArray(snapshot.docs)) {
            for (const doc2 of snapshot.docs) {
              const data = doc2.data();
              if ((data?.code || "").toUpperCase() === cleanCode || doc2.id === code.trim()) {
                targetCrew = { id: doc2.id, ...data };
                allCrews[doc2.id] = targetCrew;
                break;
              }
            }
          }
        } catch (fsErr) {
        }
      }
      if (!targetCrew) {
        return res.status(404).json({ error: `Nessun equipaggio trovato con il codice ${cleanCode}. Controlla il codice e riprova.` });
      }
      const existingMemberIdx = targetCrew.members.findIndex((m) => (m.email || "").toLowerCase().trim() === cleanEmail);
      if (existingMemberIdx >= 0) {
        targetCrew.members[existingMemberIdx].nickname = cleanNickname;
      } else {
        targetCrew.members.push({
          email: cleanEmail,
          nickname: cleanNickname,
          role: "member",
          joinedAt: (/* @__PURE__ */ new Date()).toISOString(),
          profilePhoto: user.profilePhoto || void 0
        });
      }
      targetCrew.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
      targetCrew.updatedBy = cleanNickname;
      allCrews[targetCrew.id] = targetCrew;
      saveCachedFamilyCrews(allCrews);
      (async () => {
        try {
          await firestoreDb.collection("family_crews").doc(targetCrew.id).set(targetCrew);
        } catch (fsErr) {
        }
      })().catch(() => {
      });
      res.json({ success: true, crew: targetCrew });
    } catch (err) {
      console.error("Error joining family crew:", err);
      res.status(500).json({ error: err.message || "Errore durante l'adesione all'equipaggio." });
    }
  });
  app2.post("/api/family-crew/leave", async (req, res) => {
    try {
      const { crewId, email } = req.body;
      if (!crewId || !email) {
        return res.status(400).json({ error: "Dati mancanti." });
      }
      const cleanEmail = email.toLowerCase().trim();
      const allCrews = getCachedFamilyCrews();
      const crew = allCrews[crewId];
      if (crew) {
        crew.members = (crew.members || []).filter((m) => (m.email || "").toLowerCase().trim() !== cleanEmail);
        if (crew.members.length === 0) {
          delete allCrews[crewId];
          (async () => {
            try {
              await firestoreDb.collection("family_crews").doc(crewId).delete();
            } catch (e) {
            }
          })().catch(() => {
          });
        } else {
          if ((crew.ownerEmail || "").toLowerCase().trim() === cleanEmail) {
            crew.ownerEmail = crew.members[0].email;
            crew.ownerName = crew.members[0].nickname;
            crew.members[0].role = "owner";
          }
          allCrews[crewId] = crew;
          (async () => {
            try {
              await firestoreDb.collection("family_crews").doc(crewId).set(crew);
            } catch (e) {
            }
          })().catch(() => {
          });
        }
        saveCachedFamilyCrews(allCrews);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/family-crew/sync/:crewId", async (req, res) => {
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
        } catch (e) {
        }
      }
      if (!crew) {
        return res.status(404).json({ error: "Equipaggio non trovato." });
      }
      if (!crew.sharedData) {
        crew.sharedData = {};
      }
      crew.sharedData[section] = data;
      crew.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
      crew.updatedBy = userName || userEmail || "Membro equipaggio";
      allCrews[crewId] = crew;
      saveCachedFamilyCrews(allCrews);
      (async () => {
        try {
          await firestoreDb.collection("family_crews").doc(crewId).set(crew);
        } catch (fsErr) {
        }
      })().catch(() => {
      });
      res.json({ success: true, crew });
    } catch (err) {
      console.error("Error syncing family crew section:", err);
      res.status(500).json({ error: err.message || "Errore sincronizzazione sezione equipaggio." });
    }
  });
  app2.post("/api/family-crew/update-settings/:crewId", async (req, res) => {
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
      crew.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
      allCrews[crewId] = crew;
      saveCachedFamilyCrews(allCrews);
      (async () => {
        try {
          await firestoreDb.collection("family_crews").doc(crewId).set(crew);
        } catch (fsErr) {
        }
      })().catch(() => {
      });
      res.json({ success: true, crew });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/user-trips/:email", async (req, res) => {
    try {
      const cleanEmail = (req.params.email || "").toLowerCase().trim();
      if (!cleanEmail) {
        return res.status(400).json({ error: "Email richiesta." });
      }
      let firestoreTrips = [];
      let firestoreUpdatedAt = "";
      try {
        const docSnap = await firestoreDb.collection(`users/${cleanEmail}/data`).doc("trips").get();
        if (docSnap && docSnap.exists) {
          const data = docSnap.data();
          if (data && Array.isArray(data.trips)) {
            firestoreTrips = data.trips;
            firestoreUpdatedAt = data.updatedAt || "";
          }
        }
      } catch (fsErr) {
        console.warn("[User Trips API] Notice reading trips from Firestore:", fsErr);
      }
      let diskTrips = [];
      const sanitized = cleanEmail.replace(/[^a-z0-9]/g, "_");
      const backupPath = import_path.default.join(process.cwd(), "user_backups", `trips_${sanitized}.json`);
      try {
        if (import_fs.default.existsSync(backupPath)) {
          const rawBackup = JSON.parse(import_fs.default.readFileSync(backupPath, "utf-8"));
          if (rawBackup && Array.isArray(rawBackup.trips)) {
            diskTrips = rawBackup.trips;
          }
        }
      } catch (bErr) {
        console.warn("[User Trips API] Notice reading disk backup:", bErr);
      }
      let combinedTrips = firestoreTrips;
      if (diskTrips.length > 0 && firestoreTrips.length === 0) {
        combinedTrips = diskTrips;
      } else if (diskTrips.length > 0 && firestoreTrips.length > 0) {
        const cMap = /* @__PURE__ */ new Map();
        for (const t of firestoreTrips) {
          if (t && t.id) cMap.set(t.id, t);
        }
        for (const dt of diskTrips) {
          if (!dt || !dt.id) continue;
          if (cMap.has(dt.id)) {
            const ft = cMap.get(dt.id);
            const movs = /* @__PURE__ */ new Map();
            for (const m of ft.movements || []) {
              if (m && m.id) movs.set(m.id, m);
            }
            for (const m of dt.movements || []) {
              if (m && m.id) {
                if (movs.has(m.id)) {
                  const existingM = movs.get(m.id);
                  const exOdo = typeof existingM.odometer === "number" ? existingM.odometer : parseFloat(existingM.odometer);
                  const dtOdo = typeof m.odometer === "number" ? m.odometer : parseFloat(m.odometer);
                  let bestOdo = exOdo;
                  if ((isNaN(exOdo) || exOdo <= 0) && !isNaN(dtOdo) && dtOdo > 0) {
                    bestOdo = dtOdo;
                  }
                  movs.set(m.id, { ...existingM, ...m, odometer: bestOdo });
                } else {
                  movs.set(m.id, m);
                }
              }
            }
            cMap.set(dt.id, {
              ...ft,
              ...dt,
              movements: Array.from(movs.values())
            });
          } else {
            cMap.set(dt.id, dt);
          }
        }
        combinedTrips = Array.from(cMap.values());
      }
      if (combinedTrips.length > 0) {
        return res.json({ trips: combinedTrips });
      }
      const allCrews = getCachedFamilyCrews();
      for (const crew of Object.values(allCrews)) {
        const isMember = (crew.members || []).some((m) => (m.email || "").toLowerCase().trim() === cleanEmail) || (crew.ownerEmail || "").toLowerCase().trim() === cleanEmail;
        if (isMember && crew.sharedData?.trips && Array.isArray(crew.sharedData.trips) && crew.sharedData.trips.length > 0) {
          return res.json({ trips: crew.sharedData.trips });
        }
      }
      return res.json({ trips: [] });
    } catch (err) {
      console.error("[User Trips API] Error fetching trips:", err);
      return res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/user-trips/sync", async (req, res) => {
    try {
      const { email, trips, deletedIds } = req.body || {};
      const cleanEmail = (email || "").toLowerCase().trim();
      if (!cleanEmail || !Array.isArray(trips)) {
        return res.status(400).json({ error: "Email e array trips validi richiesti." });
      }
      const deletedPhotoIds = new Set((deletedIds?.photos || []).map((x) => String(x || "")));
      const deletedExpIds = new Set((deletedIds?.expenses || []).map((x) => String(x || "")));
      const deletedMovIds = new Set((deletedIds?.movements || []).map((x) => String(x || "")));
      const deletedTripIds = new Set((deletedIds?.trips || []).map((x) => String(x || "")));
      const BACKUP_DIR = import_path.default.join(process.cwd(), "user_backups");
      const PHOTOS_DIR = import_path.default.join(BACKUP_DIR, "photos");
      if (!import_fs.default.existsSync(BACKUP_DIR)) {
        import_fs.default.mkdirSync(BACKUP_DIR, { recursive: true });
      }
      if (!import_fs.default.existsSync(PHOTOS_DIR)) {
        import_fs.default.mkdirSync(PHOTOS_DIR, { recursive: true });
      }
      const UPLOADS_DIR2 = import_path.default.join(process.cwd(), "uploads");
      if (!import_fs.default.existsSync(UPLOADS_DIR2)) {
        import_fs.default.mkdirSync(UPLOADS_DIR2, { recursive: true });
      }
      if (deletedPhotoIds.size > 0) {
        for (const pId of deletedPhotoIds) {
          try {
            const filename = `${pId.replace(/[^a-zA-Z0-9_-]/g, "_")}.jpg`;
            const persistentPath = import_path.default.join(PHOTOS_DIR, filename);
            const uploadPath = import_path.default.join(UPLOADS_DIR2, filename);
            if (import_fs.default.existsSync(persistentPath)) import_fs.default.unlinkSync(persistentPath);
            if (import_fs.default.existsSync(uploadPath)) import_fs.default.unlinkSync(uploadPath);
            if (firestoreDb) {
              firestoreDb.collection("shared_photos").doc(pId).delete().catch(() => {
              });
            }
          } catch (e) {
          }
        }
      }
      for (const trip of trips) {
        if (Array.isArray(trip.photos)) {
          for (const photo of trip.photos) {
            if (photo && typeof photo.url === "string" && photo.url.startsWith("data:image/")) {
              try {
                const match = photo.url.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
                if (match) {
                  const ext = match[1] === "jpeg" ? "jpg" : match[1];
                  const base64Data = match[2];
                  const buffer = Buffer.from(base64Data, "base64");
                  const photoId = (photo.id || `photo_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "_");
                  const filename = `${photoId}.jpg`;
                  const persistentPath = import_path.default.join(PHOTOS_DIR, filename);
                  const uploadPath = import_path.default.join(UPLOADS_DIR2, filename);
                  try {
                    const optBuffer = await (0, import_sharp.default)(buffer).resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
                    import_fs.default.writeFileSync(persistentPath, optBuffer);
                    import_fs.default.writeFileSync(uploadPath, optBuffer);
                  } catch (sErr) {
                    import_fs.default.writeFileSync(persistentPath, buffer);
                    import_fs.default.writeFileSync(uploadPath, buffer);
                  }
                  photo.url = `/api/photos/${photoId}`;
                  if (firestoreDb) {
                    firestoreDb.collection("shared_photos").doc(photoId).set({
                      base64: base64Data,
                      mimeType: `image/${ext}`,
                      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
                    }).catch(() => {
                    });
                  }
                }
              } catch (photoErr) {
                console.error("[User Trips Sync] Error processing photo:", photoErr);
              }
            }
          }
        }
      }
      const sanitized = cleanEmail.replace(/[^a-z0-9]/g, "_");
      const backupPath = import_path.default.join(BACKUP_DIR, `trips_${sanitized}.json`);
      let existingTrips = [];
      try {
        if (import_fs.default.existsSync(backupPath)) {
          const raw = JSON.parse(import_fs.default.readFileSync(backupPath, "utf-8"));
          if (Array.isArray(raw?.trips)) existingTrips = raw.trips;
        }
      } catch (e) {
      }
      if (existingTrips.length === 0) {
        try {
          const docSnap = await firestoreDb.collection(`users/${cleanEmail}/data`).doc("trips").get();
          if (docSnap && docSnap.exists) {
            const data = docSnap.data();
            if (data && Array.isArray(data.trips)) {
              existingTrips = data.trips;
            }
          }
        } catch (fErr) {
        }
      }
      const mergedTripsMap = /* @__PURE__ */ new Map();
      for (const t of existingTrips) {
        if (t && t.id && !deletedTripIds.has(t.id)) mergedTripsMap.set(t.id, t);
      }
      for (const incTrip of trips) {
        if (!incTrip || !incTrip.id || deletedTripIds.has(incTrip.id)) continue;
        if (mergedTripsMap.has(incTrip.id)) {
          const exTrip = mergedTripsMap.get(incTrip.id);
          const expMap = /* @__PURE__ */ new Map();
          for (const e of exTrip.expenses || []) {
            if (e && e.id && !deletedExpIds.has(String(e.id))) expMap.set(String(e.id), e);
          }
          for (const e of incTrip.expenses || []) {
            if (e && e.id && !deletedExpIds.has(String(e.id))) {
              const strId = String(e.id);
              if (expMap.has(strId)) {
                const existing = expMap.get(strId);
                expMap.set(strId, { ...existing, ...e });
              } else {
                const dupEntry = Array.from(expMap.entries()).find(
                  ([_, x]) => x.date === e.date && Math.abs(Number(x.amount) - Number(e.amount)) < 0.01 && x.title === e.title
                );
                if (dupEntry) {
                  const [dupId, existing] = dupEntry;
                  expMap.set(dupId, { ...existing, ...e, id: dupId });
                } else {
                  expMap.set(strId, e);
                }
              }
            }
          }
          const movMap = /* @__PURE__ */ new Map();
          for (const m of exTrip.movements || []) {
            if (m && m.id && !deletedMovIds.has(String(m.id))) movMap.set(m.id, m);
          }
          for (const m of incTrip.movements || []) {
            if (m && m.id && !deletedMovIds.has(String(m.id))) {
              const existing = movMap.get(m.id);
              if (existing) {
                movMap.set(m.id, {
                  ...existing,
                  ...m
                });
              } else {
                movMap.set(m.id, m);
              }
            }
          }
          const phoMap = /* @__PURE__ */ new Map();
          for (const p of exTrip.photos || []) {
            const pId = String(p?.id || "");
            const pUrl = String(p?.url || "");
            if (p && (pId || pUrl) && !deletedPhotoIds.has(pId) && !deletedPhotoIds.has(pUrl)) {
              phoMap.set(pId || pUrl, p);
            }
          }
          for (const p of incTrip.photos || []) {
            const pId = String(p?.id || "");
            const pUrl = String(p?.url || "");
            if (p && (pId || pUrl) && !deletedPhotoIds.has(pId) && !deletedPhotoIds.has(pUrl)) {
              const key = pId || pUrl;
              if (phoMap.has(key)) {
                const existing = phoMap.get(key);
                if (p.url && !p.url.startsWith("/uploads/") && existing?.url?.startsWith("/uploads/")) {
                  phoMap.set(key, { ...existing, ...p, url: p.url });
                } else {
                  phoMap.set(key, { ...existing, ...p });
                }
              } else {
                phoMap.set(key, p);
              }
            }
          }
          const stopMap = /* @__PURE__ */ new Map();
          for (const s of exTrip.stops || []) {
            if (s && s.id) stopMap.set(s.id, s);
          }
          for (const s of incTrip.stops || []) {
            if (s && s.id) {
              if (stopMap.has(s.id)) {
                const existing = stopMap.get(s.id);
                stopMap.set(s.id, { ...existing, ...s });
              } else {
                stopMap.set(s.id, s);
              }
            }
          }
          const startOdometers = [exTrip.startOdometer, incTrip.startOdometer].filter((n) => typeof n === "number" && n > 0);
          const endOdometers = [exTrip.endOdometer, incTrip.endOdometer].filter((n) => typeof n === "number" && n > 0);
          mergedTripsMap.set(incTrip.id, {
            ...exTrip,
            ...incTrip,
            expenses: Array.from(expMap.values()),
            movements: Array.from(movMap.values()),
            photos: Array.from(phoMap.values()),
            stops: Array.from(stopMap.values()),
            startOdometer: incTrip.startOdometer !== void 0 ? incTrip.startOdometer : exTrip.startOdometer,
            endOdometer: incTrip.endOdometer !== void 0 ? incTrip.endOdometer : exTrip.endOdometer
          });
        } else {
          mergedTripsMap.set(incTrip.id, incTrip);
        }
      }
      const finalTrips = Array.from(mergedTripsMap.values());
      try {
        import_fs.default.writeFileSync(backupPath, JSON.stringify({ email: cleanEmail, trips: finalTrips, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, null, 2));
      } catch (wbErr) {
        console.warn("[User Trips Sync] Notice writing disk backup:", wbErr);
      }
      try {
        await firestoreDb.collection(`users/${cleanEmail}/data`).doc("trips").set({
          trips: finalTrips,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedBy: cleanEmail
        });
      } catch (fsErr) {
        console.error("[User Trips Sync] Firestore write error:", fsErr);
      }
      const allCrews = getCachedFamilyCrews();
      let crewUpdated = false;
      for (const [crewId, crew] of Object.entries(allCrews)) {
        const isMember = (crew.members || []).some((m) => (m.email || "").toLowerCase().trim() === cleanEmail) || (crew.ownerEmail || "").toLowerCase().trim() === cleanEmail;
        if (isMember) {
          if (!crew.sharedData) crew.sharedData = {};
          crew.sharedData.trips = finalTrips;
          crew.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
          crew.updatedBy = cleanEmail;
          allCrews[crewId] = crew;
          crewUpdated = true;
          (async () => {
            try {
              await firestoreDb.collection("family_crews").doc(crewId).set(crew);
            } catch (e) {
            }
          })().catch(() => {
          });
        }
      }
      if (crewUpdated) {
        saveCachedFamilyCrews(allCrews);
      }
      return res.json({ success: true, count: finalTrips.length, trips: finalTrips });
    } catch (err) {
      console.error("[User Trips API] Error syncing trips:", err);
      return res.status(500).json({ error: err.message });
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
  const deletedCommunityMessageIds = /* @__PURE__ */ new Set();
  const DELETED_COMMUNITY_MSGS_FILE = import_path.default.join(process.cwd(), "deleted_community_messages.json");
  function loadCachedDeletedCommunityMessages() {
    try {
      if (import_fs.default.existsSync(DELETED_COMMUNITY_MSGS_FILE)) {
        const raw = import_fs.default.readFileSync(DELETED_COMMUNITY_MSGS_FILE, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach((id) => deletedCommunityMessageIds.add(id));
        }
      }
    } catch (e) {
    }
  }
  loadCachedDeletedCommunityMessages();
  function saveCachedDeletedCommunityMessages() {
    try {
      import_fs.default.writeFileSync(DELETED_COMMUNITY_MSGS_FILE, JSON.stringify(Array.from(deletedCommunityMessageIds)), "utf-8");
    } catch (e) {
    }
  }
  (async () => {
    try {
      const snap = await firestoreDb.collection("deleted_community_messages").get();
      if (snap && snap.docs) {
        snap.docs.forEach((d) => {
          deletedCommunityMessageIds.add(d.id);
        });
        saveCachedDeletedCommunityMessages();
      }
    } catch (e) {
    }
  })();
  function sanitizeServerCommunityMessage(docId, data) {
    if (!data) return null;
    const msgUser = data.user || "";
    if (deletedCommunityMessageIds.has(docId) || FAKE_POST_IDS.has(docId) || FAKE_USERS.has(msgUser)) {
      return null;
    }
    const isInitialRolly = msgUser.includes("Rolly") || docId.startsWith("rolly_topic_") || docId.startsWith("social_post_rolly") || docId.startsWith("chat_rolly");
    const rawReplies = Array.isArray(data.replies) ? data.replies : [];
    const cleanReplies = rawReplies.filter((r) => {
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
      try {
        const delSnap = await firestoreDb.collection("deleted_community_messages").get();
        if (delSnap && delSnap.docs) {
          delSnap.docs.forEach((d) => {
            deletedCommunityMessageIds.add(d.id);
          });
        }
      } catch (e) {
      }
      let snapshot = null;
      try {
        snapshot = await firestoreDb.collection("communityMessages").orderBy("timestamp", "asc").limit(200).get();
      } catch (dbErr) {
        console.warn("[Community Messages] Firestore query fallback:", dbErr);
      }
      const messages = [];
      if (snapshot && snapshot.docs && snapshot.docs.length > 0) {
        snapshot.forEach((doc2) => {
          const rawData = doc2.data() || {};
          if (deletedCommunityMessageIds.has(doc2.id) || rawData.isDeleted || rawData.deleted) {
            deletedCommunityMessageIds.add(doc2.id);
            return;
          }
          const sanitized = sanitizeServerCommunityMessage(doc2.id, rawData);
          if (sanitized) {
            messages.push(sanitized);
          }
        });
      }
      const fetchedIds = new Set(messages.map((m) => m.id));
      for (const initialMsg of INITIAL_COMMUNITY_MESSAGES) {
        if (!fetchedIds.has(initialMsg.id) && !deletedCommunityMessageIds.has(initialMsg.id)) {
          const sanitizedInitial = sanitizeServerCommunityMessage(initialMsg.id, initialMsg);
          if (sanitizedInitial) {
            messages.push(sanitizedInitial);
          }
        }
      }
      res.json(messages);
    } catch (err) {
      const fallback = INITIAL_COMMUNITY_MESSAGES.filter((m) => !deletedCommunityMessageIds.has(m.id)).map((m) => sanitizeServerCommunityMessage(m.id, m)).filter(Boolean);
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
      if (deletedCommunityMessageIds.has(msgId)) {
        return res.json({ success: true, ignored: true, message: { id: msgId } });
      }
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
          deletedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (delPersistErr) {
        console.warn("Deleted tracking persist warning:", delPersistErr);
      }
      console.log(`[Firestore Chat] Message ${id} permanently deleted`);
      res.json({ success: true, id });
    } catch (err) {
      console.error("Error deleting community message on Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/community-messages/reply-delete", async (req, res) => {
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
          deletedAt: (/* @__PURE__ */ new Date()).toISOString()
        }).catch(() => {
        });
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
        const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${googleKey}&language=it`;
        const googleRes = await fetch(placesUrl);
        if (googleRes.ok) {
          const googleData = await googleRes.json();
          if (googleData.status === "OK" && Array.isArray(googleData.results) && googleData.results.length > 0) {
            const places = googleData.results.map((p) => {
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
  const PHOTOS_STORAGE_DIR = import_path.default.join(process.cwd(), "user_backups", "photos");
  if (!import_fs.default.existsSync(UPLOADS_DIR)) {
    import_fs.default.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!import_fs.default.existsSync(PHOTOS_STORAGE_DIR)) {
    import_fs.default.mkdirSync(PHOTOS_STORAGE_DIR, { recursive: true });
  }
  app2.use("/uploads", import_express.default.static(UPLOADS_DIR));
  app2.use("/uploads", import_express.default.static(PHOTOS_STORAGE_DIR));
  app2.get("/api/photos/:photoId", async (req, res) => {
    try {
      const rawId = req.params.photoId;
      const photoId = rawId.replace(/[^a-zA-Z0-9_-]/g, "_");
      const isThumb = req.query.thumb === "1" || req.query.size === "thumb";
      const thumbDiskPath = import_path.default.join(PHOTOS_STORAGE_DIR, `${photoId}_thumb.jpg`);
      if (isThumb && import_fs.default.existsSync(thumbDiskPath)) {
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.sendFile(thumbDiskPath);
      }
      const diskPath = import_path.default.join(PHOTOS_STORAGE_DIR, `${photoId}.jpg`);
      if (import_fs.default.existsSync(diskPath)) {
        if (isThumb) {
          try {
            const fullBuf = import_fs.default.readFileSync(diskPath);
            const thumbBuf = await (0, import_sharp.default)(fullBuf).resize({ width: 360, height: 360, fit: "cover", position: "center" }).jpeg({ quality: 72 }).toBuffer();
            try {
              import_fs.default.writeFileSync(thumbDiskPath, thumbBuf);
            } catch (e) {
            }
            res.setHeader("Content-Type", "image/jpeg");
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            return res.send(thumbBuf);
          } catch (e) {
          }
        }
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.sendFile(diskPath);
      }
      const uploadPath = import_path.default.join(UPLOADS_DIR, `${photoId}.jpg`);
      if (import_fs.default.existsSync(uploadPath)) {
        if (isThumb) {
          try {
            const fullBuf = import_fs.default.readFileSync(uploadPath);
            const thumbBuf = await (0, import_sharp.default)(fullBuf).resize({ width: 360, height: 360, fit: "cover", position: "center" }).jpeg({ quality: 72 }).toBuffer();
            try {
              import_fs.default.writeFileSync(thumbDiskPath, thumbBuf);
            } catch (e) {
            }
            res.setHeader("Content-Type", "image/jpeg");
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            return res.send(thumbBuf);
          } catch (e) {
          }
        }
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.sendFile(uploadPath);
      }
      if (firestoreDb) {
        try {
          const docSnap = await firestoreDb.collection("shared_photos").doc(photoId).get();
          if (docSnap && docSnap.exists) {
            const data = docSnap.data();
            if (data && data.base64) {
              const buffer = Buffer.from(data.base64, "base64");
              try {
                import_fs.default.writeFileSync(diskPath, buffer);
              } catch (e) {
              }
              if (isThumb) {
                try {
                  const thumbBuf = await (0, import_sharp.default)(buffer).resize({ width: 360, height: 360, fit: "cover", position: "center" }).jpeg({ quality: 72 }).toBuffer();
                  try {
                    import_fs.default.writeFileSync(thumbDiskPath, thumbBuf);
                  } catch (e) {
                  }
                  res.setHeader("Content-Type", "image/jpeg");
                  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
                  return res.send(thumbBuf);
                } catch (e) {
                }
              }
              res.setHeader("Content-Type", data.mimeType || "image/jpeg");
              res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
              return res.send(buffer);
            }
          }
        } catch (fErr) {
        }
      }
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "no-cache");
      return res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <g transform="translate(180, 115)" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
          <circle cx="12" cy="13" r="3"/>
        </g>
        <text x="50%" y="175" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600">Foto</text>
      </svg>`);
    } catch (err) {
      return res.status(500).json({ error: err?.message });
    }
  });
  app2.post("/api/photos/:photoId", async (req, res) => {
    try {
      const rawId = req.params.photoId;
      const photoId = rawId.replace(/[^a-zA-Z0-9_-]/g, "_");
      const { base64, mimeType } = req.body || {};
      if (!base64) {
        return res.status(400).json({ error: "base64 required" });
      }
      const match = base64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      const rawBase64 = match ? match[2] : base64;
      const ext = match ? match[1] === "jpeg" ? "jpg" : match[1] : "jpg";
      const buffer = Buffer.from(rawBase64, "base64");
      const diskPath = import_path.default.join(PHOTOS_STORAGE_DIR, `${photoId}.jpg`);
      const uploadPath = import_path.default.join(UPLOADS_DIR, `${photoId}.jpg`);
      const thumbDiskPath = import_path.default.join(PHOTOS_STORAGE_DIR, `${photoId}_thumb.jpg`);
      try {
        const optBuffer = await (0, import_sharp.default)(buffer).resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
        import_fs.default.writeFileSync(diskPath, optBuffer);
        import_fs.default.writeFileSync(uploadPath, optBuffer);
        const thumbBuffer = await (0, import_sharp.default)(buffer).resize({ width: 360, height: 360, fit: "cover", position: "center" }).jpeg({ quality: 72 }).toBuffer();
        import_fs.default.writeFileSync(thumbDiskPath, thumbBuffer);
      } catch (sErr) {
        import_fs.default.writeFileSync(diskPath, buffer);
        import_fs.default.writeFileSync(uploadPath, buffer);
      }
      if (firestoreDb) {
        firestoreDb.collection("shared_photos").doc(photoId).set({
          base64: rawBase64,
          mimeType: mimeType || `image/${ext}`,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }).catch(() => {
        });
      }
      return res.json({ success: true, url: `/api/photos/${photoId}` });
    } catch (err) {
      return res.status(500).json({ error: err?.message });
    }
  });
  app2.get("/uploads/:filename", async (req, res) => {
    const filename = req.params.filename;
    const filePath = import_path.default.join(UPLOADS_DIR, filename);
    if (import_fs.default.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    const storagePath = import_path.default.join(PHOTOS_STORAGE_DIR, filename);
    if (import_fs.default.existsSync(storagePath)) {
      return res.sendFile(storagePath);
    }
    const match = filename.match(/trip_photo_(\d+)_/);
    if (match) {
      const pId = `photo_${match[1]}`;
      const directDisk = import_path.default.join(PHOTOS_STORAGE_DIR, `${pId}.jpg`);
      if (import_fs.default.existsSync(directDisk)) {
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.sendFile(directDisk);
      }
      if (firestoreDb) {
        try {
          const docSnap = await firestoreDb.collection("shared_photos").doc(pId).get();
          if (docSnap && docSnap.exists) {
            const data = docSnap.data();
            if (data && data.base64) {
              const buffer = Buffer.from(data.base64, "base64");
              try {
                import_fs.default.writeFileSync(directDisk, buffer);
              } catch (e) {
              }
              res.setHeader("Content-Type", data.mimeType || "image/jpeg");
              res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
              return res.send(buffer);
            }
          }
        } catch (e) {
        }
      }
    }
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "no-cache");
    return res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect width="100%" height="100%" fill="#f8fafc"/>
      <g transform="translate(180, 115)" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
        <circle cx="12" cy="13" r="3"/>
      </g>
      <text x="50%" y="175" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600">Foto del diario</text>
    </svg>`);
  });
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
    const adminTargets = Array.from(
      /* @__PURE__ */ new Set([
        "sambucci.simone@gmail.com",
        "viacamperapp@gmail.com",
        ...process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL.toLowerCase().trim()] : []
      ])
    );
    console.log(`[Email Service] Preparing to send email to [${adminTargets.join(", ")}]: "${subject}"`);
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        let anySuccess = false;
        for (const recipient of adminTargets) {
          try {
            const res = await resend.emails.send({
              from: "ViaCamperApp <onboarding@resend.dev>",
              to: recipient,
              subject,
              html: htmlContent
            });
            if (res?.error) {
              console.log(`[Email Service] Resend notice for ${recipient}: ${res.error.message || "validation notice"}`);
            } else {
              anySuccess = true;
              console.log(`[Email Service] Email sent successfully via Resend to ${recipient}:`, res.data);
            }
          } catch (itemErr) {
            console.warn(`[Email Service] Could not send to ${recipient}:`, itemErr?.message || itemErr);
          }
        }
        return { success: anySuccess };
      } catch (err) {
        console.error(`[Email Service] Failed to send email via Resend:`, err?.message || err);
        return { success: false, error: err };
      }
    } else {
      console.warn(`[Email Service] RESEND_API_KEY non definita. Impossibile inviare email a [${adminTargets.join(", ")}] per: "${subject}".`);
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
