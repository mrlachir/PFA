import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box, Typography, CircularProgress, Grid } from '@mui/material';
import EmailList from './components/EmailList';
import TaskCalendar from './components/TaskCalendar';
import TaskList from './components/TaskList';
import GmailLogin from './components/GmailLogin';
import { extractTasksFromEmails } from './services/taskExtractor';
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
  
  // Handle task updates
  const handleTaskUpdate = (updatedTask) => {
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Process emails to extract tasks when emails change
  useEffect(() => {
    const processTasks = async () => {
      if (emails.length > 0) {
        setLoading(true);
        try {
          const extractedTasks = await extractTasksFromEmails(emails);
          setTasks(extractedTasks);
        } catch (err) {
          setError('Error processing tasks: ' + err.message);
        } finally {
          setLoading(false);
        }
      }
    };

    processTasks();
  }, [emails]);

  // Handle successful Gmail authentication
  const handleAuthSuccess = (authResult) => {
    setIsAuthenticated(true);
    fetchEmails();
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
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            AI Planner
          </Typography>
          
          {!isAuthenticated ? (
            <GmailLogin onAuthSuccess={handleAuthSuccess} />
          ) : (
            <Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Typography color="error" align="center">{error}</Typography>
              ) : (
                <Box>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                      <TaskCalendar tasks={tasks.map(task => ({
                        ...task,
                        title: task.title || 'Failed to parse task',
                        description: task.description || 'Text extraction failed',
                        status: task.status || 'pending',
                        urgencyLevel: task.urgencyLevel || 3
                      }))} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TaskList 
                        tasks={tasks.map(task => ({
                          ...task,
                          title: task.title || 'Failed to parse task',
                          description: task.description || 'Text extraction failed',
                          status: task.status || 'pending',
                          urgencyLevel: task.urgencyLevel || 3
                        }))} 
                        onTaskUpdate={handleTaskUpdate}
                      />
                    </Grid>
                  </Grid>
                  <EmailList 
                    emails={emails}
                    onExtractEmails={fetchEmails}
                    loading={loading}
                  />
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;