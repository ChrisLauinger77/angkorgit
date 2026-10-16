import { parseChangelog, type ChangelogRelease } from '@angkorgit/core';
import changelogMarkdown from '../../../../../CHANGELOG.md?raw';

export const REPOSITORY_URL = 'https://github.com/cheat2001/angkorgit';
export const CHANGELOG_URL = `${REPOSITORY_URL}/blob/main/CHANGELOG.md`;
export const issueUrl = (number: string) => `${REPOSITORY_URL}/issues/${number}`;

let cached: ChangelogRelease[] | null = null;

export function changelogReleases(): ChangelogRelease[] {
  if (!cached) cached = parseChangelog(changelogMarkdown);
  return cached;
}
