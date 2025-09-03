import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ERROR_MESSAGES } from "@/config/constants";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return ERROR_MESSAGES.SERVER_ERROR;
}