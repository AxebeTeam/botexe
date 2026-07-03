import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export function generateKey(): string {
  const prefix = 'MPB';
  const segments: string[] = [];

  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(3).toString('hex').toUpperCase());
  }

  return `${prefix}-${segments.join('-')}`;
}

export function generateLicenseKey(): string {
  return uuidv4().split('-').join('').toUpperCase().substring(0, 24);
}

export function isValidKeyFormat(key: string): boolean {
  return /^MPB-[A-F0-9]{6}-[A-F0-9]{6}-[A-F0-9]{6}-[A-F0-9]{6}$/.test(key);
}
