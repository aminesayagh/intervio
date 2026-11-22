import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

import { MotionGlobalConfig } from 'motion/react'

// Tests check what shows, not how it moves: animations end at once.
MotionGlobalConfig.skipAnimations = true

// jsdom has no ResizeObserver (HeroUI's toast measures its height with one):
// sizes never change in tests, so an observer that never calls back is enough.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

// waitFor and findBy wait up to 3 s (not 1 s): with the whole suite running at once,
// a save in an interface test can take longer than 1 s without anything being wrong.
configure({ asyncUtilTimeout: 3000 })

// jsdom has no IntersectionObserver (React Aria's TableLoadMoreItem watches the end
// of the list with one). This one never fires by itself: a test that scrolls to the
// end calls reachListEnd() (testing/layout.ts), which tells every observer.
const intersectionObservers = new Set<{
  callback: IntersectionObserverCallback
  observer: IntersectionObserver
  targets: Set<Element>
}>()
globalThis.IntersectionObserver ??= class {
  #entry
  constructor(callback: IntersectionObserverCallback) {
    this.#entry = {
      callback,
      observer: this as unknown as IntersectionObserver,
      targets: new Set<Element>(),
    }
    intersectionObservers.add(this.#entry)
  }
  observe(target: Element) {
    this.#entry.targets.add(target)
  }
  unobserve(target: Element) {
    this.#entry.targets.delete(target)
  }
  disconnect() {
    intersectionObservers.delete(this.#entry)
  }
  takeRecords() {
    return []
  }
} as unknown as typeof IntersectionObserver
;(globalThis as { reachListEnd?: () => void }).reachListEnd = () =>
  intersectionObservers.forEach(({ callback, observer, targets }) =>
    callback(
      [...targets].map(
        (target) =>
          ({
            target,
            isIntersecting: true,
            intersectionRatio: 1,
          }) as IntersectionObserverEntry,
      ),
      observer,
    ),
  )
