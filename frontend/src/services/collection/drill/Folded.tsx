import { useTranslation } from 'react-i18next'
import {
  ActionMenu,
  Button,
  Icon,
  MenuPopover,
  MenuTrigger,
  Show,
} from '../../ui-kit'

/** One thing left behind, which a click opens again: a view (a strip) or a record (a tab). */
export type Fold = { name: string; open: () => void }

/** How many folds show; older ones fold into the first, which opens a menu (decisions 128, 137). */
const SHOWN = 2

const look =
  'flex h-full w-8 shrink-0 cursor-pointer flex-col items-center gap-2 border-e border-border py-4 text-muted outline-none hover:bg-default hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground'

/**
 * Views or records left behind, each folded into a 32 px column with a ‹ and its name
 * written vertically: a strip after the sidebar, a tab before the panel. Each opens
 * its view or record again; beyond two, the first stands for the older ones and
 * opens a menu of them, newest first.
 */
export function Folds({
  folds,
  kind,
}: {
  folds: Fold[]
  /** Strips are views, tabs are records: their names say so. */
  kind: 'views' | 'records'
}) {
  const { t } = useTranslation('collection')
  const olderName = (count: number) => t(`folds.${kind}Older`, { count })
  const older = folds.length > SHOWN ? folds.slice(0, -(SHOWN - 1)) : []
  const shown = older.length ? folds.slice(-(SHOWN - 1)) : folds
  return (
    <nav aria-label={t(`folds.${kind}`)} className="flex h-full shrink-0">
      <Show when={older.length > 0} className="flex h-full">
        <MenuTrigger>
          <Button
            look="ghost"
            aria-label={olderName(older.length)}
            className={`${look} h-full rounded-none px-0`}
          >
            <Icon name="lucide/chevron-left" size={14} />
            <Name text={olderName(older.length)} />
          </Button>
          <MenuPopover minWidth={220}>
            <ActionMenu
              label={olderName(older.length)}
              actions={older
                .map((fold, index) => ({ id: String(index), label: fold.name }))
                .reverse()}
              onAction={(id) => older[Number(id)].open()}
            />
          </MenuPopover>
        </MenuTrigger>
      </Show>
      {shown.map((fold, index) => (
        <button
          key={`${index}-${fold.name}`}
          type="button"
          aria-label={t('folds.back', { name: fold.name })}
          onClick={fold.open}
          className={look}
        >
          <Icon name="lucide/chevron-left" size={14} />
          <Name text={fold.name} />
        </button>
      ))}
    </nav>
  )
}

/** The name, written top to bottom. */
function Name({ text }: { text: string }) {
  return (
    <span className="min-h-0 truncate text-xs [writing-mode:vertical-rl]">
      {text}
    </span>
  )
}
