import { useEffect, useState } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, getIdTokenResult } from "firebase/auth";
import { auth } from "../api/firebase";

export function useOwnerAuth() {
  const [state, setState] = useState({ loading: true, user: null, claims: null, error: "" });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ loading: false, user: null, claims: null, error: "" });
        return;
      }
      const token = await getIdTokenResult(user, true);
      setState({ loading: false, user, claims: token.claims || {}, error: "" });
    });
    return () => unsub();
  }, []);

  return {
    ...state,
    login: async (email, password) => {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (e) {
        setState((prev) => ({ ...prev, error: e.message || "Login failed" }));
      }
    },
    logout: () => signOut(auth)
  };
}
