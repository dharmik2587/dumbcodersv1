"use client";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Inbox, Send, X, Loader2 } from "lucide-react";
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
  const inbox = requests.filter((r: any) => r.request?.toUserId === me.id || r.toUserId === me.id);
  const sent = requests.filter((r: any) => r.request?.fromUserId === me.id || r.fromUserId === me.id);
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
            { id: "inbox", label: "Inbox", count: inbox.filter((r: any) => (r.request?.status ?? r.status) === "pending").length },
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
            {list.map((r: any, i: number) => (
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
  r: any;
  byId: Map<string, any>;
  teams: any[];
  inbox: boolean;
}) {
  const acceptRequest = useApiStore((s) => s.acceptRequest);
  const rejectRequest = useApiStore((s) => s.rejectRequest);
  const withdrawRequest = useApiStore((s) => s.withdrawRequest);
  const pushToast = useApiStore((s) => s.pushToast);
  const [acting, setActing] = useState(false);

  // Support both raw and joined shapes
  const req = r.request ?? r;
  const fromProfile = r.from ?? null;
  const teamData = r.team ?? null;

  const requestId = req.id;
  const fromUserId = req.fromUserId;
  const toUserId = req.toUserId;
  const status = req.status ?? "pending";
  const message = req.message;
  const roleOffered = req.roleOffered;
  const createdAt = req.createdAt;
  const teamId = req.teamId;

  // Look up the "other" person
  const otherUserId = inbox ? fromUserId : toUserId;
  const person = byId.get(otherUserId) ?? (fromProfile ? {
    id: fromProfile.id,
    name: fromProfile.fullName ?? fromProfile.username ?? "Unknown",
    handle: fromProfile.username ?? "",
    avatarUrl: fromProfile.avatarUrl,
    initials: (fromProfile.fullName ?? fromProfile.username ?? "?").slice(0, 2).toUpperCase(),
    skills: [],
    repos: [],
  } : null);

  const team = teams.find((t) => t.id === teamId) ?? (teamData ? { id: teamData.id, name: teamData.name, members: [], openSlots: [] } : null);
  const statusTone = STATUS_TONE[status] ?? "neutral";
  const statusLabel = STATUS_LABEL[status] ?? status;

  const act = async (action: "accept" | "reject" | "withdraw") => {
    setActing(true);
    try {
      if (action === "accept") {
        await acceptRequest(requestId);
      } else if (action === "reject") {
        await rejectRequest(requestId);
      } else {
        await withdrawRequest(requestId);
      }
    } finally {
      setActing(false);
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
        <p className="mt-4 flex-1 text-[13px] leading-[1.65] text-fg2">"{message}"</p>
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

      <div className="mt-4 flex gap-2 border-t border-line pt-4">
        {inbox ? (
          status === "accepted" ? (
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mint">
              <Check size={11} /> added to roster
            </span>
          ) : status === "rejected" ? (
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
