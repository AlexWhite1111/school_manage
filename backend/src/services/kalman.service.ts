// src/services/kalman.service.ts
import { prisma } from '../utils/database';
import { Matrix } from 'ml-matrix';
import { evaluate } from 'mathjs';


// ================================
// 卡尔曼滤波器数学类型定义
// ================================

interface KalmanState {
  level: number;        // μ - 当前估计的潜在水平
  trend: number;        // ν - 当前估计的成长趋势/动量
  covariance: number[][]; // P - 2x2协方差矩阵，表示状态估计的不确定性
}

interface KalmanConfig {
  processNoise: number;     // Q - 过程噪声，控制对模型预测的信任度
  initialUncertainty: number; // P初始值 - 初始状态的不确定性
  timeDecayFactor: number;  // λ - 时间衰减因子，历史数据的影响力
  minObservations: number;  // 最少观测次数
  maxDaysBetween: number;   // 最大天数间隔
}

interface GrowthObservation {
  value: number;        // 观测值（权重调整后的标签值）
  timestamp: Date;      // 观测时间
  weight: number;       // 观测权重（1-10）
  tagSentiment: 'POSITIVE' | 'NEGATIVE'; // 标签情感
}

interface GrowthPrediction {
  predictedLevel: number;     // 预测的水平值
  predictedTrend: number;     // 预测的趋势值
  confidence: number;         // 预测置信度 (0-1)
  confidenceInterval: {       // 置信区间
    upper: number;
    lower: number;
  };
}

// ================================
// 数学工具函数
// ================================

/**
 * @description 计算2x2矩阵的逆矩阵
 * @param {number[][]} matrix - 2x2矩阵
 * @returns {number[][]} 逆矩阵
 * @throws {Error} 矩阵不可逆时抛出错误
 */
export const invertMatrix2x2 = (matrix: number[][]): number[][] => {
  try {
    if (matrix.length !== 2 || matrix[0].length !== 2) {
      throw new Error('输入必须是2x2矩阵');
    }

    const [[a, b], [c, d]] = matrix;
    const det = a * d - b * c;
    
    if (Math.abs(det) < 1e-10) {
      throw new Error('矩阵奇异，无法求逆');
    }
    
    return [
      [d / det, -b / det],
      [-c / det, a / det]
    ];
    
  } catch (error) {
    console.error('2x2矩阵求逆失败:', error);
    throw error;
  }
};

/**
 * @description 计算矩阵乘法
 * @param {number[][]} a - 矩阵A
 * @param {number[][]} b - 矩阵B
 * @returns {number[][]} 乘积矩阵
 * @throws {Error} 矩阵维度不匹配时抛出错误
 */
export const multiplyMatrices = (a: number[][], b: number[][]): number[][] => {
  try {
    // 使用ml-matrix库进行高效矩阵运算
    const matrixA = new Matrix(a);
    const matrixB = new Matrix(b);
    
    const result = matrixA.mmul(matrixB);
    return result.to2DArray();
    
  } catch (error) {
    console.error('矩阵乘法失败:', error);
    throw error;
  }
};

/**
 * @description 矩阵转置
 * @param {number[][]} matrix - 输入矩阵
 * @returns {number[][]} 转置矩阵
 */
export const transposeMatrix = (matrix: number[][]): number[][] => {
  try {
    const mat = new Matrix(matrix);
    return mat.transpose().to2DArray();
  } catch (error) {
    console.error('矩阵转置失败:', error);
    throw error;
  }
};

/**
 * @description 矩阵加法
 * @param {number[][]} a - 矩阵A
 * @param {number[][]} b - 矩阵B
 * @returns {number[][]} 和矩阵
 */
export const addMatrices = (a: number[][], b: number[][]): number[][] => {
  try {
    const matrixA = new Matrix(a);
    const matrixB = new Matrix(b);
    
    const result = matrixA.add(matrixB);
    return result.to2DArray();
    
  } catch (error) {
    console.error('矩阵加法失败:', error);
    throw error;
  }
};

