import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pianificazione Offerte - Righi Solutions',
  description: 'Pianificazione e carico della divisione offerte commerciali',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * Il tema si applica prima della prima pittura per evitare il lampo di bianco
 * all'apertura in tema scuro. L'accesso a localStorage e protetto: in finestra
 * privata o con i dati del sito bloccati puo sollevare eccezione.
 */
const APPLICA_TEMA = `
(function () {
  try {
    var t = localStorage.getItem('tema');
    if (t === 'scuro' || t === 'chiaro') {
      document.documentElement.setAttribute('data-tema', t);
      return;
    }
  } catch (e) { /* storage non disponibile: si usa la preferenza di sistema */ }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-tema', 'scuro');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLICA_TEMA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
