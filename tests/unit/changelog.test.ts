import { describe, expect, it } from 'vitest';
import { parseChangelog } from '@angkorgit/core';

const sample = `# Changelog

Intro text with a [link](https://example.com).

## [Unreleased]

### Added
- Not shipped yet.

## [0.23.0] — 2026-10-13

The working-copy release. Folders stage as one,
and the diff marks the change you are standing on.

Second paragraph.

### Added
- **Filter settings by title or keyword.** The search field focuses when Settings
  opens and accepts multiple terms. (#33)
- Second item.

### Fixed
- One fix.

## [0.22.0] — 2026-10-08

### Changed
- Something changed.

[0.23.0]: https://github.com/cheat2001/angkorgit/compare/v0.22.0...v0.23.0
[0.22.0]: https://github.com/cheat2001/angkorgit/compare/v0.21.1...v0.22.0
`;

describe('parseChangelog', () => {
  it('lists released versions newest first, skipping Unreleased and the link references', () => {
    const releases = parseChangelog(sample);
    expect(releases.map((r) => r.version)).toEqual(['0.23.0', '0.22.0']);
    expect(releases[0].date).toBe('2026-10-13');
  });

  it('keeps the intro paragraphs and joins wrapped bullet lines', () => {
    const [release] = parseChangelog(sample);
    expect(release.intro).toBe(
      'The working-copy release. Folders stage as one, and the diff marks the change you are standing on.\n\nSecond paragraph.',
    );
    expect(release.sections.map((s) => s.title)).toEqual(['Added', 'Fixed']);
    expect(release.sections[0].items).toEqual([
      '**Filter settings by title or keyword.** The search field focuses when Settings opens and accepts multiple terms. (#33)',
      'Second item.',
    ]);
    expect(release.sections[1].items).toEqual(['One fix.']);
  });

  it('accepts a release without a date and an empty document', () => {
    expect(parseChangelog('## [1.0.0]\n\n### Added\n- x\n')[0]).toMatchObject({ version: '1.0.0', date: null });
    expect(parseChangelog('')).toEqual([]);
  });
});
