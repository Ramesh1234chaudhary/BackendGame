# Deploy Frontend on Vercel

## Option 1: Push Updated Code First

The .env file has your backend URL, but .env is in .gitignore so it won't be pushed. 

### Step 1: Add Environment Variables in Vercel Dashboard

1. Go to https://vercel.com
2. Click on your **ClientGame** project (or create new from the repo)
3. Go to **Settings** → **Environment Variables**
4. Add these variables:
   - `VITE_API_URL` = `https://backendgame-warl.onrender.com`
   - `VITE_GOOGLE_CLIENT_ID` = `307916202061-t1dl0bfuoige0v040s0dv86vhfvbnttb.apps.googleusercontent.com`
5. Click **Save**

### Step 2: Deploy

1. Go to **Deployments** tab
2. Click **Deploy** (or trigger a new deployment)

---

## Option 2: If You Already Have a Deployment

1. Go to your Vercel project
2. Go to **Settings** → **Environment Variables**
3. Add:
   - `VITE_API_URL` = `https://backendgame-warl.onrender.com`
4. Go to **Deployments**
5. Click the **...** next to latest deployment → **Redeploy**

---

## After Frontend Deploys:

Your frontend will be at something like: `https://clientgame.vercel.app`

Copy this URL and update your Render backend:
1. Go to Render → Your backend → **Environment Variables**
2. Add/Update:
   - `FRONTEND_URL` = Your Vercel URL
3. Redeploy backend

Done! 🎉