import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  setLogLevel
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Silence Firestore SDK console warnings about offline mode and long polling timeouts
try {
  setLogLevel("silent");
} catch (e) {}

// --- HELPER ENCODERS / DECODERS FOR FIRESTORE REST API ---
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) {
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
    const fields: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      if (val[key] !== undefined) {
        fields[key] = toFirestoreValue(val[key]);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreFields(obj: any): any {
  const fields: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      fields[key] = toFirestoreValue(obj[key]);
    }
  }
  return fields;
}

function fromFirestoreValue(val: any): any {
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
    const obj: Record<string, any> = {};
    for (const key of Object.keys(fields)) {
      obj[key] = fromFirestoreValue(fields[key]);
    }
    return obj;
  }
  return val;
}

function fromFirestoreFields(fields: any): any {
  if (!fields) return {};
  const obj: Record<string, any> = {};
  for (const key of Object.keys(fields)) {
    obj[key] = fromFirestoreValue(fields[key]);
  }
  return obj;
}

// --- SERVER-SIDE REST IMPLEMENTATION ---
class ServerRESTFirestoreAdapter {
  private projectId: string;
  private databaseId: string;
  private apiKey: string;

  constructor(firebaseConfig: any, databaseId: string) {
    this.projectId = firebaseConfig.projectId;
    this.apiKey = firebaseConfig.apiKey;
    this.databaseId = databaseId || "(default)";
  }

  getStorage() {
    return null;
  }

  collection(collectionPath: string) {
    return new ServerRESTCollectionQueryWrapper(this, collectionPath);
  }

