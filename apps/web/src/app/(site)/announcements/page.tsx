import { PageHero } from "@/components/site/section";
import { getSite } from "@/lib/site";

export const metadata = { title: "Announcements" };

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Public announcements — driven by SiteData.announcements, edited from the
 * admin panel's Announcements screen. The API only sends published ones;
 * order is admin sortOrder with urgent pinned first.
 */
export default async function AnnouncementsPage() {
  const { announcements } = await getSite();
  const sorted = [...announcements].sort((a, b) => {
    if (!!a.urgent !== !!b.urgent) return a.urgent ? -1 : 1;
    return b.date.localeCompare(a.date);
  });

  return (
    <>
      <PageHero
        kicker="DAEMUN III / Announcements"
        title="Announcements"
        lead="Schedule changes, corrections and urgent notices from the Secretariat. Anything time-sensitive is posted here first."
      />

      <div className="mx-auto max-w-3xl px-5 py-[40px] sm:px-8 md:py-[70px]">
        {sorted.length === 0 ? (
          <p className="text-[15px] text-muted">No announcements yet.</p>
        ) : (
          <ol className="flex flex-col gap-14">
            {sorted.map((a) => (
              <li key={a.id} id={a.id} className="scroll-mt-24">
                <article
                  className={
                    a.urgent
                      ? "rounded-sm border border-gold/40 bg-gold/5 px-6 py-7 sm:px-8"
                      : ""
                  }
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {a.date && (
                      <time
                        dateTime={a.date}
                        className="font-roman text-[12px] uppercase tracking-widest text-black/50"
                      >
                        {formatDate(a.date)}
                      </time>
                    )}
                    {a.urgent && (
                      <span className="font-roman rounded-sm border border-gold/50 px-2 py-0.5 text-[11px] uppercase tracking-widest text-gold">
                        Urgent
                      </span>
                    )}
                  </div>
                  <h2
                    className="font-custom mt-3 text-[26px] uppercase text-ink sm:text-[32px]"
                    style={{ lineHeight: 1.08 }}
                  >
                    {a.title}
                  </h2>
                  <div className="mt-2 space-y-4">
                    {a.body
                      .split(/\n{2,}/)
                      .map((p) => p.trim())
                      .filter(Boolean)
                      .map((p, i) => (
                        <p key={i} className="text-[15.5px] leading-[1.85] text-body">
                          {p}
                        </p>
                      ))}
                  </div>
                </article>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
