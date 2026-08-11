import { DashboardSkeleton } from '@/components/ui/premium/dashboard-skeleton';

export default function Loading() {
  return (
    <div className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto flex items-center justify-center min-h-[calc(100vh-100px)]">
      <DashboardSkeleton />
    </div>
  );
}