/**
 * @description 矩阵标量乘法
 * @param {number[][]} matrix - 输入矩阵
 * @param {number} scalar - 标量
 * @returns {number[][]} 结果矩阵
 */
export const scaleMatrix = (matrix: number[][], scalar: number): number[][] => {
  try {
    const mat = new Matrix(matrix);
    const result = mat.mul(scalar);
    return result.to2DArray();
    
  } catch (error) {
    console.error('矩阵标量乘法失败:', error);
    throw error;
  }
};

/**
 * @description 基于协方差矩阵计算置信区间
 * @param {number} predictedValue - 预测值
 * @param {number} variance - 方差值
 * @param {number} confidence - 置信水平 (0.95 for 95%)
 * @returns {object} 置信区间 {upper, lower}
 */
export const calculateConfidenceInterval = (
  predictedValue: number,
  variance: number,
  confidence: number = 0.95
): { upper: number; lower: number } => {
  try {
    // 使用正态分布的分位数计算置信区间
    const alpha = 1 - confidence;
    const zScore = 1.96; // 95%置信度对应的z分数
    
    const margin = zScore * Math.sqrt(Math.abs(variance));
    
    return {
      upper: predictedValue + margin,
      lower: predictedValue - margin
    };
    
  } catch (error) {
    console.error('置信区间计算失败:', error);
    throw error;
  }
};

// ================================
// 卡尔曼滤波器核心算法
// ================================

/**
 * @description 初始化学生特定标签的卡尔曼滤波器状态
 * @param {number} enrollmentId - 班级注册ID
 * @param {number} tagId - 标签ID
 * @param {KalmanConfig} config - 卡尔曼滤波器配置
 * @returns {Promise<KalmanState>} 初始化的状态
 * @throws {Error} 初始化失败时抛出错误
 */
export const initializeGrowthState = async (
  enrollmentId: number, 
  tagId: number, 
  config: KalmanConfig
): Promise<KalmanState> => {
  try {
    console.log('🎯 初始化Growth状态:', { enrollmentId, tagId });
    
    // 1. 检查是否已存在状态记录
    const existingState = await prisma.growthState.findUnique({
      where: {
        enrollmentId_tagId: {
          enrollmentId,
          tagId
        }
      }
    });
    
    if (existingState) {
      // 如果已存在，解析并返回现有状态
      const covMatrix = existingState.covarianceMatrix as any;
      return {
        level: existingState.level,
        trend: existingState.trend,
        covariance: [
          [covMatrix.p11, covMatrix.p12],
          [covMatrix.p21, covMatrix.p22]
        ]
      };
    }
    
    // 2. 获取标签信息以设置合理的初始值
    const tag = await prisma.tag.findUnique({
      where: { id: tagId }
    });
    
    if (!tag) {
      throw new Error('标签不存在');
    }
    
    // 3. 设置初始值
    const initialLevel = 0.0;  // 中性起始点
    const initialTrend = 0.0;  // 无趋势
    
    // 4. 初始化协方差矩阵 P = [[initialUncertainty, 0], [0, initialUncertainty]]
    const initialCovariance = [
      [config.initialUncertainty, 0],
      [0, config.initialUncertainty]
    ];
    
    // 5. 保存到数据库
    const newState = await prisma.growthState.create({
      data: {
        enrollmentId,
        tagId,
        level: initialLevel,
        trend: initialTrend,
        covarianceMatrix: {
          p11: initialCovariance[0][0],
          p12: initialCovariance[0][1],
          p21: initialCovariance[1][0],
          p22: initialCovariance[1][1]
        },
        totalObservations: 0,
        confidence: 0.0
      }
    });

    console.log('✅ Growth状态初始化成功:', newState.id);

    return {
      level: initialLevel,
      trend: initialTrend,
      covariance: initialCovariance
    };
    
  } catch (error) {
    console.error('初始化Growth状态失败:', error);
    throw error;
  }
};

/**
 * @description 卡尔曼滤波器预测步骤 - 基于状态转移模型预测下一个状态
 * @param {KalmanState} currentState - 当前状态
 * @param {number} deltaTime - 时间间隔（天数）
 * @param {KalmanConfig} config - 滤波器配置
 * @returns {KalmanState} 预测后的状态
 * @throws {Error} 预测计算失败时抛出错误
 */
