const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

counterSchema.statics.getNextSequence = async function(name) {
  try {
    console.log(`[Counter] Getting next sequence for: ${name}`);
    
    const result = await this.findOneAndUpdate(
      { _id: name },
      { 
        $inc: { seq: 1 },
        $set: { lastUpdated: new Date() }
      },
      { 
        new: true, 
        upsert: true,
        setDefaultsOnInsert: true
      }
    );
    
    console.log(`[Counter] Sequence updated: ${name} = ${result.seq}`);
    return result.seq;
  } catch (error) {
    console.error(`[Counter] Error updating sequence for ${name}:`, error);
    throw error;
  }
};

// Initialize counter if it doesn't exist
counterSchema.statics.initializeCounter = async function(name, initialValue = 0) {
  try {
    const counter = await this.findById(name);
    if (!counter) {
      console.log(`[Counter] Initializing counter ${name} with value ${initialValue}`);
      await this.create({ _id: name, seq: initialValue });
    }
  } catch (error) {
    console.error(`[Counter] Error initializing counter ${name}:`, error);
    throw error;
  }
};

module.exports = mongoose.model('Counter', counterSchema);
