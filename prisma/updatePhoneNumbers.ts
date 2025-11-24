import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePhoneNumbers() {
  console.log('Updating phone numbers to add + prefix to Kenyan numbers...');
  
  try {
    // Get all employees with phone numbers starting with "254" but not "+254"
    const employees = await prisma.employee.findMany({
      where: {
        phone: {
          startsWith: '254',
          not: { startsWith: '+254' } // Exclude those that are already correct
        }
      }
    });
    
    console.log(`Found ${employees.length} employees with phone numbers to update.`);
    
    for (const employee of employees) {
      if (employee.phone && employee.phone.startsWith('254')) {
        const updatedPhone = '+' + employee.phone;
        
        await prisma.employee.update({
          where: { id: employee.id },
          data: { 
            phone: updatedPhone 
          }
        });
        
        console.log(`Updated employee ${employee.id}: ${employee.phone} -> ${updatedPhone}`);
      }
    }
    
    console.log('Phone number update completed successfully.');
  } catch (error) {
    console.error('Error updating phone numbers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updatePhoneNumbers()
  .then(() => {
    console.log('Database update completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database update failed:', error);
    process.exit(1);
  });