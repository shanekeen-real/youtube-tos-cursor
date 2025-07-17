"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { app } from "@/lib/firebase";

// Add global type for gapi to fix TS errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    gapi: any;
  }
}

// Utility to load Google API JS SDK
function loadGapi(): Promise<typeof window.gapi> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject('No window');
    if ((window as any).gapi && (window as any).gapi.auth2) return resolve((window as any).gapi);
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      (window as any).gapi.load('auth2', () => {
        resolve((window as any).gapi);
      });
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

// Remove all unused imports and code related to Firebase Auth, GoogleAuthProvider, or gapi
export default function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
} 