import { Suspense } from 'react';
import DirectoryBrowser from '@/components/DirectoryBrowser';

export default function HomePage() {
  // DirectoryBrowser reads ?category= via useSearchParams, which Next requires
  // to sit inside a Suspense boundary.
  return (
    <Suspense>
      <DirectoryBrowser />
    </Suspense>
  );
}
