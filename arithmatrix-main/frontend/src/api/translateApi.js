import { request } from './http.js';

const DEFAULT_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' }
];

export async function fetchTranslateLanguages() {
  try {
    const data = await request('/translate/supported');
    return data?.languages?.length ? data.languages : DEFAULT_LANGUAGES;
  } catch (_error) {
    return DEFAULT_LANGUAGES;
  }
}

export async function translateText({ text, from, to }) {
  return request('/translate', {
    method: 'POST',
    body: JSON.stringify({ text, from, to })
  });
}
