import { describe, it, expect } from 'vitest';
import {
  computePayroll,
  resolveRates,
  DEFAULT_PAYROLL_CONFIG,
  type PayrollInput,
} from './payroll';

const baseInput: PayrollInput = {
  salaryType: 'MONTHLY',
  basicSalary: 22000, // → daily 1000, hourly 125 at 22 days / 8h
  allowances: 0,
  standardDaysInPeriod: 22,
  daysWorked: 22,
  absentDays: 0,
  unpaidLeaveDays: 0,
  lateMinutes: 0,
  undertimeMinutes: 0,
  overtimeHours: 0,
};

describe('resolveRates', () => {
  it('derives daily and hourly rates from a monthly salary', () => {
    const r = resolveRates('MONTHLY', 22000, DEFAULT_PAYROLL_CONFIG);
    expect(r.dailyRate).toBe(1000);
    expect(r.hourlyRate).toBe(125);
  });

  it('derives monthly equivalent from a daily rate', () => {
    const r = resolveRates('DAILY', 1000, DEFAULT_PAYROLL_CONFIG);
    expect(r.dailyRate).toBe(1000);
    expect(r.monthlyBasic).toBe(22000);
  });
});

describe('computePayroll', () => {
  it('computes a clean full-attendance payroll', () => {
    const r = computePayroll(baseInput);
    expect(r.basicPay).toBe(22000);
    // gross = basic - 0 attendance deductions
    expect(r.grossPay).toBe(22000);
    // statutory: sss 4.5% (990) + philhealth 2% (440) + pagibig min(440,100)=100
    // tax = 10% of (22000 - 1530) = 2047
    expect(r.netPay).toBeCloseTo(22000 - (990 + 440 + 100 + 2047), 2);
  });

  it('deducts late and undertime by the minute', () => {
    const r = computePayroll({ ...baseInput, lateMinutes: 60, undertimeMinutes: 30 });
    // minuteRate = 125/60; 90 minutes ≈ 187.5 off gross
    expect(r.grossPay).toBeLessThan(22000);
    const late = r.items.find((i) => i.code === 'LATE');
    const ut = r.items.find((i) => i.code === 'UNDERTIME');
    expect(late?.amount).toBeCloseTo(125, 2);
    expect(ut?.amount).toBeCloseTo(62.5, 2);
  });

  it('deducts absences at the daily rate', () => {
    const r = computePayroll({ ...baseInput, absentDays: 2 });
    const absence = r.items.find((i) => i.code === 'ABSENCE');
    expect(absence?.amount).toBe(2000);
    expect(r.grossPay).toBe(20000);
  });

  it('pays overtime with the configured multiplier', () => {
    const r = computePayroll({ ...baseInput, overtimeHours: 10 });
    const ot = r.items.find((i) => i.code === 'OVERTIME');
    expect(ot?.amount).toBeCloseTo(10 * 125 * 1.25, 2); // 1562.5
  });

  it('never produces a negative net pay shape and balances totals', () => {
    const r = computePayroll({ ...baseInput, allowances: 3000 });
    const earnings = r.items.filter((i) => i.type === 'EARNING').reduce((s, i) => s + i.amount, 0);
    const deductions = r.items.filter((i) => i.type === 'DEDUCTION').reduce((s, i) => s + i.amount, 0);
    // gross = earnings - attendance deductions; net = gross - statutory
    expect(Math.round((earnings - deductions) * 100) / 100).toBeCloseTo(r.netPay, 2);
  });
});
