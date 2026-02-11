const mongoose = require('mongoose');

/**
 * Database optimization utilities for multi-user support
 */
class DatabaseOptimization {
  
  /**
   * Configure connection pool for high concurrent users
   */
  static configureConnectionPool() {
    const options = {
      maxPoolSize: 100, // Maximum number of connections
      minPoolSize: 10,  // Minimum number of connections
      maxIdleTimeMS: 300000, // Close connections after 5 minutes of inactivity
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      useNewUrlParser: true,
      useUnifiedTopology: true
    };
    
    return options;
  }
  
  /**
   * Create school-specific indexes for performance
   */
  static async createSchoolIndexes(schoolCode) {
    const db = mongoose.connection.db;
    
    try {
      // Users collection indexes
      const usersCollection = `${schoolCode}_users`;
      if (await this.collectionExists(usersCollection)) {
        await db.collection(usersCollection).createIndex({ "email": 1 }, { unique: true });
        await db.collection(usersCollection).createIndex({ "role": 1, "isActive": 1 });
        await db.collection(usersCollection).createIndex({ "studentDetails.academic.currentClass": 1, "studentDetails.academic.currentSection": 1 });
        await db.collection(usersCollection).createIndex({ "teacherDetails.subjects.subjectCode": 1 });
        await db.collection(usersCollection).createIndex({ "schoolCode": 1, "schoolAccess.status": 1 });
        await db.collection(usersCollection).createIndex({ "lastLogin": 1 });
        await db.collection(usersCollection).createIndex({ "activeSessions.isActive": 1 });
        await db.collection(usersCollection).createIndex({ "identity.aadharNumber": 1 }, { unique: true, sparse: true });
        await db.collection(usersCollection).createIndex({ "identity.panNumber": 1 }, { unique: true, sparse: true });
      }
      
      // Attendance collection indexes
      const attendanceCollection = `${schoolCode}_attendance`;
      if (await this.collectionExists(attendanceCollection)) {
        await db.collection(attendanceCollection).createIndex({ "date": 1, "class": 1, "section": 1 });
        await db.collection(attendanceCollection).createIndex({ "studentId": 1, "date": 1 });
        await db.collection(attendanceCollection).createIndex({ "monthYear": 1 });
        await db.collection(attendanceCollection).createIndex({ "timeTracking.periods.teacherId": 1, "date": 1 });
        await db.collection(attendanceCollection).createIndex({ "weekStartDate": 1 });
        await db.collection(attendanceCollection).createIndex({ "attendanceId": 1 }, { unique: true });
      }
      
      // Timetable collection indexes
      const timetableCollection = `${schoolCode}_timetables`;
      if (await this.collectionExists(timetableCollection)) {
        await db.collection(timetableCollection).createIndex({ "class": 1, "section": 1, "status": 1 });
        await db.collection(timetableCollection).createIndex({ "weeklySchedule.periods.teacherId": 1 });
        await db.collection(timetableCollection).createIndex({ "effectiveFrom": 1, "effectiveTo": 1 });
        await db.collection(timetableCollection).createIndex({ "timetableId": 1 }, { unique: true });
        await db.collection(timetableCollection).createIndex({ "classSection": 1, "status": 1 });
      }
      
      console.log(`✅ Indexes created for school: ${schoolCode}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error creating indexes for school ${schoolCode}:`, error);
      return false;
    }
  }
  
  /**
   * Check if collection exists
   */
  static async collectionExists(collectionName) {
    const db = mongoose.connection.db;
    const collections = await db.listCollections({ name: collectionName }).toArray();
    return collections.length > 0;
  }
  
