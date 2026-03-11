"use client";

import { useEffect, useState } from "react";
import {
  APP_PREFERENCES_UPDATED_EVENT,
  applyAppSettings,
  DEFAULT_APP_SETTINGS,
  readAppPreferences,
  type AppSettings,
} from "@/src/lib/appPreferences";
import { supabase } from "@/src/lib/supabaseClient";

export function useAppPreferences() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function syncPreferences() {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user;
      const { data } = sessionUser
        ? { data: { user: sessionUser } }
        : await supabase.auth.getUser();

      if (!alive) {
        return;
      }

      const user = data.user;

      if (!user) {
        setUserId(null);
        setSettings(DEFAULT_APP_SETTINGS);
        applyAppSettings(DEFAULT_APP_SETTINGS);
        return;
      }

      setUserId(user.id);
      const stored = readAppPreferences(user.id);
      const nextSettings = stored?.settings ?? DEFAULT_APP_SETTINGS;
      setSettings(nextSettings);
      applyAppSettings(nextSettings);
    }

    void syncPreferences();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void syncPreferences();
    });

    function handlePreferencesUpdate() {
      void syncPreferences();
    }

    function handleStorage(event: StorageEvent) {
      if (event.key?.startsWith("profile-page-preferences:")) {
        void syncPreferences();
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener(APP_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdate);
      window.addEventListener("storage", handleStorage);
    }

    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener(APP_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdate);
        window.removeEventListener("storage", handleStorage);
      }
    };
  }, []);

  return { settings, userId };
}