export const predictState = (
  currentState: KalmanState, 
  deltaTime: number, 
  config: KalmanConfig
): KalmanState => {
  try {
    console.log('🔮 卡尔曼预测步骤:', { deltaTime, level: currentState.level, trend: currentState.trend });
    
    // 1. 状态转移模型：
    // level(k+1) = level(k) + trend(k) * deltaTime
    // trend(k+1) = trend(k) * exp(-λ * deltaTime)  // 趋势随时间衰减
    
    const trendDecay = Math.exp(-config.timeDecayFactor * deltaTime);
    
    const predictedLevel = currentState.level + currentState.trend * deltaTime;
    const predictedTrend = currentState.trend * trendDecay;
    
    // 2. 状态转移矩阵 F
    const F = [
      [1, deltaTime],          // level受trend影响
      [0, trendDecay]          // trend自己衰减
    ];
    
    // 3. 过程噪声矩阵 Q
    const Q = [
      [config.processNoise * deltaTime, 0],
      [0, config.processNoise * deltaTime]
    ];
    
    // 4. 协方差更新：P(k+1|k) = F * P(k) * F^T + Q
    const P = currentState.covariance;
    
    // 计算 F * P
    const FP = multiplyMatrices(F, P);
    
    // 计算 F^T (F的转置)
    const FT = transposeMatrix(F);
    
    // 计算 F * P * F^T
    const FPFT = multiplyMatrices(FP, FT);
    
    // 计算 F * P * F^T + Q
    const predictedCovariance = addMatrices(FPFT, Q);
    
    console.log('✅ 预测完成:', { 
      predictedLevel: predictedLevel.toFixed(3), 
      predictedTrend: predictedTrend.toFixed(3) 
    });
    
    return {
      level: predictedLevel,
      trend: predictedTrend,
      covariance: predictedCovariance
    };
    
  } catch (error) {
    console.error('卡尔曼预测步骤失败:', error);
    throw error;
  }
};

/**
 * @description 卡尔曼滤波器更新步骤 - 使用新观测数据更新状态估计
 * @param {KalmanState} predictedState - 预测状态
 * @param {GrowthObservation} observation - 新的观测数据
 * @param {KalmanConfig} config - 滤波器配置
 * @returns {KalmanState} 更新后的状态
 * @throws {Error} 更新计算失败时抛出错误
 */
export const updateState = (
  predictedState: KalmanState, 
  observation: GrowthObservation, 
  config: KalmanConfig
): KalmanState => {
  try {
    console.log('📊 卡尔曼更新步骤:', { 
      observationValue: observation.value, 
      weight: observation.weight,
      sentiment: observation.tagSentiment 
    });
    
    // 1. 观测模型：z = H * x + v
    // H = [1, 0] (只观测level，不直接观测trend)
    const H = [[1, 0]];
    
    // 2. 观测值处理 - 将权重和情感转换为观测值
    // POSITIVE标签: 观测值 = weight (1-10)
    // NEGATIVE标签: 观测值 = -weight (-1 to -10)
    const observationValue = observation.tagSentiment === 'POSITIVE' ? 
      observation.weight : -observation.weight;
    
    // 3. 观测噪声R基于权重调整：权重越高，噪声越小
    const baseNoise = 1.0;
    const R = [[baseNoise / (observation.weight * observation.weight)]];
    
    // 4. 预测的观测值：H * x_predicted
    const stateVector = [[predictedState.level], [predictedState.trend]];
    const predictedObservationMatrix = multiplyMatrices(H, stateVector);
    const predictedObservation = predictedObservationMatrix[0][0];
    
    // 5. 创新(innovation): y = z - H * x_predicted
    const innovation = observationValue - predictedObservation;
    
    // 6. 创新协方差: S = H * P * H^T + R
    const P = predictedState.covariance;
    const HP = multiplyMatrices(H, P);
    const HT = transposeMatrix(H);
    const HPH = multiplyMatrices(HP, HT);
    const S = addMatrices(HPH, R);
    
    // 7. 卡尔曼增益: K = P * H^T * S^(-1)
    const PH = multiplyMatrices(P, HT);
    const SInv = invertMatrix2x2(S);
    const K = multiplyMatrices(PH, SInv);
    
    // 8. 状态更新: x = x_predicted + K * innovation
    const innovationMatrix = [[innovation]];
    const KInnovation = multiplyMatrices(K, innovationMatrix);
    
    const updatedLevel = predictedState.level + KInnovation[0][0];
    const updatedTrend = predictedState.trend + KInnovation[1][0];
    
    // 9. 协方差更新: P = (I - K * H) * P
    const I = [[1, 0], [0, 1]]; // 单位矩阵
    const KH = multiplyMatrices(K, H);
    const I_minus_KH = addMatrices(I, scaleMatrix(KH, -1));
    
    const updatedCovariance = multiplyMatrices(I_minus_KH, P);
    
    console.log('✅ 更新完成:', { 
      innovation: innovation.toFixed(3),
      gain: [K[0][0].toFixed(3), K[1][0].toFixed(3)],
      newLevel: updatedLevel.toFixed(3), 
      newTrend: updatedTrend.toFixed(3)
    });
    
    return {
      level: updatedLevel,
      trend: updatedTrend,
      covariance: updatedCovariance
    };
    
  } catch (error) {
    console.error('卡尔曼更新步骤失败:', error);
    throw error;
  }
};

