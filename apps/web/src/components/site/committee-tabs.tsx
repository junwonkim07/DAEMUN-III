"use client";

import { useState } from "react";
import { ArrowUpRight, Download, FileText, Users } from "lucide-react";
import { fileHref, type CommitteeWithTopics as Committee } from "@daemun/shared";
import { TBA } from "@/components/site/section";
import { TextRoll } from "@/components/ui/skiper-ui/skiper58";
import { cn } from "@/lib/utils";

const NUMERALS = ["I", "II", "III", "IV", "V", "VI"];

export function CommitteeTabs({ committees }: { committees: Committee[] }) {
  const [activeSlug, setActiveSlug] = useState(committees[0]?.slug);
  const active = committees.find((c) => c.slug === activeSlug) ?? committees[0];

  if (!active) return null;

  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-5 sm:px-8">
          <div role="tablist" aria-label="Committees" className="flex">
            {committees.map((c) => (
              <button
                key={c.slug}
                type="button"
                role="tab"
                aria-selected={c.slug === active.slug}
                onClick={() => setActiveSlug(c.slug)}
                className={cn(
                  "-mb-px inline-flex min-h-[56px] items-center border-b-2 px-5 text-[14px] font-medium tracking-[0.08em] transition-colors sm:px-7",
                  c.slug === active.slug
                    ? "border-brand text-ink"
                    : "border-transparent text-faint hover:text-muted",
                )}
              >
                <TextRoll>{c.code}</TextRoll>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Committee intro — dark photo band */}
      <section className="relative overflow-hidden bg-navy">
        {active.image ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${active.image})` }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-navy/80" aria-hidden />
          </>
        ) : null}
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-20">
          <div className="flex flex-col gap-5">
            <div className="text-[12px] font-roman uppercase tracking-widest text-gold-soft">
              {active.code}
            </div>
            <h2 className="font-custom text-[32px] uppercase leading-[1.08] text-white sm:text-[42px]">
              {active.name}
            </h2>
            <div className="h-px w-11 bg-white/30" aria-hidden />
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5 text-[13px] text-white/70">
                <Users className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
                <span>Head chair &amp; deputy chairs</span>
              </div>
              <div className="flex items-center gap-2.5 text-[13px] text-white/70">
                <FileText className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
                <span>Four topics under debate</span>
              </div>
            </div>
            {active.sourceUrl ? (
              <a
                href={active.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 text-[13px] text-gold-soft transition-colors hover:text-white"
              >
                <TextRoll>{active.sourceLabel ?? active.sourceUrl}</TextRoll>
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
              </a>
            ) : null}
          </div>

          <div className="flex max-w-2xl flex-col gap-5">
            <p className="text-[18px] leading-[1.66] text-white sm:text-[20px]">
              {active.description}
            </p>
            <p className="text-[15px] leading-[1.78] text-white/65">
              Delegates should read the chair report for their topic in full before the
              conference, research their assigned country&rsquo;s position, and prepare an
              opening speech and at least one working paper idea.
            </p>
          </div>
        </div>
      </section>

      {/* Topics */}
      <section className="bg-wash">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="font-serif text-[30px] leading-[1.06] tracking-normal text-ink sm:text-[34px]">
              Topics <em>under debate</em>
            </h3>
            <p className="text-[13px] text-muted">Chair reports available as PDF</p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 sm:gap-6">
            {active.topics.map((topic, i) => (
              <article
                key={`${active.slug}-${i}`}
                className="flex flex-col gap-5 rounded-sm border border-line bg-white p-6 sm:p-8"
              >
                <div className="flex items-baseline gap-4">
                  <div className="font-serif text-[36px] leading-none text-faint/50" aria-hidden>
                    {NUMERALS[i] ?? i + 1}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="text-[12px] font-roman uppercase tracking-widest text-black/55">
                      Topic {NUMERALS[i] ?? i + 1}
                    </div>
                    <h4 className="font-serif text-[22px] leading-[1.24] text-ink">
                      <TBA value={topic.title} />
                    </h4>
                  </div>
                </div>

                {topic.summary ? (
                  <p className="text-[14px] leading-[1.72] text-muted">{topic.summary}</p>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
                  {topic.report ? (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-brand/5">
                          <FileText className="h-4 w-4 text-brand" strokeWidth={1.8} aria-hidden />
                        </span>
                        <span className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-medium text-ink">Chair Report</span>
                          <span className="text-[11px] tracking-[0.05em] text-faint">PDF</span>
                        </span>
                      </div>
                      {/*
                        download + target 둘 다 준다. `download`만 있으면 그 속성을
                        무시하거나 막는 환경(iOS Safari, 다운로드가 차단된 관리
                        프로필 등)에서 클릭해도 아무 일이 안 일어난다 — 그 경우
                        새 탭에서 PDF가 열려 최소한 읽고 저장할 수는 있게.
                      */}
                      <a
                        href={fileHref(topic.report)}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${topic.title} 의장 보고서 PDF 내려받기`}
                        className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-brand/35 px-4 text-[12px] font-medium uppercase tracking-[0.1em] text-brand transition-colors hover:border-brand hover:bg-brand hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden />
                        <TextRoll>Download</TextRoll>
                      </a>
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-wash">
                        <FileText className="h-4 w-4 text-faint" strokeWidth={1.8} aria-hidden />
                      </span>
                      <span className="text-[13px] text-faint">
                        Chair report — available September
                      </span>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
