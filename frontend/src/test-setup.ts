import '@testing-library/jest-dom/vitest'

import { MotionGlobalConfig } from 'motion/react'

// Tests check what shows, not how it moves: animations end at once.
MotionGlobalConfig.skipAnimations = true
