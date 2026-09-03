import { PageHero } from "@/components/site/section";
import { announcements } from "@/content/announcements";

export const metadata = { title: "Announcements" };

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AnnouncementsPage() {
  return (
    <>
      <PageHero
        kicker="DAEMUN III / Announcements"
        title="Announcements"
        lead="Schedule changes, corrections and urgent notices from the Secretariat. Anything time-sensitive is posted here first."
      />

      <div className="mx-auto max-w-3xl px-5 py-[40px] sm:px-8 md:py-[70px]">
        {announcements.length === 0 ? (
          <p className="text-[15px] text-muted">No announcements yet.</p>
        ) : (
          <ol className="flex flex-col gap-14">
            {announcements.map(({ slug, title, date, urgent, Body }) => (
              <li key={slug} id={slug} className="scroll-mt-24">
                <article
                  className={
                    urgent
                      ? "rounded-sm border border-gold/40 bg-gold/5 px-6 py-7 sm:px-8"
                      : ""
                  }
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <time
                      dateTime={date}
                      className="font-roman text-[12px] uppercase tracking-widest text-black/50"
                    >
                      {formatDate(date)}
                    </time>
                    {urgent ? (
                      <span className="font-roman rounded-sm border border-gold/50 px-2 py-0.5 text-[11px] uppercase tracking-widest text-gold">
                        Urgent
                      </span>
                    ) : null}
                  </div>
                  <h2
                    className="font-custom mt-3 text-[26px] uppercase text-ink sm:text-[32px]"
                    style={{ lineHeight: 1.08 }}
                  >
                    {title}
                  </h2>
                  <div className="mt-2">
                    <Body />
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
