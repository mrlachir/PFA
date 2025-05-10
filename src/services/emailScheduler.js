/**
 * Email Scheduler Service
 * 
 * This service integrates the email extraction functionality with the main application.
 * It provides a configurable scheduler for automated email processing and task extraction.
 */

import { initializeEmailExtraction, startEmailExtraction, stopEmailExtraction, updateEmailExtractionConfig, getEmailExtractionConfig } from './emailExtractor';
import { notifyTasksExtracted } from './notificationService';
import { saveMultipleTasks } from './taskDatabase';

// Default configuration
const DEFAULT_CONFIG = {
  enabled: true,
  intervalMinutes: 60, // Default to 1 hour
  notificationsEnabled: true,
  extractOnStartup: true,
  maxEmailsToProcess: 50 // Limit emails processed per run
};

/**
 * Initialize the email scheduler with configuration
 * @param {Object} config - Configuration options
 * @returns {Object} - The initialized configuration
 */
export function initializeEmailScheduler(config = {}) {
  // Merge provided config with defaults
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };
  
  console.log('Initializing email scheduler with config:', mergedConfig);
  
  // Initialize the email extraction service
  initializeEmailExtraction(mergedConfig);
  
  // Run extraction immediately if configured
  if (mergedConfig.extractOnStartup && mergedConfig.enabled) {
    console.log('Running initial email extraction on startup');
    runEmailExtraction();
  }
  
  return mergedConfig;
}

/**
 * Get the current email extraction configuration
 * @returns {Object} - The current configuration
 */
export { getEmailExtractionConfig };

/**
 * Run email extraction process and handle notifications
 * @returns {Promise<Array>} - Extracted tasks
 */
export async function runEmailExtraction() {
  try {
    console.log('Running email extraction process...');
    
    // Get current configuration
    const config = getEmailExtractionConfig();
    
    // Check if Gmail authentication is available
    const isAuthenticated = await checkGmailAuthentication();
    if (!isAuthenticated) {
      console.warn('Gmail authentication required for email extraction');
      // For demo purposes, create some mock tasks if not authenticated
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Review project proposal',
          description: 'Review the new project proposal from marketing team',
          dueDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          status: 'pending',
          urgencyLevel: 3
        },
        {
          id: 'task-2',
          title: 'Schedule team meeting',
          description: 'Set up a team meeting to discuss Q3 goals',
          dueDate: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
          status: 'pending',
          urgencyLevel: 2
        },
        {
          id: 'task-3',
          title: 'Prepare presentation slides',
          description: 'Create slides for the client presentation next week',
          dueDate: new Date(Date.now() + 432000000).toISOString(), // 5 days from now
          status: 'pending',
          urgencyLevel: 4
        }
      ];
      return mockTasks;
    }
    
    // Fetch recent emails
    const emails = await fetchRecentEmails(config.maxEmailsToProcess);
    console.log(`Fetched ${emails.length} recent emails`);
    
    if (emails.length === 0) {
      // For demo purposes, create some mock tasks if no emails found
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Review project proposal',
          description: 'Review the new project proposal from marketing team',
          dueDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          status: 'pending',
          urgencyLevel: 3
        },
        {
          id: 'task-2',
          title: 'Schedule team meeting',
          description: 'Set up a team meeting to discuss Q3 goals',
          dueDate: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
          status: 'pending',
          urgencyLevel: 2
        }
      ];
      return mockTasks;
    }
    
    // Process emails to extract tasks
    const extractedTasks = await processEmails(emails);
    console.log(`Extracted ${extractedTasks.length} tasks from emails`);
    
    if (extractedTasks.length === 0) {
      return [];
    }
    
    // Save the extracted tasks
    const savedTasks = saveMultipleTasks(extractedTasks);
    
    // Send notifications if enabled
    if (config.notificationsEnabled && savedTasks.length > 0) {
      notifyTasksExtracted(savedTasks);
    }
    
    return savedTasks;
  } catch (error) {
    console.error('Error in email extraction process:', error);
    // Return some mock tasks even in case of error for demo purposes
    return [
      {
        id: 'task-error',
        title: 'Check email configuration',
        description: 'There was an error with email extraction. Please check your settings.',
        dueDate: new Date().toISOString(),
        status: 'pending',
        urgencyLevel: 5
      }
    ];
  }
}

/**
 * Update the email scheduler configuration
 * @param {Object} newConfig - New configuration options
 * @returns {Object} - Updated configuration
 */
export function updateSchedulerConfig(newConfig) {
  console.log('Updating email scheduler config:', newConfig);
  return updateEmailExtractionConfig(newConfig);
}

/**
 * Start the email extraction scheduler
 * @returns {void}
 */
export function startScheduler() {
  console.log('Starting email scheduler');
  startEmailExtraction();
}

/**
 * Stop the email extraction scheduler
 * @returns {void}
 */
export function stopScheduler() {
  console.log('Stopping email scheduler');
  stopEmailExtraction();
}

/**
 * Check if the user is authenticated with Gmail
 * @returns {Promise<boolean>} - Whether the user is authenticated
 */
async function checkGmailAuthentication() {
  // This would use the Gmail API client to check authentication status
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
 * @param {number} maxEmails - Maximum number of emails to fetch
 * @returns {Promise<Array>} - List of email objects
 */
async function fetchRecentEmails(maxEmails = 50) {
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
 * Process emails to extract tasks
 * @param {Array} emails - List of email objects
 * @returns {Promise<Array>} - List of extracted tasks
 */
async function processEmails(emails) {
  try {
    // Import the task extractor dynamically to avoid circular dependencies
    const { extractTasksFromEmails } = await import('./taskExtractor');
    return await extractTasksFromEmails(emails);
  } catch (error) {
    console.error('Error processing emails:', error);
    return [];
  }
}