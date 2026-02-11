import { request } from './http.js';

export async function fetchHistory(source) {
  const params = new URLSearchParams();
  if (source && source !== 'ALL') {
    params.set('source', source);
  }

  const data = await request(`/history${params.toString() ? `?${params.toString()}` : ''}`);
  return data.items || [];
}

export async function createHistoryEntry(payload) {
  const data = await request('/history', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return data.item;
}

export async function deleteHistoryEntry(id) {
  await request(`/history/${id}`, { method: 'DELETE' });
}

export async function clearHistory(source) {
  const params = new URLSearchParams();
  if (source && source !== 'ALL') {
    params.set('source', source);
  }

  await request(`/history${params.toString() ? `?${params.toString()}` : ''}`, {
    method: 'DELETE'
  });
}
