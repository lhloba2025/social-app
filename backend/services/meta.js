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

  if (!igUserId) throw new Error("لم يتم ربط حساب انستقرام");

  // ألبوم (Carousel): عدة صور في منشور واحد على الفيد.
  if (!opts.story && Array.isArray(opts.mediaUrls) && opts.mediaUrls.length > 1) {
    return await publishInstagramCarousel({ igUserId, accessToken }, caption, opts.mediaUrls);
  }

  if (!mediaUrl) throw new Error("انستقرام يحتاج رابط صورة أو فيديو");

  // الخطوة 1: إنشاء حاوية الميديا. الستوري لا يأخذ caption ويحتاج media_type=STORIES.
  const containerParams = { image_url: mediaUrl, access_token: accessToken };
  if (opts.story) containerParams.media_type = "STORIES";
  else containerParams.caption = caption || "";

  let containerRes;
  try {
    containerRes = await axios.post(`${GRAPH}/${igUserId}/media`, null, { params: containerParams });
  } catch (e) {
    throw new Error("فشل تجهيز صورة انستقرام: " + metaErr(e));
  }

  const creationId = containerRes.data.id;
  if (!creationId) throw new Error("فشل إنشاء حاوية الميديا على انستقرام");

  // الخطوة 2: انتظر حتى تُجهَّز الحاوية فعلاً (status_code=FINISHED) بدل انتظار
  // ثابت قصير. هذا هو سبب فشل بوست الفيد أحياناً: الستوري تجهز بسرعة لكن بوست
  // الفيد يحتاج وقت معالجة أطول، فالنشر بعد ثانيتين فقط كان يفشل.
  await waitForContainerReady(creationId, accessToken);

  // الخطوة 3: نشر الحاوية، مع إعادة محاولة للأخطاء العابرة (لم تجهز بعد).
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const publishRes = await axios.post(`${GRAPH}/${igUserId}/media_publish`, null, {
        params: { creation_id: creationId, access_token: accessToken },
      });
      return { success: true, postId: publishRes.data.id };
    } catch (e) {
      lastErr = e;
      const msg = metaErr(e);
      if (/not available|not ready|9007|media id|try again/i.test(msg)) { await sleep(4000); continue; }
      throw new Error("فشل نشر انستقرام: " + msg);
    }
  }
  throw new Error("فشل نشر انستقرام بعد عدة محاولات: " + metaErr(lastErr));
}

// يستعلم عن حالة حاوية الميديا حتى تصبح FINISHED (أو ERROR) — حتى ~40 ثانية.
async function waitForContainerReady(creationId, accessToken, maxMs = 40000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await axios.get(`${GRAPH}/${creationId}`, {
        params: { fields: "status_code,status", access_token: accessToken },
      });
      const code = r.data.status_code;
      if (code === "FINISHED") return;
      if (code === "ERROR") {
        throw new Error("الصورة مرفوضة من انستقرام — تأكد من المقاس (بوست الفيد بين 4:5 و1.91:1) ومن صحة الرابط. " + (r.data.status || ""));
      }
    } catch (e) {
      if (e?.message?.includes("مرفوضة")) throw e; // خطأ حقيقي من الحالة
      // غير ذلك (تأخر مؤقت) — تجاهل وأعد المحاولة
    }
    await sleep(2500);
  }
  // انتهت المهلة — استمر بمحاولة النشر على أي حال (قد تكون جهزت).
}

// يستخرج رسالة خطأ Meta المقروءة من استجابة axios.
function metaErr(e) {
  return e?.response?.data?.error?.message || e?.message || "خطأ غير معروف";
}

// ينشر حاوية جاهزة مع إعادة محاولة للأخطاء العابرة.
async function publishCreation(igUserId, creationId, accessToken) {
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await axios.post(`${GRAPH}/${igUserId}/media_publish`, null, {
        params: { creation_id: creationId, access_token: accessToken },
      });
      return { success: true, postId: r.data.id };
    } catch (e) {
      lastErr = e;
      const msg = metaErr(e);
      if (/not available|not ready|9007|media id|try again/i.test(msg)) { await sleep(4000); continue; }
      throw new Error("فشل نشر انستقرام: " + msg);
    }
  }
  throw new Error("فشل نشر انستقرام بعد عدة محاولات: " + metaErr(lastErr));
}

// ينشر ألبوم صور (Carousel) على انستقرام: حاوية لكل صورة ثم حاوية ألبوم تجمعها.
async function publishInstagramCarousel(account, caption, urls) {
  const { igUserId, accessToken } = account;
  const childIds = [];
  for (const url of urls.slice(0, 10)) { // انستقرام يسمح حتى 10 صور
    try {
      const r = await axios.post(`${GRAPH}/${igUserId}/media`, null, {
        params: { image_url: url, is_carousel_item: true, access_token: accessToken },
      });
      if (r.data.id) childIds.push(r.data.id);
    } catch (e) { throw new Error("فشل تجهيز إحدى صور الألبوم: " + metaErr(e)); }
  }
  if (childIds.length < 2) throw new Error("الألبوم يحتاج صورتين على الأقل صالحتين");
  for (const id of childIds) await waitForContainerReady(id, accessToken);

  let carouselRes;
  try {
    carouselRes = await axios.post(`${GRAPH}/${igUserId}/media`, null, {
      params: { media_type: "CAROUSEL", caption: caption || "", children: childIds.join(","), access_token: accessToken },
    });
  } catch (e) { throw new Error("فشل تجهيز الألبوم: " + metaErr(e)); }
  const creationId = carouselRes.data.id;
  if (!creationId) throw new Error("فشل إنشاء حاوية الألبوم");
  await waitForContainerReady(creationId, accessToken);
  return await publishCreation(igUserId, creationId, accessToken);
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

  // ألبوم فيسبوك: ارفع كل صورة كغير منشورة ثم انشرها مرفقة في منشور واحد.
  if (Array.isArray(opts.mediaUrls) && opts.mediaUrls.length > 1) {
    const attached = [];
    for (const url of opts.mediaUrls.slice(0, 10)) {
      const up = await axios.post(`${GRAPH}/${pageId}/photos`, null, {
        params: { url, published: false, access_token: pageAccessToken },
      });
      if (up.data.id) attached.push({ media_fbid: up.data.id });
    }
    if (attached.length < 2) throw new Error("ألبوم فيسبوك يحتاج صورتين على الأقل");
    const fb = await axios.post(`${GRAPH}/${pageId}/feed`, null, {
      params: {
        message: caption || "",
        attached_media: JSON.stringify(attached),
        access_token: pageAccessToken,
      },
    });
    return { success: true, postId: fb.data.id };
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
