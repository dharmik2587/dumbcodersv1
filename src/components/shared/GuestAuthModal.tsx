'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, UserPlus, LogIn, X } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface GuestModalOptions {
  actionName?: string;
  onSuccess?: () => void;
}

interface GuestAuthContextType {
  openGuestModal: (options?: GuestModalOptions) => void;
  closeGuestModal: () => void;
  requireAuth: (actionName: string, onAuthenticated: () => void) => void;
}

const GuestAuthContext = createContext<GuestAuthContextType | undefined>(undefined);

export function GuestAuthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [actionName, setActionName] = useState<string>('perform this action');

  const openGuestModal = (options?: GuestModalOptions) => {
    if (options?.actionName) setActionName(options.actionName);
    setIsOpen(true);
  };

  const closeGuestModal = () => {
    setIsOpen(false);
  };

  const requireAuth = (action: string, onAuthenticated: () => void) => {
    if (user) {
      onAuthenticated();
    } else {
      setActionName(action);
      setIsOpen(true);
    }
  };

  const returnUrl = encodeURIComponent(pathname || '/');

  return (
    <GuestAuthContext.Provider value={{ openGuestModal, closeGuestModal, requireAuth }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={closeGuestModal}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl animate-in zoom-in-95">
            <button
              onClick={closeGuestModal}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-fg3 transition-colors hover:bg-surface-2 hover:text-fg"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
              <ShieldCheck size={22} />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-fg">Create an account to continue</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-fg2">
              You&apos;re currently browsing HackMate as a guest. To {actionName.toLowerCase()}, please sign in or create a student builder profile.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                href={`/sign-in?next=${returnUrl}`}
                onClick={closeGuestModal}
                className="flex items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-[13px] font-medium text-accent-fg transition-opacity hover:opacity-95"
              >
                <LogIn size={15} />
                Sign in to your account
              </Link>

              <Link
                href={`/sign-up?next=${returnUrl}`}
                onClick={closeGuestModal}
                className="flex items-center justify-center gap-2 rounded-xl border border-line bg-canvas/60 py-2.5 text-[13px] font-medium text-fg transition-colors hover:border-fg3 hover:bg-surface-2"
              >
                <UserPlus size={15} />
                Create student builder account
              </Link>
            </div>

            <div className="mt-5 border-t border-line pt-4 text-center">
              <button
                onClick={closeGuestModal}
                className="text-[12px] font-medium text-fg3 transition-colors hover:text-fg"
              >
                Continue browsing as guest
              </button>
            </div>
          </div>
        </div>
      )}
    </GuestAuthContext.Provider>
  );
}

export function useGuestAuth() {
  const ctx = useContext(GuestAuthContext);
  if (!ctx) {
    throw new Error('useGuestAuth must be used within GuestAuthProvider');
  }
  return ctx;
}
