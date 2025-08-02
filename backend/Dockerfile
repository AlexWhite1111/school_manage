# 后端Dockerfile
FROM node:18-alpine AS base

# 安装必要的系统依赖
RUN apk add --no-cache \
    openssl \
    curl \
    dumb-init

# 创建工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 生成Prisma Client
RUN npm run prisma:generate

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# 创建必要的目录并设置权限
RUN mkdir -p uploads logs && \
    chown -R nextjs:nodejs /app

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"] 