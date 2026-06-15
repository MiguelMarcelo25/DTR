import type { Request } from 'express';
import { Prisma, type NotificationType, type TimelineEventType } from '@prisma/client';
import prisma from '../config/prisma';
import { MODULES } from '../config/constants';
import type { AuthUser, PaginationParams } from '../types';
import { ensureSelfOrPrivileged, isPrivileged } from '../utils/access';
import { badRequest, forbidden, notFound } from '../utils/errors';
import { audit } from '../utils/audit';
import { notify, userIdForEmployee } from '../utils/notify';
import { buildMeta, buildOrderBy } from '../utils/pagination';
import {
  buildObjectPath,
  removeObject,
  uploadBuffer,
  type StoredFile,
} from '../utils/storage';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

/** Sensitive government / payroll fields redacted from non-privileged readers. */
const SENSITIVE_PROFILE_FIELDS = [
  'tin',
  'sss',
  'philhealth',
  'pagibig',
  'bankName',
  'bankAccountNumber',
  'basicSalary',
  'allowances',
  'salaryType',
  'taxStatus',
] as const;

const GOV_FIELDS = ['tin', 'sss', 'philhealth', 'pagibig'] as const;
const BANK_FIELDS = ['bankName', 'bankAccountNumber'] as const;
const SALARY_FIELDS = ['basicSalary', 'allowances', 'salaryType', 'taxStatus'] as const;

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

async function getEmployeeOrThrow(employeeId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.deletedAt) throw notFound('Employee not found');
  return employee;
}

/** Append an activity timeline entry. */
async function addTimeline(
  employeeId: string,
  eventType: TimelineEventType,
  description: string,
  createdById: string | null,
  metadata?: Record<string, unknown>,
) {
  await prisma.employeeActivityTimeline.create({
    data: {
      employeeId,
      eventType,
      description,
      createdById,
      metadata: metadata === undefined ? undefined : (metadata as Prisma.InputJsonValue),
    },
  });
}

/** Strip sensitive fields from a profile object for non-privileged readers. */
function redactProfile<T extends Record<string, unknown>>(profile: T, user: AuthUser): T {
  if (isPrivileged(user)) return profile;
  const copy: Record<string, unknown> = { ...profile };
  for (const field of SENSITIVE_PROFILE_FIELDS) delete copy[field];
  return copy as T;
}

interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

// ─────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────

export async function getProfile(user: AuthUser, employeeId: string) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);

  const profile = await prisma.employeeProfile.findUnique({ where: { employeeId } });
  if (!profile) throw notFound('Profile not found');

  return redactProfile(profile as unknown as Record<string, unknown>, user);
}

export async function updateProfile(
  req: Request,
  user: AuthUser,
  employeeId: string,
  data: Record<string, unknown>,
) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);

  const existing = await prisma.employeeProfile.findUnique({ where: { employeeId } });
  if (!existing) throw notFound('Profile not found');

  const changedKeys = Object.keys(data).filter(
    (k) =>
      (existing as Record<string, unknown>)[k] !== undefined ||
      (data as Record<string, unknown>)[k] !== undefined,
  );

  const updated = await prisma.employeeProfile.update({
    where: { employeeId },
    data: data as Prisma.EmployeeProfileUpdateInput,
  });

  const touchedGov = GOV_FIELDS.some((f) => f in data);
  const touchedBank = BANK_FIELDS.some((f) => f in data);
  const touchedSalary = SALARY_FIELDS.some((f) => f in data);

  await audit(req, {
    action: 'PROFILE_UPDATED',
    module: MODULES.PROFILE,
    description: `Profile updated for employee ${employeeId}`,
    employeeId,
    oldValues: existing,
    newValues: updated,
  });
  if (touchedGov) {
    await audit(req, {
      action: 'GOV_INFO_UPDATED',
      module: MODULES.PROFILE,
      description: `Government info updated for employee ${employeeId}`,
      employeeId,
    });
  }
  if (touchedBank) {
    await audit(req, {
      action: 'BANK_INFO_UPDATED',
      module: MODULES.PROFILE,
      description: `Bank info updated for employee ${employeeId}`,
      employeeId,
    });
  }

  await addTimeline(employeeId, 'PROFILE_UPDATED', 'Profile information updated', user.id, {
    fields: changedKeys,
  });
  if (touchedSalary) {
    await addTimeline(employeeId, 'SALARY_UPDATED', 'Salary / compensation updated', user.id);
  }

  return updated;
}

