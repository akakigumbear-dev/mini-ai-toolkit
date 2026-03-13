'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toaster';
import { RefreshCw, X } from 'lucide-react';

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
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  cancelledAt?: string | null;
}

interface PreviewPanelProps {
  job: Job | null;
  onUpdate?: () => void;
}

export function PreviewPanel({ job, onUpdate }: PreviewPanelProps) {
  const { addToast } = useToast();

  if (!job) {
    return (
      <Card className="h-full flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Select a job to preview
        </p>
      </Card>
    );
  }

  const handleRetry = async () => {
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
    }
  };

  const handleCancel = async () => {
    try {
      await api.cancelGeneration(job.id);
      addToast({ title: 'Job cancelled' });
      onUpdate?.();
    } catch (error) {
      addToast({
        title: 'Cancel failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleString() : '-';

  return (
    <Card className="h-full overflow-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Job Details</CardTitle>
          <StatusBadge status={job.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Prompt
          </p>
          <p className="text-sm">{job.prompt}</p>
        </div>

        {job.enhancedPrompt && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Enhanced Prompt
            </p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {job.enhancedPrompt}
            </p>
          </div>
        )}

        {job.resultText && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Result
            </p>
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm whitespace-pre-wrap">{job.resultText}</p>
            </div>
          </div>
        )}

        {job.resultImageUrl && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Generated Image
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={job.resultImageUrl}
              alt={job.prompt}
              className="w-full rounded-md"
            />
          </div>
        )}

        {job.errorMessage && (
          <div>
            <p className="text-xs font-medium text-destructive mb-1">Error</p>
            <p className="text-sm text-destructive">{job.errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Type:</span>{' '}
            <span className="capitalize">{job.type}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Provider:</span>{' '}
            {job.provider || '-'}
          </div>
          <div>
            <span className="text-muted-foreground">Retries:</span>{' '}
            {job.retryCount}
          </div>
          <div>
            <span className="text-muted-foreground">ID:</span>{' '}
            <span className="font-mono">{job.id.slice(0, 8)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span>{' '}
            {formatDate(job.createdAt)}
          </div>
          <div>
            <span className="text-muted-foreground">Completed:</span>{' '}
            {formatDate(job.completedAt)}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {job.status === 'failed' && (
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          )}
          {(job.status === 'pending' || job.status === 'queued') && (
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="mr-1 h-3 w-3" />
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
