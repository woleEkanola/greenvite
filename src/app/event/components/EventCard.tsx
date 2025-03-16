'use client'

import Image from 'next/image'

export default function EventCard() {
  return (
    <div className="relative aspect-[3/4] bg-gradient-to-br from-emerald-100 via-pink-100 to-gray-200 rounded-lg overflow-hidden shadow-xl">
      <Image
        src="/invitation-bg.jpg"
        alt="Abstract background"
        fill
        className="object-cover mix-blend-overlay opacity-80"
        priority
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm p-10 shadow-lg max-w-sm w-full text-center rounded-lg">
          <p className="text-gray-600 mb-4 text-sm tracking-wide">please join us for</p>
          <h1 className="text-4xl mb-6 font-light tracking-widest uppercase">cocktails</h1>
          <p className="text-gray-600 mb-6 tracking-widest text-sm">+ CONVERSATION</p>
          <div className="text-4xl font-light mb-4 tracking-wider">11.18</div>
          <p className="text-gray-600 mb-6 text-sm">5:00-8:00pm</p>
          <div className="text-gray-800 mt-8 space-y-1">
            <p className="font-medium">The Alumnae Bar</p>
            <p className="text-sm tracking-wide">224 W ONTARIO STREET</p>
            <p className="text-sm">West Loop, Chicago</p>
          </div>
        </div>
      </div>
    </div>
  )
}
