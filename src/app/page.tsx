'use client';

import { useState } from 'react';
import Image from 'next/image';
import SignupModal from '@/components/SignupModal';
import BackgroundAnimation from '@/components/BackgroundAnimation';

export default function Home() {
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex flex-col">
      {/* Background Animation */}
      <BackgroundAnimation />

      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Name */}
            <div className="flex items-center gap-2">
              <Image
                src="/greenvites.png"
                alt="Greenvites Logo"
                width={32}
                height={32}
                className="h-8 w-auto"
              />
              <div className="flex items-center gap-2">
                <span className="text-xl font-medium bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Greenvites
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-700 border border-green-200">
                  Beta
                </span>
              </div>
            </div>

            {/* Sign Up Button */}
            <button
              onClick={() => setIsSignupModalOpen(true)}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium
                shadow-md shadow-green-500/20 hover:shadow-green-500/30 hover:scale-[1.02]
                focus:outline-none focus:ring-2 focus:ring-green-500/50 
                transition-all duration-200 ease-in-out"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-grow">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          {/* Content */}
          <div className="relative z-10 px-4 py-20 sm:px-6 lg:px-8 pt-32">
            <div className="mx-auto max-w-5xl">
              {/* Header */}
              <div className="text-center mb-16">
                <h1 className="text-4xl font-light text-gray-900 sm:text-5xl mb-6">
                  Create Beautiful Digital Invitations
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                  Join us in making event planning more sustainable with eco-friendly digital invitations and seamless RSVP management.
                </p>
                <button
                  onClick={() => setIsSignupModalOpen(true)}
                  className="inline-flex items-center px-8 py-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium 
                    shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02]
                    focus:outline-none focus:ring-2 focus:ring-green-500/50 
                    transition-all duration-200 ease-in-out"
                >
                  Create Your Greenvite
                </button>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
                {/* Create Feature */}
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                  <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-3">Create</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Design stunning digital invitations that reflect your style. Customize colors, add photos, and make it uniquely yours.
                  </p>
                </div>

                {/* Share Feature */}
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                  <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-3">Share</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Share your invitation link instantly via email, WhatsApp, or social media. No paper waste, just pure convenience.
                  </p>
                </div>

                {/* Manage Feature */}
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                  <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-3">Manage</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Track RSVPs in real-time, manage guest lists, and communicate with attendees all in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 mt-20 border-t border-green-100 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              <p className="text-gray-600">
                Made in Lagos with love
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-8">
              <a href="mailto:hello@greenvites.online" className="text-gray-600 hover:text-green-600 transition-colors flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>hello@greenvites.online</span>
              </a>
              <a href="tel:+2348121751210" className="text-gray-600 hover:text-green-600 transition-colors flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>+234 812 175 1210</span>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Signup Modal */}
      <SignupModal 
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
      />
    </main>
  );
}
