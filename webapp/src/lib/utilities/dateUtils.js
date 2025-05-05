/**
 * Utility functions for date formatting and manipulation
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);

/**
 * Format a timestamp (Firestore timestamp or Date) to a human-readable string
 * @param {Object|Date} timestamp - Firestore timestamp object or JavaScript Date
 * @returns {string} Formatted date string
 */
export function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  
  try {
    // Handle Firestore timestamp objects
    const firestoreDate = timestamp.toDate ? timestamp.toDate() : timestamp;
    
    // Convert to Day.js object
    const date = dayjs(firestoreDate);
    
    // First convert to UTC (assuming timestamps are stored in UTC)
    const utcDate = date.isUTC() ? date : date.utc();
    
    // Then convert to local time for display
    return utcDate.local().format('MMM D, YYYY h:mm A');
  } catch (err) {
    console.error('Error formatting date:', err, timestamp);
    return 'Invalid date';
  }
}

/**
 * Format a time string from UTC to local time
 * @param {string} timeString - Time string in HH:MM format (UTC)
 * @returns {string} Formatted time in local timezone
 */
export function formatTimeFromUTC(timeString) {
  if (!timeString) return 'N/A';
  
  try {
    // Parse the time string (HH:MM format in UTC)
    const [hourStr, minuteStr] = timeString.split(':');
    const utcHour = parseInt(hourStr, 10);
    const utcMinute = parseInt(minuteStr, 10);
    
    // Create a UTC dayjs object with today's date and the specified time
    const utcTime = dayjs.utc().hour(utcHour).minute(utcMinute).second(0);
    
    // Convert to local time
    const localTime = utcTime.local();
    
    // Format in 12-hour format with AM/PM
    return localTime.format('h:mm A');
  } catch (err) {
    console.error('Error formatting time from UTC:', err, timeString);
    return timeString || 'N/A';
  }
} 