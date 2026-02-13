import crypto from 'crypto';
import { Router } from 'express';
import { SubjectiveSubmission } from '../models/SubjectiveSubmission.js';
import { SubjectiveTest } from '../models/SubjectiveTest.js';

const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_PROCTORING_VIDEO_BYTES = 10 * 1024 * 1024;
const JOIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function hashPasscode(passcode) {
  return crypto.createHash('sha256').update(String(passcode || '')).digest('hex');
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw badRequest(`${fieldName} must be a valid date-time.`);
  }
  return date;
}

function toNumber(value, fieldName, { min = null, max = null, integer = false } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw badRequest(`${fieldName} must be a valid number.`);
  }

  if (integer && !Number.isInteger(parsed)) {
    throw badRequest(`${fieldName} must be an integer.`);
  }

  if (min !== null && parsed < min) {
    throw badRequest(`${fieldName} must be at least ${min}.`);
  }

  if (max !== null && parsed > max) {
    throw badRequest(`${fieldName} must be at most ${max}.`);
  }

  return parsed;
}

function normalizeText(value, defaultValue = '') {
  return String(value ?? defaultValue).trim();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function ensureEmail(value) {
  return ensureEmailForField(value, 'Please provide a valid student email address.');
}

function ensureEmailForField(value, message) {
  const email = normalizeEmail(value);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    throw badRequest(message);
  }
  return email;
}

function sanitizePdfPayload(input, fieldLabel) {
  if (!input || typeof input !== 'object') {
    throw badRequest(`${fieldLabel} PDF payload is required.`);
  }

  const name = normalizeText(input.name);
  if (!name) {
    throw badRequest(`${fieldLabel} PDF file name is required.`);
  }

  const mimeType = normalizeText(input.mimeType || 'application/pdf');
  const rawData = normalizeText(input.dataBase64);
  if (!rawData) {
    throw badRequest(`${fieldLabel} PDF data is required.`);
  }

  const base64 = rawData.replace(/^data:.*?;base64,/i, '');
  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) {
    throw badRequest(`${fieldLabel} PDF contains invalid base64 data.`);
  }

  const sizeBytes = Buffer.from(base64, 'base64').length;
  if (!sizeBytes) {
    throw badRequest(`${fieldLabel} PDF appears to be empty.`);
  }

  if (sizeBytes > MAX_PDF_BYTES) {
    throw badRequest(`${fieldLabel} PDF must be <= ${Math.round(MAX_PDF_BYTES / (1024 * 1024))}MB.`);
  }

  return {
    name,
    mimeType,
    dataBase64: base64,
    sizeBytes,
    uploadedAt: new Date()
  };
}

function sanitizeMediaPayload(input, fieldLabel) {
  if (!input || typeof input !== 'object') {
    throw badRequest(`${fieldLabel} payload is required.`);
  }

  const name = normalizeText(input.name);
  if (!name) {
    throw badRequest(`${fieldLabel} file name is required.`);
  }

  const mimeType = normalizeText(input.mimeType || 'video/webm').toLowerCase();
  if (!mimeType.startsWith('video/')) {
    throw badRequest(`${fieldLabel} must be a video format.`);
  }

  const rawData = normalizeText(input.dataBase64);
  if (!rawData) {
    throw badRequest(`${fieldLabel} file data is required.`);
  }

  const base64 = rawData.replace(/^data:.*?;base64,/i, '');
  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) {
    throw badRequest(`${fieldLabel} contains invalid base64 data.`);
  }

  const sizeBytes = Buffer.from(base64, 'base64').length;
  if (!sizeBytes) {
    throw badRequest(`${fieldLabel} appears to be empty.`);
  }

  if (sizeBytes > MAX_PROCTORING_VIDEO_BYTES) {
    throw badRequest(
      `${fieldLabel} must be <= ${Math.round(MAX_PROCTORING_VIDEO_BYTES / (1024 * 1024))}MB.`
    );
  }

  return {
    name,
    mimeType,
    dataBase64: base64,
    sizeBytes,
    uploadedAt: new Date()
  };
}

