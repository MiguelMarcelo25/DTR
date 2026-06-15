import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { ROLES } from '../config/constants';
import { UPLOAD } from '../config/constants';
import {
  employeeIdParams,
  childParams,
  requestIdParams,
  updateProfileSchema,
  createEmergencyContactSchema,
  updateEmergencyContactSchema,
  createDependentSchema,
  updateDependentSchema,
  createEducationSchema,
  updateEducationSchema,
  createWorkExperienceSchema,
  updateWorkExperienceSchema,
  createSkillSchema,
  updateSkillSchema,
  createTrainingSchema,
  updateTrainingSchema,
  createDocumentSchema,
  listDocumentsQuery,
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
  createDisciplinaryRecordSchema,
  updateDisciplinaryRecordSchema,
  createPerformanceNoteSchema,
  updatePerformanceNoteSchema,
  listQuery,
  listUpdateRequestsQuery,
  createUpdateRequestSchema,
  rejectUpdateRequestSchema,
} from '../validations/profile.validation';
import {
  getProfileController,
  updateProfileController,
  updateProfilePhotoController,
  listEmergencyContactsController,
  createEmergencyContactController,
  updateEmergencyContactController,
  deleteEmergencyContactController,
  listDependentsController,
  createDependentController,
  updateDependentController,
  deleteDependentController,
  listEducationController,
  createEducationController,
  updateEducationController,
  deleteEducationController,
  listWorkExperienceController,
  createWorkExperienceController,
  updateWorkExperienceController,
  deleteWorkExperienceController,
  listSkillsController,
  createSkillController,
  updateSkillController,
  deleteSkillController,
  listTrainingsController,
  createTrainingController,
  updateTrainingController,
  deleteTrainingController,
  listDocumentsController,
  createDocumentController,
  updateDocumentController,
  deleteDocumentController,
  listMedicalRecordsController,
  createMedicalRecordController,
  updateMedicalRecordController,
  deleteMedicalRecordController,
  listDisciplinaryRecordsController,
  createDisciplinaryRecordController,
  updateDisciplinaryRecordController,
  deleteDisciplinaryRecordController,
  listPerformanceNotesController,
  createPerformanceNoteController,
  updatePerformanceNoteController,
  deletePerformanceNoteController,
  listActivityTimelineController,
  listUpdateRequestsController,
  createUpdateRequestController,
  getUpdateRequestController,
  approveUpdateRequestController,
  rejectUpdateRequestController,
  cancelUpdateRequestController,
} from '../controllers/profile.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD.MAX_FILE_BYTES },
});

// Mounted at /employees — paths begin with /:id/...
const router = Router();

// ── Profile ──────────────────────────────────────────────────
router.get(
  '/:id/profile',
  authenticate,
  validate({ params: employeeIdParams }),
  getProfileController,
);
router.put(
  '/:id/profile',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: employeeIdParams, body: updateProfileSchema }),
  updateProfileController,
);
router.post(
  '/:id/profile/photo',
  authenticate,
  upload.single('photo'),
  validate({ params: employeeIdParams }),
  updateProfilePhotoController,
);

// ── Emergency contacts ───────────────────────────────────────
router.get(
  '/:id/emergency-contacts',
  authenticate,
  validate({ params: employeeIdParams }),
  listEmergencyContactsController,
);
router.post(
  '/:id/emergency-contacts',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: employeeIdParams, body: createEmergencyContactSchema }),
  createEmergencyContactController,
);
router.put(
  '/:id/emergency-contacts/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams, body: updateEmergencyContactSchema }),
  updateEmergencyContactController,
);
router.delete(
  '/:id/emergency-contacts/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams }),
  deleteEmergencyContactController,
);

// ── Dependents ───────────────────────────────────────────────
router.get(
  '/:id/dependents',
  authenticate,
  validate({ params: employeeIdParams }),
  listDependentsController,
);
router.post(
  '/:id/dependents',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: employeeIdParams, body: createDependentSchema }),
  createDependentController,
);
router.put(
  '/:id/dependents/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams, body: updateDependentSchema }),
  updateDependentController,
);
router.delete(
  '/:id/dependents/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams }),
  deleteDependentController,
);

// ── Education ────────────────────────────────────────────────
router.get(
  '/:id/education',
  authenticate,
  validate({ params: employeeIdParams }),
  listEducationController,
);
router.post(
  '/:id/education',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: employeeIdParams, body: createEducationSchema }),
  createEducationController,
);
router.put(
  '/:id/education/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams, body: updateEducationSchema }),
  updateEducationController,
);
router.delete(
  '/:id/education/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams }),
  deleteEducationController,
);

// ── Work experience ──────────────────────────────────────────
router.get(
  '/:id/work-experience',
  authenticate,
  validate({ params: employeeIdParams }),
  listWorkExperienceController,
);
router.post(
  '/:id/work-experience',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: employeeIdParams, body: createWorkExperienceSchema }),
  createWorkExperienceController,
);
router.put(
  '/:id/work-experience/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams, body: updateWorkExperienceSchema }),
  updateWorkExperienceController,
);
router.delete(
  '/:id/work-experience/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams }),
  deleteWorkExperienceController,
);

