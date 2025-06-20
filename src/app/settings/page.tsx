"use client";
import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function SettingsPage() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    if (dark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [dark]);
  return (
    <main className="min-h-screen bg-white flex flex-col items-center px-4 py-8 font-sans">
      <div className="w-full max-w-md bg-white">
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#212121]">Dark Mode</span>
            <Button variant={dark ? 'blue' : 'outlined'} onClick={() => setDark((d) => !d)}>
              {dark ? 'On' : 'Off'}
            </Button>
          </div>
          <div className="text-[#606060] text-sm">More settings coming soon...</div>
        </Card>
      </div>
    </main>
  );
} 