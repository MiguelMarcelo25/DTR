/**
 * Payroll computation engine — PURE functions, no I/O.
 *
 * The service layer gathers inputs (employee salary config + attendance/leave
 * aggregates for a period) and calls `computePayroll`. Keeping this pure makes
 * it deterministic and unit-testable, and lets the `recalculate` endpoint re-run
 * it safely.
 *
 * Money is handled as `number` here for arithmetic, then rounded to 2 decimals.
 * The service stores results as Prisma `Decimal` (string-safe).
 */

export type SalaryType = 'MONTHLY' | 'DAILY' | 'HOURLY';

/** Statutory + computation configuration. Defaults follow common PH practice
 *  (SSS / PhilHealth / Pag-IBIG / withholding). Tune these to your jurisdiction
 *  — they are intentionally centralised so policy lives in ONE place. */
export interface PayrollConfig {
  standardWorkingDaysPerMonth: number; // for converting monthly → daily rate
  standardDailyHours: number;
  overtimeMultiplier: number;
  sssEmployeeRate: number; // share of monthly basic
  philhealthEmployeeRate: number; // employee share
  pagibigRate: number;
  pagibigCap: number;
  withholdingTaxRate: number; // simplified flat rate on taxable income
}

export const DEFAULT_PAYROLL_CONFIG: PayrollConfig = {
  standardWorkingDaysPerMonth: 22,
  standardDailyHours: 8,
  overtimeMultiplier: 1.25,
  sssEmployeeRate: 0.045,
  philhealthEmployeeRate: 0.02,
  pagibigRate: 0.02,
  pagibigCap: 100,
  withholdingTaxRate: 0.1,
};

export interface PayrollInput {
  salaryType: SalaryType;
  /** Monthly salary (MONTHLY), daily rate (DAILY), or hourly rate (HOURLY). */
  basicSalary: number;
  /** Allowances for the period (flat). */
  allowances: number;
  /** Scheduled working days in the payroll period. */
  standardDaysInPeriod: number;
  daysWorked: number;
  absentDays: number;
  unpaidLeaveDays: number;
  lateMinutes: number;
  undertimeMinutes: number;
  overtimeHours: number;
  holidayPay?: number;
  otherDeductions?: number;
}

export interface PayrollLine {
  type: 'EARNING' | 'DEDUCTION';
  code: string;
  label: string;
  amount: number;
}

export interface PayrollResult {
  dailyRate: number;
  hourlyRate: number;
  basicPay: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  items: PayrollLine[];
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Resolve daily & hourly rates from the salary type. */
export function resolveRates(
  salaryType: SalaryType,
  basicSalary: number,
  cfg: PayrollConfig,
): { dailyRate: number; hourlyRate: number; monthlyBasic: number } {
  switch (salaryType) {
    case 'MONTHLY': {
      const dailyRate = basicSalary / cfg.standardWorkingDaysPerMonth;
      return { dailyRate, hourlyRate: dailyRate / cfg.standardDailyHours, monthlyBasic: basicSalary };
    }
    case 'DAILY': {
      return {
        dailyRate: basicSalary,
        hourlyRate: basicSalary / cfg.standardDailyHours,
        monthlyBasic: basicSalary * cfg.standardWorkingDaysPerMonth,
      };
    }
    case 'HOURLY': {
      const dailyRate = basicSalary * cfg.standardDailyHours;
      return {
        dailyRate,
        hourlyRate: basicSalary,
        monthlyBasic: dailyRate * cfg.standardWorkingDaysPerMonth,
      };
    }
  }
}

export function computeStatutory(
  monthlyBasic: number,
  cfg: PayrollConfig,
): { sss: number; philhealth: number; pagibig: number } {
  return {
    sss: round2(monthlyBasic * cfg.sssEmployeeRate),
    philhealth: round2(monthlyBasic * cfg.philhealthEmployeeRate),
    pagibig: round2(Math.min(monthlyBasic * cfg.pagibigRate, cfg.pagibigCap)),
  };
}

export function computePayroll(
  input: PayrollInput,
  cfg: PayrollConfig = DEFAULT_PAYROLL_CONFIG,
): PayrollResult {
  const { dailyRate, hourlyRate, monthlyBasic } = resolveRates(
    input.salaryType,
    input.basicSalary,
    cfg,
  );
  const minuteRate = hourlyRate / 60;

  // ── Earnings ──
  const basicPay = round2(dailyRate * input.standardDaysInPeriod);
  const overtimePay = round2(input.overtimeHours * hourlyRate * cfg.overtimeMultiplier);
  const holidayPay = round2(input.holidayPay ?? 0);
  const allowances = round2(input.allowances);

  // ── Attendance deductions (reduce earnings → gross) ──
  const lateDed = round2(input.lateMinutes * minuteRate);
  const undertimeDed = round2(input.undertimeMinutes * minuteRate);
  const absenceDed = round2(input.absentDays * dailyRate);
  const leaveDed = round2(input.unpaidLeaveDays * dailyRate);

  const totalEarnings = round2(basicPay + overtimePay + holidayPay + allowances);
  const attendanceDeductions = round2(lateDed + undertimeDed + absenceDed + leaveDed);
  const grossPay = round2(totalEarnings - attendanceDeductions);

  // ── Statutory + tax (reduce gross → net) ──
  const { sss, philhealth, pagibig } = computeStatutory(monthlyBasic, cfg);
  const taxable = Math.max(0, grossPay - (sss + philhealth + pagibig));
  const tax = round2(taxable * cfg.withholdingTaxRate);
  const otherDeductions = round2(input.otherDeductions ?? 0);

  const statutoryDeductions = round2(tax + sss + philhealth + pagibig + otherDeductions);
  const totalDeductions = round2(attendanceDeductions + statutoryDeductions);
  const netPay = round2(grossPay - statutoryDeductions);

  const lines: PayrollLine[] = [
    { type: 'EARNING', code: 'BASIC', label: 'Basic Pay', amount: basicPay },
    { type: 'EARNING', code: 'OVERTIME', label: 'Overtime Pay', amount: overtimePay },
    { type: 'EARNING', code: 'HOLIDAY', label: 'Holiday Pay', amount: holidayPay },
    { type: 'EARNING', code: 'ALLOWANCE', label: 'Allowances', amount: allowances },
    { type: 'DEDUCTION', code: 'LATE', label: 'Late Deduction', amount: lateDed },
    { type: 'DEDUCTION', code: 'UNDERTIME', label: 'Undertime Deduction', amount: undertimeDed },
    { type: 'DEDUCTION', code: 'ABSENCE', label: 'Absence Deduction', amount: absenceDed },
    { type: 'DEDUCTION', code: 'LEAVE', label: 'Unpaid Leave Deduction', amount: leaveDed },
    { type: 'DEDUCTION', code: 'TAX', label: 'Withholding Tax', amount: tax },
    { type: 'DEDUCTION', code: 'SSS', label: 'SSS Contribution', amount: sss },
    { type: 'DEDUCTION', code: 'PHILHEALTH', label: 'PhilHealth Contribution', amount: philhealth },
    { type: 'DEDUCTION', code: 'PAGIBIG', label: 'Pag-IBIG Contribution', amount: pagibig },
    { type: 'DEDUCTION', code: 'OTHER', label: 'Other Deductions', amount: otherDeductions },
  ];
  const items = lines.filter((i) => i.amount !== 0);

  return {
    dailyRate: round2(dailyRate),
    hourlyRate: round2(hourlyRate),
    basicPay,
    grossPay,
    totalDeductions,
    netPay,
    items,
  };
}
