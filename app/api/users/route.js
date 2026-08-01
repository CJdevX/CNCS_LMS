import dbConnect from "@/lib/database";
import User from "@/models/User";

export async function GET() {
  try {
    await dbConnect();
    const users = await User.find({}, "-password_hash").lean();

    const formattedUsers = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      created_at: u.created_at,
    }));

    return Response.json(formattedUsers);
  } catch (error) {
    console.error("Failed to fetch users:", error);

    return Response.json(
      { error: "Failed to fetch users from the database." },
      { status: 500 }
    );
  }
}
