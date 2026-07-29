import db from '@/lib/database';

export async function GET() {
  try {
    const [rows] = await db.query('SELECT * FROM users');
    
    return Response.json(rows);

  } catch (error) {
    console.error('Failed to fetch users:', error);

    return Response.json(
      { error: 'Failed to fetch users from the database.' },
      { status: 500 }
    );
  }
}
