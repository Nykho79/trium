import type { ReactNode } from "react";
import { Component } from "react";
import { Button } from "./Button";
import { FeedbackBanner } from "./FeedbackBanner";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  message: string | undefined;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { message: undefined };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { message: error.message };
  }


  reset = () => {
    this.setState({ message: undefined });
  };

  render() {
    if (this.state.message) {
      return (
        <section className="error-boundary" role="alert">
          <FeedbackBanner tone="danger" title="Interface indisponible" message={this.state.message} />
          <Button variant="primary" onClick={this.reset}>Revenir a l'interface</Button>
        </section>
      );
    }
    return this.props.children;
  }
}