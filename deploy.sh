#!/usr/bin/env bash

# ==============================================================================
# 🚀 Netflix NFToken Generator - VPS Automated Deployment Script
# 📦 نظام النشر والتشغيل التلقائي الكامل على سيرفرات AWS (Amazon Linux) و Ubuntu / Debian
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

APP_NAME="nftoken"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"

# Detect execution user
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[!] يجب تشغيل هذا السكريبت بصلاحيات Root أو عبر sudo.${NC}"
    echo -e "${YELLOW}👉 شغّل الأمر: sudo bash $0 $*${NC}"
    exit 1
fi

ACTUAL_USER="${SUDO_USER:-root}"
ACTUAL_HOME=$(getent passwd "$ACTUAL_USER" 2>/dev/null | cut -d: -f6)
[ -z "$ACTUAL_HOME" ] && ACTUAL_HOME="/root"

# Detect Linux Distribution
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_ID="${ID:-unknown}"
        OS_VERSION_ID="${VERSION_ID:-unknown}"
        OS_PRETTY_NAME="${PRETTY_NAME:-$OS_ID}"
    else
        OS_ID="unknown"
        OS_VERSION_ID="unknown"
        OS_PRETTY_NAME="Linux"
    fi
}
detect_os

show_banner() {
    clear
    echo -e "${CYAN}${BOLD}"
    echo "=================================================================="
    echo "            🚀 XNetflix Studio - VPS Auto-Deployer               "
    echo "       نظام النشر التلقائي للتشغيل المباشر أونلاين على AWS       "
    echo "=================================================================="
    echo -e "${NC}"
    echo -e "${BLUE}🖥️  نظام التشغيل المكتشف: ${BOLD}${OS_PRETTY_NAME}${NC}"
    echo -e "${BLUE}👤 المستخدم الحالي:       ${BOLD}${ACTUAL_USER}${NC}"
    echo ""
}

