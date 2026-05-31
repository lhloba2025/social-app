/**
 * خدمة النشر على تيك توك عبر TikTok Content Posting API
 *
 * المتطلبات:
 * - تطبيق على TikTok for Developers
 * - صلاحية: video.publish أو video.upload
 * - الموافقة على التطبيق من TikTok (تستغرق أياماً)
 *
 * ملاحظة: تيك توك يدعم رفع الفيديو بشكل أساسي.
 * الصور (carousel) متاحة في بعض الحسابات فقط.
 */

import axios from "axios";

const TIKTOK_AUTH  = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_API   = "https://open.tiktokapis.com/v2";

// ─── OAuth ────────────────────────────────────────────────────────────────────

/**
 * بناء رابط OAuth لتيك توك
 */
export function buildAuthUrl(state = "") {
  const params = new URLSearchParams({
    client_key:    process.env.TIKTOK_CLIENT_KEY,
    scope:         "user.info.basic,video.publish,video.upload",
    response_type: "code",
    redirect_uri:  process.env.TIKTOK_REDIRECT_URI,
    state,
  });
  return `${TIKTOK_AUTH}?${params}`;
}

/**
 * تبادل كود OAuth بـ Access Token
 */
export async function exchangeCodeForToken(code) {
  const res = await axios.post(
    TIKTOK_TOKEN,
    new URLSearchParams({
      client_key:    process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type:    "authorization_code",
      redirect_uri:  process.env.TIKTOK_REDIRECT_URI,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return res.data; // { access_token, open_id, scope, expires_in, ... }
}

/**
 * تجديد Access Token منتهي الصلاحية
 */
export async function refreshToken(refreshToken) {
  const res = await axios.post(
    TIKTOK_TOKEN,
    new URLSearchParams({
      client_key:    process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return res.data;
}

// ─── النشر ────────────────────────────────────────────────────────────────────

/**
 * ينشر فيديو على تيك توك عبر رابط عام (Pull From URL)
 * @param {Object} account - { openId, accessToken }
 * @param {Object} post    - { caption, mediaUrl }
 */
export async function publishToTikTok(account, post, opts = {}) {
  const { openId, accessToken } = account;
  const { caption, mediaUrl }   = post;

  if (!mediaUrl) throw new Error("تيك توك يحتاج رابط فيديو أو صورة");
  if (!openId)   throw new Error("لم يتم ربط حساب تيك توك");

  // Unaudited TikTok apps may ONLY publish as SELF_ONLY (private). After your
  // app passes TikTok's audit, set TIKTOK_PRIVACY=PUBLIC_TO_EVERYONE.
  const privacy = process.env.TIKTOK_PRIVACY || "SELF_ONLY";
  const isVideo = opts.mediaType === "video" || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(mediaUrl);

  let initRes;
  if (isVideo) {
    initRes = await axios.post(
      `${TIKTOK_API}/post/publish/video/init/`,
      {
        post_info: {
          title:           (caption || "").slice(0, 2200),
          privacy_level:   privacy,
          disable_duet:    false,
          disable_comment: false,
          disable_stitch:  false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: { source: "PULL_FROM_URL", video_url: mediaUrl },
      },
      { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json; charset=UTF-8" } }
    );
  } else {
    // Photo Mode — our designs are images, so this is the normal path.
    initRes = await axios.post(
      `${TIKTOK_API}/post/publish/content/init/`,
      {
        post_info: {
          title:           (caption || "").slice(0, 2200),
          privacy_level:   privacy,
          disable_comment: false,
        },
        source_info: {
          source:            "PULL_FROM_URL",
          photo_cover_index: 0,
          photo_images:      [mediaUrl],
        },
        post_mode:  "DIRECT_POST",
        media_type: "PHOTO",
      },
      { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json; charset=UTF-8" } }
    );
  }

  const publishId = initRes.data?.data?.publish_id;
  if (!publishId) {
    const errMsg = initRes.data?.error?.message || "فشل تهيئة النشر على تيك توك";
    throw new Error(errMsg);
  }

  // انتظار المعالجة والتحقق من الحالة
  await sleep(5000);
  const status = await checkPublishStatus(accessToken, publishId);

  return { success: true, publishId, status, privacy };
}

/**
 * التحقق من حالة النشر على تيك توك
 */
export async function checkPublishStatus(accessToken, publishId) {
  const res = await axios.post(
    `${TIKTOK_API}/post/publish/status/fetch/`,
    { publish_id: publishId },
    {
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
    }
  );
  return res.data?.data?.status;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