export async function updateProfilePhoto(
  req: Request,
  user: AuthUser,
  employeeId: string,
  file: UploadedFile,
) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);

  const existing = await prisma.employeeProfile.findUnique({ where: { employeeId } });
  if (!existing) throw notFound('Profile not found');

  const path = buildObjectPath('photos', employeeId, file.originalname);
  const stored: StoredFile = await uploadBuffer(path, file.buffer, file.mimetype);

  // Best-effort cleanup of any previous photo.
  if (existing.photoPath && existing.photoPath !== stored.path) {
    await removeObject(existing.photoPath).catch(() => undefined);
  }

  const updated = await prisma.employeeProfile.update({
    where: { employeeId },
    data: { photoUrl: stored.url, photoPath: stored.path },
  });

  await audit(req, {
    action: 'PROFILE_PHOTO_UPDATED',
    module: MODULES.PROFILE,
    description: `Profile photo updated for employee ${employeeId}`,
    employeeId,
  });
  await addTimeline(employeeId, 'PROFILE_UPDATED', 'Profile photo updated', user.id);

  return redactProfile(updated as unknown as Record<string, unknown>, user);
}

// ─────────────────────────────────────────────────────────────
// Emergency contacts
// ─────────────────────────────────────────────────────────────

export async function listEmergencyContacts(user: AuthUser, employeeId: string) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);
  return prisma.employeeEmergencyContact.findMany({
    where: { employeeId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createEmergencyContact(
  req: Request,
  user: AuthUser,
  employeeId: string,
  data: { isPrimary?: boolean } & Record<string, unknown>,
) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);

  const created = await prisma.$transaction(async (tx) => {
    if (data.isPrimary) {
      await tx.employeeEmergencyContact.updateMany({
        where: { employeeId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    return tx.employeeEmergencyContact.create({
      data: { ...(data as Prisma.EmployeeEmergencyContactCreateManyInput), employeeId },
    });
  });

  await audit(req, {
    action: 'EMERGENCY_CONTACT_ADDED',
    module: MODULES.PROFILE,
    description: `Emergency contact added for employee ${employeeId}`,
    employeeId,
    newValues: created,
  });
  return created;
}

export async function updateEmergencyContact(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
  data: { isPrimary?: boolean } & Record<string, unknown>,
) {
  ensureSelfOrPrivileged(user, employeeId);
  const existing = await prisma.employeeEmergencyContact.findFirst({
    where: { id: childId, employeeId },
  });
  if (!existing) throw notFound('Emergency contact not found');

  const updated = await prisma.$transaction(async (tx) => {
    if (data.isPrimary) {
      await tx.employeeEmergencyContact.updateMany({
        where: { employeeId, isPrimary: true, id: { not: childId } },
        data: { isPrimary: false },
      });
    }
    return tx.employeeEmergencyContact.update({
      where: { id: childId },
      data: data as Prisma.EmployeeEmergencyContactUpdateInput,
    });
  });

  await audit(req, {
    action: 'EMERGENCY_CONTACT_UPDATED',
    module: MODULES.PROFILE,
    description: `Emergency contact updated for employee ${employeeId}`,
    employeeId,
    oldValues: existing,
    newValues: updated,
  });
  return updated;
}

export async function deleteEmergencyContact(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
) {
  ensureSelfOrPrivileged(user, employeeId);
  const existing = await prisma.employeeEmergencyContact.findFirst({
    where: { id: childId, employeeId },
  });
  if (!existing) throw notFound('Emergency contact not found');

  await prisma.employeeEmergencyContact.delete({ where: { id: childId } });
  await audit(req, {
    action: 'EMERGENCY_CONTACT_DELETED',
    module: MODULES.PROFILE,
    description: `Emergency contact deleted for employee ${employeeId}`,
    employeeId,
    oldValues: existing,
  });
}

// ─────────────────────────────────────────────────────────────
// Dependents
// ─────────────────────────────────────────────────────────────

export async function listDependents(user: AuthUser, employeeId: string) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);
  return prisma.employeeDependent.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createDependent(
  req: Request,
  user: AuthUser,
  employeeId: string,
  data: Record<string, unknown>,
) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);
  const created = await prisma.employeeDependent.create({
    data: { ...(data as Prisma.EmployeeDependentCreateManyInput), employeeId },
  });
  await audit(req, {
    action: 'DEPENDENT_ADDED',
    module: MODULES.PROFILE,
    description: `Dependent added for employee ${employeeId}`,
    employeeId,
    newValues: created,
  });
  return created;
}

export async function updateDependent(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
  data: Record<string, unknown>,
) {
  ensureSelfOrPrivileged(user, employeeId);
  const existing = await prisma.employeeDependent.findFirst({ where: { id: childId, employeeId } });
  if (!existing) throw notFound('Dependent not found');
  const updated = await prisma.employeeDependent.update({
    where: { id: childId },
    data: data as Prisma.EmployeeDependentUpdateInput,
  });
  await audit(req, {
    action: 'DEPENDENT_UPDATED',
    module: MODULES.PROFILE,
    description: `Dependent updated for employee ${employeeId}`,
    employeeId,
    oldValues: existing,
    newValues: updated,
  });
  return updated;
}

export async function deleteDependent(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
) {
  ensureSelfOrPrivileged(user, employeeId);
  const existing = await prisma.employeeDependent.findFirst({ where: { id: childId, employeeId } });
  if (!existing) throw notFound('Dependent not found');
  await prisma.employeeDependent.delete({ where: { id: childId } });
  await audit(req, {
    action: 'DEPENDENT_DELETED',
    module: MODULES.PROFILE,
    description: `Dependent deleted for employee ${employeeId}`,
    employeeId,
    oldValues: existing,
  });
}

// ─────────────────────────────────────────────────────────────
// Education
// ─────────────────────────────────────────────────────────────

export async function listEducation(user: AuthUser, employeeId: string) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);
  return prisma.employeeEducation.findMany({
    where: { employeeId },
    orderBy: [{ yearGraduated: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createEducation(
  req: Request,
  user: AuthUser,
  employeeId: string,
  data: Record<string, unknown>,
) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);
  const created = await prisma.employeeEducation.create({
    data: { ...(data as Prisma.EmployeeEducationCreateManyInput), employeeId },
  });
  await audit(req, {
    action: 'EDUCATION_ADDED',
    module: MODULES.PROFILE,
    description: `Education added for employee ${employeeId}`,
    employeeId,
    newValues: created,
  });
  return created;
}

export async function updateEducation(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
  data: Record<string, unknown>,
) {
  ensureSelfOrPrivileged(user, employeeId);
  const existing = await prisma.employeeEducation.findFirst({ where: { id: childId, employeeId } });
  if (!existing) throw notFound('Education record not found');
  const updated = await prisma.employeeEducation.update({
    where: { id: childId },
    data: data as Prisma.EmployeeEducationUpdateInput,
  });
  await audit(req, {
    action: 'EDUCATION_UPDATED',
    module: MODULES.PROFILE,
    description: `Education updated for employee ${employeeId}`,
    employeeId,
    oldValues: existing,
    newValues: updated,
  });
  return updated;
}

export async function deleteEducation(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
) {
  ensureSelfOrPrivileged(user, employeeId);
  const existing = await prisma.employeeEducation.findFirst({ where: { id: childId, employeeId } });
  if (!existing) throw notFound('Education record not found');
  await prisma.employeeEducation.delete({ where: { id: childId } });
  await audit(req, {
    action: 'EDUCATION_DELETED',
    module: MODULES.PROFILE,
    description: `Education deleted for employee ${employeeId}`,
    employeeId,
    oldValues: existing,
  });
}

// ─────────────────────────────────────────────────────────────
// Work experience
// ─────────────────────────────────────────────────────────────

export async function listWorkExperience(user: AuthUser, employeeId: string) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);
  return prisma.employeeWorkExperience.findMany({
    where: { employeeId },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createWorkExperience(
  req: Request,
  user: AuthUser,
  employeeId: string,
  data: Record<string, unknown>,
) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);
  const created = await prisma.employeeWorkExperience.create({
    data: { ...(data as Prisma.EmployeeWorkExperienceCreateManyInput), employeeId },
  });
  await audit(req, {
    action: 'WORK_EXPERIENCE_ADDED',
    module: MODULES.PROFILE,
    description: `Work experience added for employee ${employeeId}`,
    employeeId,
    newValues: created,
  });
  return created;
}

export async function updateWorkExperience(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
  data: Record<string, unknown>,
) {
  ensureSelfOrPrivileged(user, employeeId);
  const existing = await prisma.employeeWorkExperience.findFirst({
    where: { id: childId, employeeId },
  });
  if (!existing) throw notFound('Work experience not found');
  const updated = await prisma.employeeWorkExperience.update({
    where: { id: childId },
    data: data as Prisma.EmployeeWorkExperienceUpdateInput,
  });
  await audit(req, {
    action: 'WORK_EXPERIENCE_UPDATED',
    module: MODULES.PROFILE,
    description: `Work experience updated for employee ${employeeId}`,
    employeeId,
    oldValues: existing,
    newValues: updated,
  });
  return updated;
}

export async function deleteWorkExperience(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
) {
  ensureSelfOrPrivileged(user, employeeId);
  const existing = await prisma.employeeWorkExperience.findFirst({
    where: { id: childId, employeeId },
  });
  if (!existing) throw notFound('Work experience not found');
  await prisma.employeeWorkExperience.delete({ where: { id: childId } });
  await audit(req, {
    action: 'WORK_EXPERIENCE_DELETED',
    module: MODULES.PROFILE,
    description: `Work experience deleted for employee ${employeeId}`,
    employeeId,
    oldValues: existing,
  });
}

// ─────────────────────────────────────────────────────────────
// Skills
// ─────────────────────────────────────────────────────────────

export async function listSkills(user: AuthUser, employeeId: string) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);
  return prisma.employeeSkill.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createSkill(
  req: Request,
  user: AuthUser,
  employeeId: string,
  data: Record<string, unknown>,
) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);
  const created = await prisma.employeeSkill.create({
    data: { ...(data as Prisma.EmployeeSkillCreateManyInput), employeeId },
  });
  await audit(req, {
    action: 'SKILL_ADDED',
    module: MODULES.PROFILE,
    description: `Skill added for employee ${employeeId}`,
    employeeId,
    newValues: created,
  });
  return created;
}

