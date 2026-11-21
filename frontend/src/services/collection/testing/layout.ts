/**
 * jsdom has no layout (spec 15.2). These stubs give the screen a width, so the layout
 * mode can be chosen, and give elements a size, so the virtualizer draws items.
 */

type Listener = (event: { matches: boolean }) => void
const queries = new Map<string, Set<Listener>>()

function evaluate(query: string, width: number) {
  const min = query.match(/min-width:\s*(\d+)px/)
  const max = query.match(/max-width:\s*(\d+)px/)
  return (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]))
}

/** Sets the screen width and tells every media query listener that may have changed. */
export function setScreenWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  })
  window.matchMedia = (query: string) => {
    const listeners = queries.get(query) ?? new Set<Listener>()
    queries.set(query, listeners)
    return {
      matches: evaluate(query, window.innerWidth),
      media: query,
      onchange: null,
      addEventListener: (_: string, listener: Listener) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) =>
        listeners.delete(listener),
      addListener: (listener: Listener) => listeners.add(listener),
      removeListener: (listener: Listener) => listeners.delete(listener),
      dispatchEvent: () => true,
    } as unknown as MediaQueryList
  }
  for (const [query, listeners] of queries)
    listeners.forEach((listener) =>
      listener({ matches: evaluate(query, width) }),
    )
}

/**
 * Gives every element a size: list items (the virtualizer marks them with data-index)
 * get the item height, anything else the scroll area's size.
 */
export function stubElementSizes({
  width = 1128,
  height = 800,
  itemHeight = 52,
} = {}) {
  const size = (element: Element) =>
    element.hasAttribute('data-index')
      ? { width, height: itemHeight }
      : { width, height }
  Element.prototype.getBoundingClientRect = function () {
    const { width: w, height: h } = size(this)
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: w,
      bottom: h,
      width: w,
      height: h,
      toJSON: () => ({}),
    }
  }
  for (const property of ['offsetHeight', 'clientHeight'] as const)
    Object.defineProperty(HTMLElement.prototype, property, {
      configurable: true,
      get() {
        return size(this).height
      },
    })
  for (const property of ['offsetWidth', 'clientWidth'] as const)
    Object.defineProperty(HTMLElement.prototype, property, {
      configurable: true,
      get() {
        return size(this).width
      },
    })
}
