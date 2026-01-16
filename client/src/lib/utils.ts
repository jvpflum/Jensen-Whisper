import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Strips Markdown formatting from text for better text-to-speech results
 * @param markdown The markdown-formatted text
 * @returns Plain text with markdown formatting removed
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return '';
  
  return markdown
    // Remove code blocks completely
    .replace(/```[\s\S]*?```/g, "Code block omitted. ")
    // Remove inline code
    .replace(/`([^`]+)`/g, "$1")
    // Remove images and keep the alt text
    .replace(/!\[(.*?)\]\(.*?\)/g, "$1")
    // Replace links with just their text
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    // Remove heading markers
    .replace(/#{1,6}\s+/g, "")
    // Remove bold and italic formatting
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    // Remove horizontal rules
    .replace(/---+/g, "")
    // Handle lists - converting them to simple text with periods
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "• ")
    // Replace multiple newlines with periods and space
    .replace(/\n\n+/g, ". ")
    // Replace single newlines with spaces
    .replace(/\n/g, " ")
    // Replace multiple spaces with single spaces
    .replace(/\s+/g, " ")
    // Clean up multiple periods
    .replace(/\.+/g, ".")
    .replace(/\.\s+\./g, ".")
    .replace(/\,\s+\./g, ".")
    // Ensure proper spacing after punctuation
    .replace(/\.(?=[A-Za-z])/g, ". ")
    .replace(/\,(?=[A-Za-z])/g, ", ")
    .trim();
}