export async function updateSkill(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
  data: Record<string, unknown>,
) {
  ensureSelfOrPrivileged(user, employeeId);
  const existing = await prisma.employeeSkill.findFirst({ where: { id: childId, employeeId } });
  if (!existing) throw notFound('Skill not found');
  const updated = await prisma.employeeSkill.update({
    where: { id: childId },
    data: data as Prisma.EmployeeSkillUpdateInput,
  });
  await audit(req, {
    action: 'SKILL_UPDATED',
    module: MODULES.PROFILE,
    description: `Skill updated for employee ${employeeId}`,
    employeeId,
    oldValues: existing,
    newValues: updated,
  });
  return updated;
}

export async function deleteSkill(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
) {
  ensureSelfOrPrivileged(user, employeeId);
  const existing = await prisma.employeeSkill.findFirst({ where: { id: childId, employeeId } });
  if (!existing) throw notFound('Skill not found');
  await prisma.employeeSkill.delete({ where: { id: childId } });
  await audit(req, {
    action: 'SKILL_DELETED',
    module: MODULES.PROFILE,
    description: `Skill deleted for employee ${employeeId}`,
    employeeId,
    oldValues: existing,
  });
}

// ─────────────────────────────────────────────────────────────
// Trainings
// ─────────────────────────────────────────────────────────────

