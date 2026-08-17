export function useToast() {
  const msg = useState<string | null>('toast', () => null)
  // Errors stay until dismissed: WCAG asks that a message carrying an error or an
  // action not time out, and "Güncellenemedi — bağlantını kontrol et" is exactly
  // the one a user needs time to read.
  const isError = useState<boolean>('toastError', () => false)
  let timer: ReturnType<typeof setTimeout>

  function show(m: string, error = false) {
    msg.value = m
    isError.value = error
    clearTimeout(timer)
    if (!error) timer = setTimeout(() => { msg.value = null }, 1700)
  }

  function dismiss() {
    clearTimeout(timer)
    msg.value = null
  }

  return { msg, isError, show, dismiss }
}
