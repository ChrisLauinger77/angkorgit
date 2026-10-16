import { useEffect, useState } from 'react';
import { fullscreenState, listen, overlayTitleBar } from '@/core/ipc';
import { useSettings } from '@/features/settings/store';

export const TRAFFIC_LIGHT_INSET = 86;
export const TITLE_BAR_HEIGHT = 38;

export interface TitleBarInset {
  inset: number;
  height: number;
}

const NONE: TitleBarInset = { inset: 0, height: 0 };

export function useTitleBarInset(): TitleBarInset {
  const zoom = useSettings((s) => s.zoom);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!overlayTitleBar) return;
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    const sync = () =>
      void fullscreenState().then((full) => {
        if (!cancelled) setFullscreen(full);
      });
    sync();
    void listen('tauri://resize', sync).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  if (!overlayTitleBar || fullscreen) return NONE;
  return { inset: Math.round(TRAFFIC_LIGHT_INSET / zoom), height: Math.round(TITLE_BAR_HEIGHT / zoom) };
}
