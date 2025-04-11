import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  }).format(d);
}

export function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    secs.toString().padStart(2, "0"),
  ].join(":");
}

export function formatPhoneNumber(phoneNumber: string) {
  // Simple formatting for US numbers
  if (!phoneNumber) return "";

  // Strip all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, "");

  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
      6
    )}`;
  } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(
      7
    )}`;
  }

  // For other cases, just return as is
  return phoneNumber;
}

// Calculate the status color based on the call disposition
export function getCallStatusColor(disposition: string) {
  switch (disposition?.toUpperCase()) {
    case "ANSWERED":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    case "NO ANSWER":
    case "NOANSWER":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
    case "BUSY":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
    case "FAILED":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    case "CONGESTION":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
  }
}

export const copyToClipboard = (text: string) => {
  return navigator.clipboard.writeText(text);
};

export const isValidSipUsername = (username: string) => {
  // SIP usernames should only contain alphanumeric characters, -, _, and .
  return /^[a-zA-Z0-9_.-]+$/.test(username);
};

export const isValidHostname = (hostname: string) => {
  // Simple hostname validation
  return (
    /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(hostname) ||
    hostname === "localhost" ||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) ||
    hostname === "dynamic"
  );
};

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
