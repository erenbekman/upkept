// window.confirm/prompt/alert are dead on desktop: wry never implements
// WKWebView's JS dialog delegates, so confirm() returns false and prompt()
// returns null without ever showing anything. Everything asks through here.
export interface AskOptions {
  title: string
  message?: string
  okLabel?: string
  danger?: boolean
  input?: string
}

interface Pending extends AskOptions {
  resolve: (v: string | boolean | null) => void
}

export function useAsk() {
  const pending = useState<Pending | null>('ask_pending', () => null)

  function ask(opts: AskOptions) {
    return new Promise<string | boolean | null>((resolve) => {
      pending.value?.resolve(pending.value.input ? null : false)
      pending.value = { ...opts, resolve }
    })
  }

  return {
    pending,
    confirm: (o: AskOptions) => ask(o) as Promise<boolean>,
    text: (o: AskOptions & { input: string }) => ask(o) as Promise<string | null>,
  }
}
