import { NextResponse } from "next/server";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    return NextResponse.json({
        message: "Google callback reached successfully",
        code: code
    });
}