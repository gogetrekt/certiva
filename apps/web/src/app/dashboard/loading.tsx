export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-32 rounded-[1.25rem]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="skeleton h-28 rounded-[1.25rem]" />
        <div className="skeleton h-28 rounded-[1.25rem]" />
        <div className="skeleton h-28 rounded-[1.25rem]" />
        <div className="skeleton h-28 rounded-[1.25rem]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="skeleton h-[420px] rounded-[1.25rem]" />
        <div className="space-y-6">
          <div className="skeleton h-64 rounded-[1.25rem]" />
          <div className="skeleton h-52 rounded-[1.25rem]" />
        </div>
      </div>
    </div>
  );
}
