import { NextResponse } from 'next/server';
import { auth } from '@/(auth)/auth';
import { getModelPricing } from '@/lib/db/queries';

export async function GET() {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const models = await getModelPricing();
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Models API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
