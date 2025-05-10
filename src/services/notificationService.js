/**
 * Notification Service
 * 
 * This service handles notifications for the AI Planner application.
 * It provides functions for creating and managing notifications for various events,
 * including task extraction, task reminders, and system notifications.
 */

// Default notification settings
let notificationSettings = {
  taskExtraction: true,
  taskReminders: true,
  systemNotifications: true,
  sound: true,
  desktopNotifications: true,
  reminderTimes: [
    { value: 1440, label: '1 day before' },   // 24 hours * 60 minutes = 1440 minutes
    { value: 60, label: '1 hour before' },    // 60 minutes
    { value: 10, label: '10 minutes before' } // 10 minutes
  ]
};

// Store tasks with disabled reminders
let disabledReminders = {};

// Store active reminder timeouts to allow cancellation
let activeReminders = {};

/**
 * Initialize the notification service with user preferences
 * @param {Object} settings - User notification preferences
 * @returns {void}
 */
export function initializeNotifications(settings = {}) {
  // Update settings with any provided values
  notificationSettings = {
    ...notificationSettings,
    ...settings
  };
  
  // Request notification permissions if desktop notifications are enabled
  if (notificationSettings.desktopNotifications && 'Notification' in window) {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }
  
  console.log('Notification service initialized with settings:', notificationSettings);
}

/**
 * Update notification settings
 * @param {Object} newSettings - New notification settings
 * @returns {Object} - Updated settings
 */
export function updateNotificationSettings(newSettings) {
  notificationSettings = {
    ...notificationSettings,
    ...newSettings
  };
  
  // If desktop notifications were just enabled, request permission
  if (newSettings.desktopNotifications === true && 'Notification' in window) {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }
  
  console.log('Notification settings updated:', notificationSettings);
  return { ...notificationSettings };
}

/**
 * Get current notification settings
 * @returns {Object} - Current notification settings
 */
export function getNotificationSettings() {
  return { ...notificationSettings };
}

/**
 * Send a notification for newly extracted tasks
 * @param {Array} tasks - The extracted tasks
 * @returns {void}
 */
export function notifyTasksExtracted(tasks) {
  if (!notificationSettings.taskExtraction || tasks.length === 0) {
    return;
  }
  
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
  
  // Send the notification
  sendNotification(title, message, 'task-extraction');
}

/**
 * Send a task reminder notification
 * @param {Object} task - The task to remind about
 * @returns {void}
 */
export function notifyTaskReminder(task) {
  if (!notificationSettings.taskReminders) {
    return;
  }
  
  const title = `Reminder: ${task.title}`;
  let message = '';
  
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    message += `Due: ${dueDate.toLocaleDateString()} ${dueDate.toLocaleTimeString()}\n`;
  }
  
  if (task.description) {
    message += task.description.substring(0, 100) + (task.description.length > 100 ? '...' : '');
  }
  
  // Send the notification
  sendNotification(title, message, 'task-reminder');
}

/**
 * Send a system notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @returns {void}
 */
export function notifySystem(title, message) {
  if (!notificationSettings.systemNotifications) {
    return;
  }
  
  // Send the notification
  sendNotification(title, message, 'system');
}

/**
 * Send a notification using available methods
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (for categorization)
 * @returns {void}
 */
function sendNotification(title, message, type) {
  console.log(`Notification: ${title} - ${message} (${type})`);
  
  // Play sound if enabled
  if (notificationSettings.sound) {
    playNotificationSound(type);
  }
  
  // Send desktop notification if enabled
  if (notificationSettings.desktopNotifications) {
    sendDesktopNotification(title, message, type);
  }
  
  // Send in-app notification using NotificationCenter
  sendInAppNotification(title, message, type);
}

/**
 * Send a desktop notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 * @returns {void}
 */
function sendDesktopNotification(title, message, type) {
  try {
    // Check if browser notifications are supported
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return;
    }
    
    // Check if permission is already granted
    if (Notification.permission === 'granted') {
      createNotification(title, message, type);
    } 
    // Otherwise, request permission
    else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          createNotification(title, message, type);
        }
      });
    }
  } catch (error) {
    console.error('Error sending desktop notification:', error);
  }
}

/**
 * Create and display a desktop notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 * @returns {void}
 */
function createNotification(title, message, type) {
  // Set icon based on notification type
  let icon = '/logo192.png'; // Default icon
  
  // Create and show the notification
  const notification = new Notification(title, {
    body: message,
    icon: icon
  });
  
  // Add click handler to open the app
  notification.onclick = function() {
    window.focus();
    notification.close();
  };
}

/**
 * Schedule reminders for a task
 * @param {Object} task - The task to schedule reminders for
 * @returns {void}
 */
