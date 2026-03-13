'use client';

import { useEffect, useState, useCallback } from 'react';
import { PromptForm } from '@/components/prompt-form';
import { JobsTable } from '@/components/jobs-table';
import { PreviewPanel } from '@/components/preview-panel';
import { useWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/components/ui/toaster';
import { api } from '@/lib/api';
import { WS_EVENTS } from '@mini-ai-toolkit/shared-types';
import { Wifi, WifiOff } from 'lucide-react';

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

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const { connected, subscribe } = useWebSocket();
  const { addToast } = useToast();

  const fetchJobs = useCallback(async () => {
    try {
      const res = (await api.getGenerations({ limit: '50' })) as {
        data: Job[];
      };
      setJobs(res.data);
    } catch {
      // Silent fail on background refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // WebSocket real-time updates
  useEffect(() => {
    const unsubCreated = subscribe(WS_EVENTS.JOB_CREATED, (data) => {
      const job = data as Job;
      setJobs((prev) => [job, ...prev]);
    });

    const unsubStatus = subscribe(WS_EVENTS.JOB_STATUS, (data) => {
      const updated = data as Job;
      setJobs((prev) =>
        prev.map((j) => (j.id === updated.id ? { ...j, ...updated } : j)),
      );
      setSelectedJob((prev) =>
        prev?.id === updated.id ? { ...prev, ...updated } : prev,
      );
    });

    const unsubCompleted = subscribe(WS_EVENTS.JOB_COMPLETED, (data) => {
      const updated = data as Job;
      setJobs((prev) =>
        prev.map((j) => (j.id === updated.id ? { ...j, ...updated } : j)),
      );
      setSelectedJob((prev) =>
        prev?.id === updated.id ? { ...prev, ...updated } : prev,
      );
      addToast({
        title: 'Generation completed',
        description: `"${updated.prompt?.slice(0, 40)}..." is ready`,
        variant: 'success',
      });
    });

    const unsubFailed = subscribe(WS_EVENTS.JOB_FAILED, (data) => {
      const updated = data as Job;
      setJobs((prev) =>
        prev.map((j) => (j.id === updated.id ? { ...j, ...updated } : j)),
      );
      setSelectedJob((prev) =>
        prev?.id === updated.id ? { ...prev, ...updated } : prev,
      );
      addToast({
        title: 'Generation failed',
        description: updated.errorMessage || 'Unknown error',
        variant: 'destructive',
      });
    });

    return () => {
      unsubCreated();
      unsubStatus();
      unsubCompleted();
      unsubFailed();
    };
  }, [subscribe, addToast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {connected ? (
            <>
              <Wifi className="h-4 w-4 text-emerald-500" />
              <span>Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-destructive" />
              <span>Disconnected</span>
            </>
          )}
        </div>
      </div>

      <PromptForm onJobCreated={fetchJobs} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading jobs...
            </div>
          ) : (
            <JobsTable
              jobs={jobs}
              selectedId={selectedJob?.id}
              onSelect={setSelectedJob}
              onUpdate={fetchJobs}
            />
          )}
        </div>
        <div className="lg:col-span-1">
          <PreviewPanel job={selectedJob} onUpdate={fetchJobs} />
        </div>
      </div>
    </div>
  );
}
