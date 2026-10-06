import { Instrument_Sans } from 'next/font/google';
import './globals.css';

// next/font aloja la fuente con la app (sin petición bloqueante a Google Fonts) y aplica font-display: swap.
const instrumentSans = Instrument_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-sans' });

export const metadata = {
  title: 'Web Performance Check',
  description: 'Run Lighthouse on web pages, compare with the previous test and export a PDF.',
  icons: { icon: '/logo.svg' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={instrumentSans.variable}>
      <body>{children}</body>
    </html>
  );
}
