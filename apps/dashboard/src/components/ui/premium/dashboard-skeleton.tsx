'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="flex h-[calc(100vh-8rem)] w-full max-w-7xl mx-auto overflow-hidden rounded-xl border border-border/30 bg-card/50">
      <div className="flex w-48 shrink-0 flex-col gap-1 border-r border-border/30 bg-muted/10 p-3">
        <div className="mb-2 flex items-center gap-2 px-1 py-1">
          <Skeleton className="size-6 rounded-md opacity-20" />
          <Skeleton className="h-4 w-20 opacity-20" />
        </div>

        {[60, 44, 52, 36].map((w, i) => (
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5" key={i}>
            <Skeleton className="size-4 rounded-sm opacity-20" />
            <Skeleton
              className={`h-3.5 w-${w === 60 ? 'full' : `[${w}%]`} opacity-20`}
              style={{ width: `${w}%` }}
            />
          </div>
        ))}

        <div className="mt-3 border-t border-border/30 pt-3">
          {[48, 56].map((w, i) => (
            <div className="flex items-center gap-2 rounded-md px-2 py-1.5" key={i}>
              <Skeleton className="size-4 rounded-sm opacity-20" />
              <Skeleton className="h-3.5 opacity-20" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-2 px-2 py-1.5">
          <Skeleton className="size-7 rounded-full opacity-20" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-20 opacity-20" />
            <Skeleton className="h-2.5 w-16 opacity-20" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border/30 px-5 py-3">
          <Skeleton className="h-5 w-32 opacity-20" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-20 rounded-md opacity-20" />
            <Skeleton className="h-7 w-7 rounded-md opacity-20" />
          </div>
        </div>

        <div className="flex-1 space-y-4 p-5">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div className="space-y-2 rounded-lg border border-border/30 p-3 bg-muted/5" key={i}>
                <Skeleton className="h-3 w-16 opacity-20" />
                <Skeleton className="h-6 w-20 opacity-20" />
                <Skeleton className="h-3 w-24 opacity-20" />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                className="flex items-center gap-3 rounded-lg border border-border/30 px-3 py-2.5 bg-muted/5"
                key={i}
              >
                <Skeleton className="size-8 rounded-md opacity-20" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40 opacity-20" />
                  <Skeleton className="h-3 w-28 opacity-20" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full opacity-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
