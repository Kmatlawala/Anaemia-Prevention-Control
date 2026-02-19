#!/bin/bash
# Quick script to upload OTP router to server
# Run this from your local machine

echo "Uploading OTP router to EC2 server..."

scp routes/otp.js ubuntu@3.80.46.128:/home/ubuntu/Animia-back/routes/
scp server.js ubuntu@3.80.46.128:/home/ubuntu/Animia-back/

echo "Files uploaded! Now restart the server:"
echo "ssh ubuntu@3.80.46.128"
echo "pm2 restart animia-api"
echo "pm2 logs animia-api"

