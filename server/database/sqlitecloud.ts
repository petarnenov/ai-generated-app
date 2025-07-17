import { Database } from '@sqlitecloud/drivers';

export interface DatabaseConfig {
  connectionString: string;
}

export class SQLiteCloudDatabase {
  private db: Database | null = null;
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  async connect(): Promise<void> {
    try {
      this.db = new Database(this.connectionString);
      console.log('✅ Connected to SQLiteCloud database');
    } catch (error) {
      console.error('❌ Failed to connect to SQLiteCloud:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.db) {
        await this.db.close();
        this.db = null;
        console.log('✅ Disconnected from SQLiteCloud database');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from SQLiteCloud:', error);
      throw error;
    }
  }

  // Execute a query that returns multiple rows
  async all(sql: string, params: unknown[] = []): Promise<unknown[]> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    
    try {
      // SQLiteCloud expects positional parameters in the SQL string
      let result;
      if (params && params.length > 0) {
        result = await this.db.sql(sql, ...params);
      } else {
        result = await this.db.sql(sql);
      }
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      console.error('❌ Database query error (all):', sql, params, error);
      throw error;
    }
  }

  // Execute a query that returns a single row
  async get(sql: string, params: unknown[] = []): Promise<unknown | null> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    
    try {
      let result;
      if (params && params.length > 0) {
        result = await this.db.sql(sql, ...params);
      } else {
        result = await this.db.sql(sql);
      }
      return Array.isArray(result) ? result[0] || null : result;
    } catch (error) {
      console.error('❌ Database query error (get):', sql, params, error);
      throw error;
    }
  }

  // Execute a query that doesn't return data (INSERT, UPDATE, DELETE)
  async run(sql: string, params: unknown[] = []): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    
    try {
      if (params && params.length > 0) {
        await this.db.sql(sql, ...params);
      } else {
        await this.db.sql(sql);
      }
    } catch (error) {
      console.error('❌ Database query error (run):', sql, params, error);
      throw error;
    }
  }

  // Execute multiple queries in sequence
  async serialize(callback: () => Promise<void>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    
    try {
      await callback();
    } catch (error) {
      console.error('❌ Database serialize error:', error);
      throw error;
    }
  }

  // Get the raw database instance for compatibility
  getRawDatabase(): Database | null {
    return this.db;
  }
}