// ================================
// 状态管理和持久化
// ================================

/**
 * @description 获取学生特定标签的当前卡尔曼滤波器状态
 * @param {number} enrollmentId - 班级注册ID
 * @param {number} tagId - 标签ID
 * @returns {Promise<KalmanState | null>} 当前状态或null
 * @throws {Error} 查询失败时抛出错误
 */
export const getCurrentGrowthState = async (
  enrollmentId: number,
  tagId: number
): Promise<KalmanState | null> => {
  try {
    console.log('📖 获取当前Growth状态:', { enrollmentId, tagId });
    
    const state = await prisma.growthState.findUnique({
      where: {
        enrollmentId_tagId: {
          enrollmentId,
          tagId
        }
      }
    });
    
    if (!state) {
      return null;
    }
    
    // 解析协方差矩阵JSON
    const covMatrix = state.covarianceMatrix as any;
    
    return {
      level: state.level,
      trend: state.trend,
      covariance: [
        [covMatrix.p11, covMatrix.p12],
        [covMatrix.p21, covMatrix.p22]
      ]
    };
    
  } catch (error) {
    console.error('获取当前Growth状态失败:', error);
    throw error;
  }
};

/**
 * @description 保存卡尔曼滤波器状态到数据库
 * @param {number} enrollmentId - 班级注册ID
 * @param {number} tagId - 标签ID
 * @param {KalmanState} state - 要保存的状态
 * @param {number} totalObservations - 总观测次数
 * @returns {Promise<void>}
 * @throws {Error} 保存失败时抛出错误
 */
export const saveGrowthState = async (
  enrollmentId: number,
  tagId: number,
  state: KalmanState,
  totalObservations: number
): Promise<void> => {
  try {
    console.log('💾 保存Growth状态:', { enrollmentId, tagId, totalObservations });
    
    // 计算置信度分数：基于协方差矩阵的迹和观测次数
    const trace = state.covariance[0][0] + state.covariance[1][1];
    const maxUncertainty = 20.0; // 最大不确定性
    const baseConfidence = Math.max(0, 1 - trace / maxUncertainty);
    const observationBonus = Math.min(1, totalObservations / 10); // 观测次数奖励
    const confidence = Math.min(1, baseConfidence * observationBonus);
    
    // 序列化协方差矩阵为JSON
    const covarianceMatrix = {
      p11: state.covariance[0][0],
      p12: state.covariance[0][1],
      p21: state.covariance[1][0],
      p22: state.covariance[1][1]
    };
    
    // 使用upsert操作（插入或更新）
    await prisma.growthState.upsert({
      where: {
        enrollmentId_tagId: {
          enrollmentId,
          tagId
        }
      },
      update: {
        level: state.level,
        trend: state.trend,
        covarianceMatrix,
        totalObservations,
        confidence
      },
      create: {
        enrollmentId,
        tagId,
        level: state.level,
        trend: state.trend,
        covarianceMatrix,
        totalObservations,
        confidence
      }
    });
    
    console.log('✅ Growth状态保存成功');
    
  } catch (error) {
    console.error('保存Growth状态失败:', error);
    throw error;
  }
};

