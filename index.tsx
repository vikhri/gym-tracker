
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { getDb } from './storage/offlineDb';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Initialize IndexedDB before starting the app to ensure stores are ready
getDb().then(() => {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
}).catch(err => {
    console.error("Failed to initialize database", err);
    // Still render to allow online fallback or error display
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
});
