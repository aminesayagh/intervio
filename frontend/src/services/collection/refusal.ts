import { ApiError } from '../http'
/** The message for a refused change: no right any more (403), or another failure. */
export function refusalMessage(refusal: unknown) {
  return refusal instanceof ApiError && refusal.status === 403
    ? 'collection:error.forbidden'
    : 'collection:error.save'
}
