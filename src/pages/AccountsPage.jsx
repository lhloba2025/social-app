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

// Start OAuth via the BACKEND routes — they build the provider URL using the
// server-side credentials (set in Railway Variables), so no build-time VITE_*
// vars are needed and the flow always uses the correct App ID.
function buildOAuthUrl(platform) {
  // Pass the tenant token so the backend ties the connected account to THIS salon.
  let t = "";
  try { t = localStorage.getItem("social_tenant_token") || ""; } catch { /* ignore */ }
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  switch (platform) {
    case "facebook":
    case "instagram":
      return `${RAILWAY}/auth/meta${q}`;
    case "tiktok":
      return `${RAILWAY}/auth/tiktok${q}`;
    case "snapchat":
      return `${RAILWAY}/auth/snapchat${q}`;
    case "linkedin":
      return `${RAILWAY}/auth/linkedin${q}`;
    default:
      return null;
  }
}

const PLATFORMS = ["facebook", "instagram", "tiktok", "linkedin", "snapchat"];

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
  accounts.forEach((a) => {
    accountsByPlatform[a.platform] = a;
    // A single "meta" connection (Facebook Login) drives BOTH the Instagram
    // and Facebook cards — the backend stores one row with the page + IG id.
    if (a.platform === "meta") {
      accountsByPlatform.instagram = a;
      accountsByPlatform.facebook = a;
    }
  });

  const connectedCount = PLATFORMS.filter((p) => accountsByPlatform[p]).length;

  return (
    <div dir={ar ? "rtl" : "ltr"} className="hv-page">

      {/* OAuth notification */}
      {oauthNotif && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border text-sm font-semibold
          ${oauthNotif.type === "success"
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"}`}>
          {oauthNotif.type === "success"
            ? <CheckCircle2 className="w-5 h-5" />
            : <XCircle className="w-5 h-5" />}
          {oauthNotif.type === "success"
            ? (ar ? `تم ربط حساب ${oauthNotif.platform} بنجاح` : `${oauthNotif.platform} account connected successfully`)
            : (ar ? `فشل ربط حساب ${oauthNotif.platform}` : `Failed to connect ${oauthNotif.platform} account`)}
        </div>
      )}

      <div className="hv-page-inner">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="hv-page-title">{ar ? "الحسابات المرتبطة" : "Connected Accounts"}</h1>
            <p className="hv-page-sub mt-1">
              {ar
                ? `${connectedCount} من ${PLATFORMS.length} حسابات مرتبطة`
                : `${connectedCount} of ${PLATFORMS.length} accounts connected`}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="hv-btn hv-btn-primary"
          >
            <UserPlus className="w-4 h-4" />
            {ar ? "ربط حساب جديد" : "Add Account"}
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--hv-primary)' }} />
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
