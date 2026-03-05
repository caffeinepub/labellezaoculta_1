import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100dvh",
            background: "oklch(0.082 0.004 285)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "24rem",
              width: "100%",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div
              style={{
                width: "3.5rem",
                height: "3.5rem",
                borderRadius: "50%",
                background: "oklch(0.22 0.12 25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                fontSize: "1.5rem",
              }}
            >
              ⚠
            </div>
            <h1
              style={{
                color: "oklch(0.95 0.01 285)",
                fontSize: "1.25rem",
                fontWeight: 500,
                margin: 0,
              }}
            >
              Error de aplicación
            </h1>
            <p
              style={{
                color: "oklch(0.65 0.01 285)",
                fontSize: "0.875rem",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {this.state.error?.message ?? "Ha ocurrido un error inesperado."}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: "0.625rem 1.5rem",
                background: "oklch(0.78 0.14 75)",
                color: "oklch(0.10 0.004 285)",
                border: "none",
                borderRadius: "2px",
                fontSize: "0.75rem",
                fontFamily: "monospace",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
