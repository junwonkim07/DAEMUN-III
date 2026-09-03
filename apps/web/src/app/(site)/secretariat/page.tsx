import Image from "next/image";
import { User } from "lucide-react";
import type { Person } from "@daemun/shared";
import { getSite } from "@/lib/site";
import { DocsPage, type DocsSection } from "@/components/site/docs-page";
import { PageHero, TBA } from "@/components/site/section";

export const metadata = { title: "Secretariat" };

/** Small uppercase role line; Head Chair is highlighted in gold. */
function RoleLine({ role }: { role: string }) {
  return (
    <div
      className={`text-[11px] font-medium uppercase tracking-[0.14em] ${
        role === "Head Chair" ? "text-gold" : "text-brand"
      }`}
    >
      <TBA value={role} />
    </div>
  );
}

/** Greetings are stored as blank-line separated paragraphs. */
function Greeting({ person, className }: { person: Person; className?: string }) {
  if (!person.greeting) return null;
  const paragraphs = person.greeting
    .split(/\r?\n\s*\r?\n/)
    .map((t) => t.trim())
    .filter(Boolean);
  return (
    <div className={className}>
      {paragraphs.map((text, i) => (
        <p key={i} className={i > 0 ? "mt-3" : undefined}>
          {text}
        </p>
      ))}
    </div>
  );
}

/** Quiet placeholder for a missing portrait. */
function PhotoPlaceholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-wash">
      <User strokeWidth={1.25} className="h-10 w-10 text-faint" aria-hidden />
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-faint">
        Photo
      </div>
    </div>
  );
}

/** Horizontal member card: small portrait on the left, name/role/greeting on the right. */
function MemberCard({ person }: { person: Person }) {
  return (
    <article className="group grid grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-sm border border-line bg-white sm:grid-cols-[150px_minmax(0,1fr)]">
      <div className="relative aspect-[4/5] overflow-hidden border-r border-line">
        {person.photo ? (
          <Image
            src={person.photo}
            alt={person.name}
            fill
            sizes="(min-width: 640px) 150px, 112px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <PhotoPlaceholder />
        )}
      </div>
      <div className="flex flex-col gap-2 p-5 sm:p-6">
        <RoleLine role={person.role} />
        <div className="text-[20px] leading-[1.15] text-ink sm:text-[22px]">
          <TBA value={person.name} />
        </div>
        <Greeting person={person} className="mt-1 max-w-[62ch] text-[13.5px] leading-[1.75] text-body" />
      </div>
    </article>
  );
}

export default async function SecretariatPage() {
  const { committees, secretariat } = await getSite();
  const { director, executives, departments, chairs } = secretariat;

  const chairSections = committees.map((committee) => ({
    slug: committee.slug,
    committee,
    people: chairs[committee.slug] ?? [],
  }));

  const sections: DocsSection[] = [
    {
      id: "director",
      title: "Director",
      content: director ? (
        <>
          <p className="text-[14px] text-muted">Faculty supervision.</p>
          <div className="group grid overflow-hidden rounded-sm border border-line bg-white sm:grid-cols-[150px_minmax(0,1fr)]">
            <div className="relative aspect-[3/2] overflow-hidden border-b border-line sm:aspect-[4/5] sm:border-b-0 sm:border-r">
              {director.photo ? (
                <Image
                  src={director.photo}
                  alt={director.name}
                  fill
                  sizes="(min-width: 640px) 150px, 100vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                />
              ) : (
                <PhotoPlaceholder />
              )}
            </div>
            <div className="flex flex-col justify-center gap-3 p-5 sm:p-6">
              <RoleLine role={director.role} />
              <div className="text-[22px] leading-[1.1] text-ink sm:text-[26px]">
                <TBA value={director.name} />
              </div>
              <div className="h-px w-10 bg-line" />
              <Greeting
                person={director}
                className="max-w-2xl text-[15px] leading-relaxed text-body"
              />
            </div>
          </div>
        </>
      ) : (
        <p className="text-[14px] text-muted">To be announced.</p>
      ),
    },
    {
      id: "executive-office",
      title: "Executive Office",
      content: (
        <>
          <p className="text-[14px] text-muted">
            Secretary-General &amp; Deputy Secretary-General.
          </p>
          <div className="flex flex-col gap-5">
            {executives.map((person) => (
              <MemberCard key={person.id} person={person} />
            ))}
          </div>
        </>
      ),
    },
    {
      id: "departments",
      title: "Departments",
      content: (
        <>
          <p className="text-[14px] text-muted">
            Heads and deputies of each department.
          </p>
          <div className="flex flex-col gap-12">
            {departments.map((dept) => (
              <div key={dept.name} className="flex flex-col gap-4">
                <div className="flex items-baseline gap-4">
                  <div className="text-[22px] leading-[1.1] text-ink sm:text-[24px]">
                    {dept.name}
                  </div>
                  <p className="text-[13px] leading-relaxed text-muted">{dept.blurb}</p>
                </div>
                <div className="flex flex-col gap-5">
                  {dept.members.map((person) => (
                    <MemberCard key={person.id} person={person} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ),
    },
    ...chairSections.map(({ slug, committee, people }) => ({
      id: `chairs-${slug}`,
      title: `${committee?.code ?? slug.toUpperCase()} Chairs`,
      content: (
        <>
          {committee ? (
            <p className="text-[14px] text-muted">
              {committee.name} &middot; head chair, then deputies.
            </p>
          ) : null}
          <div className="flex flex-col gap-5">
            {people.map((person) => (
              <MemberCard key={person.id} person={person} />
            ))}
          </div>
        </>
      ),
    })),
  ];

  return (
    <>
      <PageHero
        kicker="DAEMUN III / Secretariat"
        title="Leadership"
        lead="The director, executive board and chairs who prepare and run DAEMUN III — the people delegates will be working with across the conference."
      />
      <DocsPage sections={sections} />
    </>
  );
}
