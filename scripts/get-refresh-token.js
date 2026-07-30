require("dotenv").config({ path: ".env" });

const { google } = require("googleapis");
const readline = require("readline");

const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

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
console.log("1. Open the following URL in your browser:\n");
console.log(authUrl);
console.log("==================================================================\n");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question(
    "2. Paste the authorization code here: ",
    async (code) => {
        try {
            const { tokens } = await oauth2Client.getToken(code.trim());

            console.log("\n🎉 Tokens received successfully!");
            console.log("Refresh Token:\n", tokens.refresh_token);
            
            if (tokens.refresh_token) {
                console.log("\nCopy and paste this refresh_token into your .env file as GOOGLE_REFRESH_TOKEN=");
            } else {
                console.log("\n⚠️ Note: No refresh_token was returned because Google only issues a refresh_token when prompt: 'consent' is accepted.");
            }
        } catch (err) {
            console.error("\n❌ Error exchanging code for tokens:", err.message || err);
        }

        rl.close();
    }
);