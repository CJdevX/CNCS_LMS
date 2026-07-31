import drive from "@/services/drive.service";
import { NextResponse } from "next/server";
import { Readable } from "stream";

export async function GET() {
    return NextResponse.json({
        message: "Upload Test API Endpoint is active. Send a POST request with a 'file' in FormData to upload to Google Drive."
    });
}

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!file) {
            return NextResponse.json({
                success: false,
                message: "No file uploaded"

            });
        }

        const buffer = Buffer.from(
            await file.arrayBuffer()
        );

        const response = await drive.files.create({
            requestBody: {
                name: file.name,
                parents: [
                    process.env.GOOGLE_DRIVE_FOLDER_ID
                ]

            },

            media: {
                mimeType: file.type,
                body: Readable.from(buffer)
            },

            fields: "id,name"

        });

        return NextResponse.json({
            success: true,
            file: response.data
        });

    } catch (error) {
        console.error(error);

        return NextResponse.json({
            success: false,
            error: error.message
        });
    }
}