import { useMemo, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Hint, Kbd, Separator } from '@angkorgit/design-system';
import { useShortcuts } from '@/shared/useShortcuts';
import { scrollToFraction, type ChangeBlock } from './DiffMinimap';

export type JumpDirection = 1 | -1;

export function jumpToChange(el: HTMLElement, blocks: ChangeBlock[], direction: JumpDirection): void {
  if (blocks.length === 0 || el.scrollHeight === 0) return;
  const current = (el.scrollTop + el.clientHeight * 0.35) / el.scrollHeight;
  const epsilon = 0.002;
  const next =
    direction === 1
      ? (blocks.find((b) => b.fraction > current + epsilon) ?? blocks[0])
      : ([...blocks].reverse().find((b) => b.fraction < current - epsilon) ?? blocks[blocks.length - 1]);
  scrollToFraction(el, next.fraction);
}

export function useChangeJump(
  blocks: ChangeBlock[],
  scrollRef: React.RefObject<HTMLElement>,
): (direction: JumpDirection) => void {
  const jump = (direction: JumpDirection) => {
    const el = scrollRef.current;
    if (el) jumpToChange(el, blocks, direction);
  };
  const jumpRef = useRef(jump);
  jumpRef.current = jump;
  useShortcuts(
    useMemo(
      () => [
        { combo: 'p', handler: () => jumpRef.current(-1), skipInInput: true },
        { combo: 'n', handler: () => jumpRef.current(1), skipInInput: true },
      ],
      [],
    ),
  );
  return jump;
}

export function ChangeNavButtons({
  blocks,
  onJump,
  showCount = true,
}: {
  blocks: ChangeBlock[];
  onJump: (direction: JumpDirection) => void;
  showCount?: boolean;
}) {
  if (blocks.length === 0) return null;
  return (
    <>
      <Separator orientation="vertical" className="mx-1 h-4" />
      <Hint
        label={
          <span className="flex items-center gap-1">
            Previous change <Kbd>P</Kbd>
          </span>
        }
      >
        <Button variant="ghost" size="icon-sm" aria-label="Previous change" onClick={() => onJump(-1)}>
          <ChevronUp className="size-4" />
        </Button>
      </Hint>
      <Hint
        label={
          <span className="flex items-center gap-1">
            Next change <Kbd>N</Kbd>
          </span>
        }
      >
        <Button variant="ghost" size="icon-sm" aria-label="Next change" onClick={() => onJump(1)}>
          <ChevronDown className="size-4" />
        </Button>
      </Hint>
      {showCount && (
        <span className="text-[10px] text-faint">
          {blocks.length} change{blocks.length === 1 ? '' : 's'}
        </span>
      )}
    </>
  );
}
