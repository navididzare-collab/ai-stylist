// lib/useAuth.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import { AuthUser, getUser, setUser as saveUser, clearUser, subscribeToAuthChanges } from "@/lib/auth";

export function useAuth() {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUserState(getUser());
    setReady(true);

    const unsubscribe = subscribeToAuthChanges(() => {
      setUserState(getUser());
    });

    return unsubscribe;
  }, []);

  const login = useCallback((newUser: AuthUser) => {
    saveUser(newUser);
    setUserState(newUser);
  }, []);

  const logout = useCallback(() => {
    clearUser();
    setUserState(null);
  }, []);

  return { user, isLoggedIn: !!user, ready, login, logout };
}