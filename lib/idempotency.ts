/**
 * In-memory idempotency cache for mutation requests.
 * Prevents double-submission and accidental duplicate operations on Google Sheets.
 */

interface IdempotencyRecord {
  timestamp: number
  status: 'PENDING' | 'RESOLVED'
  response?: any
}

const idempotencyStore = new Map<string, IdempotencyRecord>()
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000 // 5 minutes

function cleanupExpired() {
  const now = Date.now()
  for (const [key, record] of idempotencyStore.entries()) {
    if (now - record.timestamp > IDEMPOTENCY_TTL_MS) {
      idempotencyStore.delete(key)
    }
  }
}

/**
 * Checks if a request with this idempotency key is duplicate.
 */
export function checkIdempotency(key?: string | null): { isDuplicate: boolean; cachedResponse?: any } {
  if (!key || !key.trim()) return { isDuplicate: false }
  cleanupExpired()

  const existing = idempotencyStore.get(key)
  if (existing) {
    if (existing.status === 'RESOLVED') {
      return { isDuplicate: true, cachedResponse: existing.response }
    }
    // Still in flight
    return { isDuplicate: true }
  }

  // Register in-flight
  idempotencyStore.set(key, { timestamp: Date.now(), status: 'PENDING' })
  return { isDuplicate: false }
}

/**
 * Marks the idempotency key as resolved with the response payload.
 */
export function resolveIdempotency(key?: string | null, response?: any): void {
  if (!key || !key.trim()) return
  const existing = idempotencyStore.get(key)
  if (existing) {
    existing.status = 'RESOLVED'
    existing.response = response
  } else {
    idempotencyStore.set(key, { timestamp: Date.now(), status: 'RESOLVED', response })
  }
}

/**
 * Removes the key if the operation failed so the user can safely retry.
 */
export function clearIdempotency(key?: string | null): void {
  if (!key || !key.trim()) return
  idempotencyStore.delete(key)
}
