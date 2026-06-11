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
├── vite.config.ts            # Vite bundler and API proxy configuration
└── deploy.ps1                # PowerShell script for automated remote deployment
```

---

## 🛠️ Production Deployment

To build and package the frontend for production, run:

```bash
npm run build
```

This generates a optimized static output in the `/dist` directory. For automated deployments to production staging servers, you can run the provided PowerShell deploy script (requires configured SSH keys):

```powershell
./deploy.ps1
```