export async function listTrainings(user: AuthUser, employeeId: string) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);
  return prisma.employeeTraining.findMany({
    where: { employeeId },
    orderBy: [{ dateCompleted: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createTraining(
  req: Request,
  user: AuthUser,
  employeeId: string,
  data: Record<string, unknown>,
) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);
  const created = await prisma.employeeTraining.create({
    data: { ...(data as Prisma.EmployeeTrainingCreateManyInput), employeeId },
  });
  await audit(req, {
    action: 'TRAINING_ADDED',
    module: MODULES.PROFILE,
    description: `Training added for employee ${employeeId}`,
    employeeId,
    newValues: created,
  });
  return created;
}

export async function updateTraining(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
  data: Record<string, unknown>,
) {
  ensureSelfOrPrivileged(user, employeeId);
  const existing = await prisma.employeeTraining.findFirst({ where: { id: childId, employeeId } });
  if (!existing) throw notFound('Training not found');
  const updated = await prisma.employeeTraining.update({
    where: { id: childId },
    data: data as Prisma.EmployeeTrainingUpdateInput,
  });
  await audit(req, {
    action: 'TRAINING_UPDATED',
    module: MODULES.PROFILE,
    description: `Training updated for employee ${employeeId}`,
    employeeId,
    oldValues: existing,
    newValues: updated,
  });
  return updated;
}

export async function deleteTraining(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
) {
  ensureSelfOrPrivileged(user, employeeId);
  const existing = await prisma.employeeTraining.findFirst({ where: { id: childId, employeeId } });
  if (!existing) throw notFound('Training not found');
  await prisma.employeeTraining.delete({ where: { id: childId } });
  await audit(req, {
    action: 'TRAINING_DELETED',
    module: MODULES.PROFILE,
    description: `Training deleted for employee ${employeeId}`,
    employeeId,
    oldValues: existing,
  });
}

// ─────────────────────────────────────────────────────────────
// Documents
// ─────────────────────────────────────────────────────────────

export async function listDocuments(
  user: AuthUser,
  employeeId: string,
  params: PaginationParams,
  filters: { documentType?: string; includeDeleted?: boolean },
) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);

  const where: Prisma.EmployeeDocumentWhereInput = {
    employeeId,
    ...(filters.includeDeleted ? {} : { deletedAt: null }),
    ...(filters.documentType ? { documentType: filters.documentType as never } : {}),
    ...(params.search
      ? { documentName: { contains: params.search, mode: 'insensitive' as const } }
      : {}),
  };

  const orderBy = buildOrderBy(
    params,
    ['createdAt', 'documentName', 'documentType', 'expirationDate'],
    'createdAt',
  );

  const [total, items] = await Promise.all([
    prisma.employeeDocument.count({ where }),
    prisma.employeeDocument.findMany({ where, orderBy, skip: params.skip, take: params.take }),
  ]);

  return { items, meta: buildMeta(total, params) };
}

