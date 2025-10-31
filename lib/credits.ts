import {
  getUserCredits,
  deductCredits,
  getModelPricingByName,
  logUsage,
} from './db/queries';
import { ChatSDKError } from './errors';

export async function checkAndDeductCredits({
  userId,
  modelName,
  chatId,
}: {
  userId: string;
  modelName: string;
  chatId: string;
}) {
  // Get model pricing
  const pricing = await getModelPricingByName({ modelName });
  
  if (!pricing) {
    // If model not in pricing table, allow it (backward compatibility)
    return { charged: 0, pricing: null };
  }

  // Check user has enough credits
  const userCredits = await getUserCredits({ userId });
  
  if (userCredits < pricing.creditsPerRequest) {
    throw new ChatSDKError(
      'payment_required',
      'Insufficient credits. Please purchase more credits to continue.'
    );
  }

  // Deduct credits
  await deductCredits({
    userId,
    amount: pricing.creditsPerRequest,
    modelUsed: modelName,
    chatId,
  });

  return { charged: pricing.creditsPerRequest, pricing };
}

export async function logModelUsage({
  userId,
  chatId,
  messageId,
  modelUsed,
  creditsCharged,
  tokensInput,
  tokensOutput,
  tokensTotal,
  duration,
  status = 'success',
  errorMessage,
}: {
  userId: string;
  chatId?: string;
  messageId?: string;
  modelUsed: string;
  creditsCharged: number;
  tokensInput?: number;
  tokensOutput?: number;
  tokensTotal?: number;
  duration?: number;
  status?: 'success' | 'error' | 'cancelled';
  errorMessage?: string;
}) {
  await logUsage({
    userId,
    chatId,
    messageId,
    modelUsed,
    creditsCharged,
    tokensInput,
    tokensOutput,
    tokensTotal,
    duration,
    status,
    errorMessage,
  });
}