/**
 * @description 处理新的成长日志记录，更新卡尔曼滤波器状态
 * @param {number} enrollmentId - 班级注册ID
 * @param {number} tagId - 标签ID
 * @param {GrowthObservation} observation - 观测数据
 * @returns {Promise<KalmanState>} 更新后的状态
 * @throws {Error} 处理失败时抛出错误
 */
export const processGrowthObservation = async (
  enrollmentId: number,
  tagId: number,
  observation: GrowthObservation
): Promise<KalmanState> => {
  try {
    console.log('⚡ 处理成长观测数据:', { enrollmentId, tagId, observation });
    
    // 1. 获取当前配置
    const config = await getActiveGrowthConfig();
    
    // 2. 查询或初始化状态
    let currentState = await getCurrentGrowthState(enrollmentId, tagId);
    
    if (!currentState) {
      currentState = await initializeGrowthState(enrollmentId, tagId, config);
    }
    
    // 3. 获取上次更新时间计算时间间隔
    const existingState = await prisma.growthState.findUnique({
      where: {
        enrollmentId_tagId: {
          enrollmentId,
          tagId
        }
      }
    });
    
    const lastUpdated = existingState?.lastUpdatedAt || new Date();
    const deltaTime = Math.max(0.01, (observation.timestamp.getTime() - lastUpdated.getTime()) / (24 * 60 * 60 * 1000));
    
    // 4. 执行预测步骤
    const predictedState = predictState(currentState, deltaTime, config);
    
    // 5. 执行更新步骤
    const updatedState = updateState(predictedState, observation, config);
    
    // 6. 更新观测计数
    const totalObservations = (existingState?.totalObservations || 0) + 1;
    
    // 7. 保存更新后的状态
    await saveGrowthState(enrollmentId, tagId, updatedState, totalObservations);
    
    console.log('✅ 成长观测数据处理完成');
    
    return updatedState;
    
  } catch (error) {
    console.error('处理成长观测数据失败:', error);
    throw error;
  }
};

// 独立读取激活配置，避免与 GrowthService 形成循环依赖
const getActiveGrowthConfig = async (): Promise<KalmanConfig> => {
  try {
    const active = await prisma.growthConfig.findFirst({ where: { isActive: true } });
    if (active) {
      return {
        processNoise: active.processNoise,
        initialUncertainty: active.initialUncertainty,
        timeDecayFactor: active.timeDecayFactor,
        minObservations: active.minObservations,
        maxDaysBetween: active.maxDaysBetween
      };
    }
    return {
      processNoise: 0.1,
      initialUncertainty: 10.0,
      timeDecayFactor: 0.01,
      minObservations: 3,
      maxDaysBetween: 30
    };
  } catch (error) {
    console.error('获取Growth配置失败:', error);
    return {
      processNoise: 0.1,
      initialUncertainty: 10.0,
      timeDecayFactor: 0.01,
      minObservations: 3,
      maxDaysBetween: 30
    };
  }
};

// ================================
// 预测和分析功能
// ================================

/**
 * @description 预测学生在指定时间点的成长状态
 * @param {number} enrollmentId - 班级注册ID
 * @param {number} tagId - 标签ID
 * @param {Date} targetDate - 目标预测时间
 * @returns {Promise<GrowthPrediction>} 预测结果
 * @throws {Error} 预测失败时抛出错误
 */
