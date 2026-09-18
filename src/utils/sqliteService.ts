/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Place } from '../types';

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

      // Check count
      const countRes = await this.db.query(`SELECT COUNT(*) as cnt FROM soste;`);
      const count = countRes.values?.[0]?.cnt || 0;
      console.log(`[SQLite] Current records in SQLite soste table: ${count}`);

      if (count === 0) {
        let placesToSeed = initialPlaces;
        try {
          console.log("[SQLite] Fetching full soste_catalog.json for initial local seeding...");
          const res = await fetch('/soste_catalog.json');
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              placesToSeed = data;
              console.log(`[SQLite] Loaded ${data.length} places from soste_catalog.json for SQLite seeding.`);
            }
          }
        } catch (e) {
          console.warn("[SQLite] Could not fetch soste_catalog.json, falling back to initialPlaces:", e);
        }

        if (placesToSeed.length > 0) {
          console.log(`[SQLite] Seeding ${placesToSeed.length} places into SQLite...`);
          await this.seedPlaces(placesToSeed);
        }
      }

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.error("[SQLite] Initialization error:", err);
      return false;
    }
  }

  public async seedPlaces(places: Place[]): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.execute('BEGIN TRANSACTION;');
      // Batch insert in chunks of 500
      const chunkSize = 500;
      for (let i = 0; i < places.length; i += chunkSize) {
        const chunk = places.slice(i, i + chunkSize);
        let statements = [];
        for (const p of chunk) {
          const lat = (p as any).lat || (p as any).latitude || 0;
          const lng = (p as any).lng || (p as any).longitude || 0;
          const rawJson = JSON.stringify(p).replace(/'/g, "''");
          const name = (p.name || (p as any).titolo || "").replace(/'/g, "''");
          const category = (p.category || (p as any).tipo || "").replace(/'/g, "''");
          const address = (p.address || "").replace(/'/g, "''");
          const rating = p.rating || (p as any).voto || 0;

          statements.push(`
            INSERT OR REPLACE INTO soste (id, name, category, lat, lng, address, rating, raw_json)
            VALUES ('${p.id}', '${name}', '${category}', ${lat}, ${lng}, '${address}', ${rating}, '${rawJson}');
          `);
        }
        await this.db.execute(statements.join('\n'));
      }
      await this.db.execute('COMMIT;');
      console.log("[SQLite] Seeding completed successfully.");
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