export async function createDocument(
  req: Request,
  user: AuthUser,
  employeeId: string,
  file: UploadedFile,
  data: { documentName: string; documentType?: string; remarks?: string | null; expirationDate?: Date | null },
) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);

  const path = buildObjectPath('documents', employeeId, file.originalname);
  const stored: StoredFile = await uploadBuffer(path, file.buffer, file.mimetype);

  const created = await prisma.employeeDocument.create({
    data: {
      employeeId,
      documentName: data.documentName,
      documentType: (data.documentType ?? 'OTHER') as never,
      fileUrl: stored.url,
      filePath: stored.path,
      uploadedById: user.id,
      remarks: data.remarks ?? null,
      expirationDate: data.expirationDate ?? null,
    },
  });

  await audit(req, {
    action: 'DOCUMENT_UPLOADED',
    module: MODULES.PROFILE,
    description: `Document "${data.documentName}" uploaded for employee ${employeeId}`,
    employeeId,
    newValues: { id: created.id, documentName: created.documentName, documentType: created.documentType },
  });
  await addTimeline(employeeId, 'DOCUMENT_UPLOADED', `Document uploaded: ${data.documentName}`, user.id, {
    documentId: created.id,
  });

  return created;
}

export async function updateDocument(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
  data: Record<string, unknown>,
) {
  ensureSelfOrPrivileged(user, employeeId);
  const existing = await prisma.employeeDocument.findFirst({
    where: { id: childId, employeeId, deletedAt: null },
  });
  if (!existing) throw notFound('Document not found');
  const updated = await prisma.employeeDocument.update({
    where: { id: childId },
    data: data as Prisma.EmployeeDocumentUpdateInput,
  });
  await audit(req, {
    action: 'DOCUMENT_UPDATED',
    module: MODULES.PROFILE,
    description: `Document updated for employee ${employeeId}`,
    employeeId,
    oldValues: existing,
    newValues: updated,
  });
  return updated;
}

export async function deleteDocument(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
) {
  ensureSelfOrPrivileged(user, employeeId);
  const existing = await prisma.employeeDocument.findFirst({
    where: { id: childId, employeeId, deletedAt: null },
  });
  if (!existing) throw notFound('Document not found');

  // Best-effort storage cleanup before the soft delete.
  if (existing.filePath) await removeObject(existing.filePath).catch(() => undefined);

  await prisma.employeeDocument.update({
    where: { id: childId },
    data: { deletedAt: new Date() },
  });

  await audit(req, {
    action: 'DOCUMENT_DELETED',
    module: MODULES.PROFILE,
    description: `Document deleted for employee ${employeeId}`,
    employeeId,
    oldValues: existing,
  });
}

// ─────────────────────────────────────────────────────────────
// Medical records (privileged only, audited)
// ─────────────────────────────────────────────────────────────

export async function listMedicalRecords(req: Request, user: AuthUser, employeeId: string) {
  if (!isPrivileged(user)) throw forbidden('You do not have permission to view medical records');
  await getEmployeeOrThrow(employeeId);

  const records = await prisma.employeeMedicalRecord.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
  });

  await audit(req, {
    action: 'SENSITIVE_PROFILE_VIEWED',
    module: MODULES.PROFILE,
    description: `Medical records viewed for employee ${employeeId}`,
    employeeId,
  });
  return records;
}

export async function createMedicalRecord(
  req: Request,
  user: AuthUser,
  employeeId: string,
  data: Record<string, unknown>,
) {
  if (!isPrivileged(user)) throw forbidden('You do not have permission to manage medical records');
  await getEmployeeOrThrow(employeeId);
  const created = await prisma.employeeMedicalRecord.create({
    data: {
      ...(data as Prisma.EmployeeMedicalRecordCreateManyInput),
      employeeId,
      createdById: user.id,
    },
  });
  await audit(req, {
    action: 'MEDICAL_RECORD_ADDED',
    module: MODULES.PROFILE,
    description: `Medical record added for employee ${employeeId}`,
    employeeId,
  });
  return created;
}

export async function updateMedicalRecord(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
  data: Record<string, unknown>,
) {
  if (!isPrivileged(user)) throw forbidden('You do not have permission to manage medical records');
  const existing = await prisma.employeeMedicalRecord.findFirst({
    where: { id: childId, employeeId },
  });
  if (!existing) throw notFound('Medical record not found');
  const updated = await prisma.employeeMedicalRecord.update({
    where: { id: childId },
    data: data as Prisma.EmployeeMedicalRecordUpdateInput,
  });
  await audit(req, {
    action: 'MEDICAL_RECORD_UPDATED',
    module: MODULES.PROFILE,
    description: `Medical record updated for employee ${employeeId}`,
    employeeId,
  });
  return updated;
}

