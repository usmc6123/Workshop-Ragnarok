console.log('MAIN.TSX LOADING');
import React, {Component, ReactNode, StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { error: null };
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{color:'red',padding:20}}>
        CRASH: {this.state.error.message}
      </div>
    );
    return this.props.children;
  }
}

const isSandbox = window.location.hostname.includes('aistudio.google.com') ||
                  window.location.hostname.includes('googleusercontent.com');

if (isSandbox) {
  localStorage.setItem('workshop_token', 'sandbox-mock-token');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </AuthProvider>
  </StrictMode>,
);
