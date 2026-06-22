// components/spotlight/tracking/TrackingErrorState.tsx
import Link from 'next/link';

interface Props {
  title: string;
  message: string;
}

export default function TrackingErrorState({ title, message }: Props) {
  return (
    <div className="text-center py-12">
      <p className="text-4xl mb-4">🔎</p>
      <h2 className="font-black text-gray-900 text-lg mb-2">{title}</h2>
      <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto mb-6">
        {message}
      </p>
      <Link
        href="/spotlight/track"
        className="inline-block bg-[#D4AF37] text-black font-bold px-6 py-3 rounded-xl text-sm"
      >
        Try Another Code
      </Link>
    </div>
  );
}
