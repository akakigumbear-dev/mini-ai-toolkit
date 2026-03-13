'use client';

import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toaster';
import { RefreshCw, X, Type, Image } from 'lucide-react';

interface Job {
  id: string;
  prompt: string;
  type: string;
  status: string;
  retryCount: number;
  createdAt: string;
  resultText?: string | null;
  resultImageUrl?: string | null;
  errorMessage?: string | null;
}

interface JobsTableProps {
  jobs: Job[];
  selectedId?: string | null;
  onSelect: (job: Job) => void;
  onUpdate: () => void;
}

export function JobsTable({
  jobs,
  selectedId,
  onSelect,
  onUpdate,
}: JobsTableProps) {
  const { addToast } = useToast();

  const handleRetry = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.retryGeneration(id);
      addToast({ title: 'Retry submitted', variant: 'success' });
      onUpdate();
    } catch (error) {
      addToast({
        title: 'Retry failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.cancelGeneration(id);
      addToast({ title: 'Job cancelled' });
      onUpdate();
    } catch (error) {
      addToast({
        title: 'Cancel failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        No jobs yet. Submit a prompt to get started.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Prompt
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Created
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              onClick={() => onSelect(job)}
              className={`border-b cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedId === job.id ? 'bg-muted' : ''
              }`}
            >
              <td className="px-4 py-3">
                {job.type === 'text' ? (
                  <Type className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Image className="h-4 w-4 text-muted-foreground" />
                )}
              </td>
              <td className="px-4 py-3">
                <p className="text-sm truncate max-w-[300px]">{job.prompt}</p>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={job.status} />
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {new Date(job.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  {job.status === 'failed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handleRetry(e, job.id)}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  )}
                  {(job.status === 'pending' || job.status === 'queued') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handleCancel(e, job.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
