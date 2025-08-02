// scripts/seed-test-data.ts
// 测试数据种子脚本 - 生成开发/测试环境的模拟数据

import { PrismaClient, CustomerStatus, Gender, AttendanceStatus, AttendanceSlot, Tag, Class, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { generateUniquePublicId } from '../src/utils/idGenerator';
import initDatabase from './init-db';

const prisma = new PrismaClient();

// 随机数据池
const firstNames = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十', '陈一', '刘二', '黄三', '杨四', '朱五', '秦六', '许七', '何八', '吕九', '施十', '张明', '李华', '王丽', '赵敏', '孙磊', '周杰', '吴梅', '郑浩', '陈静', '刘强', '黄莉', '杨帆', '朱红', '秦刚', '许芳', '何斌', '吕娟', '施伟', '张玲', '李军', '王娜', '赵涛'];
const lastNames = ['张', '李', '王', '赵', '孙', '周', '吴', '郑', '陈', '刘', '黄', '杨', '朱', '秦', '许', '何', '吕', '施'];
const schools = ['实验小学', '第一小学', '第二小学', '第三小学', '育才小学', '希望小学', '阳光小学', '未来小学', '星光小学', '明德小学', '智慧小学', '博文小学', '新华小学', '光明小学', '红星小学'];
const grades = ['CHU_YI', 'CHU_ER', 'CHU_SAN', 'GAO_YI', 'GAO_ER', 'GAO_SAN'];
const addresses = ['海淀区', '朝阳区', '东城区', '西城区', '丰台区', '石景山区', '通州区', '大兴区', '房山区', '门头沟区', '昌平区', '顺义区', '怀柔区', '平谷区', '密云区', '延庆区'];
const sourceChannels = ['JIAZHANG_TUIJIAN', 'PENGYOU_QINQI', 'XUESHENG_SHEJIAO', 'GUANGGAO_CHUANDAN', 'DITUI_XUANCHUAN', 'WEIXIN_GONGZHONGHAO', 'DOUYIN', 'QITA_MEITI', 'HEZUO', 'QITA'];
const relationships = ['父亲', '母亲', '爷爷', '奶奶', '外公', '外婆', '叔叔', '阿姨'];
const phonePrefix = ['138', '139', '150', '151', '152', '158', '159', '130', '131', '132', '155', '156', '185', '186', '176', '177', '178'];

// 工具函数
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomName(): string {
  return randomItem(lastNames) + randomItem(firstNames).slice(1);
}

function randomPhone(): string {
  const prefix = randomItem(phonePrefix);
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + suffix;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomBirthDate(): Date {
  const start = new Date(2010, 0, 1);
  const end = new Date(2018, 11, 31);
  return randomDate(start, end);
}

function randomRecentDate(daysBack: number): Date {
  const now = new Date();
  const start = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return randomDate(start, now);
}

async function seedTestData() {
  console.log('🌱 开始生成测试数据...');

  try {
    // 首先确保基础数据存在
    await initDatabase();

    // 1. 创建测试用的管理员和教师账号
    const defaultPassword = '123456';
    const hashedPassword = await hash(defaultPassword, 10);

    // 创建管理员
    await prisma.user.upsert({
      where: { username: 'manager' },
      update: {},
      create: {
        username: 'manager',
        displayName: '系统管理员',
        passwordHash: hashedPassword,
        email: 'manager@example.com',
        phone: '15000000002',
        role: UserRole.MANAGER,
        mustChangePassword: false
      },
    });

    // 创建教师
    await prisma.user.upsert({
      where: { username: 'teacher' },
      update: {},
      create: {
        username: 'teacher',
        displayName: '李老师',
        passwordHash: hashedPassword,
        email: 'teacher@example.com', 
        phone: '15000000003',
        role: UserRole.TEACHER,
        mustChangePassword: false
      },
    });

    console.log('✅ 测试用户账号创建完成');

    // 2. 创建测试班级
    const testClasses = ['数学提高班', '英语强化班', '物理实验班', '化学基础班', '生物探究班'];
    const createdClasses: Class[] = [];
    
    for (const className of testClasses) {
      const createdClass = await prisma.class.upsert({
        where: { name: className },
        update: {},
        create: {
          name: className,
        },
      });
      createdClasses.push(createdClass);
    }
    console.log('✅ 测试班级创建完成');

    // 3. 生成测试客户数据
    console.log('📝 开始生成测试客户数据...');
    const customerStatuses: CustomerStatus[] = ['POTENTIAL', 'INITIAL_CONTACT', 'INTERESTED', 'TRIAL_CLASS', 'ENROLLED', 'LOST'];
    const createdCustomers: any[] = [];
    const allTags = await prisma.tag.findMany();

    const customerCount = parseInt(process.env.TEST_CUSTOMER_COUNT || '100'); // 可通过环境变量控制数量

    for (let i = 1; i <= customerCount; i++) {
      const customerName = randomName();
      const gender: Gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE';
      const birthDate = randomBirthDate();
      const school = randomItem(schools);
      const grade = randomItem(grades);
      const address = randomItem(addresses) + '某某街道' + Math.floor(Math.random() * 100) + '号';
      const sourceChannel = randomItem(sourceChannels);
      const status = randomItem(customerStatuses);
      const firstContactDate = randomRecentDate(60);
      const nextFollowUpDate = Math.random() > 0.7 ? randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) : null;

      // 创建客户
      const customer = await prisma.customer.create({
        data: {
          publicId: await generateUniquePublicId(),
          name: customerName,
          gender,
          birthDate,
          school,
          grade: grade as any,
          address,
          sourceChannel: sourceChannel as any,
          firstContactDate,
          status,
          createdAt: randomRecentDate(365),
          nextFollowUpDate,
        },
      });

      // 为客户创建1-2个家长
      const parentCount = Math.random() > 0.3 ? 2 : 1;
      for (let j = 0; j < parentCount; j++) {
        const parentName = randomName();
        const relationship = j === 0 ? (Math.random() > 0.5 ? '父亲' : '母亲') : randomItem(relationships);
        const phone = randomPhone();
        const wechatId = Math.random() > 0.5 ? `wx_${parentName}_${Math.floor(Math.random() * 1000)}` : null;

        await prisma.parent.create({
          data: {
            customerId: customer.id,
            name: parentName,
            relationship,
            phone,
            wechatId,
          },
        });
      }

      // 为客户分配2-5个随机标签
      const tagCount = Math.floor(Math.random() * 4) + 2;
      const selectedTags: Tag[] = [];
      for (let k = 0; k < tagCount; k++) {
        const randomTag = randomItem(allTags);
        if (!selectedTags.find(t => t.id === randomTag.id)) {
          selectedTags.push(randomTag);
          await prisma.customerTag.create({
            data: {
              customerId: customer.id,
              tagId: randomTag.id,
            },
          });
        }
      }

      // 为部分客户创建沟通纪要
      if (Math.random() > 0.6) {
        const logCount = Math.floor(Math.random() * 3) + 1;
        for (let l = 0; l < logCount; l++) {
          const contents = [
            '今天与家长进行了电话沟通，家长对孩子的学习情况比较关心。',
            '孩子在试听课上表现积极，家长表示很满意。',
            '讨论了学费和课程安排，家长需要考虑一下。',
            '孩子的数学基础较弱，建议从基础班开始。',
            '家长希望了解更多关于课程设置的信息。',
            '孩子比较内向，需要老师多关注和鼓励。',
            '家长工作较忙，希望能够灵活安排上课时间。'
          ];
          
          await prisma.communicationLog.create({
            data: {
              customerId: customer.id,
              content: randomItem(contents),
              createdAt: randomRecentDate(30),
              updatedAt: randomRecentDate(30),
            },
          });
        }
      }

      createdCustomers.push(customer);
      
      if (i % 20 === 0) {
        console.log(`📝 已生成 ${i} 个客户数据...`);
      }
    }
    console.log('✅ 测试客户数据生成完成');

    // 4. 生成班级注册、考勤、成长记录等数据（与原来逻辑相同）
    const enrolledCustomers = createdCustomers.filter(c => c.status === 'ENROLLED');
    console.log(`📚 开始为 ${enrolledCustomers.length} 个已报名学生分配班级...`);
    
    const createdEnrollments: any[] = [];
    for (const customer of enrolledCustomers) {
      const classCount = Math.random() > 0.7 ? 2 : 1;
      const selectedClasses: Class[] = [];
      
      for (let i = 0; i < classCount; i++) {
        const randomClass = randomItem(createdClasses);
        if (!selectedClasses.find(c => c.id === randomClass.id)) {
          selectedClasses.push(randomClass);
          
          const enrollment = await prisma.classEnrollment.create({
            data: {
              studentId: customer.id,
              classId: randomClass.id,
              enrollmentDate: randomRecentDate(30),
            },
          });
          createdEnrollments.push(enrollment);
        }
      }
    }
    console.log('✅ 班级注册完成');

    // 5. 生成考勤记录
    console.log('📅 开始生成考勤记录...');
    const attendanceStatuses: AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT'];
    const timeSlots: AttendanceSlot[] = ['AM', 'PM'];
    
    for (const enrollment of createdEnrollments) {
      for (let day = 0; day < 30; day++) {
        const recordDate = new Date(Date.now() - day * 24 * 60 * 60 * 1000);
        
        if (recordDate.getDay() === 0 || recordDate.getDay() === 6) continue;
        
        if (Math.random() > 0.2) {
          for (const timeSlot of timeSlots) {
            const status = Math.random() > 0.1 ? 'PRESENT' : (Math.random() > 0.5 ? 'LATE' : 'ABSENT');
            
            await prisma.attendanceRecord.create({
              data: {
                enrollmentId: enrollment.id,
                recordDate,
                timeSlot,
                status: status as AttendanceStatus,
              },
            });
          }
        }
      }
    }
    console.log('✅ 考勤记录生成完成');

    // 6. 生成成长记录
    console.log('🌱 开始生成成长记录...');
    const growthTags = allTags.filter(tag => 
      tag.type === 'GROWTH_POSITIVE' || tag.type === 'GROWTH_NEGATIVE'
    );
    
    for (const enrollment of createdEnrollments) {
      const recordCount = Math.floor(Math.random() * 16) + 15;
      
      for (let i = 0; i < recordCount; i++) {
        const randomTag = randomItem(growthTags);
        const createdAt = randomRecentDate(60);
        
        await prisma.growthLog.create({
          data: {
            enrollmentId: enrollment.id,
            tagId: randomTag.id,
            createdAt,
          },
        });
      }
    }
    console.log('✅ 成长记录生成完成');

    // 7. 生成财务订单和付款记录
    console.log('💰 开始生成财务数据...');
    
    for (const customer of enrolledCustomers) {
      const orderCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < orderCount; i++) {
        const orderNames = ['春季班学费', '暑期班学费', '秋季班学费', '寒假班学费', '一对一辅导费', '教材费', '活动费'];
        const totalDue = (Math.floor(Math.random() * 40) + 10) * 100;
        const coursePeriodStart = randomRecentDate(90);
        const coursePeriodEnd = new Date(coursePeriodStart.getTime() + 90 * 24 * 60 * 60 * 1000);
        const dueDate = new Date(coursePeriodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const order = await prisma.financialOrder.create({
          data: {
            studentId: customer.id,
            name: randomItem(orderNames),
            totalDue: totalDue,
            coursePeriodStart,
            coursePeriodEnd,
            dueDate,
          },
        });

        const paymentCount = Math.floor(Math.random() * 4);
        let remainingAmount = totalDue;
        
        for (let j = 0; j < paymentCount && remainingAmount > 0; j++) {
          const paymentAmount = j === paymentCount - 1 
            ? remainingAmount 
            : Math.min(Math.floor(Math.random() * remainingAmount * 0.8) + 100, remainingAmount);
          
          const paymentDate = randomDate(coursePeriodStart, new Date());
          const notes = Math.random() > 0.5 ? ['微信支付', '支付宝转账', '银行转账', '现金支付'][Math.floor(Math.random() * 4)] : null;
          
          await prisma.payment.create({
            data: {
              orderId: order.id,
              amount: paymentAmount,
              paymentDate,
              notes,
            },
          });
          
          remainingAmount -= paymentAmount;
        }
      }
    }
    console.log('✅ 财务数据生成完成');

    // 8. 为已报名的客户创建学生账号
    console.log('👤 开始为已报名客户创建学生账号...');
    
    let studentAccountsCreated = 0;
    for (const customer of enrolledCustomers) {
      try {
        const username = customer.publicId;
        
        const existingUser = await prisma.user.findUnique({
          where: { username }
        });
        
        if (!existingUser) {
          await prisma.user.create({
            data: {
              username,
              displayName: customer.name,
              passwordHash: hashedPassword,
              role: UserRole.STUDENT,
              linkedCustomerId: customer.id,
              mustChangePassword: true
            }
          });
          
          studentAccountsCreated++;
        }
      } catch (error) {
        console.warn(`  ⚠️ 为客户 ${customer.name} 创建学生账号失败:`, error);
      }
    }
    
    console.log(`✅ 学生账号创建完成，共创建 ${studentAccountsCreated} 个账号`);

    // 统计信息
    const totalCustomers = await prisma.customer.count();
    const totalParents = await prisma.parent.count();
    const totalClasses = await prisma.class.count();
    const totalEnrollments = await prisma.classEnrollment.count();
    const totalOrders = await prisma.financialOrder.count();
    const totalPayments = await prisma.payment.count();
    const totalAttendanceRecords = await prisma.attendanceRecord.count();
    const totalGrowthLogs = await prisma.growthLog.count();
    const totalCommunicationLogs = await prisma.communicationLog.count();

    console.log('\n🎉 测试数据生成完成！');
    console.log('📊 数据统计:');
    console.log(`  👤 客户: ${totalCustomers}`);
    console.log(`  👨‍👩‍👧‍👦 家长: ${totalParents}`);
    console.log(`  🏫 班级: ${totalClasses}`);
    console.log(`  📚 班级注册: ${totalEnrollments}`);
    console.log(`  💰 财务订单: ${totalOrders}`);
    console.log(`  💳 付款记录: ${totalPayments}`);
    console.log(`  📅 考勤记录: ${totalAttendanceRecords}`);
    console.log(`  🌱 成长记录: ${totalGrowthLogs}`);
    console.log(`  💬 沟通纪要: ${totalCommunicationLogs}`);
    console.log(`  🏷️  标签: ${allTags.length}`);

  } catch (error) {
    console.error('❌ 测试数据生成失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  seedTestData()
    .catch((e) => {
      console.error('❌ 测试数据生成失败:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default seedTestData; 