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
  addSalon(data) { return req('POST', '/salons', data); },
  updateSalon(id, data) { return req('PUT', `/salons/${id}`, data); },
  contactSalon(id, channel) { return req('POST', `/salons/${id}/contact`, { channel }); },
  deleteSalon(id) { return req('DELETE', `/salons/${id}`); },
  salonLog(id) { return req('GET', `/salons/${id}/log`); },

  // متابعة الفريق (للمدير)
  oversight() { return req('GET', '/oversight'); },

  // الأعضاء
  members() { return req('GET', '/members'); },
  addMember(data) { return req('POST', '/members', data); },
  updateMember(id, data) { return req('PUT', `/members/${id}`, data); },
  deleteMember(id) { return req('DELETE', `/members/${id}`); },

  // القوالب
  templates() { return req('GET', '/templates'); },
  addTemplate(body) { return req('POST', '/templates', { body }); },
  updateTemplate(id, body) { return req('PUT', `/templates/${id}`, { body }); },
  deleteTemplate(id) { return req('DELETE', `/templates/${id}`); },
  seedDefaultTemplates() { return req('POST', '/templates/seed-defaults'); },
  uploadTemplateFile(id, file) {
    const form = new FormData();
    form.append('file', file);
    return req('POST', `/templates/${id}/file`, form, true);
  },
  deleteTemplateFile(id) { return req('DELETE', `/templates/${id}/file`); },

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
  markCampaign(file) {
    const form = new FormData();
    form.append('file', file);
    return req('POST', '/mark-campaign', form, true);
  },

  // وارد ردود واتساب
  waReplies(params = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '')
    ).toString();
    return req('GET', `/wa/replies${qs ? `?${qs}` : ''}`);
  },
  waSetHandled(id, handled) { return req('POST', `/wa/replies/${id}/handled`, { handled }); },
  waStats(params = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '')
    ).toString();
    return req('GET', `/wa/stats${qs ? `?${qs}` : ''}`);
  },

  // ── حملات الواتساب (المرحلة ٢) ──
  waTemplatesLive() { return req('GET', '/wa/templates-live'); },
  waRecipientsPreview(params = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '')
    ).toString();
    return req('GET', `/wa/recipients-preview${qs ? `?${qs}` : ''}`);
  },
  waCampaigns() { return req('GET', '/wa/campaigns'); },
  waCampaign(id) { return req('GET', `/wa/campaigns/${id}`); },
  waCreateCampaign(formData) { return req('POST', '/wa/campaigns', formData, true); },
  waStartCampaign(id) { return req('POST', `/wa/campaigns/${id}/start`); },
  waPauseCampaign(id) { return req('POST', `/wa/campaigns/${id}/pause`); },
  waCancelCampaign(id) { return req('POST', `/wa/campaigns/${id}/cancel`); },
  waDeleteCampaign(id) { return req('DELETE', `/wa/campaigns/${id}`); },
  async waExportCampaign(id) { return req('GET', `/wa/campaigns/${id}/export`); },

  // ── متابعة الفريق (المرحلة ٢) ──
  assignSalon(id, ownerId) { return req('POST', `/salons/${id}/assign`, { owner_id: ownerId }); },
  myTasks() { return req('GET', '/salons/my-tasks'); },
  myClients(filter) { return req('GET', `/salons/my-clients?filter=${encodeURIComponent(filter || 'interested')}`); },
  myStats() { return req('GET', '/salons/my-stats'); },
  teamBoard() { return req('GET', '/wa/team-board'); },
  distributeTasks() { return req('POST', '/wa/distribute'); },
  campaignTaskCount() { return req('GET', '/wa/campaign-task-count'); },
  resetDistributeCampaign() { return req('POST', '/wa/reset-distribute-campaign'); },
  reassignFrom(userId) { return req('POST', '/wa/reassign-from', { user_id: userId }); },
  repTasks(userId, filter) { return req('GET', `/wa/rep-tasks/${userId}?filter=${encodeURIComponent(filter || 'awaiting')}`); },

  // محادثة داخل النظام (عبر رقم الأعمال)
  waThread(id) { return req('GET', `/salons/${id}/wa-thread`); },
  waSendMessage(id, text) { return req('POST', `/salons/${id}/wa-send`, { text }); },
  waSendImage(id, file, caption) {
    const form = new FormData();
    form.append('image', file);
    if (caption) form.append('caption', caption);
    return req('POST', `/salons/${id}/wa-send-image`, form, true);
  },
  async waMediaUrl(mediaId) {
    const res = await req('GET', `/wa/media/${mediaId}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};
