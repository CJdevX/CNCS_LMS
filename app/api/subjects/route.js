import dbConnect from "@/lib/database";
import Subject from "@/models/Subject";
import { NextResponse } from "next/server";

const DEFAULT_SUBJECTS = [
  "Networking",
  "Programming",
];

async function seedDefaultSubjects() {
  const count = await Subject.countDocuments();
  if (count === 0) {
    for (const name of DEFAULT_SUBJECTS) {
      await Subject.updateOne(
        { name },
        { $setOnInsert: { name } },
        { upsert: true }
      );
    }
  }
}

/**
 * GET  /api/subjects  → list all subjects
 * POST /api/subjects  → { name: "..." } → add a new subject
 */
export async function GET() {
  try {
    await dbConnect();
    await seedDefaultSubjects();

    const subjects = await Subject.find({}).sort({ name: 1 }).lean();
    const formatted = subjects.map((sub) => ({
      id: sub._id.toString(),
      name: sub.name,
      created_at: sub.created_at,
    }));

    return NextResponse.json({ success: true, subjects: formatted });
  } catch (error) {
    console.error("[Subjects GET Error]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const name = body?.name?.trim();

    if (!name) {
      return NextResponse.json({ success: false, message: "Subject name is required" }, { status: 400 });
    }

    const subject = await Subject.findOneAndUpdate(
      { name },
      { $setOnInsert: { name } },
      { upsert: true, returnDocument: "after", lean: true }
    );

    return NextResponse.json({
      success: true,
      subject: {
        id: subject._id.toString(),
        name: subject.name,
        created_at: subject.created_at,
      },
    });
  } catch (error) {
    console.error("[Subjects POST Error]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
