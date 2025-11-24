'use client';

import Link from 'next/link';

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <div className="text-6xl font-bold text-gray-300 mb-4">500</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Server Error</h1>
        <p className="text-gray-600 mb-6">
          Sorry, something went wrong on our end. Please try again later.
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}