async function sendProctoringVideoEmail({
  teacherEmail,
  teacherName,
  testTitle,
  joinCode,
  studentName,
  studentEmail,
  media
}) {
  const smtpHost = normalizeText(process.env.SMTP_HOST);
  const smtpPort = Number(process.env.SMTP_PORT || 0);
  const smtpUser = normalizeText(process.env.SMTP_USER);
  const smtpPass = normalizeText(process.env.SMTP_PASS);
  const smtpFromEnv = normalizeText(process.env.SMTP_FROM);
  const gmailUser = normalizeText(
    process.env.GMAIL_USER || process.env.GOOGLE_MAIL_USER || process.env.GOOGLE_USER
  );
  const gmailPass = normalizeText(
    process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || process.env.GOOGLE_MAIL_APP_PASSWORD
  );
  const hasSmtp = Boolean(smtpHost && smtpPort && smtpUser && smtpPass);
  const hasGmail = Boolean(gmailUser && gmailPass);
  const mailFrom = smtpFromEnv || smtpUser || gmailUser || 'noreply@arithmatrix.local';

  if (!teacherEmail) {
    return { status: 'skipped', message: 'Teacher email is not configured for this test.' };
  }

  if (!hasSmtp && !hasGmail) {
    return {
      status: 'skipped',
      message:
        'Email not sent. Configure SMTP_* vars or GMAIL_USER + GMAIL_APP_PASSWORD on server.'
    };
  }

  try {
    const nodemailerModule = await import('nodemailer');
    const nodemailer = nodemailerModule?.default || nodemailerModule;

    const transporter = hasSmtp
      ? nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        })
      : nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: gmailPass
          }
        });

    const text = [
      `Teacher: ${teacherName || 'Teacher'}`,
      `Test: ${testTitle}`,
      `Join Code: ${joinCode}`,
      `Student: ${studentName} (${studentEmail})`,
      '',
      'A proctoring video clip has been uploaded by the student during the subjective test.'
    ].join('\n');

    await transporter.sendMail({
      from: mailFrom,
      to: teacherEmail,
      subject: `Proctoring Video - ${testTitle} - ${studentName}`,
      text,
      attachments: [
        {
          filename: media.name,
          content: Buffer.from(media.dataBase64, 'base64'),
          contentType: media.mimeType
        }
      ]
    });

    return { status: 'sent', message: 'Proctoring video emailed to teacher.' };
  } catch (error) {
    const message = String(error?.message || 'unknown error');
    if (/Cannot find package 'nodemailer'/i.test(message)) {
      return { status: 'skipped', message: 'Email skipped: nodemailer is not installed on server.' };
    }
    return { status: 'failed', message: `Email failed: ${message}` };
  }
}

function getTestStatus(test) {
  const now = Date.now();
  const startAt = new Date(test.startAt).getTime();
  const endAt = new Date(test.endAt).getTime();

  if (now < startAt) return 'scheduled';
  if (now > endAt) return 'closed';
  return 'active';
}

function getTeacherView(testDoc) {
  return {
    id: String(testDoc._id),
    title: testDoc.title,
    description: testDoc.description,
    questionText: testDoc.questionText,
    durationMinutes: testDoc.durationMinutes,
    totalMarks: testDoc.totalMarks,
    startAt: testDoc.startAt,
    endAt: testDoc.endAt,
    joinCode: testDoc.joinCode,
    teacherName: testDoc.teacherName,
    teacherEmail: testDoc.teacherEmail,
    status: getTestStatus(testDoc),
    questionPdf: testDoc.questionPdf,
    answerKeyPdf: testDoc.answerKeyPdf,
    createdAt: testDoc.createdAt,
    updatedAt: testDoc.updatedAt
  };
}

function getStudentView(testDoc, { includeQuestion = false } = {}) {
  const status = getTestStatus(testDoc);
  return {
    id: String(testDoc._id),
    title: testDoc.title,
    description: testDoc.description,
    questionText: includeQuestion ? testDoc.questionText : '',
    durationMinutes: testDoc.durationMinutes,
    totalMarks: testDoc.totalMarks,
    startAt: testDoc.startAt,
    endAt: testDoc.endAt,
    joinCode: testDoc.joinCode,
    status,
    questionPdf: includeQuestion ? testDoc.questionPdf || null : null,
    createdAt: testDoc.createdAt,
    updatedAt: testDoc.updatedAt
  };
}

