import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, noContent, paginated } from '../utils/response';
import { badRequest } from '../utils/errors';
import { buildPagination } from '../utils/pagination';
import { UPLOAD } from '../config/constants';
import * as profileService from '../services/profile.service';

function requireFile(req: Request, allowedMime: readonly string[]): Express.Multer.File {
  const file = req.file;
  if (!file) throw badRequest('A file is required', 'FILE_REQUIRED');
  if (!allowedMime.includes(file.mimetype)) {
    throw badRequest(
      `Unsupported file type: ${file.mimetype}`,
      'UNSUPPORTED_FILE_TYPE',
      { allowed: allowedMime },
    );
  }
  return file;
}

// ─────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────

export const getProfileController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.getProfile(req.user!, req.params.id);
  return ok(res, data, 'OK');
});

export const updateProfileController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.updateProfile(req, req.user!, req.params.id, req.body);
  return ok(res, data, 'Profile updated');
});

export const updateProfilePhotoController = asyncHandler(async (req: Request, res: Response) => {
  const file = requireFile(req, UPLOAD.IMAGE_MIME);
  const data = await profileService.updateProfilePhoto(req, req.user!, req.params.id, file);
  return ok(res, data, 'Profile photo updated');
});

// ─────────────────────────────────────────────────────────────
// Emergency contacts
// ─────────────────────────────────────────────────────────────

export const listEmergencyContactsController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.listEmergencyContacts(req.user!, req.params.id);
  return ok(res, data, 'OK');
});

export const createEmergencyContactController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.createEmergencyContact(req, req.user!, req.params.id, req.body);
  return created(res, data, 'Emergency contact added');
});

export const updateEmergencyContactController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.updateEmergencyContact(
    req,
    req.user!,
    req.params.id,
    req.params.childId,
    req.body,
  );
  return ok(res, data, 'Emergency contact updated');
});

export const deleteEmergencyContactController = asyncHandler(async (req: Request, res: Response) => {
  await profileService.deleteEmergencyContact(req, req.user!, req.params.id, req.params.childId);
  return noContent(res);
});

// ─────────────────────────────────────────────────────────────
// Dependents
// ─────────────────────────────────────────────────────────────

export const listDependentsController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.listDependents(req.user!, req.params.id);
  return ok(res, data, 'OK');
});

export const createDependentController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.createDependent(req, req.user!, req.params.id, req.body);
  return created(res, data, 'Dependent added');
});

export const updateDependentController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.updateDependent(
    req,
    req.user!,
    req.params.id,
    req.params.childId,
    req.body,
  );
  return ok(res, data, 'Dependent updated');
});

export const deleteDependentController = asyncHandler(async (req: Request, res: Response) => {
  await profileService.deleteDependent(req, req.user!, req.params.id, req.params.childId);
  return noContent(res);
});

// ─────────────────────────────────────────────────────────────
// Education
// ─────────────────────────────────────────────────────────────

export const listEducationController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.listEducation(req.user!, req.params.id);
  return ok(res, data, 'OK');
});

export const createEducationController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.createEducation(req, req.user!, req.params.id, req.body);
  return created(res, data, 'Education added');
});

export const updateEducationController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.updateEducation(
    req,
    req.user!,
    req.params.id,
    req.params.childId,
    req.body,
  );
  return ok(res, data, 'Education updated');
});

export const deleteEducationController = asyncHandler(async (req: Request, res: Response) => {
  await profileService.deleteEducation(req, req.user!, req.params.id, req.params.childId);
  return noContent(res);
});

// ─────────────────────────────────────────────────────────────
// Work experience
// ─────────────────────────────────────────────────────────────

export const listWorkExperienceController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.listWorkExperience(req.user!, req.params.id);
  return ok(res, data, 'OK');
});

export const createWorkExperienceController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.createWorkExperience(req, req.user!, req.params.id, req.body);
  return created(res, data, 'Work experience added');
});

export const updateWorkExperienceController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.updateWorkExperience(
    req,
    req.user!,
    req.params.id,
    req.params.childId,
    req.body,
  );
  return ok(res, data, 'Work experience updated');
});

export const deleteWorkExperienceController = asyncHandler(async (req: Request, res: Response) => {
  await profileService.deleteWorkExperience(req, req.user!, req.params.id, req.params.childId);
  return noContent(res);
});

// ─────────────────────────────────────────────────────────────
// Skills
// ─────────────────────────────────────────────────────────────

export const listSkillsController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.listSkills(req.user!, req.params.id);
  return ok(res, data, 'OK');
});

export const createSkillController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.createSkill(req, req.user!, req.params.id, req.body);
  return created(res, data, 'Skill added');
});

export const updateSkillController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.updateSkill(
    req,
    req.user!,
    req.params.id,
    req.params.childId,
    req.body,
  );
  return ok(res, data, 'Skill updated');
});

export const deleteSkillController = asyncHandler(async (req: Request, res: Response) => {
  await profileService.deleteSkill(req, req.user!, req.params.id, req.params.childId);
  return noContent(res);
});

// ─────────────────────────────────────────────────────────────
// Trainings
// ─────────────────────────────────────────────────────────────

export const listTrainingsController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.listTrainings(req.user!, req.params.id);
  return ok(res, data, 'OK');
});

export const createTrainingController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.createTraining(req, req.user!, req.params.id, req.body);
  return created(res, data, 'Training added');
});

export const updateTrainingController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.updateTraining(
    req,
    req.user!,
    req.params.id,
    req.params.childId,
    req.body,
  );
  return ok(res, data, 'Training updated');
});

export const deleteTrainingController = asyncHandler(async (req: Request, res: Response) => {
  await profileService.deleteTraining(req, req.user!, req.params.id, req.params.childId);
  return noContent(res);
});

