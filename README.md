# 🎓 CNCS LMS (Learning Management System)

A modern Learning Management System built with **Next.js**, **TypeScript**, **MySQL**, **Google Drive API**, and **YouTube Data API v3**. This platform allows seamless management of educational content, automated video processing/hosting on YouTube, and secure file storage via Google Drive.

---

## 📋 Table of Contents

- [Prerequisites](#-prerequisites)
- [Step-by-Step Installation & Setup](#-step-by-step-installation--setup)
  - [Step 1: Clone the Repository](#step-1-clone-the-repository)
  - [Step 2: Install Dependencies](#step-2-install-dependencies)
  - [Step 3: Setup MySQL Database](#step-3-setup-mysql-database)
  - [Step 4: Create Gmail & YouTube Channel](#step-4-create-gmail--youtube-channel)
  - [Step 5: Setup Google Cloud Console Credentials](#step-5-setup-google-cloud-console-credentials)
  - [Step 6: Configure Environment Variables (`.env`)](#step-6-configure-environment-variables-env)
  - [Step 7: Generate Google OAuth Refresh Token](#step-7-generate-google-oauth-refresh-token)
  - [Step 8: Run the Development Server](#step-8-run-the-development-server)
- [Available Scripts](#-available-scripts)
- [Tech Stack](#-tech-stack)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed and set up on your machine:

1. **Node.js**: `v18.x` or higher (Download from [nodejs.org](https://nodejs.org/))
2. **Package Manager**: `npm` (comes with Node.js), `yarn`, `pnpm`, or `bun`
3. **MySQL Server**: Local installation (MySQL Workbench, XAMPP, or MariaDB) or a hosted cloud database
4. **Google Account**: A active Gmail account
5. **YouTube Channel**: A YouTube channel attached to your Google Account (required for video upload APIs)

---

## 🚀 Step-by-Step Installation & Setup

Follow these steps in order to get the project up and running smoothly.

### Step 1: Clone the Repository

Open your terminal or command prompt and clone the project repository:

```bash
git clone https://github.com/your-username/cncs_lms.git
cd cncs_lms
```

---

### Step 2: Install Dependencies

Run the package manager to install all required dependencies listed in `package.json`:

```bash
npm install
```

---

### Step 3: Setup MySQL Database

1. Start your local **MySQL Server** (e.g., via XAMPP Control Panel or MySQL Service).
2. Open your MySQL client (MySQL Workbench, phpMyAdmin, or terminal) and create a database:

```sql
CREATE DATABASE cncs_lms;
```

3. Keep your database connection details handy (`host`, `user`, `password`, `database name`).

---

### Step 4: Create Gmail & YouTube Channel

1. **Create a Gmail Account**: If you don't have one, create a Google Account at [accounts.google.com](https://accounts.google.com).
2. **Create a YouTube Channel** *(CRITICAL STEP)*:
   - Go to [YouTube](https://www.youtube.com).
   - Sign in with your Google account.
   - Click on your profile icon in the top right corner and click **Create a Channel**.
   - Follow the prompt to complete setting up your channel.
   > ⚠️ **Note**: YouTube Data API v3 **will fail with an error** when uploading videos if your Google account does not have a YouTube Channel created.

---

### Step 5: Setup Google Cloud Console Credentials

To enable Google Drive storage and YouTube video uploads, you need OAuth 2.0 credentials from Google Cloud Console:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click on the project dropdown at the top and select **New Project**. Name it `CNCS LMS` and click **Create**.
3. **Enable APIs**:
   - In the left sidebar, navigate to **APIs & Services** > **Library**.
   - Search for **Google Drive API**, click on it, and click **Enable**.
   - Search for **YouTube Data API v3**, click on it, and click **Enable**.
4. **Configure OAuth Consent Screen**:
   - Go to **APIs & Services** > **OAuth consent screen**.
   - Select User Type: **External**, then click **Create**.
   - Fill in App Information (App name, User support email, Developer contact email).
   - Click **Save and Continue** through Scopes.
   - Under **Test users**, add your Gmail address (the one used for YouTube).
   - Click **Save and Continue**.
5. **Create OAuth 2.0 Client ID**:
   - Go to **APIs & Services** > **Credentials**.
   - Click **+ Create Credentials** > **OAuth client ID**.
   - Select Application type: **Web application**.
   - Set Name: `CNCS LMS Local`.
   - Add **Authorized redirect URIs**:
     ```text
     http://localhost:3000/api/auth/google/callback
     ```
   - Click **Create**.
   - Copy your **Client ID** and **Client Secret**.

---

### Step 6: Configure Environment Variables (`.env`)

Create a `.env` file in the root directory of the project:

```bash
touch .env
```

Paste the following variables into your `.env` file and replace the placeholder values with your actual credentials:

```env
# MySQL Database Configuration
DB_HOST="localhost"
DB_USER="root"
DB_PASSWORD="your_mysql_password"
DB_NAME="cncs_lms"

# Google Cloud OAuth Credentials
GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"

# Google OAuth Refresh Token (Generated in Step 7)
GOOGLE_REFRESH_TOKEN=""

# YouTube Configuration
YOUTUBE_PRIVACY_STATUS="unlisted" # Options: public | private | unlisted
YOUTUBE_VIDEO_SIZE_MB=10
```

---

### Step 7: Generate Google OAuth Refresh Token

The project includes an automated script to retrieve and automatically save your Google OAuth Refresh Token to `.env`.

1. Run the token generation script:

```bash
npm run get-token
```

2. Open the printed authorization URL in your web browser.
3. Sign in with your Google account and click **Continue** / **Allow**.
4. Upon granting permissions, Google will redirect to your callback URL, and the script (or Next.js server) will **automatically save `GOOGLE_REFRESH_TOKEN` into your `.env` file**!

---

### Step 8: Run the Development Server

Now you are ready to start the application!

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 📜 Available Scripts

In the project directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the development server at `http://localhost:3000` |
| `npm run build` | Builds the application for production |
| `npm run start` | Starts the production server |
| `npm run get-token` | Runs interactive OAuth CLI tool to fetch `GOOGLE_REFRESH_TOKEN` |
| `npm run lint` | Runs ESLint to check for code style issues |

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Frontend**: [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/)
- **Database**: MySQL (`mysql2`)
- **APIs & Cloud Integrations**:
  - Google Drive API (`googleapis`)
  - YouTube Data API v3 (`googleapis`)
  - File Uploads (`multer`)
- **Language**: TypeScript

---

## ❓ Troubleshooting & FAQs

### 1. Error: `channelNotFound` or YouTube API Upload Failed
- **Cause**: The Google account used to generate the refresh token does not have an active YouTube channel created.
- **Solution**: Go to [YouTube](https://www.youtube.com), click your profile icon, click **Create a Channel**, complete the quick setup, and then re-run `npm run get-token`.

### 2. Error: `invalid_grant` or Refresh Token expired
- **Cause**: Google OAuth refresh token was revoked or expired (happens if the OAuth Consent Screen status is set to "Testing" and 7 days pass).
- **Solution**: Re-run `npm run get-token`, complete browser authorization, and update `GOOGLE_REFRESH_TOKEN` in `.env`.

### 3. Database Connection Error (`ECONNREFUSED` / `ER_ACCESS_DENIED_ERROR`)
- **Cause**: MySQL server is not running or credentials in `.env` are incorrect.
- **Solution**: Ensure your MySQL service is started and verify `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in `.env`.

---

✨ **Happy Coding!** If you encounter any issues, feel free to open an issue or reach out to the project maintainers.
