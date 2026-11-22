/** Two or more side-by-side choices, one selected (Settings: language, theme). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="flex w-fit overflow-hidden rounded-[var(--field-radius)] border border-border"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
            className={`h-9 min-w-[112px] px-4 ${
              option.value === value
                ? 'bg-default font-medium text-foreground'
                : 'bg-surface text-muted hover:text-foreground'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
