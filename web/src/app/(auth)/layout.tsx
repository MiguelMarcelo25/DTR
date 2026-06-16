import { Building2, ShieldCheck, CalendarClock, Wallet } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex">
        {/* atmosphere */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-success/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex items-center gap-3 animate-fade-up">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-pop">
            <Building2 className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold">HR Management System</span>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight animate-fade-up" style={{ animationDelay: '60ms' }}>
            Everything HR,
            <br />
            in one calm place.
          </h1>
          <p className="text-white/70 animate-fade-up" style={{ animationDelay: '120ms' }}>
            Attendance &amp; DTR, leave, payroll, appointments, and employee
            profiling — secure, role-based, and beautifully organized.
          </p>
          <ul className="space-y-3 text-sm text-white/80">
            {[
              { icon: CalendarClock, text: 'Time tracking, DTR & leave in one flow' },
              { icon: Wallet, text: 'Automated, auditable payroll & payslips' },
              { icon: ShieldCheck, text: 'Role-based access with full audit trail' },
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: `${180 + i * 60}ms` }}>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <f.icon className="h-4 w-4" />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/40">© {new Date().getFullYear()} HRMS · All rights reserved</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm animate-fade-up">{children}</div>
      </div>
    </div>
  );
}
