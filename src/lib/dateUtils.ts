export const IST_OFFSET = 5.5 * 60 * 60 * 1000;

/**
 * Returns the current time shifted into an IST-equivalent Date object.
 * Note: The returned Date object's UTC time components actually represent IST local time.
 */
export function getISTNow(): Date {
  return new Date(Date.now() + IST_OFFSET);
}

/**
 * Shifts a true UTC Date into an IST-equivalent Date object.
 * Use this when you have a Database Date (UTC) and need to extract its IST hour/date/month.
 * e.g., toIST(transaction.createdAt).getUTCHours()
 */
export function toIST(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET);
}

/**
 * Shifts an IST-equivalent Date back into a true UTC Date.
 */
export function fromIST(date: Date): Date {
  return new Date(date.getTime() - IST_OFFSET);
}

/**
 * Calculates start and end Date bounds for various reporting ranges (today, week, month)
 * perfectly aligned to IST midnight (00:00:00).
 */
export function getISTDateRange(range: string, monthParam?: string | null) {
  const now = getISTNow();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const date = now.getUTCDate();

  let startIst: Date;
  let endIst: Date;
  let periodLabel: string;
  let granularity: "hour" | "day" = "day";

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    startIst = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    endIst = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    
    // Label using the IST equivalent
    const labelDate = fromIST(startIst);
    periodLabel = labelDate.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
    granularity = "day";
  } else if (range === "yesterday") {
    startIst = new Date(Date.UTC(year, month, date - 1, 0, 0, 0));
    endIst = new Date(Date.UTC(year, month, date - 1, 23, 59, 59, 999));
    periodLabel = "Yesterday";
    granularity = "hour";
  } else if (range === "week") {
    startIst = new Date(Date.UTC(year, month, date - 6, 0, 0, 0));
    endIst = new Date(Date.UTC(year, month, date, 23, 59, 59, 999));
    periodLabel = "Last 7 Days";
    granularity = "day";
  } else if (range === "30d") {
    startIst = new Date(Date.UTC(year, month, date - 29, 0, 0, 0));
    endIst = new Date(Date.UTC(year, month, date, 23, 59, 59, 999));
    periodLabel = "Last 30 Days";
    granularity = "day";
  } else if (range === "month") {
    startIst = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    endIst = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    
    const labelDate = fromIST(startIst);
    periodLabel = labelDate.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
    granularity = "day";
  } else if (range === "all") {
    startIst = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));
    endIst = new Date(Date.UTC(2099, 11, 31, 23, 59, 59, 999));
    periodLabel = "All Time";
    granularity = "day";
  } else {
    // "today"
    startIst = new Date(Date.UTC(year, month, date, 0, 0, 0));
    endIst = new Date(Date.UTC(year, month, date, 23, 59, 59, 999));
    periodLabel = "Today";
    granularity = "hour";
  }

  // Convert these IST-aligned UTC times back into true UTC times for the database
  const startDate = fromIST(startIst);
  const endDate = fromIST(endIst);

  return { startDate, endDate, periodLabel, granularity };
}
