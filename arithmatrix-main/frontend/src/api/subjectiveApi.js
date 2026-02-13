import { request } from './http.js';

export async function createSubjectiveTest(payload) {
  return request('/subjective/tests', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function loginTeacherSubjective(payload) {
  return request('/subjective/teachers/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getStudentSubjectiveTestByCode(joinCode) {
  return request(`/subjective/tests/by-code/${encodeURIComponent(joinCode)}`);
}

export async function registerStudentForSubjectiveTest(joinCode, payload) {
  return request(`/subjective/tests/${encodeURIComponent(joinCode)}/register`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getStudentSubjectiveResult(joinCode, studentEmail) {
  const params = new URLSearchParams({ studentEmail });
  return request(`/subjective/tests/${encodeURIComponent(joinCode)}/result?${params.toString()}`);
}

export async function submitSubjectiveAnswers(joinCode, payload) {
  return request(`/subjective/tests/${encodeURIComponent(joinCode)}/submit`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function uploadSubjectiveProctoringEvidence(joinCode, payload) {
  return request(`/subjective/tests/${encodeURIComponent(joinCode)}/proctoring`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getTeacherSubjectiveManage(testId, teacherPasscode) {
  const params = new URLSearchParams({ teacherPasscode });
  return request(`/subjective/tests/${encodeURIComponent(testId)}/manage?${params.toString()}`);
}

export async function updateSubjectiveTest(testId, payload) {
  return request(`/subjective/tests/${encodeURIComponent(testId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function uploadSubjectiveAnswerKey(testId, payload) {
  return request(`/subjective/tests/${encodeURIComponent(testId)}/answer-key`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function gradeSubjectiveSubmission(submissionId, payload) {
  return request(`/subjective/submissions/${encodeURIComponent(submissionId)}/grade`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}
