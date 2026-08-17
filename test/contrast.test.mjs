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
  [...css.matchAll(/(--(?:accent|on-accent|danger-solid|done-dot|partial-dot|miss-dot)):\s*(#[0-9a-fA-F]{6})/g)]
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

  // --card2 is a real text surface: .date-pill, .sheet-date, .chip, .seg and the
  // grid's weekend columns all draw on it, and --accent-text used to miss AA
  // there while passing on --bg and --card.
  test(`${theme} tema: metin renkleri --card2 üstünde de AA`, () => {
    for (const fg of ['--ink', '--ink2', '--muted', '--accent-text']) check(theme, P, fg, '--card2', 4.5)
  })

  // The one exception, and it is deliberate: --muted2 only reaches --card2 as a
  // graphic glyph (the empty cell's dot) or a disabled arrow.
  test(`${theme} tema: --muted2 --card2 üstünde grafik eşiğini (3:1) geçiyor`, () => {
    check(theme, P, '--muted2', '--card2', 3.0)
  })

  test(`${theme} tema: --on-accent, accent dolgu üstünde AA`, () => {
    check(theme, P, '--on-accent', '--accent', 4.5)
  })

  test(`${theme} tema: --on-accent, yıkıcı dolgu üstünde AA`, () => {
    check(theme, P, '--on-accent', '--danger-solid', 4.5)
  })

  // ✓ ~ ✕ inside the filled dots are glyphs, not prose — 3:1. --partial-dot sat
  // at 2.57:1 and missed even that.
  test(`${theme} tema: dolgu üstündeki işaret glifleri grafik eşiğini geçiyor`, () => {
    for (const k of ['done', 'partial', 'miss']) check(theme, P, '--on-accent', `--${k}-dot`, 3.0)
  })

  test(`${theme} tema: toast metni kendi zemininde AA`, () => {
    check(theme, P, '--toast-text', '--toast-bg', 4.5)
  })

  // The toast is an inverted surface with no border; if it does not separate from
  // the page it just is not there. Dark mode's fixed brown managed 1.37:1.
  test(`${theme} tema: toast zemini sayfadan ayrışıyor`, () => {
    const r = ratio(P['--toast-bg'], P['--bg'])
    assert.ok(r >= 3.0, `--toast-bg (${P['--toast-bg']}) sayfayla ${r.toFixed(2)}:1 — toast kayboluyor`)
  })

  // .saved-flag draws --done-text on --sheet, which is its own surface in dark.
  test(`${theme} tema: durum metni --sheet üstünde AA`, () => {
    for (const k of ['done', 'partial', 'miss']) check(theme, P, `--${k}-text`, '--sheet', 4.5)
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

// ---------------------------------------------------------------------------
// Marketing pages. They carry their own hardcoded palette rather than the app
// tokens, and nothing checked it: 27 of 55 pairs missed AA, some as low as
// 1.68:1. Scanned from source so a stray light tone fails here, not in the wild.
const lp = readFileSync(new URL('../pages/index.vue', import.meta.url), 'utf8')
const pp = readFileSync(new URL('../pages/privacy.vue', import.meta.url), 'utf8')

// every surface the marketing pages paint text on
const LP_SURFACES = ['#f7f4ed', '#fbf8f0', '#f2ede2', '#fdfbf5', '#f4efe3']
const LP_TEXT = ['#726a5e', '#7d6758', '#6465a5', '#6b6459', '#4a463f', '#4a453c',
  '#3a352d', '#33302b', '#262420', '#201e1a', '#3f6b3a', '#886214', '#9a5236']
const LP_GRAPHIC = ['#8e8778']

test('tanıtım sayfası: metin tonları her zeminde AA', () => {
  for (const fg of LP_TEXT) for (const bg of LP_SURFACES) {
    const v = ratio(fg, bg)
    assert.ok(v >= 4.5, `${fg} / ${bg} = ${v.toFixed(2)}:1, min 4.5`)
  }
})

test('tanıtım sayfası: grafik tonları her zeminde 3:1', () => {
  for (const fg of LP_GRAPHIC) for (const bg of LP_SURFACES) {
    const v = ratio(fg, bg)
    assert.ok(v >= 3.0, `${fg} / ${bg} = ${v.toFixed(2)}:1, min 3.0`)
  }
})

test('tanıtım sayfası: dolgu üstündeki glifler beyaz ve 3:1 geçiyor', () => {
  for (const fill of ['#6d6fae', '#5f8a58', '#ba8a2f', '#bd7659']) {
    const v = ratio('#ffffff', fill)
    assert.ok(v >= 3.0, `#ffffff / ${fill} = ${v.toFixed(2)}:1, min 3.0`)
  }
})

// The tones that used to fail. Any reappearance is a regression, including via
// copy-paste from an old revision.
test('tanıtım sayfasında AA geçmeyen eski tonlar geri gelmemiş', () => {
  const banned = ['#8a8172', '#9a917f', '#a89f8c', '#b0a894', '#b0917d', '#cbc1ac', '#c3b79b']
  for (const c of banned) {
    assert.ok(!lp.includes(c), `pages/index.vue hâlâ ${c} kullanıyor`)
    assert.ok(!pp.includes(c), `pages/privacy.vue hâlâ ${c} kullanıyor`)
  }
  // #6d6fae is the fill; as small text it only reaches 4.22:1
  assert.ok(!/color: #6d6fae/.test(pp), 'privacy.vue accent dolgusunu metin rengi olarak kullanıyor')
})

// ---------------------------------------------------------------------------
// Habit colours are identity, the status palette is meaning. Four of the old
// eight swatches were byte-for-byte copies of a status token, so a habit could
// wear the exact green that means "done". Keep the two sets apart by hue.
const habits = readFileSync(new URL('../pages/app/habits.vue', import.meta.url), 'utf8')
const HABIT = [...habits.matchAll(/\{ hex: '(#[0-9a-f]{6})', name:/g)].map(m => m[1])

const s2l = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
function oklch(hex) {
  const [r, g, b] = [1, 3, 5].map(i => s2l(parseInt(hex.slice(i, i + 2), 16) / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  let h = Math.atan2(B, A) * 180 / Math.PI
  if (h < 0) h += 360
  return { L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, C: Math.hypot(A, B), h }
}
const dh = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d }
const SEMANTIC = ['--accent', '--done-dot', '--partial-dot', '--miss-dot', '--danger-solid']

test('alışkanlık paleti sekiz renk sunuyor', () => {
  assert.equal(HABIT.length, 8, `okunan: ${HABIT.join(', ')}`)
})

test('hiçbir alışkanlık rengi semantik bir tokenın kopyası değil', () => {
  for (const c of HABIT) for (const k of SEMANTIC) {
    assert.notEqual(c.toLowerCase(), light[k].toLowerCase(), `${c} = ${k}`)
  }
})

// 15 degrees is the point where two hues read as the same colour; 30 gives the
// categorical set room to also be told apart from each other.
test('alışkanlık renkleri semantik hue bantlarından uzak', () => {
  for (const c of HABIT) {
    const o = oklch(c)
    if (o.C < 0.03) continue // a neutral carries no hue to collide with
    for (const k of SEMANTIC) {
      const d = dh(o.h, oklch(light[k]).h)
      assert.ok(d >= 30, `${c} (h=${o.h.toFixed(0)}°) ile ${k} arası ${d.toFixed(0)}° — 30 gerek`)
    }
  }
})

test('alışkanlık renkleri birbirinden ayırt edilebilir', () => {
  const chroma = HABIT.filter(c => oklch(c).C >= 0.03)
  for (let i = 0; i < chroma.length; i++) for (let j = i + 1; j < chroma.length; j++) {
    const d = dh(oklch(chroma[i]).h, oklch(chroma[j]).h)
    assert.ok(d >= 18, `${chroma[i]} ve ${chroma[j]} arası ${d.toFixed(0)}° — 18 gerek`)
  }
})

// The 5px habit bar has to be perceivable on the card in either theme, and no
// swatch may outshout the rest.
test('alışkanlık renkleri iki temada da kartta görünür ve eşit ağırlıkta', () => {
  for (const c of HABIT) {
    for (const [name, bg] of [['açık', light['--card']], ['koyu', dark['--card']]]) {
      const r = ratio(c, bg)
      assert.ok(r >= 3.0, `${c} ${name} kartta ${r.toFixed(2)}:1`)
    }
    const L = oklch(c).L
    assert.ok(Math.abs(L - 0.60) <= 0.04, `${c} L=${L.toFixed(2)} — palet L≈0.60 tutuyor`)
  }
})
