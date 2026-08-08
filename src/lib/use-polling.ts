import { useEffect, useRef } from "react"

/**
 * Polling robuste :
 * - ne relance jamais un tick si le précédent est encore en vol (pas de chevauchement)
 * - se met en pause quand l'onglet n'est pas visible (économies réseau/CPU)
 * - recharge dès qu'on revient sur l'onglet (données jamais périmées visuellement)
 */
export function usePolling(fn: () => Promise<unknown> | void, intervalMs: number, enabled = true) {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!enabled) return

    let inFlight = false
    let timer: ReturnType<typeof setInterval> | undefined

    const run = () => {
      if (inFlight || document.hidden) return
      inFlight = true
      Promise.resolve(fnRef.current())
        .catch(() => undefined)
        .finally(() => {
          inFlight = false
        })
    }

    run()
    timer = setInterval(run, intervalMs)
    document.addEventListener("visibilitychange", run)

    return () => {
      if (timer) clearInterval(timer)
      document.removeEventListener("visibilitychange", run)
    }
  }, [intervalMs, enabled])
}