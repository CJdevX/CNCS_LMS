import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("lms_session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const sessionData = Buffer.from(sessionToken, "base64").toString("utf-8");
    const user = JSON.parse(sessionData);

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }
}