export async function deleteMedicalRecord(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
) {
  if (!isPrivileged(user)) throw forbidden('You do not have permission to manage medical records');
  const existing = await prisma.employeeMedicalRecord.findFirst({
    where: { id: childId, employeeId },
  });
  if (!existing) throw notFound('Medical record not found');
  await prisma.employeeMedicalRecord.delete({ where: { id: childId } });
  await audit(req, {
    action: 'MEDICAL_RECORD_DELETED',
    module: MODULES.PROFILE,
    description: `Medical record deleted for employee ${employeeId}`,
    employeeId,
  });
}

// ─────────────────────────────────────────────────────────────
// Disciplinary records (privileged only, audited)
// ─────────────────────────────────────────────────────────────

export async function listDisciplinaryRecords(req: Request, user: AuthUser, employeeId: string) {
  if (!isPrivileged(user)) {
    throw forbidden('You do not have permission to view disciplinary records');
  }
  await getEmployeeOrThrow(employeeId);

  const records = await prisma.employeeDisciplinaryRecord.findMany({
    where: { employeeId },
    orderBy: { incidentDate: 'desc' },
  });

  await audit(req, {
    action: 'SENSITIVE_PROFILE_VIEWED',
    module: MODULES.PROFILE,
    description: `Disciplinary records viewed for employee ${employeeId}`,
    employeeId,
  });
  return records;
}

export async function createDisciplinaryRecord(
  req: Request,
  user: AuthUser,
  employeeId: string,
  data: Record<string, unknown>,
) {
  if (!isPrivileged(user)) {
    throw forbidden('You do not have permission to manage disciplinary records');
  }
  await getEmployeeOrThrow(employeeId);
  const created = await prisma.employeeDisciplinaryRecord.create({
    data: {
      ...(data as Prisma.EmployeeDisciplinaryRecordCreateManyInput),
      employeeId,
      createdById: user.id,
    },
  });
  await audit(req, {
    action: 'DISCIPLINARY_RECORD_ADDED',
    module: MODULES.PROFILE,
    description: `Disciplinary record added for employee ${employeeId}`,
    employeeId,
  });
  await addTimeline(
    employeeId,
    'DISCIPLINARY_ADDED',
    `Disciplinary record added: ${created.incidentType}`,
    user.id,
    { disciplinaryId: created.id },
  );
  return created;
}

export async function updateDisciplinaryRecord(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
  data: Record<string, unknown>,
) {
  if (!isPrivileged(user)) {
    throw forbidden('You do not have permission to manage disciplinary records');
  }
  const existing = await prisma.employeeDisciplinaryRecord.findFirst({
    where: { id: childId, employeeId },
  });
  if (!existing) throw notFound('Disciplinary record not found');
  const updated = await prisma.employeeDisciplinaryRecord.update({
    where: { id: childId },
    data: data as Prisma.EmployeeDisciplinaryRecordUpdateInput,
  });
  await audit(req, {
    action: 'DISCIPLINARY_RECORD_UPDATED',
    module: MODULES.PROFILE,
    description: `Disciplinary record updated for employee ${employeeId}`,
    employeeId,
  });
  return updated;
}

export async function deleteDisciplinaryRecord(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
) {
  if (!isPrivileged(user)) {
    throw forbidden('You do not have permission to manage disciplinary records');
  }
  const existing = await prisma.employeeDisciplinaryRecord.findFirst({
    where: { id: childId, employeeId },
  });
  if (!existing) throw notFound('Disciplinary record not found');
  await prisma.employeeDisciplinaryRecord.delete({ where: { id: childId } });
  await audit(req, {
    action: 'DISCIPLINARY_RECORD_DELETED',
    module: MODULES.PROFILE,
    description: `Disciplinary record deleted for employee ${employeeId}`,
    employeeId,
  });
}

// ─────────────────────────────────────────────────────────────
// Performance notes (privileged; supervisors treated as privileged here)
// ─────────────────────────────────────────────────────────────

export async function listPerformanceNotes(user: AuthUser, employeeId: string) {
  if (!isPrivileged(user)) {
    throw forbidden('You do not have permission to view performance notes');
  }
  await getEmployeeOrThrow(employeeId);
  return prisma.employeePerformanceNote.findMany({
    where: { employeeId },
    orderBy: { evaluationDate: 'desc' },
  });
}

