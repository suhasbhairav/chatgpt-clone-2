// Static shell rendered at build time (before client state loads).
export default function ShellFallback() {
  return (
    <div className="flex h-dvh w-full bg-bg">
      <div className="hidden h-full w-[260px] bg-sidebar md:block" />
      <div className="flex flex-1 flex-col">
        <div className="flex h-14 items-center px-6 text-[18px] font-medium">Assist 5</div>
      </div>
    </div>
  );
}
