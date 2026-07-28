"use client";

import { useEffect, useState, useCallback } from "react";
import { AuthUser, getUser, setAuth as saveAuth, clearAuth, subscribeToAuthChanges, getToken } from "@/lib/auth";

export function useAuth() {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUserState(getUser());
    setTokenState(getToken());
    setReady(true);

    const unsubscribe = subscribeToAuthChanges(() => {
      setUserState(getUser());
      setTokenState(getToken());
    });

    return unsubscribe;
  }, []);

  const login = useCallback((newUser: AuthUser, newToken: string) => {
    saveAuth(newUser, newToken);
    setUserState(newUser);
    setTokenState(newToken);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUserState(null);
    setTokenState(null);
    // رفرش صفحه برای پاک کردن همه کش‌ها
    window.location.reload();
  }, []);

  return { user, token, isLoggedIn: !!user, ready, login, logout };
}