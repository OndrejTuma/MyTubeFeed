'use client';

import { FaYoutube } from 'react-icons/fa';

export default function Header() {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <FaYoutube className="text-red-600 dark:text-red-500 text-3xl" />
            <span className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-500 dark:from-red-500 dark:to-red-400 bg-clip-text text-transparent">
              MyTubeFeed
            </span>
          </div>
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
          <p className="text-gray-600 dark:text-gray-400">
            Your personalized YouTube channel feed
          </p>
        </div>
      </div>
    </header>
  );
} 