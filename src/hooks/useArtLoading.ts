import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { assetLoading } from '../game/asset-loading';

type Preparation = ReturnType<typeof assetLoading.prepareBattle>;
export type BattleArtProgress = ReturnType<Preparation['getSnapshot']>;

const INITIAL_PROGRESS: BattleArtProgress = {
  status: 'waiting', phase: 'download', loadedBytes: 0, totalBytes: 0, percent: 0,
};

export function useArtLoading() {
  return useSyncExternalStore(assetLoading.subscribe, assetLoading.getSnapshot, assetLoading.getSnapshot);
}

/** Keep the prepared art lease alive until the new engine has acquired its own. */
export function useBattleArt(characterIds: readonly string[], start: () => (() => void) | undefined) {
  const characterKey = [...new Set(characterIds)].sort().join(',');
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState<BattleArtProgress>(INITIAL_PROGRESS);
  const retry = useCallback(() => setAttempt(value => value + 1), []);

  useEffect(() => {
    let active = true;
    let stop: (() => void) | undefined;
    const preparation = assetLoading.prepareBattle(characterKey.split(','));
    const update = () => { if (active) setProgress(preparation.getSnapshot()); };
    const unsubscribe = preparation.subscribe(update);
    update();
    void preparation.ready.then(() => {
      if (!active) return;
      stop = start();
      preparation.release();
    }).catch((error: unknown) => {
      if (!active) return;
      setProgress({ ...preparation.getSnapshot(), status: 'error', error: error instanceof Error ? error.message : '素材准备失败，请重试。' });
      preparation.release();
    });
    return () => {
      active = false;
      unsubscribe();
      stop?.();
      preparation.release();
    };
  }, [characterKey, attempt, start]);

  return { progress, retry };
}
