export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.log(
      JSON.stringify({
        level: 'info',
        context: this.context,
        message,
        ...meta,
        timestamp: new Date().toISOString(),
      })
    );
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    console.error(
      JSON.stringify({
        level: 'error',
        context: this.context,
        message,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : undefined,
        ...meta,
        timestamp: new Date().toISOString(),
      })
    );
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(
      JSON.stringify({
        level: 'warn',
        context: this.context,
        message,
        ...meta,
        timestamp: new Date().toISOString(),
      })
    );
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.STAGE === 'dev') {
      console.debug(
        JSON.stringify({
          level: 'debug',
          context: this.context,
          message,
          ...meta,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }
}