export const predictGrowthAtTime = async (
  enrollmentId: number,
  tagId: number,
  targetDate: Date
): Promise<GrowthPrediction> => {
  try {
    console.log('🔮 预测成长状态:', { enrollmentId, tagId, targetDate });
    
    // 获取当前状态
    const currentState = await getCurrentGrowthState(enrollmentId, tagId);
    if (!currentState) {
      throw new Error('学生成长状态不存在');
    }
    
    // 获取配置
    const config = await getActiveGrowthConfig();
    
    // 计算到目标时间的间隔
    const now = new Date();
    const deltaTime = (targetDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    
    if (deltaTime < 0) {
      throw new Error('目标时间不能早于当前时间');
    }
    
    // 执行预测步骤
    const predictedState = predictState(currentState, deltaTime, config);
    
    // 计算置信区间（基于协方差矩阵的第一个对角元素）
    const variance = predictedState.covariance[0][0];
    const confidenceInterval = calculateConfidenceInterval(predictedState.level, variance);
    
    // 计算置信度分数
    const trace = predictedState.covariance[0][0] + predictedState.covariance[1][1];
    const confidence = Math.max(0, Math.min(1, 1 - trace / 20.0));
    
    return {
      predictedLevel: predictedState.level,
      predictedTrend: predictedState.trend,
      confidence,
      confidenceInterval
    };
    
  } catch (error) {
    console.error('预测成长状态失败:', error);
    throw error;
  }
};

/**
 * @description 生成指定时间范围内的成长趋势预测序列
 * @param {number} enrollmentId - 班级注册ID
 * @param {number} tagId - 标签ID
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @param {number} dataPoints - 数据点数量
 * @returns {Promise<GrowthPrediction[]>} 时间序列预测
 * @throws {Error} 生成失败时抛出错误
 */
export const generateGrowthTimeSeries = async (
  enrollmentId: number,
  tagId: number,
  startDate: Date,
  endDate: Date,
  dataPoints: number = 30
): Promise<GrowthPrediction[]> => {
  try {
    console.log('📈 生成成长时间序列:', { 
      enrollmentId, tagId, startDate, endDate, dataPoints 
    });
    
    // 验证参数
    if (dataPoints > 365) {
      throw new Error('数据点数量不能超过365');
    }
    
    if (startDate >= endDate) {
      throw new Error('开始日期必须早于结束日期');
    }
    
    const totalDays = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
    const dayInterval = totalDays / (dataPoints - 1);
    
    const timeSeries: GrowthPrediction[] = [];
    
    // 为每个时间点生成预测
    for (let i = 0; i < dataPoints; i++) {
      const currentDate = new Date(startDate.getTime() + (i * dayInterval * 24 * 60 * 60 * 1000));
      
      try {
        const prediction = await predictGrowthAtTime(enrollmentId, tagId, currentDate);
        timeSeries.push(prediction);
      } catch (error) {
        // 如果某个时间点预测失败，使用默认值
        timeSeries.push({
          predictedLevel: 0,
          predictedTrend: 0,
          confidence: 0,
          confidenceInterval: { upper: 0, lower: 0 }
        });
      }
    }
    
    console.log(`✅ 生成成长时间序列成功: ${timeSeries.length} 个数据点`);
    
    return timeSeries;
    
  } catch (error) {
    console.error('生成成长时间序列失败:', error);
    throw error;
  }
};

/**
 * @description 计算学生在特定标签上的整体成长趋势方向
 * @param {number} enrollmentId - 班级注册ID
 * @param {number} tagId - 标签ID
 * @param {number} lookbackDays - 回看天数，默认30天
 * @returns {Promise<string>} 趋势方向 ('IMPROVING'|'DECLINING'|'STABLE')
 * @throws {Error} 计算失败时抛出错误
 */
export const calculateGrowthTrend = async (
  enrollmentId: number,
  tagId: number,
  lookbackDays: number = 30
): Promise<'IMPROVING' | 'DECLINING' | 'STABLE'> => {
  try {
    console.log('📊 计算成长趋势:', { enrollmentId, tagId, lookbackDays });
    
    // 获取当前状态
    const currentState = await getCurrentGrowthState(enrollmentId, tagId);
    if (!currentState) {
      return 'STABLE';
    }
    
    // 基于trend值判断趋势方向
    const trendThreshold = 0.1; // 趋势判断阈值
    
    if (currentState.trend > trendThreshold) {
      return 'IMPROVING';
    } else if (currentState.trend < -trendThreshold) {
      return 'DECLINING';
    } else {
      return 'STABLE';
    }
    
  } catch (error) {
    console.error('计算成长趋势失败:', error);
    throw error;
  }
};

/**
 * @description 批量处理多个成长日志记录，优化性能
 * @param {Array} observations - 观测数据数组
 * @returns {Promise<KalmanState[]>} 批量更新结果
 * @throws {Error} 批量处理失败时抛出错误
 */
export const batchProcessGrowthObservations = async (
  observations: Array<{
    enrollmentId: number;
    tagId: number;
    observation: GrowthObservation;
  }>
): Promise<KalmanState[]> => {
  try {
    console.log('⚡ 批量处理成长观测数据:', { count: observations.length });
    
    const results: KalmanState[] = [];
    
    // 使用事务确保数据一致性
    await prisma.$transaction(async (tx) => {
      for (const obs of observations) {
        try {
          const result = await processGrowthObservation(
            obs.enrollmentId,
            obs.tagId,
            obs.observation
          );
          results.push(result);
        } catch (error) {
          console.error(`处理观测数据失败:`, obs, error);
          // 继续处理其他记录
        }
      }
    });
    
    console.log(`✅ 批量处理完成: ${results.length}/${observations.length} 成功`);
    
    return results;
    
  } catch (error) {
    console.error('批量处理成长观测数据失败:', error);
    throw error;
  }
};

/**
 * @description 重新计算所有或指定学生的成长状态（系统维护功能）
 * @param {number} [enrollmentId] - 可选，指定学生ID，不指定则重算所有
 * @param {boolean} [useLatestConfig] - 是否使用最新配置，默认true
 * @returns {Promise<number>} 重新计算的状态数量
 * @throws {Error} 重计算失败时抛出错误
 */
export const recalculateGrowthStates = async (
  enrollmentId?: number,
  useLatestConfig: boolean = true
): Promise<number> => {
  try {
    console.log('🔄 重新计算Growth状态:', { enrollmentId, useLatestConfig });
    
    // 构建查询条件
    const whereCondition: any = {};
    if (enrollmentId) {
      whereCondition.enrollmentId = enrollmentId;
    }
    
    // 获取所有需要重计算的成长日志
    const growthLogs = await prisma.growthLog.findMany({
      where: whereCondition,
      include: {
        tag: true,
        enrollment: {
          include: {
            student: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // 按学生-标签组合分组
    const groupedLogs = new Map<string, any[]>();
    
    for (const log of growthLogs) {
      const key = `${log.enrollmentId}-${log.tagId}`;
      if (!groupedLogs.has(key)) {
        groupedLogs.set(key, []);
      }
      groupedLogs.get(key)!.push(log);
    }
    
    let processedCount = 0;
    
    // 重新计算每个学生-标签组合的状态
    for (const [key, logs] of groupedLogs) {
      try {
        const [enrollmentIdStr, tagIdStr] = key.split('-');
        const enrollmentId = parseInt(enrollmentIdStr);
        const tagId = parseInt(tagIdStr);
        
        // 删除现有状态
        await prisma.growthState.deleteMany({
          where: {
            enrollmentId,
            tagId
          }
        });
        
        // 按时间顺序重新处理所有观测数据
        for (const log of logs) {
          const observation: GrowthObservation = {
            value: log.weight,
            timestamp: log.createdAt,
            weight: log.weight,
            tagSentiment: log.tag.type === 'GROWTH_POSITIVE' ? 'POSITIVE' : 'NEGATIVE'
          };
          
          await processGrowthObservation(enrollmentId, tagId, observation);
        }
        
        processedCount++;
        
      } catch (error) {
        console.error(`重计算状态失败: ${key}`, error);
      }
    }
    
    console.log(`✅ 重新计算完成: ${processedCount} 个状态`);
    
    return processedCount;
    
  } catch (error) {
    console.error('重新计算Growth状态失败:', error);
    throw error;
  }
}; 