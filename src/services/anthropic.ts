import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.ts';

/**
 * AI year-in-review summary via the Anthropic API.
 *
 * Model is `claude-sonnet-4-6` per the product spec. Thinking is disabled — this
 * is a short, factual generation, not a reasoning task — and output is capped
 * tight. The prompt asks for 3–4 sentences, factual and complimentary.
 */

export interface SummaryStats {
  username: string;
  totalCommits: number;
  repoCount: number;
  totalStars: number;
  currentStreak: number;
  longestStreak: number;
  primaryLanguage: string | null;
  topLanguages: { language: string; percentage: number }[];
  busiestMonth: string | null; // e.g. "March 2025"
  busiestDay: string | null; // e.g. "Wednesday"
  prs: {
    total: number;
    mergeRate: number;
    avgOpenToMergeHours: number | null;
    avgFirstReviewHours: number | null;
  };
}

export class AnthropicNotConfiguredError extends Error {
  constructor() {
    super('anthropic_not_configured');
    this.name = 'AnthropicNotConfiguredError';
  }
}

function buildPrompt(s: SummaryStats): string {
  const langLine = s.topLanguages
    .slice(0, 3)
    .map((l) => `${l.language} (${l.percentage.toFixed(0)}%)`)
    .join(', ');

  const avgMerge =
    s.prs.avgOpenToMergeHours != null
      ? `${s.prs.avgOpenToMergeHours.toFixed(1)}h avg open-to-merge`
      : 'no merge-time data';
  const avgReview =
    s.prs.avgFirstReviewHours != null
      ? `${s.prs.avgFirstReviewHours.toFixed(1)}h avg to first review`
      : 'no review-time data';

  return [
    `Write a 3–4 sentence summary of this developer's coding year on GitHub.`,
    `Be factual and complimentary — never hyperbolic or salesy. Do not use markdown, bullet points, or headings; write flowing prose.`,
    `Mention: total commit volume, their busiest period, their primary language, and one notable pull-request or collaboration insight.`,
    ``,
    `Developer: ${s.username}`,
    `Total commits (last 12 months): ${s.totalCommits}`,
    `Public + private repositories: ${s.repoCount}`,
    `Total stars earned: ${s.totalStars}`,
    `Current streak: ${s.currentStreak} days; longest streak: ${s.longestStreak} days`,
    `Primary language: ${s.primaryLanguage ?? 'unknown'}`,
    `Top languages: ${langLine || 'n/a'}`,
    `Busiest month: ${s.busiestMonth ?? 'unknown'}`,
    `Most active weekday: ${s.busiestDay ?? 'unknown'}`,
    `Pull requests: ${s.prs.total} opened, ${s.prs.mergeRate.toFixed(0)}% merged, ${avgMerge}, ${avgReview}`,
  ].join('\n');
}

export async function generateSummary(stats: SummaryStats): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new AnthropicNotConfiguredError();
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    thinking: { type: 'disabled' },
    system:
      'You are a concise technical writer producing a factual, complimentary ' +
      'year-in-review paragraph about a software developer. No hyperbole, no marketing ' +
      'language, no markdown formatting.',
    messages: [{ role: 'user', content: buildPrompt(stats) }],
  });

  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}
