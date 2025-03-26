'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { StoryAnimation } from '../login/page';
import { signIn } from 'next-auth/react';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<any>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(false);

  // Get email and token from URL parameters
  useEffect(() => {
    const token = searchParams.get('token');
    const emailParam = searchParams.get('email');
    
    if (token) {
      setInvitationToken(token);
      checkInvitationToken(token);
    }
    
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Check if invitation token is valid
  const checkInvitationToken = async (token: string) => {
    setIsCheckingToken(true);
    try {
      const response = await fetch('/api/admin/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setInvitationInfo(data);
      } else {
        setError(data.error || 'Invalid invitation token');
      }
    } catch (error) {
      console.error('Error checking invitation token:', error);
      setError('Failed to verify invitation');
    } finally {
      setIsCheckingToken(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error
    setError('');
    
    // Validate form
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Register the user
      const signupResponse = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
        }),
      });
      
      const signupData = await signupResponse.json();
      
      if (!signupResponse.ok) {
        throw new Error(signupData.error || 'Failed to create account');
      }
      
      // If there's an invitation token, accept it
      if (invitationToken) {
        // Log in the user first
        const result = await signIn('credentials', {
          username: email,
          password,
          redirect: false,
        });
        
        if (result?.error) {
          throw new Error('Account created but unable to log in automatically');
        }
        
        // Accept the invitation
        const acceptResponse = await fetch('/api/admin/invitations/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: invitationToken }),
        });
        
        const acceptData = await acceptResponse.json();
        
        if (!acceptResponse.ok) {
          throw new Error(acceptData.error || 'Failed to accept invitation');
        }
        
        // Redirect to the event page
        router.push(`/admin/dashboard/events/${invitationInfo.eventId}`);
      } else {
        // Regular signup - redirect to login
        router.push('/login?registered=true');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'An error occurred during signup');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <StoryAnimation />
      <motion.div 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/90 backdrop-blur-lg rounded-lg shadow-xl p-8 w-full max-w-md my-8"
      >
        <h2 className="text-3xl font-bold text-center mb-4 text-gray-800">Create Account</h2>
        
        {invitationInfo && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 font-medium">
              You've been invited to manage an event:
            </p>
            <p className="font-bold text-gray-800 mt-1">{invitationInfo.eventTitle}</p>
            <p className="text-sm text-gray-600 mt-1">
              Complete your registration to accept this invitation.
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || !!searchParams.get('email')}
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          
          <div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isLoading || isCheckingToken}
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
          
          <div className="text-center text-sm text-gray-600 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
