"use client";
import { signIn } from 'next-auth/react';

export default function ConnectYouTubeButton() {
  const handleConnectYouTube = () => {
    signIn('google', {
      callbackUrl: '/dashboard'
    });
  };

  return (
    <button
      onClick={handleConnectYouTube}
      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow"
    >
      Connect YouTube Channel
    </button>
  );
} 