// components/spotlight/admin/SubmissionReviewCard.tsx
import type { SubmissionAnswerGroup } from '@/lib/spotlight/types';

export default function SubmissionReviewCard({ group }: { group: SubmissionAnswerGroup }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
      <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">
        {group.group_title}
      </p>
      <div className="divide-y divide-gray-50">
        {group.answers.map((a, i) => (
          <div key={i} className="py-3 first:pt-0 last:pb-0">
            <p className="text-gray-400 text-xs mb-1 leading-snug">{a.question_text}</p>
            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${a.answer === '\u2014' ? 'text-gray-300 italic' : 'text-gray-800'}`}>
              {a.answer}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
