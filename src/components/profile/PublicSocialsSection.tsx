'use client';

import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Panel, Label, Chip } from '@/components/ui';

export interface PublicSocialAccountItem {
  platform: string;
  username: string | null;
  displayName?: string | null;
  profileUrl: string | null;
  isVerified: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  github: 'GitHub',
  discord: 'Discord',
  linkedin: 'LinkedIn',
  telegram: 'Telegram',
  portfolio: 'Portfolio',
  x: 'X (Twitter)',
  devto: 'Dev.to',
  kaggle: 'Kaggle',
  codeforces: 'Codeforces',
  stackoverflow: 'Stack Overflow',
};

export function PublicSocialsSection({
  accounts = [],
}: {
  accounts: PublicSocialAccountItem[];
}) {
  if (!accounts || accounts.length === 0) {
    return (
      <Panel>
        <div className="border-b border-line px-5 py-3">
          <Label tone="accent">Developer & Social Profiles</Label>
        </div>
        <div className="px-5 py-4 text-[12.5px] text-fg3 font-mono">
          No external profiles linked yet.
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <Label tone="accent">Developer & Social Profiles</Label>
        <span className="font-mono text-[10px] text-fg3">{accounts.length} linked</span>
      </div>
      <div className="divide-y divide-line">
        {accounts.map((acc, index) => {
          const label = PLATFORM_LABELS[acc.platform.toLowerCase()] || acc.platform;
          const displayHandle = acc.username
            ? acc.username.startsWith('@')
              ? acc.username
              : `@${acc.username}`
            : acc.displayName || 'Linked Profile';
          const isVerified = acc.isVerified;

          return (
            <div
              key={`${acc.platform}-${index}`}
              className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-hover"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-medium text-fg">{label}</span>
                  {isVerified ? (
                    <Chip tone="mint">
                      <ShieldCheck className="w-3 h-3 inline mr-1 text-mint" />
                      Verified
                    </Chip>
                  ) : null}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-fg3 truncate">
                  {displayHandle}
                </div>
              </div>

              {acc.profileUrl ? (
                <a
                  href={acc.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] text-fg2 hover:text-accent transition-colors px-2.5 py-1 border border-line bg-surface rounded hover:border-accent-line"
                >
                  <span>{isVerified ? 'View' : 'Profile'}</span>
                  <ExternalLink size={11} />
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
