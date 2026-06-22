// components/spotlight/tracking/TrackingTimeline.tsx
import clsx from 'clsx';
import type { TrackingTimelineEvent } from '@/lib/spotlight/types';

export default function TrackingTimeline({ events }: { events: TrackingTimelineEvent[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
      <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">
        Timeline
      </p>
      <div className="flex flex-col">
        {events.map((ev, i) => {
          const isLast = i === events.length - 1;
          return (
            <div key={`${ev.status}-${i}`} className="flex gap-3">
              {/* Dot + connecting line */}
              <div className="flex flex-col items-center">
                <span className={clsx(
                  'w-3 h-3 rounded-full shrink-0',
                  ev.state === 'completed' && 'bg-[#D4AF37]',
                  ev.state === 'current'   && 'bg-[#D4AF37] ring-4 ring-[#D4AF37]/20',
                  ev.state === 'upcoming'  && 'bg-gray-200',
                )} />
                {!isLast && (
                  <span className={clsx(
                    'w-0.5 flex-1 my-1',
                    ev.state === 'completed' ? 'bg-[#D4AF37]/40' : 'bg-gray-100',
                  )} />
                )}
              </div>

              {/* Content */}
              <div className={clsx('pb-5', isLast && 'pb-0')}>
                <p className={clsx(
                  'text-sm font-bold',
                  ev.state === 'upcoming' ? 'text-gray-400' : 'text-gray-800',
                )}>
                  {ev.label}
                </p>
                {ev.description && (
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                    {ev.description}
                  </p>
                )}
                {ev.timestamp ? (
                  <p className="text-gray-400 text-[0.7rem] mt-1">
                    {new Date(ev.timestamp).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                    {' \u00b7 '}
                    {new Date(ev.timestamp).toLocaleTimeString('en-GB', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                ) : (
                  <p className="text-gray-300 text-[0.7rem] mt-1">Upcoming</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