# Public IP detection with AWS EC2 IMDS support
get_public_ip() {
    local ip=""
    # 1. Try AWS IMDSv2 (EC2 Token)
    local token
    token=$(curl -s -m 2 -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60" 2>/dev/null || true)
    if [ -n "$token" ]; then
        ip=$(curl -s -m 2 -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)
    fi

    # 2. Try AWS IMDSv1
    if [ -z "$ip" ] || [[ "$ip" == *"<"* ]] || [[ "$ip" == *"404"* ]]; then
        ip=$(curl -s -m 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)
    fi

    # 3. Fallback to external IP services
    if [ -z "$ip" ] || [[ "$ip" == *"<"* ]] || [[ "$ip" == *"404"* ]]; then
        ip=$(curl -s -4 -m 3 https://ifconfig.me 2>/dev/null || curl -s -4 -m 3 https://api.ipify.org 2>/dev/null || curl -s -4 -m 3 https://icanhazip.com 2>/dev/null || echo "")
    fi

    # 4. Final fallback
    if [ -z "$ip" ] || [[ "$ip" == *"<"* ]]; then
        ip="YOUR_SERVER_IP"
    fi
    echo "$ip"
}

# Subcommands handling
case "$1" in
    status)
        echo -e "${BLUE}ℹ️ حالة خدمة التطبيق (${APP_NAME}):${NC}"
        systemctl status ${APP_NAME} --no-pager
        exit 0
        ;;
    restart)
        echo -e "${YELLOW}🔄 جاري إعادة تشغيل التطبيق و Nginx...${NC}"
        systemctl restart ${APP_NAME}
        systemctl reload nginx
        echo -e "${GREEN}✅ تم إعادة التشغيل بنجاح!${NC}"
        exit 0
        ;;
    stop)
        echo -e "${YELLOW}🛑 جاري إيقاف التطبيق...${NC}"
        systemctl stop ${APP_NAME}
        echo -e "${GREEN}✅ تم إيقاف الخدمة بنجاح.${NC}"
        exit 0
        ;;
    start)
        echo -e "${YELLOW}▶️ جاري تشغيل التطبيق...${NC}"
        systemctl start ${APP_NAME}
        echo -e "${GREEN}✅ تم تشغيل الخدمة بنجاح.${NC}"
        exit 0
        ;;
    logs)
        echo -e "${BLUE}📜 عرض سجلات التطبيق الحية (Live Logs) - اضغط Ctrl+C للخروج:${NC}"
        journalctl -u ${APP_NAME} -f -n 50
        exit 0
        ;;
    ssl)
        DOMAIN="$2"
        if [ -z "$DOMAIN" ]; then
            echo -e "${RED}[!] يرجى كتابة اسم الدومين: sudo bash deploy.sh ssl example.com${NC}"
            exit 1
        fi
        echo -e "${CYAN}🔒 جاري تثبيت شهادة SSL مجانية (Let's Encrypt) للدومين: ${DOMAIN}...${NC}"

        # 1. Update server_name in active Nginx config so certbot can locate the block
        local nginx_conf_file=""
        if [ -f "/etc/nginx/conf.d/${APP_NAME}.conf" ]; then
            nginx_conf_file="/etc/nginx/conf.d/${APP_NAME}.conf"
        elif [ -f "/etc/nginx/sites-available/${APP_NAME}.conf" ]; then
            nginx_conf_file="/etc/nginx/sites-available/${APP_NAME}.conf"
        elif [ -f "/etc/nginx/sites-available/${APP_NAME}" ]; then
            nginx_conf_file="/etc/nginx/sites-available/${APP_NAME}"
        fi

        if [ -n "$nginx_conf_file" ]; then
            echo -e "${CYAN}🔧 تحديث اسم الدومين (${DOMAIN}) في إعدادات Nginx...${NC}"
            sed -i "s/server_name .*/server_name ${DOMAIN} www.${DOMAIN};/" "$nginx_conf_file"
            nginx -t && systemctl reload nginx
        fi

        # 2. Install certbot and nginx plugin based on distro
        if [ "$OS_ID" = "amzn" ]; then
            if command -v dnf >/dev/null 2>&1; then
                # Amazon Linux 2023
                dnf install -y certbot python3-certbot-nginx
            else
                # Amazon Linux 2
                amazon-linux-extras install -y epel 2>/dev/null || true
                yum install -y certbot python3-certbot-nginx 2>/dev/null || "$APP_DIR/venv/bin/pip" install certbot certbot-nginx
            fi
        elif command -v apt-get >/dev/null 2>&1; then
            export DEBIAN_FRONTEND=noninteractive
            apt-get update -y
            apt-get install -y certbot python3-certbot-nginx
        elif command -v dnf >/dev/null 2>&1; then
            dnf install -y certbot python3-certbot-nginx
        elif command -v yum >/dev/null 2>&1; then
            yum install -y certbot python3-certbot-nginx
        fi

        # 3. Check if www resolves as well to request multi-domain cert
        local certbot_domains="-d $DOMAIN"
        if getent hosts "www.${DOMAIN}" >/dev/null 2>&1; then
            certbot_domains="-d ${DOMAIN} -d www.${DOMAIN}"
        fi

        certbot --nginx $certbot_domains --non-interactive --agree-tos --register-unsafely-without-email --redirect
        systemctl reload nginx
        echo -e "${GREEN}✅ تم تفعيل HTTPS وشهادة SSL بنجاح على https://${DOMAIN}/${NC}"
        exit 0
        ;;
esac

# ------------------------------------------------------------------------------
# Full Installation & Deployment Workflow
# ------------------------------------------------------------------------------
show_banner

echo -e "${BLUE}[1/7] 📦 تحديث الحزم وتثبيت المتطلبات الأساسية...${NC}"

if [ "$OS_ID" = "amzn" ]; then
    echo -e "${CYAN}Amazon Linux (${OS_VERSION_ID}) مكتشف. جاري التثبيت عبر مدير الحزم الخاص بـ AWS...${NC}"
    if command -v dnf >/dev/null 2>&1; then
        # Amazon Linux 2023 (curl-minimal is preinstalled, do not install full curl)
        dnf update -y
        dnf install -y --allowerasing python3 python3-pip nginx git
    else
        # Amazon Linux 2
        yum update -y
        if command -v amazon-linux-extras >/dev/null 2>&1; then
            amazon-linux-extras install -y nginx1 2>/dev/null || yum install -y nginx
        else
            yum install -y nginx
        fi
        yum install -y python3 python3-pip git
    fi
elif command -v apt-get >/dev/null 2>&1; then
    # Ubuntu / Debian
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y python3 python3-pip python3-venv nginx ufw curl git
elif command -v dnf >/dev/null 2>&1; then
    # Fedora / RHEL 8+ / Rocky / Alma
    dnf update -y
    dnf install -y python3 python3-pip python3-devel nginx git curl
