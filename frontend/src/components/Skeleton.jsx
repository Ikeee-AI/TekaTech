export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

export function CatalogSkeleton({ count = 6 }) {
  return (
    <div
      role="status"
      aria-label="Loading gadgets"
      className="grid grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)] gap-8 items-start"
    >
      <div className="hidden lg:block bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <Skeleton className="h-6 w-24" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
      <div className="space-y-8 min-w-0">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <Skeleton className="h-8 w-56" />
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,23rem),1fr))] gap-6">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex gap-5">
                <Skeleton className="h-24 w-24 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2 pt-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-14 w-full rounded-lg mt-5" />
              <Skeleton className="h-9 w-full mt-5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function GadgetDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto" role="status" aria-label="Loading gadget">
      <Skeleton className="h-4 w-32 mb-5" />
      <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-[15rem_1fr] gap-6 sm:gap-8">
        <Skeleton className="h-60 w-full rounded-lg" />
        <div>
          <Skeleton className="h-6 w-24 rounded-full mb-4" />
          <Skeleton className="h-8 w-2/3 mb-2" />
          <Skeleton className="h-4 w-1/3 mb-6" />
          <Skeleton className="h-7 w-40" />
        </div>
      </div>
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div role="status" aria-label="Loading form" className="bg-white border border-gray-200 rounded-xl p-6 max-w-xl mx-auto space-y-4">
      <Skeleton className="h-6 w-32" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}