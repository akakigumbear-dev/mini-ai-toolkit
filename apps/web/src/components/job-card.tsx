'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toaster';
import { RefreshCw, X, Clock, Type, Image } from 'lucide-react';
import { useState } from 'react';

interface Job {
  id: string;
  prompt: string;
  enhancedPrompt?: string | null;
  type: string;
  status: string;
  provider?: string | null;
  resultText?: string | null;
  resultImageUrl?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  createdAt: string;
  completedAt?: string | null;
}

interface JobCardProps {
  job: Job;
  onUpdate?: () => void;
}

export function JobCard({ job, onUpdate }: JobCardProps) {
  const { addToast } = useToast();
  const [retrying, setRetrying] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await api.retryGeneration(job.id);
      addToast({ title: 'Retry submitted', variant: 'success' });
      onUpdate?.();
    } catch (error) {
      addToast({
        title: 'Retry failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRetrying(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.cancelGeneration(job.id);
      addToast({ title: 'Job cancelled', variant: 'default' });
      onUpdate?.();
    } catch (error) {
      addToast({
        title: 'Cancel failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {job.type === 'text' ? (
              <Type className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Image className="h-4 w-4 text-muted-foreground" />
            )}
            <StatusBadge status={job.status} />
            {job.retryCount > 0 && (
              <span className="text-xs text-muted-foreground">
                (retry #{job.retryCount})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {timeAgo(job.createdAt)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {job.prompt}
        </p>

        {job.status === 'completed' && job.resultText && (
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm whitespace-pre-wrap line-clamp-6">
              {job.resultText}
            </p>
          </div>
        )}

        {job.status === 'completed' && job.resultImageUrl && (
          <div className="overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={job.resultImageUrl}
              alt={job.prompt}
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>
        )}

        {job.status === 'failed' && job.errorMessage && (
          <div className="rounded-md bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{job.errorMessage}</p>
          </div>
        )}

        {job.provider && (
          <p className="text-xs text-muted-foreground">
            Provider: {job.provider}
          </p>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        {job.status === 'failed' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={retrying}
          >
            <RefreshCw
              className={`mr-1 h-3 w-3 ${retrying ? 'animate-spin' : ''}`}
            />
            Retry
          </Button>
        )}
        {(job.status === 'pending' || job.status === 'queued') && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={cancelling}
          >
            <X className="mr-1 h-3 w-3" />
            Cancel
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
