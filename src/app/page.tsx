import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-12 px-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto text-center mb-16">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.svg"
            alt="Greenvites Logo"
            width={200}
            height={40}
            className="h-10 w-auto"
          />
        </div>
        <h1 className="text-3xl font-semibold text-green-800 mb-4">Create beautiful, eco-friendly digital invitations and manage your event</h1>
        <p className="text-lg text-gray-600">RSVPs with ease. Join us in making event planning more sustainable!</p>
      </div>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 px-4">
        {/* Create Feature */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold text-green-700 mb-2">Create</h2>
          <p className="text-sm text-gray-600 mb-2">Design your perfect invitation</p>
          <p className="text-gray-700">Create beautiful digital invitations for any occasion. Customize colors, add photos, and make it uniquely yours.</p>
        </div>

        {/* Share Feature */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold text-green-700 mb-2">Share</h2>
          <p className="text-sm text-gray-600 mb-2">Spread the word</p>
          <p className="text-gray-700">Share your invitation link with guests via email, social media, or messaging apps. No paper waste!</p>
        </div>

        {/* Manage Feature */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold text-green-700 mb-2">Manage</h2>
          <p className="text-sm text-gray-600 mb-2">Track responses easily</p>
          <p className="text-gray-700">Keep track of RSVPs, manage guest lists, and communicate with attendees all in one place.</p>
        </div>
      </div>

      {/* CTA Button */}
      <div className="text-center mt-12">
        <Link href="/event">
          <button className="bg-green-600 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-green-700 transition-colors">
            Create Your Greenvite
          </button>
        </Link>
      </div>
    </main>
  )
}
