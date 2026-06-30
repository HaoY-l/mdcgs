# ===== 构建阶段 =====
FROM node:20-alpine AS build

WORKDIR /app

# 使用淘宝 npm 镜像
RUN npm config set registry https://registry.npmmirror.com

COPY package.json .
RUN npm install

COPY . .
RUN npm run build

# ===== 运行阶段 =====
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 7786

CMD ["nginx", "-g", "daemon off;"]