function getSubmissionView(submissionDoc, { includeProctoringBinary = false } = {}) {
  const proctoringVideo = submissionDoc.proctoringVideo
    ? includeProctoringBinary
      ? submissionDoc.proctoringVideo
      : {
          name: submissionDoc.proctoringVideo.name,
          mimeType: submissionDoc.proctoringVideo.mimeType,
          sizeBytes: submissionDoc.proctoringVideo.sizeBytes,
          uploadedAt: submissionDoc.proctoringVideo.uploadedAt
        }
    : null;

  return {
    id: String(submissionDoc._id),
    testId: String(submissionDoc.testId),
    studentName: submissionDoc.studentName,
    studentEmail: submissionDoc.studentEmail,
    startedAt: submissionDoc.startedAt,
    deadlineAt: submissionDoc.deadlineAt,
    answerText: submissionDoc.answerText,
    answerPdf: submissionDoc.answerPdf || null,
    proctoringVideo,
    proctoringEmailStatus: submissionDoc.proctoringEmailStatus || 'pending',
    proctoringEmailMessage: submissionDoc.proctoringEmailMessage || '',
    submittedAt: submissionDoc.submittedAt,
    timeSpentMinutes: submissionDoc.timeSpentMinutes,
    status: submissionDoc.status,
    marksObtained: submissionDoc.marksObtained,
    maxMarks: submissionDoc.maxMarks,
    teacherRemark: submissionDoc.teacherRemark,
    gradedAt: submissionDoc.gradedAt,
    createdAt: submissionDoc.createdAt,
    updatedAt: submissionDoc.updatedAt
  };
}

function ensureTeacherAuthorized(testDoc, passcode) {
  const expectedHash = testDoc.teacherPasscodeHash;
  const incomingHash = hashPasscode(passcode);

  if (!passcode || incomingHash !== expectedHash) {
    const err = new Error('Teacher passcode is incorrect.');
    err.status = 401;
    throw err;
  }
}

function generateJoinCode() {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    const index = Math.floor(Math.random() * JOIN_CODE_CHARS.length);
    code += JOIN_CODE_CHARS[index];
  }
  return code;
}

async function createUniqueJoinCode() {
  for (let attempts = 0; attempts < 8; attempts += 1) {
    const code = generateJoinCode();
    const exists = await SubjectiveTest.exists({ joinCode: code });
    if (!exists) return code;
  }

  throw badRequest('Could not generate a unique join code. Please try again.');
}

function registrationDeadline(testDoc, startedAt = new Date()) {
  const byDuration = startedAt.getTime() + testDoc.durationMinutes * 60 * 1000;
  const hardEnd = new Date(testDoc.endAt).getTime();
  return new Date(Math.min(byDuration, hardEnd));
}

export const subjectiveRouter = Router();

subjectiveRouter.post('/tests', async (req, res, next) => {
  try {
    const title = normalizeText(req.body?.title);
    const description = normalizeText(req.body?.description);
    const questionText = normalizeText(req.body?.questionText);
    const teacherName = normalizeText(req.body?.teacherName, 'Teacher');
    const teacherEmail = ensureEmailForField(
      req.body?.teacherEmail,
      'Please provide a valid teacher email address.'
    );
    const teacherPasscode = normalizeText(req.body?.teacherPasscode);

    if (!title) {
      return res.status(400).json({ message: 'title is required.' });
    }

    if (teacherPasscode.length < 4) {
      return res.status(400).json({ message: 'teacherPasscode must be at least 4 characters.' });
    }

    if (questionText.length < 10) {
      return res.status(400).json({ message: 'questionText must be at least 10 characters.' });
    }

    const durationMinutes = toNumber(req.body?.durationMinutes, 'durationMinutes', {
      min: 5,
      max: 300,
      integer: true
    });

    const totalMarks = toNumber(req.body?.totalMarks ?? 100, 'totalMarks', {
      min: 1,
      max: 1000
    });

    const startAt = parseDate(req.body?.startAt, 'startAt');
    const endAt = parseDate(req.body?.endAt, 'endAt');

    if (endAt <= startAt) {
      return res.status(400).json({ message: 'endAt must be after startAt.' });
    }

    const questionPdf = req.body?.questionPdf
      ? sanitizePdfPayload(req.body?.questionPdf, 'Question')
      : null;
    const joinCode = await createUniqueJoinCode();

    const test = await SubjectiveTest.create({
      title,
      description,
      questionText,
      durationMinutes,
      totalMarks,
      startAt,
      endAt,
      joinCode,
      teacherName,
      teacherEmail,
      teacherPasscodeHash: hashPasscode(teacherPasscode),
      questionPdf
    });

    return res.status(201).json({ test: getTeacherView(test) });
  } catch (error) {
    return next(error);
  }
});

