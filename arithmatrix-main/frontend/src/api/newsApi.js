import { request } from './http.js';

export async function fetchNewsFeed(topic, { forceRefresh = false } = {}) {
  const params = new URLSearchParams();
  if (topic) {
    params.set('topic', topic);
  }
  if (forceRefresh) {
    params.set('refresh', '1');
  }

  const suffix = params.toString();
  return request(`/news/feed${suffix ? `?${suffix}` : ''}`);
}
