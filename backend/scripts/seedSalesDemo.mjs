// بذرة بيانات عرض لبوابة المبيعات: مناديب تجربة + صوالين تجربة مُعلّمة بوضوح
// ومسندة لهم بحالات متنوّعة — لاستعراض الصفوف وتبويب المتابعة.
//
// كل شيء مُعلّم للحذف النظيف لاحقاً عبر cleanSalesDemo.mjs:
//   • أسماء المستخدمين تبدأ بـ demo_
//   • معرّفات الصوالين تبدأ بـ demo-sal-
//
// التشغيل: node scripts/seedSalesDemo.mjs <baseUrl> <superUser> <superPass>

const BASE = process.argv[2];
const SUSER = process.argv[3];
const SPASS = process.argv[4];
if (!BASE || !SUSER || !SPASS) {
  console.error('الاستخدام: node scripts/seedSalesDemo.mjs <baseUrl> <superUser> <superPass>');
  process.exit(1);
}
const API = `${BASE.replace(/\/+$/, '')}/api/sales`;

async function req(method, path, token, body, raw = false) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const r = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (raw) return { status: r.status, res: r };
  let parsed = null;
  try { parsed = await r.json(); } catch { /* غير JSON */ }
  return { status: r.status, body: parsed };
}
const login = async (u, p) => (await req('POST', '/login', null, { username: u, password: p })).body?.token;

const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const todayStr = iso(today);
const pastStr = iso(new Date(today.getTime() - 5 * 86400000));   // قبل 5 أيام (متابعة فائتة)

// المناديب التجريبيون (أسماء المستخدمين بادئتها demo_ للحذف النظيف).
const REPS = [
  { display_name: 'ديما (تجربة)', username: 'demo_dima', password: 'demo1234', role: 'agent' },
  { display_name: 'سارة (تجربة)', username: 'demo_sara', password: 'demo1234', role: 'agent' },
  { display_name: 'منى (تجربة - مديرة)', username: 'demo_mona', password: 'demo1234', role: 'admin' },
];

// صوالين تجربة مُعلّمة (معرّفاتها demo-sal-* للحذف النظيف). لا تمسّ الصوالين الحقيقية.
const SALONS = [
  { id: 'demo-sal-1', name: '🧪 تجربة - صالون لمسة جمال', phone: '0500000001', phone_key: '0500000001', city: 'الرياض', district: 'العليا', rating: 4.7, reviews_count: 210, type: 'booking_platform' },
  { id: 'demo-sal-2', name: '🧪 تجربة - مركز روان', phone: '0500000002', phone_key: '0500000002', city: 'الرياض', district: 'النخيل', rating: 4.2, reviews_count: 88, type: 'opportunity' },
  { id: 'demo-sal-3', name: '🧪 تجربة - صالون الأميرة', phone: '0500000003', phone_key: '0500000003', city: 'جدة', district: 'الروضة', rating: 4.9, reviews_count: 530, type: 'booking_platform' },
  { id: 'demo-sal-4', name: '🧪 تجربة - بيوتي لاونج', phone: '0500000004', phone_key: '0500000004', city: 'جدة', district: 'الشاطئ', rating: 3.8, reviews_count: 41, type: 'opportunity' },
  { id: 'demo-sal-5', name: '🧪 تجربة - صالون نقاء', phone: '0500000005', phone_key: '0500000005', city: 'الدمام', district: 'الفيصلية', rating: 4.4, reviews_count: 120, type: 'opportunity' },
  { id: 'demo-sal-6', name: '🧪 تجربة - مشغل التميّز', phone: '0500000006', phone_key: '0500000006', city: 'الدمام', district: 'الشاطئ', rating: 4.0, reviews_count: 60, type: 'opportunity' },
];

async function main() {
  console.log(`\n=== زرع بيانات عرض على ${BASE} ===\n`);

  const superTok = await login(SUSER, SPASS);
  if (!superTok) { console.error('❌ فشل دخول السوبر أدمن — تأكّد من اليوزر/الباسورد.'); process.exit(1); }
  console.log('✅ دخول السوبر أدمن');

  // 1) المناديب (نتجاهل 409 لو موجودين مسبقاً).
  for (const r of REPS) {
    const { status } = await req('POST', '/members', superTok, r);
    console.log(`${status === 201 ? '✅ أُضيف' : status === 409 ? 'ℹ️ موجود' : `⚠️ (${status})`} المندوب: ${r.display_name}`);
  }
  const dima = await login('demo_dima', 'demo1234');
  const sara = await login('demo_sara', 'demo1234');

  // 2) صوالين التجربة (import يضيف الجديد فقط).
  const imp = (await req('POST', '/import', superTok, { salons: SALONS })).body;
  console.log(`✅ صوالين التجربة: أُضيف ${imp?.added ?? 0} · حُدّث ${imp?.updated ?? 0} · تُجوهل ${imp?.skipped ?? 0}`);

  // 3) الإسناد بحالات متنوّعة (التحديث يجعل المندوب مالكاً + يسجّل في السجل).
  const assign = async (tok, id, data, who) => {
    const { status } = await req('PUT', `/salons/${id}`, tok, data);
    console.log(`${status === 200 ? '✅' : `⚠️(${status})`} ${id} ← ${who}: ${data.status}`);
  };
  await assign(dima, 'demo-sal-1', { status: 'interested', follow_up: todayStr, note: 'مهتمة، أبي أتابع اليوم' }, 'ديما');
  await assign(dima, 'demo-sal-2', { status: 'contacted', follow_up: pastStr, note: 'تواصلت، تأخّرت المتابعة' }, 'ديما');
  await assign(sara, 'demo-sal-3', { status: 'subscribed', subscription_type: 'سنوي', note: 'اشتركت 🎉' }, 'سارة');
  await assign(sara, 'demo-sal-4', { status: 'no_answer', follow_up: pastStr, note: 'ما ردّت، أعاود' }, 'سارة');
  // demo-sal-5 و demo-sal-6 يبقون بدون مندوب → «متاح».

  console.log('\n🎉 تم الزرع. بيانات دخول المناديب للتجربة:');
  console.log('   • ديما:  demo_dima / demo1234  (عضو فريق)');
  console.log('   • سارة:  demo_sara / demo1234  (عضو فريق)');
  console.log('   • منى:   demo_mona / demo1234  (مديرة)');
  console.log('\nللحذف لاحقاً: node scripts/cleanSalesDemo.mjs <baseUrl> <superUser> <superPass>\n');
}

main().catch((e) => { console.error('💥 خطأ:', e.stack || e.message); process.exit(1); });