subjectiveRouter.post('/teachers/login', async (req, res, next) => {
  try {
    const teacherEmail = ensureEmailForField(
      req.body?.teacherEmail,
      'Please provide a valid teacher email address.'
    );
    const teacherPasscode = normalizeText(req.body?.teacherPasscode);

    if (teacherPasscode.length < 4) {
      return res.status(400).json({ message: 'teacherPasscode must be at least 4 characters.' });
    }

    const tests = await SubjectiveTest.find({
      teacherEmail,
      teacherPasscodeHash: hashPasscode(teacherPasscode)
    }).sort({ updatedAt: -1 });

    if (!tests.length) {
      return res.status(401).json({
        message: 'Invalid teacher email or passcode, or no matching forms were found.'
      });
    }

    return res.json({
      teacherEmail,
      tests: tests.map(getTeacherView)
    });
  } catch (error) {
    return next(error);
  }
});

subjectiveRouter.get('/tests/by-code/:joinCode', async (req, res, next) => {
  try {
    const joinCode = normalizeText(req.params?.joinCode).toUpperCase();
    if (!joinCode) {
      return res.status(400).json({ message: 'joinCode is required.' });
    }

    const test = await SubjectiveTest.findOne({ joinCode });
    if (!test) {
      return res.status(404).json({ message: 'Test not found for this join code.' });
    }

    const status = getTestStatus(test);
    return res.json({
      test: getStudentView(test, { includeQuestion: status === 'active' })
    });
  } catch (error) {
    return next(error);
  }
});

subjectiveRouter.post('/tests/:joinCode/register', async (req, res, next) => {
  try {
    const joinCode = normalizeText(req.params?.joinCode).toUpperCase();
    const studentName = normalizeText(req.body?.studentName);
    const studentEmail = ensureEmail(req.body?.studentEmail);

    if (!studentName) {
      return res.status(400).json({ message: 'studentName is required.' });
    }

    const test = await SubjectiveTest.findOne({ joinCode });
    if (!test) {
      return res.status(404).json({ message: 'Test not found for this join code.' });
    }

    const status = getTestStatus(test);
    if (status === 'scheduled') {
      return res.status(400).json({ message: 'Test has not started yet.' });
    }

    if (status === 'closed') {
      return res.status(400).json({ message: 'Test has already ended.' });
    }

    let submission = await SubjectiveSubmission.findOne({
      testId: test._id,
      studentEmail
    });

    if (!submission) {
      const startedAt = new Date();
      submission = await SubjectiveSubmission.create({
        testId: test._id,
        studentName,
        studentEmail,
        startedAt,
        deadlineAt: registrationDeadline(test, startedAt)
      });
    }

    return res.status(201).json({
      test: getStudentView(test, { includeQuestion: true }),
      submission: getSubmissionView(submission)
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'This student is already registered for the test.' });
    }
    return next(error);
  }
});

