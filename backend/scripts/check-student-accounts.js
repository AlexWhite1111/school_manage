// 检查学生账户创建关联逻辑的问题
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkStudentAccounts() {
  console.log('🔍 开始检查学生账户创建关联逻辑...');
  
  try {
    // 1. 检查重复的publicId
    console.log('\n1. 检查重复的publicId:');
    const allCustomers = await prisma.customer.findMany({
      select: { publicId: true }
    });
    
    const publicIdCounts = {};
    allCustomers.forEach(customer => {
      if (customer.publicId) {
        publicIdCounts[customer.publicId] = (publicIdCounts[customer.publicId] || 0) + 1;
      }
    });
    
    const duplicatePublicIds = Object.entries(publicIdCounts).filter(([id, count]) => count > 1);
    
    if (duplicatePublicIds.length > 0) {
      console.log('❌ 发现重复的publicId:');
      duplicatePublicIds.forEach(([publicId, count]) => {
        console.log(`   publicId: ${publicId}, 重复次数: ${count}`);
      });
    } else {
      console.log('✅ 没有发现重复的publicId');
    }

    // 2. 检查重复的用户名
    console.log('\n2. 检查重复的用户名:');
    const allUsers = await prisma.user.findMany({
      select: { username: true }
    });
    
    const usernameCounts = {};
    allUsers.forEach(user => {
      if (user.username) {
        usernameCounts[user.username] = (usernameCounts[user.username] || 0) + 1;
      }
    });
    
    const duplicateUsernames = Object.entries(usernameCounts).filter(([username, count]) => count > 1);
    
    if (duplicateUsernames.length > 0) {
      console.log('❌ 发现重复的用户名:');
      duplicateUsernames.forEach(([username, count]) => {
        console.log(`   用户名: ${username}, 重复次数: ${count}`);
      });
    } else {
      console.log('✅ 没有发现重复的用户名');
    }

    // 3. 检查已报名但没有学生账户的客户
    console.log('\n3. 检查已报名但没有学生账户的客户:');
    const enrolledWithoutAccount = await prisma.customer.findMany({
      where: {
        status: 'ENROLLED',
        studentUser: null
      },
      select: {
        id: true,
        name: true,
        publicId: true,
        status: true
      }
    });
    
    if (enrolledWithoutAccount.length > 0) {
      console.log(`❌ 发现 ${enrolledWithoutAccount.length} 个已报名但没有学生账户的客户:`);
      enrolledWithoutAccount.forEach(customer => {
        console.log(`   ${customer.name} (${customer.publicId})`);
      });
    } else {
      console.log('✅ 所有已报名客户都有学生账户');
    }

    // 4. 检查有学生账户但客户状态不是ENROLLED的情况
    console.log('\n4. 检查有学生账户但客户状态不是ENROLLED的情况:');
    const accountWithoutEnrolled = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        linkedCustomer: {
          status: { not: 'ENROLLED' }
        }
      },
      include: {
        linkedCustomer: {
          select: {
            name: true,
            publicId: true,
            status: true
          }
        }
      }
    });
    
    if (accountWithoutEnrolled.length > 0) {
      console.log(`⚠️ 发现 ${accountWithoutEnrolled.length} 个有学生账户但客户状态不是ENROLLED的情况:`);
      accountWithoutEnrolled.forEach(user => {
        console.log(`   用户: ${user.username}, 客户: ${user.linkedCustomer?.name}, 状态: ${user.linkedCustomer?.status}`);
      });
    } else {
      console.log('✅ 所有学生账户对应的客户状态都是ENROLLED');
    }

    // 5. 检查用户名与publicId不匹配的情况
    console.log('\n5. 检查用户名与publicId不匹配的情况:');
    const mismatchedAccounts = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        linkedCustomerId: { not: null }
      },
      include: {
        linkedCustomer: {
          select: {
            publicId: true,
            name: true
          }
        }
      }
    });
    
    const mismatched = mismatchedAccounts.filter(user => 
      user.username !== user.linkedCustomer?.publicId
    );
    
    if (mismatched.length > 0) {
      console.log(`❌ 发现 ${mismatched.length} 个用户名与publicId不匹配的情况:`);
      mismatched.forEach(user => {
        console.log(`   用户名: ${user.username}, publicId: ${user.linkedCustomer?.publicId}, 客户: ${user.linkedCustomer?.name}`);
      });
    } else {
      console.log('✅ 所有学生账户的用户名都与publicId匹配');
    }

    // 6. 统计信息
    console.log('\n📊 统计信息:');
    const totalCustomers = await prisma.customer.count();
    const enrolledCustomers = await prisma.customer.count({ where: { status: 'ENROLLED' } });
    const studentUsers = await prisma.user.count({ where: { role: 'STUDENT' } });
    const linkedStudentUsers = await prisma.user.count({ 
      where: { 
        role: 'STUDENT',
        linkedCustomerId: { not: null }
      }
    });
    
    console.log(`   总客户数: ${totalCustomers}`);
    console.log(`   已报名客户数: ${enrolledCustomers}`);
    console.log(`   学生用户总数: ${studentUsers}`);
    console.log(`   关联客户的学生用户数: ${linkedStudentUsers}`);
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudentAccounts().catch(console.error);