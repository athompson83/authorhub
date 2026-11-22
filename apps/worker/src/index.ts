import { z } from 'zod';

export const workerEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type WorkerEnvironment = z.infer<typeof workerEnvironmentSchema>;

export interface DurableJob<TPayload = unknown> {
  id: string;
  kind: string;
  payload: TPayload;
  attempts: number;
}

export type JobHandler<TPayload = unknown, TResult = unknown> = (
  job: DurableJob<TPayload>,
) => Promise<TResult>;

export function readWorkerEnvironment(environment: NodeJS.ProcessEnv = process.env): WorkerEnvironment {
  return workerEnvironmentSchema.parse(environment);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  readWorkerEnvironment();
  console.log('AuthorHub worker runtime is configured. Job polling is introduced with the first long-running subsystem.');
}
