import developerNewsMarkdown from '../../Specification_11.2_NEWS.md?raw';
import type { Language } from '../i18n';

export interface DeveloperNewsItem {
  id: string;
  version: string;
  date: string;
  content: Record<Language, string>;
}

const LEGACY_NEWS_IDS: Readonly<Record<string, string>> = {
  'v8.1.2|2026/07/18': 'v8.1.2-2026-07-18-beta-report-bonus-fix',
};

function splitMarkdownRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function parseDeveloperNews(markdown: string): DeveloperNewsItem[] {
  const rows = markdown
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => row.startsWith('|'));

  if (rows.length < 2) return [];

  const headings = splitMarkdownRow(rows[0]);
  const column = (name: string) => headings.indexOf(name);
  const versionColumn = column('Version');
  const dateColumn = column('Date');
  const jaColumn = column('Content ja');
  const enColumn = column('Content en');
  const zhCNColumn = column('Content zh-CN');
  const zhTWColumn = column('Content zh-TW');

  return rows
    .slice(2)
    .map(splitMarkdownRow)
    .filter((cells) => cells.length >= headings.length)
    .map((cells) => {
      const version = cells[versionColumn] ?? '';
      const date = cells[dateColumn] ?? '';
      const sourceKey = `${version}|${date}`;
      return {
        id: LEGACY_NEWS_IDS[sourceKey] ?? sourceKey,
        version,
        date,
        content: {
          ja: cells[jaColumn] ?? '',
          en: cells[enColumn] ?? '',
          'zh-CN': cells[zhCNColumn] ?? '',
          'zh-TW': cells[zhTWColumn] ?? '',
        },
      };
    })
    .filter((item) => item.version && item.date)
    .sort((left, right) => right.date.localeCompare(left.date) || right.version.localeCompare(left.version));
}

// SpecRef: 8.6 | UI_DIVINE_BUREAU | Developer News Notification (通知)
export const DEVELOPER_NEWS_ITEMS = parseDeveloperNews(developerNewsMarkdown);

export function getDeveloperNewsContent(item: DeveloperNewsItem, language: Language): string {
  return item.content[language] || item.content.ja;
}
