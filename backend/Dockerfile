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

# 安装依赖（包括开发依赖以获取Prisma CLI）
RUN npm ci && npm cache clean --force

# 复制源代码
COPY . .

# 生成Prisma Client
RUN npx prisma generate

# 构建应用
RUN npm run build

# 重新生成Prisma Client (生产环境)
RUN npx prisma generate

# 清理开发依赖（节省空间）
RUN npm prune --production

# 确保Prisma Client在生产环境中可用
RUN npm install @prisma/client

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# 创建必要的目录并设置权限
RUN mkdir -p uploads logs && \
    chown -R nextjs:nodejs /app

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"] 