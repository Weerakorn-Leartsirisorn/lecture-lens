import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/segmented'
import { useLang, type Lang } from '@/i18n'

export function AppHeader({ filename }: { filename?: string }) {
  const { lang, setLang, t } = useLang()
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-card px-3.5 py-3 sm:flex-nowrap sm:px-6">
      <Link to="/" className="text-xl font-bold tracking-tight">
        Lecture<span className="text-primary">Lens</span>
      </Link>
      <div className="order-3 basis-full truncate text-sm text-muted-foreground sm:order-none sm:basis-auto sm:flex-1">
        {filename}
      </div>
      <div className="ml-auto flex items-center gap-3 sm:ml-0">
        <Segmented
          label="Language"
          value={lang}
          options={[{ value: 'th', label: 'ไทย' }, { value: 'en', label: 'EN' }]}
          onChange={(v) => setLang(v as Lang)}
        />
        {filename && (
          <Button asChild variant="outline">
            <Link to="/">{t('newUpload')}</Link>
          </Button>
        )}
      </div>
    </header>
  )
}
