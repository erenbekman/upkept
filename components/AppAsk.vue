<script setup lang="ts">
const { pending } = useAsk()
const value = ref('')
const box = ref<HTMLElement | null>(null)

watch(pending, async (p) => {
  if (!p) return
  value.value = ''
  await nextTick()
  box.value?.querySelector<HTMLElement>('input, button.btn-primary, button.btn-danger')?.focus()
})

function cancel() {
  const p = pending.value
  if (!p) return
  pending.value = null
  p.resolve(p.input ? null : false)
}

function ok() {
  const p = pending.value
  if (!p) return
  if (p.input && !value.value.trim()) return
  pending.value = null
  p.resolve(p.input ? value.value.trim() : true)
}
</script>

<template>
  <div v-if="pending" class="overlay ask-overlay" @click.self="cancel">
    <div
      ref="box" class="ask" role="alertdialog" aria-modal="true"
      :aria-label="pending.title" @keydown.esc="cancel"
    >
      <div class="ask-title">{{ pending.title }}</div>
      <div v-if="pending.message" class="ask-text">{{ pending.message }}</div>
      <input
        v-if="pending.input" v-model="value" class="note-area"
        style="margin-top:0;" :placeholder="pending.input" @keydown.enter="ok"
      />
      <div class="ask-actions">
        <button class="btn" @click="cancel">Vazgeç</button>
        <button class="btn" :class="pending.danger ? 'btn-danger' : 'btn-primary'" @click="ok">
          {{ pending.okLabel ?? 'Tamam' }}
        </button>
      </div>
    </div>
  </div>
</template>
