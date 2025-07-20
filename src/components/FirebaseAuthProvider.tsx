"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { app } from "@/lib/firebase";

// Google API types
interface GoogleAuth2 {
  init(params: { client_id: string }): Promise<void>;
  getAuthInstance(): GoogleAuth;
}

interface GoogleAuth {
  isSignedIn: {
    get(): boolean;
    listen(listener: (signedIn: boolean) => void): void;
  };
  signIn(): Promise<GoogleUser>;
  signOut(): Promise<void>;
  currentUser: {
    get(): GoogleUser | null;
  };
}

interface GoogleUser {
  getId(): string;
  getBasicProfile(): {
    getName(): string;
    getEmail(): string;
    getImageUrl(): string;
  };
  getAuthResponse(): {
    access_token: string;
    id_token: string;
  };
}

interface GoogleAPI {
  load(api: string, callback: () => void): void;
  auth2: GoogleAuth2;
}

// Add global type for gapi to fix TS errors
declare global {
  interface Window {
    gapi: GoogleAPI;
  }
}

// Utility to load Google API JS SDK
function loadGapi(): Promise<GoogleAPI> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject('No window');
    if (window.gapi && window.gapi.auth2) return resolve(window.gapi);
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('auth2', () => {
        resolve(window.gapi);
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