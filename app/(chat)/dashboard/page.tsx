'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, TrendingUp, Zap, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
  modelUsed?: string;
}

interface UsageSummary {
  totalCredits: number;
  totalTokens: number;
  totalRequests: number;
  byModel: Record<string, { count: number; credits: number; tokens: number }>;
}

export default function DashboardPage() {
  const [credits, setCredits] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      // Load credits
      const creditsRes = await fetch('/api/credits?action=balance');
      const creditsData = await creditsRes.json();
      setCredits(creditsData.credits);

      // Load transactions
      const transactionsRes = await fetch('/api/credits?action=transactions&limit=10');
      const transactionsData = await transactionsRes.json();
      setTransactions(transactionsData.transactions);

      // Load usage stats
      const usageRes = await fetch('/api/credits?action=usage&days=30');
      const usageData = await usageRes.json();
      setUsageSummary(usageData.summary);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  async function purchaseCredits(amount: number, priceId: string) {
    try {
      setPurchasing(true);
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, credits: amount }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to initiate purchase');
    } finally {
      setPurchasing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      {/* Credit Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Credit Balance
          </CardTitle>
          <CardDescription>Your available credits for AI requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{credits?.toLocaleString() || 0}</div>
          <p className="text-sm text-muted-foreground mt-2">credits remaining</p>
        </CardContent>
      </Card>

      {/* Usage Summary */}
      {usageSummary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageSummary.totalRequests}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageSummary.totalCredits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageSummary.totalTokens.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Purchase Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Purchase Credits
          </CardTitle>
          <CardDescription>Choose a credit package</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <CardDescription>$10</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-4">1,000 Credits</div>
                <Button
                  onClick={() => purchaseCredits(1000, 'price_starter')}
                  disabled={purchasing}
                  className="w-full"
                >
                  {purchasing ? <Loader2 className="animate-spin" /> : 'Purchase'}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <CardDescription>$25 (Best Value)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-4">3,000 Credits</div>
                <Button
                  onClick={() => purchaseCredits(3000, 'price_pro')}
                  disabled={purchasing}
                  className="w-full"
                >
                  {purchasing ? <Loader2 className="animate-spin" /> : 'Purchase'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <CardDescription>$50</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-4">7,000 Credits</div>
                <Button
                  onClick={() => purchaseCredits(7000, 'price_enterprise')}
                  disabled={purchasing}
                  className="w-full"
                >
                  {purchasing ? <Loader2 className="animate-spin" /> : 'Purchase'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Usage by Model */}
      {usageSummary && Object.keys(usageSummary.byModel).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage by Model
            </CardTitle>
            <CardDescription>Last 30 days breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(usageSummary.byModel).map(([model, stats]) => (
                <div key={model} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{model}</div>
                    <div className="text-sm text-muted-foreground">
                      {stats.count} requests
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{stats.credits} credits</div>
                    <div className="text-sm text-muted-foreground">
                      {stats.tokens.toLocaleString()} tokens
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
          <CardDescription>Your latest credit activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            ) : (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <div className="font-medium">
                      {transaction.description || transaction.type}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(transaction.createdAt).toLocaleDateString()} at{' '}
                      {new Date(transaction.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div
                    className={`font-bold ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.amount > 0 ? '+' : ''}
                    {transaction.amount}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
