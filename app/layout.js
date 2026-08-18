import { Inter } from 'next/font/google';
import './globals.css';
import DevNav from '@/components/DevNav';
import Footer from '@/components/Footer';

// Inter was named first in the globals.css font stack from the start but was
// never actually loaded, so every visitor fell back to Segoe UI / SF / Arial.
// That mattered for the heavy weights: Segoe UI has one Black face, so 800 and
// 900 rendered identically, and an Arial fallback has no black face at all.
// Loading the variable font gives a real 900 and makes the wordmark render the
// same on every platform. No `weight` array: the variable font carries the
// whole 100-900 axis.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'localreg, local business directory',
  description: 'Find local businesses. List yours for $5/mo, down from $9.99.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        {/* Every page gets the footer. It carries "Manage listing", which used
            to live in the top bar. */}
        <Footer />
        {/* Temporary. Remove once Stripe/Supabase provide real entry points. */}
        <DevNav />
      </body>
    </html>
  );
}
