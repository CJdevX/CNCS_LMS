import db from "@/lib/database";
import { NextResponse } from "next/server";
import crypto from "crypto";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export async function POST(request) {
  try {
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
    const [existing] = await db.execute(
      "SELECT id FROM users WHERE LOWER(email) = ?",
      [cleanEmail]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    // Hash password and insert
    const passwordHash = hashPassword(password);
    const [result] = await db.execute(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [cleanName, cleanEmail, passwordHash]
    );

    const user = {
      id: result.insertId,
      name: cleanName,
      email: cleanEmail,
    };

    // Create session payload and cookie
    const sessionData = JSON.stringify(user);
    const sessionToken = Buffer.from(sessionData).toString("base64");

    const response = NextResponse.json({
      success: true,
      user,
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
