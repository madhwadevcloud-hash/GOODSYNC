const mongoose = require('mongoose');

class SchoolDatabaseManager {
  static connections = new Map();
  
  // Get or create connection to a school's database
  static async getSchoolConnection(schoolCode) {
    const dbName = `school_${schoolCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    
    if (this.connections.has(dbName)) {
      const existingConnection = this.connections.get(dbName);
      if (existingConnection.readyState === 1) {
        return existingConnection;
      } else {
        // Remove stale connection
        this.connections.delete(dbName);
      }
    }
    
    // Only log new connections, not every request
    console.log(`🔗 Connecting to: ${dbName}`);
    const connectionUri = `mongodb+srv://nitopunk04o:IOilWo4osDam0vmN@erp.ua5qems.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=erp`;
    
    const connection = mongoose.createConnection(connectionUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      bufferCommands: false
    });
    
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Connection timeout for ${dbName} after 10 seconds`));
        }, 10000);

        connection.once('open', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        connection.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      this.connections.set(dbName, connection);
      console.log(`✅ Connected to school database: ${dbName}`);
      return connection;
    } catch (error) {
      console.error(`❌ Failed to connect to school database ${dbName}:`, error.message);

      // Optional fallback for local development when SRV/DNS fails
      const shouldFallback = (process.env.LOCAL_MONGO_URI || '').length > 0;
      const looksLikeSrvDnsIssue = /querySrv|ENOTFOUND|EREFUSED|SRV/i.test(String(error?.message || ''));

      if (shouldFallback && looksLikeSrvDnsIssue) {
        try {
          const baseUri = process.env.LOCAL_MONGO_URI; // e.g., mongodb://localhost:27017/institute_erp
          const idx = baseUri.lastIndexOf('/');
          const hasQuery = baseUri.includes('?');
          const prefix = idx >= 0 ? baseUri.substring(0, idx + 1) : `${baseUri.replace(/\/$/, '')}/`;
          const suffix = hasQuery ? baseUri.substring(baseUri.indexOf('?')) : '';
          const fallbackUri = `${prefix}${dbName}${suffix}`;
          console.warn(`⚠️ SRV/DNS failed; retrying with LOCAL_MONGO_URI for ${dbName}: ${fallbackUri}`);

          const fallbackConn = mongoose.createConnection(fallbackUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 8000,
            socketTimeoutMS: 45000,
            bufferCommands: false
          });

          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error(`Fallback connection timeout for ${dbName} after 8 seconds`));
            }, 8000);

            fallbackConn.once('open', () => {
              clearTimeout(timeout);
              resolve();
            });

            fallbackConn.once('error', (err) => {
              clearTimeout(timeout);
              reject(err);
            });
          });

          this.connections.set(dbName, fallbackConn);
          console.log(`✅ Connected to school database via fallback: ${dbName}`);
          return fallbackConn;
        } catch (fallbackError) {
          console.error(`❌ Fallback connection failed for ${dbName}:`, String(fallbackError?.message || fallbackError));
        }
      }

      throw new Error(`Failed to connect to school database: ${error.message}`);
    }
  }
  
  // Create models for a specific school database
  static createSchoolModels(connection) {
    // Import schemas
    const userSchema = require('./User').schema;
    const classSchema = require('./Class').schema;
    const subjectSchema = require('./Subject').schema;
    
    return {
      User: connection.model('User', userSchema),
      Class: connection.model('Class', classSchema),
      Subject: connection.model('Subject', subjectSchema),
      // Add more models as needed
    };
  }
  
  // Generate unique user ID for a school
  static async generateUserId(schoolCode, role = 'user') {
    const connection = await this.getSchoolConnection(schoolCode);
    const collection = connection.collection('id_sequences');
    
    const sequenceDoc = await collection.findOneAndUpdate(
      { _id: `${role}_sequence` },
      { $inc: { sequence_value: 1 } },
      { returnDocument: 'after' }
    );
    
    if (!sequenceDoc.value) {
      // Create new sequence if it doesn't exist
      await collection.insertOne({
        _id: `${role}_sequence`,
        sequence_value: 1001,
        schoolCode: schoolCode
      });
      return `${schoolCode.toUpperCase()}${role.toUpperCase()}1001`;
    }
    
    return `${schoolCode.toUpperCase()}${role.toUpperCase()}${sequenceDoc.value.sequence_value}`;
  }
  
  // Close a specific school database connection
  static async closeSchoolConnection(schoolCode) {
    const dbName = this.getDatabaseName(schoolCode);
    
    if (this.connections.has(dbName)) {
      const connection = this.connections.get(dbName);
      await connection.close();
      this.connections.delete(dbName);
      console.log(`🔌 Closed connection to: ${dbName}`);
      return true;
    }
    
    console.log(`🔍 No connection found for: ${dbName}`);
    return false;
  }

  // Close all school database connections
  static async closeAllConnections() {
    for (const [dbName, connection] of this.connections) {
      await connection.close();
      console.log(`🔌 Closed connection to: ${dbName}`);
    }
    this.connections.clear();
  }
  
  // Get database name for a school
  static getDatabaseName(schoolCode) {
    return `school_${schoolCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }
  
  // Check if school database exists
  static async databaseExists(schoolCode) {
    try {
      const connection = await this.getSchoolConnection(schoolCode);
      const collections = await connection.db.listCollections().toArray();
      return collections.length > 0;
    } catch (error) {
      return false;
    }
  }

  // Create school database with required collections
  static async createSchoolDatabase(schoolCode) {
    const dbName = this.getDatabaseName(schoolCode);
    
    try {
      console.log(`🏗️ Creating school database: ${dbName}`);
      
      // Get connection
      const connection = await this.getSchoolConnection(schoolCode);
      
      // Create required collections
      const collections = [
        'classes',
        'subjects', 
        'users',
        'students',
        'teachers',
        'parents',
        'testdetails',
        'attendances',
        'assignments',
        'results',
        'timetables',
        'admissions',
        'messages',
        'audit_logs',
        'id_sequences'
      ];
      
      for (const collectionName of collections) {
        try {
          await connection.db.createCollection(collectionName);
          console.log(`✅ Created collection: ${collectionName}`);
        } catch (error) {
          if (error.code !== 48) { // Collection already exists
            console.error(`❌ Error creating collection ${collectionName}:`, error.message);
          }
        }
      }
      
      // Initialize ID sequences
      const idSequences = connection.collection('id_sequences');
      await idSequences.insertOne({
        _id: 'class_sequence',
        sequence_value: 1001,
        schoolCode: schoolCode
      });
      
      console.log(`✅ School database ${dbName} created successfully`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error creating school database ${dbName}:`, error);
      throw error;
    }
  }
}

module.exports = SchoolDatabaseManager;
