# Hướng dẫn cài đặt và cấu hình Nginx cho Gemini Store Chatbox

## 1. Cài đặt Nginx

### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install nginx
```

### CentOS/RHEL:
```bash
sudo yum install nginx
# hoặc
sudo dnf install nginx
```

## 2. Cấu hình SSL Certificate

### Sử dụng Let's Encrypt (miễn phí):
```bash
# Cài đặt Certbot
sudo apt install certbot python3-certbot-nginx

# Lấy certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Thêm dòng:
0 12 * * * /usr/bin/certbot renew --quiet
```

### Sử dụng certificate tự tạo:
```bash
# Tạo private key
sudo openssl genrsa -out /etc/ssl/private/gemini_chatbox.key 2048

# Tạo certificate
sudo openssl req -new -x509 -key /etc/ssl/private/gemini_chatbox.key -out /etc/ssl/certs/gemini_chatbox.crt -days 365
```

## 3. Cấu hình Nginx

### Copy file cấu hình:
```bash
# Copy file nginx.conf vào thư mục sites-available
sudo cp nginx.conf /etc/nginx/sites-available/gemini-chatbox

# Tạo symbolic link
sudo ln -s /etc/nginx/sites-available/gemini-chatbox /etc/nginx/sites-enabled/

# Xóa default site (optional)
sudo rm /etc/nginx/sites-enabled/default
```

### Chỉnh sửa các đường dẫn trong file cấu hình:
```bash
sudo nano /etc/nginx/sites-available/gemini-chatbox
```

**Thay đổi các đường dẫn sau:**
- `your-domain.com` → domain thực của bạn
- `/path/to/your/certificate.crt` → đường dẫn certificate
- `/path/to/your/private.key` → đường dẫn private key
- `/path/to/your/GEMINI-STORE-CHHATBOX/public` → đường dẫn đến thư mục public của ứng dụng

## 4. Cấu hình Node.js App

### Tạo systemd service:
```bash
sudo nano /etc/systemd/system/gemini-chatbox.service
```

**Nội dung file service:**
```ini
[Unit]
Description=Gemini Store Chatbox
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/your/GEMINI-STORE-CHHATBOX
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

### Khởi động service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable gemini-chatbox
sudo systemctl start gemini-chatbox
```

## 5. Kiểm tra và khởi động Nginx

### Test cấu hình:
```bash
sudo nginx -t
```

### Khởi động Nginx:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Kiểm tra status:
```bash
sudo systemctl status nginx
sudo systemctl status gemini-chatbox
```

## 6. Firewall Configuration

### Ubuntu (ufw):
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

### CentOS/RHEL (firewalld):
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 7. Monitoring và Logs

### Xem logs:
```bash
# Nginx logs
sudo tail -f /var/log/nginx/gemini_chatbox_access.log
sudo tail -f /var/log/nginx/gemini_chatbox_error.log

# Node.js app logs
sudo journalctl -u gemini-chatbox -f
```

### Kiểm tra performance:
```bash
# Kiểm tra connections
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443
sudo netstat -tulpn | grep :3000
```

## 8. Tối ưu hóa

### Cấu hình worker processes:
```bash
sudo nano /etc/nginx/nginx.conf
```

**Thêm vào phần http:**
```nginx
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Existing configuration...
    
    # Additional optimizations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
}
```

## 9. Troubleshooting

### Các lỗi thường gặp:

1. **502 Bad Gateway:**
   - Kiểm tra Node.js app có chạy không: `sudo systemctl status gemini-chatbox`
   - Kiểm tra port 3000: `sudo netstat -tulpn | grep :3000`

2. **SSL Certificate errors:**
   - Kiểm tra đường dẫn certificate
   - Kiểm tra quyền truy cập file

3. **Permission denied:**
   - Kiểm tra quyền của thư mục: `sudo chown -R www-data:www-data /path/to/app`
   - Kiểm tra SELinux (nếu có): `sudo setsebool -P httpd_can_network_connect 1`

### Commands hữu ích:
```bash
# Reload Nginx config
sudo nginx -s reload

# Restart services
sudo systemctl restart nginx
sudo systemctl restart gemini-chatbox

# Check configuration
sudo nginx -t
sudo systemctl status gemini-chatbox
```

## 10. Security Checklist

- [ ] SSL certificate được cấu hình đúng
- [ ] Security headers được thêm
- [ ] Rate limiting được bật
- [ ] Firewall được cấu hình
- [ ] Sensitive files được block
- [ ] Logs được monitor
- [ ] Auto-renewal SSL được setup
- [ ] Backup strategy được implement
