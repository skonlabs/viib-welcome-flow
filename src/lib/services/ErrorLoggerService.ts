import { supabase } from "@/integrations/supabase/client";

class ErrorLoggerService {
  async log(error: any, context?: Record<string, any>) {
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      const viibUserId = localStorage.getItem('viib_user_id');

      await supabase.from('system_logs').insert({
        error_message: errorMessage,
        error_stack: errorStack,
        severity: 'error',
        user_id: viibUserId || null,
        context: context || null,
        operation: context?.operation || null,
        screen: window.location.pathname,
        resolved: false
      });

      console.error('Error logged:', errorMessage, context);
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }
}

export const errorLogger = new ErrorLoggerService();
