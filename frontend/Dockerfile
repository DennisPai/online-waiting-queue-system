# 使用 Node.js 建構階段
FROM node:18-alpine as build

# 設定工作目錄
WORKDIR /app

# 複製 package 檔案
COPY package*.json ./

# 安裝依賴（包含 devDependencies 用於建構）
RUN npm ci

# 複製原代碼
COPY . .

# 設定建構時環境變數
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# 建構應用
RUN npm run build

# 使用 Nginx 運行階段
FROM nginx:stable-alpine

# 複製建構結果
COPY --from=build /app/build /usr/share/nginx/html

# 複製 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 設定權限
RUN chmod -R 755 /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 啟動 Nginx
CMD ["nginx", "-g", "daemon off;"]