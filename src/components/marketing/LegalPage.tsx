import { format } from 'date-fns';
import { site } from '@/config/site';

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

// Shared layout for Terms, Privacy and Refund pages: title, date, contents list, sections
export default function LegalPage({ title, intro, sections }: { title: string; intro: React.ReactNode; sections: LegalSection[] }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm text-white/50">Last updated: {format(new Date(site.legalLastUpdated), 'MMMM d, yyyy')}</p>
      <div className="legal-prose mt-8">{intro}</div>

      <nav aria-label="On this page" className="mt-10 rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Contents</p>
        <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-white/70 hover:text-[#A89CFF]">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((s, i) => (
        <section key={s.id} id={s.id} className="mt-10 scroll-mt-24">
          <h2 className="font-display text-xl font-semibold text-white">
            {i + 1}. {s.title}
          </h2>
          <div className="legal-prose mt-3">{s.body}</div>
        </section>
      ))}
    </article>
  );
}
