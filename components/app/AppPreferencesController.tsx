"use client";

import { useAppPreferences } from "@/src/hooks/useAppPreferences";

export default function AppPreferencesController() {
  useAppPreferences();
  return null;
}
