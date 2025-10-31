import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/(auth)/auth';
import { saveModelPricing } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const models = [
      {
        modelName: 'gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        creditsPerRequest: 1,
        category: 'fast' as const,
        description: 'Fast and efficient for most tasks',
        maxTokens: 4096,
      },
      {
        modelName: 'gpt-4',
        displayName: 'GPT-4',
        creditsPerRequest: 5,
        category: 'balanced' as const,
        description: 'Powerful and accurate',
        maxTokens: 8192,
      },
      {
        modelName: 'gpt-4-turbo',
        displayName: 'GPT-4 Turbo',
        creditsPerRequest: 10,
        category: 'advanced' as const,
        description: 'Most capable model with vision',
        maxTokens: 128000,
      },
      {
        modelName: 'claude-3-haiku',
        displayName: 'Claude 3 Haiku',
        creditsPerRequest: 1,
        category: 'fast' as const,
        description: 'Fast and cost-effective',
        maxTokens: 4096,
      },
      {
        modelName: 'claude-3-sonnet',
        displayName: 'Claude 3 Sonnet',
        creditsPerRequest: 5,
        category: 'balanced' as const,
        description: 'Balanced performance',
        maxTokens: 8192,
      },
      {
        modelName: 'claude-3-opus',
        displayName: 'Claude 3 Opus',
        creditsPerRequest: 10,
        category: 'advanced' as const,
        description: 'Most powerful Claude model',
        maxTokens: 200000,
      },
      {
        modelName: 'llama-3-8b',
        displayName: 'Llama 3 8B',
        creditsPerRequest: 1,
        category: 'fast' as const,
        description: 'Open source, fast inference',
        maxTokens: 8192,
      },
      {
        modelName: 'llama-3-70b',
        displayName: 'Llama 3 70B',
        creditsPerRequest: 3,
        category: 'balanced' as const,
        description: 'Open source, high quality',
        maxTokens: 8192,
      },
      {
        modelName: 'mixtral-8x7b',
        displayName: 'Mixtral 8x7B',
        creditsPerRequest: 2,
        category: 'balanced' as const,
        description: 'Mixture of experts',
        maxTokens: 32768,
      },
    ];

    for (const model of models) {
      try {
        await saveModelPricing(model);
      } catch (error) {
        console.log(`Model ${model.modelName} might already exist`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully seeded model pricing',
    });
  } catch (error) {
    console.error('Seed models error:', error);
    return NextResponse.json(
      { error: 'Failed to seed models' },
      { status: 500 }
    );
  }
}
