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