subjectiveRouter.get('/tests/:joinCode/result', async (req, res, next) => {
  try {
    const joinCode = normalizeText(req.params?.joinCode).toUpperCase();
    const studentEmail = ensureEmail(req.query?.studentEmail);

    const test = await SubjectiveTest.findOne({ joinCode });
    if (!test) {
      return res.status(404).json({ message: 'Test not found for this join code.' });
    }

    const submission = await SubjectiveSubmission.findOne({
      testId: test._id,
      studentEmail
    });

    if (!submission) {
      return res.status(404).json({ message: 'No submission found for this student email.' });
    }

    const testStatus = getTestStatus(test);
    return res.json({
      test: getStudentView(test, { includeQuestion: testStatus === 'active' }),
      submission: getSubmissionView(submission)
    });
  } catch (error) {
    return next(error);
  }
});

subjectiveRouter.post('/tests/:joinCode/proctoring', async (req, res, next) => {
  try {
    const joinCode = normalizeText(req.params?.joinCode).toUpperCase();
    const studentEmail = ensureEmail(req.body?.studentEmail);
    const proctoringVideo = sanitizeMediaPayload(req.body?.proctoringVideo, 'Proctoring video');

    const test = await SubjectiveTest.findOne({ joinCode });
    if (!test) {
      return res.status(404).json({ message: 'Test not found for this join code.' });
    }

    const submission = await SubjectiveSubmission.findOne({
      testId: test._id,
      studentEmail
    });

    if (!submission) {
      return res.status(404).json({ message: 'Student is not registered for this test.' });
    }

    const emailResult = await sendProctoringVideoEmail({
      teacherEmail: test.teacherEmail,
      teacherName: test.teacherName,
      testTitle: test.title,
      joinCode: test.joinCode,
      studentName: submission.studentName,
      studentEmail: submission.studentEmail,
      media: proctoringVideo
    });

    submission.proctoringVideo = proctoringVideo;
    submission.proctoringEmailStatus = emailResult.status;
    submission.proctoringEmailMessage = emailResult.message;
    await submission.save();

    return res.json({
      submission: getSubmissionView(submission),
      emailStatus: emailResult.status,
      emailMessage: emailResult.message
    });
  } catch (error) {
    return next(error);
  }
});

subjectiveRouter.post('/tests/:joinCode/submit', async (req, res, next) => {
  try {
    const joinCode = normalizeText(req.params?.joinCode).toUpperCase();
    const studentEmail = ensureEmail(req.body?.studentEmail);
    const answerText = normalizeText(req.body?.answerText);
    const answerPdf = req.body?.answerPdf ? sanitizePdfPayload(req.body?.answerPdf, 'Answer') : null;
    const timeSpentMinutes = toNumber(req.body?.timeSpentMinutes ?? 0, 'timeSpentMinutes', {
      min: 0,
      max: 10000
    });

    if (answerText.length < 8 && !answerPdf) {
      return res.status(400).json({
        message: 'Upload answer PDF or provide descriptive answer text (at least 8 characters).'
      });
    }

    const test = await SubjectiveTest.findOne({ joinCode });
    if (!test) {
      return res.status(404).json({ message: 'Test not found for this join code.' });
    }

    if (getTestStatus(test) !== 'active') {
      return res.status(400).json({ message: 'Test is not accepting responses right now.' });
    }

    const submission = await SubjectiveSubmission.findOne({
      testId: test._id,
      studentEmail
    });

    if (!submission) {
      return res.status(404).json({ message: 'Student is not registered for this test.' });
    }

    if (submission.status === 'submitted' || submission.status === 'graded') {
      return res.status(400).json({ message: 'Final response already submitted. Resubmission is not allowed.' });
    }

    if (Date.now() > new Date(submission.deadlineAt).getTime()) {
      return res.status(400).json({ message: 'Submission window is closed for this student.' });
    }

    submission.answerText = answerText;
    submission.answerPdf = answerPdf || submission.answerPdf || null;
    submission.timeSpentMinutes = timeSpentMinutes;
    submission.submittedAt = new Date();
    submission.status = 'submitted';
    await submission.save();

    return res.json({ submission: getSubmissionView(submission) });
  } catch (error) {
    return next(error);
  }
});

