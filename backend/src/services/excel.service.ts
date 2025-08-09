// src/services/excel.service.ts
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { CustomerStatus, Gender, Grade, SourceChannel } from '@prisma/client';
import { generateUniquePublicId } from '../utils/idGenerator';
import path from 'path';
import fs from 'fs';
import { prisma } from '../utils/database';

// ================================
// 数据模板和映射
// ================================

export interface CustomerImportRow {
  姓名: string;
  性别: string;
  出生日期: string;
  学校: string;
  年级: string;
  地址: string;
  来源渠道: string;
  状态: string;
  首次联系日期: string;
  下次跟进日期: string;
  家长姓名1: string;
  家长关系1: string;
  家长电话1: string;
  家长微信1: string;
  家长姓名2?: string;
  家长关系2?: string;
  家长电话2?: string;
  家长微信2?: string;
  备注?: string;
}

export interface CustomerExportRow extends CustomerImportRow {
  学号: string;
  创建时间: string;
  成长记录数: number;
  最后活动时间: string;
}

// 枚举值映射
const GENDER_MAP: Record<string, Gender> = {
  '男': 'MALE',
  '女': 'FEMALE',
  '其他': 'OTHER'
};

const GRADE_MAP: Record<string, Grade> = {
  '初一': 'CHU_YI',
  '初二': 'CHU_ER', 
  '初三': 'CHU_SAN',
  '高一': 'GAO_YI',
  '高二': 'GAO_ER',
  '高三': 'GAO_SAN'
};

const STATUS_MAP: Record<string, CustomerStatus> = {
  '潜在客户': 'POTENTIAL',
  '初步沟通': 'INITIAL_CONTACT',
  '意向客户': 'INTERESTED',
  '试听中': 'TRIAL_CLASS',
  '已报名': 'ENROLLED',
  '已流失': 'LOST'
};

const SOURCE_CHANNEL_MAP: Record<string, SourceChannel> = {
  '家长推荐': 'JIAZHANG_TUIJIAN',
  '朋友亲戚': 'PENGYOU_QINQI',
  '学生社交': 'XUESHENG_SHEJIAO',
  '广告传单': 'GUANGGAO_CHUANDAN',
  '地推宣传': 'DITUI_XUANCHUAN',
  '微信公众号': 'WEIXIN_GONGZHONGHAO',
  '抖音': 'DOUYIN',
  '其他媒体': 'QITA_MEITI',
  '合作': 'HEZUO',
  '其他': 'QITA'
};

// 反向映射用于导出
const REVERSE_GENDER_MAP = Object.fromEntries(
  Object.entries(GENDER_MAP).map(([k, v]) => [v, k])
);
const REVERSE_GRADE_MAP = Object.fromEntries(
  Object.entries(GRADE_MAP).map(([k, v]) => [v, k])
);
const REVERSE_STATUS_MAP = Object.fromEntries(
  Object.entries(STATUS_MAP).map(([k, v]) => [v, k])
);
const REVERSE_SOURCE_CHANNEL_MAP = Object.fromEntries(
  Object.entries(SOURCE_CHANNEL_MAP).map(([k, v]) => [v, k])
);

// ================================
// 导入功能
// ================================

/**
 * 验证和清理导入数据
 */
