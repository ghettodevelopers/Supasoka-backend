# 🗄️ SQLite Database Setup for Supasoka

## ✅ What Changed

The backend now uses **SQLite** instead of PostgreSQL, which means:
- ✅ **No PostgreSQL installation required**
- ✅ **Database file stored locally** (`backend/dev.db`)
- ✅ **All data persists** across server restarts
- ✅ **Full CRUD operations** work for all features
- ✅ **Easy to deploy** - just one file
- ✅ **Perfect for development** and small-scale production

## 🚀 Quick Setup

### 1. **Navigate to Backend Directory**
```bash
cd c:\Users\ayoub\Supasoka\backend
```

### 2. **Run Setup Script**
```bash
npm run setup
```

This will:
- ✅ Update `.env` to use SQLite
- ✅ Generate Prisma Client
- ✅ Create SQLite database (`dev.db`)
- ✅ Run all migrations

### 3. **Start the Server**
```bash
npm start
```

## 📦 What's Included

### Database File:
- **Location**: `backend/dev.db`
- **Type**: SQLite database
- **Size**: Starts at ~100KB, grows with data
- **Portable**: Can be copied/backed up easily

### All Features Work:
- ✅ **Users**: Full user management
- ✅ **Channels**: Create, update, delete channels
- ✅ **Carousel**: Image management with CRUD
- ✅ **Categories**: Category management
- ✅ **Notifications**: Real-time notifications
- ✅ **Watch History**: User watch tracking
- ✅ **Subscriptions**: Payment and subscription tracking
- ✅ **Admin**: Full admin panel functionality

## 🔧 Manual Setup (if needed)

If the automatic setup fails, run these commands manually:

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Create database and run migrations
npx prisma migrate dev --name init

# 3. (Optional) Open Prisma Studio to view data
npx prisma studio
```

## 📊 Database Management

### View Database with Prisma Studio:
```bash
npm run studio
```
Opens a web interface at `http://localhost:5555` to view/edit data.

### Reset Database:
```bash
# Delete the database file
rm dev.db

# Run setup again
npm run setup
```

### Backup Database:
```bash
# Simple copy
cp dev.db dev.db.backup

# Or with timestamp
cp dev.db dev.db.$(date +%Y%m%d_%H%M%S)
```

## 🌐 Production Deployment

### For Render.com:

1. **SQLite works on Render.com** but data is ephemeral (resets on redeploy)
2. **For persistent data**, use Render's PostgreSQL addon
3. **To switch back to PostgreSQL**:
   ```bash
   # Update schema.prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   
   # Update .env
   DATABASE_URL="your-postgresql-connection-string"
   
   # Run migrations
   npx prisma migrate deploy
   ```

### For Local Production:
SQLite is perfect! Just:
1. Keep `dev.db` file backed up
2. Use `npm start` to run the server
3. Database persists across restarts

## 🔄 Migration Commands

### Create New Migration:
```bash
npx prisma migrate dev --name your_migration_name
```

### Apply Migrations (Production):
```bash
npx prisma migrate deploy
```

### Reset Database:
```bash
npx prisma migrate reset
```

## 📝 Configuration Files Updated

### 1. **`prisma/schema.prisma`**
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

### 2. **`.env`**
```env
DATABASE_URL="file:./dev.db"
```

### 3. **`package.json`**
```json
{
  "scripts": {
    "setup": "node scripts/setup-sqlite.js",
    "migrate:dev": "npx prisma migrate dev"
  }
}
```

## ✅ Verification

After setup, verify everything works:

### 1. **Check Database File Exists**
```bash
ls -lh dev.db
```

### 2. **Test API Endpoints**
```bash
# Health check
curl http://localhost:10000/health

# Test admin login
curl -X POST http://localhost:10000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Ghettodevelopers@gmail.com","password":"Chundabadi"}'
```

### 3. **Check Logs**
Server should show:
```
✅ Database connected successfully
🚀 Server running on http://0.0.0.0:10000
```

## 🎯 Benefits of SQLite

### Development:
- ✅ **Zero Configuration**: No database server to install
- ✅ **Fast Setup**: Database ready in seconds
- ✅ **Easy Debugging**: Single file to inspect
- ✅ **Portable**: Copy database file anywhere

### Production (Small Scale):
- ✅ **Low Resource Usage**: Minimal memory/CPU
- ✅ **Fast Queries**: Excellent for < 100K records
- ✅ **Simple Backup**: Just copy one file
- ✅ **No Maintenance**: No database server to manage

### Limitations:
- ⚠️ **Concurrent Writes**: Limited (but fine for AdminSupa)
- ⚠️ **Large Scale**: For 100K+ users, use PostgreSQL
- ⚠️ **Render.com**: Data resets on redeploy (use PostgreSQL for production)

## 🔧 Troubleshooting

### Error: "Can't reach database server"
```bash
# Delete database and recreate
rm dev.db
npm run setup
```

### Error: "Migration failed"
```bash
# Reset migrations
npx prisma migrate reset
npx prisma migrate dev --name init
```

### Error: "Prisma Client not generated"
```bash
npx prisma generate
```

### Database Locked Error:
```bash
# Close Prisma Studio if open
# Restart the server
npm start
```

## 📚 Resources

- **Prisma SQLite Docs**: https://www.prisma.io/docs/concepts/database-connectors/sqlite
- **SQLite Official**: https://www.sqlite.org/
- **Prisma Migrate**: https://www.prisma.io/docs/concepts/components/prisma-migrate

## 🎉 Summary

**SQLite is now configured and ready!**

- ✅ No PostgreSQL needed
- ✅ All features work perfectly
- ✅ Data persists across restarts
- ✅ AdminSupa fully functional
- ✅ Easy to backup and restore
- ✅ Perfect for development and testing

**Just run `npm run setup` and you're good to go!** 🚀
