import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Collapse,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';

const TextInputTask = ({ onTextSubmit, isProcessing }) => {
  const [inputText, setInputText] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  const handleSubmit = () => {
    if (!inputText.trim()) {
      setAlert({
        show: true,
        message: 'Please enter some text to generate tasks',
        severity: 'warning'
      });
      return;
    }
    
    onTextSubmit(inputText);
    setInputText('');
    setAlert({
      show: true,
      message: 'Processing your text to extract tasks...',
      severity: 'info'
    });
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Generate Tasks from Text
        </Typography>
      </Box>
      
      <Collapse in={alert.show}>
        <Alert 
          severity={alert.severity}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setAlert({ ...alert, show: false })}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
          sx={{ mb: 2 }}
        >
          {alert.message}
        </Alert>
      </Collapse>

      <TextField
        fullWidth
        multiline
        rows={4}
        label="Enter text to generate tasks"
        placeholder="Example: I need to prepare a presentation for the meeting on Monday at 2pm, and buy groceries tomorrow morning."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        variant="outlined"
        sx={{ mb: 2 }}
      />

      <Button
        variant="contained"
        color="primary"
        endIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        onClick={handleSubmit}
        disabled={isProcessing}
        fullWidth
      >
        {isProcessing ? 'Processing...' : 'Generate Tasks'}
      </Button>
    </Paper>
  );
};

export default TextInputTask;