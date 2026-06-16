import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, noContent } from '../utils/response';
import * as holidayService from '../services/holiday.service';

export const listHolidaysController = asyncHandler(async (req: Request, res: Response) => {
  const holidays = await holidayService.listHolidays(req.query as never);
  return ok(res, holidays, 'Holidays retrieved');
});

export const createHolidayController = asyncHandler(async (req: Request, res: Response) => {
  const holiday = await holidayService.createHoliday(req, req.body);
  return created(res, holiday, 'Holiday created');
});

export const updateHolidayController = asyncHandler(async (req: Request, res: Response) => {
  const holiday = await holidayService.updateHoliday(req, req.params.id, req.body);
  return ok(res, holiday, 'Holiday updated');
});

export const deleteHolidayController = asyncHandler(async (req: Request, res: Response) => {
  await holidayService.deleteHoliday(req, req.params.id);
  return noContent(res);
});
