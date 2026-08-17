import './globals.css';
import DevNav from '@/components/DevNav';

export const metadata = {
  title: 'localreg — local business directory',
  description: 'Find local businesses. List yours for $5/mo.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Temporary — remove once Stripe/Supabase provide real entry points. */}
        <DevNav />
      </body>
    </html>
  );
}
