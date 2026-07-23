export function useToast() {
  const msg = useState<string | null>('toast', () => null)
  let timer: ReturnType<typeof setTimeout>

  function show(m: string) {
    msg.value = m
    clearTimeout(timer)
    timer = setTimeout(() => { msg.value = null }, 1700)
  }

  return { msg, show }
}
