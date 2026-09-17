'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock, Code2, Sparkles } from 'lucide-react';
import { getFeatureStatus, type FeatureStatusLevel } from '@/lib/feature-status';
import { cn } from '@/client/utils/cn';

interface FeatureStatusProps {
  featureKey?: string;
  status?: FeatureStatusLevel;
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

export function FeatureStatus({
  featureKey,
  status: overrideStatus,
  title: overrideTitle,
  description: overrideDescription,
  className,
  compact = false,
}: FeatureStatusProps) {
  const config = featureKey ? getFeatureStatus(featureKey) : null;
  const status = overrideStatus || config?.status || 'BETA';
  const title = overrideTitle || config?.headline || config?.name || 'Feature Status';
  const description =
    overrideDescription ||
    config?.description ||
    (status === 'UNDER_DEVELOPMENT'
      ? "We're actively building this part of HackMate. Check back soon or help us build it."
      : status === 'TEMPORARILY_UNAVAILABLE'
      ? "We're having trouble loading live data for this feature. Please try again shortly."
      : 'This feature is currently in active beta testing.');

  const toneConfig = {
    LIVE: {
      border: 'border-mint/30',
      bg: 'bg-mint/5',
      badgeBg: 'bg-mint/15 text-mint border-mint/30',
      icon: CheckCircle2,
      label: 'LIVE',
    },
    BETA: {
      border: 'border-accent/30',
      bg: 'bg-accent/5',
      badgeBg: 'bg-accent/15 text-accent border-accent/30',
      icon: Sparkles,
      label: 'BETA',
    },
    UNDER_DEVELOPMENT: {
      border: 'border-amber/30',
      bg: 'bg-amber/5',
      badgeBg: 'bg-amber/15 text-amber border-amber/30',
      icon: Code2,
      label: 'UNDER DEVELOPMENT',
    },
    TEMPORARILY_UNAVAILABLE: {
      border: 'border-red-500/30',
      bg: 'bg-red-500/5',
      badgeBg: 'bg-red-500/15 text-red-400 border-red-500/30',
      icon: AlertTriangle,
      label: 'TEMPORARILY UNAVAILABLE',
    },
    COMING_SOON: {
      border: 'border-line',
      bg: 'bg-surface/60',
      badgeBg: 'bg-surface-2 text-fg3 border-line',
      icon: Clock,
      label: 'COMING SOON',
    },
    DEPRECATED: {
      border: 'border-line',
      bg: 'bg-surface/40',
      badgeBg: 'bg-surface-2 text-fg3 border-line',
      icon: AlertTriangle,
      label: 'DEPRECATED',
    },
  }[status] || {
    border: 'border-line',
    bg: 'bg-surface',
    badgeBg: 'bg-surface-2 text-fg',
    icon: Sparkles,
    label: status,
  };

  const Icon = toneConfig.icon;

  if (compact) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider',
          toneConfig.badgeBg,
          className
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
        <span>{toneConfig.label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-5 backdrop-blur-sm transition-all',
        toneConfig.border,
        toneConfig.bg,
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
              toneConfig.badgeBg
            )}
          >
            <Icon size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider',
                  toneConfig.badgeBg
                )}
              >
                {toneConfig.label}
              </span>
              <h4 className="text-[14px] font-semibold text-fg">{title}</h4>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-fg2">{description}</p>
          </div>
        </div>

        {status === 'UNDER_DEVELOPMENT' && (
          <Link
            href="/careers"
            className="shrink-0 rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-fg transition-colors hover:border-fg3 hover:bg-surface-2"
          >
            Help build it →
          </Link>
        )}
        {status === 'TEMPORARILY_UNAVAILABLE' && (
          <Link
            href="/report-problem"
            className="shrink-0 rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-fg transition-colors hover:border-fg3 hover:bg-surface-2"
          >
            Report issue →
          </Link>
        )}
      </div>
    </div>
  );
}
