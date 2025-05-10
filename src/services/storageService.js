/**
 * Storage Service
 * Handles saving and loading data to/from JSON files
 */

// Default storage locations
const STORAGE_KEYS = {
  EMAILS: 'ai_planner_emails',
  TASKS: 'ai_planner_tasks',
  SETTINGS: 'ai_planner_settings',
  USER_PROFILE: 'ai_planner_user'
};

/**
 * Save data to localStorage with the given key
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 */
export const saveToStorage = (key, data) => {
  try {
    const jsonData = JSON.stringify(data);
    localStorage.setItem(key, jsonData);
    console.log(`Data saved to ${key}`);
    return true;
  } catch (error) {
    console.error(`Error saving data to ${key}:`, error);
    return false;
  }
};

/**
 * Load data from localStorage with the given key
 * @param {string} key - Storage key
 * @returns {any} - Parsed data or null if not found
 */
export const loadFromStorage = (key) => {
  try {
    const jsonData = localStorage.getItem(key);
    if (!jsonData) return null;
    return JSON.parse(jsonData);
  } catch (error) {
    console.error(`Error loading data from ${key}:`, error);
    return null;
  }
};

/**
 * Save extracted emails to storage
 * @param {Array} emails - Array of email objects
 */
export const saveEmails = (emails) => {
  return saveToStorage(STORAGE_KEYS.EMAILS, emails);
};

/**
 * Load extracted emails from storage
 * @returns {Array} - Array of email objects or empty array if not found
 */
export const loadEmails = () => {
  return loadFromStorage(STORAGE_KEYS.EMAILS) || [];
};

/**
 * Save tasks to storage
 * @param {Array} tasks - Array of task objects
 */
export const saveTasks = (tasks) => {
  return saveToStorage(STORAGE_KEYS.TASKS, tasks);
};

/**
 * Load tasks from storage
 * @returns {Array} - Array of task objects or empty array if not found
 */
export const loadTasks = () => {
  return loadFromStorage(STORAGE_KEYS.TASKS) || [];
};

/**
 * Save application settings to storage
 * @param {Object} settings - Settings object
 */
export const saveSettings = (settings) => {
  return saveToStorage(STORAGE_KEYS.SETTINGS, settings);
};

/**
 * Load application settings from storage
 * @returns {Object} - Settings object or default settings if not found
 */
export const loadSettings = () => {
  return loadFromStorage(STORAGE_KEYS.SETTINGS) || getDefaultSettings();
};

/**
 * Save user profile to storage
 * @param {Object} userProfile - User profile object
 */
export const saveUserProfile = (userProfile) => {
  return saveToStorage(STORAGE_KEYS.USER_PROFILE, userProfile);
};

/**
 * Load user profile from storage
 * @returns {Object} - User profile object or null if not found
 */
export const loadUserProfile = () => {
  return loadFromStorage(STORAGE_KEYS.USER_PROFILE) || null;
};

/**
 * Get default settings
 * @returns {Object} - Default settings object
 */
export const getDefaultSettings = () => {
  return {
    emailSettings: {
      enabled: true,
      intervalMinutes: 60,
      extractOnStartup: true,
      maxEmailsToProcess: 50
    },
    notificationSettings: {
      taskExtraction: true,
      taskReminders: true,
      systemNotifications: true,
      sound: true,
      desktopNotifications: true
    }
  };
};

/**
 * Clear all stored data
 */
export const clearAllData = () => {
  localStorage.removeItem(STORAGE_KEYS.EMAILS);
  localStorage.removeItem(STORAGE_KEYS.TASKS);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  console.log('All stored data cleared');
};

/**
 * Export all data as a JSON file for download
 */
export const exportAllData = () => {
  try {
    const allData = {
      emails: loadEmails(),
      tasks: loadTasks(),
      settings: loadSettings(),
      userProfile: loadUserProfile()
    };
    
    const jsonData = JSON.stringify(allData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai_planner_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    return true;
  } catch (error) {
    console.error('Error exporting data:', error);
    return false;
  }
};

/**
 * Import data from a JSON file
 * @param {File} file - JSON file to import
 * @returns {Promise<boolean>} - True if import was successful
 */
export const importDataFromFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        // Validate data structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid data format');
        }
        
        // Import each data type if available
        if (data.emails && Array.isArray(data.emails)) {
          saveEmails(data.emails);
        }
        
        if (data.tasks && Array.isArray(data.tasks)) {
          saveTasks(data.tasks);
        }
        
        if (data.settings && typeof data.settings === 'object') {
          saveSettings(data.settings);
        }
        
        if (data.userProfile && typeof data.userProfile === 'object') {
          saveUserProfile(data.userProfile);
        }
        
        resolve(true);
      } catch (error) {
        console.error('Error importing data:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      reject(error);
    };
    
    reader.readAsText(file);
  });
};
