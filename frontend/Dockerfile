# 最基本的nginx測試 - 使用預設配置
FROM nginx:alpine

# 只創建一個簡單的index.html，使用nginx預設配置
RUN echo '<!DOCTYPE html><html><head><title>Basic Test</title></head><body><h1 style="color:green;">✅ BASIC NGINX WORKING!</h1><p>Time: <script>document.write(new Date().toLocaleString());</script></p><p>If you see this, the most basic nginx setup is working.</p></body></html>' > /usr/share/nginx/html/index.html

# 顯示預設nginx配置
RUN cat /etc/nginx/nginx.conf
RUN cat /etc/nginx/conf.d/default.conf

# 顯示檔案狀態
RUN ls -la /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]