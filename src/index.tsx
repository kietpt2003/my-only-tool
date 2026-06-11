import React from 'react';
import { createRoot } from 'react-dom/client';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';

import { StoreProvider } from './store';
import App from './App';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <PayPalScriptProvider options={{ clientId: process.env.PAYPAL_CLIENT_ID || '', currency: "USD" }}>
      <StoreProvider>
        <App />
      </StoreProvider>
    </PayPalScriptProvider>
  );;
}
