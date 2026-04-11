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

const CLOUDINARY_CLOUD = 'dvcpczwsi';
const CLOUDINARY_PRESET = 'Social App';

export async function uploadFile({ file }) {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`,
    { method: 'POST', body: form }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return { file_url: data.secure_url, url: data.secure_url };
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
