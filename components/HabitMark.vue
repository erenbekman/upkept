<script setup lang="ts">
const props = defineProps<{ icon: string | null; color: string | null; sm?: boolean }>()
const isText = computed(() => !!props.icon && !isEmojiIcon(props.icon))
</script>

<template>
  <span
    v-if="icon"
    class="habit-mark" :class="{ sm, text: isText }"
    :style="{ background: color || 'var(--accent)' }"
  >{{ icon }}</span>
  <span v-else class="habit-bar" :style="{ background: color || 'var(--accent)' }" />
</template>