// ── Skills ───────────────────────────────────────────────────
router.get(
  '/:id/skills',
  authenticate,
  validate({ params: employeeIdParams }),
  listSkillsController,
);
router.post(
  '/:id/skills',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: employeeIdParams, body: createSkillSchema }),
  createSkillController,
);
router.put(
  '/:id/skills/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams, body: updateSkillSchema }),
  updateSkillController,
);
router.delete(
  '/:id/skills/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams }),
  deleteSkillController,
);

// ── Trainings ────────────────────────────────────────────────
router.get(
  '/:id/trainings',
  authenticate,
  validate({ params: employeeIdParams }),
  listTrainingsController,
);
router.post(
  '/:id/trainings',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: employeeIdParams, body: createTrainingSchema }),
  createTrainingController,
);
router.put(
  '/:id/trainings/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams, body: updateTrainingSchema }),
  updateTrainingController,
);
router.delete(
  '/:id/trainings/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams }),
  deleteTrainingController,
);

// ── Documents (POST allowed for self via multipart) ──────────
router.get(
  '/:id/documents',
  authenticate,
  validate({ params: employeeIdParams, query: listDocumentsQuery }),
  listDocumentsController,
);
router.post(
  '/:id/documents',
  authenticate,
  upload.single('file'),
  validate({ params: employeeIdParams, body: createDocumentSchema }),
  createDocumentController,
);
router.put(
  '/:id/documents/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams }),
  updateDocumentController,
);
router.delete(
  '/:id/documents/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams }),
  deleteDocumentController,
);

// ── Medical records (privileged only) ────────────────────────
router.get(
  '/:id/medical-records',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: employeeIdParams }),
  listMedicalRecordsController,
);
router.post(
  '/:id/medical-records',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: employeeIdParams, body: createMedicalRecordSchema }),
  createMedicalRecordController,
);
router.put(
  '/:id/medical-records/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams, body: updateMedicalRecordSchema }),
  updateMedicalRecordController,
);
router.delete(
  '/:id/medical-records/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams }),
  deleteMedicalRecordController,
);

// ── Disciplinary records (privileged only) ───────────────────
router.get(
  '/:id/disciplinary-records',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: employeeIdParams }),
  listDisciplinaryRecordsController,
);
router.post(
  '/:id/disciplinary-records',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: employeeIdParams, body: createDisciplinaryRecordSchema }),
  createDisciplinaryRecordController,
);
router.put(
  '/:id/disciplinary-records/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams, body: updateDisciplinaryRecordSchema }),
  updateDisciplinaryRecordController,
);
router.delete(
  '/:id/disciplinary-records/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams }),
  deleteDisciplinaryRecordController,
);

// ── Performance notes (privileged only) ──────────────────────
router.get(
  '/:id/performance-notes',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: employeeIdParams }),
  listPerformanceNotesController,
);
router.post(
  '/:id/performance-notes',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: employeeIdParams, body: createPerformanceNoteSchema }),
  createPerformanceNoteController,
);
router.put(
  '/:id/performance-notes/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams, body: updatePerformanceNoteSchema }),
  updatePerformanceNoteController,
);
router.delete(
  '/:id/performance-notes/:childId',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: childParams }),
  deletePerformanceNoteController,
);

// ── Activity timeline ────────────────────────────────────────
router.get(
  '/:id/activity-timeline',
  authenticate,
  validate({ params: employeeIdParams, query: listQuery }),
  listActivityTimelineController,
);

// ─────────────────────────────────────────────────────────────
// Profile update requests — mounted at /profile-update-requests
// ─────────────────────────────────────────────────────────────
export const profileUpdateRequestRouter = Router();

profileUpdateRequestRouter.get(
  '/',
  authenticate,
  validate({ query: listUpdateRequestsQuery }),
  listUpdateRequestsController,
);
profileUpdateRequestRouter.post(
  '/',
  authenticate,
  validate({ body: createUpdateRequestSchema }),
  createUpdateRequestController,
);
profileUpdateRequestRouter.get(
  '/:requestId',
  authenticate,
  validate({ params: requestIdParams }),
  getUpdateRequestController,
);
profileUpdateRequestRouter.put(
  '/:requestId/approve',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: requestIdParams }),
  approveUpdateRequestController,
);
profileUpdateRequestRouter.put(
  '/:requestId/reject',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  validate({ params: requestIdParams, body: rejectUpdateRequestSchema }),
  rejectUpdateRequestController,
);
profileUpdateRequestRouter.put(
  '/:requestId/cancel',
  authenticate,
  validate({ params: requestIdParams }),
  cancelUpdateRequestController,
);

export default router;
