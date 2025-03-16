import React from 'react'

const Success = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-green-100">
      <div className="bg-white p-8 rounded shadow-md">
        <h1 className="text-2xl font-bold text-green-700">Success!</h1>
        <p className="mt-4">Your RSVP has been submitted successfully.</p>
        <a href="/" className="mt-6 inline-block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
          Go back to Home
        </a>
      </div>
    </div>
  )
}

export default Success
