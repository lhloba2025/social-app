/**
 * خدمة النشر على انستقرام وفيسبوك عبر Meta Graph API
 *
 * المتطلبات:
 * - حساب تجاري على فيسبوك (Facebook Business)
 * - صفحة فيسبوك مرتبطة بحساب انستقرام تجاري
 * - تطبيق على Meta Developers بصلاحيات:
 *     instagram_basic, instagram_content_publish,
 *     pages_read_engagement, pages_manage_posts
 */

import axios from "axios";

const GRAPH = "https://graph.facebook.com/v19.0";

// ─── انستقرام ─────────────────────────────────────────────────────────────────

/**
 * ينشر صورة على انستقرام
 * @param {Object} account - { igUserId, accessToken }
 * @param {Object} post    - { caption, mediaUrl }
 */
export async function publishToInstagram(account, post, opts = {}) {
  const { igUserId, accessToken } = account;
  const { caption, mediaUrl } = post;

  if (!mediaUrl) throw new Error("انستقرام يحتاج رابط صورة أو فيديو");
  if (!igUserId) throw new Error("لم يتم ربط حساب انستقرام");

  // الخطوة 1: إنشاء حاوية الميديا. الستوري لا يأخذ caption ويحتاج media_type=STORIES.
  const containerParams = { image_url: mediaUrl, access_token: accessToken };
  if (opts.story) containerParams.media_type = "STORIES";
  else containerParams.caption = caption || "";

  const containerRes = await axios.post(
    `${GRAPH}/${igUserId}/media`,
    null,
    { params: containerParams }
  );

  const creationId = containerRes.data.id;
  if (!creationId) throw new Error("فشل إنشاء حاوية الميديا على انستقرام");

  // انتظار ثانيتين لتجهيز الحاوية
  await sleep(2000);

  // الخطوة 2: نشر الحاوية
  const publishRes = await axios.post(
    `${GRAPH}/${igUserId}/media_publish`,
    null,
    {
      params: {
        creation_id: creationId,
        access_token: accessToken,
      },
    }
  );

  return { success: true, postId: publishRes.data.id };
}

// ─── فيسبوك ───────────────────────────────────────────────────────────────────

/**
 * ينشر على صفحة فيسبوك
 * @param {Object} account - { pageId, pageAccessToken }
 * @param {Object} post    - { caption, mediaUrl }
 */
export async function publishToFacebook(account, post, opts = {}) {
  const { pageId, pageAccessToken } = account;
  const { caption, mediaUrl } = post;

  if (!pageId) throw new Error("لم يتم ربط صفحة فيسبوك");

  // ستوري فيسبوك: ارفع الصورة كغير منشورة ثم انشرها كقصة.
  if (opts.story) {
    if (!mediaUrl) throw new Error("ستوري فيسبوك يحتاج صورة");
    const up = await axios.post(`${GRAPH}/${pageId}/photos`, null, {
      params: { url: mediaUrl, published: false, access_token: pageAccessToken },
    });
    const photoId = up.data.id;
    if (!photoId) throw new Error("فشل تجهيز صورة ستوري فيسبوك");
    const st = await axios.post(`${GRAPH}/${pageId}/photo_stories`, null, {
      params: { photo_id: photoId, access_token: pageAccessToken },
    });
    return { success: true, postId: st.data.post_id || st.data.id || photoId };
  }

  let result;

  if (mediaUrl) {
    // نشر مع صورة
    result = await axios.post(`${GRAPH}/${pageId}/photos`, null, {
      params: {
        url: mediaUrl,
        caption: caption || "",
        access_token: pageAccessToken,
      },
    });
  } else {
    // نشر نص فقط
    result = await axios.post(`${GRAPH}/${pageId}/feed`, null, {
      params: {
        message: caption || "",
        access_token: pageAccessToken,
      },
    });
  }

  return { success: true, postId: result.data.id };
}

// ─── مساعدات OAuth ────────────────────────────────────────────────────────────

/**
 * تبادل كود OAuth بـ Access Token
 */
export async function exchangeCodeForToken(code, redirectUri) {
  const res = await axios.get(`${GRAPH}/oauth/access_token`, {
    params: {
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri: redirectUri,
      code,
    },
  });
  return res.data; // { access_token, token_type, expires_in }
}

/**
 * تحويل Short-Lived Token إلى Long-Lived Token (60 يوم)
 */
export async function getLongLivedToken(shortToken) {
  const res = await axios.get(`${GRAPH}/oauth/access_token`, {
    params: {
      grant_type: "fb_exchange_token",
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      fb_exchange_token: shortToken,
    },
  });
  return res.data;
}

/**
 * جلب بيانات المستخدم والصفحات المرتبطة
 */
export async function getUserPages(accessToken) {
  const res = await axios.get(`${GRAPH}/me/accounts`, {
    params: {
      fields: "id,name,access_token,instagram_business_account",
      access_token: accessToken,
    },
  });
  return res.data.data || [];
}

/**
 * جلب معرف حساب انستقرام التجاري من الصفحة
 */
export async function getIgUserId(pageId, pageAccessToken) {
  const res = await axios.get(`${GRAPH}/${pageId}`, {
    params: {
      fields: "instagram_business_account",
      access_token: pageAccessToken,
    },
  });
  return res.data.instagram_business_account?.id || null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
