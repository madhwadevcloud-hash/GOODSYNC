const mongoose = require('mongoose');
const DatabaseManager = require('./databaseManager');

/**
 * Model Factory for Multi-Tenant Architecture
 * Creates models for specific school databases
 */
class ModelFactory {
  
  /**
   * Get User model for a specific school
   */
  static async getUserModel(schoolCode) {
    const connection = await DatabaseManager.getSchoolConnection(schoolCode);
    const userSchema = require('../models/User').schema;
    return connection.model('User', userSchema);
  }
  
  /**
   * Get Class model for a specific school
   */
  static async getClassModel(schoolCode) {
    const connection = await DatabaseManager.getSchoolConnection(schoolCode);
    const classSchema = require('../models/Class').schema;
    return connection.model('Class', classSchema);
  }
  
  /**
   * Get Subject model for a specific school
   */
  static async getSubjectModel(schoolCode) {
    const connection = await DatabaseManager.getSchoolConnection(schoolCode);
    const subjectSchema = require('../models/Subject').schema;
    return connection.model('Subject', subjectSchema);
  }
  
  /**
   * Get Attendance model for a specific school
   */
  static async getAttendanceModel(schoolCode) {
    const connection = await DatabaseManager.getSchoolConnection(schoolCode);
    const attendanceSchema = require('../models/Attendance').schema;
    return connection.model('Attendance', attendanceSchema);
  }
  
  /**
   * Get Assignment model for a specific school
   */
  static async getAssignmentModel(schoolCode) {
    const connection = await DatabaseManager.getSchoolConnection(schoolCode);
    const assignmentSchema = require('../models/Assignment').schema;
    return connection.model('Assignment', assignmentSchema);
  }
  
  /**
   * Get Result model for a specific school
   */
  static async getResultModel(schoolCode) {
    const connection = await DatabaseManager.getSchoolConnection(schoolCode);
    const resultSchema = require('../models/Result').schema;
    return connection.model('Result', resultSchema);
  }
  
  /**
   * Get Timetable model for a specific school
   */
  static async getTimetableModel(schoolCode) {
    const connection = await DatabaseManager.getSchoolConnection(schoolCode);
    const timetableSchema = require('../models/Timetable').schema;
    return connection.model('Timetable', timetableSchema);
  }
  
  /**
   * Get Admission model for a specific school
   */
  static async getAdmissionModel(schoolCode) {
    const connection = await DatabaseManager.getSchoolConnection(schoolCode);
    const admissionSchema = require('../models/Admission').schema;
    return connection.model('Admission', admissionSchema);
  }
  
  /**
   * Get Message model for a specific school
   */
  static async getMessageModel(schoolCode) {
    const connection = await DatabaseManager.getSchoolConnection(schoolCode);
    const messageSchema = require('../models/Message').schema;
    return connection.model('Message', messageSchema);
  }
  
  /**
   * Get all models for a school
   */
  static async getAllModels(schoolCode) {
    return {
      User: await this.getUserModel(schoolCode),
      Class: await this.getClassModel(schoolCode),
      Subject: await this.getSubjectModel(schoolCode),
      Attendance: await this.getAttendanceModel(schoolCode),
      Assignment: await this.getAssignmentModel(schoolCode),
      Result: await this.getResultModel(schoolCode),
      Timetable: await this.getTimetableModel(schoolCode),
      Admission: await this.getAdmissionModel(schoolCode),
      Message: await this.getMessageModel(schoolCode)
    };
  }
  
  /**
   * Create a custom model for a school
   */
  static async createModel(schoolCode, modelName, schema) {
    const connection = await DatabaseManager.getSchoolConnection(schoolCode);
    return connection.model(modelName, schema);
  }
  
  /**
   * Check if a model exists for a school
   */
  static async modelExists(schoolCode, modelName) {
    try {
      const connection = await DatabaseManager.getSchoolConnection(schoolCode);
      return connection.models[modelName] !== undefined;
    } catch (error) {
      return false;
    }
  }
}

module.exports = ModelFactory;
