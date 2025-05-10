import { useState } from 'react';

export const useSettings = () => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('appSettings');
      return saved ? JSON.parse(saved) : {
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
    } catch {
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
    }
  });

  const saveSettings = (newSettings) => {
    try {
      localStorage.setItem('appSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  };

  return [settings, saveSettings];
};

export const saveSettings = (newSettings) => {
  try {
    localStorage.setItem('appSettings', JSON.stringify(newSettings));
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
};

export const loadSettings = () => {
  try {
    return JSON.parse(localStorage.getItem('appSettings'));
  } catch (error) {
    console.error('Error loading settings:', error);
    return null;
  }
};

export const resetSettings = () => {
  localStorage.removeItem('appSettings');
};