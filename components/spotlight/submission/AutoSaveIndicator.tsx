'use client';
// components/spotlight/submission/AutoSaveIndicator.tsx
// Shows save state to the participant. Purely presentational.
import clsx from 'clsx';
import type { AutoSaveStatus } from '@/lib/spotlight/types';

interface Props { status: AutoSaveStatus; }

export default function AutoSaveIndicator({ status }: Props) {
  if (status === 'idle') return null;

  return (
    <div className={clsx(
      'flex items-center gap-1.5 text-xs font-medium transition-all duration-300',
      status === 'saving' && 'text-gray-400',
      status === 'saved'  && 'text-green-600',
      status === 'error'  && 'text-red-500',
    )}>
      {status === 'saving' && (
        <>
          <span className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          Saving…
        </>
      )}
      {status === 'saved' && <>✓ Saved</>}
      {status === 'error' && <>⚠ Save failed — will retry</>}
    </div>
  );
}
