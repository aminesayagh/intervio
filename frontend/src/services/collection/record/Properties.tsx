import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, cn, Show, Variant } from '../../ui-kit'
import type { CollectionDefinition, PanelDefinition } from '../definition'
import type { ReportInvalid, SaveChange } from '../types'
import { hasNoValue } from '../values/still'
import { ValueField } from '../values/ValueField'
import { WakeOnReach } from '../values/WakeOnReach'

/**
 * A record's properties (the rich texts aside), each value under its name, then the
 * line that ends them (decision 152). The line folds them into one row of values
 * without their names, the empty ones left out (decision 155).
 */
export function Properties<T, C>({
  definition,
  panel,
  record,
  canEdit,
  save,
  report,
  layout,
}: {
  definition: CollectionDefinition<T, C>
  panel: PanelDefinition<T>
  record: T
  canEdit: (record: T, id: string) => boolean
  save: SaveChange<T>
  report: ReportInvalid<T>
  layout: 'panel' | 'page'
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const [folded, setFolded] = useState(false)
  const properties = panel.properties.filter(
    (property) => property.field?.type !== 'richText',
  )
  type Property = (typeof properties)[number]

  const valueOf = (property: Property, look: 'cell' | 'panel' = 'panel') => (
    <WakeOnReach>
      <ValueField
        record={record}
        field={property.field}
        allowed={canEdit(record, property.id)}
        read={property.value}
        label={t(property.label)}
        namespace={definition.i18n.namespace}
        save={(patch) => save(record, patch, { label: t(property.label) })}
        onInvalid={(reason) => report(record, t(property.label), reason)}
        look={look}
      />
    </WakeOnReach>
  )
  // Folded, a value with nothing set is left out (a checkbox always has one).
  const set = (property: Property) =>
    !property.field ||
    property.field.type === 'checkbox' ||
    !hasNoValue(property.field, record)

  return (
    <>
      <Show
        when={!folded}
        fallback={
          <div className="flex flex-wrap items-center gap-2">
            {properties.filter(set).map((property) => (
              <div
                key={property.id}
                title={t(property.label)}
                className="max-w-full"
              >
                {/* Files and the picture as in the table: a count, a thumbnail. */}
                {valueOf(
                  property,
                  property.field?.type === 'file' ||
                    property.field?.type === 'avatar'
                    ? 'cell'
                    : 'panel',
                )}
              </div>
            ))}
          </div>
        }
      >
        <dl className="grid grid-cols-[176px_minmax(0,1fr)] items-start gap-x-4 gap-y-3">
          {properties.map((property) => (
            <div key={property.id} className="contents">
              <dt className="grid min-h-8 content-center text-muted">
                {t(property.label)}
              </dt>
              <dd className="grid min-h-8 min-w-0 content-center">
                {valueOf(property)}
              </dd>
            </div>
          ))}
        </dl>
      </Show>

      {/* The whole line folds: no background, the line and chevrons darken. In the
      panel it runs across it, as the top bar's does. */}
      <Button
        look="ghost"
        size="sm"
        aria-label={t(
          folded ? 'collection:panel.unfold' : 'collection:panel.fold',
        )}
        aria-expanded={!folded}
        onPress={() => setFolded(!folded)}
        className={cn(
          'group/fold h-6 w-full gap-2 rounded-none px-1 text-muted data-[hovered]:bg-transparent data-[hovered]:text-foreground',
          layout === 'panel' && '-ms-8 -me-6 w-auto ps-6',
        )}
      >
        <Variant
          as="span"
          className="flex"
          value={folded ? 'folded' : 'open'}
          views={{
            folded: () => <ChevronsUpDown size={14} />,
            open: () => <ChevronsDownUp size={14} />,
          }}
        />
        <span className="flex-1 border-t border-border group-data-[hovered]/fold:border-foreground/40" />
      </Button>
    </>
  )
}
