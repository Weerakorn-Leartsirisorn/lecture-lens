import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { api, type FlashcardsResponse } from '@/api/client'
import { EvidenceQuote } from '@/components/evidence'
import { ErrorCard, LoadingCard } from '@/components/status'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useLang, type Lang } from '@/i18n'
import { cn } from '@/lib/utils'

const DECK_SIZE = 15
type Deck = { cards: FlashcardsResponse; index: number; flipped: boolean }

const FACE =
  'col-start-1 row-start-1 flex h-80 overflow-y-auto rounded-[14px] border bg-card px-[22px] py-5 text-center leading-[1.7] shadow-sm [backface-visibility:hidden]'

export function CardsView({ lectureId }: { lectureId: string }) {
  const { lang, t } = useLang()
  // One deck per language, each remembering its position, like the original app.
  const [decks, setDecks] = useState<Partial<Record<Lang, Deck>>>({})
  const cardRef = useRef<HTMLDivElement>(null)
  const generate = useMutation({
    mutationFn: (l: Lang) => api.flashcards(lectureId, { lang: l, n: DECK_SIZE }),
    onSuccess: (cards, l) => setDecks((d) => ({ ...d, [l]: { cards, index: 0, flipped: false } })),
  })
  const deck = decks[lang]

  const update = (patch: Partial<Deck>) => setDecks((d) => (d[lang] ? { ...d, [lang]: { ...d[lang], ...patch } } : d))
  const go = (delta: number) => {
    if (!deck) return
    const index = deck.index + delta
    if (index < 0 || index >= deck.cards.cards.length) return
    update({ index, flipped: false })
    cardRef.current?.focus({ preventScroll: true })
  }
  const flip = () => deck && update({ flipped: !deck.flipped })

  // Arrow keys move through the deck whenever the card is on screen, wherever focus is (except text
  // fields). Visibility is read at key time, so a hidden tab never reacts, even mid tab switch.
  const goRef = useRef(go)
  goRef.current = go
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!cardRef.current?.checkVisibility()) return
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'ArrowLeft') goRef.current(-1)
      else if (e.key === 'ArrowRight') goRef.current(1)
      else return
      e.preventDefault()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (generate.isPending && generate.variables === lang) return <LoadingCard text={t('loadingCards')} />
  if (!deck) {
    return (
      <div className="flex flex-col gap-3.5">
        {generate.isError && generate.variables === lang && <ErrorCard error={generate.error} />}
        <Card className="px-4 py-4 sm:px-[22px] sm:py-5">
          <div>
            <Button size="lg" className="h-10 px-[18px] text-base font-semibold" onClick={() => generate.mutate(lang)}>
              {t('makeCards')}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const { cards, index, flipped } = deck
  const card = cards.cards[index]
  const count = cards.cards.length
  return (
    <div className="flex flex-col gap-4">
      <div className="text-muted-foreground">
        {t('flipHint')} · {cards.stats.verified}/{cards.stats.total} {t('verified')}
      </div>
      <div className="flex justify-center">
        <div className="flex w-full max-w-[560px] flex-col gap-3">
          <div
            ref={cardRef}
            role="button"
            tabIndex={0}
            aria-label={`${index + 1} / ${count}`}
            aria-pressed={flipped}
            onClick={flip}
            onKeyDown={(e) => {
              if (!e.currentTarget.checkVisibility()) return // focus can linger on a hidden tab
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                flip()
              }
            }}
            className="h-80 cursor-pointer rounded-[14px] outline-offset-2 [perspective:900px] focus-visible:outline-2 focus-visible:outline-primary"
          >
            <div
              className={cn(
                'grid h-80 transition-transform duration-[450ms] [transform-style:preserve-3d] motion-reduce:transition-none',
                flipped && '[transform:rotateY(180deg)]',
              )}
            >
              <div className={cn(FACE, 'text-lg font-semibold')}>
                <div className="m-auto">{card.front}</div>
              </div>
              <div className={cn(FACE, 'text-[15px] [transform:rotateY(180deg)]')}>
                <div className="m-auto w-full">
                  <div>{card.back}</div>
                  <EvidenceQuote page={card.source_page} evidence={card.evidence} verified={card.verified} compactBadge />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center text-sm text-muted-foreground">
            {index + 1} / {count}
          </div>
          <div aria-hidden className="h-1 overflow-hidden rounded-full bg-border">
            <i
              className="block h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${(((index + 1) / count) * 100).toFixed(1)}%` }}
            />
          </div>
          <div className="flex justify-between gap-2.5">
            <Button variant="outline" className="h-10 flex-1 text-base font-semibold sm:max-w-40 sm:min-w-30 sm:flex-none" disabled={index === 0} onClick={() => go(-1)}>
              {t('prev')}
            </Button>
            <Button className="h-10 flex-1 text-base font-semibold sm:max-w-40 sm:min-w-30 sm:flex-none" disabled={index === count - 1} onClick={() => go(1)}>
              {t('next')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
