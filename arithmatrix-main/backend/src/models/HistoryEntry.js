import mongoose from 'mongoose';

const historySchema = new mongoose.Schema(
  {
    expression: {
      type: String,
      required: true,
      trim: true
    },
    result: {
      type: String,
      required: true,
      trim: true
    },
    source: {
      type: String,
      enum: ['BASIC', 'VOICE', 'CAMERA', 'CURRENCY'],
      default: 'BASIC'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

historySchema.index({ source: 1, timestamp: -1 });

export const HistoryEntry = mongoose.model('HistoryEntry', historySchema);
