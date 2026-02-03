import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface LogContext extends Record<string, unknown> {
  operation?: string;
  component?: string;
  httpStatus?: number;
  errorType?: string;
}

export type LogSeverity = 'error' | 'warning' | 'info';

class LoggerService {
  private isDevelopment: boolean;
  private debugUserId: string | null = null;
  private isAdmin: boolean = false;
  private initialized: boolean = false;

  constructor() {
    this.isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    this.loadDebugSettings();
  }

  private async loadDebugSettings() {
    if (this.initialized) return;
    
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
      this.initialized = true;
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

  log(...args: unknown[]) {
    if (this.shouldLog()) {
      console.log(...args);
    }
  }

  warn(...args: unknown[]) {
    if (this.shouldLog()) {
      console.warn(...args);
    }
  }

  debug(...args: unknown[]) {
    if (this.shouldLog()) {
      console.debug(...args);
    }
  }

  info(...args: unknown[]) {
    if (this.shouldLog()) {
      console.info(...args);
    }
  }

  /**
   * Log to system_logs table with specified severity
   * @param severity - 'error' | 'warning' | 'info'
   * @param message - Error message or Error object
   * @param context - Additional context for the log
   */
  async logToDatabase(
    severity: LogSeverity,
    message: string | Error,
    context?: LogContext
  ): Promise<void> {
    try {
      const errorMessage = message instanceof Error ? message.message : String(message);
      const errorStack = message instanceof Error ? message.stack : undefined;
      const viibUserId = localStorage.getItem('viib_user_id');

      const { error: insertError } = await supabase.from('system_logs').insert([{
        error_message: errorMessage,
        error_stack: errorStack || null,
        severity,
        user_id: viibUserId || null,
        context: (context || null) as Json,
        operation: context?.operation || null,
        http_status: context?.httpStatus || null,
        screen: typeof window !== 'undefined' ? window.location.pathname : null,
        resolved: false
      }]);
      
      if (insertError && this.isDevelopment) {
        console.error('Failed to log to system_logs:', insertError);
      }
    } catch (loggingError) {
      // Only log in dev mode to avoid infinite loops
      if (this.isDevelopment) {
        console.error('Failed to log to system_logs:', loggingError);
      }
    }
  }

  /**
   * Log error to console (if allowed) and always to system_logs table
   * @param error - Error object or message
   * @param context - Additional context for the log
   */
  async error(error: unknown, context?: LogContext): Promise<void> {
    if (this.shouldLog()) {
      console.error(error, context);
    }

    // Always log errors to system_logs table
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    try {
      const viibUserId = localStorage.getItem('viib_user_id');

      const { error: insertError } = await supabase.from('system_logs').insert([{
        error_message: errorMessage,
        error_stack: errorStack || null,
        severity: 'error',
        user_id: viibUserId || null,
        context: (context || null) as Json,
        operation: context?.operation || null,
        http_status: context?.httpStatus || null,
        screen: typeof window !== 'undefined' ? window.location.pathname : null,
        resolved: false
      }]);
      
      if (insertError && this.isDevelopment) {
        console.error('Failed to log error to system_logs:', insertError);
      }
    } catch (loggingError) {
      // Only log in dev mode to avoid infinite loops
      if (this.isDevelopment) {
        console.error('Failed to log error to system_logs:', loggingError);
      }
    }
  }

  /**
   * Log warning to console (if allowed) and to system_logs table
   * @param message - Warning message
   * @param context - Additional context for the log
   */
  async warning(message: string | Error, context?: LogContext): Promise<void> {
    if (this.shouldLog()) {
      console.warn(message, context);
    }

    await this.logToDatabase('warning', message, context);
  }

  /**
   * Log info to system_logs table (for important events that should be tracked)
   * @param message - Info message
   * @param context - Additional context for the log
   */
  async logInfo(message: string, context?: LogContext): Promise<void> {
    if (this.shouldLog()) {
      console.info(message, context);
    }

    await this.logToDatabase('info', message, context);
  }
}

export const logger = new LoggerService();

// Backward compatibility - errorLogger.log maps to logger.error
export const errorLogger = {
  log: (error: unknown, context?: LogContext) => logger.error(error, context),
  warning: (message: string, context?: LogContext) => logger.warning(message, context),
  info: (message: string, context?: LogContext) => logger.logInfo(message, context)
};
