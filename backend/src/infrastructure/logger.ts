export const logger = {
  info: (msg: string, meta?: object) => console.log(`[INFO] ${msg}`, meta ?? ''),
  error: (msg: string, meta?: object) => console.error(`[ERROR] ${msg}`, meta ?? ''),
  warn: (msg: string, meta?: object) => console.warn(`[WARN] ${msg}`, meta ?? ''),
};
