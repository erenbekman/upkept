import assert from 'node:assert/strict'
import test from 'node:test'
import { amountStatus, goalStep, fmtProgress } from '../composables/useGoal.ts'

test('reaching the goal is done, part of it is partial, nothing is unlogged', () => {
  assert.equal(amountStatus(8, 8), 'done')
  assert.equal(amountStatus(8, 10), 'done')
  assert.equal(amountStatus(8, 3), 'partial')
  assert.equal(amountStatus(8, 0), null)
})

test('the tap step stays small for counts and scales for big goals', () => {
  assert.equal(goalStep(8), 1)
  assert.equal(goalStep(20), 2)
  assert.equal(goalStep(60), 5)
  assert.equal(goalStep(10000), 1000)
})

test('progress reads amount over goal with the unit', () => {
  assert.equal(fmtProgress(3, 8, 'bardak'), '3 / 8 bardak')
  assert.equal(fmtProgress(null, 2.5, 'L'), '0 / 2.5 L')
  assert.equal(fmtProgress(1, 20, null), '1 / 20')
})
