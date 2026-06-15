# AVPass: Employee ID Generator & Verification System

AVPass is a modern React, TypeScript, and Vite-based Employee ID generation and verification platform. It integrates with an external HRIS API to verify employee statuses, generate secure hashed QR codes for ID cards, and manage ID requests and templates.

---

## 🚀 Getting Started

Follow these steps to set up and run AVPass locally on your development machine.

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+ recommended)
- `npm` (comes with Node.js)

### 1. Clone & Install Dependencies

Clone the repository and install the required npm packages (which cover both the Vite frontend and Express backend dependencies):

```bash
# Install dependencies
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory of the project. This file is required by the backend server to communicate with the HRIS API and sign secure tokens.

```env
# Server Configuration
PORT=3000
JWT_SECRET=your_jwt_secret_here
HASH_SECRET=avpass-secure-secret-key-change-me

# HRIS API Integration
HRIS_URL=https://api.avegabros.org/website/auth-login
HRIS_API_KEY=your_hris_api_key_here
HRIS_USERNAME=your_hris_username_here
HRIS_PASSWORD=your_hris_password_here
```

> [!WARNING]
> Keep the `HASH_SECRET` secure and unchanged once deployed. Changing the secret will invalidate all existing printed QR codes as employee verification URLs rely on this cryptographic hash.

### 3. Start the Application

AVPass runs as a split-architecture app. You will need to start both the backend server and the frontend development server.

#### Option A: Start both concurrently (recommended)
Open two terminal windows/tabs:

* **Terminal 1: Start Backend Server**
  ```bash
  node backend/server.js
  ```
  *The backend will boot up on `http://localhost:3000` (or your configured `PORT`), seed local JSON databases if they don't exist, and sync the HRIS employee cache.*

* **Terminal 2: Start Frontend Development Server**
  ```bash
  npm run dev
  ```
  *The frontend Vite server will start, typically on `http://localhost:5173`. It automatically proxies `/api` and `/images` requests to the port 3000 backend.*

#### Option B: Run with Docker (Recommended for local testing & matching staging)
Ensure you have Docker and Docker Compose installed:

```bash
# Start both containers (frontend on :8001, backend on :3000)
docker compose up -d --build
```
*   **Frontend web page:** accessible at `http://localhost:8001`
*   **Backend API:** accessible at `http://localhost:3000`
*   **Database/Images persistence:** mapped to a persistent named docker volume `backend-data` defined in `docker-compose.yml`.

---

## 🔐 Default Credentials

When running the application for the first time, a default administrator account is seeded automatically into `backend/data/users.json`:

* **Username:** `admin`
* **Password:** `admin123`

You can log in to the admin panel with these credentials and manage user accounts directly from the UI.

---

## 📁 Project Structure

```text
├── backend/
│   ├── data/                 # Local JSON databases (users, templates, requests, etc.)
│   │   └── images/           # Cached employee pictures, logos, and signatures
│   ├── server.js             # Express API server & proxy logic
│   ├── backfill-empcodes.js  # Utility script for employee code migrations
│   └── regenerate-qr.js      # Utility script to regenerate QR codes
├── src/                      # React frontend codebase
│   ├── assets/               # Static frontend resources
│   ├── components/           # Reusable UI components
│   └── ...                   # Pages, hooks, and application logic
├── package.json              # Shared project configurations and dependencies
└── vite.config.ts            # Vite bundler and API proxy configuration
```

---

## 🛠️ Production Deployment (Portainer Git Stack)

AVPass is deployed using **Portainer** by configuring a **Git Repository Stack**. Portainer automatically pulls the latest `docker-compose.yml` and builds the containers directly from the repository.

### Setup in Portainer:

1. **Create a New Stack:**
   - Go to **Stacks** > **Add stack** in your Portainer dashboard.
   - Choose **Repository** under the *Build method*.

2. **Repository Configuration:**
   - **Repository URL:** `https://github.com/avegabros/AVPass.git`
   - **Repository reference:** `refs/heads/main` (or your target branch)
   - **Compose path:** `docker-compose.yml`

3. **Environment Variables:**
   Add the following variables in the Stack environment configuration screen (copying values from your production configuration):
   - `JWT_SECRET`
   - `HASH_SECRET`
   - `HRIS_URL`
   - `HRIS_API_KEY`
   - `HRIS_USERNAME`
   - `HRIS_PASSWORD`
   - `ABAS_URL`
   - `ABAS_API_KEY`
   - `MINIO_ENDPOINT`
   - `MINIO_PORT`
   - `MINIO_USE_SSL`
   - `MINIO_ACCESS_KEY`
   - `MINIO_SECRET_KEY`
   - `MINIO_REGION`
   - `MINIO_PUBLIC_URL`
   - `MINIO_BUCKET`

4. **Deploy the Stack:**
   - Click **Deploy the stack**. Portainer will clone the repository, build both backend and frontend images, map the persistent volume, and expose the services.


