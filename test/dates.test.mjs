// npm test
// Date math is the one bit here that can silently go wrong (DST, month ends).
import assert from 'node:assert/strict'
import test from 'node:test'
import { shiftDate, challengeDay, fmtAgo } from '../composables/useDates.ts'

test('shiftDate crosses months, years and DST boundaries', () => {
  assert.equal(shiftDate('2026-07-28', 1), '2026-07-29')
  assert.equal(shiftDate('2026-07-01', -1), '2026-06-30')
  assert.equal(shiftDate('2026-01-01', -1), '2025-12-31')
  assert.equal(shiftDate('2026-03-01', -1), '2026-02-28')
  // US/EU DST switch days — must still land on the neighbouring calendar day
  assert.equal(shiftDate('2026-03-29', 1), '2026-03-30')
  assert.equal(shiftDate('2026-10-25', -1), '2026-10-24')
})

test('challengeDay counts inclusively from the start date', () => {
  assert.equal(challengeDay('2026-07-01', '2026-07-01'), 1)
  assert.equal(challengeDay('2026-07-01', '2026-07-28'), 28)
  assert.equal(challengeDay('2026-03-01', '2026-04-01'), 32) // spans a DST switch
  assert.equal(challengeDay('2026-07-10', '2026-07-01'), null)
})

test('fmtAgo buckets', () => {
  const now = Date.now()
  assert.equal(fmtAgo(null), 'henüz yok')
  assert.equal(fmtAgo(now), 'az önce')
  assert.equal(fmtAgo(now - 5 * 60_000), '5 dk önce')
  assert.equal(fmtAgo(now - 3 * 3600_000), '3 sa önce')
  assert.equal(fmtAgo(now - 2 * 86400_000), '2 gün önce')
})
