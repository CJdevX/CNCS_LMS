import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const chunk = formData.get("chunk");
    const uploadUrl = formData.get("uploadUrl");
    const startStr = formData.get("start");
    const endStr = formData.get("end");
    const totalStr = formData.get("total");
    const mimeType = formData.get("mimeType") || "application/octet-stream";

    if (!chunk || !uploadUrl || startStr === null || endStr === null || !totalStr) {
      return NextResponse.json(
        { success: false, message: "Missing chunk upload parameters (chunk, uploadUrl, start, end, total)." },
        { status: 400 }
      );
    }

    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    const total = parseInt(totalStr, 10);

    const buffer = Buffer.from(await chunk.arrayBuffer());

    // Send chunk to Google / YouTube resumable upload URL with Content-Range header
    const googleRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": buffer.length.toString(),
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Content-Type": mimeType,
      },
      body: buffer,
    });

    // HTTP 308 Resume Incomplete = Chunk received successfully, expect more chunks
    if (googleRes.status === 308) {
      return NextResponse.json({
        success: true,
        status: "incomplete",
        bytesUploaded: end + 1,
      });
    }

    // HTTP 200/201 = Upload finished completely!
    if (googleRes.ok) {
      const resData = await googleRes.json();
      if (!resData.id) {
        return NextResponse.json(
          { success: false, error: "Upload finished but Google returned no file/video ID." },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        status: "complete",
        fileId: resData.id,
      });
    }

    // Handle error responses from Google/YouTube
    const errorText = await googleRes.text();
    console.error("[Chunk Upload Error from Google]", googleRes.status, errorText);
    return NextResponse.json(
      { success: false, error: `Google upload error (${googleRes.status}): ${errorText}` },
      { status: 500 }
    );
  } catch (error) {
    console.error("[API Upload Chunk Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process upload chunk." },
      { status: 500 }
    );
  }
}
