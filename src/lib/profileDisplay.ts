"use client";

import { readStoredJson, removeStoredValue, writeStoredJson } from "@/src/lib/browserStorage";

export const PROFILE_DISPLAY_UPDATED_EVENT = "profile-display-updated";

const PROFILE_DISPLAY_KEY_PREFIX = "profile-display";

export type StoredProfileDisplay = {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
};

export function getProfileDisplayStorageKey(userId: string) {
  return `${PROFILE_DISPLAY_KEY_PREFIX}:${userId}`;
}

export function readProfileDisplay(userId: string) {
  return readStoredJson<StoredProfileDisplay>(getProfileDisplayStorageKey(userId));
}

export function writeProfileDisplay(
  userId: string,
  value: Omit<StoredProfileDisplay, "userId">
) {
  cacheProfileDisplay(userId, value);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(PROFILE_DISPLAY_UPDATED_EVENT, {
        detail: { userId },
      })
    );
  }
}

export function cacheProfileDisplay(
  userId: string,
  value: Omit<StoredProfileDisplay, "userId">
) {
  writeStoredJson<StoredProfileDisplay>(getProfileDisplayStorageKey(userId), {
    userId,
    ...value,
  });
}

export function clearProfileDisplay(userId: string) {
  removeStoredValue(getProfileDisplayStorageKey(userId));

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(PROFILE_DISPLAY_UPDATED_EVENT, {
        detail: { userId },
      })
    );
  }
}
