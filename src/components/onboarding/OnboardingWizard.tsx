'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Check, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';

const steps = ['Basics', 'College', 'Skills', 'Role', 'Availability', 'Done'];

const initialForm = {
  fullName: '',
  bio: '',
  collegeId: null as string | null,
  branch: '',
  graduationYear: new Date().getFullYear() + 4,
  skills: [] as string[],
  rolePreference: '',
  hackathonInterests: [] as string[],
  availability: '',
  portfolioUrl: '',
  linkedinUrl: '',
};

const skillOptions = ['React', 'Next.js', 'Python', 'Machine Learning', 'Design', 'Product', 'Backend', 'DevOps'];
const interestOptions = ['AI/ML', 'FinTech', 'HealthTech', 'Web3', 'EdTech', 'Climate', 'Gaming', 'Open Innovation'];

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const queryClient = useQueryClient();

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleArray = (key: 'skills' | 'hackathonInterests', value: string) => {
    const values = form[key];
    update(key, values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        collegeId: form.collegeId || null,
        graduationYear: isNaN(form.graduationYear) ? null : form.graduationYear,
        onboardingDone: true,
      };

      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error?.message ?? 'Could not save profile details.');
      }
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setStep(5);
    },
  });

  const next = () => {
    if (step === 4) {
      saveMutation.mutate();
      return;
    }
    setStep((current) => Math.min(current + 1, 5));
  };

  return (
    <div className="rounded-3xl border border-line bg-surface/90 p-8 backdrop-blur-xl shadow-2xl space-y-8">
      {/* Progress Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-line pb-6">
        {steps.map((label, index) => (
          <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold transition-all ${
                index < step
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : index === step
                  ? 'bg-accent text-black font-semibold shadow-lg shadow-accent/20'
                  : 'bg-raised text-muted border border-line'
              }`}
            >
              {index < step ? <Check size={14} /> : index + 1}
            </div>
            <span
              className={`hidden truncate font-mono text-xs font-medium sm:block ${
                index === step ? 'text-foreground' : 'text-muted'
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <Field label="Full Name">
            <input
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              placeholder="e.g. Aditi Sharma"
              className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </Field>
          <Field label="Short Bio">
            <textarea
              value={form.bio}
              onChange={(e) => update('bio', e.target.value)}
              placeholder="What do you build? What problems inspire you?"
              className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none min-h-[100px]"
            />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <Field label="College ID (optional)">
            <input
              value={form.collegeId ?? ''}
              onChange={(e) => update('collegeId', e.target.value || null)}
              placeholder="Paste college UUID if available"
              className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </Field>
          <Field label="Branch / Discipline">
            <input
              value={form.branch}
              onChange={(e) => update('branch', e.target.value)}
              placeholder="Computer Science & Engineering"
              className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </Field>
          <Field label="Graduation Year">
            <input
              type="number"
              value={form.graduationYear}
              onChange={(e) => update('graduationYear', Number(e.target.value))}
              className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </Field>
        </div>
      )}

      {step === 2 && (
        <OptionGrid
          title="Choose your primary superpowers"
          options={skillOptions}
          values={form.skills}
          onToggle={(val) => toggleArray('skills', val)}
        />
      )}

      {step === 3 && (
        <div className="space-y-7">
          <Field label="Primary Role Preference">
            <select
              value={form.rolePreference}
              onChange={(e) => update('rolePreference', e.target.value)}
              className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="">Select a role</option>
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="AI/ML">AI/ML</option>
              <option value="Designer">Designer</option>
              <option value="Product">Product</option>
              <option value="Any role">Any role</option>
            </select>
          </Field>
          <OptionGrid
            title="Domains you want to hack on"
            options={interestOptions}
            values={form.hackathonInterests}
            onToggle={(val) => toggleArray('hackathonInterests', val)}
          />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <Field label="Availability">
            <select
              value={form.availability}
              onChange={(e) => update('availability', e.target.value)}
              className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="">Choose availability</option>
              <option value="Weekends">Weekends</option>
              <option value="Evenings">Evenings</option>
              <option value="Flexible">Flexible</option>
              <option value="Full-time during events">Full-time during events</option>
            </select>
          </Field>
          <Field label="Portfolio / Personal URL (optional)">
            <input
              value={form.portfolioUrl}
              onChange={(e) => update('portfolioUrl', e.target.value)}
              placeholder="https://portfolio.dev"
              className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </Field>
          <Field label="LinkedIn Profile (optional)">
            <input
              value={form.linkedinUrl}
              onChange={(e) => update('linkedinUrl', e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </Field>
        </div>
      )}

      {step === 5 && (
        <div className="rounded-2xl border border-accent/30 bg-accent/10 p-8 text-center space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-black">
            <Sparkles size={24} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Your profile is initialized!</h2>
          <p className="text-sm text-subtle max-w-md mx-auto leading-relaxed">
            Your builder profile and student code are linked. You can now discover complement-matching builders and assemble hackathon teams.
          </p>
          <div className="pt-4">
            <Link
              href="/b"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-xs font-semibold text-black transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-accent/20"
            >
              <span>Enter Builders Feed</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {saveMutation.isError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle size={15} />
          <span>{saveMutation.error.message}</span>
        </div>
      )}

      {step < 5 && (
        <div className="flex items-center justify-between gap-3 border-t border-line pt-6">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0 || saveMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-raised/50 px-5 py-2.5 text-xs font-medium text-foreground hover:bg-raised transition-all disabled:opacity-40"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-6 py-2.5 text-xs font-semibold text-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            <span>{saveMutation.isPending ? 'Saving…' : step === 4 ? 'Finish Profile' : 'Continue'}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="font-mono text-xs uppercase tracking-wider text-subtle">{label}</span>
      {children}
    </label>
  );
}

function OptionGrid({
  title,
  options,
  values,
  onToggle,
}: {
  title: string;
  options: string[];
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-4 font-mono text-xs uppercase tracking-wider text-subtle">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const active = values.includes(option);
          return (
            <button
              type="button"
              key={option}
              onClick={() => onToggle(option)}
              className={`rounded-xl border p-3.5 text-left font-mono text-xs font-medium transition-all ${
                active
                  ? 'border-accent bg-accent/15 text-accent shadow-sm'
                  : 'border-line bg-raised/50 text-subtle hover:border-line-strong hover:text-foreground'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
