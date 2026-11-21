import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Joins class names (strings, conditions, lists) and lets a later Tailwind class win
 * over an earlier one of the same kind, so a className passed from outside overrides
 * a component's default.
 */
export function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes))
}