export function scheduleTaskReminders(task) {
  // Cancel any existing reminders for this task
  cancelTaskReminders(task.id);
  
  // Check if reminders are disabled for this task
  if (disabledReminders[task.id]) {
    console.log('Reminders are disabled for task:', task.title);
    return;
  }
  
  // Check if task has a due date
  if (!task.dueDate) {
    console.log('Cannot schedule reminders for task without due date:', task.title);
    return;
  }
  
  const dueDate = new Date(task.dueDate);
  if (isNaN(dueDate.getTime())) {
    console.error('Invalid due date for task:', task.title, task.dueDate);
    return;
  }
  
  // Get current time
  const now = new Date();
  
  // Schedule reminders for each reminder time
  activeReminders[task.id] = [];
  
  notificationSettings.reminderTimes.forEach(reminderTime => {
    // Calculate when to send this reminder (dueDate - reminderTime)
    const reminderTimeMs = reminderTime.value * 60 * 1000; // Convert minutes to milliseconds
    const reminderDate = new Date(dueDate.getTime() - reminderTimeMs);
    
    // Only schedule future reminders
    if (reminderDate > now) {
      // Calculate delay in milliseconds
      const delay = reminderDate.getTime() - now.getTime();
      
      // Schedule the reminder
      const timerId = setTimeout(() => {
        const reminderMessage = `Task due ${reminderTime.label}: ${task.title}`;
        notifyTaskReminder({
          ...task,
          reminderLabel: reminderTime.label
        });
        
        // Remove this reminder from active reminders
        if (activeReminders[task.id]) {
          activeReminders[task.id] = activeReminders[task.id].filter(r => r.id !== timerId);
        }
      }, delay);
      
      // Store the timer ID for potential cancellation
      activeReminders[task.id].push({
        id: timerId,
        reminderTime: reminderTime.value,
        scheduledFor: reminderDate
      });
      
      console.log(`Scheduled reminder for task '${task.title}' ${reminderTime.label} at ${reminderDate.toLocaleString()}`);
    } else {
      console.log(`Skipped ${reminderTime.label} reminder for task '${task.title}' as it's in the past`);
    }
  });
}

/**
 * Cancel all reminders for a task
 * @param {string} taskId - The ID of the task
 * @returns {void}
 */
export function cancelTaskReminders(taskId) {
  if (activeReminders[taskId]) {
    // Clear all timeouts for this task
    activeReminders[taskId].forEach(reminder => {
      clearTimeout(reminder.id);
    });
    
    // Remove from active reminders
    delete activeReminders[taskId];
    console.log(`Cancelled all reminders for task ID: ${taskId}`);
  }
}

/**
 * Enable reminders for a specific task
 * @param {string} taskId - The ID of the task to enable reminders for
 * @param {Object} task - The task object (optional, if you want to immediately schedule reminders)
 * @returns {boolean} - Whether the operation was successful
 */
export function enableTaskReminders(taskId, task = null) {
  // Remove from disabled list
  delete disabledReminders[taskId];
  
  // If task object is provided, schedule reminders immediately
  if (task && task.dueDate) {
    scheduleTaskReminders(task);
    return true;
  }
  
  return true;
}

/**
 * Disable reminders for a specific task
 * @param {string} taskId - The ID of the task to disable reminders for
 * @returns {boolean} - Whether the operation was successful
 */
export function disableTaskReminders(taskId) {
  // Add to disabled list
  disabledReminders[taskId] = true;
  
  // Cancel any existing reminders
  cancelTaskReminders(taskId);
  
  return true;
}

/**
 * Check if reminders are enabled for a specific task
 * @param {string} taskId - The ID of the task to check
 * @returns {boolean} - Whether reminders are enabled for the task
 */
export function areRemindersEnabled(taskId) {
  return !disabledReminders[taskId];
}

/**
 * Schedule reminders for multiple tasks
 * @param {Array} tasks - Array of tasks to schedule reminders for
 * @returns {void}
 */
export function scheduleRemindersForTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return;
  }
  
  tasks.forEach(task => {
    // Only schedule if reminders aren't disabled for this task
    if (!disabledReminders[task.id]) {
      scheduleTaskReminders(task);
    }
  });
  
  console.log(`Scheduled reminders for ${tasks.length} tasks`);
}

/**
 * Send an in-app notification using the NotificationCenter
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (for categorization)
 * @returns {void}
 */
function sendInAppNotification(title, message, type) {
  // Map notification types to severity levels for UI display
  let severity = 'info';
  
  switch (type) {
    case 'task-reminder':
      severity = 'warning';
      break;
    case 'task-extraction':
      severity = 'success';
      break;
    case 'error':
      severity = 'error';
      break;
    default:
      severity = 'info';
  }
  
  // Dispatch custom event that will be caught by NotificationCenter
  const event = new CustomEvent('app-notification', {
    detail: { title, message, type: severity }
  });
  
  window.dispatchEvent(event);
}

/**
 * Play a notification sound
 * @param {string} type - Notification type
 * @returns {void}
 */
function playNotificationSound(type) {
  try {
    // Different sounds could be used for different notification types
    let soundFile = '/notification.mp3'; // Default sound file
    
    // Create and play audio element
    const audio = new Audio(soundFile);
    audio.play().catch(error => {
      // Autoplay might be blocked by browser policy
      console.warn('Could not play notification sound:', error);
    });
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}