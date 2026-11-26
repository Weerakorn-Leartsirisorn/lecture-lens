import { PageChip } from '@/components/viewer'
import { useLang } from '@/i18n'
import { cn } from '@/lib/utils'

/** The verbatim slide quote behind a question or flashcard, with its page and verification badge. */
export function EvidenceQuote({
  page,
  evidence,
  verified,
  label,
  compactBadge = false,
}: {
  page: number
  evidence: string
  verified: boolean
  label?: string
  compactBadge?: boolean
}) {
  const { t } = useLang()
  return (
    <div className="my-2 border-l-[3px] border-primary px-2.5 py-0.5 text-left text-sm text-muted-foreground">
      {label && <span className="mr-1">{label}</span>}
      <PageChip page={page} />
      {(verified || !compactBadge) && (
        <span
          className={cn(
            'ml-1.5 rounded-md px-2 py-px text-xs',
            verified ? 'bg-ok-bg text-ok' : 'bg-secondary text-muted-foreground',
          )}
        >
          {compactBadge ? '✓' : verified ? t('verified') : t('unverified')}
        </span>
      )}
      <br />“{evidence}”
    </div>
  )
}
