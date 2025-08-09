// src/middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { CustomerStatus, Gender, Grade, SourceChannel, UserRole } from '@prisma/client';

// ================================
// 通用验证函数
// ================================

/**
 * 检查验证结果的中间件
 */
export const checkValidationResult = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors: errors.array().map((error: any) => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? error.value : undefined
      }))
    });
  }
  next();
};

// ================================
// 客户相关验证规则
// ================================

/**
 * 客户创建验证规则
 */
export const validateCustomerCreate = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('姓名长度必须在1-50个字符之间')
    .matches(/^[\u4e00-\u9fa5a-zA-Z\s]+$/)
    .withMessage('姓名只能包含中文、英文和空格'),
  
  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('性别必须是 MALE、FEMALE 或 OTHER'),
  
  body('birthDate')
    .optional()
    .isISO8601()
    .withMessage('出生日期格式无效')
    .custom((value: any) => {
      if (value) {
        const date = new Date(value);
        const now = new Date();
        const age = now.getFullYear() - date.getFullYear();
        if (age < 0 || age > 100) {
          throw new Error('出生日期不合理');
        }
      }
      return true;
    }),
  
  body('school')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('学校名称不能超过100个字符'),
  
  body('grade')
    .optional()
    .isIn(['CHU_YI', 'CHU_ER', 'CHU_SAN', 'GAO_YI', 'GAO_ER', 'GAO_SAN'])
    .withMessage('年级必须是有效的年级选项'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('地址不能超过200个字符'),
  
  body('sourceChannel')
    .optional()
          .isIn(['JIAZHANG_TUIJIAN', 'PENGYOU_QINQI', 'XUESHENG_SHEJIAO', 'GUANGGAO_CHUANDAN', 
           'DITUI_XUANCHUAN', 'WEIXIN_GONGZHONGHAO', 'DOUYIN', 'QITA_MEITI', 'HEZUO', 'QITA'])
    .withMessage('来源渠道必须是有效选项'),
  
  body('status')
    .optional()
    .isIn(['POTENTIAL', 'INITIAL_CONTACT', 'INTERESTED', 'TRIAL_CLASS', 'ENROLLED', 'LOST'])
    .withMessage('客户状态必须是有效选项'),
  
  body('firstContactDate')
    .optional()
    .isISO8601()
    .withMessage('首次联系日期格式无效'),
  
  body('nextFollowUpDate')
    .optional()
    .isISO8601()
    .withMessage('下次跟进日期格式无效')
    .custom((value) => {
      if (value) {
        const date = new Date(value);
        const now = new Date();
        if (date < now) {
          throw new Error('下次跟进日期不能是过去的时间');
        }
      }
      return true;
    }),
  
  // 家长信息验证
  body('parents')
    .isArray({ min: 1 })
    .withMessage('至少需要一个家长信息'),
  
  body('parents.*.name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('家长姓名长度必须在1-50个字符之间'),
  
  body('parents.*.relationship')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('关系不能超过20个字符'),
  
  body('parents.*.phone')
    .optional()
    .matches(/^1[3-9]\d{9}$/)
    .withMessage('手机号格式无效'),
  
  body('parents.*.wechatId')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('微信号不能超过50个字符'),
  
  checkValidationResult
];

/**
 * 客户更新验证规则
 */
export const validateCustomerUpdate = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('客户ID必须是正整数'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('姓名长度必须在1-50个字符之间'),
  
  // 其他字段验证规则与创建时类似，但都设为optional
  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('性别必须是 MALE、FEMALE 或 OTHER'),
  
  body('status')
    .optional()
    .isIn(['POTENTIAL', 'INITIAL_CONTACT', 'INTERESTED', 'TRIAL_CLASS', 'ENROLLED', 'LOST'])
    .withMessage('客户状态必须是有效选项'),
  
  checkValidationResult
];

// ================================
// 用户相关验证规则
// ================================

/**
 * 用户注册验证规则
 */
export const validateUserRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('用户名长度必须在3-30个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  
  body('password')
    .isLength({ min: 6, max: 50 })
    .withMessage('密码长度必须在6-50个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('邮箱格式无效')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .matches(/^1[3-9]\d{9}$/)
    .withMessage('手机号格式无效'),
  
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('显示名称不能超过50个字符'),
  
  body('role')
    .optional()
    .isIn(['SUPER_ADMIN', 'MANAGER', 'TEACHER', 'STUDENT'])
    .withMessage('用户角色必须是有效选项'),
  
  checkValidationResult
];

/**
 * 用户登录验证规则
 */
export const validateUserLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('用户名不能为空'),
  
  body('password')
    .notEmpty()
    .withMessage('密码不能为空'),
  
  checkValidationResult
];

/**
 * 密码修改验证规则
 */
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('当前密码不能为空'),
  
  body('newPassword')
    .isLength({ min: 6, max: 50 })
    .withMessage('新密码长度必须在6-50个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('新密码必须包含至少一个小写字母、一个大写字母和一个数字'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('确认密码与新密码不匹配');
      }
      return true;
    }),
  
  checkValidationResult
];