function validateAndCleanRow(row: any, rowIndex: number): { 
  isValid: boolean; 
  errors: string[]; 
  cleanedRow?: CustomerImportRow 
} {
  const errors: string[] = [];
  
  // 必填字段验证
  if (!row['姓名'] || typeof row['姓名'] !== 'string') {
    errors.push(`第${rowIndex}行：姓名不能为空`);
  }
  
  if (!row['家长姓名1'] || typeof row['家长姓名1'] !== 'string') {
    errors.push(`第${rowIndex}行：至少需要一个家长信息`);
  }
  
  // 性别验证
  if (row['性别'] && !GENDER_MAP[row['性别']]) {
    errors.push(`第${rowIndex}行：性别必须是 男、女、其他 之一`);
  }
  
  // 年级验证
  if (row['年级'] && !GRADE_MAP[row['年级']]) {
    errors.push(`第${rowIndex}行：年级必须是 初一、初二、初三、高一、高二、高三 之一`);
  }
  
  // 状态验证
  if (row['状态'] && !STATUS_MAP[row['状态']]) {
    errors.push(`第${rowIndex}行：状态必须是 潜在客户、初步沟通、意向客户、试听中、已报名、已流失 之一`);
  }
  
  // 来源渠道验证
  if (row['来源渠道'] && !SOURCE_CHANNEL_MAP[row['来源渠道']]) {
    errors.push(`第${rowIndex}行：来源渠道值无效`);
  }
  
  // 日期格式验证
  if (row['出生日期'] && isNaN(Date.parse(row['出生日期']))) {
    errors.push(`第${rowIndex}行：出生日期格式无效`);
  }
  
  if (row['首次联系日期'] && isNaN(Date.parse(row['首次联系日期']))) {
    errors.push(`第${rowIndex}行：首次联系日期格式无效`);
  }
  
  if (row['下次跟进日期'] && isNaN(Date.parse(row['下次跟进日期']))) {
    errors.push(`第${rowIndex}行：下次跟进日期格式无效`);
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  
  // 清理和格式化数据
  const cleanedRow: CustomerImportRow = {
    姓名: row['姓名'].toString().trim(),
    性别: row['性别'] || '',
    出生日期: row['出生日期'] || '',
    学校: row['学校'] || '',
    年级: row['年级'] || '',
    地址: row['地址'] || '',
    来源渠道: row['来源渠道'] || '',
    状态: row['状态'] || '潜在客户',
    首次联系日期: row['首次联系日期'] || '',
    下次跟进日期: row['下次跟进日期'] || '',
    家长姓名1: row['家长姓名1'].toString().trim(),
    家长关系1: row['家长关系1'] || '',
    家长电话1: row['家长电话1'] || '',
    家长微信1: row['家长微信1'] || '',
    家长姓名2: row['家长姓名2'] || '',
    家长关系2: row['家长关系2'] || '',
    家长电话2: row['家长电话2'] || '',
    家长微信2: row['家长微信2'] || '',
    备注: row['备注'] || ''
  };
  
  return { isValid: true, errors: [], cleanedRow };
}

/**
 * 从Excel文件导入客户数据
 */
export async function importCustomersFromExcel(filePath: string): Promise<{
  success: boolean;
  importedCount: number;
  errors: string[];
  skippedCount: number;
}> {
  try {
    // 读取Excel文件
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const errors: string[] = [];
    const validRows: CustomerImportRow[] = [];
    let skippedCount = 0;
    
    // 验证每一行数据
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const validation = validateAndCleanRow(row, i + 2); // Excel行号从2开始（包含表头）
      
      if (validation.isValid && validation.cleanedRow) {
        validRows.push(validation.cleanedRow);
      } else {
        errors.push(...validation.errors);
        skippedCount++;
      }
    }
    
    if (errors.length > 0 && validRows.length === 0) {
      return {
        success: false,
        importedCount: 0,
        errors,
        skippedCount
      };
    }
    
    // 批量导入有效数据
    let importedCount = 0;
    
    for (const row of validRows) {
      try {
        await prisma.$transaction(async (tx) => {
          // 创建客户
          const customer = await tx.customer.create({
            data: {
              publicId: await generateUniquePublicId(),
              name: row.姓名,
              gender: row.性别 ? GENDER_MAP[row.性别] : null,
              birthDate: row.出生日期 ? new Date(row.出生日期) : null,
              school: row.学校 || null,
              grade: row.年级 ? GRADE_MAP[row.年级] : null,
              address: row.地址 || null,
              sourceChannel: row.来源渠道 ? SOURCE_CHANNEL_MAP[row.来源渠道] : null,
              status: STATUS_MAP[row.状态] || 'POTENTIAL',
              firstContactDate: row.首次联系日期 ? new Date(row.首次联系日期) : null,
              nextFollowUpDate: row.下次跟进日期 ? new Date(row.下次跟进日期) : null,
            }
          });
          
          // 创建家长1
          await tx.parent.create({
            data: {
              customerId: customer.id,
              name: row.家长姓名1,
              relationship: row.家长关系1 || null,
              phone: row.家长电话1 || null,
              wechatId: row.家长微信1 || null,
            }
          });
          
          // 创建家长2（如果有）
          if (row.家长姓名2) {
            await tx.parent.create({
              data: {
                customerId: customer.id,
                name: row.家长姓名2,
                relationship: row.家长关系2 || null,
                phone: row.家长电话2 || null,
                wechatId: row.家长微信2 || null,
              }
            });
          }
          
          // 添加备注作为沟通记录（如果有）
          if (row.备注) {
            await tx.communicationLog.create({
              data: {
                customerId: customer.id,
                content: `导入备注：${row.备注}`,
              }
            });
          }
        });
        
        importedCount++;
      } catch (error) {
        console.error(`导入第${validRows.indexOf(row) + 1}行数据失败:`, error);
        errors.push(`导入客户 ${row.姓名} 失败`);
        skippedCount++;
      }
    }
    
    return {
      success: importedCount > 0,
      importedCount,
      errors,
      skippedCount
    };
    
  } catch (error) {
    console.error('Excel导入失败:', error);
    return {
      success: false,
      importedCount: 0,
      errors: [`文件读取失败: ${error instanceof Error ? error.message : '未知错误'}`],
      skippedCount: 0
    };
  }
}

