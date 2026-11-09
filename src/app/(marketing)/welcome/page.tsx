import type { Metadata } from 'next';
import WelcomeStatus from '@/components/marketing/WelcomeStatus';

export const metadata: Metadata = {
  title: 'Welcome',
  description: 'Your FastChat plan is being set up.',
  robots: { index: false, follow: false },
};

export default function WelcomePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-white">Thank you for your purchase</h1>
      <WelcomeStatus />
    </div>
  );
}
