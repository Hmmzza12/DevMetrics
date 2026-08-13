import { createFileRoute } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { GitPullRequest, GitFork, Languages, Activity } from 'lucide-react';
import { FeatureCard } from '@/components/landing/FeatureCard';
import { ProfileLookupForm } from '@/components/landing/ProfileLookupForm';
import { githubLoginUrl } from '@/api/client';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-32 text-center">
        <div className="hero-gradient pointer-events-none absolute inset-0" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          <div className="mb-6 flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs font-medium text-muted">
            <GitFork className="h-3.5 w-3.5" />
            GitHub analytics, not a toy
          </div>

          <h1 className="max-w-3xl font-heading text-5xl font-bold tracking-tight text-text sm:text-6xl">
            Your GitHub story,{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              visualized
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted">
            Commit patterns, PR turnaround, language breakdown — the metrics
            engineering teams actually track, turned into a report worth
            sharing.
          </p>

          {/* Primary action: public lookup, no login required. */}
          <div className="mt-10 flex w-full flex-col items-center">
            <ProfileLookupForm />

            {/* Secondary, de-emphasized: OAuth for private-repo access. */}
            <button
              onClick={() => (window.location.href = githubLoginUrl)}
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-text"
            >
              <GitFork className="h-3.5 w-3.5" />
              Or connect your GitHub for private repo access
              <span aria-hidden>→</span>
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── About ────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-primary">
            About
          </h2>
          <p className="text-lg leading-relaxed text-muted">
            DevMetrics connects to your GitHub account and turns a year of
            activity into a clear picture of how you actually work — commit
            cadence, a contribution heatmap, language breakdown, and pull-request
            turnaround. It's a data tool for engineers, not a novelty — the same
            metrics real teams track, plus an exportable report.
          </p>
        </motion.div>
      </section>

      {/* ── Feature cards ────────────────────────────────────────────── */}
      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-6 pb-32 sm:grid-cols-3">
        <FeatureCard
          icon={Activity}
          title="Commit Patterns"
          description="A full year of activity, broken down by day of week and hour of day — see exactly when you do your best work."
          delay={0}
        />
        <FeatureCard
          icon={GitPullRequest}
          title="PR Analytics"
          description="Open-to-merge time, review turnaround, and merge rate — the numbers that show up in every engineering retro."
          delay={0.1}
        />
        <FeatureCard
          icon={Languages}
          title="Language Breakdown"
          description="Where your code actually lives, across every repo you own — public and private."
          delay={0.2}
        />
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-muted sm:flex-row">
          <span>DevMetrics</span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-text"
          >
            <GitFork className="h-4 w-4" />
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
