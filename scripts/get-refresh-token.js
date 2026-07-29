// Dev-only script. Run once via `npm run get-token` to obtain GOOGLE_REFRESH_TOKEN.
// Not part of the application — do not import or call this from app code.
require("dotenv").config({ path: ".env" });

const { google } = require("googleapis");
const readline = require("readline");

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3000/api/auth/google/callback"
);

const scopes = [
    "https://www.googleapis.com/auth/drive"
];

const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent"
});

console.log("\nOpen this URL in your browser:\n");
console.log(authUrl);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question(
    "\nPaste the authorization code here: ",
    async (code) => {
        const { tokens } = await oauth2Client.getToken(code);

        console.log("\nTokens:");
        console.log(tokens);

        rl.close();
    }
);