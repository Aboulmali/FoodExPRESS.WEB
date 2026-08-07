import { Component } from "react"
import type { ErrorInfo, ReactNode } from "react"

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("FoodExpress UI crash:", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-background p-6">
          <div className="w-full max-w-lg rounded-2xl border border-destructive/40 bg-card p-6">
            <h1 className="text-lg font-bold text-destructive">Une erreur d'affichage est survenue</h1>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => {
                this.setState({ error: null })
              }}
            >
              Réessayer
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}