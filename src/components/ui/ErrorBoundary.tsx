'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary ${this.props.name || 'unknown'}] caught:`, error.message);
    console.error(`[ErrorBoundary ${this.props.name || 'unknown'}] stack:`, error.stack);
    console.error(`[ErrorBoundary ${this.props.name || 'unknown'}] componentStack:`, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#fee', border: '2px solid red', margin: '10px', borderRadius: '8px' }}>
          <h3 style={{ color: 'red' }}>Error in {this.props.name || 'component'}</h3>
          <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ fontSize: '10px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#666' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
