import React, { useState } from "react";
import { Home, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localApi } from "@/api/localClient";
import { Link } from "react-router-dom";
import PlatformCard from "@/components/accounts/PlatformCard";
import ConnectModal from "@/components/accounts/ConnectModal";
import DisconnectModal from "@/components/accounts/DisconnectModal";

const PLATFORMS = [
  "facebook",
  "instagram",
  "twitter",
  "tiktok",
  "snapchat",
  "youtube",
  "linkedin",
];

export default function AccountsPage() {
  const qc = useQueryClient();
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [disconnectingAccount, setDisconnectingAccount] = useState(null);
  const [loadingPlatform, setLoadingPlatform] = useState(null);

  // Fetch all accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["socialAccounts"],
    queryFn: () => localApi.entities.SocialAccount.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => localApi.entities.SocialAccount.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["socialAccounts"] });
      setConnectingPlatform(null);
      setLoadingPlatform(null);
    },
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
    setConnectingPlatform(platform);
  };

  const handleSaveAccount = async (accountData) => {
    setLoadingPlatform(accountData.platform);
    await createMutation.mutateAsync(accountData);
  };

  const handleDisconnect = (account) => {
    setDisconnectingAccount(account);
  };

  const handleConfirmDisconnect = async () => {
    if (!disconnectingAccount) return;
    setLoadingPlatform(disconnectingAccount.platform);
    await deleteMutation.mutateAsync(disconnectingAccount.id);
  };

  // Map accounts by platform
  const accountsByPlatform = {};
  accounts.forEach((account) => {
    accountsByPlatform[account.platform] = account;
  });

  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-sm"
          >
            <Home className="w-4 h-4" />
            <span>الرئيسية</span>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">ربط الحسابات</h1>
            <p className="text-slate-400 text-sm mt-1">
              اربط حسابات السوشيال ميديا الخاصة بك
            </p>
          </div>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : (
          /* Grid of platforms */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {PLATFORMS.map((platform) => (
              <PlatformCard
                key={platform}
                platform={platform}
                account={accountsByPlatform[platform]}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                isLoading={loadingPlatform === platform}
              />
            ))}
          </div>
        )}
      </div>

      {/* Connect Modal */}
      <ConnectModal
        isOpen={!!connectingPlatform}
        platform={connectingPlatform}
        onClose={() => setConnectingPlatform(null)}
        onSave={handleSaveAccount}
        isLoading={createMutation.isPending}
      />

      {/* Disconnect Modal */}
      <DisconnectModal
        isOpen={!!disconnectingAccount}
        account={disconnectingAccount}
        onConfirm={handleConfirmDisconnect}
        onCancel={() => setDisconnectingAccount(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}