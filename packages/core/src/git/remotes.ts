export interface NamedRemote {
  name: string;
}

export const upstreamRemoteOf = (headUpstream: string | null | undefined): string | null => {
  const name = headUpstream?.split('/')[0];
  return name ? name : null;
};

export function pickRemote<T extends NamedRemote>(remotes: T[], headUpstream: string | null | undefined): T | null {
  if (remotes.length === 0) return null;
  const upstreamRemote = upstreamRemoteOf(headUpstream);
  if (upstreamRemote) {
    const match = remotes.find((remote) => remote.name === upstreamRemote);
    if (match) return match;
  }
  return remotes.find((remote) => remote.name === 'origin') ?? remotes[0];
}

export const pushSetsUpstream = (headUpstream: string | null | undefined, remoteName: string): boolean => {
  const upstreamRemote = upstreamRemoteOf(headUpstream);
  return upstreamRemote === null || upstreamRemote === remoteName;
};
