# MDCGS 前端 Dockerfile - 构建阶段
FROM node:20-alpine AS build

WORKDIR /app

# 安装依赖
COPY package.json .
RUN npm install

# 复制源码并构建
COPY . .
RUN npm run build

# Nginx 运行阶段
FROM nginx:alpine

# 复制构建产物
COPY --from=build /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
