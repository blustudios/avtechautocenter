import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Wraps a Supabase mutation in session-aware retry logic.
 * If the call fails due to an auth/session error, it refreshes
 * the session and retries once before surfacing the error.
 */
export async function resilientMutation<T>(
  fn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  const result = await fn();

  if (result.error) {
    const msg = result.error?.message?.toLowerCase() || '';
    const code = result.error?.code || '';
    const isAuthError =
      msg.includes('jwt') ||
      msg.includes('token') ||
      msg.includes('expired') ||
      msg.includes('not authenticated') ||
      msg.includes('refresh_token') ||
      code === 'PGRST301' ||
      code === '401';

    if (isAuthError) {
      toast.info('Sessão expirada. Reconectando...');
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        toast.error('Não foi possível reconectar. Faça login novamente.');
        return result;
      }
      // Retry the original call once
      const retry = await fn();
      if (!retry.error) {
        toast.success('Reconectado com sucesso!');
      }
      return retry;
    }
  }

  return result;
}

/**
 * Same as resilientMutation but for RPC calls that return a single value
 */
export async function resilientRpc<T>(
  fn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  return resilientMutation(fn);
}
