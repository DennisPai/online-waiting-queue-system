# 超極簡調試版本 - 不建構 React，只測試 nginx
FROM nginx:alpine

# 移除預設配置
RUN rm -rf /etc/nginx/conf.d/*

# 創建超簡單的 nginx 配置
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ =404; \
    } \
    location /health { \
        return 200 "nginx-working"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

# 創建超簡單的測試檔案
RUN echo '<!DOCTYPE html> \
<html> \
<head><title>DEBUG TEST</title></head> \
<body> \
<h1>🟢 NGINX IS WORKING!</h1> \
<p>Time: <script>document.write(new Date())</script></p> \
<p>If you see this, nginx container is running correctly.</p> \
</body> \
</html>' > /usr/share/nginx/html/index.html

# 創建簡單測試頁面
RUN echo '<!DOCTYPE html><html><body><h1>Static Test OK</h1></body></html>' > /usr/share/nginx/html/test.html

# 設定權限
RUN chmod -R 755 /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html

# 顯示配置內容（調試用）
RUN cat /etc/nginx/conf.d/default.conf
RUN ls -la /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]