elif command -v yum >/dev/null 2>&1; then
    # CentOS / RHEL 7
    yum update -y
    yum install -y python3 python3-pip nginx git curl
else
    echo -e "${YELLOW}[!] لم يتم التعرف على مدير الحزم، محاولة المتابعة...${NC}"
fi

echo -e "${BLUE}[2/7] 🐍 إعداد البيئة الافتراضية للبايثون وتثبيت المكتبات...${NC}"
cd "$APP_DIR"

if [ ! -d "$APP_DIR/venv" ]; then
    python3 -m venv "$APP_DIR/venv"
fi

"$APP_DIR/venv/bin/pip" install --upgrade pip setuptools wheel
"$APP_DIR/venv/bin/pip" install -r "$APP_DIR/requirements.txt"

# Ensure runtime files exist
touch "$APP_DIR/input.txt"
[ ! -f "$APP_DIR/history.json" ] && echo "[]" > "$APP_DIR/history.json"
[ ! -f "$APP_DIR/cookies_pool.json" ] && echo "[]" > "$APP_DIR/cookies_pool.json"
[ ! -f "$APP_DIR/device_limits.json" ] && echo "{}" > "$APP_DIR/device_limits.json"
[ ! -f "$APP_DIR/device_aliases.json" ] && echo "{}" > "$APP_DIR/device_aliases.json"
[ ! -f "$APP_DIR/admin_sessions.json" ] && echo "{}" > "$APP_DIR/admin_sessions.json"

chown -R "$ACTUAL_USER:$ACTUAL_USER" "$APP_DIR"
chmod -R 755 "$APP_DIR"

# Allow Nginx (nginx/www-data) to traverse home directory if app is placed in user home
if [ "$ACTUAL_USER" != "root" ] && [ -d "$ACTUAL_HOME" ]; then
    chmod o+x "$ACTUAL_HOME" 2>/dev/null || true
fi

# Protect sensitive configuration and credential files from unauthorized system users
chmod 600 "$APP_DIR/admin_config.json" 2>/dev/null || true
chmod 600 "$APP_DIR/cookies_pool.json" 2>/dev/null || true
chmod 600 "$APP_DIR/history.json" 2>/dev/null || true
chmod 600 "$APP_DIR/input.txt" 2>/dev/null || true
chmod 600 "$APP_DIR/admin_sessions.json" 2>/dev/null || true
chmod 600 "$APP_DIR/.flask_secret" 2>/dev/null || true

# SELinux adjustments for Amazon Linux / RHEL
if command -v setsebool >/dev/null 2>&1; then
    echo -e "${CYAN}🛡️ ضبط أذونات SELinux للسماح لـ Nginx بالربط مع التطبيق...${NC}"
    setsebool -P httpd_can_network_connect 1 2>/dev/null || true
fi
if command -v chcon >/dev/null 2>&1; then
    chcon -Rt httpd_sys_content_t "$APP_DIR/static" 2>/dev/null || true
fi

echo -e "${BLUE}[3/7] ⚙️ إنشاء وضبط خدمة النظام (Systemd Service)...${NC}"
cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=Netflix NFToken Generator Web App
After=network.target

[Service]
Type=simple
User=$ACTUAL_USER
WorkingDirectory=$APP_DIR
Environment="PATH=$APP_DIR/venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PORT=5000"
ExecStart=$APP_DIR/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:5000 --timeout 120 --access-logfile - --error-logfile - app:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ${APP_NAME}
systemctl restart ${APP_NAME}

echo -e "${BLUE}[4/7] 🌐 إعداد خادم Nginx Reverse Proxy المحمي...${NC}"

# Configure Nginx paths (supports both Amazon Linux /conf.d and Debian /sites-available)
NGINX_CONF="/etc/nginx/conf.d/${APP_NAME}.conf"
mkdir -p /etc/nginx/conf.d

