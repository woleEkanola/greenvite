'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

export default function VerifyPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.user_id as string;
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your account...');

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const response = await fetch(`/api/verify/${userId}`, {
          method: 'POST',
        });

        if (response.ok) {
          setStatus('success');
          setMessage('Your account has been verified successfully!');
          
          // Redirect to login page after 3 seconds
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        } else {
          const data = await response.json();
          setStatus('error');
          setMessage(data.error || 'Failed to verify account. Please try again.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
      }
    };

    verifyUser();
  }, [userId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Account Verification</h2>
          
          <div className="mt-8">
            {status === 'loading' && (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                <p className="mt-4 text-lg text-gray-600">{message}</p>
              </div>
            )}
            
            {status === 'success' && (
              <div className="flex flex-col items-center">
                <div className="bg-green-100 rounded-full p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="mt-4 text-lg text-gray-600">{message}</p>
                <p className="mt-2 text-sm text-gray-500">Redirecting to login page...</p>
              </div>
            )}
            
            {status === 'error' && (
              <div className="flex flex-col items-center">
                <div className="bg-red-100 rounded-full p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="mt-4 text-lg text-gray-600">{message}</p>
                <button 
                  onClick={() => router.push('/login')}
                  className="mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                >
                  Go to Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
