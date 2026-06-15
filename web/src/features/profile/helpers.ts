import type { EmployeeProfile, EmployeeRecord, SkillLevel } from '@/features/profile/api';

/** Build a display full name from a profile, gracefully handling nulls. */
export function profileFullName(p?: EmployeeProfile | null): string {
  if (!p) return '—';
  return [p.firstName, p.middleName, p.lastName, p.suffix].filter(Boolean).join(' ').trim() || '—';
}

const HUMANIZE = (v?: string | null): string =>
  v ? v.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : '—';

export const genderLabel = HUMANIZE;
export const civilStatusLabel = HUMANIZE;
export const employmentTypeLabel = HUMANIZE;
export const documentTypeLabel = HUMANIZE;

export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert',
};

/**
 * Compute a simple profile-completion percentage from the personal section.
 * (Mirrors the spirit of the dashboard's profileCompletion without needing the
 * dashboard endpoint.)
 */
export function computeProfileCompletion(p?: EmployeeProfile | null): {
  percentage: number;
  filled: number;
  total: number;
} {
  const fields: (keyof EmployeeProfile)[] = [
    'firstName',
    'lastName',
    'dateOfBirth',
    'gender',
    'civilStatus',
    'nationality',
    'contactNumber',
    'email',
    'currentAddress',
    'permanentAddress',
    'photoUrl',
  ];
  if (!p) return { percentage: 0, filled: 0, total: fields.length };
  const filled = fields.filter((f) => {
    const v = p[f];
    return v !== null && v !== undefined && String(v).trim().length > 0;
  }).length;
  return {
    percentage: Math.round((filled / fields.length) * 100),
    filled,
    total: fields.length,
  };
}

/** A short "Position · Department" subtitle for the header. */
export function positionDepartment(emp?: EmployeeRecord | null): string {
  if (!emp) return '—';
  const parts = [emp.position?.title, emp.department?.name].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}
