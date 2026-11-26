import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ApiError } from '@/api/client'
import { useLecture } from '@/api/queries'
import { AppHeader } from '@/components/AppHeader'
import { ErrorCard, LoadingCard } from '@/components/status'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PdfViewer, useViewerState, ViewerProvider } from '@/components/viewer'
import { useLang } from '@/i18n'
import { lastLecture } from '@/lib/lastLecture'
import { SummaryView } from './SummaryView'

const TABS = ['summary', 'quiz', 'cards'] as const
type Tab = (typeof TABS)[number]
const isTab = (v: string | null): v is Tab => TABS.includes(v as Tab)

export function LecturePage() {
  const { id = '' } = useParams()
  const { t } = useLang()
  const [params, setParams] = useSearchParams()
  const tab: Tab = isTab(params.get('tab')) ? (params.get('tab') as Tab) : 'summary'
  const lecture = useLecture(id)
  const viewer = useViewerState()

  useEffect(() => {
    if (lecture.data) lastLecture.set({ id: lecture.data.id, filename: lecture.data.filename })
    if (lecture.error instanceof ApiError && lecture.error.status === 404) lastLecture.clear()
  }, [lecture.data, lecture.error])

  if (lecture.isPending) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-[1400px] p-3.5 sm:p-6">
          <LoadingCard text="…" />
        </main>
      </>
    )
  }
  if (lecture.isError) {
    const notFound = lecture.error instanceof ApiError && lecture.error.status === 404
    return (
      <>
        <AppHeader />
        <main className="mx-auto flex max-w-[640px] flex-col gap-3 p-3.5 sm:p-6">
          <ErrorCard error={notFound ? t('notFound') : lecture.error} />
          <Link to="/" className="text-primary underline-offset-4 hover:underline">
            {t('newUpload')}
          </Link>
        </main>
      </>
    )
  }

  const info = lecture.data
  return (
    <ViewerProvider openPage={viewer.openPage}>
      <AppHeader filename={info.filename} />
      <main className="mx-auto grid max-w-[1400px] items-start gap-6 p-3.5 sm:p-6 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <Tabs
          value={tab}
          onValueChange={(v) => setParams(v === 'summary' ? {} : { tab: v }, { replace: true })}
          className="min-w-0 gap-5"
        >
          <TabsList variant="line" className="w-full justify-start border-b">
            <TabsTrigger value="summary" className="flex-none px-4 text-base after:bg-primary">{t('tabSummary')}</TabsTrigger>
            <TabsTrigger value="quiz" className="flex-none px-4 text-base after:bg-primary">{t('tabQuiz')}</TabsTrigger>
            <TabsTrigger value="cards" className="flex-none px-4 text-base after:bg-primary">{t('tabCards')}</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="text-base">
            <SummaryView lectureId={info.id} />
          </TabsContent>
          {/* Quiz and flashcards move over in step 4. */}
          <TabsContent value="quiz" />
          <TabsContent value="cards" />
        </Tabs>
        <PdfViewer
          lectureId={info.id}
          filename={info.filename}
          page={viewer.page}
          hidden={viewer.hidden}
          onToggle={viewer.toggleHidden}
        />
      </main>
    </ViewerProvider>
  )
}
