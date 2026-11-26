import { Card } from '@/components/ui/card'

export function Spinner() {
  return (
    <span
      aria-hidden
      className="mr-2 inline-block size-3.5 animate-spin rounded-full border-2 border-border border-t-primary align-[-2px] motion-reduce:animate-none"
    />
  )
}

export function LoadingCard({ text }: { text: string }) {
  return (
    <Card className="px-5 py-5 text-muted-foreground">
      <div>
        <Spinner />
        {text}
      </div>
    </Card>
  )
}

export function ErrorCard({ error }: { error: unknown }) {
  return (
    <Card role="alert" className="px-5 py-5 text-destructive">
      {error instanceof Error ? error.message : String(error)}
    </Card>
  )
}
