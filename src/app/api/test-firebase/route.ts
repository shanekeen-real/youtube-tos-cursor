import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { app } from '../../../lib/firebase';

export async function GET(req: NextRequest) {
  try {
    const results: any = {
      firebase_app: '✅ Connected',
      auth: '❌ Not tested',
      firestore: '❌ Not tested',
      environment_vars: '❌ Not tested'
    };

    // Test 1: Check if Firebase app initializes
    if (app) {
      results.firebase_app = '✅ Connected';
    } else {
      results.firebase_app = '❌ Failed to connect';
      return NextResponse.json({ error: 'Firebase app not initialized', results });
    }

    // Test 2: Check environment variables
    const requiredVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length === 0) {
      results.environment_vars = '✅ All variables present';
    } else {
      results.environment_vars = `❌ Missing: ${missingVars.join(', ')}`;
    }

    // Test 3: Check Authentication
    try {
      const auth = getAuth(app);
      if (auth) {
        results.auth = '✅ Auth service available';
      } else {
        results.auth = '❌ Auth service failed';
      }
    } catch (error) {
      results.auth = `❌ Auth error: ${error}`;
    }

    // Test 4: Check Firestore
    try {
      const db = getFirestore(app);
      if (db) {
        results.firestore = '✅ Firestore service available';
      } else {
        results.firestore = '❌ Firestore service failed';
      }
    } catch (error) {
      results.firestore = `❌ Firestore error: ${error}`;
    }

    return NextResponse.json({ 
      message: 'Firebase configuration test results',
      results,
      project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not set'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      results: {
        firebase_app: '❌ Failed',
        auth: '❌ Not tested',
        firestore: '❌ Not tested',
        environment_vars: '❌ Not tested'
      }
    });
  }
} 