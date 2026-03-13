'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toaster';
import { Loader2, Send } from 'lucide-react';

interface PromptFormProps {
  onJobCreated?: () => void;
}

export function PromptForm({ onJobCreated }: PromptFormProps) {
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState<'text' | 'image'>('text');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = prompt.trim();
    if (!trimmed) {
      addToast({ title: 'Prompt is required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await api.createGeneration({ prompt: trimmed, type });
      addToast({ title: 'Generation started', variant: 'success' });
      setPrompt('');
      onJobCreated?.();
    } catch (error) {
      addToast({
        title: 'Failed to submit',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Generation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Enter your prompt..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            maxLength={2000}
            disabled={loading}
          />
          <div className="flex items-center gap-3">
            <Select
              value={type}
              onValueChange={(v) => setType(v as 'text' | 'image')}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Image</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={loading || !prompt.trim()}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Generate
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              {prompt.length}/2000
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
