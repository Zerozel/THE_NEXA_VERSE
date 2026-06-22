// components/spotlight/tracking/StatusMessage.tsx
import clsx from 'clsx';
import type { StatusMessageConfig } from '@/lib/spotlight/types';

const TONE_STYLES: Record<StatusMessageConfig['tone'], string> = {
  info:    'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  muted:   'bg-gray-50 border-gray-200 text-gray-600',
};

export default function StatusMessage({ config }: { config: StatusMessageConfig }) {
  return (
    <div className={clsx(
      'rounded-xl border px-4 py-3 flex gap-3 items-start',
      TONE_STYLES[config.tone],
    )}>
      <span className="text-xl shrink-0 leading-none mt-0.5">{config.icon}</span>
      <div>
        <p className="font-bold text-sm mb-0.5">{config.label}</p>
        <p className="text-sm leading-relaxed opacity-90">{config.message}</p>
      </div>
    </div>
  );
}
