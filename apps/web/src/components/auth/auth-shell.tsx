import Image from "next/image";
import Link from "next/link";

/**
 * Split-screen frame for sign-in / sign-up screens: brand panel on the left,
 * form on the right. Collapses to a single column on small screens.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ---- Brand panel ---- */}
      <aside className="relative m-3 hidden min-h-[calc(100vh-1.5rem)] flex-1 overflow-hidden rounded-3xl bg-white lg:flex">
        {/* Soft blue bloom — one blurred blob, like the reference */}
        <div
          aria-hidden
          className="absolute -inset-[20%] blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse 34% 30% at 56% 46%, #0c4884 0%, rgba(20,90,160,0.85) 30%, rgba(60,125,200,0.5) 58%, rgba(140,175,225,0.22) 80%, rgba(255,255,255,0) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -inset-[20%] blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse 22% 18% at 34% 74%, rgba(12,72,132,0.35) 0%, rgba(12,72,132,0) 100%)",
          }}
        />

        <BrandMark className="absolute left-10 top-9 z-10" />

        <p className="font-custom absolute bottom-10 left-10 z-10 max-w-[14ch] text-[38px] font-semibold leading-[1.08] tracking-[0.02em] text-ink">
          Daewon Model United Nations
        </p>
        <p className="font-roman absolute bottom-4 left-10 z-10 text-[11px] uppercase tracking-[0.28em] text-ink/50">
          Third session · November 2026
        </p>
      </aside>

      {/* ---- Content ---- */}
      <section className="relative flex flex-1 flex-col px-6 py-8 sm:px-10 lg:py-10">
        <BrandMark className="lg:hidden" />

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>

        <nav className="flex justify-center gap-8 text-[13px] text-faint lg:justify-end lg:pr-12">
          <Link href="/" className="transition-colors hover:text-ink">
            Home
          </Link>
          <Link href="/guide" className="transition-colors hover:text-ink">
            Guide to MUN
          </Link>
          <Link href="/#contact" className="transition-colors hover:text-ink">
            Contact
          </Link>
        </nav>
      </section>
    </div>
  );
}

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image src="/emblem-navy.png" alt="DAEMUN emblem" width={34} height={26} priority />
      <span className="font-custom text-[26px] font-semibold tracking-[0.08em] text-ink">
        DAEMUN III
      </span>
    </Link>
  );
}
