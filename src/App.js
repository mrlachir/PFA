import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box, Typography, CircularProgress, Grid, Tabs, Tab, AppBar, Toolbar } from '@mui/material';
import EmailList from './components/EmailList';
import TaskCalendar from './components/TaskCalendar';
import TaskList from './components/TaskList';
import GmailLogin from './components/GmailLogin';
import TextInputTask from './components/TextInputTask';
import EmailTaskSettings from './components/EmailTaskSettings';
import NotificationCenter, { showNotification } from './components/NotificationCenter';
import { extractTasksFromEmails } from './services/taskExtractor';
import { extractTasksFromText } from './services/extractTasksFromText';
import { initializeEmailScheduler } from './services/emailScheduler';
import { initializeNotifications } from './services/notificationService';
import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4285F4',
    },
    secondary: {
      main: '#EA4335',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emails, setEmails] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  
  // Handle task updates
  const handleTaskUpdate = (updatedTask) => {
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [textProcessing, setTextProcessing] = useState(false);

  // Initialize email extraction and notification services
  useEffect(() => {
    // Initialize notification service
    initializeNotifications();
    
    // Initialize email scheduler with default settings
    initializeEmailScheduler({
      enabled: true,
      intervalMinutes: 60,
      extractOnStartup: true
    });
  }, []);

  // Process emails to extract tasks when emails change
  useEffect(() => {
    const processTasks = async () => {
      if (emails.length > 0) {
        setLoading(true);
        try {
          const extractedTasks = await extractTasksFromEmails(emails);
          setTasks(prevTasks => [...prevTasks, ...extractedTasks]);
        } catch (err) {
          setError('Error processing tasks: ' + err.message);
        } finally {
          setLoading(false);
        }
      }
    };

    processTasks();
  }, [emails]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle successful Gmail authentication
  const handleAuthSuccess = (authResult) => {
    setIsAuthenticated(true);
    fetchEmails();
  };

  // Handle text input submission for task generation
  const handleTextSubmit = async (text) => {
    setTextProcessing(true);
    setError(null); // Clear any previous errors
    try {
      if (!text || text.trim() === '') {
        throw new Error('Please enter some text to generate tasks');
      }
      
      const extractedTasks = await extractTasksFromText(text);
      
      if (extractedTasks.length === 0) {
        throw new Error('No tasks could be identified in the provided text');
      }
      
      setTasks(prevTasks => [...prevTasks, ...extractedTasks]);
      // Clear error state if successful
      setError(null);
    } catch (err) {
      console.error('Text processing error:', err);
      setError('Error processing text: ' + err.message);
    } finally {
      setTextProcessing(false);
    }
  };

  // Fetch emails from Gmail API
  const fetchEmails = async () => {
    setLoading(true);
    try {
      // This will be implemented with the Gmail API
      const response = await window.gapi.client.gmail.users.messages.list({
        'userId': 'me',
        'maxResults': 20
      });

      const messages = response.result.messages;
      if (!messages || messages.length === 0) {
        setEmails([]);
        return;
      }

      // Fetch full email details for each message
      const fetchedEmails = [];
      for (const message of messages) {
        const emailResponse = await window.gapi.client.gmail.users.messages.get({
          'userId': 'me',
          'id': message.id
        });
        fetchedEmails.push(emailResponse.result);
      }

      setEmails(fetchedEmails);
    } catch (err) {
      setError('Error fetching emails: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            AI Planner
          </Typography>
          <NotificationCenter />
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>

          
          {!isAuthenticated ? (
            <GmailLogin onAuthSuccess={handleAuthSuccess} />
          ) : (
            <>
              <TextInputTask onTextSubmit={handleTextSubmit} isProcessing={textProcessing} />
              
              {error && (
                <Typography color="error" sx={{ mt: 2 }}>
                  {error}
                </Typography>
              )}
              
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
                <Tabs value={activeTab} onChange={handleTabChange} aria-label="app tabs">
                  <Tab label="Tasks" />
                  <Tab label="Settings" />
                </Tabs>
              </Box>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box sx={{ mt: 2 }}>
                  {activeTab === 0 && (
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <TaskList tasks={tasks} onTaskUpdate={handleTaskUpdate} />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TaskCalendar tasks={tasks} />
                      </Grid>
                    </Grid>
                  )}
                  
                  {activeTab === 1 && (
                    <EmailTaskSettings />
                  )}
                </Box>
              )}
            </>
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;