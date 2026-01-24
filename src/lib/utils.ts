import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a random 6-character alphanumeric PIN.
 */
export function generatePin(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Hashes a string using the SHA-256 algorithm.
 * @param pin The string to hash.
 * @returns A promise that resolves to the hex-encoded hash.
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
