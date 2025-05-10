import { formatISO } from 'date-fns';
import { saveMultipleTasks } from './taskDatabase';
import { extractTasksFromEmails } from './taskExtractor';

// Configuration for email extraction
let emailExtractionConfig = {
  enabled: true,
  intervalMinutes: 60, // Default to 1 hour
  lastRun: null,
  notificationsEnabled: true
};

// Store for interval ID to allow stopping/restarting
let extractionIntervalId = null;

/**
 * Initialize the email extraction service
 * @param {Object} config - Configuration options
 * @returns {void}
 */
export function initializeEmailExtraction(config = {}) {
  // Update config with any provided values
  emailExtractionConfig = {
    ...emailExtractionConfig,
    ...config
  };
  
  console.log('Email extraction service initialized with config:', emailExtractionConfig);
  
  // Start the extraction interval if enabled
  if (emailExtractionConfig.enabled) {
    startEmailExtraction();
  }
}

/**
 * Start the automated email extraction process
 * @returns {void}
 */
export function startEmailExtraction() {
  if (extractionIntervalId) {
    console.log('Email extraction already running');
    return;
  }
  
  // Run immediately on start
  runEmailExtraction();
  
  // Set up the interval for future runs
  const intervalMs = emailExtractionConfig.intervalMinutes * 60 * 1000;
  extractionIntervalId = setInterval(runEmailExtraction, intervalMs);
  
  console.log(`Email extraction scheduled to run every ${emailExtractionConfig.intervalMinutes} minutes`);
}

/**
 * Stop the automated email extraction process
 * @returns {void}
 */
export function stopEmailExtraction() {
  if (extractionIntervalId) {
    clearInterval(extractionIntervalId);
    extractionIntervalId = null;
    console.log('Email extraction stopped');
  }
}

/**
 * Update the email extraction configuration
 * @param {Object} newConfig - New configuration options
 * @returns {Object} - Updated configuration
 */
export function updateEmailExtractionConfig(newConfig) {
  const oldIntervalMinutes = emailExtractionConfig.intervalMinutes;
  const wasEnabled = emailExtractionConfig.enabled;
  
  // Update the configuration
  emailExtractionConfig = {
    ...emailExtractionConfig,
    ...newConfig
  };
  
  // If interval changed or enabled status changed, restart the service
  if (emailExtractionConfig.enabled !== wasEnabled || 
      (emailExtractionConfig.enabled && 
       emailExtractionConfig.intervalMinutes !== oldIntervalMinutes)) {
    
    // Stop current interval if running
    if (extractionIntervalId) {
      stopEmailExtraction();
    }
    
    // Start with new settings if enabled
    if (emailExtractionConfig.enabled) {
      startEmailExtraction();
    }
  }
  
  console.log('Email extraction config updated:', emailExtractionConfig);
  return emailExtractionConfig;
}

/**
 * Get the current email extraction configuration
 * @returns {Object} - Current configuration
 */
export function getEmailExtractionConfig() {
  return { ...emailExtractionConfig };
}

/**
 * Run the email extraction process
 * This function fetches recent emails and extracts tasks from them
 * @returns {Promise<Array>} - Extracted tasks
 */
async function runEmailExtraction() {
  try {
    console.log('Running email extraction...');
    emailExtractionConfig.lastRun = new Date();
    
    // Check if user is authenticated with Gmail
    const isAuthenticated = await checkGmailAuthentication();
    if (!isAuthenticated) {
      console.warn('Gmail authentication required for email extraction');
      return [];
    }
    
    // Fetch recent emails (since last run or last 24 hours if first run)
    const emails = await fetchRecentEmails();
    console.log(`Fetched ${emails.length} recent emails`);
    
    if (emails.length === 0) {
      return [];
    }
    
    // Extract tasks from emails
    const extractedTasks = await extractTasksFromEmails(emails);
    console.log(`Extracted ${extractedTasks.length} tasks from emails`);
    
    if (extractedTasks.length === 0) {
      return [];
    }
    
    // Save the extracted tasks
    const savedTasks = saveMultipleTasks(extractedTasks);
    
    // Send notifications if enabled
    if (emailExtractionConfig.notificationsEnabled && savedTasks.length > 0) {
      sendTaskExtractedNotification(savedTasks);
    }
    
    return savedTasks;
  } catch (error) {
    console.error('Error during email extraction:', error);
    return [];
  }
}

/**
 * Check if the user is authenticated with Gmail
 * @returns {Promise<boolean>} - Whether the user is authenticated
 */
async function checkGmailAuthentication() {
  // This would use the Gmail API client to check authentication status
  // For now, we'll assume the user is authenticated if the Gmail API client is available
  try {
    // This would be replaced with actual Gmail API client check
    const isSignedIn = localStorage.getItem('gmail_token') !== null;
    return isSignedIn;
  } catch (error) {
    console.error('Error checking Gmail authentication:', error);
    return false;
  }
}

/**
 * Fetch recent emails from Gmail
 * @returns {Promise<Array>} - List of email objects
 */
async function fetchRecentEmails() {
  try {
    // This would use the Gmail API client to fetch recent emails
    // For now, we'll return a mock response
    
    // In a real implementation, we would:
    // 1. Get the last run time or default to 24 hours ago
    // 2. Construct a query to fetch emails since that time
    // 3. Call the Gmail API to fetch those emails
    // 4. Parse the response and return the email objects
    
    // Mock implementation for now
    return [];
  } catch (error) {
    console.error('Error fetching recent emails:', error);
    return [];
  }
}

/**
 * Send a notification that tasks have been extracted
 * @param {Array} tasks - The extracted tasks
 * @returns {void}
 */
function sendTaskExtractedNotification(tasks) {
  try {
    // Check if browser notifications are supported
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return;
    }
    
    // Check if permission is already granted
    if (Notification.permission === 'granted') {
      createTaskNotification(tasks);
    } 
    // Otherwise, request permission
    else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          createTaskNotification(tasks);
        }
      });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

/**
 * Create and display a notification for extracted tasks
 * @param {Array} tasks - The extracted tasks
 * @returns {void}
 */
function createTaskNotification(tasks) {
  const taskCount = tasks.length;
  const title = `${taskCount} new task${taskCount !== 1 ? 's' : ''} extracted`;
  
  // Create a message with details of the first few tasks
  let message = '';
  const maxTasksToShow = 3;
  
  tasks.slice(0, maxTasksToShow).forEach(task => {
    message += `• ${task.title}\n`;
  });
  
  if (taskCount > maxTasksToShow) {
    message += `...and ${taskCount - maxTasksToShow} more`;
  }
  
  // Create and show the notification
  const notification = new Notification(title, {
    body: message,
    icon: '/logo192.png' // Assuming there's a logo in the public folder
  });
  
  // Add click handler to open the app
  notification.onclick = function() {
    window.focus();
    notification.close();
  };
}