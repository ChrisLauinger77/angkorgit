import { AlertTriangle, Pencil } from 'lucide-react';
import type { PullPreview } from '@angkorgit/core';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@angkorgit/design-system';
import { DirName } from './DirName';
import { basename } from '@/shared/utils';

export type PullWarning = 'local' | 'conflicts';

export function pullWarningOf(preview: PullPreview | null): PullWarning | null {
  if (!preview || preview.behind === 0) return null;
  if (preview.localChanges.length > 0) return 'local';
  if (preview.conflicts.length > 0) return 'conflicts';
  return null;
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

export function pullWarningText(preview: PullPreview): string | null {
  const warning = pullWarningOf(preview);
  if (warning === 'local') {
    return `Your uncommitted edits to ${count(preview.localChanges.length, 'file')} are in the way: ${preview.localChanges.map(basename).join(', ')}`;
  }
  if (warning === 'conflicts') {
    return `Pulling will conflict in ${count(preview.conflicts.length, 'file')}: ${preview.conflicts.map(basename).join(', ')}`;
  }
  return null;
}

export function PullCheckDialog({
  preview,
  open,
  onClose,
  onPull,
  onStash,
}: {
  preview: PullPreview | null;
  open: boolean;
  onClose: () => void;
  onPull: () => void;
  onStash: (paths: string[]) => void;
}) {
  const warning = pullWarningOf(preview);
  if (!preview || !warning) return null;
  const local = warning === 'local';
  const files = local ? preview.localChanges : preview.conflicts;
  const Icon = local ? Pencil : AlertTriangle;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md" data-pull-check={warning}>
        <DialogHeader>
          <DialogTitle>{local ? 'Your changes are in the way' : 'This pull will conflict'}</DialogTitle>
          <DialogDescription>
            {local ? (
              <>
                {files.length === 1 ? 'A file you edited also changed' : `${files.length} files you edited also changed`} on{' '}
                <span className="font-mono">{preview.source}</span>. Git will not overwrite your edits, so the pull would
                stop before it starts. Stash them, pull, then apply the stash to get them back.
              </>
            ) : preview.rebase ? (
              <>
                Replaying your {count(preview.ahead, 'commit')} on top of <span className="font-mono">{preview.source}</span>{' '}
                stops at a conflict in {files.length === 1 ? 'this file' : 'these files'}. You resolve them in the conflict
                editor and continue the rebase.
              </>
            ) : (
              <>
                Your {count(preview.ahead, 'commit')} and the {count(preview.behind, 'new commit')} on{' '}
                <span className="font-mono">{preview.source}</span> change the same lines in{' '}
                {files.length === 1 ? 'this file' : 'these files'}. The pull still works: it stops with them marked, and you
                resolve them in the conflict editor.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-48 divide-y divide-border-subtle overflow-y-auto rounded-md border border-border bg-surface">
          {files.map((path) => (
            <li key={path} className="flex min-w-0 items-center gap-2 px-3 py-1.5 text-sm" data-pull-check-file={path} title={path}>
              <Icon className={local ? 'size-3.5 shrink-0 text-primary' : 'size-3.5 shrink-0 text-danger'} aria-hidden />
              <span className="max-w-full shrink-0 truncate font-medium text-foreground">{basename(path)}</span>
              <DirName path={path} />
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {local ? (
            <Button autoFocus onClick={() => onStash(files)}>
              {files.length === 1 ? 'Stash this file…' : `Stash ${files.length} files…`}
            </Button>
          ) : (
            <Button autoFocus onClick={onPull}>
              Pull and resolve
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
