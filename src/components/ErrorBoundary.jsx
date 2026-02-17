import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            color: "#333",
            maxWidth: 600,
            margin: "40px auto",
          }}
        >
          <h2 style={{ color: "#7a0014", marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, marginBottom: 16 }}>
            The application encountered an unexpected error. Your data is safe
            in local storage.
          </p>
          <pre
            style={{
              fontSize: 12,
              background: "#fdecea",
              border: "1px solid #7a0014",
              padding: 12,
              overflow: "auto",
              maxHeight: 160,
              marginBottom: 16,
            }}
          >
            {this.state.error?.message || "Unknown error"}
          </pre>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={this.handleRetry}
              style={{
                border: "1px solid #2c3e50",
                background: "#2c3e50",
                color: "#fff",
                padding: "8px 16px",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                border: "1px solid #2c3e50",
                background: "#fff",
                color: "#333",
                padding: "8px 16px",
                cursor: "pointer",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
