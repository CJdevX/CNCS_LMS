import { NextResponse } from "next/server";
import { Readable } from "stream";
import { uploadVideo } from "@/services/youtube.service";

export async function GET() {
    return NextResponse.json({
        message: "YouTube Upload API — POST with FormData: file (video), title, description, privacyStatus, tags",
    });
}

export async function POST(request) {
    try {
        const formData = await request.formData();

        const file          = formData.get("file");
        const title         = formData.get("title");
        const description   = formData.get("description") || "";
        const privacyStatus = formData.get("privacyStatus") || "unlisted";
        const tagsRaw       = formData.get("tags") || "";
        const tags          = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

        // ── Validation ────────────────────────────────────────────────────────
        if (!file) {
            return NextResponse.json(
                { success: false, message: "No video file provided." },
                { status: 400 }
            );
        }

        if (!title || title.trim() === "") {
            return NextResponse.json(
                { success: false, message: "Video title is required." },
                { status: 400 }
            );
        }

        if (!file.type.startsWith("video/")) {
            return NextResponse.json(
                { success: false, message: "Uploaded file must be a video." },
                { status: 400 }
            );
        }

        // ── Convert browser File → Node.js Readable stream ──────────────────
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileStream = Readable.from(buffer);

        // ── Upload to YouTube ─────────────────────────────────────────────────
        const result = await uploadVideo({
            title: title.trim(),
            description,
            fileStream,
            privacyStatus,
            tags,
        });

        return NextResponse.json({
            success: true,
            video: {
                videoId:  result.videoId,
                videoUrl: result.videoUrl,
                title:    result.title,
            },
        });

    } catch (error) {
        console.error("[YouTube Upload Error]", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