// ================================
// 学生成长记录验证规则
// ================================



// ================================
// 查询参数验证规则
// ================================

/**
 * 分页参数验证规则
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间')
    .toInt(),
  
  checkValidationResult
];

/**
 * 搜索参数验证规则
 */
export const validateSearch = [
  query('keyword')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('搜索关键词不能超过100个字符'),
  
  query('status')
    .optional()
    .isIn(['POTENTIAL', 'INITIAL_CONTACT', 'INTERESTED', 'TRIAL_CLASS', 'ENROLLED', 'LOST'])
    .withMessage('状态筛选必须是有效选项'),
  
  query('grade')
    .optional()
    .isIn(['CHU_YI', 'CHU_ER', 'CHU_SAN', 'GAO_YI', 'GAO_ER', 'GAO_SAN'])
    .withMessage('年级筛选必须是有效选项'),
  
  checkValidationResult
];

/**
 * 日期范围验证规则
 */
export const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式无效'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期格式无效')
    .custom((value: any, { req }: any) => {
      if (value && req.query?.startDate) {
        const start = new Date(req.query.startDate as string);
        const end = new Date(value);
        if (end < start) {
          throw new Error('结束日期不能早于开始日期');
        }
      }
      return true;
    }),
  
  checkValidationResult
];

// ================================
// ID参数验证规则
// ================================

/**
 * 数字ID验证规则
 */
export const validateNumericId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID必须是正整数')
    .toInt(),
  
  checkValidationResult
];

/**
 * 公开ID验证规则（学号等）
 */
export const validatePublicId = [
  param('publicId')
    .matches(/^\d{12}$/)
    .withMessage('学号必须是12位数字'),
  
  checkValidationResult
];

// ================================
// 数据清理和标准化函数
// ================================

/**
 * 客户数据标准化中间件
 */
export const normalizeCustomerData = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    // 清理和标准化字符串字段
    const stringFields = ['name', 'school', 'address'];
    stringFields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = req.body[field].trim();
      }
    });
    
    // 标准化电话号码
    if (req.body.parents && Array.isArray(req.body.parents)) {
      req.body.parents.forEach((parent: any) => {
        if (parent.phone && typeof parent.phone === 'string') {
          // 移除所有非数字字符
          parent.phone = parent.phone.replace(/\D/g, '');
        }
      });
    }
    
    // 确保日期字段为空或有效日期
    const dateFields = ['birthDate', 'firstContactDate', 'nextFollowUpDate'];
    dateFields.forEach(field => {
      if (req.body[field] === '') {
        req.body[field] = null;
      }
    });
  }
  
  next();
};

/**
 * 用户数据标准化中间件
 */
export const normalizeUserData = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    // 标准化用户名（转小写）
    if (req.body.username && typeof req.body.username === 'string') {
      req.body.username = req.body.username.toLowerCase().trim();
    }
    
    // 标准化邮箱（转小写）
    if (req.body.email && typeof req.body.email === 'string') {
      req.body.email = req.body.email.toLowerCase().trim();
    }
    
    // 清理显示名称
    if (req.body.displayName && typeof req.body.displayName === 'string') {
      req.body.displayName = req.body.displayName.trim();
    }
  }
  
  next();
}; 

// ================================
// Growth系统验证规则
// ================================

/**
 * @description Growth标签创建验证规则
 */
