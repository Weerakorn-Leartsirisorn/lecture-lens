import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { api } from '@/api/client'
import { lectureKey } from '@/api/queries'
import { AppHeader } from '@/components/AppHeader'
import { Spinner } from '@/components/status'
import { Button } from '@/components/ui/button'
import { useLang } from '@/i18n'
import { lastLecture } from '@/lib/lastLecture'
import { cn } from '@/lib/utils'

export function UploadPage() {
  const { t } = useLang()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const last = lastLecture.get()

  const upload = useMutation({
    mutationFn: api.upload,
    onSuccess: (info) => {
      queryClient.setQueryData(lectureKey(info.id), info)
      navigate(`/lecture/${info.id}`)
    },
  })
  const pick = (file?: File) => file && upload.mutate(file)

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-[1400px] p-3.5 sm:p-6">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            pick(e.dataTransfer.files[0])
          }}
          className={cn(
            'mx-auto my-[4vh] max-w-[640px] rounded-[20px] border-2 border-dashed bg-card px-5 py-9 text-center shadow-sm sm:my-[8vh] sm:px-10 sm:py-14',
            dragging && 'border-primary',
          )}
        >
          <h1 className="mb-4 whitespace-pre-line text-[26px] font-bold leading-normal text-balance sm:text-[32px]">
            {t('uploadTitle')}
          </h1>
          <p className="mx-auto mb-7 max-w-[520px] whitespace-pre-line leading-[1.8] text-pretty text-muted-foreground">
            {t('uploadSub')}
          </p>
          <input
            ref={input}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <Button size="lg" className="h-11 px-5 text-base font-semibold" disabled={upload.isPending} onClick={() => input.current?.click()}>
            {t('pickFile')}
          </Button>
          <div className="mt-3.5 text-sm leading-[1.7] text-muted-foreground">{t('dragHint')}</div>
          {upload.isPending && (
            <div className="mt-4 text-[15px] text-muted-foreground">
              <Spinner />
              {t('reading')}
            </div>
          )}
          {upload.isError && (
            <div role="alert" className="mt-4 text-[15px] text-destructive">
              {t('uploadFail')}: {upload.error.message}
            </div>
          )}
          {last && !upload.isPending && (
            <div className="mt-6 text-sm">
              <Link to={`/lecture/${last.id}`} className="text-primary underline-offset-4 hover:underline">
                {t('continueLast')}: {last.filename}
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
