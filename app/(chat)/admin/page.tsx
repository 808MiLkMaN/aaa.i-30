'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Database } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [creditAmount, setCreditAmount] = useState('');

  async function grantCredits() {
    if (!userEmail || !creditAmount) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/grant-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          amount: parseInt(creditAmount),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(`Granted ${creditAmount} credits to ${userEmail}`);
        setUserEmail('');
        setCreditAmount('');
      } else {
        toast.error(data.error || 'Failed to grant credits');
      }
    } catch (error) {
      console.error('Grant credits error:', error);
      toast.error('Failed to grant credits');
    } finally {
      setLoading(false);
    }
  }

  async function seedModels() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/seed-models', {
        method: 'POST',
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Successfully seeded model pricing');
      } else {
        toast.error(data.error || 'Failed to seed models');
      }
    } catch (error) {
      console.error('Seed models error:', error);
      toast.error('Failed to seed models');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
      </div>

      {/* Grant Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Grant Credits to User
          </CardTitle>
          <CardDescription>Manually add credits to a user account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userEmail">User Email</Label>
            <Input
              id="userEmail"
              type="email"
              placeholder="user@example.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="creditAmount">Credit Amount</Label>
            <Input
              id="creditAmount"
              type="number"
              placeholder="1000"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
            />
          </div>
          <Button onClick={grantCredits} disabled={loading} className="w-full">
            {loading ? <Loader2 className="animate-spin" /> : 'Grant Credits'}
          </Button>
        </CardContent>
      </Card>

      {/* Seed Models */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Management
          </CardTitle>
          <CardDescription>Initialize or update model pricing</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={seedModels} disabled={loading} className="w-full">
            {loading ? <Loader2 className="animate-spin" /> : 'Seed Model Pricing'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
