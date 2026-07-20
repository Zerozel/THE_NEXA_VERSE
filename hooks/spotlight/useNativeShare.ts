// hooks/spotlight/useNativeShare.ts
export type NativeShareResult = 'shared' | 'cancelled' | 'unsupported' | 'error';

export type ShareData = {
  title?: string;
  text?: string;
  url?: string;
};

export function useNativeShare() {
  const canShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function';

  async function share(data: ShareData): Promise<NativeShareResult> {
    if (!canShare) return 'unsupported';
    try {
      await navigator.share(data);
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
      return 'error';
    }
  }

  return { canShare, share };
}
