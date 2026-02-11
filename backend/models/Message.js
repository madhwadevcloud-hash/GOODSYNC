const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  class: { type: String, required: true },
  section: { type: String, required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  academicYear: { type: String }, // Academic year when message was created (optional for backward compatibility)
  createdAt: { type: Date, default: Date.now }
});

// Virtual for read percentage
messageSchema.virtual('readPercentage').get(function() {
  if (this.totalRecipients === 0) return 0;
  return Math.round((this.readCount / this.totalRecipients) * 100);
});

// Virtual for message age
messageSchema.virtual('messageAge').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
});

// Virtual for urgency indicator
messageSchema.virtual('urgencyIndicator').get(function() {
  if (this.isUrgent || this.priority === 'urgent') return 'urgent';
  if (this.priority === 'high') return 'high';
  if (this.priority === 'normal') return 'normal';
  return 'low';
});

// Index for better query performance
messageSchema.index({ schoolId: 1, status: 1 });
messageSchema.index({ createdBy: 1 });
messageSchema.index({ 'recipients.user': 1 });
messageSchema.index({ sentTo: 1 });
messageSchema.index({ messageType: 1 });
messageSchema.index({ priority: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ 'target.class': 1, 'target.section': 1 });
messageSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
