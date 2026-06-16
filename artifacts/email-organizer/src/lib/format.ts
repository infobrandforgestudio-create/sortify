import { format, parseISO } from "date-fns";

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "Never";
  try {
    return format(parseISO(dateString), "MMM d, yyyy h:mm a");
  } catch (e) {
    return dateString;
  }
}

export function formatShortDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  try {
    return format(parseISO(dateString), "MMM d");
  } catch (e) {
    return dateString;
  }
}
