import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { api, type QuizRequest, type QuizResponse } from '@/api/client'
import { EvidenceQuote } from '@/components/evidence'
import { ErrorCard, LoadingCard } from '@/components/status'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Segmented } from '@/components/segmented'
import { useLang, type Lang } from '@/i18n'
import { cn } from '@/lib/utils'

type Options = Pick<QuizRequest, 'n' | 'difficulty'>
type Session = { quiz: QuizResponse; answers: Record<number, number> }

const DEFAULT_OPTIONS: Options = { n: 10, difficulty: 'medium' }
const MISTAKES_N = 5 // size of a "practice my mistakes" set

/** Score, progress and the pages of wrong answers, derived from a session (never stored). */
export function scoreOf({ quiz, answers }: Session) {
  const answered = Object.keys(answers).length
  const total = quiz.questions.length
  const correct = quiz.questions.filter((q, i) => answers[i] === q.answer_index).length
  const wrongPages = [
    ...new Set(quiz.questions.filter((q, i) => i in answers && answers[i] !== q.answer_index).map((q) => q.source_page)),
  ]
  return { answered, total, correct, wrongPages, done: answered === total }
}

export function QuizView({ lectureId }: { lectureId: string }) {
  const { lang, t } = useLang()
  // One quiz and one set of options per language, like the original app.
  const [sessions, setSessions] = useState<Partial<Record<Lang, Session>>>({})
  const [options, setOptions] = useState<Record<Lang, Options>>({ th: DEFAULT_OPTIONS, en: DEFAULT_OPTIONS })
  const generate = useMutation({
    mutationFn: (req: QuizRequest) => api.quiz(lectureId, req),
    onSuccess: (quiz, req) => setSessions((s) => ({ ...s, [req.lang]: { quiz, answers: {} } })),
  })

  const opts = options[lang]
  const session = sessions[lang]
  const make = (focus_pages: number[] = []) =>
    generate.mutate({ lang, n: focus_pages.length ? MISTAKES_N : opts.n, difficulty: opts.difficulty, focus_pages })

  if (generate.isPending && generate.variables?.lang === lang) return <LoadingCard text={t('loadingQuiz')} />

  if (!session) {
    const setOpt = (patch: Partial<Options>) => setOptions((o) => ({ ...o, [lang]: { ...o[lang], ...patch } }))
    return (
      <div className="flex flex-col gap-3.5">
        {generate.isError && generate.variables?.lang === lang && <ErrorCard error={generate.error} />}
        <Card className="gap-4 px-4 py-4 text-base sm:px-[22px] sm:py-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-muted-foreground">{t('numQ')}</span>
            <Segmented
              label={t('numQ')}
              value={String(opts.n)}
              options={[10, 20, 30].map((n) => ({ value: String(n), label: String(n) }))}
              onChange={(v) => setOpt({ n: Number(v) })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-muted-foreground">{t('diffQ')}</span>
            <Segmented
              label={t('diffQ')}
              value={opts.difficulty}
              options={(['easy', 'medium', 'hard'] as const).map((d) => ({ value: d, label: t(`diff_${d}`) }))}
              onChange={(v) => setOpt({ difficulty: v as Options['difficulty'] })}
            />
          </div>
          <div>
            <Button size="lg" className="h-10 px-[18px] text-base font-semibold" onClick={() => make()}>
              {t('makeQuiz')}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const { quiz, answers } = session
  const score = scoreOf(session)
  const answer = (i: number, choice: number) =>
    setSessions((s) => ({ ...s, [lang]: { quiz, answers: { ...answers, [i]: choice } } }))

  return (
    <div className="flex flex-col gap-3.5">
      {generate.isError && generate.variables?.lang === lang && <ErrorCard error={generate.error} />}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-xl font-bold">
          {t('score')} {score.correct}/{score.total}
        </span>
        <span className="text-muted-foreground">
          {quiz.stats.verified}/{quiz.stats.total} {t('verified')}
        </span>
        <span className="flex-1" />
        {score.done && score.wrongPages.length > 0 && (
          <Button className="h-10 px-[18px] text-base font-semibold" onClick={() => make(score.wrongPages)}>
            {t('retry')}
          </Button>
        )}
        <Button
          variant="outline"
          className="h-10 px-[18px] text-base font-semibold"
          onClick={() => setSessions((s) => ({ ...s, [lang]: undefined }))}
        >
          {t('newQuiz')}
        </Button>
      </div>
      {quiz.questions.map((q, i) => {
        const picked = answers[i]
        const locked = picked !== undefined
        return (
          <Card key={i} className="gap-0 px-4 py-4 text-base sm:px-[22px] sm:py-5">
            <div className="mb-1.5 font-semibold">
              {i + 1}. {q.question}
            </div>
            <div className="mt-2.5 grid gap-2">
              {q.choices.map((c, j) => (
                <button
                  key={j}
                  type="button"
                  disabled={locked}
                  onClick={() => answer(i, j)}
                  className={cn(
                    'rounded-[10px] border bg-background px-3.5 py-2.5 text-left',
                    !locked && 'hover:border-foreground',
                    locked && j === q.answer_index && 'border-ok bg-ok-bg',
                    locked && j === picked && j !== q.answer_index && 'border-destructive bg-bad-bg',
                  )}
                >
                  {'ABCD'[j]}. {c}
                </button>
              ))}
            </div>
            {locked && (
              <div className="mt-3 border-t pt-3 text-[15px]">
                <b>{t('why')}:</b> {q.explanation}
                <EvidenceQuote page={q.source_page} evidence={q.evidence} verified={q.verified} label={t('evidence')} />
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
