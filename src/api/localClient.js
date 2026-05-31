// Local API client — replaces @base44/sdk calls with fetch() to Express backend

const BASE = '/api';

// ── Multi-tenant token ────────────────────────────────────────────────────────
// When Hovera opens this app it appends `?t=<jwt>` (a token identifying the
// salon). We capture it once into localStorage and send it on every API call so
// the backend scopes data to that salon. Standalone (no token) → "default".
const TOKEN_KEY = 'social_tenant_token';
try {
  const t = new URLSearchParams(window.location.search).get('t');
  if (t) localStorage.setItem(TOKEN_KEY, t);
} catch { /* SSR / no window */ }

export function tenantToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}
function authHeaders() {
  const t = tenantToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...authHeaders(),
    },
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

// Fetch a remote image by URL through the backend (avoids CORS / hotlink
// blocking) and get back an inline data URL ready to drop on the canvas.
export async function fetchImageByUrl(url) {
  const { dataUrl } = await req('POST', '/fetch-image', { url });
  return dataUrl;
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
