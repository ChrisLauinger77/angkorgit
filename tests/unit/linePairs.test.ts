import { describe, expect, it } from 'vitest';
import { PAIR_SCAN_CAP, PAIR_SIMILARITY, lineSimilarity, pairHunkLines, type DiffHunk, type DiffLine } from '@angkorgit/core';

const del = (content: string): DiffLine => ({ kind: 'deletion', oldLineNo: 1, newLineNo: null, content });
const add = (content: string): DiffLine => ({ kind: 'addition', oldLineNo: null, newLineNo: 1, content });
const ctx = (content: string): DiffLine => ({ kind: 'context', oldLineNo: 1, newLineNo: 1, content });

const hunk = (lines: DiffLine[]): DiffHunk => ({
  header: '@@ -1 +1 @@',
  oldStart: 1,
  oldLines: 1,
  newStart: 1,
  newLines: 1,
  lines,
});

const shape = (lines: DiffLine[]) =>
  pairHunkLines(hunk(lines)).map((p) => [p.left?.content ?? null, p.right?.content ?? null]);

describe('pairHunkLines', () => {
  it('keeps an inserted line on its own row and pairs the edited neighbours', () => {
    expect(
      shape([
        del('function load(id) {'),
        del('  return db.get(id);'),
        add('function load(userId) {'),
        add('  logger.info(userId);'),
        add('  return db.get(userId);'),
      ]),
    ).toEqual([
      ['function load(id) {', 'function load(userId) {'],
      [null, '  logger.info(userId);'],
      ['  return db.get(id);', '  return db.get(userId);'],
    ]);
  });

  it('shares one row for a single replacement however different the lines are', () => {
    expect(shape([del('foo'), add('fooBar')])).toEqual([['foo', 'fooBar']]);
    expect(shape([del('}'), add('nothing alike here')])).toEqual([['}', 'nothing alike here']]);
  });

  it('skips a comment block inserted before a rewritten line', () => {
    expect(
      shape([
        del('const renderRow = (row: Row) => <GraphRow key={row.oid} row={row} />;'),
        add('/**'),
        add(' * Virtualized rows keep large graphs smooth.'),
        add(' */'),
        add('const renderRow = (item: VirtualItem, row: Row) => ('),
      ]),
    ).toEqual([
      [null, '/**'],
      [null, ' * Virtualized rows keep large graphs smooth.'],
      [null, ' */'],
      ['const renderRow = (row: Row) => <GraphRow key={row.oid} row={row} />;', 'const renderRow = (item: VirtualItem, row: Row) => ('],
    ]);
  });

  it('leaves a deletion unpaired when nothing on the other side resembles it', () => {
    expect(shape([del('alpha beta'), del('gamma delta'), add('alpha beta!'), add('something else')])).toEqual([
      ['alpha beta', 'alpha beta!'],
      ['gamma delta', null],
      [null, 'something else'],
    ]);
  });

  it('keeps context rows and pure insertions or deletions as before', () => {
    expect(shape([ctx('same'), add('new'), ctx('same again'), del('gone')])).toEqual([
      ['same', 'same'],
      [null, 'new'],
      ['same again', 'same again'],
      ['gone', null],
    ]);
  });

  it('falls back to positional pairing past the scan cap', () => {
    const n = Math.ceil(Math.sqrt(PAIR_SCAN_CAP)) + 1;
    const lines = [...Array.from({ length: n }, (_, i) => del(`old ${i}`)), ...Array.from({ length: n }, (_, i) => add(`new ${i}`))];
    const pairs = pairHunkLines(hunk(lines));
    expect(pairs).toHaveLength(n);
    expect(pairs[0]).toMatchObject({ left: { content: 'old 0' }, right: { content: 'new 0' } });
  });
});

describe('lineSimilarity', () => {
  it('counts shared words once each, never punctuation', () => {
    expect(lineSimilarity('return db.get(id);', 'logger.info(userId);')).toBe(0);
    expect(lineSimilarity('return db.get(id);', 'return db.get(userId);')).toBeCloseTo(0.75);
    expect(lineSimilarity('row = row + row + row', 'row')).toBe(1);
  });

  it('does not pair two imports on their shared keywords alone', () => {
    expect(
      lineSimilarity("import { ROW_HEIGHT } from './constants';", "import { useVirtualizer } from '@tanstack/react-virtual';"),
    ).toBeLessThan(PAIR_SIMILARITY);
  });

  it('compares symbol-only lines by text', () => {
    expect(lineSimilarity('}', '}')).toBe(1);
    expect(lineSimilarity('}', ')')).toBe(0);
    expect(lineSimilarity('}', 'words here')).toBe(0);
  });
});
