// app/spotlight/submit/loading.tsx
// Shown by Next.js while the Server Component fetches questionnaire config.
// Matches the layout of the actual questionnaire to avoid layout shift.
export default function SubmitLoading() {
  return (
    <div className="pb-10 animate-pulse">
      {/* Progress bar skeleton */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <div className="h-3 w-20 bg-gray-200 rounded-full" />
          <div className="h-3 w-8  bg-gray-200 rounded-full" />
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full">
          <div className="h-full w-1/6 bg-[#D4AF37]/30 rounded-full" />
        </div>
        <div className="flex justify-between mt-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div className="w-2 h-2 rounded-full bg-gray-200 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Step header skeleton */}
      <div className="mb-6">
        <div className="h-3 w-16 bg-[#D4AF37]/20 rounded-full mb-2" />
        <div className="h-7 w-48 bg-gray-200 rounded-lg mb-2" />
        <div className="h-4 w-64 bg-gray-100 rounded-lg" />
      </div>

      {/* Question skeletons */}
      <div className="flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="h-4 w-3/4 bg-gray-200 rounded mb-3" />
            <div className="h-12 w-full bg-gray-100 rounded-xl" />
          </div>
        ))}
      </div>

      {/* Button skeleton */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <div className="h-12 w-full bg-[#D4AF37]/20 rounded-xl" />
      </div>
    </div>
  );
}
