import { Fragment, useEffect } from 'react';
import { parseAiTextSegments } from '@angkorgit/core';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  cn,
} from '@angkorgit/design-system';
import { openExternal } from '@/core/ipc';
import { useSettings } from '@/features/settings/store';
import { useUi } from '@/features/ui/store';
import { CHANGELOG_URL, changelogReleases, issueUrl } from './changelog';
import { useWhatsNew } from './useWhatsNew';

const ISSUE_REFERENCE = /#(\d+)/g;

function ChangelogText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn('min-w-0 [overflow-wrap:anywhere]', className)}>
      {parseAiTextSegments(text).map((segment, index) => {
        if (segment.kind === 'bold') {
          return (
            <strong key={index} className="font-semibold text-foreground">
              {segment.text}
            </strong>
          );
        }
        if (segment.kind === 'code') {
          return (
            <code key={index} className="rounded bg-surface-raised px-1 py-px font-mono text-[0.9em]">
              {segment.text}
            </code>
          );
        }
        const parts = segment.text.split(ISSUE_REFERENCE);
        return (
          <Fragment key={index}>
            {parts.map((part, i) =>
              i % 2 === 1 ? (
                <button
                  key={i}
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => void openExternal(issueUrl(part))}
                >
                  #{part}
                </button>
              ) : (
                <Fragment key={i}>{part}</Fragment>
              ),
            )}
          </Fragment>
        );
      })}
    </span>
  );
}

export function WhatsNewDialog() {
  const dialog = useUi((s) => s.dialog);
  const closeDialog = useUi((s) => s.closeDialog);
  const markVersionSeen = useSettings((s) => s.markVersionSeen);
  const { version } = useWhatsNew();
  const open = dialog === 'whatsNew';

  useEffect(() => {
    if (open && version) markVersionSeen(version);
  }, [open, version, markVersionSeen]);

  if (!open) return null;
  const releases = changelogReleases();
  return (
    <Dialog open onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>What's new</DialogTitle>
          <DialogDescription>
            {version ? `You are on AngKorGit v${version}.` : 'Release notes for every AngKorGit version.'}
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 max-h-[60vh] space-y-7 overflow-y-auto px-1 pb-1" data-whats-new-list>
          {releases.map((release) => (
            <section key={release.version} data-whats-new-release={release.version}>
              <div className="flex items-baseline gap-2">
                <h3 className="text-sm font-semibold text-foreground">v{release.version}</h3>
                {release.date && <span className="text-[11px] text-faint">{release.date}</span>}
                {release.version === version && <Badge tone="primary">Current</Badge>}
              </div>
              {release.intro && (
                <p className="mt-1.5 whitespace-pre-wrap text-xs text-muted">
                  <ChangelogText text={release.intro} />
                </p>
              )}
              {release.sections.map((section) => (
                <div key={section.title} className="mt-3">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wide text-faint">{section.title}</h4>
                  <ul className="mt-1 space-y-1.5">
                    {section.items.map((item, index) => (
                      <li key={index} className="flex gap-2 text-xs text-muted">
                        <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-foreground/40" />
                        <ChangelogText text={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => void openExternal(CHANGELOG_URL)}>
            Full changelog on GitHub
          </Button>
          <Button onClick={closeDialog}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
