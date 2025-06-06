# 建構階段
FROM node:18-alpine AS builder

WORKDIR /app

# 複製依賴檔案
COPY package*.json ./
RUN npm ci --silent

# 複製原代碼
COPY . .

# 設定環境變數
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# 建構應用
RUN npm run build

# 生產階段
FROM nginx:alpine

# 移除預設nginx配置
RUN rm /etc/nginx/conf.d/default.conf

# 複製自定義配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 複製建構產物
COPY --from=builder /app/build /usr/share/nginx/html

# 設定適當權限
RUN chmod -R 755 /usr/share/nginx/html

# 確保 nginx用戶擁有檔案
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]