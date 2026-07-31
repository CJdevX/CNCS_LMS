require("dotenv").config({ path: ".env" });

const { google } = require("googleapis");
const http = require("http");
const fs = require("fs");
const path = require("path");

const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";
let port = 3000;
let pathname = "/api/auth/google/callback";

try {
  const urlObj = new URL(redirectUri);
  port = parseInt(urlObj.port || "3000", 10);
  pathname = urlObj.pathname;
} catch (e) {
  // fallback to defaults
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);

const scopes = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/youtube"
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: scopes,
  prompt: "consent"
});

console.log("\n==================================================================");
console.log("🔗 Open the following URL in your browser to authorize:\n");
console.log(authUrl);
console.log("==================================================================\n");

function updateEnv(refreshToken) {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf-8");
    if (envContent.includes("GOOGLE_REFRESH_TOKEN=")) {
      envContent = envContent.replace(
        /GOOGLE_REFRESH_TOKEN=.*/g,
        `GOOGLE_REFRESH_TOKEN=${refreshToken}`
      );
    } else {
      envContent += `\nGOOGLE_REFRESH_TOKEN=${refreshToken}\n`;
    }
    fs.writeFileSync(envPath, envContent, "utf-8");
    console.log("🎉 GOOGLE_REFRESH_TOKEN has been automatically saved to your .env file!\n");
  } else {
    console.log("⚠️ .env file not found, here is your refresh token:\n");
    console.log(refreshToken);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    if (reqUrl.pathname === pathname) {
      const code = reqUrl.searchParams.get("code");
      const errorParam = reqUrl.searchParams.get("error");

      if (errorParam) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<h2>❌ Authorization Denied: ${errorParam}</h2>`);
        server.close();
        return;
      }

      if (code) {
        console.log("⏳ Exchanging authorization code for refresh token...");
        const { tokens } = await oauth2Client.getToken(code);

        if (tokens.refresh_token) {
          updateEnv(tokens.refresh_token);
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head><title>OAuth Success</title></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
              <div style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; text-align: center; max-width: 480px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
                <h1 style="color: #38bdf8; margin-top: 0;">Google OAuth Success!</h1>
                <p style="color: #94a3b8; line-height: 1.6;">Your <strong>GOOGLE_REFRESH_TOKEN</strong> has been automatically updated in your <code>.env</code> file.</p>
                <p style="color: #64748b; font-size: 14px;">You can close this browser tab now.</p>
              </div>
            </body>
            </html>
          `);
        } else {
          console.log("⚠️ No refresh token returned because prompt consent was skipped.");
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h2>⚠️ Access token received, but no refresh token was returned.</h2>");
        }

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1000);
      }
    }
  } catch (err) {
    console.error("❌ Error processing authorization:", err.message);
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h2>❌ Token Exchange Error: ${err.message}</h2>`);
    server.close();
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`ℹ️ Next.js dev server is running on port ${port}.`);
    console.log("👉 Simply click/open the URL above in your browser — Next.js will handle the callback and automatically update your .env file!\n");
  } else {
    console.error("❌ Listener error:", err.message);
  }
});

server.listen(port, () => {
  console.log(`📡 Listening for callback on http://localhost:${port}...`);
  console.log("   Open the URL in your browser and authorize. The script will automatically save your token and exit.\n");
});