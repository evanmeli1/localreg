import { Suspense } from 'react';
import WelcomeForm from '@/components/WelcomeForm';

export default function WelcomePage() {
  // WelcomeForm reads ?session_id= via useSearchParams, which Next requires to
  // sit inside a Suspense boundary.
  return (
    <Suspense>
      <WelcomeForm />
    </Suspense>
  );
}
