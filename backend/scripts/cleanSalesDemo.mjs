// حذف بيانات العرض التي زرعها seedSalesDemo.mjs — نظيف وآمن:
//   • يحذف صوالين التجربة (معرّفها demo-sal-*) عبر DELETE /salons/:id
//   • يحذف المناديب التجريبيين (اسم المستخدم يبدأ بـ demo_)
// لا يمسّ أي بيانات حقيقية.
//
// التشغيل: node scripts/cleanSalesDemo.mjs <baseUrl> <superUser> <superPass>

const BASE = process.argv[2];
const SUSER = process.argv[3];
const SPASS = process.argv[4];
if (!BASE || !SUSER || !SPASS) {
  console.error('الاستخدام: node scripts/cleanSalesDemo.mjs <baseUrl> <superUser> <superPass>');
  process.exit(1);
}
const API = `${BASE.replace(/\/+$/, '')}/api/sales`;

async function req(method, path, token, body) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const r = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let parsed = null;
  try { parsed = await r.json(); } catch { /* غير JSON */ }
  return { status: r.status, body: parsed };
}
const login = async (u, p) => (await req('POST', '/login', null, { username: u, password: p })).body?.token;

async function main() {
  console.log(`\n=== حذف بيانات العرض من ${BASE} ===\n`);

  const superTok = await login(SUSER, SPASS);
  if (!superTok) { console.error('❌ فشل دخول السوبر أدمن.'); process.exit(1); }

  // 1) صوالين التجربة (معرّف demo-sal-*).
  const salons = (await req('GET', '/salons', superTok)).body || [];
  const demoSalons = salons.filter((s) => String(s.id).startsWith('demo-sal-'));
  let delS = 0;
  for (const s of demoSalons) {
    const { status } = await req('DELETE', `/salons/${s.id}`, superTok);
    if (status === 200) { delS++; console.log(`✅ حُذف صالون: ${s.name}`); }
    else console.log(`⚠️(${status}) تعذّر حذف ${s.id} — تأكّد إن مسار الحذف منشور.`);
  }

  // 2) المناديب التجريبيون (اسم المستخدم يبدأ بـ demo_).
  const members = (await req('GET', '/members', superTok)).body || [];
  const demoMembers = members.filter((m) => String(m.username).startsWith('demo_'));
  let delM = 0;
  for (const m of demoMembers) {
    const { status } = await req('DELETE', `/members/${m.id}`, superTok);
    if (status === 200) { delM++; console.log(`✅ حُذف مندوب: ${m.display_name}`); }
    else console.log(`⚠️(${status}) تعذّر حذف العضو ${m.username}`);
  }

  console.log(`\n🎉 انتهى التنظيف: حُذف ${delS} صالون تجربة و ${delM} مندوب تجربة. بياناتك الحقيقية سليمة.\n`);
}

main().catch((e) => { console.error('💥 خطأ:', e.stack || e.message); process.exit(1); });
