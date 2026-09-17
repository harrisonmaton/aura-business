import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aura OS',
  description: 'Le système commercial de votre commerce.'
};

/* `viewport-fit` et l'absence de `maximum-scale` : on ne bloque jamais le
   zoom, c'est une régression d'accessibilité fréquente et gratuite. */
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, themeColor: '#0A0D1A'
};

export default function RacineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
