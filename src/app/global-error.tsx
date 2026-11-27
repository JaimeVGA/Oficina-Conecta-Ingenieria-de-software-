'use client';

import React, { useEffect, useState } from 'react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <main
          style={{
            width: '100%',
            maxWidth: '28rem',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxSizing: 'border-box',
          }}
        >
          <p
            style={{
              display: 'inline-block',
              margin: '0 0 0.75rem 0',
              padding: '0.25rem 0.625rem',
              borderRadius: '9999px',
              backgroundColor: isOnline ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: isOnline ? '#fcd34d' : '#fca5a5',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {isOnline ? 'Recuperación de error' : 'Sin conexión'}
          </p>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>
            {isOnline ? 'Se interrumpió la vista actual' : 'Sin conexión con el servidor central'}
          </h1>
          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.875rem', lineHeight: 1.5, color: '#cbd5e1' }}>
            Los borradores locales almacenados en tu navegador (sessionStorage) permanecen intactos.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                flex: 1,
                minHeight: '42px',
                padding: '0.625rem 1rem',
                borderRadius: '0.5rem',
                border: 0,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reintentar
            </button>
            <button
              type="button"
              disabled={!isOnline}
              onClick={() => window.location.reload()}
              style={{
                flex: 1,
                minHeight: '42px',
                padding: '0.625rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid #475569',
                backgroundColor: 'transparent',
                color: '#e2e8f0',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: isOnline ? 'pointer' : 'not-allowed',
                opacity: isOnline ? 1 : 0.5,
              }}
            >
              Recargar vista
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
