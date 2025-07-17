#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join } from 'path';
import sqlite3 from 'sqlite3';
import { SQLiteCloudDatabase } from '../server/database/sqlitecloud.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateSQLiteToCloud() {
  const sqliteCloudUrl = process.env.SQLITECLOUD_URL;
  
  if (!sqliteCloudUrl) {
    console.error('❌ SQLITECLOUD_URL environment variable is required');
    console.log('💡 Get your connection string from https://sqlitecloud.io/');
    console.log('💡 Format: sqlitecloud://user:password@host:port/database');
    process.exit(1);
  }

  const localDbPath = join(process.cwd(), 'database.sqlite');
  
  console.log('🔄 Starting migration from local SQLite to SQLiteCloud...');
  console.log(`📂 Local database: ${localDbPath}`);
  console.log(`☁️ Cloud database: ${sqliteCloudUrl.replace(/\/\/.*@/, '//***@')}`);

  try {
    // Connect to local SQLite database
    const localDb = new sqlite3.Database(localDbPath);
    
    // Connect to SQLiteCloud
    const cloudDb = new SQLiteCloudDatabase(sqliteCloudUrl);
    await cloudDb.connect();
    
    console.log('✅ Connected to both databases');

    // Get list of tables from local database
    const tables = await new Promise<string[]>((resolve, reject) => {
      localDb.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        [],
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.name));
        }
      );
    });

    console.log(`📋 Found ${tables.length} tables: ${tables.join(', ')}`);

    // Create tables in cloud database
    for (const tableName of tables) {
      console.log(`🔧 Creating table: ${tableName}`);
      
      // Get table schema
      const schema = await new Promise<string>((resolve, reject) => {
        localDb.get(
          "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
          [tableName],
          (err, row: any) => {
            if (err) reject(err);
            else resolve(row.sql);
          }
        );
      });

      // Modify schema to use IF NOT EXISTS
      const modifiedSchema = schema.replace(/CREATE TABLE/, 'CREATE TABLE IF NOT EXISTS');

      try {
        // Create table in cloud
        await cloudDb.run(modifiedSchema);
        console.log(`✅ Created/verified table: ${tableName}`);
      } catch (error) {
        console.log(`ℹ️ Table ${tableName} may already exist, continuing...`);
      }
    }

    // Check what merge requests exist in cloud database before migrating
    const cloudMergeRequests = await cloudDb.all('SELECT id FROM merge_requests');
    const cloudMrIds = new Set(cloudMergeRequests.map(mr => mr.id));
    console.log(`📋 Found ${cloudMrIds.size} merge requests in cloud database`);

    // Migrate data for each table
    for (const tableName of tables) {
      console.log(`📊 Migrating data for table: ${tableName}`);
      
      // Get data from local database
      const data = await new Promise<any[]>((resolve, reject) => {
        localDb.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      if (data.length > 0) {
        // Get column names
        const columns = Object.keys(data[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const columnNames = columns.join(', ');
        
        let migratedCount = 0;
        let skippedCount = 0;
        
        // Insert data into cloud database
        for (const row of data) {
          const values = columns.map(col => row[col]);
          
          // Check foreign key constraints for ai_reviews and review_comments
          if (tableName === 'ai_reviews' || tableName === 'review_comments') {
            if (!cloudMrIds.has(row.merge_request_id)) {
              console.log(`⚠️ Skipping ${tableName} row with missing merge_request_id: ${row.merge_request_id}`);
              skippedCount++;
              continue;
            }
          }
          
          try {
            await cloudDb.run(
              `INSERT OR REPLACE INTO ${tableName} (${columnNames}) VALUES (${placeholders})`,
              values
            );
            migratedCount++;
          } catch (error) {
            console.error(`❌ Error inserting row into ${tableName}:`, error);
            console.error('Row data:', row);
            console.error('Values:', values);
            throw error;
          }
        }
        
        console.log(`✅ Migrated ${migratedCount} rows to ${tableName}${skippedCount > 0 ? ` (skipped ${skippedCount} rows due to foreign key constraints)` : ''}`);
      } else {
        console.log(`ℹ️ No data found in ${tableName}`);
      }
    }

    // Verify migration
    console.log('🔍 Verifying migration...');
    for (const tableName of tables) {
      const localCount = await new Promise<number>((resolve, reject) => {
        localDb.get(`SELECT COUNT(*) as count FROM ${tableName}`, [], (err, row: any) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      const cloudCount = await cloudDb.get(`SELECT COUNT(*) as count FROM ${tableName}`);
      const cloudCountValue = (cloudCount as any)?.count || 0;

      if (localCount === cloudCountValue) {
        console.log(`✅ ${tableName}: ${localCount} rows (verified)`);
      } else {
        console.log(`⚠️ ${tableName}: local=${localCount}, cloud=${cloudCountValue} (mismatch)`);
      }
    }

    // Close connections
    await new Promise<void>((resolve, reject) => {
      localDb.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await cloudDb.disconnect();

    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Set SQLITECLOUD_URL in your .env file');
    console.log('2. Remove the local database.sqlite file (optional)');
    console.log('3. Restart your application');
    console.log('');
    console.log('💡 Your application will now use SQLiteCloud instead of local SQLite');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateSQLiteToCloud().catch(console.error);
}

export { migrateSQLiteToCloud };
