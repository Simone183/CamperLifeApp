import { initializeApp, FirebaseApp } from "firebase/app";
import {
  initializeFirestore,
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
  limit
} from "firebase/firestore/lite";
import { getStorage } from "firebase/storage";

export class ClientFirestoreAdapter {
  private db: any;
  public app: FirebaseApp;

  constructor(firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
    storageBucket?: string;
  }, databaseId: string) {
    const appName = "client-" + Date.now();
    this.app = initializeApp(firebaseConfig, appName);
    this.db = initializeFirestore(this.app, { experimentalForceLongPolling: true, preferRest: true } as any, databaseId);
  }

  getStorage() {
    return getStorage(this.app);
  }

  collection(collectionPath: string) {
    return new CollectionQueryWrapper(this.db, collectionPath);
  }
}

class CollectionQueryWrapper {
  private db: any;
  private path: string;
  private constraints: any[] = [];

  constructor(db: any, path: string, constraints: any[] = []) {
    this.db = db;
    this.path = path;
    this.constraints = constraints;
  }

  doc(docId: string) {
    return new DocumentWrapper(this.db, this.path, docId);
  }

  where(field: string, op: string, val: any) {
    const newConstraints = [...this.constraints, where(field, op as any, val)];
    return new CollectionQueryWrapper(this.db, this.path, newConstraints);
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    const newConstraints = [...this.constraints, orderBy(field, direction)];
    return new CollectionQueryWrapper(this.db, this.path, newConstraints);
  }

  limit(n: number) {
    const newConstraints = [...this.constraints, limit(n)];
    return new CollectionQueryWrapper(this.db, this.path, newConstraints);
  }

  async get() {
    const colRef = collection(this.db, this.path);
    const q = query(colRef, ...this.constraints);
    const snap = await getDocs(q);
    return new QuerySnapshotWrapper(snap);
  }

  async add(data: any) {
    const colRef = collection(this.db, this.path);
    const docRef = await addDoc(colRef, data);
    return { id: docRef.id };
  }
}

class DocumentWrapper {
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
    return new DocumentSnapshotWrapper(snap);
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

class QuerySnapshotWrapper {
  private snap: any;

  constructor(snap: any) {
    this.snap = snap;
  }

  get size() {
    return this.snap.size;
  }

  get empty() {
    return this.snap.empty;
  }

  get docs() {
    return this.snap.docs.map((d: any) => new DocumentSnapshotWrapper(d));
  }

  forEach(callback: (doc: DocumentSnapshotWrapper) => void) {
    this.snap.forEach((d: any) => {
      callback(new DocumentSnapshotWrapper(d));
    });
  }
}

export class DocumentSnapshotWrapper {
  private docSnap: any;

  constructor(docSnap: any) {
    this.docSnap = docSnap;
  }

  get id() {
    return this.docSnap.id;
  }

  get exists() {
    return this.docSnap.exists();
  }

  data() {
    return this.docSnap.data();
  }
}
