import { Badge } from '@/components/ui/badge';
import { type VariantProps } from 'class-variance-authority';
import { badgeVariants } from '@/components/ui/badge';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  queued: { label: 'Queued', variant: 'outline' },
  generating: { label: 'Generating', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    variant: 'secondary' as BadgeVariant,
  };

  return (
    <Badge variant={config.variant} className="capitalize">
      {status === 'generating' && (
        <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
      )}
      {config.label}
    </Badge>
  );
}
