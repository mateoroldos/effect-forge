import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="grid min-h-screen min-w-80 place-items-center bg-stone-100 px-6 py-16 text-stone-900 sm:px-10">
      <section className="w-full max-w-5xl py-16 sm:py-24" aria-labelledby="page-title">
        <p className="mb-6 text-xs font-semibold tracking-[0.16em] text-stone-500 uppercase">
          Effect Forge
        </p>
        <h1
          id="page-title"
          className="max-w-3xl text-5xl leading-[0.92] font-medium tracking-[-0.06em] text-balance sm:text-7xl lg:text-8xl"
        >
          Build the system you can explain.
        </h1>
        <p className="mt-10 max-w-2xl text-lg leading-8 text-pretty text-stone-600 sm:text-xl">
          A typed path from browser interactions to Effect services and PostgreSQL—without hiding
          the seams that keep production software dependable.
        </p>
        <div
          className="mt-10 flex items-center gap-3 text-sm text-stone-600"
          aria-label="Application status"
        >
          <span
            className="size-2 rounded-full bg-emerald-700 ring-4 ring-emerald-700/10"
            aria-hidden="true"
          />
          <span>Web runtime ready</span>
        </div>
      </section>
    </main>
  );
}
