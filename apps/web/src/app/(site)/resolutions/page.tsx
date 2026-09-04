import { Download } from "lucide-react";
import type {
  CommitteeWithTopics,
  Resolution,
  ResolutionStatus,
} from "@daemun/shared";
import { DocsPage } from "@/components/site/docs-page";
import { PageHero, TBA } from "@/components/site/section";
import {
  MailIcon,
  SpinnerIcon,
  WorldIcon,
} from "@/components/ui/skiper-ui/skiper42";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/skiper-ui/skiper101";
import { TextRoll } from "@/components/ui/skiper-ui/skiper58";
import { getSite } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata = { title: "Resolutions" };

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

const STATUS_META: Record<ResolutionStatus, { label: string; tone: string }> = {
  awaiting: { label: "Awaiting submission", tone: "border-line text-muted" },
  review: { label: "Under review", tone: "border-gold/35 text-gold" },
  approved: { label: "Approved — released at debate start", tone: "border-[#1f6f45]/30 text-[#1f6f45]" },
  published: { label: "Published", tone: "border-[#1f6f45]/30 text-[#1f6f45]" },
};

/** skiper42 animated status icon with a skiper101 tooltip naming the status. */
function StatusIcon({ status }: { status: ResolutionStatus }) {
  const meta = STATUS_META[status];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={meta.label}
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-sm border bg-white",
            meta.tone,
          )}
        >
          {status === "published" && <WorldIcon />}
          {status === "approved" && (
            <span className="text-[13px] font-semibold" aria-hidden>
              ✓
            </span>
          )}
          {status === "review" && (
            <SpinnerIcon size={16} color="var(--color-gold)" />
          )}
          {status === "awaiting" && <MailIcon />}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{meta.label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/** Mobile-only micro label so stacked cells stay legible at 375px. */
function CellLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="w-24 shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] text-faint sm:hidden">
      {children}
    </span>
  );
}

const GRID_COLS =
  "sm:grid-cols-[40px_minmax(0,2.2fr)_minmax(0,1.2fr)_70px_110px]";

function TopicRow({
  index,
  title,
  entry,
  first = true,
}: {
  index: number;
  title: string;
  entry?: Resolution;
  /** 같은 의제의 두 번째 결의안부터는 번호·제목을 반복하지 않는다 */
  first?: boolean;
}) {
  const status: ResolutionStatus = entry?.status ?? "awaiting";
  const numeral = ROMAN[index] ?? String(index + 1);
  const hasDocument = entry?.status === "published" && entry.document;

  return (
    <li
      className={cn(
        "grid gap-3 border-b border-line px-5 py-5 last:border-b-0 sm:items-center sm:gap-6 sm:px-6 sm:py-[22px]",
        GRID_COLS,
      )}
    >
      <div className="hidden text-[22px] italic leading-none text-faint sm:block">
        {first ? numeral : ""}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint sm:hidden">
          Topic {numeral}
        </div>
        <div className="text-[15px] font-semibold leading-snug text-ink">
          {first ? <TBA value={title} /> : <span className="text-faint">〃</span>}
        </div>
        <div className="text-[12px] text-muted">
          {entry ? entry.label : "No draft submitted"}
        </div>
      </div>

      <div className="flex items-baseline gap-3 text-[14px] text-body">
        <CellLabel>Submitter</CellLabel>
        {entry ? <TBA value={entry.submitter} /> : <span className="text-faint">&mdash;</span>}
      </div>

      <div className="flex items-center gap-3">
        <CellLabel>Status</CellLabel>
        <StatusIcon status={status} />
      </div>

      <div className="flex items-center gap-3 sm:justify-end">
        <CellLabel>Document</CellLabel>
        {hasDocument ? (
          <a
            href={entry.document ?? "#"}
            download
            className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-brand/35 px-4 text-[12px] font-roman uppercase tracking-widest text-black/55 transition-colors hover:bg-brand hover:text-white"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            <TextRoll className="leading-none">PDF</TextRoll>
          </a>
        ) : (
          <span className="text-[13px] text-faint">&mdash;</span>
        )}
      </div>
    </li>
  );
}

function CommitteePanel({
  committee,
  entries,
}: {
  committee: CommitteeWithTopics;
  entries: Resolution[];
}) {
  return (
    <>
      <p className="text-[14px] text-muted">
        {committee.name} &middot; {committee.topics.length} topics
      </p>

      <div className="overflow-hidden rounded-sm border border-line bg-white">
        <div
          className={cn(
            "hidden border-b border-line bg-wash px-6 py-3.5 sm:grid sm:gap-6",
            GRID_COLS,
          )}
        >
          {["Topic", "Resolution", "Main submitter", "Status", "Document"].map(
            (label, i) => (
              <div
                key={label}
                className={cn(
                  "text-[11px] font-medium uppercase tracking-[0.14em] text-faint",
                  i === 4 && "text-right",
                )}
              >
                {label}
              </div>
            ),
          )}
        </div>

        <ul>
          {committee.topics.flatMap((topic, i) => {
            // 한 의제에 결의안이 여러 개일 수 있다 (팀이 둘로 갈린 경우) — 전부 그린다
            const forTopic = entries.filter((e) => e.topicId === topic.id);
            if (forTopic.length === 0) {
              return [<TopicRow key={topic.id} index={i} title={topic.title} />];
            }
            return forTopic.map((entry, j) => (
              <TopicRow
                key={entry.id}
                index={i}
                title={topic.title}
                entry={entry}
                first={j === 0}
              />
            ));
          })}
        </ul>
      </div>
    </>
  );
}

export default async function ResolutionsPage() {
  const { committees, resolutions } = await getSite();

  const sections = committees.map((committee) => ({
    id: committee.slug,
    title: committee.code,
    content: (
      <CommitteePanel
        committee={committee}
        entries={resolutions[committee.slug] ?? []}
      />
    ),
  }));

  return (
    <>
      <PageHero
        kicker="DAEMUN III / Resolutions"
        title="Approval Panel"
        lead="Draft resolutions submitted to the approval panel, with their current status. Approved resolutions become available here for delegates to read before debate."
      />
      <DocsPage sections={sections} />
    </>
  );
}
