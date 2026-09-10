export default function MainLoading() {
  return (
    <div className="mx-auto max-w-[1400px] py-8 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="border-b border-line pb-6 space-y-3">
        <div className="h-3 w-24 rounded bg-raised" />
        <div className="h-8 w-64 rounded bg-raised" />
        <div className="h-4 w-96 rounded bg-raised" />
      </div>

      {/* Grid skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl border border-line bg-surface p-5 space-y-4">
            <div className="flex justify-between">
              <div className="h-4 w-28 rounded bg-raised" />
              <div className="h-4 w-12 rounded bg-raised" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-raised" />
              <div className="h-3 w-4/5 rounded bg-raised" />
            </div>
            <div className="pt-4 flex gap-2">
              <div className="h-6 w-16 rounded bg-raised" />
              <div className="h-6 w-16 rounded bg-raised" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
