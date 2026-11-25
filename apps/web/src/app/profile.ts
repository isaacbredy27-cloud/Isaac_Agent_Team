import { CandidateProfileSchema, type CandidateProfile } from "@schemas";

/** ADR 0004: the profile lives only in this browser. */
export const PROFILE_KEY = "fmo.profile";

export function loadProfile(): CandidateProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = CandidateProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: CandidateProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  localStorage.removeItem(PROFILE_KEY);
}
