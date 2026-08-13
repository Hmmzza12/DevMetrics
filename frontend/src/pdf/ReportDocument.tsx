import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Languages, Me, Overview, PRMetrics, Repo } from '@/api/types';
import { formatHours } from '@/lib/format';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    color: '#334155',
    fontFamily: 'Helvetica',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#111118',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#6366f1',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#334155',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statBox: {
    width: '25%',
    paddingRight: 10,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#111118',
  },
  statLabel: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  rowLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  rowValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111118',
  },
  langBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginTop: 3,
    marginBottom: 8,
  },
  langBarFill: {
    height: 6,
    backgroundColor: '#6366f1',
    borderRadius: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

export interface ReportData {
  me: Me;
  overview: Overview;
  languages: Languages;
  prs: PRMetrics;
  topRepos: Repo[];
  summary: string | null;
  year: number;
}

export function ReportDocument({ data }: { data: ReportData }) {
  const { me, overview, languages, prs, topRepos, summary, year } = data;
  const topLanguages = languages.languages.slice(0, 6);

  return (
    <Document title={`DevMetrics Annual Report ${year}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          {me.avatar_url && <Image src={me.avatar_url} style={styles.avatar} />}
          <View>
            <Text style={styles.title}>DevMetrics Annual Report {year}</Text>
            <Text style={styles.subtitle}>{me.username}</Text>
          </View>
        </View>

        {summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Year in Review</Text>
            <Text style={styles.paragraph}>{summary}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{overview.total_commits}</Text>
              <Text style={styles.statLabel}>Total Commits</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{overview.repo_count}</Text>
              <Text style={styles.statLabel}>Repos</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{overview.total_stars}</Text>
              <Text style={styles.statLabel}>Stars</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{overview.longest_streak}d</Text>
              <Text style={styles.statLabel}>Longest Streak</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language Breakdown</Text>
          {topLanguages.map((lang) => (
            <View key={lang.language} wrap={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.rowLabel}>{lang.language}</Text>
                <Text style={styles.rowValue}>{lang.percentage.toFixed(1)}%</Text>
              </View>
              <View style={styles.langBar}>
                <View style={[styles.langBarFill, { width: `${lang.percentage}%` }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PR Metrics</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total PRs opened</Text>
            <Text style={styles.rowValue}>{prs.total_prs}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Merge rate</Text>
            <Text style={styles.rowValue}>{prs.merge_rate.toFixed(0)}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Avg open-to-merge time</Text>
            <Text style={styles.rowValue}>{formatHours(prs.avg_open_to_merge_hours)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Avg first-review time</Text>
            <Text style={styles.rowValue}>{formatHours(prs.avg_first_review_hours)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top 5 Repos by Commits</Text>
          {topRepos.map((repo) => (
            <View key={repo.id} style={styles.row}>
              <Text style={styles.rowLabel}>{repo.name}</Text>
              <Text style={styles.rowValue}>{repo.commit_count} commits</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer} fixed>
          Generated by DevMetrics — {new Date().toLocaleDateString()}
        </Text>
      </Page>
    </Document>
  );
}
