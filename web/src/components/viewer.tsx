import { createContext, useContext, useState, type ReactNode } from 'react'
import { pdfUrl } from '@/api/client'
import { useLang } from '@/i18n'
import { cn } from '@/lib/utils'

type Viewer = { openPage: (page: number) => void }
const ViewerContext = createContext<Viewer | null>(null)

/** Owns which slide page is shown and whether the viewer is hidden. Page chips anywhere below call openPage. */
export function useViewerState() {
  const [page, setPage] = useState<number | null>(null)
  const [hidden, setHidden] = useState(false)
  return {
    page,
    hidden,
    toggleHidden: () => setHidden((h) => !h),
    openPage: (p: number) => {
      setPage(p)
      setHidden(false)
    },
  }
}

export function ViewerProvider({ openPage, children }: Viewer & { children: ReactNode }) {
  return <ViewerContext value={{ openPage }}>{children}</ViewerContext>
}

export function PageChip({ page }: { page: number }) {
  const viewer = useContext(ViewerContext)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation() // chips sit inside flippable flashcards
        viewer?.openPage(page)
      }}
      className="mr-1 my-0.5 inline-block whitespace-nowrap rounded-full bg-secondary px-2.5 text-[13px] text-foreground hover:bg-primary hover:text-primary-foreground"
    >
      p.{page}
    </button>
  )
}

export function PdfViewer({
  lectureId,
  filename,
  page,
  hidden,
  onToggle,
}: {
  lectureId: string
  filename: string
  page: number | null
  hidden: boolean
  onToggle: () => void
}) {
  const { t } = useLang()
  return (
    <aside
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border bg-card',
        !hidden && 'h-[70vh] min-[900px]:sticky min-[900px]:top-20 min-[900px]:h-[calc(100vh-110px)]',
      )}
    >
      <div className="flex items-center gap-2 border-b px-3.5 py-2 text-sm text-muted-foreground">
        <span className="flex-1 truncate">{page ? `${filename} · p.${page}` : t('viewerHint')}</span>
        <button type="button" onClick={onToggle} className="rounded-md border px-2.5 text-[13px]">
          {hidden ? t('showViewer') : t('hideViewer')}
        </button>
      </div>
      {/* key forces a reload: browsers ignore a #page change on an already-loaded PDF */}
      {!hidden && <iframe key={page ?? 0} title="Lecture slides" src={pdfUrl(lectureId, page ?? undefined)} className="w-full flex-1 border-0" />}
    </aside>
  )
}
