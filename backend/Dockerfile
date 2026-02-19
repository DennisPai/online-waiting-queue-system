FROM node:20-alpine

WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm install --production

# 複製剩餘的程式碼
COPY . .

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=8080

# 開放連接埠
EXPOSE 8080

# 啟動應用
CMD ["npm", "start"] 