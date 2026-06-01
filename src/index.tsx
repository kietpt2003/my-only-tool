import React from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider } from './store';

import App from './App';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StoreProvider>
      <App />
    </StoreProvider>
  );;
}
