const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

export const logger = {
  info: (message: string) => console.log(`${colors.blue}[${timestamp()}] [INFO]${colors.reset} ${message}`),
  success: (message: string) => console.log(`${colors.green}[${timestamp()}] [SUCCESS]${colors.reset} ${message}`),
  warn: (message: string) => console.log(`${colors.yellow}[${timestamp()}] [WARN]${colors.reset} ${message}`),
  error: (message: string) => console.log(`${colors.red}[${timestamp()}] [ERROR]${colors.reset} ${message}`),
  debug: (message: string) => console.log(`${colors.cyan}[${timestamp()}] [DEBUG]${colors.reset} ${message}`),
  bot: (message: string) => console.log(`${colors.magenta}[${timestamp()}] [BOT]${colors.reset} ${message}`),
};
