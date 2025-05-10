# AI Planner Email Extraction Feature

## Overview
This document provides information about the new email extraction and notification features added to the AI Planner application.

## New Features

### 1. Automated Email Task Extraction
The application now automatically extracts tasks from your emails at regular intervals.

- **Configurable Interval**: You can set how frequently the system checks for new emails (default: every 60 minutes)
- **Smart Task Detection**: The AI analyzes email content to identify tasks, deadlines, priorities, and categories
- **Background Processing**: Works silently in the background while you use the application

### 2. Task Notifications
Get notified when new tasks are extracted from your emails.

- **Desktop Notifications**: Receive system notifications when tasks are found
- **Customizable Settings**: Control which notifications you receive and how they're delivered
- **Sound Alerts**: Optional audio notifications when new tasks are detected

### 3. Enhanced AI Task Extraction
The AI task extraction system has been significantly improved.

- **Better Task Recognition**: More accurate identification of tasks in text
- **Improved Error Handling**: Fallback mechanisms ensure task extraction even when the primary AI service is unavailable
- **Backup Model Support**: Automatically switches to alternative AI models when needed
- **Retry Logic**: Handles temporary service disruptions gracefully

## How to Use

### Configuring Email Extraction
1. Navigate to the "Settings" tab in the application
2. Under "Email Extraction", enable or disable automatic extraction
3. Set the check interval (in minutes) to your preferred frequency
4. Choose whether to extract emails on application startup
5. Set the maximum number of emails to process per run
6. Click "Save Email Settings" to apply your changes

### Managing Notifications
1. In the "Settings" tab, find the "Notification Settings" section
2. Enable or disable notifications for different events:
   - Task extraction notifications
   - Task reminder notifications
   - System notifications
3. Choose whether to play sounds with notifications
4. Enable or disable desktop notifications
5. Click "Save Notification Settings" to apply your changes

### Manual Email Extraction
If you want to extract tasks from emails immediately:
1. Go to the "Settings" tab
2. Click the "Run Extraction Now" button
3. The system will process recent emails and notify you of any tasks found

## Technical Details

### Services Added
- **emailExtractor.js**: Core service for email extraction functionality
- **emailScheduler.js**: Manages the scheduling of email extraction
- **notificationService.js**: Handles all notification functionality

### AI Improvements
- Added retry logic with exponential backoff for API calls
- Implemented backup model support for better reliability
- Enhanced text analysis patterns for better task detection
- Improved error handling throughout the extraction process

### Gmail Integration
The email extraction feature requires Gmail authentication. Make sure to grant the necessary permissions when prompted.

## Troubleshooting

### Common Issues
- **No tasks being extracted**: Verify Gmail authentication is working correctly
- **Missing notifications**: Check browser notification permissions
- **Extraction not running**: Confirm the service is enabled in settings

### Logs
Check the browser console for detailed logs about the email extraction process and any errors that might occur.