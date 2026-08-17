import './globals.css';
import DevNav from '@/components/DevNav';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'localreg — local business directory',
  description: 'Find local businesses. List yours for $5/mo.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Every page gets the footer — it carries "Manage listing", which used
            to live in the top bar. */}
        <Footer />
        {/* Temporary — remove once Stripe/Supabase provide real entry points. */}
        <DevNav />
      </body>
    </html>
  );
}
