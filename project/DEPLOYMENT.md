# 🚀 Deployment Guide - Virtual Book Club

## Prerequisites
- GitHub account
- Vercel account (for frontend)
- Render account (for backend)
- MongoDB Atlas account (for database)

---

## 📦 Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - Virtual Book Club"
git branch -M main
git remote add origin https://github.com/janhavipatil47/fsd-mini-project.git
git push -u origin main
```

---

## 🗄️ Step 2: Deploy MongoDB Atlas

1. Go to https://cloud.mongodb.com/
2. Create a **FREE M0 cluster**
3. **Database Access:**
   - Click "Database Access"
   - Add user: `vbc_prod_user`
   - Set strong password
   - Role: "Read and write to any database"
4. **Network Access:**
   - Click "Network Access"
   - Add IP: `0.0.0.0/0` (Allow from anywhere)
5. **Get Connection String:**
   - Click "Connect" → "Connect your application"
   - Copy connection string:
   ```
   mongodb+srv://vbc_prod_user:<password>@cluster0.xxxxx.mongodb.net/vbc?retryWrites=true&w=majority
   ```
   - Save this for backend deployment!

---

## 🔧 Step 3: Deploy Backend (Render)

### Option A: Via Dashboard (Easier)

1. Go to https://render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `janhavipatil47/fsd-mini-project`
4. Configure:
   - **Name:** `vbc-backend`
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`

5. **Environment Variables** (click "Add Environment Variable"):
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=<your_mongodb_atlas_connection_string>
   JWT_SECRET=<generate_random_secret_min_32_chars>
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   ```

6. Click **"Create Web Service"**
7. Wait for deployment (5-10 minutes)
8. Copy your backend URL: `https://vbc-backend-xxxx.onrender.com`

### Generate JWT Secret:
```bash
# Run this in PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

---

## 🎨 Step 4: Deploy Frontend (Vercel)

1. Go to https://vercel.com/
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository: `janhavipatil47/fsd-mini-project`
4. Configure:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./` (leave as is)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

5. **Environment Variables:**
   ```
   VITE_SUPABASE_URL=<your_supabase_project_url>
   VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
   VITE_API_URL=https://vbc-backend-xxxx.onrender.com
   ```

6. Click **"Deploy"**
7. Wait for deployment (2-3 minutes)
8. Your app is live! 🎉

---

## 🔄 Step 5: Update CORS in Backend

After frontend is deployed, update your backend environment variables on Render:

1. Go to Render dashboard → Your service
2. Navigate to **Environment** tab
3. Update `CORS_ORIGIN`:
   ```
   CORS_ORIGIN=https://your-actual-frontend-url.vercel.app
   ```
4. Save (Render will auto-redeploy)

---

## 🗂️ Step 6: Update Supabase Settings

1. Go to your Supabase project: https://supabase.com/dashboard
2. Go to **Authentication** → **URL Configuration**
3. Add your Vercel URL to:
   - **Site URL:** `https://your-frontend.vercel.app`
   - **Redirect URLs:** `https://your-frontend.vercel.app/**`

---

## ✅ Step 7: Test Your Deployment

1. Visit your Vercel URL
2. Try signing up a new user
3. Check MongoDB Compass:
   - Connect to your Atlas cluster
   - Verify user appears in `vbc.users` collection
4. Try logging in
5. Navigate through the app

---

## 🐛 Troubleshooting

### Backend not connecting to MongoDB:
- Check MongoDB Atlas Network Access (allow 0.0.0.0/0)
- Verify connection string has correct password (no special chars)
- Check Render logs: Dashboard → Service → Logs

### Frontend can't reach backend:
- Verify `VITE_API_URL` has correct Render URL
- Check CORS_ORIGIN in backend matches frontend URL
- Open browser console for errors

### Supabase auth not working:
- Verify Supabase URLs in environment variables
- Check Supabase redirect URLs include your Vercel domain

---

## 📊 Monitoring

### View Backend Logs (Render):
```
Render Dashboard → Your Service → Logs tab
```

### View Frontend Logs (Vercel):
```
Vercel Dashboard → Your Project → Deployments → View Function Logs
```

### MongoDB Compass:
- Use your Atlas connection string
- Monitor users collection in real-time

---

## 🔄 Continuous Deployment

Both Vercel and Render will automatically redeploy when you push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push
```

- **Vercel** redeploys frontend automatically
- **Render** redeploys backend automatically

---

## 💰 Cost

- **MongoDB Atlas M0:** FREE ✅
- **Render Free Tier:** FREE ✅ (spins down after 15 min inactivity)
- **Vercel Hobby:** FREE ✅
- **Supabase Free Tier:** FREE ✅

**Total Cost: $0/month** 🎉

---

## 🎯 Quick Deploy Checklist

- [ ] MongoDB Atlas cluster created
- [ ] GitHub repository pushed
- [ ] Backend deployed on Render
- [ ] Frontend deployed on Vercel
- [ ] Environment variables configured
- [ ] CORS updated with frontend URL
- [ ] Supabase redirect URLs updated
- [ ] Test registration and login
- [ ] Verify data in MongoDB Compass

---

## 📞 Support

If you encounter issues:
1. Check service logs (Render/Vercel)
2. Verify all environment variables
3. Test MongoDB connection with Compass
4. Check browser console for frontend errors

---

**Congratulations! Your Virtual Book Club is now live! 🎉📚**
