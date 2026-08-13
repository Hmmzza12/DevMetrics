import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { api, ApiError } from '@/api/client';
import type { Languages, Overview, PRMetrics } from '@/api/types';
import { ReportDocument, type ReportData } from './ReportDocument';

/** Public source: a looked-up username. Absent = the logged-in OAuth user. */
export interface PublicExportSource {
  username: string;
  avatarUrl: string | null;
}

/**
 * Gathers every section's data fresh, renders the PDF report, and downloads it.
 *
 * OAuth mode includes the AI summary (optional — omitted if not configured).
 * Public mode NEVER calls the Anthropic API: it uses the public endpoints and a
 * templated, non-AI summary built from the stats, so a public lookup can never
 * spend AI credits.
 */
export function useExportReport(source?: PublicExportSource) {
  const [isExporting, setIsExporting] = useState(false);
  const isPublic = source != null;

  async function exportReport() {
    setIsExporting(true);
    try {
      const [overview, languages, prs, repos] = isPublic
        ? await Promise.all([
            api.publicOverview(source.username),
            api.publicLanguages(source.username),
            api.publicPrs(source.username),
            api.publicRepos(source.username),
          ])
        : await Promise.all([
            api.overview(),
            api.languages(),
            api.prs(),
            api.repos(),
          ]);

      const me = isPublic
        ? { id: 0, username: source.username, avatar_url: source.avatarUrl }
        : await api.me();

      let summary: string | null;
      if (isPublic) {
        // Templated, non-AI summary — no Anthropic call for public lookups.
        summary = templatedSummary(source.username, overview, languages, prs);
      } else {
        summary = null;
        try {
          summary = (await api.reportSummary()).summary;
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 503)) {
            console.error('AI summary unavailable for export:', err);
          }
        }
      }

      const topRepos = [...repos.repos]
        .sort((a, b) => b.commit_count - a.commit_count)
        .slice(0, 5);

      const data: ReportData = {
        me,
        overview,
        languages,
        prs,
        topRepos,
        summary,
        year: new Date().getFullYear(),
      };

      const blob = await pdf(<ReportDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devmetrics-${me.username}-${data.year}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  return { exportReport, isExporting };
}

function templatedSummary(
  username: string,
  overview: Overview,
  languages: Languages,
  prs: PRMetrics,
): string {
  const topLang = languages.languages[0]?.language ?? 'various languages';
  const mergeRate = Math.round(prs.merge_rate);
  const prClause =
    prs.total_prs > 0
      ? ` Over ${prs.total_prs} pull request${prs.total_prs === 1 ? '' : 's'}, ${username} maintained a ${mergeRate}% merge rate.`
      : '';
  return (
    `In the last 12 months, ${username} pushed ${overview.total_commits.toLocaleString()} ` +
    `commit${overview.total_commits === 1 ? '' : 's'} across ${overview.repo_count} public ` +
    `repositor${overview.repo_count === 1 ? 'y' : 'ies'}, working primarily in ${topLang}. ` +
    `Their work has earned ${overview.total_stars.toLocaleString()} star${overview.total_stars === 1 ? '' : 's'}, ` +
    `with a longest streak of ${overview.longest_streak} day${overview.longest_streak === 1 ? '' : 's'}.` +
    prClause
  );
}