export async function createPerformanceNote(
  req: Request,
  user: AuthUser,
  employeeId: string,
  data: Record<string, unknown>,
) {
  if (!isPrivileged(user)) {
    throw forbidden('You do not have permission to manage performance notes');
  }
  await getEmployeeOrThrow(employeeId);
  const created = await prisma.employeePerformanceNote.create({
    data: {
      ...(data as Prisma.EmployeePerformanceNoteCreateManyInput),
      employeeId,
      evaluatedById: user.id,
    },
  });
  await audit(req, {
    action: 'PERFORMANCE_NOTE_ADDED',
    module: MODULES.PROFILE,
    description: `Performance note added for employee ${employeeId}`,
    employeeId,
  });
  await addTimeline(
    employeeId,
    'PERFORMANCE_NOTE_ADDED',
    'Performance note added',
    user.id,
    { performanceNoteId: created.id },
  );
  return created;
}

export async function updatePerformanceNote(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
  data: Record<string, unknown>,
) {
  if (!isPrivileged(user)) {
    throw forbidden('You do not have permission to manage performance notes');
  }
  const existing = await prisma.employeePerformanceNote.findFirst({
    where: { id: childId, employeeId },
  });
  if (!existing) throw notFound('Performance note not found');
  const updated = await prisma.employeePerformanceNote.update({
    where: { id: childId },
    data: data as Prisma.EmployeePerformanceNoteUpdateInput,
  });
  await audit(req, {
    action: 'PERFORMANCE_NOTE_UPDATED',
    module: MODULES.PROFILE,
    description: `Performance note updated for employee ${employeeId}`,
    employeeId,
  });
  return updated;
}

export async function deletePerformanceNote(
  req: Request,
  user: AuthUser,
  employeeId: string,
  childId: string,
) {
  if (!isPrivileged(user)) {
    throw forbidden('You do not have permission to manage performance notes');
  }
  const existing = await prisma.employeePerformanceNote.findFirst({
    where: { id: childId, employeeId },
  });
  if (!existing) throw notFound('Performance note not found');
  await prisma.employeePerformanceNote.delete({ where: { id: childId } });
  await audit(req, {
    action: 'PERFORMANCE_NOTE_DELETED',
    module: MODULES.PROFILE,
    description: `Performance note deleted for employee ${employeeId}`,
    employeeId,
  });
}

// ─────────────────────────────────────────────────────────────
// Activity timeline
// ─────────────────────────────────────────────────────────────

export async function listActivityTimeline(
  user: AuthUser,
  employeeId: string,
  params: PaginationParams,
) {
  ensureSelfOrPrivileged(user, employeeId);
  await getEmployeeOrThrow(employeeId);

  const where: Prisma.EmployeeActivityTimelineWhereInput = { employeeId };
  const [total, items] = await Promise.all([
    prisma.employeeActivityTimeline.count({ where }),
    prisma.employeeActivityTimeline.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    }),
  ]);

  return { items, meta: buildMeta(total, params) };
}

// ─────────────────────────────────────────────────────────────
// Profile update requests
// ─────────────────────────────────────────────────────────────

export async function listUpdateRequests(
  user: AuthUser,
  params: PaginationParams,
  filters: { status?: string },
) {
  const where: Prisma.EmployeeProfileUpdateRequestWhereInput = {
    ...(filters.status ? { status: filters.status as never } : {}),
  };

  // Non-privileged users only see their own requests.
  if (!isPrivileged(user)) {
    if (!user.employeeId) throw forbidden('No employee record linked to your account');
    where.employeeId = user.employeeId;
  }

  const orderBy = buildOrderBy(params, ['createdAt', 'status', 'reviewedAt'], 'createdAt');

  const [total, items] = await Promise.all([
    prisma.employeeProfileUpdateRequest.count({ where }),
    prisma.employeeProfileUpdateRequest.findMany({
      where,
      orderBy,
      skip: params.skip,
      take: params.take,
    }),
  ]);

  return { items, meta: buildMeta(total, params) };
}

export async function getUpdateRequest(user: AuthUser, requestId: string) {
  const request = await prisma.employeeProfileUpdateRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) throw notFound('Update request not found');
  ensureSelfOrPrivileged(user, request.employeeId);
  return request;
}

export async function createUpdateRequest(
  req: Request,
  user: AuthUser,
  data: { section: string; changes: Record<string, unknown> },
) {
  if (!user.employeeId) throw forbidden('No employee record linked to your account');
  const employeeId = user.employeeId;
  await getEmployeeOrThrow(employeeId);

  const created = await prisma.employeeProfileUpdateRequest.create({
    data: {
      employeeId,
      requestedById: user.id,
      section: data.section,
      changes: data.changes as Prisma.InputJsonValue,
      status: 'PENDING',
    },
  });

  await audit(req, {
    action: 'PROFILE_UPDATE_REQUESTED',
    module: MODULES.PROFILE,
    description: `Profile update requested (${data.section}) for employee ${employeeId}`,
    employeeId,
    newValues: { id: created.id, section: created.section },
  });

  // Notify HR / admins.
  const reviewers = await prisma.user.findMany({
    where: {
      isActive: true,
      userRoles: { some: { role: { name: { in: ['SUPER_ADMIN', 'ADMIN', 'HR'] } } } },
    },
    select: { id: true },
  });
  await Promise.all(
    reviewers.map((r) =>
      notify({
        userId: r.id,
        type: 'PROFILE' as NotificationType,
        title: 'New profile update request',
        message: `A profile update request (${data.section}) is awaiting review.`,
        link: `/profile-update-requests/${created.id}`,
      }),
    ),
  );

  return created;
}

