import { PrismaClient, Role, LeaveType, LeaveStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Clear existing data in correct order (respecting foreign key constraints)
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.payout.deleteMany(); // Delete payouts first (new model we added)
  await prisma.leaveRequest.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.bank.deleteMany();
  console.log('Cleared existing data.');

  // Seed Kenyan Banks
  const kenyanBanks = [
    { name: 'Equity Bank', code: 'EQBK' },
    { name: 'KCB Bank', code: 'KCB' },
    { name: 'Co-operative Bank', code: 'COOP' },
    { name: 'Family Bank', code: 'FAMB' },
    { name: 'NCBA Bank', code: 'NCBA' },
  ];

  const banks = [];
  for (const bankData of kenyanBanks) {
    const bank = await prisma.bank.create({
      data: bankData,
    });
    banks.push(bank);
  }
  console.log(`Seeded ${banks.length} Kenyan banks.`);

  // Create specific users
  const commonPasswordHash = await bcrypt.hash('123456', 10); // Common password for all seeded users

  // Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: commonPasswordHash,
      role: Role.ADMIN,
    },
  });
  console.log('Created Admin User:', adminUser.email);

  // HR User
  const hrUser = await prisma.user.create({
    data: {
      email: 'hr@example.com',
      name: 'HR User',
      password: commonPasswordHash,
      role: Role.HR,
    },
  });
  console.log('Created HR User:', hrUser.email);

  // Finance User
  const financeUser = await prisma.user.create({
    data: {
      email: 'finance@example.com',
      name: 'Finance User',
      password: commonPasswordHash,
      role: Role.FINANCE,
    },
  });
  console.log('Created Finance User:', financeUser.email);

  // Report User
  const reportUser = await prisma.user.create({
    data: {
      email: 'report@example.com',
      name: 'Report User',
      password: commonPasswordHash,
      role: Role.REPORT,
    },
  });
  console.log('Created Report User:', reportUser.email);

  // Employee Users
  const kenyanFirstNames = ['Akinyi', 'Chebet', 'Juma', 'Kamau', 'Kariuki', 'Kipchoge', 'Muthoni', 'Njoroge', 'Ochieng', 'Wanjiku', 'Waweru', 'Mwangi', 'Njeri', 'Onyango', 'Wafula'];
  const kenyanLastNames = ['Onyango', 'Koech', 'Mwangi', 'Wanjala', 'Kariuki', 'Kimani', 'Cheruiyot', 'Ngugi', 'Otieno', 'Wanjiru', 'Muthoni', 'Njoroge', 'Kipkemboi', 'Rotich', 'Omondi'];

  const employeeUsers = [];
  for (let i = 0; i < 50; i++) {
    const firstName = kenyanFirstNames[faker.number.int({ min: 0, max: kenyanFirstNames.length - 1 })];
    const lastName = kenyanLastNames[faker.number.int({ min: 0, max: kenyanLastNames.length - 1 })];
    const fullName = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${faker.number.int({ min: 1, max: 99 })}@kfu.ac.ke`; // Using a university-specific domain

    const user = await prisma.user.create({
      data: {
        email: email,
        name: fullName,
        password: commonPasswordHash,
        role: Role.EMPLOYEE,
      },
    });
    employeeUsers.push(user);
  }
  console.log(`Created ${employeeUsers.length} Employee Users.`);

  // Create Employees for all users (Admin, HR, Finance, Report, and Employee Users)
  const allUsers = [adminUser, hrUser, financeUser, reportUser, ...employeeUsers];
  const employees = [];

  for (let i = 0; i < allUsers.length; i++) {
    const user = allUsers[i];

    // Generate Safaricom sandbox test phone numbers
    const sandboxTestNumbers = [
      '+254700000000', // Common Safaricom test number
      '+254711082***', // Format for Safaricom test numbers
      '+254701111111', // Another common test number
      '+254720123456', // Safaricom test number format
      '+254730123456', // Aitel test number format
      '+254707123456', // Yu test number format
    ];

    // Use proper Safaricom sandbox test numbers
    // Common Safaricom test numbers for sandbox environment
    const sandboxTestNumbers = [
      '+254700000000',
      '+254711082000',
      '+254711082001',
      '+254711082002',
      '+254711082003',
      '+254711082004',
      '+254701111111',
      '+254759123456',
      '+254707123456',
      '+254796123456',
    ];
    const phone = faker.helpers.arrayElement(sandboxTestNumbers);

    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        staffNo: faker.string.alphanumeric(8).toUpperCase(),
        position: faker.person.jobTitle(),
        department: faker.commerce.department(),
        salary: faker.number.float({ min: 30000, max: 150000, fractionDigits: 2 }),
        nhifRate: faker.number.float({ min: 0.01, max: 0.05, fractionDigits: 3 }),
        nssfRate: faker.number.float({ min: 0.01, max: 0.06, fractionDigits: 3 }),
        bankId: banks[faker.number.int({ min: 0, max: banks.length - 1 })].id,
        bankAccNo: faker.finance.accountNumber(),
        phone: i % 2 === 0 ? phone : null, // About 1/2 of employees have phone numbers for M-Pesa
      },
    });
    employees.push(employee);
  }
  console.log(`Seeded ${employees.length} employees with realistic payment details.`);

  // Seed LeaveRequests
  const leaveTypes = [LeaveType.ANNUAL, LeaveType.SICK, LeaveType.UNPAID, LeaveType.MATERNITY];
  const leaveStatuses = [LeaveStatus.PENDING, LeaveStatus.APPROVED, LeaveStatus.REJECTED];
  for (let i = 0; i < employees.length * 2; i++) { // Seed 2 leave requests per employee
    const employee = employees[faker.number.int({ min: 0, max: employees.length - 1 })];
    const startDate = faker.date.recent({ days: 365 });
    const endDate = faker.date.soon({ days: 14, refDate: startDate });

    await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        type: leaveTypes[faker.number.int({ min: 0, max: leaveTypes.length - 1 })],
        startDate: startDate,
        endDate: endDate,
        status: leaveStatuses[faker.number.int({ min: 0, max: leaveStatuses.length - 1 })],
      },
    });
  }
  console.log(`Seeded ${employees.length * 2} leave requests.`);

  // Seed Payslips
  for (let i = 0; i < employees.length * 3; i++) { // Seed 3 payslips per employee
    const employee = employees[faker.number.int({ min: 0, max: employees.length - 1 })];
    const grossSalary = faker.number.float({ min: 30000, max: 150000, fractionDigits: 2 });
    const deductions = {
      tax: faker.number.float({ min: 0.1, max: 0.3, fractionDigits: 2 }) * grossSalary,
      nhif: faker.number.float({ min: 500, max: 1700, fractionDigits: 0 }),
      nssf: faker.number.float({ min: 200, max: 1000, fractionDigits: 0 }),
    };
    const netPay = grossSalary - (deductions.tax + deductions.nhif + deductions.nssf);

    await prisma.payslip.create({
      data: {
        employeeId: employee.id,
        month: faker.date.past({ years: 1 }),
        grossSalary: grossSalary,
        deductions: deductions,
        netPay: netPay,
        fileUrl: faker.internet.url(),
        paid: faker.datatype.boolean(),
        payoutRef: faker.string.alphanumeric(15).toUpperCase(),
      },
    });
  }
  console.log(`Seeded ${employees.length * 3} payslips.`);

  // Seed Documents
  for (let i = 0; i < employees.length * 2; i++) { // Seed 2 documents per employee
    const employee = employees[faker.number.int({ min: 0, max: employees.length - 1 })];
    await prisma.document.create({
      data: {
        employeeId: employee.id,
        filename: faker.system.fileName(),
        path: faker.internet.url(),
      },
    });
  }
  console.log(`Seeded ${employees.length * 2} documents.`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
