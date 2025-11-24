import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getUserInitials(name: string | null | undefined): string {
  if (!name) return "UN"; // Default for undefined/null names

  // Split the name by spaces and get the first letter of each word
  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    // If there's only one part, take the first two characters
    return parts[0].substring(0, 2).toUpperCase();
  } else if (parts.length >= 2) {
    // If there are multiple parts, take the first letter of the first and last parts
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  // Fallback
  return "UN";
}

export function getInitialsColor(name: string | null | undefined): string {
  if (!name) return "bg-gray-300";

  // Generate a consistent color based on the name
  const nameChars = name.replace(/\s+/g, '').toUpperCase();
  let hash = 0;

  for (let i = 0; i < nameChars.length; i++) {
    hash = nameChars.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate hue based on the hash, ensure good contrast with white text
  const hue = hash % 360;
  // Use high saturation (75%) and lightness around 55% for good contrast with white text
  // This ensures the background is light enough that white text stands out clearly
  // but not too light that it's not distinguishable from the background
  return `hsl(${hue}, 75%, 55%)`; // High saturation with lightness optimized for white text contrast
}