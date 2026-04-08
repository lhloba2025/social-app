// Local API client — replaces @base44/sdk calls with fetch() to Express backend

const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {},
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

function entity(route) {
  return {
    list: (sort, limit) => {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString() ? `?${params}` : '';
      return req('GET', `/${route}${qs}`);
    },
    get: (id) => req('GET', `/${route}/${id}`),
    create: (data) => req('POST', `/${route}`, data),
    update: (id, data) => req('PUT', `/${route}/${id}`, data),
    delete: (id) => req('DELETE', `/${route}/${id}`),
  };
}

export async function uploadFile({ file }) {
  const form = new FormData();
  form.append('file', file);
  return req('POST', '/upload', form);
}

export const localApi = {
  entities: {
    Design: entity('designs'),
    Media: entity('media'),
    Logo: entity('logos'),
    SocialAccount: entity('social-accounts'),
  },
  uploadFile,
};
