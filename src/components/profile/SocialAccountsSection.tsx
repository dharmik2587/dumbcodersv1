"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  Trash2,
  Plus,
  Loader2,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { Panel, Label, Button } from "@/components/ui";
import { supabase } from "@/client/lib/auth";
import { useApiStore } from "@/client/store/apiStore";

function GithubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

interface SocialAccount {
  id: string;
  userId: string;
  platform: string;
  username: string | null;
  displayName: string | null;
  profileUrl: string | null;
  providerUserId: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export function SocialAccountsSection() {
  const queryClient = useQueryClient();
  const pushToast = useApiStore((s) => s.pushToast);

  const [platform, setPlatform] = useState<"linkedin" | "telegram" | "portfolio" | "x">("linkedin");
  const [value, setValue] = useState("");
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // 1. Fetch connected social accounts
  const { data: accounts = [], isLoading } = useQuery<SocialAccount[]>({
    queryKey: ["social-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/profile/social-accounts", { credentials: "include" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? "Failed to load social accounts");
      return body.data ?? [];
    },
  });

  // 2. Attempt background sync of Supabase OAuth identities on mount
  useEffect(() => {
    fetch("/api/profile/social-accounts/sync", {
      method: "POST",
      credentials: "include",
    })
      .then((res) => {
        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ["social-accounts"] });
        }
      })
      .catch(() => {});
  }, [queryClient]);

  // 3. Connect OAuth provider via Supabase
  const handleConnectOAuth = async (provider: "github" | "discord") => {
    try {
      setOauthLoading(provider);
      const redirectTo = `${window.location.origin}/auth/callback?next=/profile`;
      
      // Use linkIdentity so the identity is connected to the existing account
      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: { redirectTo },
      });

      if (error) {
        // Fallback to signInWithOAuth if linkIdentity is unavailable
        const { error: signInError } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo },
        });
        if (signInError) throw signInError;
      }
    } catch (err: unknown) {
      console.error(`Failed to connect ${provider}:`, err);
      const message = err instanceof Error ? err.message : `Failed to connect ${provider}`;
      pushToast({
        label: "Connection Failed",
        body: message,
        tone: "bad",
      });
      setOauthLoading(null);
    }
  };

  // 4. Save manual link mutation
  const saveMutation = useMutation({
    mutationFn: async ({
      platform,
      input,
    }: {
      platform: "linkedin" | "telegram" | "portfolio" | "x";
      input: string;
    }) => {
      const payload: Record<string, string> = { platform };
      if (platform === "telegram") {
        payload.username = input;
      } else {
        payload.profileUrl = input;
      }

      const res = await fetch("/api/profile/social-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? "Failed to save link");
      return body.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["social-accounts"] });
      setValue("");
      pushToast({
        label: "Link Saved",
        body: `Your ${vars.platform} profile was updated.`,
        tone: "good",
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Could not save link";
      pushToast({
        label: "Save Failed",
        body: message,
        tone: "bad",
      });
    },
  });

  // 5. Disconnect account mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/profile/social-accounts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? "Failed to disconnect account");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-accounts"] });
      pushToast({
        label: "Disconnected",
        body: "Account unlinked successfully.",
        tone: "info",
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to disconnect";
      pushToast({
        label: "Error",
        body: message,
        tone: "bad",
      });
    },
  });

  const githubAccount = accounts.find((a) => a.platform === "github");
  const discordAccount = accounts.find((a) => a.platform === "discord");
  const manualAccounts = accounts.filter((a) => a.platform !== "github" && a.platform !== "discord");

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    saveMutation.mutate({ platform, input: value.trim() });
  };

  return (
    <Panel>
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2">
          <Label tone="accent">developer & social identities</Label>
          <span className="font-mono text-[9px] uppercase tracking-wider text-fg3">
            Realtime verified
          </span>
        </div>
        {isLoading && <Loader2 size={12} className="animate-spin text-fg3" />}
      </div>

      {/* OAuth Verified Providers */}
      <div className="divide-y divide-line border-b border-line">
        {/* GitHub */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-raised text-fg">
              <GithubIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-fg">GitHub</span>
                {githubAccount?.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded bg-mint/10 px-1.5 py-0.5 font-mono text-[10px] text-mint">
                    <CheckCircle2 size={10} /> Verified
                  </span>
                )}
              </div>
              <div className="truncate font-mono text-[11px] text-fg3">
                {githubAccount?.username ? (
                  <a
                    href={`https://github.com/${githubAccount.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1 text-accent"
                  >
                    @{githubAccount.username}
                    <ExternalLink size={10} />
                  </a>
                ) : (
                  "Sync public repos, commit frequency, and build signals"
                )}
              </div>
            </div>
          </div>

          <div>
            {githubAccount ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => deleteMutation.mutate(githubAccount.id)}
                disabled={deleteMutation.isPending}
                className="text-danger hover:border-danger/40"
              >
                Disconnect
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleConnectOAuth("github")}
                disabled={oauthLoading === "github"}
              >
                {oauthLoading === "github" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  "Connect"
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Discord */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-raised text-fg">
              <ShieldCheck size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-fg">Discord</span>
                {discordAccount?.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                    <CheckCircle2 size={10} /> Verified
                  </span>
                )}
              </div>
              <div className="truncate font-mono text-[11px] text-fg3">
                {discordAccount?.username ? (
                  <span className="text-fg2">@{discordAccount.username}</span>
                ) : (
                  "Direct hackathon partner communications and alerts"
                )}
              </div>
            </div>
          </div>

          <div>
            {discordAccount ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => deleteMutation.mutate(discordAccount.id)}
                disabled={deleteMutation.isPending}
                className="text-danger hover:border-danger/40"
              >
                Disconnect
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleConnectOAuth("discord")}
                disabled={oauthLoading === "discord"}
              >
                {oauthLoading === "discord" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  "Connect"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Connected Manual Accounts */}
      <div className="border-b border-line">
        <div className="bg-raised/40 px-5 py-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg3">
            Public Profiles & Portfolio Links
          </span>
        </div>
        <div className="divide-y divide-line">
          {manualAccounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Globe size={14} className="shrink-0 text-fg3" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-fg font-medium">
                      {account.platform}
                    </span>
                    <span className="rounded border border-line bg-raised px-1.5 py-0.2 font-mono text-[9px] text-fg3">
                      Manual link
                    </span>
                  </div>
                  <div className="truncate font-mono text-[11px] text-fg2">
                    {account.profileUrl ? (
                      <a
                        href={account.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-center gap-1 text-accent"
                      >
                        {account.profileUrl}
                        <ExternalLink size={9} />
                      </a>
                    ) : (
                      account.username || "Linked"
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => deleteMutation.mutate(account.id)}
                disabled={deleteMutation.isPending}
                className="shrink-0 text-fg3 hover:text-danger transition-colors p-1"
                aria-label={`Remove ${account.platform}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {manualAccounts.length === 0 && (
            <p className="px-5 py-3 text-[12px] text-fg3 italic">
              No manual links added yet. Add your LinkedIn, Telegram, or Portfolio below.
            </p>
          )}
        </div>
      </div>

      {/* Add / Update Manual Link Form */}
      <div className="p-5">
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as any)}
              className="h-8 rounded border border-line bg-raised px-2.5 font-mono text-[11px] text-fg uppercase focus:border-accent focus:outline-none"
            >
              <option value="linkedin">LinkedIn</option>
              <option value="telegram">Telegram</option>
              <option value="portfolio">Portfolio</option>
              <option value="x">X (Twitter)</option>
            </select>

            <div className="flex-1 min-w-0 flex gap-2">
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  platform === "telegram"
                    ? "@username"
                    : platform === "linkedin"
                    ? "linkedin.com/in/username"
                    : "https://yourportfolio.dev"
                }
                className="h-8 flex-1 min-w-0 rounded border border-line bg-raised px-3 font-mono text-[12px] text-fg placeholder:text-fg3/50 focus:border-accent focus:outline-none"
              />

              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={!value.trim() || saveMutation.isPending}
                className="shrink-0"
              >
                {saveMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={12} /> Add
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className="font-mono text-[10px] text-fg3">
            {platform === "linkedin" && "Provide your public LinkedIn URL for teammates to view."}
            {platform === "telegram" && "Enter your @username so team leads can ping you directly."}
            {platform === "portfolio" && "Link to your live projects or personal site."}
            {platform === "x" && "Link your X/Twitter handle for builder presence."}
          </p>
        </form>
      </div>
    </Panel>
  );
}
