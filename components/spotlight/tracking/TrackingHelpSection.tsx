// components/spotlight/tracking/TrackingHelpSection.tsx
export default function TrackingHelpSection() {
  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
      <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
        Good to Know
      </p>
      <ul className="space-y-2.5">
        <li className="flex gap-2 text-sm text-gray-600 leading-relaxed">
          <span className="shrink-0">•</span>
          <span>Tracking information updates automatically as your Spotlight progresses — no need to refresh constantly.</span>
        </li>
        <li className="flex gap-2 text-sm text-gray-600 leading-relaxed">
          <span className="shrink-0">•</span>
          <span>If your Spotlight has been under review for an extended period, feel free to reach out to the Spotlight team.</span>
        </li>
        <li className="flex gap-2 text-sm text-gray-600 leading-relaxed">
          <span className="shrink-0">•</span>
          <span>Save your tracking code somewhere safe — it's the only way to check your status.</span>
        </li>
      </ul>
    </div>
  );
}
