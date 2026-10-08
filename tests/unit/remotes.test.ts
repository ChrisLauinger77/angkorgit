import { describe, expect, it } from 'vitest';
import { pickRemote, pushSetsUpstream, upstreamRemoteOf } from '@angkorgit/core';

const remotes = [
  { name: 'gitlab', url: 'git@gitlab.com:team/app.git' },
  { name: 'origin', url: 'git@github.com:me/app.git' },
  { name: 'upstream', url: 'git@github.com:team/app.git' },
];

describe('pickRemote', () => {
  it('follows the branch upstream before anything else', () => {
    expect(pickRemote(remotes, 'upstream/main')?.name).toBe('upstream');
    expect(pickRemote(remotes, 'gitlab/feature/x')?.name).toBe('gitlab');
  });

  it('prefers origin over the first remote when there is no usable upstream', () => {
    expect(pickRemote(remotes, null)?.name).toBe('origin');
    expect(pickRemote(remotes, 'gone/main')?.name).toBe('origin');
  });

  it('falls back to the first remote and to null', () => {
    expect(pickRemote(remotes.slice(0, 1), null)?.name).toBe('gitlab');
    expect(pickRemote([], 'origin/main')).toBeNull();
  });
});

describe('pushSetsUpstream', () => {
  it('sets the upstream when the branch has none or already tracks that remote', () => {
    expect(pushSetsUpstream(null, 'origin')).toBe(true);
    expect(pushSetsUpstream('origin/main', 'origin')).toBe(true);
  });

  it('leaves the upstream alone when pushing to another remote', () => {
    expect(pushSetsUpstream('gitlab/main', 'origin')).toBe(false);
  });

  it('reads the remote off the upstream name', () => {
    expect(upstreamRemoteOf('origin/feature/x')).toBe('origin');
    expect(upstreamRemoteOf(undefined)).toBeNull();
  });
});
