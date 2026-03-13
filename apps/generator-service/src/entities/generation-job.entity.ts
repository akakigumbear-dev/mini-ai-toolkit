import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { JobStatus, JobType } from '@mini-ai-toolkit/shared-types';

@Entity('generation_jobs')
@Index('idx_jobs_status_created', ['status', 'createdAt'])
@Index('idx_jobs_created_desc', ['createdAt'])
export class GenerationJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ type: 'text', nullable: true })
  enhancedPrompt: string | null;

  @Column({ type: 'varchar', length: 10 })
  type: JobType;

  @Column({ type: 'varchar', length: 20, default: JobStatus.PENDING })
  status: JobStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider: string | null;

  @Column({ type: 'text', nullable: true })
  resultText: string | null;

  @Column({ type: 'text', nullable: true })
  resultImageUrl: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  failedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;
}
