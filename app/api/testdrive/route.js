import drive from "@/lib/googleDrive";

export async function GET() {
  try {
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder'",
      fields: "files(id, name)",
    });

    return Response.json({
      success: true,
      folders: response.data.files,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: error.message,
    });
  }
}
