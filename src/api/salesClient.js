// عميل API لبوابة فريق المبيعات «هوفيرا».
// يتعامل مع التوكن (يُخزَّن محلياً) ويمرّره في ترويسة كل طلب.

const BASE = '/api/sales';
const TOKEN_KEY = 'hovera_token';
const USER_KEY = 'hovera_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}

function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function req(method, path, body, isForm = false) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  // 401 على الدخول = بيانات اعتماد خاطئة → نعرض رسالة الخادم الحقيقية.
  // 401 على أي مسار آخر = جلسة منتهية → نمسحها ونطلب الدخول من جديد.
  if (res.status === 401 && path !== '/login') {
    clearSession();
    throw new Error('انتهت الجلسة. الرجاء تسجيل الدخول من جديد.');
  }
  if (!res.ok) {
    let msg = 'حدث خطأ غير متوقع';
    try { msg = (await res.json()).error || msg; } catch { /* تجاهل */ }
    throw new Error(msg);
  }
  // قد تكون الاستجابة ملفاً (نسخة/إكسل) — يتعامل معها المُستدعي مباشرة.
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res;
}

export const salesApi = {
  // المصادقة
  async login(username, password) {
    const data = await req('POST', '/login', { username, password });
    setSession(data.token, data.user);
    return data.user;
  },
  async me() { return req('GET', '/me'); },
  async logout() {
    try { await req('POST', '/logout'); } catch { /* تجاهل */ }
    clearSession();
  },

  // الصوالين
  salons(params = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '')
    ).toString();
    return req('GET', `/salons${qs ? `?${qs}` : ''}`);
  },
  salonStats() { return req('GET', '/salons/stats'); },
  salonFilters() { return req('GET', '/salons/filters'); },
  updateSalon(id, data) { return req('PUT', `/salons/${id}`, data); },
  salonLog(id) { return req('GET', `/salons/${id}/log`); },

  // متابعة الفريق (للمدير)
  oversight() { return req('GET', '/oversight'); },

  // الأعضاء
  members() { return req('GET', '/members'); },
  addMember(data) { return req('POST', '/members', data); },
  deleteMember(id) { return req('DELETE', `/members/${id}`); },

  // القوالب
  templates() { return req('GET', '/templates'); },
  addTemplate(body) { return req('POST', '/templates', { body }); },
  updateTemplate(id, body) { return req('PUT', `/templates/${id}`, { body }); },
  deleteTemplate(id) { return req('DELETE', `/templates/${id}`); },
  seedDefaultTemplates() { return req('POST', '/templates/seed-defaults'); },

  // البيانات والنُّسخ
  async backup() {
    const res = await req('GET', '/backup');
    return res; // Response (blob)
  },
  importBackup(data) { return req('POST', '/import', data); },
  async exportExcel() {
    const res = await req('GET', '/export');
    return res; // Response (blob)
  },
  uploadExcel(file) {
    const form = new FormData();
    form.append('file', file);
    return req('POST', '/upload-excel', form, true);
  },
};