// ================================
// 导出功能
// ================================

/**
 * 导出客户数据到Excel
 */
export async function exportCustomersToExcel(filters?: {
  status?: CustomerStatus[];
  grade?: Grade[];
  school?: string[];
  dateRange?: { start: Date; end: Date };
}): Promise<{
  success: boolean;
  filePath?: string;
  error?: string;
}> {
  try {
    // 构建查询条件
    const where: any = {};
    
    if (filters?.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }
    
    if (filters?.grade && filters.grade.length > 0) {
      where.grade = { in: filters.grade };
    }
    
    if (filters?.school && filters.school.length > 0) {
      where.school = { in: filters.school };
    }
    
    if (filters?.dateRange) {
      where.createdAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
      };
    }
    
    // 查询客户数据
    const customers = await prisma.customer.findMany({
      where,
      include: {
        parents: true,
        communicationLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        enrollments: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // 转换数据格式
    const exportData: CustomerExportRow[] = customers.map(customer => {
      const parents = customer.parents;
      const parent1 = parents[0];
      const parent2 = parents[1];
      
      const totalGrowthLogs = 0; // Growth logs removed
      
      const lastActivity = customer.communicationLogs[0]?.createdAt || customer.createdAt;
      
      return {
        学号: customer.publicId,
        姓名: customer.name,
        性别: customer.gender ? REVERSE_GENDER_MAP[customer.gender] : '',
        出生日期: customer.birthDate ? customer.birthDate.toISOString().split('T')[0] : '',
        学校: customer.school || '',
        年级: customer.grade ? REVERSE_GRADE_MAP[customer.grade] : '',
        地址: customer.address || '',
        来源渠道: customer.sourceChannel ? REVERSE_SOURCE_CHANNEL_MAP[customer.sourceChannel] : '',
        状态: REVERSE_STATUS_MAP[customer.status],
        首次联系日期: customer.firstContactDate ? customer.firstContactDate.toISOString().split('T')[0] : '',
        下次跟进日期: customer.nextFollowUpDate ? customer.nextFollowUpDate.toISOString().split('T')[0] : '',
        创建时间: customer.createdAt.toISOString().split('T')[0],
        家长姓名1: parent1?.name || '',
        家长关系1: parent1?.relationship || '',
        家长电话1: parent1?.phone || '',
        家长微信1: parent1?.wechatId || '',
        家长姓名2: parent2?.name || '',
        家长关系2: parent2?.relationship || '',
        家长电话2: parent2?.phone || '',
        家长微信2: parent2?.wechatId || '',
        成长记录数: totalGrowthLogs,
        最后活动时间: lastActivity.toISOString().split('T')[0],
        备注: customer.communicationLogs[0]?.content || ''
      };
    });
    
    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('客户数据');
    
    // 设置表头
    const headers = [
      '学号', '姓名', '性别', '出生日期', '学校', '年级', '地址', '来源渠道', 
      '状态', '首次联系日期', '下次跟进日期', '创建时间',
      '家长姓名1', '家长关系1', '家长电话1', '家长微信1',
      '家长姓名2', '家长关系2', '家长电话2', '家长微信2',
      '成长记录数', '最后活动时间', '备注'
    ];
    
    worksheet.addRow(headers);
    
    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };
    
    // 添加数据行
    exportData.forEach(row => {
      worksheet.addRow([
        row.学号, row.姓名, row.性别, row.出生日期, row.学校, row.年级, row.地址, row.来源渠道,
        row.状态, row.首次联系日期, row.下次跟进日期, row.创建时间,
        row.家长姓名1, row.家长关系1, row.家长电话1, row.家长微信1,
        row.家长姓名2, row.家长关系2, row.家长电话2, row.家长微信2,
        row.成长记录数, row.最后活动时间, row.备注
      ]);
    });
    
    // 自动调整列宽
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    
    // 保存文件
    const fileName = `客户数据导出_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filePath = path.join(process.cwd(), 'uploads', fileName);
    
    // 确保uploads目录存在
    const uploadsDir = path.dirname(filePath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    await workbook.xlsx.writeFile(filePath);
    
    return {
      success: true,
      filePath
    };
    
  } catch (error) {
    console.error('Excel导出失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 生成导入模板
 */
export async function generateImportTemplate(): Promise<{
  success: boolean;
  filePath?: string;
  error?: string;
}> {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('客户数据导入模板');
    
    // 设置表头
    const headers = [
      '姓名*', '性别', '出生日期', '学校', '年级', '地址', '来源渠道', 
      '状态', '首次联系日期', '下次跟进日期',
      '家长姓名1*', '家长关系1', '家长电话1', '家长微信1',
      '家长姓名2', '家长关系2', '家长电话2', '家长微信2',
      '备注'
    ];
    
    worksheet.addRow(headers);
    
    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };
    
    // 添加示例数据
    worksheet.addRow([
      '张三', '男', '2010-01-01', '实验小学', '初一', '海淀区某某街道', '家长推荐',
      '潜在客户', '2024-01-01', '2024-01-15',
      '张父', '父亲', '13800138000', 'zhangfu_wx', 
      '张母', '母亲', '13900139000', 'zhangmu_wx',
      '学习积极性较高'
    ]);
    
    // 添加数据验证说明
    worksheet.addRow([]);
    worksheet.addRow(['数据填写说明：']);
    worksheet.addRow(['1. 带*号为必填字段']);
    worksheet.addRow(['2. 性别：男、女、其他']);
    worksheet.addRow(['3. 年级：初一、初二、初三、高一、高二、高三']);
    worksheet.addRow(['4. 状态：潜在客户、初步沟通、意向客户、试听中、已报名、已流失']);
    worksheet.addRow(['5. 来源渠道：家长推荐、朋友亲戚、学生社交、广告传单、地推宣传、微信公众号、抖音、其他媒体、合作、其他']);
    worksheet.addRow(['6. 日期格式：YYYY-MM-DD（如：2024-01-01）']);
    worksheet.addRow(['7. 至少需要填写一个家长信息']);
    
    // 自动调整列宽
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    
    // 保存文件
    const fileName = `客户数据导入模板.xlsx`;
    const filePath = path.join(process.cwd(), 'uploads', fileName);
    
    // 确保uploads目录存在
    const uploadsDir = path.dirname(filePath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    await workbook.xlsx.writeFile(filePath);
    
    return {
      success: true,
      filePath
    };
    
  } catch (error) {
    console.error('模板生成失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
} 