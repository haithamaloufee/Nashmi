export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded ${className}`} />;
}

export function HomeStatsSkeleton() {
  return (
    <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded border border-white/20 bg-white/12 p-4 backdrop-blur">
          <SkeletonLine className="h-8 w-20 bg-white/25" />
          <SkeletonLine className="mt-3 h-3 w-24 bg-white/20" />
        </div>
      ))}
    </div>
  );
}

export function HomeFeedsSkeleton() {
  return (
    <section className="container-page grid gap-6 pb-14 lg:grid-cols-2">
      <div>
        <SkeletonLine className="mb-4 h-8 w-40" />
        <div className="grid gap-4">
          <PostCardSkeleton compact />
          <PostCardSkeleton compact />
          <PostCardSkeleton compact />
        </div>
      </div>
      <div>
        <SkeletonLine className="mb-4 h-8 w-40" />
        <div className="grid gap-4">
          <PollCardSkeleton />
          <PollCardSkeleton />
        </div>
      </div>
    </section>
  );
}

export function HomePageSkeleton() {
  return (
    <main>
      <section className="border-b border-line bg-ink text-white">
        <div className="container-page flex min-h-[560px] flex-col justify-center py-14">
          <SkeletonLine className="h-4 w-32 bg-white/20" />
          <SkeletonLine className="mt-5 h-14 w-full max-w-2xl bg-white/20" />
          <SkeletonLine className="mt-4 h-14 w-full max-w-xl bg-white/20" />
          <div className="mt-8 flex gap-3">
            <SkeletonLine className="h-12 w-36 bg-white/20" />
            <SkeletonLine className="h-12 w-36 bg-white/20" />
          </div>
          <HomeStatsSkeleton />
        </div>
      </section>
      <section className="container-page py-12">
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="card p-5">
              <SkeletonLine className="h-7 w-7" />
              <SkeletonLine className="mt-4 h-5 w-24" />
              <SkeletonLine className="mt-3 h-3 w-full" />
              <SkeletonLine className="mt-2 h-3 w-4/5" />
            </div>
          ))}
        </div>
      </section>
      <HomeFeedsSkeleton />
    </main>
  );
}

export function PostCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <article className="card p-5">
      <div className="flex items-start gap-3">
        <SkeletonLine className="h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-4 w-36" />
          <SkeletonLine className="h-3 w-24" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-5/6" />
        <SkeletonLine className="h-4 w-2/3" />
      </div>
      {!compact ? <SkeletonLine className="mt-4 aspect-video w-full" /> : null}
      <div className="mt-4 flex gap-2">
        <SkeletonLine className="h-9 flex-1" />
        <SkeletonLine className="h-9 flex-1" />
        <SkeletonLine className="h-9 flex-1" />
      </div>
    </article>
  );
}

export function PollCardSkeleton() {
  return (
    <article className="card p-5">
      <SkeletonLine className="h-5 w-48" />
      <div className="mt-4 space-y-3">
        <SkeletonLine className="h-12 w-full" />
        <SkeletonLine className="h-12 w-full" />
        <SkeletonLine className="h-12 w-full" />
      </div>
      <SkeletonLine className="mt-4 h-9 w-28" />
    </article>
  );
}

export function CommentSkeleton() {
  return (
    <div className="rounded border border-line bg-white/80 p-3">
      <div className="flex items-start gap-3">
        <SkeletonLine className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-3 w-28" />
          <SkeletonLine className="h-3 w-full" />
          <SkeletonLine className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <aside className="space-y-4">
      {[0, 1, 2].map((item) => (
        <div key={item} className="card p-4">
          <SkeletonLine className="h-4 w-28" />
          <div className="mt-4 space-y-2">
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-3 w-4/5" />
            <SkeletonLine className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </aside>
  );
}

export function UpdatesPageSkeleton() {
  return (
    <main className="container-page py-8">
      <SkeletonLine className="h-10 w-56" />
      <SkeletonLine className="mt-3 h-4 w-full max-w-xl" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          <div className="card p-3">
            <SkeletonLine className="h-12 w-full" />
            <div className="mt-3 flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4].map((item) => <SkeletonLine key={item} className="h-9 w-24 rounded-full" />)}
            </div>
          </div>
          <PostCardSkeleton />
          <PollCardSkeleton />
          <PostCardSkeleton />
        </section>
        <div className="hidden lg:block">
          <SidebarSkeleton />
        </div>
      </div>
    </main>
  );
}

export function PartyCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <SkeletonLine className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-4 w-32" />
          <SkeletonLine className="h-3 w-20" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <SkeletonLine className="h-3 w-full" />
        <SkeletonLine className="h-3 w-5/6" />
        <SkeletonLine className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function PartiesPageSkeleton() {
  return (
    <main className="container-page py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <SkeletonLine className="h-10 w-48" />
          <SkeletonLine className="mt-3 h-4 w-80 max-w-full" />
        </div>
        <SkeletonLine className="h-11 w-72" />
      </div>
      <SkeletonLine className="mb-6 h-14 w-full" />
      <div className="mb-8 grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="card p-4">
            <SkeletonLine className="h-3 w-16" />
            <SkeletonLine className="mt-3 h-4 w-full" />
            <SkeletonLine className="mt-2 h-4 w-2/3" />
          </div>
        ))}
      </div>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => <PartyCardSkeleton key={item} />)}
      </section>
    </main>
  );
}

export function LawsPageSkeleton() {
  return (
    <main className="container-page py-8">
      <SkeletonLine className="h-10 w-48" />
      <SkeletonLine className="mt-3 h-4 w-full max-w-xl" />
      <SkeletonLine className="mt-5 h-14 w-full" />
      <div className="my-6 flex flex-wrap gap-2">
        <SkeletonLine className="h-11 w-72" />
        <SkeletonLine className="h-11 w-44" />
        <SkeletonLine className="h-11 w-12" />
      </div>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="card p-5">
            <SkeletonLine className="h-5 w-36" />
            <SkeletonLine className="mt-4 h-3 w-full" />
            <SkeletonLine className="mt-2 h-3 w-5/6" />
            <SkeletonLine className="mt-5 h-9 w-28" />
          </div>
        ))}
      </section>
    </main>
  );
}

export function ChatbotSkeleton() {
  return (
    <main className="container-page py-8">
      <SkeletonLine className="h-9 w-72" />
      <SkeletonLine className="mt-3 h-4 w-full max-w-2xl" />
      <div className="mt-6 grid min-h-[620px] gap-4 lg:grid-cols-[280px_1fr]">
        <div className="card p-4">
          <SkeletonLine className="h-5 w-28" />
          <div className="mt-4 space-y-2">
            <SkeletonLine className="h-10 w-full" />
            <SkeletonLine className="h-10 w-full" />
            <SkeletonLine className="h-10 w-4/5" />
          </div>
        </div>
        <div className="card p-4">
          <SkeletonLine className="h-6 w-40" />
          <div className="mt-6 space-y-4">
            <SkeletonLine className="h-16 w-2/3 rounded-2xl" />
            <SkeletonLine className="mr-auto h-14 w-1/2 rounded-2xl" />
            <SkeletonLine className="h-16 w-3/4 rounded-2xl" />
          </div>
          <SkeletonLine className="mt-8 h-12 w-full rounded-full" />
        </div>
      </div>
    </main>
  );
}

export function DashboardSkeleton() {
  return (
    <main className="container-page py-8">
      <SkeletonLine className="h-9 w-56" />
      <div className="mt-5 flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((item) => <SkeletonLine key={item} className="h-9 w-28" />)}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="card p-5">
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="mt-3 h-8 w-16" />
            <SkeletonLine className="mt-3 h-3 w-full" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function AuthPageSkeleton() {
  return (
    <main className="container-page grid min-h-[520px] place-items-center py-8">
      <div className="card w-full max-w-md p-6">
        <SkeletonLine className="h-8 w-36" />
        <div className="mt-6 space-y-3">
          <SkeletonLine className="h-11 w-full" />
          <SkeletonLine className="h-11 w-full" />
          <SkeletonLine className="h-11 w-full" />
        </div>
      </div>
    </main>
  );
}