// ─────────────────────────────────────────────────────────────
// Documents
// ─────────────────────────────────────────────────────────────

export const listDocumentsController = asyncHandler(async (req: Request, res: Response) => {
  const params = buildPagination(req.query);
  const { items, meta } = await profileService.listDocuments(req.user!, req.params.id, params, {
    documentType: req.query.documentType as string | undefined,
    includeDeleted: req.query.includeDeleted as unknown as boolean | undefined,
  });
  return paginated(res, items, meta);
});

export const createDocumentController = asyncHandler(async (req: Request, res: Response) => {
  const file = requireFile(req, UPLOAD.DOC_MIME);
  const data = await profileService.createDocument(req, req.user!, req.params.id, file, {
    documentName: req.body.documentName,
    documentType: req.body.documentType,
    remarks: req.body.remarks ?? null,
    expirationDate: req.body.expirationDate ?? null,
  });
  return created(res, data, 'Document uploaded');
});

export const updateDocumentController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.updateDocument(
    req,
    req.user!,
    req.params.id,
    req.params.childId,
    req.body,
  );
  return ok(res, data, 'Document updated');
});

export const deleteDocumentController = asyncHandler(async (req: Request, res: Response) => {
  await profileService.deleteDocument(req, req.user!, req.params.id, req.params.childId);
  return noContent(res);
});

// ─────────────────────────────────────────────────────────────
// Medical records
// ─────────────────────────────────────────────────────────────

export const listMedicalRecordsController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.listMedicalRecords(req, req.user!, req.params.id);
  return ok(res, data, 'OK');
});

export const createMedicalRecordController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.createMedicalRecord(req, req.user!, req.params.id, req.body);
  return created(res, data, 'Medical record added');
});

export const updateMedicalRecordController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.updateMedicalRecord(
    req,
    req.user!,
    req.params.id,
    req.params.childId,
    req.body,
  );
  return ok(res, data, 'Medical record updated');
});

export const deleteMedicalRecordController = asyncHandler(async (req: Request, res: Response) => {
  await profileService.deleteMedicalRecord(req, req.user!, req.params.id, req.params.childId);
  return noContent(res);
});

// ─────────────────────────────────────────────────────────────
// Disciplinary records
// ─────────────────────────────────────────────────────────────

export const listDisciplinaryRecordsController = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await profileService.listDisciplinaryRecords(req, req.user!, req.params.id);
    return ok(res, data, 'OK');
  },
);

export const createDisciplinaryRecordController = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await profileService.createDisciplinaryRecord(
      req,
      req.user!,
      req.params.id,
      req.body,
    );
    return created(res, data, 'Disciplinary record added');
  },
);

export const updateDisciplinaryRecordController = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await profileService.updateDisciplinaryRecord(
      req,
      req.user!,
      req.params.id,
      req.params.childId,
      req.body,
    );
    return ok(res, data, 'Disciplinary record updated');
  },
);

export const deleteDisciplinaryRecordController = asyncHandler(
  async (req: Request, res: Response) => {
    await profileService.deleteDisciplinaryRecord(req, req.user!, req.params.id, req.params.childId);
    return noContent(res);
  },
);

// ─────────────────────────────────────────────────────────────
// Performance notes
// ─────────────────────────────────────────────────────────────

export const listPerformanceNotesController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.listPerformanceNotes(req.user!, req.params.id);
  return ok(res, data, 'OK');
});

export const createPerformanceNoteController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.createPerformanceNote(req, req.user!, req.params.id, req.body);
  return created(res, data, 'Performance note added');
});

export const updatePerformanceNoteController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.updatePerformanceNote(
    req,
    req.user!,
    req.params.id,
    req.params.childId,
    req.body,
  );
  return ok(res, data, 'Performance note updated');
});

export const deletePerformanceNoteController = asyncHandler(async (req: Request, res: Response) => {
  await profileService.deletePerformanceNote(req, req.user!, req.params.id, req.params.childId);
  return noContent(res);
});

// ─────────────────────────────────────────────────────────────
// Activity timeline
// ─────────────────────────────────────────────────────────────

export const listActivityTimelineController = asyncHandler(async (req: Request, res: Response) => {
  const params = buildPagination(req.query);
  const { items, meta } = await profileService.listActivityTimeline(
    req.user!,
    req.params.id,
    params,
  );
  return paginated(res, items, meta);
});

// ─────────────────────────────────────────────────────────────
// Profile update requests
// ─────────────────────────────────────────────────────────────

export const listUpdateRequestsController = asyncHandler(async (req: Request, res: Response) => {
  const params = buildPagination(req.query);
  const { items, meta } = await profileService.listUpdateRequests(req.user!, params, {
    status: req.query.status as string | undefined,
  });
  return paginated(res, items, meta);
});

export const createUpdateRequestController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.createUpdateRequest(req, req.user!, {
    section: req.body.section,
    changes: req.body.changes,
  });
  return created(res, data, 'Profile update request submitted');
});

export const getUpdateRequestController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.getUpdateRequest(req.user!, req.params.requestId);
  return ok(res, data, 'OK');
});

export const approveUpdateRequestController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.approveUpdateRequest(req, req.user!, req.params.requestId);
  return ok(res, data, 'Profile update request approved');
});

export const rejectUpdateRequestController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.rejectUpdateRequest(
    req,
    req.user!,
    req.params.requestId,
    req.body.reviewNote,
  );
  return ok(res, data, 'Profile update request rejected');
});

export const cancelUpdateRequestController = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.cancelUpdateRequest(req, req.user!, req.params.requestId);
  return ok(res, data, 'Profile update request cancelled');
});
