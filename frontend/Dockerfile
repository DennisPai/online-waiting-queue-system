# 構建階段
FROM node:16-alpine as build

WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm install

# 複製剩餘的程式碼
COPY . .

# 構建應用
RUN npm run build

# 運行階段
FROM nginx:stable-alpine

# 複製構建結果到 Nginx
COPY --from=build /app/build /usr/share/nginx/html

# 複製 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]