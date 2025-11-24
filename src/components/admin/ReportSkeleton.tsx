export function ReportSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-neutral-200 rounded w-24"></div>
              <div className="h-5 w-5 bg-neutral-200 rounded"></div>
            </div>
            <div className="h-8 bg-neutral-200 rounded w-32"></div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
        <div className="p-6 border-b border-neutral-200">
          <div className="h-6 bg-neutral-200 rounded w-48"></div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex space-x-4">
                <div className="h-4 bg-neutral-200 rounded flex-1"></div>
                <div className="h-4 bg-neutral-200 rounded flex-1"></div>
                <div className="h-4 bg-neutral-200 rounded flex-1"></div>
                <div className="h-4 bg-neutral-200 rounded flex-1"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-neutral-200 rounded w-24"></div>
        <div className="h-5 w-5 bg-neutral-200 rounded"></div>
      </div>
      <div className="h-8 bg-neutral-200 rounded w-32"></div>
    </div>
  );
}

export function ReportTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
      <div className="p-6 border-b border-neutral-200">
        <div className="h-6 bg-neutral-200 rounded w-48 animate-pulse"></div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-4 bg-neutral-200 rounded w-20 animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <td key={j} className="px-6 py-4">
                    <div className="h-4 bg-neutral-200 rounded w-full animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

