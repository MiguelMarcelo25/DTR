/** Build a display name from a profile-like object. */
export function fullName(
  profile: { firstName?: string | null; middleName?: string | null; lastName?: string | null; suffix?: string | null } | null | undefined,
): string {
  if (!profile) return '—';
  return [profile.firstName, profile.middleName, profile.lastName, profile.suffix]
    .filter(Boolean)
    .join(' ')
    .trim() || '—';
}
