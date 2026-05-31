/**
 * خدمة Snapchat OAuth عبر Snap Kit
 * المتطلبات: SNAP_CLIENT_ID, SNAP_CLIENT_SECRET, SNAP_REDIRECT_URI في .env
 */

import axios from "axios";

const SNAP_AUTH  = "https://accounts.snapchat.com/accounts/oauth2/auth";
const SNAP_TOKEN = "https://accounts.snapchat.com/accounts/oauth2/token";
const SNAP_ME    = "https://kit.snapchat.com/v1/me";

export function buildAuthUrl(state = "") {
  const params = new URLSearchParams({
    client_id:     process.env.SNAP_CLIENT_ID,
    redirect_uri:  process.env.SNAP_REDIRECT_URI,
    response_type: "code",
    scope:         "https://auth.snapchat.com/oauth2/api/user.display_name https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar",
    state,
  });
  return `${SNAP_AUTH}?${params}`;
}

export async function exchangeCodeForToken(code) {
  const creds = Buffer.from(`${process.env.SNAP_CLIENT_ID}:${process.env.SNAP_CLIENT_SECRET}`).toString("base64");
  const res = await axios.post(
    SNAP_TOKEN,
    new URLSearchParams({
      grant_type:   "authorization_code",
      code,
      redirect_uri: process.env.SNAP_REDIRECT_URI,
    }),
    {
      headers: {
        Authorization:  `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  return res.data; // { access_token, refresh_token, expires_in, ... }
}

export async function getUserInfo(accessToken) {
  const res = await axios.get(SNAP_ME, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const me = res.data?.data?.me;
  return {
    username:    me?.displayName || "snapchat_user",
    accountName: me?.displayName || "Snapchat User",
    avatar:      me?.bitmoji?.avatar || null,
  };
}
