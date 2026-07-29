// npm test
import assert from 'node:assert/strict'
import test from 'node:test'
import { monthStats, currentStreaks } from '../composables/useStats.ts'

const h = (id, name, created_at) => ({ id, name, created_at })
const e = (habit_id, date, status, reason_tag_id = null) => ({ habit_id, date, status, reason_tag_id })
const base = { year: 2026, month: 7, today: '2026-07-10', challengeStart: null }

test('slots only cover elapsed days, not the whole month', () => {
  const s = monthStats({ ...base, habits: [h(1, 'A', '2026-06-01 09:00:00')], entries: [] })
  assert.equal(s.slots, 10) // 1–10 July, not 31
})

test('a habit added mid-month is not charged for the days before it existed', () => {
  const s = monthStats({ ...base, habits: [h(1, 'A', '2026-07-08 09:00:00')], entries: [] })
  assert.equal(s.slots, 3) // 8, 9, 10
})

test('days before the challenge start do not count', () => {
  const s = monthStats({
    ...base, challengeStart: '2026-07-06',
    habits: [h(1, 'A', '2026-06-01 09:00:00')], entries: [],
  })
  assert.equal(s.slots, 5) // 6–10
})

test('entries from removed habits are ignored, not counted as extra', () => {
  const s = monthStats({
    ...base,
    habits: [h(1, 'A', '2026-06-01 09:00:00')],
    entries: [e(1, '2026-07-01', 'done'), e(99, '2026-07-02', 'done')], // 99 deactivated
  })
  assert.equal(s.filled, 1)
  assert.equal(s.consistency, 10) // 1/10, not 2/10
})

test('back-filling a day before the habit existed never exceeds 100%', () => {
  const s = monthStats({
    ...base,
    habits: [h(1, 'A', '2026-07-08 09:00:00')],
    entries: [e(1, '2026-07-01', 'done'), e(1, '2026-07-08', 'done'), e(1, '2026-07-09', 'done'), e(1, '2026-07-10', 'done')],
  })
  assert.equal(s.slots, 4) // 8,9,10 + the back-filled 1st
  assert.equal(s.consistency, 100)
  assert.equal(s.completion, 100)
})

test('partial counts as half for completion, whole for consistency', () => {
  const s = monthStats({
    ...base, today: '2026-07-02',
    habits: [h(1, 'A', '2026-06-01 09:00:00')],
    entries: [e(1, '2026-07-01', 'done'), e(1, '2026-07-02', 'partial')],
  })
  assert.equal(s.completion, 75)
  assert.equal(s.consistency, 100)
})

test('missed days lower completion but not consistency', () => {
  const s = monthStats({
    ...base, today: '2026-07-02',
    habits: [h(1, 'A', '2026-06-01 09:00:00')],
    entries: [e(1, '2026-07-01', 'done'), e(1, '2026-07-02', 'missed')],
  })
  assert.equal(s.completion, 50)
  assert.equal(s.consistency, 100)
})

test('top reason is the most frequent tag', () => {
  const s = monthStats({
    ...base,
    habits: [h(1, 'A', '2026-06-01 09:00:00'), h(2, 'B', '2026-06-01 09:00:00')],
    entries: [e(1, '2026-07-01', 'missed', 5), e(2, '2026-07-01', 'missed', 5), e(1, '2026-07-02', 'missed', 7)],
  })
  assert.equal(s.topReasonId, 5)
  assert.equal(s.topReasonCount, 2)
})

test('no habits means zero, not a division by zero', () => {
  const s = monthStats({ ...base, habits: [], entries: [] })
  assert.deepEqual([s.slots, s.completion, s.consistency], [0, 0, 0])
})

test('a future month has no slots', () => {
  const s = monthStats({ ...base, year: 2026, month: 9, habits: [h(1, 'A', '2026-06-01')], entries: [] })
  assert.equal(s.slots, 0)
})

test('a past month counts every one of its days', () => {
  const s = monthStats({ ...base, month: 6, habits: [h(1, 'A', '2026-05-01')], entries: [] })
  assert.equal(s.slots, 30)
})

test('an unmarked today does not reset the streak', () => {
  const st = currentStreaks(
    [h(1, 'A', '2026-06-01')],
    [e(1, '2026-07-08', 'done'), e(1, '2026-07-09', 'done')],
    '2026-07-10',
  )
  assert.equal(st[0].days, 2)
})

test('a missed day does break the streak', () => {
  const st = currentStreaks(
    [h(1, 'A', '2026-06-01')],
    [e(1, '2026-07-08', 'done'), e(1, '2026-07-09', 'missed'), e(1, '2026-07-10', 'done')],
    '2026-07-10',
  )
  assert.equal(st[0].days, 1)
})

test('partial keeps the streak alive', () => {
  const st = currentStreaks(
    [h(1, 'A', '2026-06-01')],
    [e(1, '2026-07-09', 'partial'), e(1, '2026-07-10', 'done')],
    '2026-07-10',
  )
  assert.equal(st[0].days, 2)
})
