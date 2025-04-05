import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Create a loading component
function LoadingUsers() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-700">Loading user management...</p>
      </div>
    </div>
  );
}

// Dynamically import the client component with SSR disabled
const UsersClient = dynamic(
  () => import('./users-client'),
  { 
    ssr: false,
    loading: () => <LoadingUsers />
  }
);

// Server component that doesn't use any client hooks
export default function UsersPage() {
  return (
    <Suspense fallback={<LoadingUsers />}>
      <UsersClient />
    </Suspense>
  );
}
