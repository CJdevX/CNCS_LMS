import { google } from "googleapis";
import fs from "fs";
import { Readable } from "stream";

/**
 * Reusable OAuth2 client configuration using project environment variables.
 * Shares the existing Google OAuth credentials across Google services (Drive / YouTube).
 */
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

/**
 * Authenticated YouTube Data API v3 client instance.
 */
export const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
});

export interface UploadVideoOptions {
    title: string;
    description?: string;
    filePath?: string;
    fileStream?: Readable;
    privacyStatus?: "public" | "private" | "unlisted";
    tags?: string[];
}

export interface UploadVideoResult {
    videoId: string;
    videoUrl: string;
    title: string;
}

/**
 * Uploads a video to YouTube using YouTube Data API v3.
 * 
 * @param options Upload options including title, description, file path or stream, privacy status, and tags.
 * @returns Object containing the uploaded YouTube video ID, full URL, and title.
 */
export async function uploadVideo(options: UploadVideoOptions): Promise<UploadVideoResult> {
    const {
        title,
        description = "",
        filePath,
        fileStream,
        privacyStatus = "unlisted",
        tags = []
    } = options;

    let mediaBody: Readable;
    if (fileStream) {
        mediaBody = fileStream;
    } else if (filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Video file not found at path: ${filePath}`);
        }
        mediaBody = fs.createReadStream(filePath);
    } else {
        throw new Error("Either filePath or fileStream must be provided to uploadVideo.");
    }

    const response = await youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
            snippet: {
                title,
                description,
                tags,
                categoryId: "27", // Education category ID
            },
            status: {
                privacyStatus,
                selfDeclaredMadeForKids: false,
            },
        },
        media: {
            body: mediaBody,
        },
    });

    const videoId = response.data.id;
    if (!videoId) {
        throw new Error("YouTube upload succeeded but no video ID was returned.");
    }

    return {
        videoId,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        title: response.data.snippet?.title || title,
    };
}

/**
 * Extract plain 11-character YouTube video ID from a video ID string or full URL.
 */
export function extractYouTubeVideoId(input: string): string {
    if (!input) return "";
    const cleanInput = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanInput)) {
        return cleanInput;
    }
    const match = cleanInput.match(/(?:v=|\/embed\/|\/v\/|youtu\.be\/|\/watch\?v=)([^#&?]*)/);
    return match && match[1] && match[1].length === 11 ? match[1] : cleanInput;
}

/**
 * Deletes a video from YouTube using YouTube Data API v3.
 * 
 * @param videoIdOrUrl The ID or URL of the YouTube video to delete.
 * @returns Promise<boolean> indicating success or failure.
 */
export async function deleteVideo(videoIdOrUrl: string): Promise<boolean> {
    const videoId = extractYouTubeVideoId(videoIdOrUrl);
    if (!videoId) {
        throw new Error("Invalid YouTube video ID.");
    }

    try {
        await youtube.videos.delete({ id: videoId });
        return true;
    } catch (error: any) {
        const errorDetails = error?.response?.data?.error || error?.message || error;
        console.error("[YouTube Delete API Error]", JSON.stringify(errorDetails, null, 2));
        throw error;
    }
}