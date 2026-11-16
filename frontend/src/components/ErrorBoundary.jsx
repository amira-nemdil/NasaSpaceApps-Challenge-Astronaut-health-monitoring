import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="health-panel m-4">
          <h1 className="text-2xl font-bold">
            AstroPulse could not display this view
          </h1>
          <p>
            Your saved synthetic session remains on this device. Reload to
            retry, or clear the sandbox state if it is damaged.
          </p>
          <button
            className="health-button mt-3"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          <button
            className="health-button ml-3"
            onClick={() => {
              localStorage.removeItem('astropulse:v2:simulation');
              window.location.reload();
            }}
          >
            Clear sandbox and reload
          </button>
        </main>
      );
    return this.props.children;
  }
}
