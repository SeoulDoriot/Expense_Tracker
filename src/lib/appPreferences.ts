"use client";

import {
  readStoredJson,
  writeStoredJson,
} from "@/src/lib/browserStorage";

export type AppCurrency = "USD" | "KHR";
export type AppLanguage = "en" | "km";
export type AppTheme = "light" | "dark";

export type AppSettings = {
  currency: AppCurrency;
  language: AppLanguage;
  theme: AppTheme;
  budget_alert: boolean;
  weekly_summary: boolean;
  daily_reminder: boolean;
};

export type StoredAppPreferences = {
  plan: "Free" | "Pro";
  settings: AppSettings;
};

export const PROFILE_PREFERENCES_KEY = "profile-page-preferences";
export const APP_PREFERENCES_UPDATED_EVENT = "app-preferences-updated";
export const USD_TO_KHR_RATE = 4100;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  currency: "USD",
  language: "en",
  theme: "light",
  budget_alert: true,
  weekly_summary: true,
  daily_reminder: false,
};

const COPY = {
  en: {
    dashboard: "Dashboard",
    transactions: "Transactions",
    goals: "Goals",
    reports: "Reports",
    search: "Search",
    account: "Account",
    profileSettings: "Profile settings",
    savingsGoals: "Savings goals",
    logout: "Log out",
    smart: "Smart",
    expense: "Expense",
    english: "English",
    khmer: "Khmer",
    light: "Light",
    dark: "Dark",
  },
  km: {
    dashboard: "ផ្ទាំងគ្រប់គ្រង",
    transactions: "ប្រតិបត្តិការ",
    goals: "គោលដៅ",
    reports: "របាយការណ៍",
    search: "ស្វែងរក",
    account: "គណនី",
    profileSettings: "ការកំណត់ប្រវត្តិរូប",
    savingsGoals: "គោលដៅសន្សំ",
    logout: "ចាកចេញ",
    smart: "Smart",
    expense: "Expense",
    english: "អង់គ្លេស",
    khmer: "ខ្មែរ",
    light: "ភ្លឺ",
    dark: "ងងឹត",
  },
} as const;

export function getPreferencesStorageKey(userId: string) {
  return `${PROFILE_PREFERENCES_KEY}:${userId}`;
}

export function sanitizeAppSettings(settings?: Partial<AppSettings> | null): AppSettings {
  return {
    currency: settings?.currency === "KHR" ? "KHR" : "USD",
    language: settings?.language === "km" ? "km" : "en",
    theme: settings?.theme === "dark" ? "dark" : "light",
    budget_alert: settings?.budget_alert ?? DEFAULT_APP_SETTINGS.budget_alert,
    weekly_summary: settings?.weekly_summary ?? DEFAULT_APP_SETTINGS.weekly_summary,
    daily_reminder: settings?.daily_reminder ?? DEFAULT_APP_SETTINGS.daily_reminder,
  };
}

export function readAppPreferences(userId: string) {
  const stored = readStoredJson<StoredAppPreferences>(getPreferencesStorageKey(userId));
  if (!stored) {
    return null;
  }

  return {
    plan: stored.plan === "Pro" ? "Pro" : "Free",
    settings: sanitizeAppSettings(stored.settings),
  } satisfies StoredAppPreferences;
}

export function writeAppPreferences(userId: string, preferences: StoredAppPreferences) {
  const value: StoredAppPreferences = {
    plan: preferences.plan === "Pro" ? "Pro" : "Free",
    settings: sanitizeAppSettings(preferences.settings),
  };

  writeStoredJson<StoredAppPreferences>(getPreferencesStorageKey(userId), value);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(APP_PREFERENCES_UPDATED_EVENT, {
        detail: { userId, settings: value.settings },
      })
    );
  }
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.body.dataset.theme = theme;
}

export function applyLanguage(language: AppLanguage) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = language;
}

export function applyAppSettings(settings: AppSettings) {
  applyTheme(settings.theme);
  applyLanguage(settings.language);
}

export function convertUsdToCurrency(amount: number, currency: AppCurrency) {
  if (currency === "KHR") {
    return amount * USD_TO_KHR_RATE;
  }

  return amount;
}

export function convertCurrencyToUsd(amount: number, currency: AppCurrency) {
  if (currency === "KHR") {
    return amount / USD_TO_KHR_RATE;
  }

  return amount;
}

export function getCurrencySymbol(currency: AppCurrency) {
  return currency === "KHR" ? "៛" : "$";
}

export function getCurrencyCode(currency: AppCurrency) {
  return currency;
}

export function getLocaleForLanguage(language: AppLanguage) {
  return language === "km" ? "km-KH" : "en-US";
}

export function formatAppCurrency(
  amountUsd: number,
  currency: AppCurrency,
  language: AppLanguage,
  options?: {
    signed?: boolean;
    maximumFractionDigits?: number;
  }
) {
  const converted = convertUsdToCurrency(amountUsd, currency);
  const absolute = Math.abs(converted);
  const maximumFractionDigits =
    options?.maximumFractionDigits ?? (currency === "KHR" ? 0 : 2);
  const formatted = absolute.toLocaleString(getLocaleForLanguage(language), {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits === 0 ? 0 : 0,
  });
  const sign =
    options?.signed
      ? amountUsd > 0
        ? "+"
        : amountUsd < 0
        ? "-"
        : ""
      : "";

  return currency === "KHR"
    ? `${sign}${formatted}${getCurrencySymbol(currency)}`
    : `${sign}${getCurrencySymbol(currency)}${formatted}`;
}

export function translateAppLabel(
  language: AppLanguage,
  key: keyof typeof COPY.en
) {
  return COPY[language][key];
}
