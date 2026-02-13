import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Tesseract from 'tesseract.js';
import { useSearchParams } from 'react-router-dom';
import {
  createSubjectiveTest,
  getStudentSubjectiveResult,
  getStudentSubjectiveTestByCode,
  loginTeacherSubjective,
  getTeacherSubjectiveManage,
  gradeSubjectiveSubmission,
  registerStudentForSubjectiveTest,
  submitSubjectiveAnswers,
  updateSubjectiveTest,
  uploadSubjectiveProctoringEvidence,
  uploadSubjectiveAnswerKey
} from '../api/subjectiveApi.js';
import { evaluateExpression, formatResult } from '../utils/calculatorEngine.js';

const TEACHER_TESTS_STORAGE_KEY = 'subjective-teacher-tests';
const INTEGRITY_WARNING_LIMIT = 3;
const BLOCKED_SHORTCUT_KEYS = new Set([
  'a',
  'c',
  'f',
  'i',
  'j',
  'p',
  's',
  'u',
  'v',
  'x',
  'insert'
]);
const PROCTORING_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function isPdfFile(file) {
  if (!file) return false;
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
}

function toDateTimeLocalValue(date = null) {
  const target = date ? new Date(date) : new Date();
  if (Number.isNaN(target.getTime())) {
    return toDateTimeLocalValue();
  }
  target.setSeconds(0, 0);
  const local = new Date(target.getTime() - target.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function ensureDateTimeLocalValue(value, fallback = null) {
  const candidate = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(candidate)) {
    return candidate;
  }
  const parsed = candidate ? new Date(candidate) : null;
  if (parsed && Number.isFinite(parsed.getTime())) {
    return toDateTimeLocalValue(parsed);
  }
  return toDateTimeLocalValue(fallback);
}

function datePartFromLocal(value) {
  return ensureDateTimeLocalValue(value).slice(0, 10);
}

function timePartFromLocal(value) {
  return ensureDateTimeLocalValue(value).slice(11, 16);
}

function mergeDateAndTime(nextDate, nextTime, fallbackValue = null) {
  const fallback = ensureDateTimeLocalValue(fallbackValue);
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(String(nextDate || ''))
    ? String(nextDate)
    : fallback.slice(0, 10);
  const timeMatch = String(nextTime || '')
    .trim()
    .match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  const safeTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : fallback.slice(11, 16);
  return `${safeDate}T${safeTime}`;
}

function formatDateTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
}

function formatRemaining(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }

  return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

function getStudentTestNotice(test) {
  if (!test) return '';
  if (test.status === 'scheduled') {
    return `Form found. It opens on ${formatDateTime(test.startAt)}.`;
  }
  if (test.status === 'closed') {
    return 'Form found, but this test is closed now.';
  }
  return 'Form found. Register to start your timed subjective response.';
}

function getStatusLabel(status) {
  if (status === 'scheduled') return 'Scheduled';
  if (status === 'active') return 'Active';
  if (status === 'closed') return 'Closed';
  return 'Unknown';
}

function getImpressionFromMarks(marksObtained, maxMarks) {
  const marks = Number(marksObtained);
  const max = Number(maxMarks);

  if (!Number.isFinite(marks) || !Number.isFinite(max) || max <= 0) return null;

  const percentage = Math.max(0, Math.min(100, (marks / max) * 100));

  if (percentage >= 85) {
    return { label: 'Outstanding', emoji: '🌟', className: 'subjective-impression-outstanding', percentage };
  }
  if (percentage >= 70) {
    return { label: 'Best', emoji: '🔥', className: 'subjective-impression-best', percentage };
  }
  return { label: 'Good', emoji: '👍', className: 'subjective-impression-good', percentage };
}

function loadTeacherLocalTests(storageKey = TEACHER_TESTS_STORAGE_KEY) {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && item.id && item.joinCode)
      .slice(0, 50);
  } catch (_error) {
    return [];
  }
}

function fileToPdfPayload(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Please choose a PDF file.'));
      return;
    }

    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      reject(new Error('Only PDF files are supported.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read PDF file.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.replace(/^data:.*?;base64,/i, '');
      if (!base64) {
        reject(new Error('Could not parse PDF file data.'));
        return;
      }

      resolve({
        name: file.name,
        mimeType: file.type || 'application/pdf',
        dataBase64: base64
      });
    };
    reader.readAsDataURL(file);
  });
}

function fileToMediaPayload(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Please choose a media file.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read media file.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.replace(/^data:.*?;base64,/i, '');
      if (!base64) {
        reject(new Error('Could not parse media file data.'));
        return;
      }

      resolve({
        name: file.name || 'proctoring-evidence.webm',
        mimeType: file.type || 'video/webm',
        dataBase64: base64
      });
    };
    reader.readAsDataURL(file);
  });
}

