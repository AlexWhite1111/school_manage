// scripts/check-data.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 检查现有数据...');
  
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      publicId: true,
      name: true
    },
    orderBy: {
      id: 'asc'
    }
  });
  
  console.log('现有学生数据:');
  customers.forEach(customer => {
    console.log(`- ID: ${customer.id}, PublicID: ${customer.publicId}, 姓名: ${customer.name}`);
  });
  
  console.log(`\n总数: ${customers.length}个学生`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 