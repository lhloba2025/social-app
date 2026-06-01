/**
 * خدمة الجدولة والنشر التلقائي
 *
 * تعمل كل دقيقة وتتحقق من المنشورات المجدولة التي حان وقتها
 * ثم تنشرها على المنصات المطلوبة
 */

import { publishToInstagram, publishToFacebook } from "./meta.js";
import { publishToTikTok } from "./tiktok.js";
import { publishToLinkedIn } from "./linkedin.js";

// هذه الدوال تُمرر من server.js عند التهيئة
let getDB   = null;
let saveFn  = null;

export function initScheduler(dbGetter, saveFunction) {
  getDB  = dbGetter;
  saveFn = saveFunction;
}

// ─── دالة تشغيل الجدولة ────────────────────────────────────────────────────────

// Current date/time in the business timezone (Riyadh, UTC+3). The server runs
// on UTC, but users enter times in their local (Saudi) time — comparing against
// UTC would publish 3 hours late. We compute "now" in Asia/Riyadh so the stored
// "12:50" matches the user's intent.
function nowInRiyadh() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date()).reduce((o, p) => (o[p.type] = p.value, o), {});
  // en-CA gives ISO-ish parts; hour may come as "24" at midnight → normalize.
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return { ymd: `${parts.year}-${parts.month}-${parts.day}`, hm: `${hour}:${parts.minute}` };
}

export async function runScheduler() {
  if (!getDB) return;

  const db = getDB();
  const { ymd, hm } = nowInRiyadh();
  const nowStr = `${ymd}T${hm}`; // e.g. "2026-05-31T12:50"

  // Fetch all scheduled posts, then keep the ones whose combined date+time is
  // due. Comparing the FULL "date T time" string (not date and time
  // separately) avoids the bug where an overdue post from yesterday evening
  // never fires because its time-of-day is "later" than the current clock.
  const all = queryAll(db, `SELECT * FROM scheduled_posts WHERE status = 'scheduled'`);
  const posts = all.filter((p) => `${p.schedule_date}T${p.schedule_time}` <= nowStr);

  if (posts.length === 0) return;

  console.log(`[Scheduler] وجدت ${posts.length} منشور للنشر (الآن: ${nowStr} الرياض)`);

  for (const post of posts) {
    await publishPost(db, post);
  }
}

// ─── نشر منشور واحد ────────────────────────────────────────────────────────────

async function publishPost(db, post) {
  const platforms  = parseJSON(post.platforms, []);
  const results    = {};
  let   anySuccess = false;
  let   allFailed  = true;

  // تحديث الحالة إلى "قيد الإرسال"
  updateStatus(db, post.id, "queued");

  for (const platform of platforms) {
    try {
      const account = getAccount(db, platform, post.tenant_id || "default");

      if (!account) {
        results[platform] = { success: false, error: "الحساب غير مرتبط" };
        continue;
      }

      const postData = {
        caption:  post.caption || "",
        mediaUrl: post.media_url || post.media_thumbnail || null,
      };
      const isStory = post.post_type === "story";

      let result;

      if (platform === "instagram") {
        result = await publishToInstagram(
          { igUserId: account.ig_user_id, accessToken: account.access_token },
          postData,
          { story: isStory }
        );
      } else if (platform === "facebook") {
        result = await publishToFacebook(
          { pageId: account.page_id, pageAccessToken: account.access_token },
          postData,
          { story: isStory }
        );
      } else if (platform === "tiktok") {
        result = await publishToTikTok(
          { openId: account.tiktok_open_id, accessToken: account.access_token },
          postData,
          { mediaType: post.media_type || "image" }
        );
      } else if (platform === "linkedin") {
        // The LinkedIn author URN is stored in `page_id`.
        result = await publishToLinkedIn(
          { accessToken: account.access_token, authorUrn: account.page_id },
          postData,
          {}
        );
      } else if (platform === "snapchat") {
        // سناب شات لا يدعم النشر التلقائي
        results[platform] = {
          success: false,
          error: "سناب شات لا يدعم النشر التلقائي — يُرجى النشر يدوياً",
          manual: true,
        };
        continue;
      }

      results[platform] = result;
      anySuccess = true;
      allFailed  = false;

      console.log(`[Scheduler] ✅ نُشر على ${platform} - المنشور: ${post.id}`);
    } catch (err) {
      results[platform] = { success: false, error: err.message };
      console.error(`[Scheduler] ❌ فشل النشر على ${platform}: ${err.message}`);
    }
  }

  // تحديث الحالة النهائية
  const finalStatus = allFailed ? "failed" : "published";

  db.run(
    `UPDATE scheduled_posts
     SET status = ?, publish_results = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [finalStatus, JSON.stringify(results), post.id]
  );

  saveFn();
  console.log(`[Scheduler] المنشور ${post.id} → ${finalStatus}`);
}

// ─── مساعدات ──────────────────────────────────────────────────────────────────

function getAccount(db, platform, tenantId = "default") {
  // instagram و facebook كلاهما يستخدم Meta tokens
  const lookupPlatform =
    platform === "instagram" || platform === "facebook" ? "meta" : platform;

  const rows = queryAll(
    db,
    `SELECT * FROM social_accounts WHERE platform = ? AND tenant_id = ? AND isConnected = 1 LIMIT 1`,
    [lookupPlatform, tenantId]
  );
  return rows[0] || null;
}

function updateStatus(db, id, status) {
  db.run(
    `UPDATE scheduled_posts SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    [status, id]
  );
  saveFn();
}

function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function parseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function toYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toHM(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