cat <<EOF > "$NGINX_CONF"
server {
    listen 80;
    server_name _;
    server_tokens off;

    # Maximum upload size limit to prevent memory exhaustion DoS
    client_max_body_size 5M;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Block access to hidden files (.git, .env, etc.)
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Block direct access to configuration and data files
    location ~* \.(json|py|sh|txt|log|env|md)$ {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Static assets cache
    location /static/ {
        alias $APP_DIR/static/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        add_header X-Content-Type-Options "nosniff" always;
    }

    location / {
        # Restrict disallowed HTTP methods
        limit_except GET POST HEAD OPTIONS {
            deny all;
        }

        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# For Debian/Ubuntu compatibility with sites-enabled
if [ -d "/etc/nginx/sites-available" ] && [ -d "/etc/nginx/sites-enabled" ]; then
    ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/${APP_NAME}.conf" 2>/dev/null || true
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
fi

# Disable default conflicting server config on CentOS/RHEL/AL if present in conf.d
if [ -f "/etc/nginx/conf.d/default.conf" ]; then
    mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled 2>/dev/null || true
fi

nginx -t
systemctl enable nginx
systemctl restart nginx

echo -e "${BLUE}[5/7] 🛡️ ضبط جدار الحماية (Firewall & AWS Security Group)...${NC}"
# UFW for Ubuntu/Debian
if command -v ufw >/dev/null 2>&1; then
    ufw allow 22/tcp >/dev/null 2>&1 || true
    ufw allow 80/tcp >/dev/null 2>&1 || true
    ufw allow 443/tcp >/dev/null 2>&1 || true
    if ! ufw status 2>/dev/null | grep -q "Status: active"; then
        echo "y" | ufw enable >/dev/null 2>&1 || true
    fi
# Firewalld for RHEL/CentOS
elif command -v firewall-cmd >/dev/null 2>&1 && systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-service=http >/dev/null 2>&1 || true
    firewall-cmd --permanent --add-service=https >/dev/null 2>&1 || true
    firewall-cmd --permanent --add-service=ssh >/dev/null 2>&1 || true
    firewall-cmd --reload >/dev/null 2>&1 || true
fi

echo -e "${BLUE}[6/7] ⏳ التحقق من تشغيل التطبيق...${NC}"
sleep 3
if systemctl is-active --quiet ${APP_NAME}; then
    echo -e "${GREEN}✅ خدمة التطبيق تعمل بنجاح في الخلفية (24/7)!${NC}"
else
    echo -e "${RED}[!] حدث خطأ أثناء تشغيل الخدمة. سجلات الخطأ:${NC}"
    journalctl -u ${APP_NAME} -n 20 --no-pager
    exit 1
fi

PUBLIC_IP=$(get_public_ip)

echo -e "${BLUE}[7/7] 🎉 اكتمال النشر والتشغيل!${NC}"
echo ""
echo -e "${GREEN}${BOLD}==================================================================${NC}"
echo -e "${GREEN}${BOLD} ✨ تم تشغيل موقعك أونلاين بنجاح! ${NC}"
echo -e "${GREEN}${BOLD}==================================================================${NC}"
echo ""
echo -e " 🌍 رابط الموقع المباشر:  ${CYAN}${BOLD}http://${PUBLIC_IP}/${NC}"
echo ""
echo -e "${YELLOW}${BOLD}⚠️  ملاحظة هامة لمستخدمي AWS Cloud:${NC}"
echo -e " تأكد من فتح المنافذ في ${BOLD}AWS EC2 Security Group (Inbound Rules)${NC}:"
echo -e "   • ${BOLD}Port 80 (HTTP)${NC}   -> 0.0.0.0/0"
echo -e "   • ${BOLD}Port 443 (HTTPS)${NC} -> 0.0.0.0/0"
echo -e "   • ${BOLD}Port 22 (SSH)${NC}    -> My IP (أو 0.0.0.0/0)"
echo ""
echo -e " 🛡️ أوامر إدارة التطبيق السريعة:"
echo -e "   • إعادة التشغيل:   ${YELLOW}sudo bash deploy.sh restart${NC}"
echo -e "   • إيقاف الموقع:    ${YELLOW}sudo bash deploy.sh stop${NC}"
echo -e "   • التحقق من الحالة: ${YELLOW}sudo bash deploy.sh status${NC}"
echo -e "   • قراءة السجلات:   ${YELLOW}sudo bash deploy.sh logs${NC}"
echo -e "   • ربط دومين و SSL: ${YELLOW}sudo bash deploy.sh ssl yourdomain.com${NC}"
echo ""
echo -e "${GREEN}==================================================================${NC}"
