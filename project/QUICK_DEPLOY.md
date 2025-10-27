# 🚀 Quick Deploy Commands

## 1️⃣ Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

## 2️⃣ Deploy Backend (Render.com)
- Go to: https://render.com/
- New → Web Service
- Connect GitHub repo
- Root: `server`
- Build: `npm install && npm run build`
- Start: `npm start`

**Environment Variables:**
```
NODE_ENV=production
MONGODB_URI=<your-atlas-connection-string>
JWT_SECRET=<32-char-random-string>
CORS_ORIGIN=<your-vercel-url>
```

## 3️⃣ Deploy Frontend (Vercel.com)
- Go to: https://vercel.com/
- New Project
- Import GitHub repo
- Framework: Vite

**Environment Variables:**
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-key>
VITE_API_URL=<your-render-backend-url>
```

## 4️⃣ Done! 🎉
Your app is live at: `https://your-project.vercel.app`
