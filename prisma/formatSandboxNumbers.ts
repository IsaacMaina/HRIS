import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function formatSandboxPhoneNumbers() {
  console.log('Formatting phone numbers to Safaricom sandbox format...');
  
  try {
    // Get all employees with phone numbers
    const employees = await prisma.employee.findMany({
      where: {
        phone: {
          not: null
        }
      }
    });
    
    console.log(`Found ${employees.length} employees with phone numbers to format.`);
    
    // Common Safaricom sandbox test numbers
    const sandboxTestNumbers = [
      '254700000000',
      '254711082000', 
      '254711082001',
      '254711082002',
      '254711082003',
      '254711082004',
      '254701111111',
      '254759123456',
      '254707123456',
      '254796123456',
    ];
    
    let numberIndex = 0;
    
    for (const employee of employees) {
      if (employee.phone) {
        // Cycle through test numbers to assign different ones
        const newPhone = sandboxTestNumbers[numberIndex % sandboxTestNumbers.length];
        
        await prisma.employee.update({
          where: { id: employee.id },
          data: { 
            phone: newPhone 
          }
        });
        
        console.log(`Updated employee ${employee.id}: ${employee.phone} -> ${newPhone}`);
        numberIndex++;
      }
    }
    
    console.log('Phone number formatting to sandbox format completed successfully.');
  } catch (error) {
    console.error('Error formatting phone numbers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

formatSandboxPhoneNumbers()
  .then(() => {
    console.log('Database formatting to sandbox phone numbers completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database formatting to sandbox phone numbers failed:', error);
    process.exit(1);
  });