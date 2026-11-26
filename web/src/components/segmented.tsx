import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

/** Pill-shaped single choice (language, question count, difficulty), matching the original .seg control. */
export function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      className="overflow-hidden rounded-full"
      value={value}
      onValueChange={(v) => v && onChange(v)}
      aria-label={label}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="px-3.5 data-[state=on]:bg-foreground data-[state=on]:text-background"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
