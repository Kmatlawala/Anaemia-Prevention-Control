# 🔒 Production Security Checklist

## ✅ AWS Security Group Configuration

### CRITICAL: Remove these dangerous rules immediately:
- ❌ MYSQL/Aurora (Port 3306) - REMOVE THIS IMMEDIATELY
- ❌ SSH (Port 22) with 0.0.0.0/0 - Restrict to your IP only

### Required Security Group Rules:
1. ✅ Custom TCP Port 3000 - Source: 0.0.0.0/0 (for API access)
2. ✅ HTTPS Port 443 - Source: 0.0.0.0/0 (for secure connections)
3. ✅ HTTP Port 80 - Source: 0.0.0.0/0 (redirect to HTTPS)
4. ✅ SSH Port 22 - Source: YOUR_IP_ONLY (not 0.0.0.0/0)

## ✅ SSL/HTTPS Setup

### Option 1: Let's Encrypt (Recommended)
```bash
# Install certbot
sudo apt update
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com

# Or for IP-based certificate (less secure)
sudo certbot certonly --standalone --agree-tos --email your@email.com -d 3.80.46.128
```

### Option 2: Self-signed Certificate (Development only)
```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

## ✅ Database Security

### Move to RDS or secure database:
1. Create AWS RDS MySQL instance
2. Update DB_HOST to RDS endpoint
3. Remove direct database access from security group
4. Use strong passwords and enable encryption

## ✅ Server Hardening

### 1. Update system packages:
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Configure firewall (UFW):
```bash
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
```

### 3. Install PM2 for process management:
```bash
npm install -g pm2
pm2 start server.js --name animia-api
pm2 startup
pm2 save
```

## ✅ Environment Variables

1. Copy .env.production to .env
2. Update all placeholder values with real production values
3. Generate strong JWT secret: `openssl rand -base64 32`
4. Set strong database passwords

## ✅ Monitoring & Logging

### Install monitoring tools:
```bash
# Install PM2 monitoring
pm2 install pm2-logrotate
pm2 install pm2-server-monit
```

### Set up log rotation:
```bash
# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## ✅ Backup Strategy

1. Set up automated database backups
2. Configure S3 for backup storage
3. Test restore procedures

## ✅ Testing

### Test your production setup:
```bash
# Test API endpoints
curl -k https://3.80.46.128:3000/
curl -k https://3.80.46.128:3000/api/beneficiaries

# Test rate limiting
for i in {1..10}; do curl -k https://3.80.46.128:3000/; done
```
