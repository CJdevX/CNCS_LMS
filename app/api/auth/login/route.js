import dbConnect from "@/lib/database";
import User from "@/lib/models/User";
import { NextResponse } from "next/server";
import crypto from "crypto";

function verifyPassword(password, storedHash) {
  try {
    const [salt, originalHash] = storedHash.split(":");
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash === originalHash;
  } catch (err) {
    return false;
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const { email, password } = await request.json();

    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const userProfile = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };

    // Create session payload and cookie
    const sessionData = JSON.stringify(userProfile);
    const sessionToken = Buffer.from(sessionData).toString("base64");

    const response = NextResponse.json({
      success: true,
      user: userProfile,
    });

    response.cookies.set("lms_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;

  } catch (error) {
    console.error("[Login Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Login failed." },
      { status: 500 }
    );
  }
}
