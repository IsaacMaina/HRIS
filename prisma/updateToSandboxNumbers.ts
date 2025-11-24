import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateToSandboxNumbers() {
  console.log('Updating phone numbers to Safaricom sandbox test numbers...');
  
  try {
    // Get all employees with phone numbers
    const employees = await prisma.employee.findMany({
      where: {
        phone: {
          not: null
        }
      }
    });
    
    console.log(`Found ${employees.length} employees with phone numbers to update.`);
    
    // Common Safaricom sandbox test numbers
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
    
    console.log('Phone number update to sandbox test numbers completed successfully.');
  } catch (error) {
    console.error('Error updating phone numbers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateToSandboxNumbers()
  .then(() => {
    console.log('Database update to sandbox test numbers completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database update to sandbox test numbers failed:', error);
    process.exit(1);
  });