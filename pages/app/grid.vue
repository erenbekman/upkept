<script setup lang="ts">
definePageMeta({ middleware: () => { useState('progress_view').value = 'grid'; return navigateTo('/app/progress', { replace: true }) } })
</script>

<template>
  <div />
</template>