subjectiveRouter.get('/tests/:testId/manage', async (req, res, next) => {
  try {
    const testId = normalizeText(req.params?.testId);
    const teacherPasscode = normalizeText(req.query?.teacherPasscode);

    const test = await SubjectiveTest.findById(testId);
    if (!test) {
      return res.status(404).json({ message: 'Test not found.' });
    }

    ensureTeacherAuthorized(test, teacherPasscode);

    const submissions = await SubjectiveSubmission.find({ testId: test._id }).sort({ updatedAt: -1 });

    return res.json({
      test: getTeacherView(test),
      submissions: submissions.map((item) => getSubmissionView(item, { includeProctoringBinary: true }))
    });
  } catch (error) {
    if (error?.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
});

subjectiveRouter.patch('/tests/:testId', async (req, res, next) => {
  try {
    const testId = normalizeText(req.params?.testId);
    const teacherPasscode = normalizeText(req.body?.teacherPasscode);

    const test = await SubjectiveTest.findById(testId);
    if (!test) {
      return res.status(404).json({ message: 'Test not found.' });
    }

    ensureTeacherAuthorized(test, teacherPasscode);

    const questionText = normalizeText(req.body?.questionText, test.questionText);

    if (questionText.length < 10) {
      return res.status(400).json({ message: 'questionText must be at least 10 characters.' });
    }

    const durationMinutes =
      req.body?.durationMinutes !== undefined
        ? toNumber(req.body?.durationMinutes, 'durationMinutes', {
            min: 5,
            max: 300,
            integer: true
          })
        : test.durationMinutes;

    const startAt = req.body?.startAt ? parseDate(req.body?.startAt, 'startAt') : test.startAt;
    const endAt = req.body?.endAt ? parseDate(req.body?.endAt, 'endAt') : test.endAt;

    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      return res.status(400).json({ message: 'endAt must be after startAt.' });
    }

    test.questionText = questionText;
    test.durationMinutes = durationMinutes;
    test.startAt = startAt;
    test.endAt = endAt;

    if (req.body?.questionPdf) {
      test.questionPdf = sanitizePdfPayload(req.body?.questionPdf, 'Question');
    }

    if (req.body?.removeQuestionPdf === true) {
      test.questionPdf = null;
    }

    await test.save();
    return res.json({ test: getTeacherView(test) });
  } catch (error) {
    if (error?.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
});

subjectiveRouter.post('/tests/:testId/answer-key', async (req, res, next) => {
  try {
    const testId = normalizeText(req.params?.testId);
    const teacherPasscode = normalizeText(req.body?.teacherPasscode);

    const test = await SubjectiveTest.findById(testId);
    if (!test) {
      return res.status(404).json({ message: 'Test not found.' });
    }

    ensureTeacherAuthorized(test, teacherPasscode);

    const answerKeyPdf = sanitizePdfPayload(req.body?.answerKeyPdf, 'Answer key');
    test.answerKeyPdf = answerKeyPdf;
    await test.save();

    return res.json({ test: getTeacherView(test) });
  } catch (error) {
    if (error?.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
});

subjectiveRouter.patch('/submissions/:submissionId/grade', async (req, res, next) => {
  try {
    const submissionId = normalizeText(req.params?.submissionId);
    const teacherPasscode = normalizeText(req.body?.teacherPasscode);

    const submission = await SubjectiveSubmission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    const test = await SubjectiveTest.findById(submission.testId);
    if (!test) {
      return res.status(404).json({ message: 'Associated test not found.' });
    }

    ensureTeacherAuthorized(test, teacherPasscode);

    const maxMarks = toNumber(req.body?.maxMarks ?? test.totalMarks, 'maxMarks', {
      min: 1,
      max: 1000
    });

    const marksObtained = toNumber(req.body?.marksObtained, 'marksObtained', {
      min: 0,
      max: maxMarks
    });

    submission.maxMarks = maxMarks;
    submission.marksObtained = marksObtained;
    submission.teacherRemark = normalizeText(req.body?.teacherRemark);
    submission.gradedAt = new Date();
    submission.status = 'graded';
    await submission.save();

    return res.json({ submission: getSubmissionView(submission, { includeProctoringBinary: true }) });
  } catch (error) {
    if (error?.status) {
      return res.status(error.status).json({ message: error.message });
    }

    if (/marksObtained/.test(String(error?.message || ''))) {
      return res.status(400).json({ message: error.message });
    }

    return next(error);
  }
});
