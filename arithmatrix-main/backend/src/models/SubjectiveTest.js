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

const subjectiveTestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 4000
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 12000
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 5,
      max: 300
    },
    totalMarks: {
      type: Number,
      default: 100,
      min: 1,
      max: 1000
    },
    startAt: {
      type: Date,
      required: true
    },
    endAt: {
      type: Date,
      required: true
    },
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 6,
      maxlength: 12
    },
    teacherName: {
      type: String,
      default: 'Teacher',
      trim: true,
      maxlength: 120
    },
    teacherEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 180
    },
    teacherPasscodeHash: {
      type: String,
      required: true,
      trim: true,
      minlength: 64,
      maxlength: 64
    },
    questionPdf: {
      type: pdfSchema,
      default: null
    },
    answerKeyPdf: {
      type: pdfSchema,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

subjectiveTestSchema.index({ joinCode: 1 }, { unique: true });
subjectiveTestSchema.index({ startAt: 1, endAt: 1 });

export const SubjectiveTest = mongoose.model('SubjectiveTest', subjectiveTestSchema);
