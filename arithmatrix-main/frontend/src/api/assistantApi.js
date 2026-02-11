import { request } from './http.js';

export async function sendAssistantMessage({ message, history = [] }) {
  return request('/assistant/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history })
  });
}

export async function solveMathQuestion({ question }) {
  return request('/assistant/solve-math', {
    method: 'POST',
    body: JSON.stringify({ question })
  });
}
