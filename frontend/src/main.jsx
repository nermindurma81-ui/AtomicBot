import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#111111',
            color: '#fff',
            border: '1px solid #1f1f1f',
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#a3e635', secondary: '#000' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
