import { supabase } from "@/integrations/supabase/client";

interface LogContext extends Record<string, any> {
  operation?: string;
}

class LoggerService {
  private isDevelopment: boolean;
  private debugUserId: string | null = null;
  private isAdmin: boolean = false;

  constructor() {
    // Check if we're in development mode
    this.isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    this.loadDebugSettings();
  }

  private async loadDebugSettings() {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'debug_enabled_users')
        .maybeSingle();
      
      if (data?.setting_value) {
        const debugUsers = data.setting_value as string[];
        const userId = localStorage.getItem('viib_user_id');
        if (userId && debugUsers.includes(userId)) {
          this.debugUserId = userId;
        }
      }
    } catch {
      // Silently fail - debug settings are optional
    }
  }

  setAdminMode(isAdmin: boolean) {
    this.isAdmin = isAdmin;
  }

  shouldLog(): boolean {
    return this.isDevelopment || this.isAdmin || !!this.debugUserId;
  }

  log(...args: any[]) {
    if (this.shouldLog()) {
      console.log(...args);
    }
  }

  warn(...args: any[]) {
    if (this.shouldLog()) {
      console.warn(...args);
    }
  }

  debug(...args: any[]) {
    if (this.shouldLog()) {
      console.debug(...args);
    }
  }

  info(...args: any[]) {
    if (this.shouldLog()) {
      console.info(...args);
    }
  }

  // Error always logs to console in dev, but also logs to system_logs table
  async error(error: any, context?: LogContext) {
    if (this.shouldLog()) {
      console.error(error, context);
    }

    // Always log errors to system_logs table
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
        screen: typeof window !== 'undefined' ? window.location.pathname : null,
        resolved: false
      });
    } catch (loggingError) {
      // Only log in dev mode to avoid infinite loops
      if (this.isDevelopment) {
        console.error('Failed to log error to system_logs:', loggingError);
      }
    }
  }
}

export const logger = new LoggerService();

// Re-export for backward compatibility
export const errorLogger = {
  log: (error: any, context?: LogContext) => logger.error(error, context)
};
