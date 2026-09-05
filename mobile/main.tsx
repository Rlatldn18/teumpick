import React from 'react';
import { createRoot } from 'react-dom/client';
import PickupApp from '../app/pickup-app';
import '../app/globals.css';
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="app-loading">
        <h1>잠시 문제가 생겼어요</h1>
        <p>앱을 다시 시작해 주세요.</p>
        <button className="primary" onClick={() => location.reload()}>
          다시 시작
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <PickupApp />
  </ErrorBoundary>,
);
