"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { getAuth, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { app } from "@/lib/firebase";

export default function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    const syncFirebaseAuth = async () => {
      if (status !== "authenticated" || !session?.idToken) return;
      const auth = getAuth(app);
      // Only sign in if not already signed in as the correct user
      if (auth.currentUser && auth.currentUser.uid === session.user.id) {
        console.log("[FirebaseAuthProvider] Already signed in as:", auth.currentUser.uid);
        return;
      }
      try {
        const credential = GoogleAuthProvider.credential(session.idToken);
        await signInWithCredential(auth, credential);
        console.log("[FirebaseAuthProvider] Signed in to Firebase Auth as:", auth.currentUser?.uid, auth.currentUser?.email);
      } catch (err) {
        console.error("[FirebaseAuthProvider] Failed to sign in to Firebase Auth:", err, "IDToken:", session.idToken);
      }
    };
    syncFirebaseAuth();
  }, [session, status]);

  return <>{children}</>;
} 