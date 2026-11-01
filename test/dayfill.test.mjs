import assert from 'node:assert/strict'
import test from 'node:test'
import { habitWeight, plannedOn, dayLayers, dayFraction, fillGradient } from '../composables/useDayFill.ts'

const habit = (id, extra = {}) => ({ id, color: '#ff5a36', days: null, goal: null, kind: 'build', created_at: '2026-01-01', ...extra })

test('done and rest fill a whole layer, partial half, missed nothing', () => {
  const h = habit(1)
  assert.equal(habitWeight(h, { status: 'done', amount: null }), 1)
  assert.equal(habitWeight(h, { status: 'rest', amount: null }), 1)
  assert.equal(habitWeight(h, { status: 'partial', amount: null }), 0.5)
  assert.equal(habitWeight(h, { status: 'missed', amount: null }), 0)
  assert.equal(habitWeight(h, null), 0)
})

test('an amount goal fills its layer in proportion', () => {
  const h = habit(1, { goal: 8 })
  assert.equal(habitWeight(h, { status: 'partial', amount: 2 }), 0.25)
  assert.equal(habitWeight({ ...h, kind: 'quit' }, { status: 'partial', amount: 2 }), 0.5)
})

test('off-plan and not-yet-created days are not part of the number', () => {
  const weekdays = habit(1, { days: 0b0111110 })
  assert.equal(plannedOn(weekdays, '2026-11-01'), false)
  assert.equal(plannedOn(weekdays, '2026-11-02'), true)
  assert.equal(plannedOn(weekdays, '2026-11-01', { status: 'done' }), true)
  assert.equal(plannedOn(habit(2, { created_at: '2026-11-05 10:00:00' }), '2026-11-04'), false)
})

test('layers split the number evenly between planned habits', () => {
  const hs = [habit(1), habit(2)]
  const layers = dayLayers(hs, { 1: { habit_id: 1, date: '2026-11-02', status: 'done', amount: null } }, '2026-11-02', '#000')
  assert.deepEqual(layers.map(l => l.value), [0.5, 0])
  assert.equal(dayFraction(hs, [{ habit_id: 1, date: '2026-11-02', status: 'done', amount: null }], '2026-11-02'), 0.5)
  assert.equal(dayFraction([], [], '2026-11-02'), null)
})

test('fill gradient clamps to the glyph band', () => {
  assert.match(fillGradient(2, '#f00', '#eee'), /#f00 86\.0%/)
  assert.match(fillGradient(-1, '#f00', '#eee'), /#f00 12\.0%/)
})
