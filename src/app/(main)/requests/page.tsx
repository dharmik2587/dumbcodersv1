"use client";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Inbox, Send, X, Loader2, MessageSquare } from "lucide-react";
import { byIdMap, useMe, useApiStore } from "@/client/store/apiStore";
import { ROLE_LABEL, type RoleKey } from "@/client/types";
import { teamCoverage } from "@/client/lib/matching";
import { Avatar, CoverageHead, CoverageMatrix, CoverageLegend, relTime, roleTone } from "@/components/shared";
import {
  Button,
  Chip,
  EmptyState,
  Label,
  Panel,
  Reveal,
  SectionHead,
  StateDot,
  Tabs,
  Modal,
} from "@/components/ui";
import { cn } from "@/client/utils/cn";

const STATUS_TONE: Record<string, "accent" | "mint" | "amber" | "danger" | "neutral"> = {
  pending: "accent",
  accepted: "mint",
  rejected: "danger",
  withdrawn: "neutral",
};

// Map DB status to display label
const STATUS_LABEL: Record<string, string> = {
  pending: "pending",
  accepted: "accepted",
  rejected: "declined",
  withdrawn: "withdrawn",
};

export type RequestRow = {
  request?: {
    id: string;
    fromUserId: string;
    toUserId: string;
    status: string;
    message?: string | null;
    roleOffered?: string | null;
    createdAt?: string;
    teamId?: string | null;
  };
  id?: string;
  fromUserId?: string;
  toUserId?: string;
  status?: string;
  message?: string | null;
  roleOffered?: string | null;
  createdAt?: string;
  teamId?: string | null;
  from?: {
    id: string;
    fullName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
  } | null;
  team?: {
    id?: string;
    name?: string;
  } | null;
};

