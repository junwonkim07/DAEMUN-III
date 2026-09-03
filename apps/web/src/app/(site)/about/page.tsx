import { PastVideos } from "@/components/site/past-videos";
import { SectionHead } from "@/components/site/section";

export const metadata = { title: "About" };

const ABOUT =
  "First held in November 2024, DAEMUN is a student-led Model United Nations (MUN) where students explore various issues in the international community and seek practical and implementable solutions. Through discussions and collaboration, DAEMUN provides participants with opportunities to develop critical thinking skills, diplomatic communication abilities, and global leadership. We aim to bring together students from diverse backgrounds and perspectives to discuss global issues in depth, creating meaningful change for a better future based on respect and cooperation.";

export default function AboutPage() {
  return (
    <>
      {/* Dark photo band — same treatment as the committee intro */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/about-bg.jpg)" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-navy/80" aria-hidden />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-20">
          <div className="flex flex-col gap-5">
            <div className="text-[12px] font-roman uppercase tracking-widest text-gold-soft">
              DAEMUN III / About
            </div>
            <h1 className="font-custom text-[40px] uppercase leading-[1.05] text-white sm:text-[54px]">
              About
              <br />
              DAEMUN
            </h1>
            <div className="h-px w-11 bg-white/30" aria-hidden />
            <div className="text-[13px] text-white/60">First held in November 2024</div>
          </div>

          <p className="max-w-2xl text-[17px] leading-[1.75] text-white/90 sm:text-[19px]">
            {ABOUT}
          </p>
        </div>
      </section>

      {/* Past conference films */}
      <section id="videos" className="scroll-mt-16 bg-white">
        <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20">
          <SectionHead
            kicker="Watch"
            title="Past MUN videos"
            aside="Conference films from previous sessions"
          />
          <div className="mt-8">
            <PastVideos />
          </div>
        </div>
      </section>
    </>
  );
}
