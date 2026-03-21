import React from 'react';
import ReactDOM from 'react-dom/client';
// Initialize logger to capture debug logs to file
import './utils/logger';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
