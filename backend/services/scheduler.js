/**
 * خدمة الجدولة والنشر التلقائي
 *
 * تعمل كل دقيقة وتتحقق من المنشورات المجدولة التي حان وقتها
 * ثم تنشرها على المنصات المطلوبة
 */

import { publishToInstagram, publishToFacebook } from "./meta.js";
import { publishToTikTok } from "./tiktok.js";

// هذه الدوال تُمرر من server.js عند التهيئة
let getDB   = null;
let saveFn  = null;

export function initScheduler(dbGetter, saveFunction) {
  getDB  = dbGetter;
  saveFn = saveFunction;
}

// ─── دالة تشغيل الجدولة ────────────────────────────────────────────────────────

export async function runScheduler() {
  if (!getDB) return;

  const db    = getDB();
  const now   = new Date();
  const today = toYMD(now);
  const time  = toHM(now);

  // جلب كل المنشورات المجدولة التي حان وقتها
  const posts = queryAll(
    db,
    `SELECT * FROM scheduled_posts
     WHERE status = 'scheduled'
       AND schedule_date <= ?
       AND schedule_time <= ?`,
    [today, time]
  );

  if (posts.length === 0) return;

  console.log(`[Scheduler] وجدت ${posts.length} منشور للنشر`);

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
      const account = getAccount(db, platform);

      if (!account) {
        results[platform] = { success: false, error: "الحساب غير مرتبط" };
        continue;
      }

      const postData = {
        caption:  post.caption || "",
        mediaUrl: post.media_url || post.media_thumbnail || null,
      };

      let result;

      if (platform === "instagram") {
        result = await publishToInstagram(
          { igUserId: account.ig_user_id, accessToken: account.access_token },
          postData
        );
      } else if (platform === "facebook") {
        result = await publishToFacebook(
          { pageId: account.page_id, pageAccessToken: account.access_token },
          postData
        );
      } else if (platform === "tiktok") {
        result = await publishToTikTok(
          { openId: account.tiktok_open_id, accessToken: account.access_token },
          postData
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

function getAccount(db, platform) {
  // instagram و facebook كلاهما يستخدم Meta tokens
  const lookupPlatform =
    platform === "instagram" || platform === "facebook" ? "meta" : platform;

  const rows = queryAll(
    db,
    `SELECT * FROM social_accounts WHERE platform = ? AND isConnected = 1 LIMIT 1`,
    [lookupPlatform]
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
