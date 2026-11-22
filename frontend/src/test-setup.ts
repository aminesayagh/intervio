import '@testing-library/jest-dom/vitest'

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
