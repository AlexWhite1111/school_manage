// 统一考试评分标准（单一来源）
// 若后续需要按学段/学科动态调整，可在此扩展为对象或从后端加载

export const EXCELLENT_SCORE_THRESHOLD = 80; // 优秀线：>= 80 分
export const PASS_SCORE_THRESHOLD = 60;      // 及格线：>= 60 分

export type ScoreBand = 'excellent' | 'pass' | 'fail';

export function getScoreBand(score: number): ScoreBand {
  if (score >= EXCELLENT_SCORE_THRESHOLD) return 'excellent';
  if (score >= PASS_SCORE_THRESHOLD) return 'pass';
  return 'fail';
}

