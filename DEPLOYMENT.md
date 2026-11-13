# EVORA – Deployment Guide

Complete step-by-step instructions to deploy the **EVORA** platform to production for free.

---

## 🌟 Recommended Architecture (100% Free Tier)

* **Database**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Free M0 Sandbox cluster)
* **Backend API**: [Render](https://render.com) (Free Node.js Web Service)
* **Frontend Web App**: [Vercel](https://vercel.com) (Free Fast Global CDN)

---

## Step 1: Database Setup (MongoDB Atlas)

1. Sign up or log into [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a **Free Shared Cluster** (e.g. `evora-cluster`).
3. Under **Security > Database Access**:
   * Create a database user (e.g., `evora_admin`) with a secure password.
4. Under **Security > Network Access**:
   * Click **Add IP Address** $\rightarrow$ select **Allow Access from Anywhere** (`0.0.0.0/0`) so Render and Vercel can connect.
5. Under **Clusters > Connect**:
   * Select **Drivers (Node.js)** and copy your connection string:
     ```
     mongodb+srv://evora_admin:<password>@cluster0.xxxxx.mongodb.net/evora?retryWrites=true&w=majority
     ```
   *(Save this as your `MONGO_URI`)*.

---

## Step 2: Deploy Backend to Render

1. Log into [Render](https://render.com) with your GitHub account.
2. Click **New +** $\rightarrow$ **Web Service**.
3. Select your GitHub repository: `https://github.com/shryithasuddala/Evora`.
4. Configure the Web Service settings:
   * **Name**: `evora-backend`
   * **Root Directory**: `evora-backend`
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
   * **Instance Type**: `Free`
5. Scroll down to **Environment Variables** and add:

   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `10000` | Port assigned by Render |
   | `MONGO_URI` | `mongodb+srv://...` | Your Atlas connection string |
   | `JWT_SECRET` | *(Generate a 32+ character random string)* | Used to sign JWTs |
   | `JWT_EXPIRES_IN` | `7d` | Token expiration |
   | `CLIENT_URL` | `https://your-frontend.vercel.app` | Updated in Step 3 after frontend is deployed |

6. Click **Create Web Service**.
7. Once deployed, note down your backend URL:
   ```
   https://evora-backend-xxxx.onrender.com
   ```
   *(Test health check in browser: `https://evora-backend-xxxx.onrender.com/api/health`)*

---

## Step 3: Deploy Frontend to Vercel

1. Log into [Vercel](https://vercel.com) with your GitHub account.
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your GitHub repository: `https://github.com/shryithasuddala/Evora`.
4. In the project setup screen:
   * **Framework Preset**: `Vite`
   * **Root Directory**: Click *Edit* and select **`evora-frontend`**.
   * **Build and Output Settings**: Defaults are pre-configured:
     * Build Command: `npm run build`
     * Output Directory: `dist`
5. Open **Environment Variables** and add:

   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `VITE_API_URL` | `https://evora-backend-xxxx.onrender.com/api` | Your Render backend URL |

6. Click **Deploy**.
7. In ~60 seconds, your frontend will be live on a `*.vercel.app` domain!
8. *(Final Polish)*: Go back to Render $\rightarrow$ `evora-backend` $\rightarrow$ **Environment** $\rightarrow$ update `CLIENT_URL` with your new Vercel domain.

---

## Step 4: Seed Initial Data (Optional)

To seed demo events, artisan services, and accounts in your production database:
1. Open Render dashboard $\rightarrow$ `evora-backend` $\rightarrow$ **Shell** tab.
2. Run:
   ```bash
   npm run seed
   ```
3. Your database will be populated with initial accounts and services.

---

## Alternative: 1-Click Render Blueprint

The repository includes a [render.yaml](./render.yaml) file.
1. On Render, click **New +** $\rightarrow$ **Blueprint**.
2. Connect `https://github.com/shryithasuddala/Evora`.
3. Render will automatically configure both the backend web service and the frontend static site with client-side rewrite rules.
