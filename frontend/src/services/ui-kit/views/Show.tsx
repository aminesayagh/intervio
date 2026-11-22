import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'

/** The value once it made the content show: never empty, false, 0 or ''. */
type Truthy<W> = Exclude<W, null | undefined | false | 0 | ''>

/** Content, or a function of the value that made it show (narrowed, never empty). */
type Content<W> = ReactNode | ((value: Truthy<W>) => ReactNode)

type Box = {
  /** The element around the content: a span inside a line of text, a div otherwise. */
  as?: 'div' | 'span'
  className?: string
}

const render = <W,>(content: Content<W>, value: W) =>
  typeof content === 'function' ? content(value as Truthy<W>) : content

/**
 * Fades content in and out quickly when it appears or changes, instead of a brusque
 * jump; no animation when the person asked their system to reduce motion.
 */
function Appear({
  id,
  children,
  as = 'div',
  className,
}: Box & { id: string | number | null; children: ReactNode }) {
  const reduce = useReducedMotion()
  const Element = as === 'span' ? motion.span : motion.div
  return (
    <AnimatePresence initial={false} mode="wait">
      {id !== null && (
        <Element
          key={id}
          initial={{ opacity: 0, y: reduce ? 0 : -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.1 } }}
          transition={{ duration: reduce ? 0 : 0.15, ease: 'easeOut' }}
          className={className}
        >
          {children}
        </Element>
      )}
    </AnimatePresence>
  )
}

/**
 * Shows its children when `when` is true (or set), the fallback otherwise, with a
 * short fade. `<Show when={error}>{(message) => <p>{message}</p>}</Show>`
 */
export function Show<W>({
  when,
  fallback = null,
  children,
  ...box
}: Box & { when: W; fallback?: ReactNode; children: Content<W> }) {
  const shown = Boolean(when)
  const content = shown ? render(children, when) : fallback
  return (
    <Appear
      id={content == null || content === false ? null : shown ? 1 : 0}
      {...box}
    >
      {content}
    </Appear>
  )
}

type MatchProps<W> = { when: W; children: Content<W> }

/** One case of a Switch: shown when it is the first whose `when` is true. */
export function Match<W>(props: MatchProps<W>): ReactNode {
  void props // read by Switch; a Match renders nothing by itself
  return null
}

/**
 * Shows the first Match whose `when` is true (the fallback when none is), with a short
 * fade between cases: for states such as loading, failed, unavailable, shown.
 */
export function Switch({
  fallback = null,
  children,
  ...box
}: Box & { fallback?: ReactNode; children: ReactNode }) {
  const cases = Children.toArray(children).filter(
    (child): child is ReactElement<MatchProps<unknown>> =>
      isValidElement(child) && child.type === Match,
  )
  const index = cases.findIndex((match) => Boolean(match.props.when))
  const content =
    index >= 0
      ? render(cases[index].props.children, cases[index].props.when)
      : fallback
  return (
    <Appear id={content == null || content === false ? null : index} {...box}>
      {content}
    </Appear>
  )
}

/**
 * Shows the view for the current option of a value, like a `switch (value)` with one
 * `case` per option: `<Variant value={kind} views={{ edit: () => <Field />, read: () =>
 * <Text /> }} />`. Each option is its own animation key, so when the option changes
 * the old view fades out before the new one fades in (the same fade as Show). Views
 * are functions, so only the chosen one is built; an option without a view shows the
 * fallback.
 *
 * Show: one condition. Switch and Match: if, else if, else. Variant: one value, one
 * view per option.
 */
export function Variant<K extends string>({
  value,
  views,
  fallback = null,
  ...box
}: Box & {
  value: K
  views: Partial<Record<K, () => ReactNode>>
  fallback?: ReactNode
}) {
  const view = views[value]
  const content = view ? view() : fallback
  return (
    <Appear
      id={
        content == null || content === false
          ? null
          : view
            ? value
            : '\0fallback'
      }
      {...box}
    >
      {content}
    </Appear>
  )
}
