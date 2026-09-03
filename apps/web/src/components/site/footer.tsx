import Image from "next/image";
import Link from "next/link";
import { TextRoll } from "@/components/ui/skiper-ui/skiper58";
import type { Conference } from "@daemun/shared";
import { TBA } from "@/components/site/section";

function InstagramIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

const SITEMAP = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Secretariat", href: "/secretariat" },
  { label: "Committees", href: "/committees" },
  { label: "Resolutions", href: "/resolutions" },
  { label: "Guide to MUN", href: "/guide" },
  { label: "Announcements", href: "/announcements" },
];

const RESOURCES = [
  { label: "Chair Reports", href: "/committees" },
  { label: "Approval Panel", href: "/resolutions" },
  { label: "Rules of Procedure", href: "/guide#rop" },
  { label: "Resolution Template", href: "/guide#downloads" },
  { label: "All Documents", href: "/guide#downloads" },
];

/** TextRoll collapses plain spaces (inline-block chars) — swap for NBSP. */
function roll(label: string) {
  return label.replaceAll(" ", " ");
}

export function SiteFooter({ conference }: { conference: Conference }) {
  return (
    <footer id="contact" className="bg-navy text-white">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 border-b border-white/10 pb-12 md:grid-cols-[1.3fr_1fr_1fr_1.1fr]">
          {/* Identity */}
          <div className="flex flex-col gap-5">
            <Image src="/emblem-white.png" alt="DAEMUN emblem" width={64} height={48} />
            <div className="text-[16px] font-semibold tracking-[0.14em]">
              {conference.name}
            </div>
            <p className="max-w-[26ch] text-[13px] leading-relaxed text-white/50">
              A student-led Model United Nations conference by {conference.org}.
            </p>
          </div>

          {/* Sitemap */}
          <div>
            <div className="font-roman text-[11px] uppercase tracking-widest text-white/40">
              Sitemap
            </div>
            <ul className="mt-4 flex flex-col gap-2.5">
              {SITEMAP.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="inline-block py-0.5 text-[14px] text-white/70 transition-colors hover:text-white"
                  >
                    <TextRoll>{roll(l.label)}</TextRoll>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <div className="font-roman text-[11px] uppercase tracking-widest text-white/40">
              Resources
            </div>
            <ul className="mt-4 flex flex-col gap-2.5">
              {RESOURCES.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="inline-block py-0.5 text-[14px] text-white/70 transition-colors hover:text-white"
                  >
                    <TextRoll>{roll(l.label)}</TextRoll>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="font-roman text-[11px] uppercase tracking-widest text-white/40">
                Address
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-white/70">
                <TBA value={conference.address} />
              </p>
            </div>
            <div>
              <div className="font-roman text-[11px] uppercase tracking-widest text-white/40">
                Instagram
              </div>
              <a
                href={conference.instagramUrl}
                className="mt-3 inline-flex items-center gap-2 text-[14px] text-white/70 transition-colors hover:text-white"
              >
                <InstagramIcon size={15} />
                {conference.instagram === "TBA" ? (
                  <TBA value="TBA" />
                ) : (
                  <span>@{conference.instagram}</span>
                )}
              </a>
            </div>
            <div>
              <div className="font-roman text-[11px] uppercase tracking-widest text-white/40">
                Enquiries
              </div>
              <p className="mt-3 text-[14px] text-white/70">
                <TBA value={conference.email} />
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-7 text-[12px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <div>© 2026 {conference.name} · Junwon Kim &amp; Minchan Kim</div>
          <div className="flex gap-6">
            <Link href="/committees" className="py-2 transition-colors hover:text-white/70">
              <TextRoll>Committees</TextRoll>
            </Link>
            <Link href="/guide" className="py-2 transition-colors hover:text-white/70">
              <TextRoll>{roll("Guide to MUN")}</TextRoll>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
