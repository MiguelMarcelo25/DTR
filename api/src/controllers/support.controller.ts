import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, noContent, paginated } from '../utils/response';
import { badRequest } from '../utils/errors';
import { buildObjectPath, uploadBuffer } from '../utils/storage';
import { UPLOAD } from '../config/constants';
import * as support from '../services/support.service';

export const createTicketCtrl = asyncHandler(async (req: Request, res: Response) =>
  created(res, await support.createTicket(req, req.user!, req.body), 'Ticket submitted'),
);

export const listTicketsCtrl = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta } = await support.listTickets(req.user!, req.query);
  return paginated(res, items, meta);
});

export const boardCtrl = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await support.getBoard()),
);

export const statsCtrl = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await support.getStats()),
);

export const getTicketCtrl = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await support.getTicket(req.user!, req.params.id)),
);

export const updateTicketCtrl = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await support.updateTicket(req, req.params.id, req.body)),
);

export const moveTicketCtrl = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await support.moveTicket(req, req.params.id, req.body)),
);

export const assignTicketCtrl = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await support.assignTicket(req, req.params.id, req.body.assigneeId)),
);

export const addCommentCtrl = asyncHandler(async (req: Request, res: Response) =>
  created(res, await support.addComment(req, req.user!, req.params.id, req.body)),
);

export const listEventsCtrl = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await support.listEvents(req.params.id)),
);

export const deleteTicketCtrl = asyncHandler(async (req: Request, res: Response) => {
  await support.deleteTicket(req, req.params.id);
  return noContent(res);
});

export const uploadAttachmentCtrl = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw badRequest('A file is required', 'NO_FILE');
  if (!UPLOAD.DOC_MIME.includes(req.file.mimetype as never)) {
    throw badRequest('Unsupported file type', 'BAD_MIME');
  }
  const path = buildObjectPath('support', req.params.id, req.file.originalname);
  const stored = await uploadBuffer(path, req.file.buffer, req.file.mimetype);
  const attachment = await support.addAttachment(req.user!, req.params.id, {
    fileName: req.file.originalname,
    fileUrl: stored.url,
    filePath: stored.path,
  });
  return created(res, attachment, 'File attached');
});
