import { useSummary } from '@/api/queries'
import { ErrorCard, LoadingCard } from '@/components/status'
import { Card } from '@/components/ui/card'
import { PageChip } from '@/components/viewer'
import { useLang } from '@/i18n'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="gap-0 px-4 py-4 text-base sm:px-[22px] sm:py-5">
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      {children}
    </Card>
  )
}

export function SummaryView({ lectureId }: { lectureId: string }) {
  const { lang, t } = useLang()
  const summary = useSummary(lectureId)
  if (summary.isPending) return <LoadingCard text={t('loadingSum')} />
  if (summary.isError) return <ErrorCard error={summary.error} />
  const s = summary.data

  return (
    <div className="flex flex-col gap-3.5">
      <Section title={t('overview')}>
        <div>{lang === 'th' ? s.overview_th : s.overview_en}</div>
      </Section>
      {s.sections.map((sec, i) => (
        <Section key={i} title={lang === 'th' ? sec.title_th : sec.title_en}>
          <div>
            {sec.pages.map((p) => (
              <PageChip key={p} page={p} />
            ))}
          </div>
          <ul className="mt-1.5 list-disc pl-5">
            {(lang === 'th' ? sec.points_th : sec.points_en).map((point, j) => (
              <li key={j}>{point}</li>
            ))}
          </ul>
        </Section>
      ))}
      {s.key_terms && s.key_terms.length > 0 && (
        <Section title={t('terms')}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[15px]">
              <tbody>
                {s.key_terms.map((k, i) => (
                  <tr key={i} className="border-t align-top">
                    <td className="px-1.5 py-2 font-semibold">{k.term}</td>
                    <td className="px-1.5 py-2">{lang === 'th' ? k.meaning_th : k.meaning_en}</td>
                    <td className="w-[1%] whitespace-nowrap px-1.5 py-2 text-right">
                      <PageChip page={k.page} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  )
}
