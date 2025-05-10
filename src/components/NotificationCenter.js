import React, { useState, useEffect } from 'react';
import {
  Box,
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  Paper,
  Snackbar,
  Alert,
  alpha,
  useTheme
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { format } from 'date-fns';

/**
 * Notification Center Component
 * Displays notifications in a dropdown and shows recent notifications as alerts
 */
const NotificationCenter = () => {
  const theme = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentAlert, setCurrentAlert] = useState(null);
  
  // Listen for custom notification events
  useEffect(() => {
    // Function to handle new notifications
    const handleNewNotification = (event) => {
      const notification = event.detail;
      
      // Add notification to the list
      setNotifications(prev => [
        {
          id: Date.now(),
          title: notification.title,
          message: notification.message,
          type: notification.type || 'info',
          timestamp: new Date(),
          read: false
        },
        ...prev
      ]);
      
      // Increment unread count
      setUnreadCount(prev => prev + 1);
      
      // Show alert for the notification
      setCurrentAlert({
        title: notification.title,
        message: notification.message,
        type: notification.type || 'info'
      });
    };
    
    // Add event listener
    window.addEventListener('app-notification', handleNewNotification);
    
    // Clean up
    return () => {
      window.removeEventListener('app-notification', handleNewNotification);
    };
  }, []);
  
  // Handle opening the notification center
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle closing the notification center
  const handleClose = () => {
    setAnchorEl(null);
    
    // Mark all as read when closing
    if (unreadCount > 0) {
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    }
  };
  
  // Handle clearing all notifications
  const handleClearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    setAnchorEl(null);
  };
  
  // Handle removing a single notification
  const handleRemoveNotification = (id) => {
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  // Handle closing the alert
  const handleAlertClose = () => {
    setCurrentAlert(null);
  };
  
  // Format timestamp
  const formatTime = (date) => {
    return format(date, 'MMM d, h:mm a');
  };
  
  // Determine if notification center is open
  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;
  
  return (
    <>
      {/* Notification Icon */}
      <IconButton
        aria-describedby={id}
        onClick={handleClick}
        size="large"
        sx={{ color: theme.palette.primary.main }}
      >
        <Badge badgeContent={unreadCount} color="error">
          {unreadCount > 0 ? <NotificationsActiveIcon /> : <NotificationsIcon />}
        </Badge>
      </IconButton>
      
      {/* Notification Popover */}
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 320,
            maxHeight: 400,
            overflow: 'hidden',
            borderRadius: 2
          }
        }}
      >
        {/* Notification Header */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Typography variant="h6" component="div">
            Notifications
            {unreadCount > 0 && (
              <Typography 
                component="span" 
                variant="caption" 
                sx={{ 
                  ml: 1, 
                  color: theme.palette.text.secondary,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  px: 1,
                  py: 0.5,
                  borderRadius: 1
                }}
              >
                {unreadCount} new
              </Typography>
            )}
          </Typography>
          
          {notifications.length > 0 && (
            <IconButton size="small" onClick={handleClearAll} title="Clear all notifications">
              <ClearAllIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
        
        {/* Notification List */}
        <List sx={{ p: 0, maxHeight: 320, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <ListItem sx={{ py: 4 }}>
              <ListItemText 
                primary="No notifications"
                secondary="You're all caught up!"
                primaryTypographyProps={{ align: 'center' }}
                secondaryTypographyProps={{ align: 'center' }}
              />
            </ListItem>
          ) : (
            notifications.map((notification) => (
              <React.Fragment key={notification.id}>
                <ListItem 
                  alignItems="flex-start"
                  sx={{
                    bgcolor: notification.read ? 'transparent' : alpha(theme.palette.primary.main, 0.05),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1)
                    }
                  }}
                  secondaryAction={
                    <IconButton 
                      edge="end" 
                      aria-label="delete" 
                      size="small"
                      onClick={() => handleRemoveNotification(notification.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" component="div">
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" component="span" color="text.primary">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" component="div" color="text.secondary" sx={{ mt: 0.5 }}>
                          {formatTime(notification.timestamp)}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))
          )}
        </List>
      </Popover>
      
      {/* Toast Notification */}
      <Snackbar 
        open={Boolean(currentAlert)} 
        autoHideDuration={6000} 
        onClose={handleAlertClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {currentAlert && (
          <Alert 
            onClose={handleAlertClose} 
            severity={currentAlert.type} 
            sx={{ width: '100%' }}
            variant="filled"
            elevation={6}
          >
            <Typography variant="subtitle2">{currentAlert.title}</Typography>
            <Typography variant="body2">{currentAlert.message}</Typography>
          </Alert>
        )}
      </Snackbar>
    </>
  );
};

// Helper function to dispatch notification events
export const showNotification = (title, message, type = 'info') => {
  const event = new CustomEvent('app-notification', {
    detail: { title, message, type }
  });
  window.dispatchEvent(event);
};

export default NotificationCenter;
