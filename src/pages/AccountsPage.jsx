import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localApi } from "@/api/localClient";
import { useSearchParams } from "react-router-dom";
import PlatformCard from "@/components/accounts/PlatformCard";
import DisconnectModal from "@/components/accounts/DisconnectModal";
import AddAccountModal from "@/components/accounts/AddAccountModal";
import ConnectGuideModal from "@/components/accounts/ConnectGuideModal";

const RAILWAY = "https://social-app-production-7cfd.up.railway.app";

function buildOAuthUrl(platform) {
  const META_APP_ID   = import.meta.env.VITE_META_APP_ID;
  const TIKTOK_KEY    = import.meta.env.VITE_TIKTOK_CLIENT_KEY;
  const SNAP_ID       = import.meta.env.VITE_SNAP_CLIENT_ID;

  switch (platform) {
    case "facebook":
    case "instagram": {
      if (!META_APP_ID) return null;
      const p = new URLSearchParams({
        client_id:     META_APP_ID,
        redirect_uri:  `${RAILWAY}/auth/meta/callback`,
        scope:         "pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish",
        response_type: "code",
        state:         "meta_oauth",
      });
      return `https://www.facebook.com/v19.0/dialog/oauth?${p}`;
    }
    case "tiktok": {
      if (!TIKTOK_KEY) return null;
      const p = new URLSearchParams({
        client_key:    TIKTOK_KEY,
        scope:         "user.info.basic,video.publish,video.upload",
        response_type: "code",
        redirect_uri:  `${RAILWAY}/auth/tiktok/callback`,
        state:         "tiktok_oauth",
      });
      return `https://www.tiktok.com/v2/auth/authorize/?${p}`;
    }
    case "snapchat": {
      if (!SNAP_ID) return null;
      const p = new URLSearchParams({
        client_id:     SNAP_ID,
        redirect_uri:  `${RAILWAY}/auth/snapchat/callback`,
        response_type: "code",
        scope:         "https://auth.snapchat.com/oauth2/api/user.display_name https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar",
        state:         "snapchat_oauth",
      });
      return `https://accounts.snapchat.com/accounts/oauth2/auth?${p}`;
    }
    default:
      return null;
  }
}

const PLATFORMS = ["facebook", "instagram", "tiktok", "snapchat"];

export default function AccountsPage({ language }) {
  const ar = (language || localStorage.getItem("appLanguage") || "ar") === "ar";
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [showAddModal, setShowAddModal]         = useState(false);
  const [disconnectingAccount, setDisconnectingAccount] = useState(null);
  const [loadingPlatform, setLoadingPlatform]   = useState(null);
  const [oauthNotif, setOauthNotif]             = useState(null);
  const [guidePlatform, setGuidePlatform]       = useState(null);

  useEffect(() => {
    const oauth    = searchParams.get("oauth");
    const platform = searchParams.get("platform");
    if (oauth && platform) {
      setOauthNotif({ type: oauth, platform });
      qc.invalidateQueries({ queryKey: ["socialAccounts"] });
      window.history.replaceState({}, "", "/AccountsPage");
      setTimeout(() => setOauthNotif(null), 4000);
    }
  }, []);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["socialAccounts"],
    queryFn: () => localApi.entities.SocialAccount.list("-created_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => localApi.entities.SocialAccount.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["socialAccounts"] });
      setDisconnectingAccount(null);
      setLoadingPlatform(null);
    },
  });

  const handleConnect = (platform) => {
    const url = buildOAuthUrl(platform);
    if (!url) {
      // لا يوجد App ID — أظهر تعليمات الإعداد
      setGuidePlatform(platform);
      setShowAddModal(false);
      return;
    }
    window.location.href = url;
  };

  const handleConfirmDisconnect = async () => {
    if (!disconnectingAccount) return;
    setLoadingPlatform(disconnectingAccount.platform);
    await deleteMutation.mutateAsync(disconnectingAccount.id);
  };

  const accountsByPlatform = {};
  accounts.forEach((a) => { accountsByPlatform[a.platform] = a; });

  const connectedCount = PLATFORMS.filter((p) => accountsByPlatform[p]).length;

  return (
    <div dir={ar ? "rtl" : "ltr"} className="h-full overflow-y-auto bg-slate-900 text-white">

      {/* OAuth notification */}
      {oauthNotif && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border text-sm font-semibold
          ${oauthNotif.type === "success"
            ? "bg-green-900/90 border-green-500/50 text-green-300"
            : "bg-red-900/90 border-red-500/50 text-red-300"}`}>
          {oauthNotif.type === "success"
            ? <CheckCircle2 className="w-5 h-5" />
            : <XCircle className="w-5 h-5" />}
          {oauthNotif.type === "success"
            ? (ar ? `تم ربط حساب ${oauthNotif.platform} بنجاح` : `${oauthNotif.platform} account connected successfully`)
            : (ar ? `فشل ربط حساب ${oauthNotif.platform}` : `Failed to connect ${oauthNotif.platform} account`)}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{ar ? "الحسابات المرتبطة" : "Connected Accounts"}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {ar
                ? `${connectedCount} من ${PLATFORMS.length} حسابات مرتبطة`
                : `${connectedCount} of ${PLATFORMS.length} accounts connected`}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/30"
          >
            <UserPlus className="w-4 h-4" />
            {ar ? "ربط حساب جديد" : "Add Account"}
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLATFORMS.map((platform) => (
              <PlatformCard
                key={platform}
                platform={platform}
                account={accountsByPlatform[platform]}
                onConnect={handleConnect}
                onDisconnect={setDisconnectingAccount}
                isLoading={loadingPlatform === platform}
                ar={ar}
              />
            ))}
          </div>
        )}
      </div>

      <AddAccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onConnect={handleConnect}
        accountsByPlatform={accountsByPlatform}
        ar={ar}
      />

      <DisconnectModal
        isOpen={!!disconnectingAccount}
        account={disconnectingAccount}
        onConfirm={handleConfirmDisconnect}
        onCancel={() => setDisconnectingAccount(null)}
        isLoading={deleteMutation.isPending}
        ar={ar}
      />

      <ConnectGuideModal
        platform={guidePlatform}
        onClose={() => setGuidePlatform(null)}
        ar={ar}
      />
    </div>
  );
}
