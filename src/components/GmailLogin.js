import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, CircularProgress, Paper } from '@mui/material';

// Gmail API configuration
const CLIENT_ID = '233852782558-clap8gucqoj6a38ltesa6tbiq1dsc82c.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAdH_NTi6u23cwiDpPbJKWdSxP_GbD3rIc';

const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"];
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

const GmailLogin = ({ onAuthSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gapiReady, setGapiReady] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);

  // Initialize the Google API client
  useEffect(() => {
    // Load the Google API client library
    const loadGapiClient = () => {
      window.gapi.load('client', initializeGapiClient);
    };

    // Initialize the GAPI client with API key and discovery docs
    const initializeGapiClient = async () => {
      try {
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });
        setGapiReady(true);
      } catch (err) {
        setError('Error initializing Google API client: ' + err.message);
      }
    };

    // Initialize the Google Identity Services client
    const loadGisClient = () => {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: '', // Will be defined later
        });
        setTokenClient(tokenClient);
        setGisReady(true);
      } catch (err) {
        setError('Error initializing Google Identity Services: ' + err.message);
      }
    };

    // Check if the scripts are already loaded
    if (window.gapi) {
      loadGapiClient();
    } else {
      // Load the Google API JavaScript client library
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = loadGapiClient;
      document.body.appendChild(gapiScript);
    }

    if (window.google?.accounts?.oauth2) {
      loadGisClient();
    } else {
      // Load the Google Identity Services client
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.async = true;
      gisScript.defer = true;
      gisScript.onload = loadGisClient;
      document.body.appendChild(gisScript);
    }

    // Cleanup function
    return () => {
      // Remove scripts if they were added by this component
      const gapiScript = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
      if (gapiScript && gapiScript.parentNode) {
        gapiScript.parentNode.removeChild(gapiScript);
      }

      const gisScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (gisScript && gisScript.parentNode) {
        gisScript.parentNode.removeChild(gisScript);
      }
    };
  }, []);

  // Handle the login button click
  const handleAuthClick = () => {
    if (!gapiReady || !gisReady || !tokenClient) {
      setError('Google API not fully initialized. Please try again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Set the callback function for the token client
    tokenClient.callback = async (resp) => {
      if (resp.error !== undefined) {
        setError('Error during authentication: ' + resp.error);
        setIsLoading(false);
        return;
      }

      // Authentication successful
      setIsLoading(false);
      onAuthSuccess(resp);
    };

    // Request an access token
    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Connect to Gmail
      </Typography>
      <Typography variant="body1" paragraph>
        Connect to your Gmail account to extract tasks from your emails
      </Typography>
      
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      
      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAuthClick}
          disabled={isLoading || !gapiReady || !gisReady}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isLoading ? 'Connecting...' : 'Connect with Gmail'}
        </Button>
      </Box>
    </Paper>
  );
};

export default GmailLogin;