/**
 * Apply the requested changes to the relevant record(s). Supported sections map
 * to the EmployeeProfile (personal / government / bank). Unknown sections are
 * approved without an automatic write (HR is expected to have applied manually).
 */
async function applyChanges(
  tx: Prisma.TransactionClient,
  employeeId: string,
  section: string,
  changes: Record<string, unknown>,
) {
  const PROFILE_SECTIONS = ['personal', 'government', 'bank', 'profile', 'payroll'];
  if (PROFILE_SECTIONS.includes(section.toLowerCase())) {
    // `changes` may be either { field: value } or { field: { old, new } }.
    const data: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(changes)) {
      if (raw !== null && typeof raw === 'object' && 'new' in (raw as Record<string, unknown>)) {
        data[key] = (raw as Record<string, unknown>).new;
      } else {
        data[key] = raw;
      }
    }
    await tx.employeeProfile.update({
      where: { employeeId },
      data: data as Prisma.EmployeeProfileUpdateInput,
    });
  }
}

export async function approveUpdateRequest(req: Request, user: AuthUser, requestId: string) {
  const request = await prisma.employeeProfileUpdateRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) throw notFound('Update request not found');
  if (request.status !== 'PENDING') {
    throw badRequest('Only pending requests can be approved', 'INVALID_STATUS');
  }

  const updated = await prisma.$transaction(async (tx) => {
    await applyChanges(
      tx,
      request.employeeId,
      request.section,
      (request.changes as Record<string, unknown>) ?? {},
    );
    return tx.employeeProfileUpdateRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });
  });

  await audit(req, {
    action: 'PROFILE_UPDATE_APPROVED',
    module: MODULES.PROFILE,
    description: `Profile update request ${requestId} approved`,
    employeeId: request.employeeId,
    newValues: { changes: request.changes, section: request.section },
  });
  await addTimeline(
    request.employeeId,
    'PROFILE_UPDATED',
    `Profile update request approved (${request.section})`,
    user.id,
    { requestId },
  );

  const targetUserId = await userIdForEmployee(request.employeeId);
  if (targetUserId) {
    await notify({
      userId: targetUserId,
      type: 'PROFILE' as NotificationType,
      title: 'Profile update approved',
      message: `Your profile update request (${request.section}) has been approved.`,
      link: `/profile-update-requests/${requestId}`,
    });
  }

  return updated;
}

export async function rejectUpdateRequest(
  req: Request,
  user: AuthUser,
  requestId: string,
  reviewNote: string,
) {
  const request = await prisma.employeeProfileUpdateRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) throw notFound('Update request not found');
  if (request.status !== 'PENDING') {
    throw badRequest('Only pending requests can be rejected', 'INVALID_STATUS');
  }

  const updated = await prisma.employeeProfileUpdateRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      reviewedById: user.id,
      reviewedAt: new Date(),
      reviewNote,
    },
  });

  await audit(req, {
    action: 'PROFILE_UPDATE_REJECTED',
    module: MODULES.PROFILE,
    description: `Profile update request ${requestId} rejected`,
    employeeId: request.employeeId,
  });

  const targetUserId = await userIdForEmployee(request.employeeId);
  if (targetUserId) {
    await notify({
      userId: targetUserId,
      type: 'PROFILE' as NotificationType,
      title: 'Profile update rejected',
      message: `Your profile update request (${request.section}) was rejected: ${reviewNote}`,
      link: `/profile-update-requests/${requestId}`,
    });
  }

  return updated;
}

export async function cancelUpdateRequest(req: Request, user: AuthUser, requestId: string) {
  const request = await prisma.employeeProfileUpdateRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) throw notFound('Update request not found');

  // Only the owner may cancel.
  if (!user.employeeId || user.employeeId !== request.employeeId) {
    throw forbidden('You can only cancel your own requests');
  }
  if (request.status !== 'PENDING') {
    throw badRequest('Only pending requests can be cancelled', 'INVALID_STATUS');
  }

  const updated = await prisma.employeeProfileUpdateRequest.update({
    where: { id: requestId },
    data: { status: 'CANCELLED' },
  });

  await audit(req, {
    action: 'PROFILE_UPDATE_CANCELLED',
    module: MODULES.PROFILE,
    description: `Profile update request ${requestId} cancelled`,
    employeeId: request.employeeId,
  });

  return updated;
}
