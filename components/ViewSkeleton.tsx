import React from 'react';

interface ViewSkeletonProps {
  view?: string;
}

const HeaderSkeleton = () => (
  <div className="h-24 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm p-5">
    <div className="skeleton-shimmer h-3 w-40 rounded-full" />
    <div className="skeleton-shimmer h-8 w-72 rounded-lg mt-3" />
    <div className="skeleton-shimmer h-3 w-56 rounded-full mt-3" />
  </div>
);

const DashboardSkeleton = () => (
  <>
    <HeaderSkeleton />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`skeleton-kpi-${index}`} className="rounded-2xl border border-slate-200 bg-white/70 p-5 backdrop-blur-sm">
          <div className="skeleton-shimmer h-3 w-24 rounded-full" />
          <div className="skeleton-shimmer h-8 w-16 rounded-lg mt-3" />
          <div className="skeleton-shimmer h-10 w-10 rounded-xl mt-4" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 h-64">
        <div className="skeleton-shimmer h-4 w-40 rounded-full" />
        <div className="skeleton-shimmer h-44 rounded-xl mt-4" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 h-64 xl:col-span-2">
        <div className="skeleton-shimmer h-4 w-56 rounded-full" />
        <div className="skeleton-shimmer h-44 rounded-xl mt-4" />
      </div>
    </div>
  </>
);

const CalendarSkeleton = () => (
  <>
    <HeaderSkeleton />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={`skeleton-calendar-stat-${index}`} className="rounded-xl border border-slate-200 bg-white/70 p-4">
          <div className="skeleton-shimmer h-3 w-24 rounded-full" />
          <div className="skeleton-shimmer h-7 w-20 rounded-lg mt-2" />
        </div>
      ))}
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, index) => (
          <div key={`skeleton-calendar-cell-${index}`} className="h-20 rounded-lg border border-slate-100 bg-white/70 p-2">
            <div className="skeleton-shimmer h-3 w-6 rounded-full" />
            <div className="skeleton-shimmer h-2 w-full rounded-full mt-2" />
            <div className="skeleton-shimmer h-2 w-4/5 rounded-full mt-2" />
          </div>
        ))}
      </div>
    </div>
  </>
);

const ReportsSkeleton = () => (
  <>
    <HeaderSkeleton />
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-5">
      <div className="skeleton-shimmer h-4 w-48 rounded-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="skeleton-shimmer h-10 rounded-lg" />
        <div className="skeleton-shimmer h-10 rounded-lg" />
      </div>
      <div className="space-y-3 mt-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`skeleton-report-row-${index}`} className="skeleton-shimmer h-12 rounded-lg" />
        ))}
      </div>
    </div>
  </>
);

const GenericSkeleton = () => (
  <>
    <HeaderSkeleton />
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 space-y-3">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={`skeleton-generic-row-${index}`} className="skeleton-shimmer h-11 rounded-lg" />
      ))}
    </div>
  </>
);

export const ViewSkeleton: React.FC<ViewSkeletonProps> = ({ view }) => {
  const renderByView = () => {
    if (view === 'dashboard') return <DashboardSkeleton />;
    if (view === 'calendar') return <CalendarSkeleton />;
    if (view === 'reports') return <ReportsSkeleton />;
    return <GenericSkeleton />;
  };

  return (
    <div className="space-y-5 animate-fade-in-up" aria-hidden="true">
      {renderByView()}
    </div>
  );
};