function openPdf(pdf) {
  if (!pdf?.dataBase64) return;
  const mimeType = pdf.mimeType || 'application/pdf';
  const url = `data:${mimeType};base64,${pdf.dataBase64}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openMedia(media) {
  if (!media?.dataBase64) return;
  const mimeType = media.mimeType || 'video/webm';
  const url = `data:${mimeType};base64,${media.dataBase64}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function initializeGradeDrafts(submissions, defaultMaxMarks) {
  return (submissions || []).reduce((acc, item) => {
    acc[item.id] = {
      marksObtained: item.marksObtained ?? '',
      maxMarks: item.maxMarks ?? defaultMaxMarks ?? 100,
      teacherRemark: item.teacherRemark || ''
    };
    return acc;
  }, {});
}

function buildTeacherEditForm(test = null) {
  const startFallback = toDateTimeLocalValue();
  const endFallback = toDateTimeLocalValue(Date.now() + 60 * 60 * 1000);
  return {
    title: test?.title || '',
    description: test?.description || '',
    questionText: test?.questionText || '',
    durationMinutes: test?.durationMinutes ?? 60,
    totalMarks: test?.totalMarks ?? 100,
    startAt: ensureDateTimeLocalValue(test?.startAt, startFallback),
    endAt: ensureDateTimeLocalValue(test?.endAt, endFallback),
    teacherName: test?.teacherName || '',
    teacherEmail: test?.teacherEmail || '',
    newTeacherPasscode: ''
  };
}

export function SubjectiveTestPanel({
  storageKey = TEACHER_TESTS_STORAGE_KEY,
  userRole = 'student',
  defaultStudentName = '',
  defaultStudentEmail = '',
  defaultTeacherName = '',
  defaultTeacherEmail = ''
}) {
  const [searchParams] = useSearchParams();
  const normalizedRole = String(userRole || 'student').trim().toLowerCase();
  const canUseTeacherMode = normalizedRole === 'teacher' || normalizedRole === 'admin';
  const [mode, setMode] = useState(canUseTeacherMode ? 'teacher' : 'student');

  const [teacherCreate, setTeacherCreate] = useState({
    title: '',
    description: '',
    questionText: '',
    durationMinutes: 60,
    totalMarks: 100,
    startAt: toDateTimeLocalValue(),
    endAt: toDateTimeLocalValue(Date.now() + 60 * 60 * 1000),
    teacherName: defaultTeacherName,
    teacherEmail: defaultTeacherEmail,
    teacherPasscode: ''
  });
  const [questionPdfFile, setQuestionPdfFile] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createNotice, setCreateNotice] = useState('');
  const [createdTest, setCreatedTest] = useState(null);

  const [teacherLocalTests, setTeacherLocalTests] = useState(() => loadTeacherLocalTests(storageKey));

  const [teacherLoginEmail, setTeacherLoginEmail] = useState(defaultTeacherEmail);
  const [teacherLoginPasscode, setTeacherLoginPasscode] = useState('');
  const [teacherAuth, setTeacherAuth] = useState(null);
  const [teacherAuthLoading, setTeacherAuthLoading] = useState(false);
  const [teacherAuthError, setTeacherAuthError] = useState('');
  const [teacherServerTests, setTeacherServerTests] = useState([]);

  const [manageTestId, setManageTestId] = useState('');
  const [managePasscode, setManagePasscode] = useState('');
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState('');
  const [manageNotice, setManageNotice] = useState('');
  const [manageData, setManageData] = useState(null);
  const [manageEditForm, setManageEditForm] = useState(() => buildTeacherEditForm());
  const [manageEditQuestionPdfFile, setManageEditQuestionPdfFile] = useState(null);
  const [manageEditRemoveQuestionPdf, setManageEditRemoveQuestionPdf] = useState(false);
  const [manageEditLoading, setManageEditLoading] = useState(false);
  const [answerKeyFile, setAnswerKeyFile] = useState(null);
  const [answerKeyLoading, setAnswerKeyLoading] = useState(false);
  const [gradeLoadingId, setGradeLoadingId] = useState('');
  const [gradeDrafts, setGradeDrafts] = useState({});

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState('');
  const [testNotice, setTestNotice] = useState('');
  const [studentTest, setStudentTest] = useState(null);

  const [studentName, setStudentName] = useState(defaultStudentName);
  const [studentEmail, setStudentEmail] = useState(defaultStudentEmail);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState('');
  const [submission, setSubmission] = useState(null);

  const [answerText, setAnswerText] = useState('');
  const [studentAnswerFile, setStudentAnswerFile] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrNotice, setOcrNotice] = useState('');
  const [ocrError, setOcrError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [clipboardNotice, setClipboardNotice] = useState('');
  const [nowTick, setNowTick] = useState(Date.now());
  const [integrityWarnings, setIntegrityWarnings] = useState(0);
  const [integrityLocked, setIntegrityLocked] = useState(false);
  const [proctoringActive, setProctoringActive] = useState(false);
  const [proctoringLoading, setProctoringLoading] = useState(false);
  const [proctoringNotice, setProctoringNotice] = useState('');
  const [proctoringError, setProctoringError] = useState('');
  const [quickCalcExpression, setQuickCalcExpression] = useState('');
  const [quickCalcResult, setQuickCalcResult] = useState('');

  const proctoringVideoRef = useRef(null);
  const proctoringStreamRef = useRef(null);
  const proctoringRecorderRef = useRef(null);
  const proctoringChunksRef = useRef([]);
  const proctoringUploadInFlightRef = useRef(false);

  const createdShareLink = useMemo(() => {
    if (!createdTest?.joinCode) return '';
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/subjective?code=${createdTest.joinCode}`;
  }, [createdTest?.joinCode]);

  const startDateValue = useMemo(
    () => datePartFromLocal(teacherCreate.startAt),
    [teacherCreate.startAt]
  );
  const startTimeValue = useMemo(
    () => timePartFromLocal(teacherCreate.startAt),
    [teacherCreate.startAt]
  );
  const endDateValue = useMemo(
    () => datePartFromLocal(teacherCreate.endAt),
    [teacherCreate.endAt]
  );
  const endTimeValue = useMemo(
    () => timePartFromLocal(teacherCreate.endAt),
    [teacherCreate.endAt]
  );
  const manageStartDateValue = useMemo(
    () => datePartFromLocal(manageEditForm.startAt),
    [manageEditForm.startAt]
  );
  const manageStartTimeValue = useMemo(
    () => timePartFromLocal(manageEditForm.startAt),
    [manageEditForm.startAt]
  );
  const manageEndDateValue = useMemo(
    () => datePartFromLocal(manageEditForm.endAt),
    [manageEditForm.endAt]
  );
  const manageEndTimeValue = useMemo(
    () => timePartFromLocal(manageEditForm.endAt),
    [manageEditForm.endAt]
  );

  useEffect(() => {
    if (canUseTeacherMode) return;
    setMode('student');
  }, [canUseTeacherMode]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(teacherLocalTests));
      }
    } catch (_error) {
      // Ignore storage errors.
    }
  }, [teacherLocalTests, storageKey]);

  useEffect(() => {
    setTeacherLocalTests(loadTeacherLocalTests(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (!defaultTeacherEmail && !defaultTeacherName) return;
    setTeacherCreate((prev) => {
      const nextTeacherEmail = prev.teacherEmail || defaultTeacherEmail;
      const nextTeacherName = prev.teacherName || defaultTeacherName;
      if (nextTeacherEmail === prev.teacherEmail && nextTeacherName === prev.teacherName) {
        return prev;
      }
      return {
        ...prev,
        teacherEmail: nextTeacherEmail,
        teacherName: nextTeacherName
      };
    });
    setTeacherLoginEmail((prev) => prev || defaultTeacherEmail);
  }, [defaultTeacherEmail, defaultTeacherName]);

  useEffect(() => {
    if (!defaultStudentEmail && !defaultStudentName) return;
    setStudentName((prev) => prev || defaultStudentName);
    setStudentEmail((prev) => prev || defaultStudentEmail);
  }, [defaultStudentEmail, defaultStudentName]);

  useEffect(() => {
    if (!submission?.deadlineAt) return undefined;
    if (submission.status === 'submitted' || submission.status === 'graded') return undefined;
    const interval = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [submission?.deadlineAt, submission?.status]);

  const remainingSeconds = useMemo(() => {
    if (!submission?.deadlineAt) return null;
    const deadlineMs = new Date(submission.deadlineAt).getTime();
    if (!Number.isFinite(deadlineMs)) return null;
    return Math.max(0, Math.floor((deadlineMs - nowTick) / 1000));
  }, [submission?.deadlineAt, nowTick]);

  const timeSpentMinutes = useMemo(() => {
    if (!submission?.startedAt) return 0;
    const startMs = new Date(submission.startedAt).getTime();
    if (!Number.isFinite(startMs)) return 0;
    return Math.max(0, Math.round((nowTick - startMs) / 60000));
  }, [submission?.startedAt, nowTick]);

  const isStudentLocked = useMemo(() => {
    if (!submission) return true;
    if (integrityLocked) return true;
    if (submission.status === 'submitted' || submission.status === 'graded') return true;
    if (remainingSeconds !== null && remainingSeconds <= 0) return true;
    return false;
  }, [submission, remainingSeconds, integrityLocked]);

  const resultImpression = useMemo(() => {
    if (submission?.marksObtained === null || submission?.marksObtained === undefined) return null;
    const maxMarks = Number(submission?.maxMarks ?? studentTest?.totalMarks ?? 0);
    return getImpressionFromMarks(submission?.marksObtained, maxMarks);
  }, [submission?.marksObtained, submission?.maxMarks, studentTest?.totalMarks]);

  const uploadProctoringClip = useCallback(
    async (blob) => {
      if (!blob || !studentTest?.joinCode || !studentEmail.trim()) return;
      if (proctoringUploadInFlightRef.current) return;

      if (blob.size > PROCTORING_MAX_UPLOAD_BYTES) {
        setProctoringError(
          `Proctoring clip is too large (${Math.round(blob.size / (1024 * 1024))}MB). Max allowed is 10MB.`
        );
        return;
      }

      try {
        proctoringUploadInFlightRef.current = true;
        const evidenceFile = new File([blob], `proctoring-${Date.now()}.webm`, {
          type: blob.type || 'video/webm'
        });
        const proctoringVideo = await fileToMediaPayload(evidenceFile);
        const data = await uploadSubjectiveProctoringEvidence(studentTest.joinCode, {
          studentEmail,
          proctoringVideo
        });

        if (data?.submission) {
          setSubmission(data.submission);
        }
        setProctoringNotice(data?.emailMessage || 'Proctoring video uploaded.');
      } catch (error) {
        setProctoringError(error.message || 'Could not upload proctoring clip.');
      } finally {
        proctoringUploadInFlightRef.current = false;
      }
    },
    [studentTest?.joinCode, studentEmail]
  );

  const stopProctoringSession = useCallback(
    async ({ uploadEvidence = false } = {}) => {
      const recorder = proctoringRecorderRef.current;
      const stream = proctoringStreamRef.current;

      if (recorder && recorder.state !== 'inactive') {
        await new Promise((resolve) => {
          const onStop = async () => {
            try {
              const chunks = proctoringChunksRef.current || [];
              if (uploadEvidence && chunks.length) {
                const lastChunk = chunks[chunks.length - 1];
                await uploadProctoringClip(lastChunk);
              }
            } finally {
              resolve();
            }
          };

          recorder.addEventListener('stop', onStop, { once: true });
          recorder.stop();
        });
      }

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (_error) {
          // Ignore fullscreen exit failures.
        }
      }

      proctoringRecorderRef.current = null;
      proctoringStreamRef.current = null;
      proctoringChunksRef.current = [];
      setProctoringActive(false);
    },
    [uploadProctoringClip]
  );

  const startProctoringSession = useCallback(async () => {
    try {
      setProctoringLoading(true);
      setProctoringError('');
      setProctoringNotice('');

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera/Mic is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      proctoringStreamRef.current = stream;

      if (proctoringVideoRef.current) {
        proctoringVideoRef.current.srcObject = stream;
        await proctoringVideoRef.current.play().catch(() => {});
      }

      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }

      if (typeof MediaRecorder !== 'undefined') {
        const preferredMimeTypes = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm'
        ];
        const mimeType = preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
        const recorder = new MediaRecorder(stream, {
          ...(mimeType ? { mimeType } : {}),
          videoBitsPerSecond: 220000,
          audioBitsPerSecond: 48000
        });

        proctoringChunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            proctoringChunksRef.current.push(event.data);
            uploadProctoringClip(event.data);
          }
        };
        recorder.start(10000);
        proctoringRecorderRef.current = recorder;
      }

      stream.getTracks().forEach((track) => {
        track.onended = () => {
          setProctoringError('Camera/Mic turned off. Test is locked.');
          setSubmitError('Camera/Mic must stay on during the test.');
          setIntegrityLocked(true);
        };
      });

      setProctoringActive(true);
      setProctoringNotice('Proctor mode active: camera, mic, and fullscreen lock enabled.');
    } catch (error) {
      setProctoringActive(false);
      setProctoringError(error.message || 'Could not start proctor mode.');
      setSubmitError('Camera, mic, and fullscreen access are required for this test.');
    } finally {
      setProctoringLoading(false);
    }
  }, [uploadProctoringClip]);

  useEffect(() => {
    if (!submission) return undefined;
    if (isStudentLocked) return undefined;

    const onWindowBlur = () => registerIntegrityViolation('Do not switch tabs/apps during the test.');

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        onWindowBlur();
      }
    };

    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [submission, isStudentLocked]);

  useEffect(() => {
    if (!submission || isStudentLocked || !proctoringActive) return undefined;

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setProctoringError('Fullscreen exited. Test is locked.');
        setSubmitError('Fullscreen must stay enabled during the test.');
        setIntegrityLocked(true);
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [submission, isStudentLocked, proctoringActive]);

  useEffect(() => {
    return () => {
      stopProctoringSession({ uploadEvidence: false });
    };
  }, [stopProctoringSession]);

  useEffect(() => {
    if (!submission) return undefined;
    if (isStudentLocked) return undefined;

    const onBlockedAction = (event) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      registerIntegrityViolation('Copy/paste and context actions are blocked during the test.');
    };

    const onKeyDown = (event) => {
      if (event.defaultPrevented) return;
      const key = String(event.key || '').toLowerCase();
      const withModifier = event.ctrlKey || event.metaKey;

      if (withModifier && BLOCKED_SHORTCUT_KEYS.has(key)) {
        event.preventDefault();
        registerIntegrityViolation(
          'Keyboard shortcuts for copy/paste/search/print/devtools are blocked during the test.'
        );
        return;
      }

      if (event.shiftKey && key === 'insert') {
        event.preventDefault();
        registerIntegrityViolation('Paste shortcuts are blocked during the test.');
        return;
      }

      if (event.key === 'PrintScreen') {
        event.preventDefault();
        registerIntegrityViolation('Screen-capture shortcut was blocked during the test.');
      }
    };

    document.addEventListener('copy', onBlockedAction);
    document.addEventListener('paste', onBlockedAction);
    document.addEventListener('cut', onBlockedAction);
    document.addEventListener('contextmenu', onBlockedAction);
    document.addEventListener('dragstart', onBlockedAction);
    document.addEventListener('drop', onBlockedAction);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('copy', onBlockedAction);
      document.removeEventListener('paste', onBlockedAction);
      document.removeEventListener('cut', onBlockedAction);
      document.removeEventListener('contextmenu', onBlockedAction);
      document.removeEventListener('dragstart', onBlockedAction);
      document.removeEventListener('drop', onBlockedAction);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [submission, isStudentLocked]);

  useEffect(() => {
    const code = String(searchParams.get('code') || '').trim().toUpperCase();
    if (!code) return;

    setMode('student');
    setJoinCodeInput(code);

    async function loadFromLink() {
      try {
        const data = await getStudentSubjectiveTestByCode(code);
        const test = data?.test || null;
        setStudentTest(test);
        setTestNotice(getStudentTestNotice(test));
        setTestError('');
      } catch (error) {
        setStudentTest(null);
        setTestError(error.message || 'Could not open shared test link.');
      }
    }

    loadFromLink();
  }, [searchParams]);

  const refreshStudentResult = useCallback(
    async ({ silent = false } = {}) => {
      const joinCode = String(studentTest?.joinCode || '').trim().toUpperCase();
      const email = String(studentEmail || '').trim().toLowerCase();

      if (!joinCode || !email) return;

      if (!silent) {
        setResultLoading(true);
        setResultError('');
      }

      try {
        const data = await getStudentSubjectiveResult(joinCode, email);
        if (data?.test) setStudentTest(data.test);
        if (data?.submission) {
          setSubmission(data.submission);
          setAnswerText(data.submission.answerText || '');
        }

        if (!silent) {
          if (data?.submission?.marksObtained !== null && data?.submission?.marksObtained !== undefined) {
            setTestNotice('Result updated. Teacher review is now visible.');
          } else {
            setTestNotice('Answer submitted. Marks are not published yet.');
          }
        }
      } catch (error) {
        if (!silent) {
          setResultError(error.message || 'Could not load latest result.');
        }
      } finally {
        if (!silent) {
          setResultLoading(false);
        }
      }
    },
    [studentTest?.joinCode, studentEmail]
  );

  useEffect(() => {
    if (!submission) return undefined;
    if (submission.status !== 'submitted') return undefined;
    if (!studentTest?.joinCode || !studentEmail.trim()) return undefined;

    const interval = window.setInterval(() => {
      refreshStudentResult({ silent: true });
    }, 15000);

    return () => window.clearInterval(interval);
  }, [submission, studentTest?.joinCode, studentEmail, refreshStudentResult]);

  useEffect(() => {
    if (!submission) return;
    if (!proctoringActive) return;
    if (submission.status !== 'submitted' && submission.status !== 'graded') return;
    stopProctoringSession({ uploadEvidence: false });
  }, [submission, proctoringActive, stopProctoringSession]);

  useEffect(() => {
    if (!submission) return;
    if (submission.status !== 'registered') return;
    if (isStudentLocked) return;
    if (proctoringActive || proctoringLoading) return;
    if (proctoringError) return;
    startProctoringSession();
  }, [
    submission,
    isStudentLocked,
    proctoringActive,
    proctoringLoading,
    proctoringError,
    startProctoringSession
  ]);

  function addTeacherLocalTest(created, teacherPasscode) {
    if (!created?.id || !created?.joinCode) return;

    setTeacherLocalTests((prev) => {
      const next = [
        {
          id: created.id,
          title: created.title,
          joinCode: created.joinCode,
          teacherPasscode: teacherPasscode || '',
          updatedAt: new Date().toISOString()
        },
        ...prev.filter((item) => item.id !== created.id)
      ];
      return next.slice(0, 50);
    });
  }

  function syncTeacherServerTests(updatedTest) {
    if (!updatedTest?.id) return;
    setTeacherServerTests((prev) => {
      const next = [updatedTest, ...prev.filter((item) => item.id !== updatedTest.id)];
      return next;
    });
  }

  function resetStudentSession() {
    stopProctoringSession({ uploadEvidence: false });
    setSubmission(null);
    setAnswerText('');
    setStudentAnswerFile(null);
    setOcrLoading(false);
    setOcrProgress(0);
    setOcrNotice('');
    setOcrError('');
    setProctoringNotice('');
    setProctoringError('');
    setRegisterError('');
    setResultError('');
    setSubmitError('');
    setClipboardNotice('');
    setIntegrityWarnings(0);
    setIntegrityLocked(false);
  }

  function registerIntegrityViolation(reason) {
    if (!submission || isStudentLocked) return;

    setIntegrityWarnings((prev) => {
      const next = prev + 1;

      if (next >= INTEGRITY_WARNING_LIMIT) {
        setIntegrityLocked(true);
        setSubmitError('Response locked due to repeated integrity violations.');
      }

      setClipboardNotice(`Warning ${Math.min(next, INTEGRITY_WARNING_LIMIT)}/${INTEGRITY_WARNING_LIMIT}: ${reason}`);
      return next;
    });
  }

  function updateTeacherDateTimeField(field, part, nextValue) {
    setTeacherCreate((prev) => {
      const currentValue = ensureDateTimeLocalValue(prev[field]);
      const currentDate = datePartFromLocal(currentValue);
      const currentTime = timePartFromLocal(currentValue);
      const merged =
        part === 'date'
          ? mergeDateAndTime(nextValue, currentTime, currentValue)
          : mergeDateAndTime(currentDate, nextValue, currentValue);

      return {
        ...prev,
        [field]: merged
      };
    });
  }

  function updateManageEditDateTimeField(field, part, nextValue) {
    setManageEditForm((prev) => {
      const currentValue = ensureDateTimeLocalValue(prev[field]);
      const currentDate = datePartFromLocal(currentValue);
      const currentTime = timePartFromLocal(currentValue);
      const merged =
        part === 'date'
          ? mergeDateAndTime(nextValue, currentTime, currentValue)
          : mergeDateAndTime(currentDate, nextValue, currentValue);

      return {
        ...prev,
        [field]: merged
      };
    });
  }

  async function findTestByCode(codeInputValue, { showLoading = true } = {}) {
    const code = String(codeInputValue || '').trim().toUpperCase();

    if (!code) {
      setTestError('Please enter join code.');
      return;
    }

    if (showLoading) setTestLoading(true);
    setTestError('');
    setTestNotice('');
    setResultError('');

    try {
      const data = await getStudentSubjectiveTestByCode(code);
      const test = data?.test || null;
      setStudentTest(test);
      setJoinCodeInput(code);
      setTestNotice(getStudentTestNotice(test));
      resetStudentSession();
    } catch (error) {
      setStudentTest(null);
      setTestError(error.message || 'Could not find test.');
    } finally {
      if (showLoading) setTestLoading(false);
    }
  }

  async function handleCreateTest(event) {
    event.preventDefault();

    setCreateLoading(true);
    setCreateError('');
    setCreateNotice('');

    try {
      const questionPdf = questionPdfFile ? await fileToPdfPayload(questionPdfFile) : null;
      const payload = {
        ...teacherCreate,
        durationMinutes: Number(teacherCreate.durationMinutes),
        totalMarks: Number(teacherCreate.totalMarks),
        startAt: new Date(teacherCreate.startAt).toISOString(),
        endAt: new Date(teacherCreate.endAt).toISOString(),
        ...(questionPdf ? { questionPdf } : {})
      };

      const data = await createSubjectiveTest(payload);
      const created = data?.test;
      setCreatedTest(created || null);
      setCreateNotice('Form test created. Share Join Code or direct link with students.');

      if (created?.id) {
        setManageTestId(created.id);
      }
      if (teacherCreate.teacherPasscode) {
        setManagePasscode(teacherCreate.teacherPasscode);
      }

      addTeacherLocalTest(created, teacherCreate.teacherPasscode);
      if (
        created?.id &&
        teacherAuth?.teacherEmail &&
        teacherAuth.teacherEmail === teacherCreate.teacherEmail.trim().toLowerCase() &&
        teacherAuth.passcode === teacherCreate.teacherPasscode
      ) {
        syncTeacherServerTests(created);
      }
    } catch (error) {
      setCreateError(error.message || 'Could not create test form.');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleTeacherLogin(event) {
    event.preventDefault();

    const email = teacherLoginEmail.trim().toLowerCase();
    const passcode = teacherLoginPasscode.trim();

    if (!email) {
      setTeacherAuthError('Please enter teacher email.');
      return;
    }
    if (!passcode) {
      setTeacherAuthError('Please enter teacher passcode.');
      return;
    }

    setTeacherAuthLoading(true);
    setTeacherAuthError('');
    setManageError('');
    setManageNotice('');
    setManageData(null);

    try {
      const data = await loginTeacherSubjective({
        teacherEmail: email,
        teacherPasscode: passcode
      });
      const tests = Array.isArray(data?.tests) ? data.tests : [];
      setTeacherLoginEmail(email);
      setTeacherAuth({ teacherEmail: email, passcode });
      setTeacherServerTests(tests);
      setManagePasscode(passcode);
      setManageTestId(tests[0]?.id || '');
      setManageNotice(
        tests.length
          ? 'Login successful. Select a form and load responses.'
          : 'Login successful. No forms found for this account.'
      );
    } catch (error) {
      setTeacherAuth(null);
      setTeacherServerTests([]);
      setManageTestId('');
      setManagePasscode('');
      setTeacherAuthError(error.message || 'Teacher login failed.');
    } finally {
      setTeacherAuthLoading(false);
    }
  }

  function handleTeacherLogout() {
    setTeacherAuth(null);
    setTeacherAuthError('');
    setTeacherServerTests([]);
    setTeacherLoginPasscode('');
    setManageTestId('');
    setManagePasscode('');
    setManageData(null);
    setManageNotice('');
    setManageError('');
  }

  async function handleLoadTeacherPanel(event) {
    event?.preventDefault?.();

    if (!teacherAuth?.teacherEmail || !teacherAuth?.passcode) {
      setManageError('Please login with teacher email and passcode first.');
      return;
    }

    if (!manageTestId.trim()) {
      setManageError('Please select a form to manage.');
      return;
    }

    setManageLoading(true);
    setManageError('');
    setManageNotice('');

    try {
      const data = await getTeacherSubjectiveManage(manageTestId.trim(), teacherAuth.passcode);
      setManageData(data);
      setGradeDrafts(initializeGradeDrafts(data?.submissions, data?.test?.totalMarks));
      setManageEditForm(buildTeacherEditForm(data?.test));
      setManageEditQuestionPdfFile(null);
      setManageEditRemoveQuestionPdf(false);
      setManageNotice('Responses loaded.');
    } catch (error) {
      setManageError(error.message || 'Could not load responses.');
    } finally {
      setManageLoading(false);
    }
  }

  async function handleUploadAnswerKey() {
    if (!manageData?.test?.id) {
      setManageError('Load teacher panel first.');
      return;
    }

    if (!answerKeyFile) {
      setManageError('Select answer key PDF.');
      return;
    }

    const teacherPasscode = teacherAuth?.passcode || managePasscode;
    if (!teacherPasscode.trim()) {
      setManageError('Please login with teacher credentials first.');
      return;
    }

    setAnswerKeyLoading(true);
    setManageError('');

    try {
      const answerKeyPdf = await fileToPdfPayload(answerKeyFile);
      const data = await uploadSubjectiveAnswerKey(manageData.test.id, {
        teacherPasscode,
        answerKeyPdf
      });

      setManageData((prev) => ({
        ...prev,
        test: data?.test || prev?.test
      }));
      setManageNotice('Answer key uploaded.');
      setAnswerKeyFile(null);
    } catch (error) {
      setManageError(error.message || 'Could not upload answer key.');
    } finally {
      setAnswerKeyLoading(false);
    }
  }

  async function handleUpdateTeacherForm(event) {
    event.preventDefault();

    if (!manageData?.test?.id) {
      setManageError('Load teacher panel first.');
      return;
    }

    const teacherPasscode = teacherAuth?.passcode || managePasscode;
    if (!teacherPasscode.trim()) {
      setManageError('Teacher passcode is required to update form.');
      return;
    }

    setManageEditLoading(true);
    setManageError('');
    setManageNotice('');

    try {
      const payload = {
        teacherPasscode,
        questionText: manageEditForm.questionText,
        durationMinutes: Number(manageEditForm.durationMinutes),
        startAt: new Date(manageEditForm.startAt).toISOString(),
        endAt: new Date(manageEditForm.endAt).toISOString()
      };

      if (manageEditQuestionPdfFile) {
        payload.questionPdf = await fileToPdfPayload(manageEditQuestionPdfFile);
      } else if (manageEditRemoveQuestionPdf) {
        payload.removeQuestionPdf = true;
      }

      const data = await updateSubjectiveTest(manageData.test.id, payload);
      const updatedTest = data?.test || null;
      if (!updatedTest) {
        throw new Error('Updated form payload missing from server response.');
      }

      setManageData((prev) => (prev ? { ...prev, test: updatedTest } : prev));
      syncTeacherServerTests(updatedTest);
      setManageEditForm(buildTeacherEditForm(updatedTest));
      setManageEditQuestionPdfFile(null);
      setManageEditRemoveQuestionPdf(false);
      setTeacherLocalTests((prev) =>
        prev.map((item) =>
          item.id === updatedTest.id
            ? {
                ...item,
                title: updatedTest.title,
                joinCode: updatedTest.joinCode,
                updatedAt: new Date().toISOString()
              }
            : item
        )
      );

      setManageNotice('Test form updated successfully.');
    } catch (error) {
      setManageError(error.message || 'Could not update test form.');
    } finally {
      setManageEditLoading(false);
    }
  }

  async function handleGradeSubmission(submissionId) {
    const draft = gradeDrafts[submissionId];
    if (!draft) return;

    const teacherPasscode = teacherAuth?.passcode || managePasscode;
    if (!teacherPasscode.trim()) {
      setManageError('Please login with teacher credentials first.');
      return;
    }

    setGradeLoadingId(submissionId);
    setManageError('');
    setManageNotice('');

    try {
      const payload = {
        teacherPasscode,
        marksObtained: Number(draft.marksObtained),
        maxMarks: Number(draft.maxMarks),
        teacherRemark: draft.teacherRemark
      };

      const data = await gradeSubjectiveSubmission(submissionId, payload);
      const updated = data?.submission;

      setManageData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          submissions: (prev.submissions || []).map((item) =>
            item.id === submissionId ? updated : item
          )
        };
      });

      setManageNotice('Marks saved successfully.');
    } catch (error) {
      setManageError(error.message || 'Could not save marks.');
    } finally {
      setGradeLoadingId('');
    }
  }

  async function handleFindTestByCode(event) {
    event.preventDefault();
    await findTestByCode(joinCodeInput, { showLoading: true });
  }

  async function handleRegisterStudent(event) {
    event.preventDefault();

    if (!studentTest?.joinCode) {
      setRegisterError('Load a valid test first.');
      return;
    }

    if (studentTest.status !== 'active') {
      setRegisterError(
        studentTest.status === 'scheduled'
          ? 'Test is scheduled and has not started yet.'
          : 'Test is closed.'
      );
      return;
    }

    setRegisterLoading(true);
    setRegisterError('');
    setResultError('');
    setSubmitError('');

    try {
      const data = await registerStudentForSubjectiveTest(studentTest.joinCode, {
        studentName,
        studentEmail
      });

      setSubmission(data?.submission || null);
      setAnswerText(data?.submission?.answerText || '');
      setTestNotice('Registered. You can submit only once, similar to Microsoft Forms final submit.');
      setIntegrityWarnings(0);
      setIntegrityLocked(false);
      await startProctoringSession();
    } catch (error) {
      setRegisterError(error.message || 'Could not register student.');
    } finally {
      setRegisterLoading(false);
    }
  }

  async function handleSubmitAnswer(event) {
    event.preventDefault();

    if (!submission?.id || !studentTest?.joinCode) {
      setSubmitError('Please register first.');
      return;
    }

    if (isStudentLocked) {
      setSubmitError('Submission is locked.');
      return;
    }

    if (!proctoringActive || !proctoringStreamRef.current) {
      setSubmitError('Camera and mic proctoring must remain active during the test.');
      return;
    }

    if (!document.fullscreenElement) {
      setSubmitError('Fullscreen must be active during submission.');
      return;
    }

    setSubmitLoading(true);
    setSubmitError('');

    try {
      const answerPdf =
        studentAnswerFile && isPdfFile(studentAnswerFile)
          ? await fileToPdfPayload(studentAnswerFile)
          : null;
      const data = await submitSubjectiveAnswers(studentTest.joinCode, {
        studentEmail,
        answerText,
        ...(answerPdf ? { answerPdf } : {}),
        timeSpentMinutes
      });

      setSubmission(data?.submission || null);
      setStudentAnswerFile(null);
      await stopProctoringSession({ uploadEvidence: true });
      setResultError('');
      setTestNotice('Final response submitted. Editing is disabled.');
    } catch (error) {
      setSubmitError(error.message || 'Could not submit answer.');
    } finally {
      setSubmitLoading(false);
    }
  }

  function blockRestrictedAction(event) {
    event.preventDefault();
    event.stopPropagation();
    registerIntegrityViolation(
      'Copy, paste, cut, drag/drop, and context menu are blocked during response.'
    );
  }

  async function handleStudentAnswerFileChange(event) {
    const file = event.target.files?.[0] || null;
    setStudentAnswerFile(file);
    setOcrNotice('');
    setOcrError('');
    setOcrProgress(0);

    if (!file) return;
    if (isPdfFile(file)) {
      setOcrNotice('PDF selected. Auto text extraction currently works best with image files.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setOcrNotice('OCR auto-fill supports image files. You can still submit typed text.');
      return;
    }

    try {
      setOcrLoading(true);
      const { data } = await Tesseract.recognize(file, 'eng', {
        logger: (message) => {
          if (message.status === 'recognizing text') {
            setOcrProgress(Math.round((message.progress || 0) * 100));
          }
        }
      });

      const extracted = String(data?.text || '')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (!extracted) {
        setOcrError('No readable text found in uploaded image.');
        return;
      }

      setAnswerText((prev) => (prev.trim() ? `${prev.trim()}\n\n${extracted}` : extracted));
      setOcrNotice('Handwritten text extracted and added to answer box. You can edit it.');
    } catch (_error) {
      setOcrError('Could not extract text from image. Try a clearer handwritten image.');
    } finally {
      setOcrLoading(false);
    }
  }

  function runQuickCalc() {
    try {
      const value = evaluateExpression(quickCalcExpression);
      setQuickCalcResult(formatResult(value));
    } catch (_error) {
      setQuickCalcResult('Invalid expression');
    }
  }

  async function copyShareLink() {
    if (!createdShareLink) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(createdShareLink);
        setCreateNotice('Share link copied.');
      }
    } catch (_error) {
      setCreateNotice(`Share link: ${createdShareLink}`);
    }
  }

  return (
    <section className="subjective-test-block" aria-label="Subjective Forms Test">
      <div className="panel-row panel-row-space">
        <h2>Subjective Quiz (Forms Style)</h2>
      </div>

      <p className="hint-text">
        Microsoft Forms-style workflow: teacher schedules open/close time, students submit once,
        and teacher reviews before marks are published.
      </p>

      <div className="filter-row subjective-mode-row">
        <button
          type="button"
          className={`pill-btn ${mode === 'student' ? 'pill-btn-active' : ''}`}
          onClick={() => setMode('student')}
        >
          Student Form
        </button>
        <button
          type="button"
          className={`pill-btn ${mode === 'teacher' ? 'pill-btn-active' : ''}`}
          onClick={() => {
            if (canUseTeacherMode) setMode('teacher');
          }}
          disabled={!canUseTeacherMode}
          title={
            canUseTeacherMode
              ? 'Teacher Form'
              : 'Teacher mode is available only for accounts assigned as teacher/admin by admin.'
          }
        >
          Teacher Form
        </button>
      </div>

      {!canUseTeacherMode ? (
        <p className="hint-text">
          Teacher mode is locked for this account. Ask admin to assign `teacher` role.
        </p>
      ) : null}

      {mode === 'teacher' ? (
        <div className="subjective-grid">
          <article className="subjective-card">
            <h3>Create New Test Form</h3>
            <form className="form-grid subjective-create-form" onSubmit={handleCreateTest}>
              <label className="subjective-form-item" htmlFor="subj-title">
                <span className="subjective-form-title">Test Title</span>
                <input
                  id="subj-title"
                  className="text-input"
                  value={teacherCreate.title}
                  onChange={(event) =>
                    setTeacherCreate((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Example: English Subjective Test"
                />
              </label>

              <label className="subjective-form-item" htmlFor="subj-description">
                <span className="subjective-form-title">Instructions</span>
                <textarea
                  id="subj-description"
                  className="text-input"
                  rows={3}
                  value={teacherCreate.description}
                  onChange={(event) =>
                    setTeacherCreate((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="General instructions for students"
                />
              </label>

              <label className="subjective-form-item" htmlFor="subj-question-text">
                <span className="subjective-form-title">Subjective Question (Required)</span>
                <textarea
                  id="subj-question-text"
                  className="text-input subjective-question-textarea"
                  rows={5}
                  value={teacherCreate.questionText}
                  onChange={(event) =>
                    setTeacherCreate((prev) => ({ ...prev, questionText: event.target.value }))
                  }
                  placeholder="Write full question text exactly as students should answer"
                />
              </label>

              <div className="subjective-compact-grid subjective-compact-grid-create">
                <label className="subjective-field-wrap" htmlFor="subj-duration">
                  <span>Duration (minutes)</span>
                  <input
                    id="subj-duration"
                    className="text-input"
                    type="number"
                    min={5}
                    max={300}
                    value={teacherCreate.durationMinutes}
                    onChange={(event) =>
                      setTeacherCreate((prev) => ({ ...prev, durationMinutes: event.target.value }))
                    }
                  />
                </label>

                <label className="subjective-field-wrap" htmlFor="subj-total-marks">
                  <span>Total Marks</span>
                  <input
                    id="subj-total-marks"
                    className="text-input"
                    type="number"
                    min={1}
                    max={1000}
                    value={teacherCreate.totalMarks}
                    onChange={(event) =>
                      setTeacherCreate((prev) => ({ ...prev, totalMarks: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="subjective-compact-grid subjective-compact-grid-create">
                <label className="subjective-field-wrap" htmlFor="subj-start-at">
                  <span>Start Date</span>
                  <input
                    id="subj-start-at"
                    className="text-input"
                    type="date"
                    value={startDateValue}
                    onChange={(event) => updateTeacherDateTimeField('startAt', 'date', event.target.value)}
                  />
                </label>

                <label className="subjective-field-wrap" htmlFor="subj-start-time">
                  <span>Start Time</span>
                  <input
                    id="subj-start-time"
                    className="text-input"
                    type="time"
                    step={60}
                    value={startTimeValue}
                    onChange={(event) => updateTeacherDateTimeField('startAt', 'time', event.target.value)}
                  />
                </label>
              </div>

              <div className="subjective-compact-grid subjective-compact-grid-create">
                <label className="subjective-field-wrap" htmlFor="subj-end-at">
                  <span>End Date</span>
                  <input
                    id="subj-end-at"
                    className="text-input"
                    type="date"
                    value={endDateValue}
                    onChange={(event) => updateTeacherDateTimeField('endAt', 'date', event.target.value)}
                  />
                </label>

                <label className="subjective-field-wrap" htmlFor="subj-end-time">
                  <span>End Time</span>
                  <input
                    id="subj-end-time"
                    className="text-input"
                    type="time"
                    step={60}
                    value={endTimeValue}
                    onChange={(event) => updateTeacherDateTimeField('endAt', 'time', event.target.value)}
                  />
                </label>
              </div>

              <div className="subjective-compact-grid subjective-compact-grid-create-3">
                <label className="subjective-field-wrap" htmlFor="subj-teacher-name">
                  <span>Teacher Name</span>
                  <input
                    id="subj-teacher-name"
                    className="text-input"
                    value={teacherCreate.teacherName}
                    onChange={(event) =>
                      setTeacherCreate((prev) => ({ ...prev, teacherName: event.target.value }))
                    }
                    placeholder="Optional"
                  />
                </label>

                <label className="subjective-field-wrap" htmlFor="subj-teacher-email">
                  <span>Teacher Email</span>
                  <input
                    id="subj-teacher-email"
                    className="text-input"
                    type="email"
                    required
                    value={teacherCreate.teacherEmail}
                    onChange={(event) =>
                      setTeacherCreate((prev) => ({ ...prev, teacherEmail: event.target.value }))
                    }
                    placeholder="Required for proctoring mail"
                  />
                </label>

                <label className="subjective-field-wrap" htmlFor="subj-teacher-passcode">
                  <span>Teacher Passcode</span>
                  <input
                    id="subj-teacher-passcode"
                    className="text-input"
                    type="password"
                    value={teacherCreate.teacherPasscode}
                    onChange={(event) =>
                      setTeacherCreate((prev) => ({ ...prev, teacherPasscode: event.target.value }))
                    }
                    placeholder="Required for response management"
                  />
                </label>
              </div>

              <label className="subjective-form-item subjective-form-item-file" htmlFor="subj-question-pdf">
                <span className="subjective-form-title">Question PDF (Optional)</span>
                <input
                  id="subj-question-pdf"
                  className="text-input"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setQuestionPdfFile(event.target.files?.[0] || null)}
                />
              </label>

              <button
                type="submit"
                className="action-btn"
                disabled={createLoading || !teacherCreate.teacherEmail.trim()}
              >
                {createLoading ? 'Creating...' : 'Create Form Test'}
              </button>
            </form>

            {createError ? <p className="error-text">{createError}</p> : null}
            {createNotice ? <p className="hint-text">{createNotice}</p> : null}

            {createdTest ? (
              <div className="subjective-meta-box">
                <p>
                  <strong>Test ID:</strong> {createdTest.id}
                </p>
                <p>
                  <strong>Join Code:</strong> {createdTest.joinCode}
                </p>
                <p>
                  <strong>Teacher Email:</strong> {createdTest.teacherEmail}
                </p>
                <p>
                  <strong>Schedule:</strong> {formatDateTime(createdTest.startAt)} to{' '}
                  {formatDateTime(createdTest.endAt)}
                </p>
                <div className="button-row">
                  {createdTest.questionPdf ? (
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => openPdf(createdTest.questionPdf)}
                    >
                      Open Questions PDF
                    </button>
                  ) : null}
                  {createdShareLink ? (
                    <button type="button" className="ghost-btn" onClick={copyShareLink}>
                      Copy Share Link
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </article>

          <article className="subjective-card">
            <h3>Responses & Marks</h3>

            <form className="subjective-manage-row" onSubmit={handleTeacherLogin}>
              <input
                className="text-input"
                type="email"
                placeholder="Teacher Email"
                value={teacherLoginEmail}
                onChange={(event) => setTeacherLoginEmail(event.target.value)}
              />
              <input
                className="text-input"
                type="password"
                placeholder="Teacher Passcode"
                value={teacherLoginPasscode}
                onChange={(event) => setTeacherLoginPasscode(event.target.value)}
              />
              <button type="submit" className="action-btn" disabled={teacherAuthLoading}>
                {teacherAuthLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>
            {teacherAuthError ? <p className="error-text">{teacherAuthError}</p> : null}

            {teacherAuth?.teacherEmail ? (
              <div className="subjective-manage-stack">
                <p className="hint-text">Logged in as {teacherAuth.teacherEmail}</p>
                <form className="subjective-manage-row" onSubmit={handleLoadTeacherPanel}>
                  <select
                    className="subjective-level-select"
                    value={manageTestId}
                    onChange={(event) => setManageTestId(event.target.value)}
                  >
                    <option value="">Select a form</option>
                    {teacherServerTests.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} ({item.joinCode})
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="action-btn" disabled={manageLoading}>
                    {manageLoading ? 'Loading...' : 'Load Form'}
                  </button>
                  <button type="button" className="ghost-btn" onClick={handleTeacherLogout}>
                    Logout
                  </button>
                </form>
              </div>
            ) : null}

            {manageError ? <p className="error-text">{manageError}</p> : null}
            {manageNotice ? <p className="hint-text">{manageNotice}</p> : null}

            {manageData?.test ? (
              <div className="subjective-manage-stack">
                <div className="subjective-meta-box">
                  <p>
                    <strong>{manageData.test.title}</strong>
                  </p>
                  <p>
                    Join Code: <strong>{manageData.test.joinCode}</strong>
                  </p>
                  <p>Teacher Email: {manageData.test.teacherEmail || 'N/A'}</p>
                  <p>{manageData.test.questionText}</p>
                  <p>
                    Duration: {manageData.test.durationMinutes} min | Total Marks:{' '}
                    {manageData.test.totalMarks}
                  </p>
                  <div className="button-row">
                    {manageData.test.questionPdf ? (
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => openPdf(manageData.test.questionPdf)}
                      >
                        View Questions PDF
                      </button>
                    ) : null}
                    {manageData.test.answerKeyPdf ? (
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => openPdf(manageData.test.answerKeyPdf)}
                      >
                        View Answer Key PDF
                      </button>
                    ) : null}
                  </div>
                </div>

                <form className="subjective-manage-edit-form" onSubmit={handleUpdateTeacherForm}>
                  <h4>Edit Form Details</h4>
                  <p className="hint-text">
                    Teachers can edit only question paper (text/PDF) and time window (duration,
                    start, end).
                  </p>

                  <label className="subjective-form-item" htmlFor="manage-title-input">
                    <span className="subjective-form-title">Test Title</span>
                    <input
                      id="manage-title-input"
                      className="text-input"
                      disabled
                      value={manageEditForm.title}
                      onChange={(event) =>
                        setManageEditForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                    />
                  </label>

                  <label className="subjective-form-item" htmlFor="manage-description-input">
                    <span className="subjective-form-title">Instructions</span>
                    <textarea
                      id="manage-description-input"
                      className="text-input"
                      disabled
                      rows={3}
                      value={manageEditForm.description}
                      onChange={(event) =>
                        setManageEditForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                    />
                  </label>

                  <label className="subjective-form-item" htmlFor="manage-question-input">
                    <span className="subjective-form-title">Subjective Question</span>
                    <textarea
                      id="manage-question-input"
                      className="text-input subjective-question-textarea"
                      rows={5}
                      value={manageEditForm.questionText}
                      onChange={(event) =>
                        setManageEditForm((prev) => ({ ...prev, questionText: event.target.value }))
                      }
                    />
                  </label>

                  <div className="subjective-compact-grid subjective-compact-grid-create">
                    <label className="subjective-field-wrap" htmlFor="manage-duration-input">
                      <span>Duration (minutes)</span>
                      <input
                        id="manage-duration-input"
                        className="text-input"
                        type="number"
                        min={5}
                        max={300}
                        value={manageEditForm.durationMinutes}
                        onChange={(event) =>
                          setManageEditForm((prev) => ({ ...prev, durationMinutes: event.target.value }))
                        }
                      />
                    </label>

                    <label className="subjective-field-wrap" htmlFor="manage-total-marks-input">
                      <span>Total Marks</span>
                      <input
                        id="manage-total-marks-input"
                        className="text-input"
                        disabled
                        type="number"
                        min={1}
                        max={1000}
                        value={manageEditForm.totalMarks}
                        onChange={(event) =>
                          setManageEditForm((prev) => ({ ...prev, totalMarks: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <div className="subjective-compact-grid subjective-compact-grid-create">
                    <label className="subjective-field-wrap" htmlFor="manage-start-date-input">
                      <span>Start Date</span>
                      <input
                        id="manage-start-date-input"
                        className="text-input"
                        type="date"
                        value={manageStartDateValue}
                        onChange={(event) =>
                          updateManageEditDateTimeField('startAt', 'date', event.target.value)
                        }
                      />
                    </label>

                    <label className="subjective-field-wrap" htmlFor="manage-start-time-input">
                      <span>Start Time</span>
                      <input
                        id="manage-start-time-input"
                        className="text-input"
                        type="time"
                        step={60}
                        value={manageStartTimeValue}
                        onChange={(event) =>
                          updateManageEditDateTimeField('startAt', 'time', event.target.value)
                        }
                      />
                    </label>
                  </div>

                  <div className="subjective-compact-grid subjective-compact-grid-create">
                    <label className="subjective-field-wrap" htmlFor="manage-end-date-input">
                      <span>End Date</span>
                      <input
                        id="manage-end-date-input"
                        className="text-input"
                        type="date"
                        value={manageEndDateValue}
                        onChange={(event) =>
                          updateManageEditDateTimeField('endAt', 'date', event.target.value)
                        }
                      />
                    </label>

                    <label className="subjective-field-wrap" htmlFor="manage-end-time-input">
                      <span>End Time</span>
                      <input
                        id="manage-end-time-input"
                        className="text-input"
                        type="time"
                        step={60}
                        value={manageEndTimeValue}
                        onChange={(event) =>
                          updateManageEditDateTimeField('endAt', 'time', event.target.value)
                        }
                      />
                    </label>
                  </div>

                  <div className="subjective-compact-grid subjective-compact-grid-create-3">
                    <label className="subjective-field-wrap" htmlFor="manage-teacher-name-input">
                      <span>Teacher Name</span>
                      <input
                        id="manage-teacher-name-input"
                        className="text-input"
                        disabled
                        value={manageEditForm.teacherName}
                        onChange={(event) =>
                          setManageEditForm((prev) => ({ ...prev, teacherName: event.target.value }))
                        }
                      />
                    </label>

                    <label className="subjective-field-wrap" htmlFor="manage-teacher-email-input">
                      <span>Teacher Email</span>
                      <input
                        id="manage-teacher-email-input"
                        className="text-input"
                        disabled
                        type="email"
                        value={manageEditForm.teacherEmail}
                        onChange={(event) =>
                          setManageEditForm((prev) => ({ ...prev, teacherEmail: event.target.value }))
                        }
                      />
                    </label>

                    <label className="subjective-field-wrap" htmlFor="manage-new-passcode-input">
                      <span>New Teacher Passcode (optional)</span>
                      <input
                        id="manage-new-passcode-input"
                        className="text-input"
                        disabled
                        type="password"
                        value={manageEditForm.newTeacherPasscode}
                        onChange={(event) =>
                          setManageEditForm((prev) => ({
                            ...prev,
                            newTeacherPasscode: event.target.value
                          }))
                        }
                        placeholder="Leave blank to keep current"
                      />
                    </label>
                  </div>

                  <div className="subjective-manage-stack">
                    <label className="subjective-field-wrap" htmlFor="manage-question-pdf-input">
                      <span>Replace Question PDF (optional)</span>
                      <input
                        id="manage-question-pdf-input"
                        className="text-input"
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          setManageEditQuestionPdfFile(file);
                          if (file) {
                            setManageEditRemoveQuestionPdf(false);
                          }
                        }}
                      />
                    </label>

                    <label className="subjective-inline-check">
                      <input
                        type="checkbox"
                        checked={manageEditRemoveQuestionPdf}
                        onChange={(event) => {
                          setManageEditRemoveQuestionPdf(event.target.checked);
                          if (event.target.checked) {
                            setManageEditQuestionPdfFile(null);
                          }
                        }}
                      />
                      <span>Remove existing question PDF</span>
                    </label>
                  </div>

                  <button type="submit" className="action-btn" disabled={manageEditLoading}>
                    {manageEditLoading ? 'Saving Changes...' : 'Save Form Changes'}
                  </button>
                </form>

                <div className="subjective-upload-row">
                  <input
                    className="text-input"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) => setAnswerKeyFile(event.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    className="action-btn"
                    onClick={handleUploadAnswerKey}
                    disabled={answerKeyLoading}
                  >
                    {answerKeyLoading ? 'Uploading...' : 'Upload Answer Key'}
                  </button>
                </div>

                <h4>Responses</h4>
                {manageData.submissions?.length ? (
                  <div className="subjective-submission-list">
                    {manageData.submissions.map((item) => {
                      const draft = gradeDrafts[item.id] || {
                        marksObtained: '',
                        maxMarks: manageData.test.totalMarks,
                        teacherRemark: ''
                      };

                      return (
                        <article key={item.id} className="subjective-submission-card">
                          <p>
                            <strong>{item.studentName}</strong> ({item.studentEmail})
                          </p>
                          <p>
                            Status: {item.status} | Submitted: {formatDateTime(item.submittedAt)}
                          </p>
                          <p className="subjective-answer-preview">
                            {item.answerText || 'No text answer submitted.'}
                          </p>
                          {item.answerPdf ? (
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => openPdf(item.answerPdf)}
                            >
                              View Student Answer PDF
                            </button>
                          ) : null}
                          {item.proctoringVideo ? (
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => openMedia(item.proctoringVideo)}
                            >
                              View Proctoring Video
                            </button>
                          ) : null}
                          {item.proctoringEmailStatus ? (
                            <p>
                              Proctoring Mail: {item.proctoringEmailStatus}
                              {item.proctoringEmailMessage ? ` (${item.proctoringEmailMessage})` : ''}
                            </p>
                          ) : null}

                          <div className="subjective-compact-grid">
                            <label className="subjective-field-wrap" htmlFor={`marks-${item.id}`}>
                              <span>Marks</span>
                              <input
                                id={`marks-${item.id}`}
                                className="text-input"
                                type="number"
                                min={0}
                                value={draft.marksObtained}
                                onChange={(event) =>
                                  setGradeDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      marksObtained: event.target.value
                                    }
                                  }))
                                }
                              />
                            </label>

                            <label className="subjective-field-wrap" htmlFor={`max-marks-${item.id}`}>
                              <span>Max Marks</span>
                              <input
                                id={`max-marks-${item.id}`}
                                className="text-input"
                                type="number"
                                min={1}
                                value={draft.maxMarks}
                                onChange={(event) =>
                                  setGradeDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      maxMarks: event.target.value
                                    }
                                  }))
                                }
                              />
                            </label>
                          </div>

                          <label className="upload-label" htmlFor={`remark-${item.id}`}>
                            Teacher Remark
                          </label>
                          <textarea
                            id={`remark-${item.id}`}
                            className="text-input"
                            rows={2}
                            value={draft.teacherRemark}
                            onChange={(event) =>
                              setGradeDrafts((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  teacherRemark: event.target.value
                                }
                              }))
                            }
                          />

                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => handleGradeSubmission(item.id)}
                            disabled={gradeLoadingId === item.id}
                          >
                            {gradeLoadingId === item.id ? 'Saving...' : 'Publish Marks'}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="hint-text">No student responses yet.</p>
                )}
              </div>
            ) : null}
          </article>
        </div>
      ) : (
        <div className="subjective-grid subjective-grid-single">
          <article className="subjective-card">
            <h3>Student Responder View</h3>

            <form className="subjective-manage-row" onSubmit={handleFindTestByCode}>
              <input
                className="text-input"
                placeholder="Enter Join Code"
                value={joinCodeInput}
                onChange={(event) => setJoinCodeInput(event.target.value.toUpperCase())}
              />
              <button type="submit" className="action-btn" disabled={testLoading}>
                {testLoading ? 'Finding...' : 'Open Form'}
              </button>
            </form>

            {testError ? <p className="error-text">{testError}</p> : null}
            {testNotice ? <p className="hint-text">{testNotice}</p> : null}

            {studentTest ? (
              <div className="subjective-manage-stack">
                <div className="subjective-meta-box">
                  <p>
                    <strong>{studentTest.title}</strong>
                  </p>
                  <p>
                    Status:{' '}
                    <strong
                      className={`subjective-status-pill subjective-status-pill-${studentTest.status || 'unknown'}`}
                    >
                      {getStatusLabel(studentTest.status)}
                    </strong>
                  </p>
                  <p>
                    Schedule: {formatDateTime(studentTest.startAt)} to {formatDateTime(studentTest.endAt)}
                  </p>
                  {studentTest.questionText ? (
                    <p>{studentTest.questionText}</p>
                  ) : (
                    <p className="hint-text">
                      Question content is hidden until the scheduled start time.
                    </p>
                  )}
                  <p>
                    Duration: {studentTest.durationMinutes} min | Total Marks: {studentTest.totalMarks}
                  </p>
                  {studentTest.questionPdf ? (
                    <button type="button" className="ghost-btn" onClick={() => openPdf(studentTest.questionPdf)}>
                      Open Question PDF
                    </button>
                  ) : null}
                </div>

                <form className="subjective-student-register-form" onSubmit={handleRegisterStudent}>
                  <div className="subjective-compact-grid subjective-compact-grid-create">
                    <label className="subjective-form-item" htmlFor="student-name-input">
                      <span className="subjective-form-title">Student Name</span>
                      <input
                        id="student-name-input"
                        className="text-input"
                        value={studentName}
                        onChange={(event) => setStudentName(event.target.value)}
                        placeholder="Full name"
                      />
                    </label>

                    <label className="subjective-form-item" htmlFor="student-email-input">
                      <span className="subjective-form-title">Student Email</span>
                      <input
                        id="student-email-input"
                        className="text-input"
                        type="email"
                        value={studentEmail}
                        onChange={(event) => setStudentEmail(event.target.value)}
                        placeholder="name@example.com"
                      />
                    </label>
                  </div>

                  <div className="subjective-compact-grid subjective-compact-grid-create subjective-student-register-actions">
                    <button
                      type="submit"
                      className="action-btn"
                      disabled={registerLoading || studentTest.status !== 'active'}
                    >
                      {registerLoading ? 'Registering...' : 'Register & Start'}
                    </button>

                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => refreshStudentResult({ silent: false })}
                      disabled={resultLoading || !studentEmail.trim() || !studentTest?.joinCode}
                    >
                      {resultLoading ? 'Checking Result...' : 'View Result'}
                    </button>
                  </div>
                </form>

                {studentTest.status !== 'active' ? (
                  <p className="error-text">
                    {studentTest.status === 'scheduled'
                      ? 'Form is scheduled and not active yet.'
                      : 'Form is closed.'}
                  </p>
                ) : null}

                {registerError ? <p className="error-text">{registerError}</p> : null}
                {resultError ? <p className="error-text">{resultError}</p> : null}

                {submission ? (
                  <>
                    <div className="subjective-timer-box">
                      <span>Remaining Time</span>
                      <strong>
                        {submission.status === 'submitted' || submission.status === 'graded'
                          ? 'Stopped'
                          : remainingSeconds === null
                            ? 'N/A'
                            : formatRemaining(remainingSeconds)}
                      </strong>
                    </div>

                    <p className="hint-text">
                      Status: {submission.status}
                      {submission.marksObtained !== null
                        ? ` | Marks: ${submission.marksObtained}/${submission.maxMarks || studentTest.totalMarks}`
                        : ' | Marks will appear after teacher review'}
                    </p>
                    <p className="hint-text">Integrity warnings: {integrityWarnings}/{INTEGRITY_WARNING_LIMIT}</p>
                    <p className="hint-text subjective-integrity-note">
                      Anti-cheat mode is active: copy/paste, right-click, and common shortcut keys are blocked.
                    </p>
                    <div className="subjective-proctor-box">
                      <div className="subjective-proctor-head">
                        <span>Proctor Mode</span>
                        <strong>{proctoringActive ? 'ON' : 'OFF'}</strong>
                      </div>
                      <video
                        ref={proctoringVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="subjective-proctor-video"
                      />
                      <div className="button-row">
                        {!proctoringActive ? (
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={startProctoringSession}
                            disabled={proctoringLoading || isStudentLocked}
                          >
                            {proctoringLoading ? 'Starting...' : 'Start Camera + Mic + Fullscreen'}
                          </button>
                        ) : null}
                      </div>
                      {proctoringNotice ? <p className="hint-text">{proctoringNotice}</p> : null}
                      {proctoringError ? <p className="error-text">{proctoringError}</p> : null}
                    </div>

                    <div className="subjective-calc-box">
                      <p className="subjective-result-title">In-Built Calculator (during test)</p>
                      <div className="subjective-upload-row">
                        <input
                          className="text-input"
                          value={quickCalcExpression}
                          onChange={(event) => setQuickCalcExpression(event.target.value)}
                          placeholder="Example: (25+5)*3"
                        />
                        <button type="button" className="ghost-btn" onClick={runQuickCalc}>
                          Calculate
                        </button>
                      </div>
                      <p className="hint-text">Result: {quickCalcResult || 'N/A'}</p>
                    </div>

                    {submission.marksObtained !== null ? (
                      <div className={`subjective-result-card ${resultImpression?.className || ''}`}>
                        <p className="subjective-result-title">
                          Result Impression:{' '}
                          <strong>
                            {resultImpression ? `${resultImpression.emoji} ${resultImpression.label}` : 'N/A'}
                          </strong>
                        </p>
                        <p>
                          Score: {submission.marksObtained}/{submission.maxMarks || studentTest.totalMarks}
                          {resultImpression ? ` (${Math.round(resultImpression.percentage)}%)` : ''}
                        </p>
                        <p>
                          Teacher Remark:{' '}
                          {resultImpression ? `${resultImpression.emoji} ` : '📝 '}
                          {submission.teacherRemark || 'No remark added yet.'}
                        </p>
                        <p>Reviewed At: {formatDateTime(submission.gradedAt)}</p>
                      </div>
                    ) : null}

                    {submission.answerPdf ? (
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => openPdf(submission.answerPdf)}
                      >
                        Open Uploaded Answer PDF
                      </button>
                    ) : null}

                    <form onSubmit={handleSubmitAnswer}>
                      <label className="upload-label" htmlFor="student-answer-input">
                        Your Subjective Answer
                      </label>
                      <textarea
                        id="student-answer-input"
                        className="text-input subjective-answer-input"
                        rows={7}
                        value={answerText}
                        placeholder="Type your answers in this space by adding separation to each questions."
                        onChange={(event) => {
                          setAnswerText(event.target.value);
                          if (submitError) setSubmitError('');
                        }}
                        onPaste={blockRestrictedAction}
                        onCopy={blockRestrictedAction}
                        onCut={blockRestrictedAction}
                        onDrop={blockRestrictedAction}
                        onDragStart={blockRestrictedAction}
                        onContextMenu={blockRestrictedAction}
                        onKeyDown={(event) => {
                          const key = event.key.toLowerCase();
                          if (
                            (event.ctrlKey || event.metaKey) &&
                            ['c', 'v', 'x', 'insert'].includes(key)
                          ) {
                            blockRestrictedAction(event);
                          }
                          if (event.shiftKey && key === 'insert') {
                            blockRestrictedAction(event);
                          }
                        }}
                        disabled={isStudentLocked}
                      />

                      <label className="upload-label" htmlFor="student-answer-pdf-input">
                        Upload Answer File (handwritten image/PDF)
                      </label>
                      <input
                        id="student-answer-pdf-input"
                        className="text-input"
                        type="file"
                        accept="application/pdf,.pdf,image/*"
                        onChange={handleStudentAnswerFileChange}
                        disabled={isStudentLocked}
                      />
                      {studentAnswerFile ? (
                        <p className="hint-text">Selected file: {studentAnswerFile.name}</p>
                      ) : null}
                      {ocrLoading ? <p className="hint-text">Extracting text... {ocrProgress}%</p> : null}
                      {ocrNotice ? <p className="hint-text">{ocrNotice}</p> : null}
                      {ocrError ? <p className="error-text">{ocrError}</p> : null}

                      <div className="panel-row panel-row-space subjective-action-row">
                        <p className="hint-text subjective-word-count">
                          Words: {answerText.trim() ? answerText.trim().split(/\s+/).length : 0}
                        </p>
                        <button
                          type="submit"
                          className="action-btn"
                          disabled={
                            submitLoading ||
                            isStudentLocked ||
                            (answerText.trim().length < 8 &&
                              !(studentAnswerFile && isPdfFile(studentAnswerFile)) &&
                              !submission?.answerPdf)
                          }
                        >
                          {submitLoading ? 'Submitting...' : 'Submit Final Response'}
                        </button>
                      </div>
                    </form>

                    {clipboardNotice ? <p className="error-text">{clipboardNotice}</p> : null}
                    {submitError ? <p className="error-text">{submitError}</p> : null}
                    {integrityLocked ? (
                      <p className="error-text">
                        Response locked due to repeated integrity violations.
                      </p>
                    ) : null}
                    {remainingSeconds !== null && remainingSeconds <= 0 ? (
                      <p className="error-text">Time is over. Form is locked.</p>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </article>
        </div>
      )}
    </section>
  );
}
