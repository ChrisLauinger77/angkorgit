import { useEffect, useState } from 'react';
import { appVersion } from '@/core/ipc';
import { useSettings } from '@/features/settings/store';
import { useUi } from '@/features/ui/store';

let knownVersion = '';

export function useWhatsNew(): { version: string; unseen: boolean; open: () => void } {
  const [version, setVersion] = useState(knownVersion);
  const lastSeenVersion = useSettings((s) => s.lastSeenVersion);
  const openDialog = useUi((s) => s.openDialog);

  useEffect(() => {
    if (knownVersion) return;
    let cancelled = false;
    void appVersion()
      .then((value) => {
        knownVersion = value;
        if (!cancelled) setVersion(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    version,
    unseen: version !== '' && lastSeenVersion !== version,
    open: () => openDialog('whatsNew'),
  };
}
