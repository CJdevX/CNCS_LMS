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
      return NextResponse.json(
        {
          success: false,
          error: `Google Authorization Denied: ${errorParam}`,
        },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: "No authorization code found in request query parameters.",
        },
        { status: 400 }
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
      // Automatically update local .env file if available
      try {
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
      } catch (envErr) {
        console.warn("[Google Callback] Could not update local .env file:", envErr.message);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: newRefreshToken
          ? "Google OAuth tokens retrieved successfully and GOOGLE_REFRESH_TOKEN updated!"
          : "Google OAuth access token retrieved successfully.",
        refresh_token: newRefreshToken || null,
      },
      { status: 200 }
    );

  } catch (err) {
    console.error("[Google Callback OAuth Error]", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to exchange authorization code for tokens.",
      },
      { status: 500 }
    );
  }
}