export const validateGrowthTagCreate = [
  body('text')
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('标签名称必须在2-20字符之间')
    .matches(/^[\u4e00-\u9fa5a-zA-Z0-9\s]+$/)
    .withMessage('标签名称只能包含中文、英文、数字和空格'),
  
  body('sentiment')
    .isIn(['POSITIVE', 'NEGATIVE'])
    .withMessage('情感极性必须是POSITIVE或NEGATIVE'),
  
  body('defaultWeight')
    .isInt({ min: 1, max: 10 })
    .withMessage('默认权重必须是1-10之间的整数'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('标签描述不能超过100个字符'),
  
  checkValidationResult
];

/**
 * @description Growth标签更新验证规则
 */
export const validateGrowthTagUpdate = [
  body('text')
    .optional()
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('标签名称必须在2-20字符之间')
    .matches(/^[\u4e00-\u9fa5a-zA-Z0-9\s]+$/)
    .withMessage('标签名称只能包含中文、英文、数字和空格'),
  
  body('defaultWeight')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('默认权重必须是1-10之间的整数'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive必须是布尔值'),
  
  checkValidationResult
];

/**
 * @description 成长日志创建验证规则
 */
export const validateGrowthLogCreate = [
  body('enrollmentId')
    .isInt({ min: 1 })
    .withMessage('班级注册ID必须是正整数'),
  
  body('tagId')
    .isInt({ min: 1 })
    .withMessage('标签ID必须是正整数'),
  
  body('weight')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('权重必须是1-10之间的整数'),
  
  body('context')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('上下文说明不能超过50个字符'),
  
  checkValidationResult
];

/**
 * @description 批量成长日志创建验证规则
 */
export const validateGrowthLogBatch = [
  body('records')
    .isArray({ min: 1, max: 20 })
    .withMessage('记录数组必须包含1-20条记录'),
  
  body('records.*.enrollmentId')
    .isInt({ min: 1 })
    .withMessage('班级注册ID必须是正整数'),
  
  body('records.*.tagId')
    .isInt({ min: 1 })
    .withMessage('标签ID必须是正整数'),
  
  body('records.*.weight')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('权重必须是1-10之间的整数'),
  
  checkValidationResult
];

/**
 * @description Growth配置创建验证规则
 */
export const validateGrowthConfigCreate = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('配置名称必须在1-50字符之间'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('配置描述不能超过200个字符'),
  
  body('processNoise')
    .isFloat({ min: 0.001, max: 1.0 })
    .withMessage('过程噪声必须在0.001-1.0之间'),
  
  body('initialUncertainty')
    .isFloat({ min: 1.0, max: 100.0 })
    .withMessage('初始不确定性必须在1.0-100.0之间'),
  
  body('timeDecayFactor')
    .isFloat({ min: 0.001, max: 0.1 })
    .withMessage('时间衰减因子必须在0.001-0.1之间'),
  
  body('minObservations')
    .isInt({ min: 1, max: 10 })
    .withMessage('最少观测次数必须在1-10之间'),
  
  body('maxDaysBetween')
    .isInt({ min: 7, max: 90 })
    .withMessage('最大天数间隔必须在7-90之间'),
  
  checkValidationResult
];

/**
 * @description Growth配置更新验证规则
 */
export const validateGrowthConfigUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('配置名称必须在1-50字符之间'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('配置描述不能超过200个字符'),
  
  body('processNoise')
    .optional()
    .isFloat({ min: 0.001, max: 1.0 })
    .withMessage('过程噪声必须在0.001-1.0之间'),
  
  body('initialUncertainty')
    .optional()
    .isFloat({ min: 1.0, max: 100.0 })
    .withMessage('初始不确定性必须在1.0-100.0之间'),
  
  body('timeDecayFactor')
    .optional()
    .isFloat({ min: 0.001, max: 0.1 })
    .withMessage('时间衰减因子必须在0.001-0.1之间'),
  
  body('minObservations')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('最少观测次数必须在1-10之间'),
  
  body('maxDaysBetween')
    .optional()
    .isInt({ min: 7, max: 90 })
    .withMessage('最大天数间隔必须在7-90之间'),
  
  checkValidationResult
]; 