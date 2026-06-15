import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { ROLES, STAFF_ROLES, UPLOAD } from '../config/constants';
import {
  idParam,
  createTicketSchema,
  updateTicketSchema,
  moveTicketSchema,
  assignTicketSchema,
  commentSchema,
  listTicketsQuery,
} from '../validations/support.validation';
import * as c from '../controllers/support.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: UPLOAD.MAX_FILE_BYTES } });
const staff = authorize(...STAFF_ROLES);

const router = Router();
router.use(authenticate);

// Staff-only board + stats (declare before /tickets/:id)
router.get('/board', staff, c.boardCtrl);
router.get('/stats', staff, c.statsCtrl);

// Tickets — clients (CLIENT) and staff. Service scopes clients to their own.
router.get('/tickets', validate({ query: listTicketsQuery }), c.listTicketsCtrl);
router.post(
  '/tickets',
  authorize(ROLES.CLIENT, ...STAFF_ROLES),
  validate({ body: createTicketSchema }),
  c.createTicketCtrl,
);
router.get('/tickets/:id', validate({ params: idParam }), c.getTicketCtrl);
router.post('/tickets/:id/comments', validate({ params: idParam, body: commentSchema }), c.addCommentCtrl);
router.post('/tickets/:id/attachments', validate({ params: idParam }), upload.single('file'), c.uploadAttachmentCtrl);

// Staff-only mutations
router.put('/tickets/:id', staff, validate({ params: idParam, body: updateTicketSchema }), c.updateTicketCtrl);
router.put('/tickets/:id/move', staff, validate({ params: idParam, body: moveTicketSchema }), c.moveTicketCtrl);
router.put('/tickets/:id/assign', staff, validate({ params: idParam, body: assignTicketSchema }), c.assignTicketCtrl);
router.get('/tickets/:id/events', staff, validate({ params: idParam }), c.listEventsCtrl);
router.delete('/tickets/:id', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate({ params: idParam }), c.deleteTicketCtrl);

export default router;
