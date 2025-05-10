/**
 * Task Analyzer Service
 * Analyzes email content to extract task details like priorities and due dates
 */

// Priority keywords and their corresponding priority levels
const PRIORITY_KEYWORDS = {
  high: ['urgent', 'asap', 'important', 'critical', 'high priority', 'high-priority', 'deadline', 'emergency'],
  medium: ['soon', 'next week', 'medium priority', 'medium-priority', 'attention'],
  low: ['low priority', 'low-priority', 'whenever', 'no rush', 'when you have time']
};

// Time-related keywords for detecting due dates
const TIME_KEYWORDS = [
  'today', 'tomorrow', 'next week', 'this week', 'this month',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'morning', 'afternoon', 'evening', 'night',
  'am', 'pm', 'a.m', 'p.m', ':00', 'o\'clock'
];

/**
 * Analyze email content to determine task priority
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @returns {string} - Priority level (High, Medium, Low)
 */
export const analyzeTaskPriority = (subject, body) => {
  const combinedText = `${subject} ${body}`.toLowerCase();
  
  // Check for high priority keywords
  for (const keyword of PRIORITY_KEYWORDS.high) {
    if (combinedText.includes(keyword)) {
      return 'High';
    }
  }
  
  // Check for low priority keywords
  for (const keyword of PRIORITY_KEYWORDS.low) {
    if (combinedText.includes(keyword)) {
      return 'Low';
    }
  }
  
  // Check for medium priority keywords
  for (const keyword of PRIORITY_KEYWORDS.medium) {
    if (combinedText.includes(keyword)) {
      return 'Medium';
    }
  }
  
  // Default priority
  return 'Medium';
};

/**
 * Extract potential due date from email content
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @returns {Date|null} - Extracted due date or null if not found
 */
export const extractDueDate = (subject, body) => {
  const combinedText = `${subject} ${body}`;
  
  // First try to find time patterns like HH:MM or H:MM
  const timeRegex = /\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\b/g;
  const timeMatches = combinedText.match(timeRegex);
  
  // Try to find date patterns
  const dateRegex = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g;
  const dateMatches = combinedText.match(dateRegex);
  
  // Check for AM/PM indicators
  const amPmRegex = /\b([0-1]?[0-9])\s*(am|pm|a\.m\.|p\.m\.)\b/gi;
  const amPmMatches = combinedText.match(amPmRegex);
  
  // Check for day mentions
  const dayRegex = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;
  const dayMatches = combinedText.match(dayRegex);
  
  // If we have explicit date patterns, try to parse them
  if (dateMatches && dateMatches.length > 0) {
    try {
      return new Date(dateMatches[0]);
    } catch (e) {
      console.log('Failed to parse explicit date:', dateMatches[0]);
    }
  }
  
  // If we have day mentions, calculate the date
  if (dayMatches && dayMatches.length > 0) {
    const day = dayMatches[0].toLowerCase();
    const now = new Date();
    
    if (day === 'today') {
      return now;
    } else if (day === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return tomorrow;
    } else {
      // Handle weekday names
      const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayIndex = weekdays.indexOf(day);
      
      if (dayIndex !== -1) {
        const targetDate = new Date(now);
        const currentDay = now.getDay();
        let daysToAdd = dayIndex - currentDay;
        
        // If the day has already passed this week, go to next week
        if (daysToAdd <= 0) {
          daysToAdd += 7;
        }
        
        targetDate.setDate(now.getDate() + daysToAdd);
        return targetDate;
      }
    }
  }
  
  // If we have time patterns, set the time for today
  if (timeMatches && timeMatches.length > 0) {
    const timeStr = timeMatches[0];
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    const dueDate = new Date();
    dueDate.setHours(hours);
    dueDate.setMinutes(minutes);
    dueDate.setSeconds(0);
    
    // If the time has already passed today, set it for tomorrow
    if (dueDate < new Date()) {
      dueDate.setDate(dueDate.getDate() + 1);
    }
    
    return dueDate;
  }
  
  // If we have AM/PM patterns
  if (amPmMatches && amPmMatches.length > 0) {
    const match = amPmMatches[0].toLowerCase();
    const isPM = match.includes('pm') || match.includes('p.m');
    
    // Extract the hour
    const hourMatch = match.match(/\d+/);
    if (hourMatch) {
      let hour = parseInt(hourMatch[0], 10);
      
      // Adjust for PM
      if (isPM && hour < 12) {
        hour += 12;
      }
      // Adjust for AM 12
      if (!isPM && hour === 12) {
        hour = 0;
      }
      
      const dueDate = new Date();
      dueDate.setHours(hour);
      dueDate.setMinutes(0);
      dueDate.setSeconds(0);
      
      // If the time has already passed today, set it for tomorrow
      if (dueDate < new Date()) {
        dueDate.setDate(dueDate.getDate() + 1);
      }
      
      return dueDate;
    }
  }
  
  // Default: set due date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 0, 0, 0); // Noon tomorrow
  return tomorrow;
};

/**
 * Analyze email to extract task details
 * @param {Object} email - Email object
 * @returns {Object} - Task details
 */
export const analyzeEmail = (email) => {
  const subject = email.subject || '';
  const body = email.body || email.snippet || '';
  
  // Generate a unique ID for the task
  const taskId = `task-${email.id || Date.now().toString(36)}`;
  
  // Extract task title from subject
  const title = subject.length > 0 ? `Task: ${subject}` : 'New Task';
  
  // Determine priority
  const priority = analyzeTaskPriority(subject, body);
  
  // Extract due date
  const dueDate = extractDueDate(subject, body);
  
  // Create task object
  return {
    id: taskId,
    title,
    description: body,
    dueDate: dueDate.toISOString(),
    priority,
    status: 'New',
    source: 'Email',
    emailId: email.id || null,
    createdAt: new Date().toISOString()
  };
};

/**
 * Batch analyze multiple emails
 * @param {Array} emails - Array of email objects
 * @returns {Array} - Array of task objects
 */
export const analyzeEmails = (emails) => {
  return emails.map(email => analyzeEmail(email));
};
