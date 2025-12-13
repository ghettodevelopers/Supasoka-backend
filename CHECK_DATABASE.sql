-- Quick Database Check for Push Notifications
-- Run this in your Render.com PostgreSQL database

-- 1. Check total users
SELECT 
  'Total Users' as check_type,
  COUNT(*) as count
FROM users;

-- 2. Check users with device tokens
SELECT 
  'Users with Device Tokens' as check_type,
  COUNT(*) as count
FROM users
WHERE "deviceToken" IS NOT NULL 
  AND "deviceToken" != '' 
  AND "deviceToken" != 'null' 
  AND "deviceToken" != 'undefined';

-- 3. Check activated users with tokens
SELECT 
  'Activated Users with Tokens' as check_type,
  COUNT(*) as count
FROM users
WHERE "isActivated" = true
  AND "deviceToken" IS NOT NULL 
  AND "deviceToken" != '' 
  AND "deviceToken" != 'null' 
  AND "deviceToken" != 'undefined';

-- 4. Show sample users (first 10)
SELECT 
  id,
  "uniqueUserId",
  "deviceId",
  CASE 
    WHEN "deviceToken" IS NOT NULL THEN LEFT("deviceToken", 30) || '...'
    ELSE 'NO TOKEN'
  END as device_token_preview,
  "isActivated",
  "createdAt"
FROM users
ORDER BY "createdAt" DESC
LIMIT 10;

-- 5. Check recent notifications
SELECT 
  id,
  title,
  message,
  type,
  "sentAt",
  "createdAt"
FROM notifications
ORDER BY "createdAt" DESC
LIMIT 5;
