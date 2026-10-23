# XNetflix — Netflix Activation & NFToken Studio

A secure web application and automated generator for Netflix `NFToken` links and Smart TV activations.

## Features

- **Modern Web Dashboard & UI**: Interactive Netflix-styled dark UI with Arabic/English bilingual support.
- **Netflix Activation (1-Click)**: Instant token generation and direct auto-login links.
- **Smart TV Activation**: Direct link generator and QR codes for activating Netflix on Smart TVs (`netflix.com/tv8`).
- **Interactive QR Codes**: Real-time QR codes for mobile & TV scanning.
- **Enterprise Security Hardened**: OWASP headers (CSP, HSTS), rate limiting, brute force lockout, IP-bound sessions, and encrypted credentials.
- **Supports Multiple Formats**: Netscape cookies, raw cookie strings, and JSON cookie arrays.

## Requirements

Install the required modules:

```bash
pip install -r requirements.txt
```

## Quick Start

1. Clone the repo:

```bash
git clone https://github.com/harshitkamboj/Netflix-NFToken-Generator.git
cd Netflix-NFToken-Generator
```

2. Install requirements:

```bash
pip install requests
```

3. Run the script once:

```bash
python nf-token-generator.py
```

4. If `input.txt` does not exist, the script will create it automatically
5. Paste your Netflix cookie into `input.txt`
6. Run again:

```bash
python nf-token-generator.py
```

7. The console will print:

```text
https://www.netflix.com/?nftoken=...
```

## ⚡ Vercel Deployment (النشر السحابي المجاني على Vercel)

المشروع مُعدّ ومضبوط بنسبة 100% ليعمل على **Vercel** بنظام Serverless:
1. استورد هذا المستودع في [Vercel Dashboard](https://vercel.com/new).
2. سيقوم Vercel باكتشاف إعدادات `vercel.json` وملف الدخول `api/index.py` تلقائياً.
3. اضغط **Deploy**.
4. للمزيد من التفاصيل حول ضبط الـ Environment Variables، راجع [VERCEL_DEPLOYMENT_GUIDE.md](file:///home/ramzi/Netflix-NFToken-Generator/VERCEL_DEPLOYMENT_GUIDE.md).

## 🚀 Cloud / VPS Deployment (التشغيل المباشر أونلاين على السيرفر)

لجعل الموقع يعمل أونلاين ومباشرة على سيرفرات سحابية مثل **AWS Cloud (Amazon Linux 2 / 2023)** أو أي سيرفر VPS يعمل بـ **Ubuntu / Debian** عبر Nginx و Systemd:

```bash
sudo bash deploy.sh
```

> **ملاحظة لمستخدمي AWS:** تأكد من فتح المنافذ (Inbound Rules) في **Security Group**:
> - Port 80 (HTTP)
> - Port 443 (HTTPS)
> - Port 22 (SSH)

أوامر التحكم السريعة:
- **الحالة**: `sudo bash deploy.sh status`
- **إعادة التشغيل**: `sudo bash deploy.sh restart`
- **السجلات الحية**: `sudo bash deploy.sh logs`
- **تفعيل SSL/HTTPS مع دومين**: `sudo bash deploy.sh ssl yourdomain.com`


## Input Example

### Raw Cookie String

```text
NetflixId=xxx; SecureNetflixId=xxx; nfvdid=xxx
```

### Netscape Cookie Format

```text
.netflix.com	TRUE	/	TRUE	1234567890	NetflixId	xxx
.netflix.com	TRUE	/	TRUE	1234567890	SecureNetflixId	xxx
.netflix.com	TRUE	/	TRUE	1234567890	nfvdid	xxx
```

### JSON Format

```json
{
  "NetflixId": "xxx",
  "SecureNetflixId": "xxx",
  "nfvdid": "xxx"
}
```

## How It Works

1. The script reads cookie data from `input.txt`
2. It extracts the required Netflix session cookies
3. It builds the `Cookie` header
4. It sends a request to Netflix's `createAutoLoginToken` GraphQL operation
5. It reads the returned token from `data.createAutoLoginToken`
6. It prints the final Netflix login link using `?nftoken=...`

## Files

```text
nf-token-generator.py   # main script
input.txt               # cookie input file
README.md               # project guide
```

## Notes

- Use only cookies/accounts you are authorized to test
- A valid Netflix session cookie is required
- If the cookie is invalid or expired, Netflix will return an error instead of an `NFToken`

## Contact

- GitHub: https://github.com/harshitkamboj
- Repository: https://github.com/harshitkamboj/Netflix-NFToken-Generator
- Website: https://harshitkamboj.in
- Discord username: `illuminatis69`
- Discord server: https://discord.gg/DYJFE9nu5X

## Disclaimer

Educational use only. Use only on accounts and cookies you are authorized to test.
