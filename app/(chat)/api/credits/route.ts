import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/(auth)/auth';
import {
  getUserCredits,
  getCreditTransactions,
  getUsageStats,
} from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'balance': {
        const credits = await getUserCredits({ userId: session.user.id });
        return NextResponse.json({ credits });
      }

      case 'transactions': {
        const limit = parseInt(searchParams.get('limit') || '50');
        const transactions = await getCreditTransactions({
          userId: session.user.id,
          limit,
        });
        return NextResponse.json({ transactions });
      }

      case 'usage': {
        const days = parseInt(searchParams.get('days') || '30');
        const usage = await getUsageStats({
          userId: session.user.id,
          days,
        });

        // Calculate summary statistics
        const totalCredits = usage.reduce(
          (sum, log) => sum + log.creditsCharged,
          0
        );
        const totalTokens = usage.reduce(
          (sum, log) => sum + (log.tokensTotal || 0),
          0
        );
        const byModel = usage.reduce(
          (acc, log) => {
            if (!acc[log.modelUsed]) {
              acc[log.modelUsed] = {
                count: 0,
                credits: 0,
                tokens: 0,
              };
            }
            acc[log.modelUsed].count++;
            acc[log.modelUsed].credits += log.creditsCharged;
            acc[log.modelUsed].tokens += log.tokensTotal || 0;
            return acc;
          },
          {} as Record<string, { count: number; credits: number; tokens: number }>
        );

        return NextResponse.json({
          usage,
          summary: {
            totalCredits,
            totalTokens,
            totalRequests: usage.length,
            byModel,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Credits API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