function Requests() {
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [loading, setLoading] = useState(true);
  const me = useMe();
  const requests = useApiStore((s) => s.requests);
  const loadRequests = useApiStore((s) => s.loadRequests);
  const teams = useApiStore((s) => s.teams);
  const loadTeams = useApiStore((s) => s.loadTeams);
  const builders = useApiStore((s) => s.builders);
  const loadBuilders = useApiStore((s) => s.loadBuilders);
  const byId = useMemo(() => byIdMap(builders), [builders]);

  useEffect(() => {
    Promise.all([loadRequests(), loadTeams(), loadBuilders()]).then(() =>
      setLoading(false)
    );
  }, [loadRequests, loadTeams, loadBuilders]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] py-16 text-center">
        <Loader2 size={20} className="mx-auto animate-spin text-accent" />
      </div>
    );
  }

  // Real DB fields: fromUserId / toUserId / status
  const inbox = (requests as unknown as RequestRow[]).filter(
    (r) => r.request?.toUserId === me.id || r.toUserId === me.id
  );
  const sent = (requests as unknown as RequestRow[]).filter(
    (r) => r.request?.fromUserId === me.id || r.fromUserId === me.id
  );
  const list = tab === "inbox" ? inbox : sent;

  return (
    <div className="mx-auto max-w-[1400px]">
      <SectionHead
        index="03"
        kicker="Requests"
        title={<>Structured asks, not cold DMs.</>}
        sub="Every request carries a role, an event and a reason. Accepting one writes straight into the roster — coverage recomputes, the slot closes, the build log updates."
      />

      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "inbox", label: "Inbox", count: inbox.filter((r) => (r.request?.status ?? r.status) === "pending").length },
            { id: "sent", label: "Sent", count: sent.length },
          ]}
        />
      </div>

      <div className="py-8">
        {list.length === 0 ? (
          <EmptyState
            title={tab === "inbox" ? "Inbox is clear" : "Nothing sent yet"}
            body={
              tab === "inbox"
                ? "Requests land here when someone wants a slot on one of your teams. Head to matching to see who complements your roster."
                : "Open matching, pick a builder and send a structured request with a role and a reason."
            }
            action={<Link href="/match"><Button><Inbox size={13} /> Open matching</Button></Link>}
          />
        ) : (
          <div className="grid gap-px border border-line bg-line md:grid-cols-2 xl:grid-cols-3">
            {list.map((r, i: number) => (
              <Reveal key={r.request?.id ?? r.id} delay={i * 60}>
                <RequestCard r={r} byId={byId} teams={teams} inbox={tab === "inbox"} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestCard({
  r,
  byId,
  teams,
  inbox,
}: {
  r: RequestRow;
  byId: Map<string, import("@/client/types").Builder>;
  teams: import("@/client/types").Team[];
  inbox: boolean;
}) {
  const acceptRequest = useApiStore((s) => s.acceptRequest);
  const rejectRequest = useApiStore((s) => s.rejectRequest);
  const withdrawRequest = useApiStore((s) => s.withdrawRequest);
  const pushToast = useApiStore((s) => s.pushToast);
  const me = useMe();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [acting, setActing] = useState(false);

  // Support both raw and joined shapes
  const req = r.request ?? r;
  const fromProfile = r.from ?? null;
  const teamData = r.team ?? null;

  const requestId = req.id || "";
  const fromUserId = req.fromUserId || "";
  const toUserId = req.toUserId || "";
  const status = req.status ?? "pending";
  const message = req.message;
  const roleOffered = req.roleOffered;
  const createdAt = req.createdAt || new Date().toISOString();
  const teamId = req.teamId;

  // Look up the "other" person
  const otherUserId = inbox ? fromUserId : toUserId;
  const person = (otherUserId ? byId.get(otherUserId) : null) ?? (fromProfile ? {
    id: fromProfile.id,
    name: fromProfile.fullName ?? fromProfile.username ?? "Unknown",
    handle: fromProfile.username ?? "",
    avatarUrl: fromProfile.avatarUrl ?? undefined,
    initials: (fromProfile.fullName ?? fromProfile.username ?? "?").slice(0, 2).toUpperCase(),
    skills: [],
    repos: [],
  } : null);

  const team = teams.find((t) => t.id === teamId) ?? (teamData?.id ? { id: teamData.id, name: teamData.name || 'Team', members: [], openSlots: [], hackathonId: '', ownerId: '', visibility: 'discoverable' as const } : null);
  const statusTone = STATUS_TONE[status] ?? "neutral";
  const statusLabel = STATUS_LABEL[status] ?? status;

  const act = async (action: "accept" | "reject" | "withdraw") => {
    if (!requestId) return;
    setActing(true);
    try {
      if (action === "accept") {
        const res = await acceptRequest(requestId);
        await queryClient.invalidateQueries({ queryKey: ["requests"] });
        await queryClient.invalidateQueries({ queryKey: ["requests", "received"] });
        await queryClient.invalidateQueries({ queryKey: ["requests", "sent"] });
        await queryClient.invalidateQueries({ queryKey: ["notifications"] });
        if (res?.conversation?.id) {
          router.push(`/messages?conversationId=${res.conversation.id}`);
        }
      } else if (action === "reject") {
        await rejectRequest(requestId);
        await queryClient.invalidateQueries({ queryKey: ["requests"] });
        await queryClient.invalidateQueries({ queryKey: ["requests", "received"] });
        await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } else {
        await withdrawRequest(requestId);
        await queryClient.invalidateQueries({ queryKey: ["requests"] });
        await queryClient.invalidateQueries({ queryKey: ["requests", "sent"] });
        await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    } finally {
      setActing(false);
    }
  };

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{
    id: string;
    content: string;
    createdAt: string;
    userId: string;
    authorName?: string | null;
    authorUsername?: string | null;
    authorAvatar?: string | null;
  }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const loadChat = async () => {
    if (!teamId) return;
    setChatLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/messages`);
      const data = await res.json();
      if (data.success && data.data) {
        setMessages(data.data);
      }
    } catch (e) {
      console.error("Failed to load chat", e);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !teamId || sendingMsg) return;
    setSendingMsg(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: chatInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setChatInput("");
        await loadChat();
      } else {
        pushToast({ label: "Error", body: data.message || "Failed to send message", tone: "bad" });
      }
    } catch (e) {
      pushToast({ label: "Error", body: "Could not send message", tone: "bad" });
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-surface p-5 transition-opacity duration-500",
        (status === "rejected" || status === "withdrawn") && "opacity-50",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.16em] text-fg3">{requestId.slice(0, 8)}…</span>
        <span className="font-mono text-[10px] text-fg3">{relTime(createdAt)}</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        {person ? (
          <Avatar b={person} size={34} />
        ) : (
          <span className="h-[34px] w-[34px] border border-line bg-raised" />
        )}
        <div className="min-w-0 flex-1">
          <Link
            href={person ? `/b/${person.id}` : "#"}
            className="block truncate text-[14px] text-fg transition-colors hover:text-accent"
          >
            {person?.name ?? "Unknown"}
          </Link>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg3">
            {roleOffered ? ROLE_LABEL[roleOffered as RoleKey] ?? roleOffered : "—"} · {team?.name ?? "No team"}
          </div>
        </div>
      </div>

      {message && (
        <p className="mt-4 flex-1 text-[13px] leading-[1.65] text-fg2">&quot;{message}&quot;</p>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {roleOffered && (
          <Chip tone={roleTone[roleOffered as RoleKey] ?? "neutral"}>
            {ROLE_LABEL[roleOffered as RoleKey] ?? roleOffered}
          </Chip>
        )}
        <Chip tone={statusTone}>
          <StateDot
            tone={
              statusTone === "neutral"
                ? "muted"
                : (statusTone as "mint" | "amber" | "accent" | "danger")
            }
          />
          {statusLabel}
        </Chip>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4">
        {status === "accepted" ? (
          <div className="flex w-full items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mint">
              <Check size={11} /> added to roster
            </span>
            {teamId ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setChatOpen(true);
                  loadChat();
                }}
                className="flex items-center gap-1.5"
              >
                <MessageSquare size={12} className="text-accent" />
                Chat
              </Button>
            ) : null}
          </div>
        ) : inbox ? (
          status === "rejected" ? (
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-danger">
              <X size={11} /> declined
            </span>
          ) : (
            <>
              <Button
                size="sm"
                disabled={acting}
                onClick={() => act("accept")}
              >
                {acting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={acting}
                onClick={() => act("reject")}
              >
                <X size={11} /> Pass
              </Button>
            </>
          )
        ) : (
          status === "pending" ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={acting}
              onClick={() => act("withdraw")}
            >
              {acting ? <Loader2 size={12} className="animate-spin" /> : <X size={11} />}
              Withdraw
            </Button>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg3">
              {statusLabel}
            </span>
          )
        )}
      </div>

      {/* Team Chat Modal */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex h-[520px] w-full max-w-lg flex-col border border-line-strong bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div>
                <h3 className="font-mono text-[13px] uppercase tracking-wider text-fg">
                  Chat · {team?.name ?? "Team"}
                </h3>
                <span className="font-mono text-[10px] text-fg3">
                  Teammate: {person?.name ?? "Member"}
                </span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="font-mono text-[13px] text-fg3 hover:text-fg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 size={18} className="animate-spin text-accent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-6 text-fg3">
                  <MessageSquare size={28} className="mb-2 opacity-40 text-accent" />
                  <p className="font-mono text-[12px]">No messages yet.</p>
                  <p className="font-mono text-[10px] mt-1 text-fg3">
                    Start collaborating with {person?.name ?? "your teammate"}!
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.userId === me.id;
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex flex-col max-w-[80%]",
                        isMe ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <span className="font-mono text-[9px] text-fg3 mb-1">
                        {isMe ? "You" : m.authorName || m.authorUsername || "Teammate"} · {relTime(m.createdAt)}
                      </span>
                      <div
                        className={cn(
                          "px-3.5 py-2 text-[13px] leading-relaxed",
                          isMe
                            ? "bg-accent text-canvas"
                            : "border border-line bg-raised text-fg"
                        )}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-line p-3">
              <input
                type="text"
                placeholder="Type a message to your team…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={sendingMsg}
                className="flex-1 border border-line bg-raised px-3 py-2 font-mono text-[12px] text-fg placeholder:text-fg3 outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || sendingMsg}
                className="flex items-center gap-1.5 border border-accent bg-accent px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-canvas hover:bg-accent/90 disabled:opacity-50"
              >
                {sendingMsg ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CLUSTER_LABEL(c: string) {
  const map: Record<string, string> = {
    interface: "Interface",
    services: "Services",
    infra: "Infra",
    intelligence: "Intelligence",
    craft: "Craft",
    narrative: "Narrative",
    mobile: "Mobile",
  };
  return map[c] ?? c;
}

export default Requests;
