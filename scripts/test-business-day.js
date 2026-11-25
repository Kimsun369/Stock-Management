const assert = require('assert')

// Helper logic reproduced in plain JS for standalone test execution
const CAMBODIA_UTC_OFFSET_HOURS = 7

function toBusinessDate(dateInput, cutoffHour = 5) {
  const d = new Date(dateInput)
  const cambodiaMillis = d.getTime() + CAMBODIA_UTC_OFFSET_HOURS * 60 * 60 * 1000
  const local = new Date(cambodiaMillis)

  let year = local.getUTCFullYear()
  let month = local.getUTCMonth()
  let day = local.getUTCDate()
  const hour = local.getUTCHours()

  if (hour < cutoffHour) {
    const prev = new Date(Date.UTC(year, month, day - 1))
    year = prev.getUTCFullYear()
    month = prev.getUTCMonth()
    day = prev.getUTCDate()
  }

  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

console.log('🧪 Testing Business Day calculations with Asia/Phnom_Penh (UTC+7) and Cutoff = 05:00 AM...\n')

// Test 1: 23:30 local time (16:30 UTC on Nov 20) -> should be business day 2026-11-20
const t1 = '2026-11-20T16:30:00.000Z' // 23:30 local on Nov 20
const r1 = toBusinessDate(t1, 5)
console.log(`1. 23:30 local on Nov 20 -> Business Date: ${r1}`)
assert.strictEqual(r1, '2026-11-20', '23:30 local should be Nov 20')

// Test 2: 00:30 local time (17:30 UTC on Nov 20) -> should be business day 2026-11-20 (falls before 05:00 cutoff)
const t2 = '2026-11-20T17:30:00.000Z' // 00:30 local on Nov 21
const r2 = toBusinessDate(t2, 5)
console.log(`2. 00:30 local on Nov 21 -> Business Date: ${r2}`)
assert.strictEqual(r2, '2026-11-20', '00:30 local should count as previous day Nov 20')

// Test 3: 04:59 local time (21:59 UTC on Nov 20) -> should still be business day 2026-11-20
const t3 = '2026-11-20T21:59:00.000Z' // 04:59 local on Nov 21
const r3 = toBusinessDate(t3, 5)
console.log(`3. 04:59 local on Nov 21 -> Business Date: ${r3}`)
assert.strictEqual(r3, '2026-11-20', '04:59 local should still count as Nov 20')

// Test 4: 05:00 local time (22:00 UTC on Nov 20) -> starts new business day 2026-11-21
const t4 = '2026-11-20T22:00:00.000Z' // 05:00 local on Nov 21
const r4 = toBusinessDate(t4, 5)
console.log(`4. 05:00 local on Nov 21 -> Business Date: ${r4}`)
assert.strictEqual(r4, '2026-11-21', '05:00 local should start Nov 21')

// Test 5: Month boundary: 01-Nov at 02:00 AM local (19:00 UTC on Oct 31) -> should fall on 2026-10-31
const t5 = '2026-10-31T19:00:00.000Z' // 02:00 local on Nov 1
const r5 = toBusinessDate(t5, 5)
console.log(`5. Month boundary (02:00 local Nov 1) -> Business Date: ${r5}`)
assert.strictEqual(r5, '2026-10-31', '02:00 on Nov 1 should count as Oct 31')

// Test 6: Year boundary: 01-Jan at 02:00 AM local (19:00 UTC on Dec 31) -> should fall on 2026-12-31
const t6 = '2026-12-31T19:00:00.000Z' // 02:00 local on Jan 1, 2027
const r6 = toBusinessDate(t6, 5)
console.log(`6. Year boundary (02:00 local Jan 1) -> Business Date: ${r6}`)
assert.strictEqual(r6, '2026-12-31', '02:00 on Jan 1 should count as Dec 31 of previous year')

console.log('\n✅ All 6 business day tests passed successfully!')
