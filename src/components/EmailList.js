import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import RefreshIcon from '@mui/icons-material/Refresh';

const EmailList = ({ emails, onExtractEmails, loading }) => {
  return (
    <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" component="h2">
          Extracted Emails
        </Typography>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
          onClick={onExtractEmails}
          disabled={loading}
        >
          {loading ? 'Extracting...' : 'Extract Emails'}
        </Button>
      </Box>

      {emails.length === 0 ? (
        <Typography variant="body1" color="text.secondary" align="center">
          No emails extracted yet. Click the button above to start.
        </Typography>
      ) : (
        <List>
          {emails.map((email, index) => {
            const subject = email.payload.headers.find(header => header.name === 'Subject')?.value || '(No Subject)';
            const from = email.payload.headers.find(header => header.name === 'From')?.value || 'Unknown Sender';
            
            return (
              <React.Fragment key={email.id}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EmailIcon color="action" fontSize="small" />
                        <Typography variant="subtitle1">{subject}</Typography>
                      </Box>
                    }
                    secondary={from}
                  />
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      )}
    </Paper>
  );
};

export default EmailList;