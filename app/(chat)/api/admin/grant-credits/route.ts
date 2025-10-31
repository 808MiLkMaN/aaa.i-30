import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/(auth)/auth';
import { getUser, addCredits } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, amount } = body;

    if (!email || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid email or amount' },
        { status: 400 }
      );
    }

    const users = await getUser(email);
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    await addCredits({
      userId: user.id,
      amount,
      type: 'admin_grant',
      description: `Admin granted ${amount} credits`,
    });

    return NextResponse.json({
      success: true,
      message: `Granted ${amount} credits to ${email}`,
    });
  } catch (error) {
    console.error('Grant credits error:', error);
    return NextResponse.json(
      { error: 'Failed to grant credits' },
      { status: 500 }
    );
  }
}
