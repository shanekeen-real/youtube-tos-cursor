import React, { useState } from 'react';
import { signOut } from 'next-auth/react';
import Button from './Button';
import Link from 'next/link';

interface UserMenuProps {
  user: any;
}

export default function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };
  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 px-3 py-1 rounded hover:bg-gray-100 border border-gray-200"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {user.image ? (
          <img src={user.image} alt="avatar" className="w-7 h-7 rounded-full" />
        ) : (
          <span className="bg-gray-300 text-[#212121] rounded-full w-7 h-7 flex items-center justify-center font-bold">
            {user.email?.[0]?.toUpperCase() || '?'}
          </span>
        )}
        <span className="font-medium text-[#212121] hidden sm:block">{user.name || user.email}</span>
        <span className="ml-1">▼</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded shadow-lg z-50">
          <Link href="/dashboard" className="w-full block text-left px-4 py-2 hover:bg-gray-100 text-[#212121]" onClick={() => setOpen(false)}>Dashboard</Link>
          <Link href="/scan-history" className="w-full block text-left px-4 py-2 hover:bg-gray-100 text-[#212121]" onClick={() => setOpen(false)}>Scan History</Link>
          <Link href="/settings" className="w-full block text-left px-4 py-2 hover:bg-gray-100 text-[#212121]" onClick={() => setOpen(false)}>Settings</Link>
          <div className="border-t border-gray-100 my-1"></div>
          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-[#212121]" onClick={handleSignOut}>Sign Out</button>
        </div>
      )}
    </div>
  );
} 