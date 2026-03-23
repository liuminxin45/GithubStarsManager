import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

console.log('Main.tsx loading...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

console.log('Root element found, creating React root...');

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

console.log('React app rendered');