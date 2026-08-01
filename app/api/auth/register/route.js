import dbConnect from "@/lib/database";
import User from "@/models/User";
import { NextResponse } from "next/server";
import crypto from "crypto";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export async function POST(request) {
  try {
    await dbConnect();
    const { name, email, password } = await request.json();

    const cleanName  = name?.trim();
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 4 characters long." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await User.findOne({ email: cleanEmail });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    // Hash password and insert
    const passwordHash = hashPassword(password);
    const newUser = await User.create({
      name: cleanName,
      email: cleanEmail,
      password_hash: passwordHash,
    });

    const userProfile = {
      id: newUser._id.toString(),
      name: cleanName,
      email: cleanEmail,
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
    console.error("[Register Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Registration failed." },
      { status: 500 }
    );
  }
}
