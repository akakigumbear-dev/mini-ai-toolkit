'use client';

import { useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { JobCard } from '@/components/job-card';
import { api } from '@/lib/api';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

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

interface PaginatedResponse {
  data: Job[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 12, totalPages: 0 });
  const [status, setStatus] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await api.getGenerations({
        page: String(meta.page),
        limit: String(meta.limit),
        status: status || undefined,
        type: type || undefined,
        search: search || undefined,
      })) as PaginatedResponse;
      setJobs(res.data);
      setMeta(res.meta);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.limit, status, type, search]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key: 'status' | 'type', value: string) => {
    if (key === 'status') setStatus(value === 'all' ? '' : value);
    if (key === 'type') setType(value === 'all' ? '' : value);
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Generation History</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8 w-[250px]"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <Select
          value={status || 'all'}
          onValueChange={(v) => handleFilterChange('status', v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="generating">Generating</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={type || 'all'}
          onValueChange={(v) => handleFilterChange('type', v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="image">Image</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {meta.total} total jobs
        </span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading...
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          No jobs found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onUpdate={fetchJobs} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => setMeta((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page >= meta.totalPages}
            onClick={() => setMeta((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
