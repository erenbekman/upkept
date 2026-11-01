<script setup lang="ts">
definePageMeta({ middleware: () => { useState('progress_view').value = 'numbers'; return navigateTo('/app/progress', { replace: true }) } })
</script>

<template>
  <div />
</template>
