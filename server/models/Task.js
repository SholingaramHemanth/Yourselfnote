const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    details: { type: String, default: '', maxlength: 2000 },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date, default: null },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, completed: 1, dueDate: 1 });
taskSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
