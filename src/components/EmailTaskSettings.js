import React, { useState, useEffect } from 'react';
import { loadSettings as loadSettingsFromManager, saveSettings as saveSettingsToManager } from '../services/settingsManager';
import { runEmailExtraction } from '../services/emailScheduler';
import { 
  saveEmails, 
  loadEmails, 
  saveTasks, 
  loadTasks, 
  saveSettings, 
  loadSettings, 
  saveUserProfile, 
  loadUserProfile,
  exportAllData,
  importDataFromFile
} from '../services/storageService';
import { analyzeEmails } from '../services/taskAnalyzer';
import { Paper, Typography, Box, Button, List, ListItem, ListItemText, Divider, CircularProgress } from '@mui/material';

/**
 * Component for configuring email extraction and notification settings
 */
const EmailTaskSettings = () => {
  // State for email extraction settings
  const [emailSettings, setEmailSettings] = useState({
    enabled: true,
    intervalMinutes: 60,
    extractOnStartup: true,
    maxEmailsToProcess: 50
  });

  // State for notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    taskExtraction: true,
    taskReminders: true,
    systemNotifications: true,
    sound: true,
    desktopNotifications: true
  });

  // State for status information
  const [status, setStatus] = useState({
    isRunning: false,
    lastRun: null,
    tasksExtracted: 0
  });
  
  // State for Gmail authentication
  const [isGmailAuthenticated, setIsGmailAuthenticated] = useState(false);
  
  // State for extracted emails
  const [extractedEmails, setExtractedEmails] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [fileInput, setFileInput] = useState(null);

  // Initialize services when component mounts
  useEffect(() => {
    // Load current settings
    loadCurrentSettings();
    
    // Load previously extracted emails
    const savedEmails = loadEmails();
    if (savedEmails && savedEmails.length > 0) {
      setExtractedEmails(savedEmails);
    }
    
    // Load user profile
    const savedUserProfile = loadUserProfile();
    if (savedUserProfile) {
      setUserProfile(savedUserProfile);
      setIsGmailAuthenticated(!!savedUserProfile.gmailToken);
    }
    
    // Load Gmail API client if not already loaded
    if (!window.gapiLoaded) {
      loadGapiAndInitialize();
    }
    
    // Create file input element for importing data
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    input.addEventListener('change', handleFileImport);
    document.body.appendChild(input);
    setFileInput(input);
    
    // Cleanup
    return () => {
      if (input && input.parentNode) {
        input.parentNode.removeChild(input);
      }
    };
  }, []);

  // Load the Google API JavaScript client library
  const loadGapiAndInitialize = () => {
    // Constants from index.html
    const CLIENT_ID = '233852782558-clap8gucqoj6a38ltesa6tbiq1dsc82c.apps.googleusercontent.com';
    const API_KEY = 'AIzaSyAdH_NTi6u23cwiDpPbJKWdSxP_GbD3rIc';
    const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"];
    const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';
    
    // Check if scripts are already loaded
    if (document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
      return; // Already loaded
    }
    
    // Create and load the Google API script
    const script1 = document.createElement('script');
    script1.src = 'https://apis.google.com/js/api.js';
    script1.async = true;
    script1.defer = true;
    script1.onload = () => {
      window.gapi.load('client', () => {
        window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        }).then(() => {
          console.log('GAPI client initialized');
          window.gapiInited = true;
          maybeEnableButtons();
        }).catch(error => {
          console.error('Error initializing GAPI client', error);
        });
      });
    };
    
    // Create and load the Google Identity Services script
    const script2 = document.createElement('script');
    script2.src = 'https://accounts.google.com/gsi/client';
    script2.async = true;
    script2.defer = true;
    script2.onload = () => {
      window.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
      });
      window.gisInited = true;
      maybeEnableButtons();
    };
    
    // Add scripts to document
    document.body.appendChild(script1);
    document.body.appendChild(script2);
    
    // Flag to prevent multiple loads
    window.gapiLoaded = true;
  };
  
  // Enable buttons when both APIs are loaded
  const maybeEnableButtons = () => {
    if (window.gapiInited && window.gisInited) {
      console.log('Both APIs initialized, ready for authentication');
    }
  };
  
  // Handle Gmail authentication
  const handleGmailAuth = () => {
    if (!window.tokenClient) {
      alert('Gmail API is not initialized yet. Please try again in a moment.');
      return;
    }
    
    window.tokenClient.callback = async (resp) => {
      if (resp.error !== undefined) {
        throw (resp);
      }
      
      // Save authentication state
      setIsGmailAuthenticated(true);
      
      // Save user profile with token
      const token = window.gapi.client.getToken();
      const newUserProfile = {
        gmailToken: token,
        lastLogin: new Date().toISOString(),
        email: '' // We'll get this from the user info if possible
      };
      
      // Try to get user email
      try {
        const response = await window.gapi.client.gmail.users.getProfile({
          'userId': 'me'
        });
        if (response && response.result && response.result.emailAddress) {
          newUserProfile.email = response.result.emailAddress;
        }
      } catch (error) {
        console.error('Error getting user profile:', error);
      }
      
      // Save user profile
      saveUserProfile(newUserProfile);
      setUserProfile(newUserProfile);
      
      console.log('Successfully authenticated with Gmail');
    };
    
    if (window.gapi.client.getToken() === null) {
      window.tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
      window.tokenClient.requestAccessToken({prompt: ''});
      setIsGmailAuthenticated(true);
      
      // Update user profile with last login
      if (userProfile) {
        const updatedProfile = {
          ...userProfile,
          lastLogin: new Date().toISOString()
        };
        saveUserProfile(updatedProfile);
        setUserProfile(updatedProfile);
      }
    }
  };

  // Load current settings from services
  const loadCurrentSettings = async () => {
    try {
      // First try to load from storage service (localStorage)
      let savedSettings = loadSettings();
      
      // If not found, try to load from settings manager
      if (!savedSettings) {
        savedSettings = loadSettingsFromManager();
      }
      
      if (savedSettings) {
        setEmailSettings(savedSettings.emailSettings);
        setNotificationSettings(savedSettings.notificationSettings);
        
        // Update status
        setStatus({
          isRunning: savedSettings.emailSettings?.enabled || false,
          lastRun: savedSettings.emailSettings?.lastRun || null,
          tasksExtracted: loadTasks().length || 0
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };
  
  // Handle file import
  const handleFileImport = async (event) => {
    try {
      if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        await importDataFromFile(file);
        
        // Reload data after import
        loadCurrentSettings();
        const savedEmails = loadEmails();
        if (savedEmails && savedEmails.length > 0) {
          setExtractedEmails(savedEmails);
        }
        
        const savedUserProfile = loadUserProfile();
        if (savedUserProfile) {
          setUserProfile(savedUserProfile);
        }
        
        alert('Data imported successfully!');
      }
    } catch (error) {
      console.error('Error importing data:', error);
      alert(`Error importing data: ${error.message}`);
    }
  };
  
  // Trigger file import dialog
  const triggerImport = () => {
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  };
  
  // Export data
  const handleExport = () => {
    if (exportAllData()) {
      alert('Data exported successfully!');
    } else {
      alert('Error exporting data. Please try again.');
    }
  };

  // Handle email settings changes
  const handleEmailSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : 
                    type === 'number' ? parseInt(value, 10) : 
                    value;
    
    setEmailSettings(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  // Handle notification settings changes
  const handleNotificationSettingChange = (e) => {
    const { name, checked } = e.target;
    
    setNotificationSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Save email settings
  const saveEmailSettings = () => {
    try {
      const settingsToSave = {
        emailSettings,
        notificationSettings
      };
      
      // Save settings to localStorage
      saveSettings(settingsToSave);
      
      // Also save to settings manager for compatibility
      saveSettingsToManager(settingsToSave);
      
      // Update status
      setStatus(prev => ({
        ...prev,
        isRunning: emailSettings.enabled
      }));
      
      alert('Email extraction settings saved!');
    } catch (error) {
      console.error('Error saving email settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  // Save notification settings
  const saveNotificationSettings = () => {
    try {
      const settingsToSave = {
        emailSettings,
        notificationSettings
      };
      
      // Save settings to localStorage
      saveSettings(settingsToSave);
      
      // Also save to settings manager for compatibility
      saveSettingsToManager(settingsToSave);
      
      alert('Notification settings saved!');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  // Run email extraction manually
  const runManualExtraction = async () => {
    try {
      setIsExtracting(true);
      setStatus(prev => ({ ...prev, isRunning: true }));
      
      // Check if gapi is available and authenticated
      if (!window.gapi || !window.gapi.client || !window.gapi.client.gmail) {
        throw new Error('Gmail API not available. Please make sure you are logged in with Gmail.');
      }
      
      if (!isGmailAuthenticated) {
        throw new Error('Please authenticate with Gmail first by clicking the \'Connect with Gmail\' button.');
      }

      // Get the list of messages
      const response = await window.gapi.client.gmail.users.messages.list({
        'userId': 'me',
        'maxResults': emailSettings.maxEmailsToProcess || 10
      });

      const messages = response.result.messages;
      if (!messages || messages.length === 0) {
        setExtractedEmails([]);
        throw new Error('No emails found in your Gmail account.');
      }

      // For each message, get the full message details
      const fetchedEmails = [];
      
      for (const message of messages) {
        const emailResponse = await window.gapi.client.gmail.users.messages.get({
          'userId': 'me',
          'id': message.id
        });

        const email = emailResponse.result;
        const headers = email.payload.headers;

        // Extract email details
        let from = headers.find(header => header.name === 'From')?.value || 'Unknown';
        const to = headers.find(header => header.name === 'To')?.value || '';
        const subject = headers.find(header => header.name === 'Subject')?.value || '(No Subject)';
        const date = new Date(parseInt(email.internalDate));

        // Clean up sender name
        if (from.includes('<')) {
          from = from.split('<')[0].trim();
          if (from.endsWith('"')) {
            from = from.slice(0, -1);
          }
          if (from.startsWith('"')) {
            from = from.slice(1);
          }
        }

        // Get the email body
        let body = '';
        if (email.payload.parts) {
          // Handle multipart message
          for (const part of email.payload.parts) {
            if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
              body = decodeEmailBody(part.body.data);
              break;
            }
          }
        } else if (email.payload.body.data) {
          // Handle single part message
          body = decodeEmailBody(email.payload.body.data);
        }

        // Create email object
        const emailObj = {
          id: message.id,
          subject,
          sender: from,
          recipient: to,
          receivedDate: date.toISOString(),
          snippet: email.snippet,
          body
        };

        // Add email to our collection for analysis
        fetchedEmails.push(emailObj);
      }
      
      // Helper function to decode email body from base64
      function decodeEmailBody(data) {
        const decodedBody = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
        return decodedBody;
      }

      // Save the extracted emails to localStorage
      saveEmails(fetchedEmails);
      setExtractedEmails(fetchedEmails);
      
      // Analyze emails to extract tasks with proper priorities and due dates
      const analyzedTasks = analyzeEmails(fetchedEmails);
      
      // Add extracted tasks to emails for display
      fetchedEmails.forEach((email, index) => {
        if (index < analyzedTasks.length) {
          email.extractedTask = analyzedTasks[index];
        }
      });
      
      // Save the updated emails with tasks
      saveEmails(fetchedEmails);
      
      // Save the extracted tasks
      saveTasks(analyzedTasks);
      
      // Also call the task extractor service for additional processing if needed
      await runEmailExtraction(fetchedEmails);
      
      // Update the last run time in settings
      const now = new Date();
      const updatedEmailSettings = {
        ...emailSettings,
        lastRun: now.toISOString()
      };
      
      setEmailSettings(updatedEmailSettings);
      
      // Save updated settings
      saveSettings({
        emailSettings: updatedEmailSettings,
        notificationSettings
      });
      
      setStatus({
        isRunning: emailSettings.enabled,
        lastRun: now,
        tasksExtracted: analyzedTasks.length
      });
    } catch (error) {
      console.error('Error running manual extraction:', error);
      alert('Failed to run extraction: ' + error.message);
      
      setStatus(prev => ({ 
        ...prev, 
        isRunning: emailSettings.enabled 
      }));
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Email Task Extraction Settings
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" component="h3" gutterBottom>
          Email Extraction
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <label>
            <input 
              type="checkbox" 
              name="enabled" 
              checked={emailSettings.enabled} 
              onChange={handleEmailSettingChange} 
            />
            Enable automatic email extraction
          </label>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <label>
            Check interval (minutes):
            <input 
              type="number" 
              name="intervalMinutes" 
              value={emailSettings.intervalMinutes} 
              onChange={handleEmailSettingChange} 
              min="5" 
              max="1440" 
              disabled={!emailSettings.enabled}
            />
          </label>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <label>
            <input 
              type="checkbox" 
              name="extractOnStartup" 
              checked={emailSettings.extractOnStartup} 
              onChange={handleEmailSettingChange} 
              disabled={!emailSettings.enabled}
            />
            Extract emails on application startup
          </label>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <label>
            Maximum emails to process per run:
            <input 
              type="number" 
              name="maxEmailsToProcess" 
              value={emailSettings.maxEmailsToProcess} 
              onChange={handleEmailSettingChange} 
              min="10" 
              max="500" 
              disabled={!emailSettings.enabled}
            />
          </label>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button variant="contained" color="primary" onClick={saveEmailSettings}>
            Save Email Settings
          </Button>
          {!isGmailAuthenticated ? (
            <Button
              variant="contained"
              color="secondary"
              onClick={handleGmailAuth}
            >
              Connect with Gmail
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="secondary" 
              onClick={runManualExtraction} 
              disabled={isExtracting}
              startIcon={isExtracting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isExtracting ? 'Extracting...' : 'Run Extraction Now'}
            </Button>
          )}
        </Box>
      </Paper>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" component="h3" gutterBottom>
          Notification Settings
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <label>
            <input 
              type="checkbox" 
              name="taskExtraction" 
              checked={notificationSettings.taskExtraction} 
              onChange={handleNotificationSettingChange} 
            />
            Notify when tasks are extracted from emails
          </label>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <label>
            <input 
              type="checkbox" 
              name="taskReminders" 
              checked={notificationSettings.taskReminders} 
              onChange={handleNotificationSettingChange} 
            />
            Enable task reminder notifications
          </label>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <label>
            <input 
              type="checkbox" 
              name="systemNotifications" 
              checked={notificationSettings.systemNotifications} 
              onChange={handleNotificationSettingChange} 
            />
            Enable system notifications
          </label>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <label>
            <input 
              type="checkbox" 
              name="sound" 
              checked={notificationSettings.sound} 
              onChange={handleNotificationSettingChange} 
            />
            Play sound with notifications
          </label>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <label>
            <input 
              type="checkbox" 
              name="desktopNotifications" 
              checked={notificationSettings.desktopNotifications} 
              onChange={handleNotificationSettingChange} 
            />
            Show desktop notifications
          </label>
        </Box>
        
        <Button variant="contained" color="primary" onClick={saveNotificationSettings}>
          Save Notification Settings
        </Button>
      </Paper>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" component="h3" gutterBottom>
          Status
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography><strong>Extraction Service:</strong> {status.isRunning ? 'Running' : 'Stopped'}</Typography>
          <Typography><strong>Last Run:</strong> {status.lastRun ? new Date(status.lastRun).toLocaleString() : 'Never'}</Typography>
          <Typography><strong>Tasks Extracted:</strong> {status.tasksExtracted}</Typography>
          {userProfile && userProfile.email && (
            <Typography><strong>Gmail Account:</strong> {userProfile.email}</Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" color="primary" onClick={handleExport}>
            Export Data
          </Button>
          <Button variant="outlined" color="primary" onClick={triggerImport}>
            Import Data
          </Button>
        </Box>
      </Paper>
      
      {/* Extracted Emails Section */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" component="h3" gutterBottom>
          Extracted Emails
        </Typography>
        
        {isExtracting ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : extractedEmails.length > 0 ? (
          <List>
            {extractedEmails.map((email) => (
              <React.Fragment key={email.id}>
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={email.subject}
                    secondary={
                      <React.Fragment>
                        <Typography component="span" variant="body2" color="text.primary">
                          From: {email.sender}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2">
                          Received: {new Date(email.receivedDate).toLocaleString()}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2">
                          {email.snippet}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2" color="primary">
                          Extracted Task: {email.extractedTask.title}
                        </Typography>
                      </React.Fragment>
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Typography variant="body1" sx={{ p: 2 }}>
            No emails have been extracted yet. Click "Run Extraction Now" to extract tasks from your emails.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default EmailTaskSettings;