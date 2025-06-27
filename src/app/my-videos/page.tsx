import { Suspense } from 'react';
import AllVideosClient from './AllVideosClient';

export default function AllVideosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <AllVideosClient />
    </Suspense>
  );
} 