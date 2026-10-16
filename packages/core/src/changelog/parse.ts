export interface ChangelogSection {
  title: string;
  items: string[];
}

export interface ChangelogRelease {
  version: string;
  date: string | null;
  intro: string;
  sections: ChangelogSection[];
}

const RELEASE_HEADER = /^## \[([^\]]+)\](?:\s*[—–-]\s*(.+))?\s*$/;
const SECTION_HEADER = /^### (.+?)\s*$/;
const LINK_REFERENCE = /^\[[^\]]+\]:\s+\S/;
const BULLET = /^- (.*)$/;

export function parseChangelog(markdown: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  let release: ChangelogRelease | null = null;
  let section: ChangelogSection | null = null;
  let intro: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) intro.push(paragraph.join(' '));
    paragraph = [];
  };
  const flushRelease = () => {
    if (!release) return;
    flushParagraph();
    release.intro = intro.join('\n\n');
    releases.push(release);
    release = null;
    section = null;
    intro = [];
  };

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (LINK_REFERENCE.test(line)) break;
    const header = RELEASE_HEADER.exec(line);
    if (header) {
      flushRelease();
      if (header[1].toLowerCase() === 'unreleased') continue;
      release = { version: header[1], date: header[2]?.trim() ?? null, intro: '', sections: [] };
      continue;
    }
    if (!release) continue;
    if (line.startsWith('## ')) {
      flushRelease();
      continue;
    }
    const sectionHeader = SECTION_HEADER.exec(line);
    if (sectionHeader) {
      flushParagraph();
      section = { title: sectionHeader[1], items: [] };
      release.sections.push(section);
      continue;
    }
    if (line.trim() === '') {
      flushParagraph();
      continue;
    }
    const bullet = BULLET.exec(line);
    if (section) {
      if (bullet) section.items.push(bullet[1].trim());
      else if (section.items.length > 0) section.items[section.items.length - 1] += ` ${line.trim()}`;
      continue;
    }
    paragraph.push(line.trim());
  }
  flushRelease();
  return releases;
}
