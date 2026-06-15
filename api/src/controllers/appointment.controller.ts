import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, noContent, paginated } from '../utils/response';
import { auditContext } from '../utils/audit';
import * as appointmentService from '../services/appointment.service';

// ─────────────────────────────────────────────────────────────
// SLOTS
// ─────────────────────────────────────────────────────────────

export const listSlotsController = asyncHandler(async (req: Request, res: Response) => {
  const result = await appointmentService.listSlots(req.query, {
    date: req.query.date as Date | undefined,
    from: req.query.from as Date | undefined,
    to: req.query.to as Date | undefined,
    isActive: req.query.isActive as boolean | undefined,
  });
  return paginated(res, result.items, result.meta, 'Appointment slots');
});

export const createSlotController = asyncHandler(async (req: Request, res: Response) => {
  const slot = await appointmentService.createSlot(req.body, req.user!, auditContext(req));
  return created(res, slot, 'Appointment slot created');
});

export const updateSlotController = asyncHandler(async (req: Request, res: Response) => {
  const slot = await appointmentService.updateSlot(
    req.params.id,
    req.body,
    req.user!,
    auditContext(req),
  );
  return ok(res, slot, 'Appointment slot updated');
});

export const deleteSlotController = asyncHandler(async (req: Request, res: Response) => {
  await appointmentService.deleteSlot(req.params.id, req.user!, auditContext(req));
  return noContent(res);
});

// ─────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────

export const listAppointmentsController = asyncHandler(async (req: Request, res: Response) => {
  const result = await appointmentService.listAppointments(
    req.query,
    {
      status: req.query.status as never,
      employeeId: req.query.employeeId as string | undefined,
      from: req.query.from as Date | undefined,
      to: req.query.to as Date | undefined,
    },
    req.user!,
  );
  return paginated(res, result.items, result.meta, 'Appointments');
});

export const calendarController = asyncHandler(async (req: Request, res: Response) => {
  const items = await appointmentService.getCalendar(
    {
      from: req.query.from as unknown as Date,
      to: req.query.to as unknown as Date,
      employeeId: req.query.employeeId as string | undefined,
      status: req.query.status as never,
    },
    req.user!,
  );
  return ok(res, items, 'Appointment calendar');
});

export const reportsController = asyncHandler(async (req: Request, res: Response) => {
  const report = await appointmentService.getReports({
    from: req.query.from as Date | undefined,
    to: req.query.to as Date | undefined,
  });
  return ok(res, report, 'Appointment reports');
});

export const getAppointmentController = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.getAppointment(req.params.id, req.user!);
  return ok(res, appointment, 'Appointment');
});

export const bookAppointmentController = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.bookAppointment(
    req.body,
    req.user!,
    auditContext(req),
  );
  return created(res, appointment, 'Appointment booked');
});

export const rescheduleAppointmentController = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.rescheduleAppointment(
    req.params.id,
    req.body,
    req.user!,
    auditContext(req),
  );
  return ok(res, appointment, 'Appointment rescheduled');
});

export const cancelAppointmentController = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.cancelAppointment(
    req.params.id,
    req.body?.note,
    req.user!,
    auditContext(req),
  );
  return ok(res, appointment, 'Appointment cancelled');
});

export const approveAppointmentController = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.approveAppointment(
    req.params.id,
    req.body?.note,
    req.user!,
    auditContext(req),
  );
  return ok(res, appointment, 'Appointment approved');
});

export const rejectAppointmentController = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.rejectAppointment(
    req.params.id,
    req.body?.note,
    req.user!,
    auditContext(req),
  );
  return ok(res, appointment, 'Appointment rejected');
});

export const completeAppointmentController = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.completeAppointment(
    req.params.id,
    req.body?.note,
    req.user!,
    auditContext(req),
  );
  return ok(res, appointment, 'Appointment completed');
});
