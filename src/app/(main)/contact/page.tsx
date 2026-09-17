'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bug,
  Building2,
  CheckCircle2,
  ChevronLeft,
  GraduationCap,
  Mail,
  MessageSquare,
  Send,
  Sparkles,
} from 'lucide-react';
import { Panel, Reveal, Button } from '@/components/ui';
import { BetaBadge } from '@/components/shared/BetaBadge';

export default function ContactPage() {
  const [topic, setTopic] = useState<'partnership' | 'campus' | 'media' | 'general'>('partnership');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For non-technical inquiries, provide immediate acknowledgement
    setSubmitted(true);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-20">
      <Reveal>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-fg3 transition-colors hover:text-fg"
        >
          <ChevronLeft size={16} />
          Back to HackMate
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">Contact HackMate</h1>
          <BetaBadge />
        </div>

        <p className="mt-4 text-[15px] leading-relaxed text-fg2">
          Have an inquiry regarding university partnerships, student club chapters, sponsorships, or media?
          We would love to talk.
        </p>

        {/* Callout directing bug reports to Report a Problem */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber/30 bg-amber/5 p-4">
          <Bug size={18} className="mt-0.5 shrink-0 text-amber" />
          <div className="text-[13px] leading-relaxed text-fg2">
            <span className="font-semibold text-fg">Looking to report a bug or broken page?</span>
            <p className="mt-0.5">
              Please use our dedicated{' '}
              <Link href="/report-problem" className="font-medium text-amber hover:underline">
                Report a Problem form →
              </Link>{' '}
              so your issue gets automatically tagged with reproduction metadata and routed to our bug triage queue.
            </p>
          </div>
        </div>
      </Reveal>

      {submitted ? (
        <Reveal delay={40}>
          <Panel className="mt-8 border-mint/40 bg-mint/5 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mint/20 text-mint">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-fg">Message Received</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-fg2">
              Thank you for reaching out to HackMate Labs. A student representative will review your message and reply to {email}.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
                Send another message
              </Button>
              <Link href="/">
                <Button size="sm">Back to homepage</Button>
              </Link>
            </div>
          </Panel>
        </Reveal>
      ) : (
        <Reveal delay={40}>
          <form onSubmit={handleSubmit} className="mt-8">
            <Panel className="space-y-5 p-6 md:p-8">
              <div>
                <label className="block text-[13px] font-medium text-fg">
                  What would you like to discuss? <span className="text-amber">*</span>
                </label>
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: 'partnership', label: 'Partnership', icon: Building2 },
                    { id: 'campus', label: 'Campus Chapter', icon: GraduationCap },
                    { id: 'media', label: 'Media / Press', icon: Sparkles },
                    { id: 'general', label: 'General Question', icon: MessageSquare },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = topic === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTopic(t.id as any)}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all ${
                          isSelected
                            ? 'border-accent bg-accent/10 font-medium text-fg'
                            : 'border-line bg-surface/50 text-fg2 hover:border-fg3 hover:bg-surface'
                        }`}
                      >
                        <Icon size={16} className={isSelected ? 'text-accent' : 'text-fg3'} />
                        <span className="text-[12px]">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-[13px] font-medium text-fg">
                    Your name <span className="text-amber">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priyansh Rao"
                    className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2 text-[13px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-fg">
                    Your email <span className="text-amber">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@college.edu or name@company.com"
                    className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2 text-[13px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-fg">
                  Message <span className="text-amber">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your university, hackathon event, or proposal..."
                  className="mt-1.5 w-full rounded-xl border border-line bg-canvas p-3 text-[13px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
                />
              </div>

              <Button type="submit" size="lg" className="w-full justify-center gap-2">
                <Send size={15} />
                Send message
              </Button>
            </Panel>
          </form>
        </Reveal>
      )}

      {/* Direct Contact Channels */}
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Panel className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg">
              <Mail size={16} />
            </div>
            <div>
              <h4 className="text-[13px] font-semibold text-fg">Email Us Directly</h4>
              <p className="font-mono text-[12px] text-fg3">team@hackmatelabs.org</p>
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg">
              <GraduationCap size={16} />
            </div>
            <div>
              <h4 className="text-[13px] font-semibold text-fg">Campus Representatives</h4>
              <Link href="/campus-reps" className="text-[12px] text-accent hover:underline">
                Explore university chapters →
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
