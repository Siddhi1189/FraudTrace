# FraudTrace

Deterministic financial graph analysis and multi-entity fraud ring investigation platform. Built on the MERN stack with deterministic topological detectors (cycle, fan-in/fan-out, shared device, pass-through, merchant cash-out), explainable risk scoring, and verified AI investigation briefs.

---

## Deployment

FraudTrace is configured for deployment across two cloud platforms:
- **Backend**: Render (Node.js Web Service)
- **Frontend**: Vercel (Single-Page Application)

### 1. Order of Deployment

1. **Deploy Backend (Render)**:
   - Deploy the backend first to obtain its live production URL (e.g., `https://fraudtrace-api.onrender.com`).
   - Set up MongoDB Atlas and generate your production `JWT_SECRET`.
2. **Deploy Frontend (Vercel)**:
   - Deploy the frontend with `VITE_API_BASE_URL` and `VITE_SOCKET_URL` pointing to the Render backend origin.
   - Note the assigned Vercel production URL (e.g., `https://fraudtrace.vercel.app`).
3. **Configure Backend CORS (Render)**:
   - Add the Vercel URL to the backend's `CORS_ORIGINS` environment variable.
   - Trigger a redeploy of the backend service to apply the CORS policy.

---

### 2. Environment Variables

#### Backend (Render Web Service)

| Variable | Required | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | Node execution environment | `production` |
| `PORT` | Auto | Port set automatically by Render | `10000` (assigned by platform) |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string | `mongodb+srv://<user>:<pwd>@cluster.mongodb.net/fraudtrace` |
| `JWT_SECRET` | Yes | Secret for signing & verifying JWT tokens | Secure random 32+ character string |
| `JWT_EXPIRY` | No | Token lifetime duration | `24h` |
| `CORS_ORIGINS` | Yes | Comma-separated allowed frontend origins (no trailing slashes) | `https://fraudtrace.vercel.app` |
| `GEMINI_API_KEY` | No | Google Gemini API key for AI Copilot (falls back to deterministic engine if empty) | `AIzaSy...` |
| `LLM_MODEL` | No | Gemini model name | `gemini-1.5-flash` |

#### Frontend (Vercel SPA)

| Variable | Required | Description | Format / Example |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | Yes | Backend API origin URL (**without** `/api` suffix) | `https://fraudtrace-api.onrender.com` |
| `VITE_SOCKET_URL` | Yes | Backend Socket.IO origin URL (**without** trailing slash) | `https://fraudtrace-api.onrender.com` |

---

### 3. Build & Start Commands

#### Backend (Render)

- **Root Directory**: `backend`
- **Environment**: `Node`
- **Node Engine**: `>=18` (defined in `backend/package.json`)
- **Build Command**:
  ```bash
  npm install
  ```
- **Start Command**:
  ```bash
  npm start
  ```
  *(Runs `node src/index.js`)*
- **Health Check Path**: `/api/health`
  *(Returns HTTP 200 with database status without crashing on cold starts)*

#### Frontend (Vercel)

- **Root Directory**: `frontend`
- **Framework Preset**: `Vite`
- **Build Command**:
  ```bash
  npm run build
  ```
- **Output Directory**: `dist`
- **Install Command**:
  ```bash
  npm install
  ```
- **Client Routing**: Configured via `frontend/vercel.json` rewrites (`/(.*)` → `/index.html`) to ensure React Router client-side routes refresh seamlessly.

---

### 4. Database Seeding (Optional)

Database seeding never executes automatically in production. To seed baseline demonstration accounts and synthetic transaction clusters, run:

```bash
cd backend
npm run seed
```

Default analyst credentials (configurable via `SEED_ANALYST_*` variables):
- **Email**: `analyst@fraudtrace.local`
- **Password**: `Password123!`
