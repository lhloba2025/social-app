// services/linkedin.js — LinkedIn OAuth + member image/text post.
//
// Fully ENV-GATED: nothing here works until these are set on the server —
//   LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI
// (optional) LINKEDIN_SCOPES, LINKEDIN_API_VERSION.
// So the app keeps running normally with LinkedIn simply "not connected".
//
// Posting uses LinkedIn's versioned REST API: initialize image upload →
// PUT the bytes → create a /rest/posts share. Member posts need the
// `w_member_social` scope (LinkedIn product "Share on LinkedIn" / community).

import axios from "axios";

const AUTH_URL  = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const API_VERSION = process.env.LINKEDIN_API_VERSION || "202405";

export function isConfigured() {
  return !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET && process.env.LINKEDIN_REDIRECT_URI);
}

export function buildAuthUrl(state) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id:     process.env.LINKEDIN_CLIENT_ID || "",
    redirect_uri:  process.env.LINKEDIN_REDIRECT_URI || "",
    state,
    scope:         process.env.LINKEDIN_SCOPES || "r_organization_admin w_organization_social",
  });
  return `${AUTH_URL}?${params}`;
}

export async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    grant_type:    "authorization_code",
    code,
    redirect_uri:  process.env.LINKEDIN_REDIRECT_URI || "",
    client_id:     process.env.LINKEDIN_CLIENT_ID || "",
    client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
  });
  const { data } = await axios.post(TOKEN_URL, body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 20000,
  });
  return data; // { access_token, expires_in, ... }
}

// Resolve the member URN ("urn:li:person:<sub>") via the OpenID userinfo endpoint.
export async function getMemberUrn(accessToken) {
  const { data } = await axios.get("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 20000,
  });
  if (!data?.sub) throw new Error("LinkedIn userinfo returned no member id");
  return `urn:li:person:${data.sub}`;
}

// Find the FIRST Company Page the connecting user ADMINISTERS, so we post on
// behalf of THAT page. This auto-discovery means every business just connects
// its own LinkedIn and posts to its own page — no per-business code changes.
// Returns { urn: "urn:li:organization:<id>", name }.
export async function getAdminOrg(accessToken) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": API_VERSION,
  };
  // Which organizations does this member administer (approved admin role)?
  const acl = await axios.get(
    "https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED",
    { headers, timeout: 20000 }
  );
  const orgUrn = acl.data?.elements?.[0]?.organization; // "urn:li:organization:<id>"
  if (!orgUrn) {
    throw new Error("ما لقينا صفحة شركة أنت أدمن فيها على لينكدإن — تأكد إنك أدمن الصفحة.");
  }
  // Best-effort: fetch the page's display name.
  let name = "LinkedIn Page";
  try {
    const id = String(orgUrn).split(":").pop();
    const org = await axios.get(`https://api.linkedin.com/rest/organizations/${id}`, { headers, timeout: 20000 });
    name = org.data?.localizedName || org.data?.vanityName || name;
  } catch { /* name is best-effort */ }
  return { urn: orgUrn, name };
}

// Publish an image (or text-only) post to the member's feed.
//   account = { accessToken, authorUrn }
//   post    = { caption, mediaUrl }
export async function publishToLinkedIn(account, post, _opts = {}) {
  const { accessToken, authorUrn } = account || {};
  if (!accessToken || !authorUrn) return { success: false, error: "LinkedIn غير مرتبط" };

  const baseHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": API_VERSION,
  };

  try {
    const caption = post.caption || "";
    let imageUrn = null;

    if (post.mediaUrl) {
      // 1) Initialize the image upload.
      const init = await axios.post(
        "https://api.linkedin.com/rest/images?action=initializeUpload",
        { initializeUploadRequest: { owner: authorUrn } },
        { headers: { ...baseHeaders, "Content-Type": "application/json" }, timeout: 20000 }
      );
      const uploadUrl = init.data?.value?.uploadUrl;
      imageUrn = init.data?.value?.image;
      if (!uploadUrl || !imageUrn) throw new Error("LinkedIn initializeUpload failed");

      // 2) Download the (public) image, then PUT the bytes to the upload URL.
      const img = await axios.get(post.mediaUrl, { responseType: "arraybuffer", timeout: 30000 });
      await axios.put(uploadUrl, Buffer.from(img.data), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": img.headers["content-type"] || "image/png",
        },
        timeout: 60000, maxBodyLength: Infinity, maxContentLength: Infinity,
      });
    }

    // 3) Create the post.
    const body = {
      author: authorUrn,
      commentary: caption,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };
    if (imageUrn) {
      body.content = { media: { id: imageUrn, title: (caption || "image").slice(0, 60) } };
    }

    const resp = await axios.post("https://api.linkedin.com/rest/posts", body, {
      headers: { ...baseHeaders, "Content-Type": "application/json" },
      timeout: 30000,
    });
    const postId = resp.headers?.["x-restli-id"] || resp.headers?.["x-linkedin-id"] || "ok";
    return { success: true, postId };
  } catch (err) {
    const d = err?.response?.data?.message || err?.response?.data || err?.message;
    return { success: false, error: typeof d === "string" ? d : JSON.stringify(d) };
  }
}
