const mongoose = require('mongoose');

/**
 * Database Manager for Multi-Tenant Architecture
 * Each school gets its own database with complete isolation
 */
class DatabaseManager {
  constructor() {
    this.connections = new Map();
    this.mainConnection = null;
    this.isInitialized = false;
  }
  
  /**
   * Initialize the database manager
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Main connection is the default mongoose connection
      this.mainConnection = mongoose.connection;
      this.isInitialized = true;
      console.log('✅ Database Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Database Manager:', error);
      throw error;
    }
  }

  /**
   * Ensure a given mongoose connection is ready before performing operations
   */
  async ensureConnectionReady(connection) {
    try {
      if (!connection) throw new Error('No connection provided');
      if (connection.readyState === 1) return; // connected
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(), 10000);
        connection.once('connected', () => { clearTimeout(timer); resolve(); });
        connection.once('error', (err) => { clearTimeout(timer); reject(err); });
      });
    } catch (err) {
      // Proceed; the driver typically queues ops, but we log for diagnostics
      console.warn('⚠️ Connection not fully ready, proceeding with queued operation:', err?.message || err);
    }
  }
  
  /**
   * Get main database connection (for school registry and super admin data)
   */
  getMainConnection() {
    if (!this.mainConnection) {
      this.mainConnection = mongoose.connection;
    }
    return this.mainConnection;
  }
  
  /**
   * Generate database name from school code
   */
  generateDatabaseName(schoolCode) {
    return `school_${schoolCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }
  
  /**
   * Get school database connection
   */
  async getSchoolConnection(schoolCode) {
    const databaseName = this.generateDatabaseName(schoolCode);

    if (!this.connections.has(databaseName)) {
      try {
        const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
        
        // Handle both local and Atlas connection strings properly
        let connectionUri;
        if (baseUri.includes('mongodb+srv://')) {
          // Atlas connection - replace database name in the connection string
          connectionUri = baseUri.replace(/\/[^\/]*\?/, `/${databaseName}?`);
        } else {
          // Local MongoDB - append database name to base URI
          if (baseUri.endsWith('/')) {
            connectionUri = baseUri + databaseName;
          } else {
            connectionUri = baseUri + '/' + databaseName;
          }
        }

        console.log(`🔗 Connecting to: ${databaseName}`);

        const connection = mongoose.createConnection(connectionUri, {
          maxPoolSize: 50,
          minPoolSize: 5,
          maxIdleTimeMS: 300000,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000
        });

        // Wait for connection to be ready
        await new Promise((resolve, reject) => {
          if (connection.readyState === 1) {
            resolve();
          } else {
            connection.once('connected', resolve);
            connection.once('error', reject);
            
            // Add timeout
            setTimeout(() => {
              reject(new Error(`Connection timeout for ${databaseName}`));
            }, 10000);
          }
        });

        connection.on('error', (error) => {
          console.error(`❌ Error in school database ${databaseName}:`, error);
        });

        this.connections.set(databaseName, connection);
        console.log(`✅ Connected to school database: ${databaseName}`);
      } catch (error) {
        console.error(`❌ Failed to create connection for ${databaseName}:`, error);
        throw error;
      }
    }

    const connection = this.connections.get(databaseName);
    if (!connection || connection.readyState !== 1) {
      console.error(`❌ Connection to ${databaseName} is not ready. ReadyState: ${connection?.readyState}`);
      throw new Error(`Connection to database ${databaseName} is not properly initialized.`);
    }

    return connection;
  }
  
  /**
   * Create school database with all required collections and indexes
   */
  async createSchoolDatabase(schoolCode) {
    const databaseName = this.generateDatabaseName(schoolCode);
    
    try {
      console.log(`🏗️ Creating database: ${databaseName}`);
      
      // Get connection and ensure it's ready
      const connection = this.getSchoolConnection(schoolCode);
      
      // Wait for connection to be ready
      if (connection.readyState !== 1) {
        await new Promise((resolve, reject) => {
          connection.once('connected', resolve);
          connection.once('error', reject);
          // Add timeout
          setTimeout(() => reject(new Error('Connection timeout')), 10000);
        });
      }
      
      const collections = [
        'testdetails'  // Only create testdetails collection for school databases
      ];
      
      // Create collections with initial document
      for (const collectionName of collections) {
        await this.createCollectionWithIndexes(connection, collectionName, schoolCode);
        console.log(`✅ Created collection: ${databaseName}.${collectionName}`);
      }
      
      // Initialize ID sequences
      await this.initializeIdSequences(connection, schoolCode);
      
      console.log(`🎉 Successfully created database: ${databaseName}`);
      return { success: true, database: databaseName, collections: collections.length };
      
    } catch (error) {
      console.error(`❌ Error creating database ${databaseName}:`, error);
      throw error;
    }
  }
  
  /**
   * Create collection with appropriate indexes
   */
  async createCollectionWithIndexes(connection, collectionName, schoolCode) {
    try {
      // Ensure we have a valid database connection
      if (!connection || !connection.db) {
        throw new Error('Invalid database connection');
      }
      
      const collection = connection.db.collection(collectionName);
      
      // Create collection by inserting and removing init document
      await collection.insertOne({
        _id: 'init',
        createdAt: new Date(),
        schoolCode: schoolCode,
        description: `Initial document for ${collectionName} collection`
      });
      await collection.deleteOne({ _id: 'init' });
      
      // Create indexes based on collection type
      const indexMappings = {
        admins: [
          { key: { userId: 1 }, options: { unique: true } },
          { key: { email: 1 }, options: { unique: true, sparse: true } },
          { key: { secureId: 1 }, options: { unique: true, sparse: true } },
          { key: { schoolCode: 1 }, options: {} }
        ],
        teachers: [
          { key: { userId: 1 }, options: { unique: true } },
          { key: { email: 1 }, options: { unique: true, sparse: true } },
          { key: { secureId: 1 }, options: { unique: true, sparse: true } },
          { key: { schoolCode: 1 }, options: {} }
        ],
        students: [
          { key: { userId: 1 }, options: { unique: true } },
          { key: { email: 1 }, options: { unique: true, sparse: true } },
          { key: { secureId: 1 }, options: { unique: true, sparse: true } },
          { key: { schoolCode: 1 }, options: {} },
          { key: { class: 1, section: 1, academicYear: 1 }, options: {} },
          { key: { academicYear: 1 }, options: {} },
          { key: { "studentDetails.academic.academicYear": 1 }, options: {} },
          { key: { "academicInfo.academicYear": 1 }, options: {} },
          { key: { "studentDetails.academicYear": 1 }, options: {} },
          { key: { parentId: 1 }, options: {} },
          { key: { class: 1, section: 1 }, options: {} },
          { key: { "studentDetails.currentClass": 1, "studentDetails.currentSection": 1 }, options: {} }
        ],
        parents: [
          { key: { userId: 1 }, options: { unique: true } },
          { key: { email: 1 }, options: { unique: true, sparse: true } },
          { key: { secureId: 1 }, options: { unique: true, sparse: true } },
          { key: { schoolCode: 1 }, options: {} }
        ],
        classes: [
          { key: { classId: 1 }, options: { unique: true } },
          { key: { schoolCode: 1, grade: 1, section: 1, academicYear: 1 }, options: { unique: true } },
          { key: { className: 1 }, options: {} },
          { key: { academicYear: 1 }, options: {} },
          { key: { "classTeacher.teacherId": 1 }, options: {} },
          { key: { schoolCode: 1, academicYear: 1, isActive: 1 }, options: {} },
          { key: { schoolId: 1, academicYear: 1, isActive: 1 }, options: {} }
        ],
        subjects: [
          { key: { subjectId: 1 }, options: { unique: true } },
          { key: { subjectCode: 1 }, options: {} },
          { key: { schoolCode: 1, subjectCode: 1, academicYear: 1 }, options: { unique: true } },
          { key: { "applicableGrades.grade": 1 }, options: {} }
        ],
        attendances: [
          { key: { attendanceId: 1 }, options: { unique: true } },
          { key: { studentId: 1, date: 1 }, options: { unique: true } },
          { key: { class: 1, section: 1, date: 1 }, options: {} },
          { key: { date: 1 }, options: {} },
          { key: { academicYear: 1 }, options: {} }
        ],
        results: [
          { key: { student: 1, academicYear: 1, term: 1 }, options: { unique: true } },
          { key: { studentId: 1, academicYear: 1, term: 1 }, options: { unique: true } },
          { key: { class: 1, section: 1 }, options: {} },
          { key: { className: 1, section: 1 }, options: {} },
          { key: { studentId: 1, academicYear: 1 }, options: {} }
        ],
        timetables: [
          { key: { timetableId: 1 }, options: { unique: true } },
          { key: { class: 1, section: 1, status: 1 }, options: {} },
          { key: { classSection: 1, status: 1 }, options: {} },
          { key: { schoolCode: 1, academicYear: 1 }, options: {} }
        ],
        assignments: [
          { key: { class: 1, section: 1 }, options: {} },
          { key: { teacher: 1 }, options: {} },
          { key: { subject: 1 }, options: {} },
          { key: { dueDate: 1 }, options: {} },
          { key: { academicYear: 1, term: 1 }, options: {} }
        ],
        leaverequests: [
          { key: { teacherId: 1, createdAt: -1 }, options: {} },
          { key: { schoolCode: 1, status: 1, createdAt: -1 }, options: {} }
        ],
        studentfeerecords: [
          { key: { studentId: 1 }, options: {} },
          { key: { studentClass: 1, studentSection: 1 }, options: {} },
          { key: { status: 1 }, options: {} }
        ],
        chalans: [
          { key: { chalanNumber: 1 }, options: { unique: true } },
          { key: { studentId: 1, status: 1 }, options: {} },
          { key: { schoolId: 1, academicYear: 1 }, options: {} }
        ],
        admissions: [
          { key: { admissionNumber: 1 }, options: { unique: true } },
          { key: { studentId: 1 }, options: {} },
          { key: { parentId: 1 }, options: {} },
          { key: { academicYear: 1, class: 1, section: 1 }, options: {} }
        ],
        testdetails: [
          { key: { testType: 1 }, options: {} },
          { key: { classes: 1 }, options: {} },
          { key: { createdAt: -1 }, options: {} },
          { key: { updatedAt: -1 }, options: {} },
          { key: { status: 1 }, options: {} }
        ]
      };
    
      const indexes = indexMappings[collectionName] || [{ key: { createdAt: -1 }, options: {} }];
      
      for (const index of indexes) {
        try {
          await collection.createIndex(index.key, { ...index.options, background: true });
        } catch (error) {
          // Index might already exist, continue
          console.log(`Index creation skipped for ${collectionName}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`Error creating collection ${collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Initialize ID sequences for the school
   */
  async initializeIdSequences(connection, schoolCode) {
    const sequenceCollection = connection.db.collection('id_sequences');
    
    const sequences = {
      _id: 'sequences',
      testdetails: 0,
      schoolCode: schoolCode,
      updated: new Date()
    };
    
    // Use upsert to avoid duplicate key errors
    await sequenceCollection.replaceOne(
      { _id: 'sequences' },
      sequences,
      { upsert: true }
    );
    
    console.log(`✅ Initialized sequences for school: ${schoolCode}`);
  }
  
  /**
   * Get next sequence number for a school
   */
  async getNextSequence(schoolCode, entityType) {
    const connection = await this.getSchoolConnection(schoolCode);
    await this.ensureConnectionReady(connection);
    const sequenceCollection = connection.db.collection('id_sequences');

    const baseDoc = {
      _id: 'sequences',
      schoolCode: schoolCode
    };

    let result;
    try {
      result = await sequenceCollection.findOneAndUpdate(
        { _id: 'sequences' },
        { $inc: { [entityType]: 1 }, $set: { updated: new Date() }, $setOnInsert: baseDoc },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (err) {
      console.warn(`⚠️ findOneAndUpdate failed for ${schoolCode}/${entityType}:`, err?.codeName || err?.message || err);
      await this.initializeIdSequences(connection, schoolCode);
      result = await sequenceCollection.findOneAndUpdate(
        { _id: 'sequences' },
        { $inc: { [entityType]: 1 }, $set: { updated: new Date() } },
        { upsert: false, returnDocument: 'after' }
      );
    }

    const doc = result?.value || result;
    if (!doc || typeof doc[entityType] !== 'number') {
      console.warn(`⚠️ Sequence field not numeric for ${schoolCode}/${entityType}, attempting to reset to 0 and retry.`);
      await sequenceCollection.updateOne(
        { _id: 'sequences' },
        { $set: { [entityType]: 0, updated: new Date() } },
        { upsert: true }
      );
      const retry = await sequenceCollection.findOneAndUpdate(
        { _id: 'sequences' },
        { $inc: { [entityType]: 1 }, $set: { updated: new Date() } },
        { upsert: false, returnDocument: 'after' }
      );
      const retryDoc = retry?.value || retry;
      if (!retryDoc || typeof retryDoc[entityType] !== 'number') {
        throw new Error(`Failed to access sequence for ${entityType} in school ${schoolCode}`);
      }
      return retryDoc[entityType];
    }

    return doc[entityType];
  }
  
  /**
   * Generate test ID for a school
   */
  async generateTestId(schoolCode) {
    const sequence = await this.getNextSequence(schoolCode, 'testdetails');
    return `${schoolCode}_TEST${String(sequence).padStart(3, '0')}`;
  }

  /**
   * Generate user ID for a school
   */
  async generateUserId(schoolCode, role) {
    const sequence = await this.getNextSequence(schoolCode, role);
    
    // For students, generate IDs like SCHOOLCODE0001 without prefix
    if (role === 'student') {
      return `${schoolCode}${String(sequence).padStart(4, '0')}`;
    }
    
    const rolePrefixes = {
      admin: 'ADM',
      teacher: 'TEA',
      parent: 'PAR'
    };
    
    const prefix = rolePrefixes[role] || 'USR';
    return `${schoolCode}_${prefix}${String(sequence).padStart(3, '0')}`;
  }
  
  /**
   * Close specific school connection
   */
  async closeSchoolConnection(schoolCode) {
    const databaseName = this.generateDatabaseName(schoolCode);
    const connection = this.connections.get(databaseName);
    
    if (connection) {
      await connection.close();
      this.connections.delete(databaseName);
      console.log(`✅ Closed connection for school: ${schoolCode}`);
    }
  }
  
  /**
   * Close all school connections
   */
  async closeAllConnections() {
    console.log('🔄 Closing all database connections...');
    
    for (const [databaseName, connection] of this.connections) {
      try {
        await connection.close();
        console.log(`✅ Closed connection: ${databaseName}`);
      } catch (error) {
        console.error(`❌ Error closing connection ${databaseName}:`, error);
      }
    }
    
    this.connections.clear();
    console.log('✅ All database connections closed');
  }
  
  /**
   * Check if collection exists
   */
  async collectionExists(connection, collectionName) {
    try {
      const collections = await connection.db.listCollections({ name: collectionName }).toArray();
      return collections.length > 0;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get database statistics for a school
   */
  async getSchoolDatabaseStats(schoolCode) {
    try {
      const connection = this.getSchoolConnection(schoolCode);
      const db = connection.db;
      
      const stats = await db.stats();
      const collections = await db.listCollections().toArray();
      
      return {
        schoolCode,
        databaseName: this.generateDatabaseName(schoolCode),
        collections: collections.length,
        dataSize: stats.dataSize,
        indexSize: stats.indexSize,
        totalSize: stats.dataSize + stats.indexSize,
        documents: stats.objects
      };
    } catch (error) {
      console.error(`Error getting stats for school ${schoolCode}:`, error);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new DatabaseManager();
