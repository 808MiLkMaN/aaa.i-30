'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface Model {
  id: string;
  modelName: string;
  displayName: string;
  creditsPerRequest: number;
  category: 'fast' | 'balanced' | 'advanced' | 'custom';
  description?: string;
  maxTokens?: number;
}

interface ModelSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function ModelSelector({
  value,
  onValueChange,
  disabled,
}: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCredits, setUserCredits] = useState<number>(0);

  useEffect(() => {
    loadModels();
    loadCredits();
  }, []);

  async function loadModels() {
    try {
      const response = await fetch('/api/models');
      const data = await response.json();
      setModels(data.models || []);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCredits() {
    try {
      const response = await fetch('/api/credits?action=balance');
      const data = await response.json();
      setUserCredits(data.credits || 0);
    } catch (error) {
      console.error('Failed to load credits:', error);
    }
  }

  const groupedModels = models.reduce(
    (acc, model) => {
      if (!acc[model.category]) {
        acc[model.category] = [];
      }
      acc[model.category].push(model);
      return acc;
    },
    {} as Record<string, Model[]>
  );

  const categoryLabels = {
    fast: 'Fast Models',
    balanced: 'Balanced Models',
    advanced: 'Advanced Models',
    custom: 'Custom Models',
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading models...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(groupedModels).map(([category, categoryModels]) => (
            <SelectGroup key={category}>
              <SelectLabel>
                {categoryLabels[category as keyof typeof categoryLabels]}
              </SelectLabel>
              {categoryModels.map((model) => {
                const canAfford = userCredits >= model.creditsPerRequest;
                return (
                  <SelectItem
                    key={model.modelName}
                    value={model.modelName}
                    disabled={!canAfford}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{model.displayName}</span>
                      <Badge
                        variant={canAfford ? 'secondary' : 'destructive'}
                        className="ml-2"
                      >
                        {model.creditsPerRequest} credits
                      </Badge>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <div className="text-sm text-muted-foreground">
        Balance: <strong>{userCredits}</strong> credits
      </div>
    </div>
  );
}
