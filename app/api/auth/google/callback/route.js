import { NextResponse } from "next/server";
import { google } from "googleapis";
import fs from "fs";
import path from "path";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:40px;background:#111;color:#f87171;">
          <h2>❌ Google Authorization Denied</h2>
          <p>Error: ${errorParam}</p>
        </body></html>`,
        { headers: { "content-type": "text/html" } }
      );
    }

    if (!code) {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:40px;background:#111;color:#fbbf24;">
          <h2>⚠️ No Authorization Code Found</h2>
          <p>Please open the Google OAuth authorization URL to initiate sign-in.</p>
        </body></html>`,
        { headers: { "content-type": "text/html" } }
      );
    }

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback"
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    const newRefreshToken = tokens.refresh_token;

    if (newRefreshToken) {
      // Automatically update .env file
      const envPath = path.join(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf-8");
        if (envContent.includes("GOOGLE_REFRESH_TOKEN=")) {
          envContent = envContent.replace(
            /GOOGLE_REFRESH_TOKEN=.*/g,
            `GOOGLE_REFRESH_TOKEN=${newRefreshToken}`
          );
        } else {
          envContent += `\nGOOGLE_REFRESH_TOKEN=${newRefreshToken}\n`;
        }
        fs.writeFileSync(envPath, envContent, "utf-8");
      }
    }

    return new NextResponse(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Google OAuth Success</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 520px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          .icon { font-size: 48px; margin-bottom: 16px; }
          h1 { font-size: 22px; margin-bottom: 12px; color: #38bdf8; }
          p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 20px; }
          .token-box { background: #0f172a; border: 1px solid #475569; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; word-break: break-all; color: #4ade80; text-align: left; max-height: 100px; overflow-y: auto; }
          .badge { display: inline-block; background: rgba(74, 222, 128, 0.15); color: #4ade80; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">🎉</div>
          <div class="badge">✓ Full YouTube Upload &amp; Delete Access Granted</div>
          <h1>Google Authorization Successful!</h1>
          <p>${newRefreshToken ? "Your new <strong>GOOGLE_REFRESH_TOKEN</strong> has been automatically updated in your <code>.env</code> file!" : "Access token obtained successfully."}</p>
          ${newRefreshToken ? `<div class="token-box">GOOGLE_REFRESH_TOKEN=${newRefreshToken}</div>` : ""}
          <p style="margin-top: 20px; font-size: 13px; color: #64748b;">You can now close this tab and return to CNCS LMS.</p>
        </div>
      </body>
      </html>`,
      { headers: { "content-type": "text/html" } }
    );

  } catch (err) {
    console.error("[Google Callback OAuth Error]", err);
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;background:#111;color:#f87171;">
        <h2>❌ Token Exchange Failed</h2>
        <p>Error: ${err.message}</p>
        <p>Please try opening the authorization link again.</p>
      </body></html>`,
      { headers: { "content-type": "text/html" } }
    );
  }
}