import React, { useState } from 'react';
import { User, getAuth, signOut } from 'firebase/auth';
import Button from './Button';
import Link from 'next/link';

interface UserMenuProps {
  user: User;
}

export default function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const handleSignOut = async () => {
    await signOut(getAuth());
  };
  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 px-3 py-1 rounded hover:bg-gray-100 border border-gray-200"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="avatar" className="w-7 h-7 rounded-full" />
        ) : (
          <span className="bg-gray-300 text-[#212121] rounded-full w-7 h-7 flex items-center justify-center font-bold">
            {user.email?.[0]?.toUpperCase() || '?'}
          </span>
        )}
        <span className="font-medium text-[#212121] hidden sm:block">{user.displayName || user.email}</span>
        <span className="ml-1">▼</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded shadow-lg z-50">
          <Link href="/scan-history" legacyBehavior><a className="w-full block text-left px-4 py-2 hover:bg-gray-100 text-[#212121]" onClick={() => setOpen(false)}>Scan History</a></Link>
          <Link href="/settings" legacyBehavior><a className="w-full block text-left px-4 py-2 hover:bg-gray-100 text-[#212121]" onClick={() => setOpen(false)}>Settings</a></Link>
          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-[#212121]" onClick={handleSignOut}>Sign Out</button>
        </div>
      )}
    </div>
  );
} 