import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFilePath(): string {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOG_DIR, `pipeline-${date}.log`);
}

function formatMessage(level: string, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level}] ${message}`;
}

export const logger = {
  info(message: string) {
    const line = formatMessage('INFO', message);
    console.log(line);
    try {
      ensureLogDir();
      fs.appendFileSync(getLogFilePath(), line + '\n');
    } catch {
      // Non-fatal — logging should never crash the pipeline
    }
  },

  warn(message: string) {
    const line = formatMessage('WARN', message);
    console.warn(line);
    try {
      ensureLogDir();
      fs.appendFileSync(getLogFilePath(), line + '\n');
    } catch {}
  },

  error(message: string, err?: unknown) {
    const detail = err instanceof Error ? ` — ${err.message}` : '';
    const line = formatMessage('ERROR', message + detail);
    console.error(line);
    try {
      ensureLogDir();
      fs.appendFileSync(getLogFilePath(), line + '\n');
    } catch {}
  },

  section(title: string) {
    const line = `\n${'='.repeat(60)}\n  ${title}\n${'='.repeat(60)}`;
    console.log(line);
    try {
      ensureLogDir();
      fs.appendFileSync(getLogFilePath(), line + '\n');
    } catch {}
  },
};
