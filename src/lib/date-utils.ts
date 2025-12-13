/**
 * Format the remaining time until a due date
 * @param dueDate - ISO string or Date object
 * @returns Formatted string like "4 Years 2 Months" or "3 Months" or "15 Days"
 */
export function formatTimeRemaining(dueDate: string | Date | undefined): string {
  if (!dueDate) return "Not set";

  const now = new Date();
  const targetDate = typeof dueDate === "string" ? new Date(dueDate) : dueDate;

  if (isNaN(targetDate.getTime())) return "Invalid date";

  // If date is in the past
  if (targetDate < now) return "Overdue";

  // Calculate difference in milliseconds
  let diff = targetDate.getTime() - now.getTime();

  // Convert to days
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Calculate years, months, and remaining days
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remainingDays = days % 30;

  const parts: string[] = [];

  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "Year" : "Years"}`);
  }

  if (months > 0) {
    parts.push(`${months} ${months === 1 ? "Month" : "Months"}`);
  }

  if (remainingDays > 0 && years === 0 && months < 3) {
    parts.push(`${remainingDays} ${remainingDays === 1 ? "Day" : "Days"}`);
  }

  return parts.length > 0 ? parts.join(" ") : "Less than a day";
}

/**
 * Format the elapsed time since a start date
 * @param startDate - ISO string or Date object
 * @returns Formatted string like "4 Years 2 Months" or "Starts in 3 Months"
 */
export function formatTimeElapsed(startDate: string | Date | undefined): string {
  if (!startDate) return "Not set";

  const now = new Date();
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;

  if (isNaN(start.getTime())) return "Invalid date";

  // If start date is in the future
  if (start > now) {
    const diff = start.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);

    if (months > 0) {
      return `Starts in ${months} ${months === 1 ? "Month" : "Months"}`;
    }
    return `Starts in ${days} ${days === 1 ? "Day" : "Days"}`;
  }

  // Calculate difference in milliseconds
  const diff = now.getTime() - start.getTime();

  // Convert to days
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Calculate years, months, and remaining days
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);

  const parts: string[] = [];

  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "Year" : "Years"}`);
  }

  if (months > 0) {
    parts.push(`${months} ${months === 1 ? "Month" : "Months"}`);
  }

  return parts.length > 0 ? parts.join(" ") : "Just started";
}
