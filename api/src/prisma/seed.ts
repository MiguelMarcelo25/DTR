/* eslint-disable no-console */
import { PrismaClient, RoleName } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const hash = (pw: string) => bcrypt.hash(pw, 12);

async function main() {
  console.log('🌱 Seeding HRMS database...');

  // ── Roles ──
  const roleData: { name: RoleName; description: string }[] = [
    { name: 'SUPER_ADMIN', description: 'Full system access' },
    { name: 'ADMIN', description: 'Operational administration' },
    { name: 'HR', description: 'Human resources management' },
    { name: 'EMPLOYEE', description: 'Self-service employee access' },
    { name: 'CLIENT', description: 'External client (support portal)' },
  ];
  const roles: Record<string, string> = {};
  for (const r of roleData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    roles[r.name] = role.id;
  }
  console.log('  ✓ roles');

  // ── Departments ──
  const departments = await Promise.all(
    [
      { name: 'Human Resources', code: 'HR' },
      { name: 'Information Technology', code: 'IT' },
      { name: 'Finance', code: 'FIN' },
      { name: 'Operations', code: 'OPS' },
    ].map((d) =>
      prisma.department.upsert({ where: { name: d.name }, update: {}, create: d }),
    ),
  );
  console.log('  ✓ departments');

  // ── Positions ── (title isn't unique, so seed idempotently via findFirst)
  const positionSeed = [
    { title: 'HR Manager', level: 'Manager', departmentId: departments[0].id },
    { title: 'HR Officer', level: 'Officer', departmentId: departments[0].id },
    { title: 'Software Engineer', level: 'Staff', departmentId: departments[1].id },
    { title: 'IT Administrator', level: 'Staff', departmentId: departments[1].id },
    { title: 'Accountant', level: 'Staff', departmentId: departments[2].id },
    { title: 'Operations Associate', level: 'Staff', departmentId: departments[3].id },
  ];
  const positions = [];
  for (const p of positionSeed) {
    const found = await prisma.position.findFirst({
      where: { title: p.title, departmentId: p.departmentId },
    });
    positions.push(found ?? (await prisma.position.create({ data: p })));
  }
  console.log('  ✓ positions');

  // ── Branches ──
  const branch = await prisma.branch.upsert({
    where: { name: 'Head Office' },
    update: {},
    create: { name: 'Head Office', address: '123 Main St, Manila' },
  });
  console.log('  ✓ branches');

  // ── Schedules ──
  const schedule = await prisma.schedule.upsert({
    where: { name: 'Regular Day Shift' },
    update: {},
    create: {
      name: 'Regular Day Shift',
      timeIn: '08:00',
      timeOut: '17:00',
      breakMinutes: 60,
      gracePeriodMinutes: 15,
      workDays: [1, 2, 3, 4, 5],
    },
  });
  console.log('  ✓ schedules');

  // ── Leave types ──
  const leaveTypes = [
    { name: 'Vacation Leave', defaultDays: 15, isPaid: true },
    { name: 'Sick Leave', defaultDays: 15, isPaid: true },
    { name: 'Emergency Leave', defaultDays: 5, isPaid: true },
    { name: 'Maternity Leave', defaultDays: 105, isPaid: true },
    { name: 'Paternity Leave', defaultDays: 7, isPaid: true },
    { name: 'Unpaid Leave', defaultDays: 0, isPaid: false },
  ];
  const createdLeaveTypes = await Promise.all(
    leaveTypes.map((lt) =>
      prisma.leaveType.upsert({ where: { name: lt.name }, update: {}, create: lt }),
    ),
  );
  console.log('  ✓ leave types');

  // ── Users + employees ──
  const year = new Date().getFullYear();

  async function createStaff(opts: {
    email: string;
    password: string;
    role: RoleName;
    employeeNo: string;
    firstName: string;
    lastName: string;
    departmentId: string;
    positionId: string;
    basicSalary: number;
  }) {
    const passwordHash = await hash(opts.password);
    const user = await prisma.user.upsert({
      where: { email: opts.email },
      update: {},
      create: {
        email: opts.email,
        passwordHash,
        userRoles: { create: [{ roleId: roles[opts.role] }] },
      },
    });

    const existing = await prisma.employee.findUnique({ where: { employeeNo: opts.employeeNo } });
    if (existing) return user;

    const employee = await prisma.employee.create({
      data: {
        employeeNo: opts.employeeNo,
        userId: user.id,
        departmentId: opts.departmentId,
        positionId: opts.positionId,
        branchId: branch.id,
        scheduleId: schedule.id,
        employmentType: 'REGULAR',
        employmentStatus: 'ACTIVE',
        dateHired: new Date(`${year - 2}-01-15`),
        regularizationDate: new Date(`${year - 2}-07-15`),
        profile: {
          create: {
            firstName: opts.firstName,
            lastName: opts.lastName,
            email: opts.email,
            salaryType: 'MONTHLY',
            basicSalary: opts.basicSalary,
            allowances: 2000,
          },
        },
        timeline: {
          create: { eventType: 'HIRED', description: 'Employee hired (seed)' },
        },
      },
    });

    // Leave balances for each paid leave type
    await prisma.leaveBalance.createMany({
      data: createdLeaveTypes
        .filter((lt) => lt.isPaid)
        .map((lt) => ({
          employeeId: employee.id,
          leaveTypeId: lt.id,
          year,
          entitled: lt.defaultDays,
          used: 0,
        })),
      skipDuplicates: true,
    });

    return user;
  }

  await createStaff({
    email: 'superadmin@hrms.local',
    password: 'Password123!',
    role: 'SUPER_ADMIN',
    employeeNo: 'EMP-0001',
    firstName: 'Super',
    lastName: 'Admin',
    departmentId: departments[1].id,
    positionId: positions[3].id,
    basicSalary: 90000,
  });

  await createStaff({
    email: 'admin@hrms.local',
    password: 'Password123!',
    role: 'ADMIN',
    employeeNo: 'EMP-0002',
    firstName: 'System',
    lastName: 'Administrator',
    departmentId: departments[3].id,
    positionId: positions[5].id,
    basicSalary: 60000,
  });

  await createStaff({
    email: 'hr@hrms.local',
    password: 'Password123!',
    role: 'HR',
    employeeNo: 'EMP-0003',
    firstName: 'Hannah',
    lastName: 'Reyes',
    departmentId: departments[0].id,
    positionId: positions[0].id,
    basicSalary: 55000,
  });

  await createStaff({
    email: 'employee@hrms.local',
    password: 'Password123!',
    role: 'EMPLOYEE',
    employeeNo: 'EMP-0004',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    departmentId: departments[1].id,
    positionId: positions[2].id,
    basicSalary: 35000,
  });

  console.log('  ✓ users + employees + leave balances');

  // ── Demo client + sample support ticket ──
  const clientUser = await prisma.user.upsert({
    where: { email: 'client@demo.local' },
    update: {},
    create: {
      email: 'client@demo.local',
      passwordHash: await hash('Password123!'),
      userRoles: { create: [{ roleId: roles['CLIENT'] }] },
      clientProfile: { create: { fullName: 'Maria Santos', company: 'Acme Corp', phone: '0917-000-0000' } },
    },
  });

  const existingTicket = await prisma.supportTicket.findFirst({ where: { clientId: clientUser.id } });
  if (!existingTicket) {
    await prisma.supportTicket.create({
      data: {
        ticketNo: 'TKT-00001',
        subject: 'Cannot access my account',
        description: 'I get an error when logging into the portal. Please help.',
        category: 'TECHNICAL',
        priority: 'HIGH',
        status: 'NEW',
        boardOrder: 0,
        clientId: clientUser.id,
        events: { create: { type: 'CREATED', description: 'Ticket created', actorId: clientUser.id } },
      },
    });
  }
  console.log('  ✓ demo client + sample ticket');

  console.log('✅ Seed complete.');
  console.log('   Login: superadmin@hrms.local / Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
