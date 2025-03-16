import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f0f9f0] py-16 px-4">
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center mb-16">
        <div className="flex items-center justify-center mb-8">
          <div className="text-green-600 text-2xl font-medium flex items-center gap-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.5 4.5c0 1 .16 1.72.34 2.12.64 1.47 2.16 2.9 3.66 3.8V18a1 1 0 102 0v-7.58c1.5-.9 3.02-2.33 3.66-3.8.18-.4.34-1.12.34-2.12C16.5 2.02 14.48 0 12 0S7.5 2.02 7.5 4.5zM12 2c1.38 0 2.5 1.12 2.5 2.5 0 .51-.06.88-.16 1.12-.34.78-1.36 1.84-2.34 2.58-.98-.74-2-1.8-2.34-2.58-.1-.24-.16-.6-.16-1.12C9.5 3.12 10.62 2 12 2z"/>
            </svg>
            Greenvites
          </div>
        </div>
        <h1 className="text-gray-800 text-2xl font-medium mb-2">Create beautiful, eco-friendly digital invitations and manage your event</h1>
        <p className="text-gray-600 text-sm">RSVPs with ease. Join us in making event planning more sustainable!</p>
      </div>

      {/* Features Grid */}
      <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6 px-4 mb-12">
        {/* Create Feature */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-medium text-gray-800 mb-1">Create</h2>
          <p className="text-sm text-gray-500 mb-3">Design your perfect invitation</p>
          <p className="text-gray-600 text-sm leading-relaxed">Create beautiful digital invitations for any occasion. Customize colors, add photos, and make it uniquely yours.</p>
        </div>

        {/* Share Feature */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-medium text-gray-800 mb-1">Share</h2>
          <p className="text-sm text-gray-500 mb-3">Spread the word</p>
          <p className="text-gray-600 text-sm leading-relaxed">Share your invitation link with guests via email, social media, or messaging apps. No paper waste!</p>
        </div>

        {/* Manage Feature */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-medium text-gray-800 mb-1">Manage</h2>
          <p className="text-sm text-gray-500 mb-3">Track responses easily</p>
          <p className="text-gray-600 text-sm leading-relaxed">Keep track of RSVPs, manage guest lists, and communicate with attendees all in one place.</p>
        </div>
      </div>

      {/* CTA Button */}
      <div className="text-center">
        <Link href="/create" className="bg-green-600 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-green-700 transition-colors inline-block">
          Create Your Greenvite
        </Link>
      </div>
    </main>
  )
}
