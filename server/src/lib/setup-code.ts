import crypto from 'crypto';
import { createOneTimeCode } from './one-time-code.js';

// First-run setup code. A configured FREEAPI_SETUP_CODE is stable across
// restarts and deploys; this matters on hosts where the app process can restart
// while the first account is being created. Without the env var we retain the
// original random-per-boot behavior for local installs.
const _code = createOneTimeCode();
let configuredCode: string | null = null;

export function generateSetupCode(): string {
  const configured = process.env.FREEAPI_SETUP_CODE?.trim();
  if (configured) {
    if (!/^[A-Za-z0-9]{10,64}$/.test(configured)) {
      throw new Error('FREEAPI_SETUP_CODE must be 10-64 alphanumeric characters');
    }
    configuredCode = configured.toUpperCase();
    console.log('');
    console.log('  First-run setup code: configured via FREEAPI_SETUP_CODE (value hidden)');
    console.log('  A browser on this machine can finish setup without it. From any');
    console.log('  other device, enter the configured code to create the first account.');
    console.log('');
    return configuredCode;
  }

  configuredCode = null;
  const code = _code.generate();
  console.log('');
  console.log('  First-run setup code: ' + code);
  console.log('  A browser on this machine can finish setup without it. From any');
  console.log('  other device, enter this code to create the first account.');
  console.log('');
  return code;
}

export function getSetupCode(): string | null {
  return configuredCode ?? _code.get();
}

export function clearSetupCode(): void {
  configuredCode = null;
  _code.clear();
}

export function setupCodeMatches(provided: unknown): boolean {
  if (configuredCode) {
    if (typeof provided !== 'string') return false;
    const a = Buffer.from(configuredCode);
    const b = Buffer.from(provided.trim().toUpperCase());
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  return _code.matches(provided);
}
