// scripts/create-student-accounts.ts
/**
 * 通过正确的业务逻辑为已报名学生自动生成用户账号
 * 模拟客户状态变更过程，触发自动账号创建
 */

import { PrismaClient, CustomerStatus } from '@prisma/client';
import { updateCustomer } from '../src/services/customer.service';

const prisma = new PrismaClient();

async function createStudentAccountsAutomatically() {
  console.log('🔄 开始通过业务逻辑自动创建学生账号...');
  
  try {
    // 获取所有已报名但没有用户账号的客户
    const enrolledCustomers = await prisma.customer.findMany({
      where: {
        status: CustomerStatus.ENROLLED,
        studentUser: null // 没有关联的用户账号
      },
      select: {
        id: true,
        name: true,
        publicId: true,
        status: true
      }
    });

    console.log(`找到 ${enrolledCustomers.length} 个已报名但未有账号的学生`);

    if (enrolledCustomers.length === 0) {
      console.log('✅ 所有已报名学生都已有账号');
      return;
    }

    // 通过正确的业务逻辑触发账号创建
    let successCount = 0;
    let failCount = 0;

    for (const customer of enrolledCustomers) {
      try {
        // 模拟状态变更：先改为其他状态，再改回ENROLLED
        // 这样会触发 createStudentAccountForCustomer 逻辑
        
        // 1. 先临时改为其他状态
        await prisma.customer.update({
          where: { id: customer.id },
          data: { status: CustomerStatus.INTERESTED }
        });

        // 2. 再改回ENROLLED，触发学生账号创建逻辑
        await updateCustomer(customer.id, { status: CustomerStatus.ENROLLED });
        
        console.log(`   ✅ 成功为 ${customer.name}(${customer.publicId}) 创建账号`);
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ 为 ${customer.name}(${customer.publicId}) 创建账号失败:`, error);
        failCount++;
      }
    }

    console.log('\n📊 创建结果统计：');
    console.log(`   ✅ 成功: ${successCount} 个`);
    console.log(`   ❌ 失败: ${failCount} 个`);

    // 验证创建结果
    const studentUsers = await prisma.user.findMany({
      where: { 
        role: 'STUDENT',
        linkedCustomerId: { not: null }
      },
      include: {
        linkedCustomer: {
          select: { name: true, publicId: true }
        }
      }
    });

    console.log(`\n👨‍🎓 现有学生账号总数: ${studentUsers.length}`);
    console.log('学生账号示例:');
    studentUsers.slice(0, 5).forEach(user => {
      console.log(`   ${user.linkedCustomer?.name} (${user.username}) - 密码: 123456`);
    });
    if (studentUsers.length > 5) {
      console.log(`   ... 还有 ${studentUsers.length - 5} 个学生账号`);
    }

  } catch (error) {
    console.error('❌ 自动创建学生账号过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
createStudentAccountsAutomatically()
  .catch(console.error); 