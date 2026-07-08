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
    // Use environment variable for the connection string
    const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    let connectionUri;

    if (baseUri.includes('mongodb+srv://')) {
      // Atlas connection - replace database name in the connection string
      // Matches the part between / and ? (if exists) or just after /
      connectionUri = baseUri.replace(/\/([^/?]*)\?/, `/${dbName}?`);
      if (connectionUri === baseUri && !baseUri.includes(`/${dbName}`)) {
        // If no database specified in string, insert before the ? or at the end
        if (baseUri.includes('?')) {
          connectionUri = baseUri.replace('?', `/${dbName}?`);
        } else {
          connectionUri = `${baseUri}/${dbName}`;
        }
      }
    } else {
      // Local MongoDB - append database name to base URI
      const cleanBase = baseUri.endsWith('/') ? baseUri.slice(0, -1) : baseUri;
      connectionUri = `${cleanBase}/${dbName}`;
    }

    console.log(`🔗 Connecting to: ${dbName} using URI: ${connectionUri}`);
    
    const connection = mongoose.createConnection(connectionUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      bufferCommands: false
    });

    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Connection timeout for ${dbName} after 30 seconds`));
        }, 30000);

        connection.once('open', () => {
          clearTimeout(timeout);
          resolve();
        });

        connection.once('error', (error) => {
          console.error(`❌ Connection error event for ${dbName}:`, error);
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
    const userSchema = require('../models/User').schema;
    const classSchema = require('../models/Class').schema;
    const subjectSchema = require('../models/Subject').schema;

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

    const schoolIndexes = {
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
      ]
    };

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

          // Create indexes
          const indexes = schoolIndexes[collectionName];
          if (indexes) {
            const col = connection.db.collection(collectionName);
            for (const idx of indexes) {
              try {
                await col.createIndex(idx.key, { ...idx.options, background: true });
              } catch (idxError) {
                console.warn(`⚠️ Warning creating index on ${collectionName}:`, idxError.message);
              }
            }
          }
        } catch (error) {
          if (error.code !== 48) { // Collection already exists
            console.error(`❌ Error creating collection ${collectionName}:`, error.message);
          } else {
            // Collection already exists, but build indexes anyway just in case
            const indexes = schoolIndexes[collectionName];
            if (indexes) {
              try {
                const col = connection.db.collection(collectionName);
                for (const idx of indexes) {
                  try {
                    await col.createIndex(idx.key, { ...idx.options, background: true });
                  } catch (idxError) {
                    // Ignore index build errors on existing collections
                  }
                }
              } catch (idxErr) {
                console.error(`❌ Error building indexes on existing collection ${collectionName}:`, idxErr.message);
              }
            }
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

      console.log(`✅ School database ${dbName} created successfully with indexes`);
      return true;

    } catch (error) {
      console.error(`❌ Error creating school database ${dbName}:`, error);
      throw error;
    }
  }
}

module.exports = SchoolDatabaseManager;
