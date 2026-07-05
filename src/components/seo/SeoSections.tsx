// Server-rendered SEO/GEO content blocks shared by the entity pages: an intro
// paragraph, a question/answer FAQ section (with matching FAQPage JSON-LD),
// and an internal-links section. These render into the static HTML so search
// engines and AI crawlers always see unique, entity-specific content.
//
// All blocks are collapsed by default using native <details>: visually they
// take one line, but the content remains in the DOM, fully indexed (Google
// gives collapsed accordion content full weight under mobile-first indexing),
// and user-reachable with a click — which FAQ rich results require. Do NOT
// switch these to display:none/visibility:hidden: hidden text and hidden
// links are devalued and can be treated as spam (cloaking).

import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { faqPageSchema, FaqItem } from '@/lib/schema';
import type { Locale } from '@/lib/seo';

/** Collapsed one-line intro; expands to the entity summary paragraph. */
export function SeoIntro({ label = 'About', text }: { label?: string; text?: string | null }) {
  if (!text) return null;
  return (
    <details className="border-b border-gray-100">
      <summary className="cursor-pointer select-none px-4 py-2 text-[12px] font-medium text-gray-400 transition-colors hover:text-gray-600">
        {label}
      </summary>
      <p className="px-4 pb-3 text-[13px] leading-relaxed text-gray-600">{text}</p>
    </details>
  );
}

function CollapsibleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="mx-3 mb-3 rounded-xl border border-gray-100 bg-white shadow-sm">
      <summary className="cursor-pointer select-none px-4 py-3 text-[13px] font-semibold text-gray-500 transition-colors hover:text-gray-700">
        {title}
      </summary>
      {children}
    </details>
  );
}

export function FaqSection({ title, items, locale = 'en' }: { title?: string; items: FaqItem[]; locale?: Locale }) {
  const valid = items.filter((i) => i.question && i.answer);
  if (valid.length === 0) return null;
  return (
    <>
      <JsonLd data={faqPageSchema(valid, locale)} />
      <CollapsibleCard title={title ?? (locale === 'ar' ? 'الأسئلة الشائعة' : 'Frequently Asked Questions')}>
        <div className="px-4 pb-3">
          {valid.map((item) => (
            <div key={item.question} className="border-b border-gray-50 py-2.5 last:border-b-0">
              <h3 className="text-[13px] font-semibold text-gray-800">{item.question}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-gray-600">{item.answer}</p>
            </div>
          ))}
        </div>
      </CollapsibleCard>
    </>
  );
}

export interface SeoLink {
  href: string;
  label: string;
}

export function SeoLinksSection({ title, links }: { title: string; links: SeoLink[] }) {
  const valid = links.filter((l) => l.href && l.label);
  if (valid.length === 0) return null;
  return (
    <CollapsibleCard title={title}>
      <nav aria-label={title}>
        <ul className="flex flex-wrap gap-2 px-4 pb-3">
          {valid.map((link) => (
            <li key={`${link.href}-${link.label}`}>
              <Link
                href={link.href}
                className="inline-block rounded-full border border-gray-200 px-3 py-1 text-[12px] font-medium text-gray-700 transition-colors hover:border-orange-300 hover:text-orange-600"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </CollapsibleCard>
  );
}
