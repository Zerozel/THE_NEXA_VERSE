// components/spotlight/admin/StatusBadge.tsx
import clsx from 'clsx';
import { getStatusConfig } from '@/lib/spotlight/trackingMessages';
import type { SpotlightSubmissionStatus } from '@/lib/spotlight/types';

const TONE_CLASSES: Record<string, string> = {
  info:    'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  muted:   'bg-gray-100 text-gray-600',
};

export default function StatusBadge({ status }: { status: SpotlightSubmissionStatus }) {
  const config = getStatusConfig(status);
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-1 rounded-full text-[0.7rem] font-bold shrink-0',
      TONE_CLASSES[config.tone],
    )}>
      {config.label}
    </span>
  );
}
