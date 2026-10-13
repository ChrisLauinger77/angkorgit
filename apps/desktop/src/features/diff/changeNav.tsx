import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Hint, Kbd, Separator } from '@angkorgit/design-system';
import { useShortcuts } from '@/shared/useShortcuts';
import { scrollToFraction, type ChangeBlock } from './DiffMinimap';

export type JumpDirection = 1 | -1;
export type ChangeStepResult = 'stepped' | 'edge' | 'none';

const POSITION_EPSILON = 0.002;
const CURSOR_TOLERANCE_PX = 2;
const SMOOTH_SCROLL_SETTLE_MS = 600;

function viewedFraction(el: HTMLElement): number {
  return (el.scrollTop + el.clientHeight * 0.35) / el.scrollHeight;
}

function targetTop(el: HTMLElement, fraction: number): number {
  const max = Math.max(0, el.scrollHeight - el.clientHeight);
  return Math.min(max, Math.max(0, fraction * el.scrollHeight - el.clientHeight * 0.35));
}

export function jumpToChange(el: HTMLElement, blocks: ChangeBlock[], direction: JumpDirection): number | null {
  if (blocks.length === 0 || el.scrollHeight === 0) return null;
  const current = viewedFraction(el);
  let next: number;
  if (direction === 1) {
    const found = blocks.findIndex((b) => b.fraction > current + POSITION_EPSILON);
    next = found >= 0 ? found : 0;
  } else {
    let found = -1;
    blocks.forEach((b, i) => {
      if (b.fraction < current - POSITION_EPSILON) found = i;
    });
    next = found >= 0 ? found : blocks.length - 1;
  }
  scrollToFraction(el, blocks[next].fraction);
  return next;
}

export interface ChangeCursor {
  blocks: ChangeBlock[];
  index: number;
  top: number;
  at: number;
}

export function nextChangeIndex(
  blocks: ChangeBlock[],
  position: number,
  cursor: number | null,
  direction: JumpDirection,
): number | null {
  if (blocks.length === 0) return null;
  const wrap = (index: number) => (index + blocks.length) % blocks.length;
  if (cursor !== null) return wrap(cursor + direction);
  const atIndex = blocks.findIndex((b) => Math.abs(b.fraction - position) <= POSITION_EPSILON);
  if (atIndex >= 0) return wrap(atIndex + direction);
  let before = -1;
  blocks.forEach((b, i) => {
    if (b.fraction < position) before = i;
  });
  return wrap(direction === 1 ? before + 1 : before);
}

export interface ChangeJump {
  jump: (direction: JumpDirection) => void;
  step: (direction: JumpDirection) => boolean;
  anchor: (index: number | null) => void;
  active: number | null;
}

let openDiffStepper: ((direction: JumpDirection) => boolean) | null = null;

export function stepOpenDiffChange(direction: JumpDirection): ChangeStepResult {
  if (!openDiffStepper) return 'none';
  return openDiffStepper(direction) ? 'stepped' : 'edge';
}

export function useChangeJump(
  blocks: ChangeBlock[],
  scrollRef: React.RefObject<HTMLElement>,
  options: { arrowKeys?: boolean; ready?: boolean } = {},
): ChangeJump {
  const cursorRef = useRef<ChangeCursor | null>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    setActive(null);
  }, [blocks]);

  const settledCursor = (el: HTMLElement): ChangeCursor | null => {
    const cursor = cursorRef.current;
    const settled =
      cursor !== null &&
      cursor.blocks === blocks &&
      (Math.abs(el.scrollTop - cursor.top) <= CURSOR_TOLERANCE_PX || Date.now() - cursor.at < SMOOTH_SCROLL_SETTLE_MS);
    return settled ? cursor : null;
  };

  const jump = (direction: JumpDirection) => {
    const el = scrollRef.current;
    if (!el) return;
    const cursor = settledCursor(el);
    if (cursor === null) {
      cursorRef.current = null;
      setActive(jumpToChange(el, blocks, direction));
      return;
    }
    const next = nextChangeIndex(blocks, viewedFraction(el), cursor.index, direction);
    if (next === null) return;
    const fraction = blocks[next].fraction;
    cursorRef.current = { blocks, index: next, top: targetTop(el, fraction), at: Date.now() };
    setActive(next);
    scrollToFraction(el, fraction);
  };

  const anchor = (index: number | null) => {
    const el = scrollRef.current;
    if (!el || index === null) {
      cursorRef.current = null;
      setActive(null);
      return;
    }
    cursorRef.current = { blocks, index, top: el.scrollTop, at: 0 };
    setActive(index);
  };

  const step = (direction: JumpDirection): boolean => {
    if (options.ready === false) return true;
    const el = scrollRef.current;
    if (!el || blocks.length === 0) return false;
    const cursor = settledCursor(el);
    const next = nextChangeIndex(blocks, viewedFraction(el), cursor ? cursor.index : null, direction);
    if (next === null) return false;
    const fraction = blocks[next].fraction;
    cursorRef.current = { blocks, index: next, top: targetTop(el, fraction), at: Date.now() };
    setActive(next);
    scrollToFraction(el, fraction);
    return true;
  };

  const api = useRef<Omit<ChangeJump, 'active'>>({ jump, step, anchor });
  api.current = { jump, step, anchor };

  useShortcuts(
    useMemo(
      () => [
        { combo: 'p', handler: () => api.current.jump(-1), skipInInput: true },
        { combo: 'n', handler: () => api.current.jump(1), skipInInput: true },
      ],
      [],
    ),
  );

  const arrowKeys = options.arrowKeys ?? false;
  useEffect(() => {
    if (!arrowKeys) return;
    const stepper = (direction: JumpDirection) => api.current.step(direction);
    openDiffStepper = stepper;
    return () => {
      if (openDiffStepper === stepper) openDiffStepper = null;
    };
  }, [arrowKeys]);

  return {
    jump: (d) => api.current.jump(d),
    step: (d) => api.current.step(d),
    anchor: (i) => api.current.anchor(i),
    active: active !== null && active < blocks.length ? active : null,
  };
}

export function ChangeNavButtons({
  blocks,
  active = null,
  onJump,
  showCount = true,
}: {
  blocks: ChangeBlock[];
  active?: number | null;
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
        <span className="text-[10px] text-faint tabular-nums" data-change-count>
          {active !== null ? `${active + 1} of ${blocks.length}` : blocks.length} change{blocks.length === 1 ? '' : 's'}
        </span>
      )}
    </>
  );
}
