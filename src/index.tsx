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
        <footer
          aria-label={`Web version ${process.env.APP_VERSION}`}
          className="pointer-events-none fixed bottom-2 left-3 z-40 rounded-md border border-slate-200 bg-white/90 px-2 py-1 font-mono text-[10px] leading-none text-slate-500"
        >
          v{process.env.APP_VERSION}
        </footer>
      </StoreProvider>
    </PayPalScriptProvider>
  );;
}
