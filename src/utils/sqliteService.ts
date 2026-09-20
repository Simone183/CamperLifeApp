/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Place } from '../types';
import { parseSostaFirestoreDoc } from '../data/userPlacesDataset';
import { resolveApiUrl } from './resolveMediaUrl';

class LocalSQLiteDatabase {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  public async initialize(initialPlaces: Place[] = []): Promise<boolean> {
    if (this.isInitialized && this.db) return true;

    try {
      const platform = Capacitor.getPlatform();
      console.log(`[SQLite] Initializing on platform: ${platform}`);

      if (platform === 'web') {
        // Jeep-sqlite web initialization requirement
        import('jeep-sqlite');
        const jeepEl = document.createElement('jeep-sqlite');
        document.body.appendChild(jeepEl);
        await customElements.whenDefined('jeep-sqlite');
        await this.sqlite.initWebStore();
      }

      // Check if connection already exists
      const dbName = 'viacamper_soste.db';
      const isConn = (await this.sqlite.isConnection(dbName, false)).result;

      if (isConn) {
        this.db = await this.sqlite.createConnection(dbName, false, 'no-encryption', 1, false);
      } else {
        this.db = await this.sqlite.createConnection(dbName, false, 'no-encryption', 1, false);
      }

      await this.db.open();
      console.log("[SQLite] Database opened successfully.");

      // Create table
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS soste (
          id TEXT PRIMARY KEY,
          name TEXT,
          category TEXT,
          lat REAL,
          lng REAL,
          address TEXT,
          rating REAL,
          raw_json TEXT
        );
      `;
      await this.db.execute(createTableQuery);

      // Create spatial indexes on lat and lng for ultra-fast bounding box queries
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_lat ON soste (lat);`);
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_lng ON soste (lng);`);

      // Force re-seed if the data structure has changed (full 37.765+ catalog & correct categorization)
      const DB_VERSION_KEY = "viacamper_db_version_v4";
      const currentDbVersion = localStorage.getItem(DB_VERSION_KEY);
      
      // Check current records count
      let count = 0;
      try {
        const countRes = await this.db.query(`SELECT COUNT(*) as cnt FROM soste;`);
        count = countRes.values?.[0]?.cnt || 0;
      } catch {
        count = 0;
      }

      if (currentDbVersion !== "4.0.0" || count < 5000) {
        console.log(`[SQLite] DB version upgrade or low record count (${count}), forcing re-seed to 4.0.0 with full 37.765+ places...`);
        try {
          await this.db.execute(`DROP TABLE IF EXISTS soste;`);
          await this.db.execute(createTableQuery);
          await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_lat ON soste (lat);`);
          await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_lng ON soste (lng);`);
        } catch (tableErr) {
          console.warn("[SQLite] Table reset notice:", tableErr);
        }
        count = 0;
      }

      console.log(`[SQLite] Current records in SQLite soste table: ${count}`);

      if (count < 5000) {
        let placesToSeed: any[] = [];
        const catalogSources = [
          './soste_catalog.json',
          '/soste_catalog.json',
          'soste_catalog.json',
          '/api/public-places',
          resolveApiUrl('/api/public-places')
        ];

        console.log("[SQLite] Fetching full catalog for local SQLite database seeding...");
        for (const src of catalogSources) {
          try {
            const res = await fetch(src);
            if (res && res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 500) {
                placesToSeed = data;
                console.log(`[SQLite] Successfully loaded ${data.length} places from "${src}" for SQLite seeding.`);
                break;
              }
            }
          } catch (fetchErr) {
            // try next candidate
          }
        }

        if (placesToSeed.length === 0) {
          console.warn("[SQLite] Catalog fetch failed from all sources, using fallback initialPlaces:", initialPlaces.length);
          placesToSeed = initialPlaces;
        }

        if (placesToSeed.length > 0) {
          console.log(`[SQLite] Seeding ${placesToSeed.length} places into SQLite...`);
          await this.seedPlaces(placesToSeed);
          localStorage.setItem(DB_VERSION_KEY, "4.0.0");
        }
      }

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.error("[SQLite] Initialization error:", err);
      return false;
    }
  }

  private normalizeCategory(rawCat: string, rawPlace?: any): string {
    if (rawPlace && rawPlace.category && rawPlace.category !== "sosta") {
      return rawPlace.category;
    }
    const parsed = parseSostaFirestoreDoc(rawPlace || { tipo: rawCat, category: rawCat }, (rawPlace && rawPlace.id) || "temp");
    return parsed.category || "area_sosta";
  }

  public async seedPlaces(places: Place[]): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.execute('BEGIN TRANSACTION;');
      // Batch insert in chunks of 1000 for faster performance
      const chunkSize = 1000;
      for (let i = 0; i < places.length; i += chunkSize) {
        const chunk = places.slice(i, i + chunkSize);
        let statements = [];
        for (const p of chunk) {
          // Normalize and extract true category and properties using parseSostaFirestoreDoc
          const parsedPlace: Place = (!p.category || (p.category as any) === "sosta" || !p.categoryLabel)
            ? parseSostaFirestoreDoc(p, p.id)
            : (p as Place);

          const lat = parsedPlace.lat || (p as any).latitude || 0;
          const lng = parsedPlace.lng || (p as any).longitude || 0;
          const name = (parsedPlace.name || (p as any).titolo || "").replace(/'/g, "''");
          const category = (parsedPlace.category || "area_sosta").replace(/'/g, "''");
          const address = (parsedPlace.address || (p as any).indirizzo || "").replace(/'/g, "''");
          const rating = parsedPlace.rating || 0;

          // Normalize the object stored in raw_json to ensure consistent property names and true category
          const normalized = {
            ...p,
            ...parsedPlace,
            id: parsedPlace.id,
            name: parsedPlace.name,
            category: parsedPlace.category,
            categoryLabel: parsedPlace.categoryLabel,
            serviceSubtype: parsedPlace.serviceSubtype,
            rating: rating,
            lat: lat,
            lng: lng,
            address: parsedPlace.address,
            facilities: parsedPlace.facilities,
            priceInfo: parsedPlace.priceInfo,
            priceEuro: parsedPlace.priceEuro,
            imageUrl: parsedPlace.imageUrl
          };
          const rawJson = JSON.stringify(normalized).replace(/'/g, "''");

          statements.push(`
            INSERT OR REPLACE INTO soste (id, name, category, lat, lng, address, rating, raw_json)
            VALUES ('${parsedPlace.id}', '${name}', '${category}', ${lat}, ${lng}, '${address}', ${rating}, '${rawJson}');
          `);
        }
        await this.db.execute(statements.join('\n'));
      }
      await this.db.execute('COMMIT;');
      console.log("[SQLite] Seeding completed successfully with true categories.");
    } catch (e) {
      console.error("[SQLite] Seeding error, rolling back:", e);
      try { await this.db.execute('ROLLBACK;'); } catch (_) {}
    }
  }

  public async getSosteInBoundingBox(minLat: number, maxLat: number, minLng: number, maxLng: number, limit = 1500): Promise<Place[]> {
    if (!this.db || !this.isInitialized) return [];
    try {
      const query = `
        SELECT raw_json FROM soste 
        WHERE lat BETWEEN ? AND ? 
          AND lng BETWEEN ? AND ? 
        LIMIT ?;
      `;
      const res = await this.db.query(query, [minLat, maxLat, minLng, maxLng, limit]);
      if (res.values && Array.isArray(res.values)) {
        return res.values.map((row: any) => JSON.parse(row.raw_json));
      }
    } catch (e) {
      console.error("[SQLite] Bounding box query error:", e);
    }
    return [];
  }

  public async getAllSoste(limit = 45000): Promise<Place[]> {
    if (!this.db || !this.isInitialized) return [];
    try {
      const res = await this.db.query(`SELECT raw_json FROM soste LIMIT ?;`, [limit]);
      if (res.values && Array.isArray(res.values)) {
        return res.values.map((row: any) => JSON.parse(row.raw_json));
      }
    } catch (e) {
      console.error("[SQLite] Get all soste error:", e);
    }
    return [];
  }
}

export const sqliteService = new LocalSQLiteDatabase();
