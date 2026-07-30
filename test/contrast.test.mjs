// npm test
// Locks the palette to WCAG AA. Change a colour in assets/main.css and this
// fails before it ships — the old palette had 19 violations nobody could see.
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../assets/main.css', import.meta.url), 'utf8')

function vars(selector) {
  const block = css.slice(css.indexOf(selector) + selector.length)
  const body = block.slice(0, block.indexOf('}'))
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map(m => [m[1], m[2]]))
}

const light = { ...vars(':root, [data-theme="light"] {'), ...vars(':root {\n  --accent') }
const dark = { ...vars('[data-theme="dark"] {'), ...vars(':root {\n  --accent') }
// Only --accent and the filled dots are theme-agnostic; the soft --*-bg fills
// are per-theme and must NOT be pulled in here or one theme overwrites the other.
const shared = Object.fromEntries(
  [...css.matchAll(/(--(?:accent|done-dot|partial-dot|miss-dot)):\s*(#[0-9a-fA-F]{6})/g)]
    .map(m => [m[1], m[2]]))
Object.assign(light, shared)
Object.assign(dark, shared)

function lum(hex) {
  const p = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  const c = p.map(x => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
function ratio(a, b) {
  const [la, lb] = [lum(a), lum(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
function check(theme, P, fg, bg, min) {
  assert.ok(P[fg], `${theme}: ${fg} okunamadı`)
  assert.ok(P[bg], `${theme}: ${bg} okunamadı`)
  const r = ratio(P[fg], P[bg])
  assert.ok(r >= min, `${theme}: ${fg} (${P[fg]}) / ${bg} (${P[bg]}) = ${r.toFixed(2)}:1, min ${min}`)
}

const TEXT = ['--ink', '--ink2', '--muted', '--muted2', '--serif-soft', '--accent-text',
  '--done-text', '--partial-text', '--miss-text']

for (const [theme, P] of [['açık', light], ['koyu', dark]]) {
  test(`${theme} tema: metin renkleri --bg ve --card üstünde AA (4.5:1)`, () => {
    for (const fg of TEXT) for (const bg of ['--bg', '--card']) check(theme, P, fg, bg, 4.5)
  })

  test(`${theme} tema: --dash2 affordance sınırı 3:1`, () => {
    for (const bg of ['--bg', '--card']) check(theme, P, '--dash2', bg, 3.0)
  })

  test(`${theme} tema: birincil buton metni beyaz, accent dolgu üstünde AA`, () => {
    const r = ratio('#ffffff', P['--accent'])
    assert.ok(r >= 4.5, `#ffffff / --accent = ${r.toFixed(2)}:1`)
  })

  test(`${theme} tema: --muted ile --muted2 arasında görülür kademe var`, () => {
    const step = ratio(P['--muted'], P['--bg']) / ratio(P['--muted2'], P['--bg'])
    const d = step > 1 ? step : 1 / step
    assert.ok(d >= 1.15, `iki ton neredeyse aynı (oran farkı ${d.toFixed(2)}x) — hiyerarşi çöker`)
  })

  // The pill draws --*-text on --*-bg. Both are theme-scoped, so both themes
  // must be checked — a light fill left under dark text was the original bug.
  test(`${theme} tema: durum metni kendi pill dolgusunun üstünde AA`, () => {
    for (const k of ['done', 'partial', 'miss']) check(theme, P, `--${k}-text`, `--${k}-bg`, 4.5)
  })

  test(`${theme} tema: pill dolgusu karttan ayrışıyor`, () => {
    for (const k of ['done', 'partial', 'miss']) {
      const r = ratio(P[`--${k}-bg`], P['--card'])
      assert.ok(r >= 1.15, `--${k}-bg (${P[`--${k}-bg`]}) kartla ${r.toFixed(2)}:1 — pill kayboluyor`)
    }
  })
}
