import type { ComponentType } from 'react'
import { CompanyStepPage } from './pages/CompanyStepPage'
import { IndustriesStepPage } from './pages/IndustriesStepPage'
import { LogoStepPage } from './pages/LogoStepPage'

export const ONBOARDING_START = '/onboarding/company'

/** Onboarding pages, for a logged-in client. */
export const onboardingRoutes: Record<string, ComponentType> = {
  [ONBOARDING_START]: CompanyStepPage,
  '/onboarding/industries': IndustriesStepPage,
  '/onboarding/logo': LogoStepPage,
}