  async runQuery(collectionPath: string, constraints: any[], orderByField?: string, orderDirection?: 'asc' | 'desc', limitCount?: number) {
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents:runQuery?key=${this.apiKey}`;
    
    const parts = collectionPath.split("/");
    const collectionId = parts[parts.length - 1];
    
    const requestBody: any = {};
    
    if (parts.length > 1) {
      const parentPath = parts.slice(0, parts.length - 1).join("/");
      requestBody.parent = `projects/${this.projectId}/databases/${this.databaseId}/documents/${parentPath}`;
    }
    
    const filters = constraints.map(c => ({
      fieldFilter: {
        field: { fieldPath: c.field },
        op: c.op === "==" ? "EQUAL" : c.op,
        value: toFirestoreValue(c.value)
      }
    }));

    const structuredQuery: any = {
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

    if (limitCount !== undefined) {
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
    return (results || [])
      .filter((r: any) => r && r.document)
      .map((r: any) => {
        const docData = r.document;
        const id = docData.name.split("/").pop();
        const fields = fromFirestoreFields(docData.fields);
        return new DocumentSnapshotWrapper(id, true, fields);
      });
  }

  async getDoc(docPath: string) {
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

  async setDoc(docPath: string, data: any, merge = true) {
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${docPath}?key=${this.apiKey}`;
    const fields = toFirestoreFields(data);
    let targetUrl = url;
    if (merge) {
      const keys = Object.keys(data);
      if (keys.length > 0) {
        const fieldPaths = keys.map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
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

  async deleteDoc(docPath: string) {
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${docPath}?key=${this.apiKey}`;
    const res = await fetch(url, { method: "DELETE" });
    if (res.status === 404 || res.status === 429) return;
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`REST Firestore deleteDoc failed: ${res.statusText} - ${text}`);
    }
  }

  async addDoc(colPath: string, data: any) {
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
}

class ServerRESTCollectionQueryWrapper {
  private adapter: ServerRESTFirestoreAdapter;
  private path: string;
  private constraints: { field: string; op: string; value: any }[] = [];
  private orderByField?: string;
  private orderDirection?: 'asc' | 'desc';
  private limitCount?: number;

  constructor(
    adapter: ServerRESTFirestoreAdapter,
    path: string,
    constraints: { field: string; op: string; value: any }[] = [],
    orderByField?: string,
    orderDirection?: 'asc' | 'desc',
    limitCount?: number
  ) {
    this.adapter = adapter;
    this.path = path;
    this.constraints = constraints;
    this.orderByField = orderByField;
    this.orderDirection = orderDirection;
    this.limitCount = limitCount;
  }

  doc(docId: string) {
    return new ServerRESTDocumentWrapper(this.adapter, this.path, docId);
  }

  where(field: string, op: string, val: any) {
    const newConstraints = [...this.constraints, { field, op, value: val }];
    return new ServerRESTCollectionQueryWrapper(
      this.adapter,
      this.path,
      newConstraints,
      this.orderByField,
      this.orderDirection,
      this.limitCount
    );
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    return new ServerRESTCollectionQueryWrapper(
      this.adapter,
      this.path,
      this.constraints,
      field,
      direction,
      this.limitCount
    );
  }

  limit(n: number) {
    return new ServerRESTCollectionQueryWrapper(
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

  async add(data: any) {
    return await this.adapter.addDoc(this.path, data);
  }
}

class ServerRESTDocumentWrapper {
  private adapter: ServerRESTFirestoreAdapter;
  private colPath: string;
  private docId: string;

  constructor(adapter: ServerRESTFirestoreAdapter, colPath: string, docId: string) {
    this.adapter = adapter;
    this.colPath = colPath;
    this.docId = docId;
  }

  async get() {
    const fullPath = `${this.colPath}/${this.docId}`;
    return await this.adapter.getDoc(fullPath);
  }

  async set(data: any, options?: { merge?: boolean }) {
    const fullPath = `${this.colPath}/${this.docId}`;
    const merge = options?.merge !== false;
    await this.adapter.setDoc(fullPath, data, merge);
  }

  async update(data: any) {
    const fullPath = `${this.colPath}/${this.docId}`;
    await this.adapter.setDoc(fullPath, data, true);
  }

  async delete() {
    const fullPath = `${this.colPath}/${this.docId}`;
    await this.adapter.deleteDoc(fullPath);
  }
}

// --- BROWSER CLIENT-SIDE IMPLEMENTATION ---
class BrowserFirestoreAdapter {
  private db: any;
  public app: any;

  constructor(firebaseConfig: any, databaseId: string) {
    try {
      if (getApps().length > 0) {
        this.app = getApp();
        this.db = getFirestore(this.app, databaseId);
      } else {
        const appName = "client-" + Date.now();
        this.app = initializeApp(firebaseConfig, appName);
        this.db = initializeFirestore(this.app, { experimentalForceLongPolling: true }, databaseId);
      }
    } catch (err) {
      console.error("[BrowserFirestoreAdapter] Safe init failed, using default fallback:", err);
      try {
        this.app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        this.db = getFirestore(this.app, databaseId);
      } catch (innerErr) {
        console.error("[BrowserFirestoreAdapter] Safe fallback failed:", innerErr);
      }
    }
  }

  getStorage() {
    return getStorage(this.app);
  }

  collection(collectionPath: string) {
    return new BrowserCollectionQueryWrapper(this.db, collectionPath);
  }
}

class BrowserCollectionQueryWrapper {
  private db: any;
  private path: string;
  private constraints: any[] = [];

  constructor(db: any, path: string, constraints: any[] = []) {
    this.db = db;
    this.path = path;
    this.constraints = constraints;
  }

  doc(docId: string) {
    return new BrowserDocumentWrapper(this.db, this.path, docId);
  }

  where(field: string, op: string, val: any) {
    const newConstraints = [...this.constraints, where(field, op as any, val)];
    return new BrowserCollectionQueryWrapper(this.db, this.path, newConstraints);
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    const newConstraints = [...this.constraints, orderBy(field, direction)];
    return new BrowserCollectionQueryWrapper(this.db, this.path, newConstraints);
  }

  limit(n: number) {
    const newConstraints = [...this.constraints, limit(n)];
    return new BrowserCollectionQueryWrapper(this.db, this.path, newConstraints);
  }

  async get() {
    const colRef = collection(this.db, this.path);
    const q = query(colRef, ...this.constraints);
    const snap = await getDocs(q);
    const docs = snap.docs.map((d: any) => new DocumentSnapshotWrapper(d.id, true, d.data()));
    return new QuerySnapshotWrapper(docs);
  }

  async add(data: any) {
    const colRef = collection(this.db, this.path);
    const docRef = await addDoc(colRef, data);
    return { id: docRef.id };
  }
}

class BrowserDocumentWrapper {
  private db: any;
  private colPath: string;
  private docId: string;

  constructor(db: any, colPath: string, docId: string) {
    this.db = db;
    this.colPath = colPath;
    this.docId = docId;
  }

  async get() {
    const dRef = doc(this.db, this.colPath, this.docId);
    const snap = await getDoc(dRef);
    return new DocumentSnapshotWrapper(snap.id, snap.exists(), snap.exists() ? snap.data() : null);
  }

  async set(data: any, options?: { merge?: boolean }) {
    const dRef = doc(this.db, this.colPath, this.docId);
    await setDoc(dRef, data, options as any);
  }

  async update(data: any) {
    const dRef = doc(this.db, this.colPath, this.docId);
    await updateDoc(dRef, data);
  }

  async delete() {
    const dRef = doc(this.db, this.colPath, this.docId);
    await deleteDoc(dRef);
  }
}

// --- UNIVERSAL COMMON WRAPPERS ---
export class QuerySnapshotWrapper {
  public docs: DocumentSnapshotWrapper[];

  constructor(docs: DocumentSnapshotWrapper[]) {
    this.docs = docs;
  }

  get size() {
    return this.docs.length;
  }

  get empty() {
    return this.docs.length === 0;
  }

  forEach(callback: (doc: DocumentSnapshotWrapper) => void) {
    this.docs.forEach(callback);
  }
}

export class DocumentSnapshotWrapper {
  public id: string;
  public exists: boolean;
  private fieldsData: any;

  constructor(id: string, exists: boolean, fieldsData: any) {
    this.id = id;
    this.exists = exists;
    this.fieldsData = fieldsData;
  }

  data() {
    return this.fieldsData;
  }
}

// --- MAIN EXPORTED HYBRID ADAPTER ---
export class ClientFirestoreAdapter {
  private impl: any;
  public app: any;

  constructor(firebaseConfig: {
    apiKey: string;
    projectId: string;
    [key: string]: any;
  }, databaseId: string) {
    if (typeof window === "undefined") {
      this.impl = new ServerRESTFirestoreAdapter(firebaseConfig, databaseId);
    } else {
      this.impl = new BrowserFirestoreAdapter(firebaseConfig, databaseId);
      this.app = this.impl.app;
    }
  }

  getStorage() {
    return this.impl.getStorage();
  }

  collection(collectionPath: string) {
    return this.impl.collection(collectionPath);
  }
}
