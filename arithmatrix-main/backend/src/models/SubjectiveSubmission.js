import mongoose from 'mongoose';

const pdfSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      default: 'application/pdf'
    },
    dataBase64: {
      type: String,
      required: true
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 1
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const mediaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    dataBase64: {
      type: String,
      required: true
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 1
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const subjectiveSubmissionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubjectiveTest',
      required: true,
      index: true
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    studentEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 180
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    deadlineAt: {
      type: Date,
      required: true
    },
    answerText: {
      type: String,
      default: '',
      trim: true,
      maxlength: 20000
    },
    answerPdf: {
      type: pdfSchema,
      default: null
    },
    proctoringVideo: {
      type: mediaSchema,
      default: null
    },
    proctoringEmailStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending'
    },
    proctoringEmailMessage: {
      type: String,
      default: '',
      trim: true,
      maxlength: 800
    },
    submittedAt: {
      type: Date,
      default: null
    },
    timeSpentMinutes: {
      type: Number,
      default: 0,
      min: 0,
      max: 10000
    },
    status: {
      type: String,
      enum: ['registered', 'submitted', 'graded'],
      default: 'registered'
    },
    marksObtained: {
      type: Number,
      default: null,
      min: 0,
      max: 1000
    },
    maxMarks: {
      type: Number,
      default: null,
      min: 1,
      max: 1000
    },
    teacherRemark: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1200
    },
    gradedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

subjectiveSubmissionSchema.index({ testId: 1, studentEmail: 1 }, { unique: true });
subjectiveSubmissionSchema.index({ testId: 1, status: 1, updatedAt: -1 });

export const SubjectiveSubmission = mongoose.model('SubjectiveSubmission', subjectiveSubmissionSchema);
