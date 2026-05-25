export default function VerifyLoading() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-10">
      <div className="skeleton h-6 w-32 rounded-full" />
      <div className="skeleton mt-6 h-12 w-2/3 rounded-xl" />
      <div className="skeleton mt-4 h-4 w-1/2 rounded-full" />
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="skeleton h-[420px] rounded-[1.25rem]" />
        <div className="space-y-6">
          <div className="skeleton h-56 rounded-[1.25rem]" />
          <div className="skeleton h-40 rounded-[1.25rem]" />
        </div>
      </div>
    </div>
  );
}
