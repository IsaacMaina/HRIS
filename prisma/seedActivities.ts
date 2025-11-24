import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function seedActivities() {
  try {
    console.log('Seeding activities...');
    
    // Get all employees to associate activities with them
    const employees = await prisma.employee.findMany();
    
    if (employees.length === 0) {
      console.log('No employees found. Please seed employees first.');
      return;
    }

    // Clear existing activities (optional)
    await prisma.activity.deleteMany();
    console.log('Cleared existing activities.');

    // Sample activity data
    const activityTypes = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT'];
    const modules = ['EMPLOYEE', 'LEAVE', 'PAYROLL', 'DOCUMENT', 'SETTINGS', 'NOTIFICATION'];
    const descriptions = [
      'Created new employee record',
      'Updated employee details',
      'Deleted employee record',
      'Viewed employee profile',
      'Logged into the system',
      'Logged out of the system',
      'Approved leave request',
      'Rejected leave request',
      'Generated payslip',
      'Updated system settings'
    ];

    // Create sample activities
    for (let i = 0; i < 20; i++) {
      const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
      
      await prisma.activity.create({
        data: {
          employeeId: randomEmployee.id,
          actionType: activityTypes[Math.floor(Math.random() * activityTypes.length)],
          description: descriptions[Math.floor(Math.random() * descriptions.length)],
          module: modules[Math.floor(Math.random() * modules.length)],
          timestamp: faker.date.recent({ days: 30 }), // Random date within last 30 days
          details: {
            userAgent: faker.internet.userAgent(),
            ip: faker.internet.ip(),
          },
        },
      });
    }

    console.log('Seeded 20 sample activities.');
  } catch (error) {
    console.error('Error seeding activities:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedActivities();