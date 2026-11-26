import { useDraggable, useDropLine } from '@platejs/dnd'
import { GripVertical } from 'lucide-react'
import type { PlateElementProps, RenderNodeWrapper } from 'platejs/react'
import type { ReactNode } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useTranslation } from 'react-i18next'
import { cn, Show } from '../../ui-kit'

/**
 * Drag to move (decided 2026-11-25): each top-level block of an editable text has a
 * grey handle on its left under the pointer (the part titles' hover); a line shows
 * where it will land.
 */
export function Draggable({ editor, path }: Parameters<RenderNodeWrapper>[0]) {
  if (editor.dom.readOnly || path.length !== 1) return
  return (props: PlateElementProps) => <Block {...props} />
}

/**
 * The drag manager around a text. react-dnd shares one across the page, so several
 * texts can each have theirs.
 */
export function DragArea({ children }: { children: ReactNode }) {
  return <DndProvider backend={HTML5Backend}>{children}</DndProvider>
}
function Block({ children, element }: PlateElementProps) {
  const { t } = useTranslation('rich-text')
  const { isDragging, nodeRef, previewRef, handleRef } = useDraggable({
    element,
  })
  const { dropLine } = useDropLine({ id: element.id as string })
  return (
    <div className={cn('group/block relative', isDragging && 'opacity-50')}>
      <div
        ref={handleRef}
        contentEditable={false}
        role="button"
        aria-label={t('drag')}
        title={t('drag')}
        className="absolute -start-6 top-0 flex h-[1lh] w-5 cursor-grab items-center justify-center rounded-[var(--field-radius)] text-muted opacity-0 select-none group-hover/block:opacity-100 hover:bg-default"
      >
        <GripVertical size={14} />
      </div>
      <div ref={previewRef} className="absolute hidden" />
      <div ref={nodeRef}>
        {children}
        <span contentEditable={false}>
          <Show as="span" when={dropLine === 'top' || dropLine === 'bottom'}>
            <span
              className={cn(
                'absolute inset-x-0 h-0.5 bg-primary',
                dropLine === 'top' ? '-top-[9px]' : '-bottom-[9px]',
              )}
            />
          </Show>
        </span>
      </div>
    </div>
  )
}