  /**
   * Create school-specific database and collections when a new school is registered
   */
  static async createSchoolCollections(schoolCode) {
    const mongoose = require('mongoose');
    const { MongoClient } = require('mongodb');
    
    // Get connection details from mongoose
    const connectionString = mongoose.connection.db.s.client.s.url;
    
    try {
      // Create a new database for the school
      const schoolDbName = `${schoolCode.toLowerCase()}_school`;
      const client = new MongoClient(connectionString);
      await client.connect();
      
      const schoolDb = client.db(schoolDbName);
      
      // Collections to create for each school database
      const collections = [
        'users', 'classes', 'subjects', 'timetables',
        'attendances', 'assignments', 'submissions',
        'exams', 'results', 'messages', 'notifications',
        'admissions', 'fees', 'library', 'transport',
        'events', 'announcements', 'audit_logs', 'sessions',
        'id_sequences'
      ];
      
      console.log(`Creating database: ${schoolDbName}`);
      
      for (const collectionName of collections) {
        // Create collection with a document to ensure it's created
        await schoolDb.collection(collectionName).insertOne({
          _id: 'init',
          createdAt: new Date(),
          description: `Initial document for ${collectionName} collection`
        });
        
        // Remove the init document
        await schoolDb.collection(collectionName).deleteOne({ _id: 'init' });
        
        console.log(`✅ Created collection: ${schoolDbName}.${collectionName}`);
      }
      
      // Create indexes for the school collections
      await this.createSchoolIndexesInDb(schoolDb, schoolCode);
      
      // Initialize ID sequences for the school
      await schoolDb.collection('id_sequences').insertOne({ 
        _id: 'sequences', 
        admin: 0,
        teacher: 0,
        student: 0,
        parent: 0,
        class: 0,
        subject: 0,
        assignment: 0,
        exam: 0,
        fee: 0,
        attendance: 0,
        timetable: 0,
        updated: new Date()
      });
      
      await client.close();
      
      console.log(`🎉 Successfully created database and collections for school: ${schoolCode}`);
      return { success: true, database: schoolDbName, collections: collections.length };
      
    } catch (error) {
      console.error(`❌ Error creating database for school ${schoolCode}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create indexes for school collections in a specific database
   */
  static async createSchoolIndexesInDb(db, schoolCode) {
    try {
      // Users collection indexes
      await db.collection('users').createIndex({ "email": 1 }, { unique: true });
      await db.collection('users').createIndex({ "role": 1, "isActive": 1 });
      await db.collection('users').createIndex({ "studentDetails.academic.currentClass": 1, "studentDetails.academic.currentSection": 1 });
      await db.collection('users').createIndex({ "teacherDetails.subjects.subjectCode": 1 });
      await db.collection('users').createIndex({ "schoolCode": 1, "schoolAccess.status": 1 });
      await db.collection('users').createIndex({ "lastLogin": 1 });
      await db.collection('users').createIndex({ "userId": 1 }, { unique: true });

      // Attendance collection indexes
      await db.collection('attendances').createIndex({ "date": 1, "class": 1, "section": 1 });
      await db.collection('attendances').createIndex({ "studentId": 1, "date": 1 });
      await db.collection('attendances').createIndex({ "monthYear": 1 });
      await db.collection('attendances').createIndex({ "attendanceId": 1 }, { unique: true });

      // Timetable collection indexes
      await db.collection('timetables').createIndex({ "class": 1, "section": 1, "status": 1 });
      await db.collection('timetables').createIndex({ "weeklySchedule.periods.teacherId": 1 });
      await db.collection('timetables').createIndex({ "timetableId": 1 }, { unique: true });

      // Classes collection indexes
      await db.collection('classes').createIndex({ "classCode": 1 }, { unique: true });
      await db.collection('classes').createIndex({ "grade": 1, "section": 1 });
      await db.collection('classes').createIndex({ "academicYear": 1, "isActive": 1 });

      // Subjects collection indexes
      await db.collection('subjects').createIndex({ "subjectCode": 1 }, { unique: true });
      await db.collection('subjects').createIndex({ "grade": 1, "isActive": 1 });

      // Assignments collection indexes
      await db.collection('assignments').createIndex({ "assignmentId": 1 }, { unique: true });
      await db.collection('assignments').createIndex({ "class": 1, "section": 1, "subject": 1 });
      await db.collection('assignments').createIndex({ "dueDate": 1, "status": 1 });

      // Results collection indexes
      await db.collection('results').createIndex({ "studentId": 1, "examId": 1 });
      await db.collection('results').createIndex({ "class": 1, "section": 1, "academicYear": 1 });

      // Admissions collection indexes
      await db.collection('admissions').createIndex({ "applicationNumber": 1 }, { unique: true });
      await db.collection('admissions').createIndex({ "status": 1, "admissionDate": 1 });

      console.log(`✅ Indexes created for school database: ${schoolCode}`);
      return true;
    } catch (error) {
      console.error('Error creating indexes:', error);
      return false;
    }
  }
  
  /**
   * Get a MongoDB client connection to a specific school database
   * @param {string} schoolCode - The school code to connect to
   * @returns {Object} - MongoDB client and database connection
   */
  static async getSchoolDbConnection(schoolCode) {
    const mongoose = require('mongoose');
    const { MongoClient } = require('mongodb');
    
    if (!schoolCode) {
      throw new Error('School code is required to connect to school database');
    }
    
    // Get connection details from mongoose
    const connectionString = mongoose.connection.db.s.client.s.url;
    
    try {
      // Create a new database for the school
      const schoolDbName = `${schoolCode.toLowerCase()}_school`;
      const client = new MongoClient(connectionString);
      await client.connect();
      
      const schoolDb = client.db(schoolDbName);
      
      return { client, db: schoolDb };
    } catch (error) {
      console.error(`Error connecting to school database ${schoolCode}:`, error);
      throw error;
    }
  }
  
  /**
   * Execute operations on a school database and properly close the connection
   * @param {string} schoolCode - School code to identify the database
   * @param {Function} operations - Async function with database operations to perform
   * @returns {Promise<any>} - Result of the operations
   */
  static async withSchoolDb(schoolCode, operations) {
    let client, db;
    
    try {
      // Get connection to school database
      const connection = await this.getSchoolDbConnection(schoolCode);
      client = connection.client;
      db = connection.db;
      
      // Execute the operations
      const result = await operations(db);
      
      return result;
    } catch (error) {
      console.error(`Error during school database operations for ${schoolCode}:`, error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  }
  
  /**
   * Create school-specific indexes for performance
   */
  static async createSchoolIndexes(schoolCode) {
    const db = mongoose.connection.db;
    
    try {
      // Users collection indexes
      const usersCollection = `${schoolCode}_users`;
      if (await this.collectionExists(usersCollection)) {
        await db.collection(usersCollection).createIndex({ "email": 1 }, { unique: true });
        await db.collection(usersCollection).createIndex({ "role": 1, "isActive": 1 });
        await db.collection(usersCollection).createIndex({ "studentDetails.academic.currentClass": 1, "studentDetails.academic.currentSection": 1 });
        await db.collection(usersCollection).createIndex({ "teacherDetails.subjects.subjectCode": 1 });
        await db.collection(usersCollection).createIndex({ "schoolCode": 1, "schoolAccess.status": 1 });
        await db.collection(usersCollection).createIndex({ "lastLogin": 1 });
        await db.collection(usersCollection).createIndex({ "activeSessions.isActive": 1 });
        await db.collection(usersCollection).createIndex({ "identity.aadharNumber": 1 }, { unique: true, sparse: true });
        await db.collection(usersCollection).createIndex({ "identity.panNumber": 1 }, { unique: true, sparse: true });
      }
      
      // Additional index creation for other collections can go here
      
      return true;
    } catch (error) {
      console.error(`❌ Error creating indexes for school ${schoolCode}:`, error);
      return false;
    }
  }
  
  /**
   * Generate next sequence number for user IDs
   */
  static async getNextSequence(schoolCode, role) {
    const db = mongoose.connection.db;
    const sequenceCollection = 'id_sequences';
    
    const key = `${schoolCode}_${role}`;
    
    // Try to find and increment existing sequence
    const result = await db.collection(sequenceCollection).findOneAndUpdate(
      { _id: key },
      { $inc: { sequence: 1 } },
      { returnDocument: 'after' }
    );

    if (result && result.value) {
      return result.value.sequence;
    }

    // If no existing sequence, create one starting at 1
    try {
      await db.collection(sequenceCollection).insertOne({
        _id: key,
        sequence: 1
      });
      return 1;
    } catch (error) {
      // If insert fails due to race condition, try to find again
      const existingDoc = await db.collection(sequenceCollection).findOne({ _id: key });
      if (existingDoc) {
        // Increment the existing sequence
        const retryResult = await db.collection(sequenceCollection).findOneAndUpdate(
          { _id: key },
          { $inc: { sequence: 1 } },
          { returnDocument: 'after' }
        );
        return retryResult.value.sequence;
      }
      throw error;
    }
  }
  
  /**
   * Generate user ID based on school code and role
   */
  static async generateUserId(schoolCode, role) {
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
    const padding = 3;
    return `${schoolCode}_${prefix}${String(sequence).padStart(padding, '0')}`;
  }
  
  /**
   * Session management utilities
   */
  static async cleanupInactiveSessions() {
    const db = mongoose.connection.db;
    const inactivityThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    
    try {
      // Get all user collections
      const collections = await db.listCollections().toArray();
      const userCollections = collections
        .filter(col => col.name.endsWith('_users'))
        .map(col => col.name);
      
      let totalCleaned = 0;
      
      for (const collection of userCollections) {
        const result = await db.collection(collection).updateMany(
          {},
          {
            $pull: {
              activeSessions: {
                $or: [
                  { lastActivity: { $lt: inactivityThreshold } },
                  { isActive: false }
                ]
              }
            }
          }
        );
        
        totalCleaned += result.modifiedCount;
      }
      
      console.log(`✅ Cleaned up ${totalCleaned} inactive sessions`);
      return totalCleaned;
      
    } catch (error) {
      console.error('❌ Error cleaning up sessions:', error);
      return 0;
    }
  }
  
  /**
   * Performance monitoring utilities
   */
  static async getSlowQueries(threshold = 100) {
    const db = mongoose.connection.db;
    
    try {
      // Enable profiling if not already enabled
      await db.command({ profile: 2, slowms: threshold });
      
      // Get slow queries from system.profile collection
      const slowQueries = await db.collection('system.profile')
        .find({ ts: { $gte: new Date(Date.now() - 60 * 60 * 1000) } }) // Last hour
        .sort({ ts: -1 })
        .limit(50)
        .toArray();
      
      return slowQueries;
      
    } catch (error) {
      console.error('❌ Error getting slow queries:', error);
      return [];
    }
  }
  
  /**
   * Database health check
   */
  static async healthCheck() {
    const db = mongoose.connection.db;
    
    try {
      const stats = await db.stats();
      const status = await db.command({ serverStatus: 1 });
      
      return {
        connected: mongoose.connection.readyState === 1,
        databaseSize: stats.dataSize,
        collections: stats.collections,
        indexes: stats.indexes,
        connections: status.connections,
        uptime: status.uptime,
        memory: status.mem
      };
      
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return { connected: false, error: error.message };
    }
  }
  
  /**
   * Backup utilities for school data
   */
  static async backupSchoolData(schoolCode) {
    const db = mongoose.connection.db;
    
    try {
      const collections = await db.listCollections().toArray();
      const schoolCollections = collections
        .filter(col => col.name.startsWith(`${schoolCode}_`))
        .map(col => col.name);
      
      const backup = {};
      
      for (const collection of schoolCollections) {
        backup[collection] = await db.collection(collection).find({}).toArray();
      }
      
      return {
        schoolCode,
        timestamp: new Date(),
        collections: schoolCollections.length,
        data: backup
      };
      
    } catch (error) {
      console.error(`❌ Error backing up data for school ${schoolCode}:`, error);
      throw error;
    }
  }
}

module.exports = DatabaseOptimization;
