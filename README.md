# AI Planner

AI Planner is a smart task management application that extracts tasks from your Gmail emails using Hugging Face NLP models. It automatically categorizes and prioritizes tasks, displaying them in both calendar and list views.

## Features

- **Gmail Integration**: Connect to your Gmail account to extract tasks from emails
- **AI-Powered Task Extraction**: Uses Hugging Face NLP models to identify tasks in email content
- **Automatic Task Classification**: Determines task urgency, due dates, and categories
- **Calendar View**: Visualize tasks on a calendar interface
- **Task List**: View, filter, and sort tasks by various criteria
- **Local Storage**: Tasks are stored locally in your browser

## Technology Stack

- **Frontend**: React.js with Material-UI components
- **State Management**: React Context API
- **Email Integration**: Gmail API
- **NLP Processing**: Hugging Face API
- **Storage**: Browser localStorage (prototype version)

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository or download the source code

2. Navigate to the project directory
   ```
   cd ai-planner
   ```

3. Install dependencies
   ```
   npm install
   ```

4. Start the development server
   ```
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Click the "Connect with Gmail" button to authenticate with your Google account
2. Allow the necessary permissions to access your Gmail
3. The application will fetch your recent emails and extract tasks
4. View your tasks in the calendar or list view
5. Use the filters and sorting options to organize your tasks

## Project Structure

```
src/
├── components/         # React components
│   ├── GmailLogin.js   # Gmail authentication component
│   ├── TaskCalendar.js # Calendar view for tasks
│   └── TaskList.js     # List view for tasks
├── services/           # Service modules
│   ├── taskDatabase.js # Local storage service
│   └── taskExtractor.js # NLP task extraction service
├── App.js              # Main application component
├── index.js            # Application entry point
└── ...
```

## Future Enhancements

- Task editing and status updates
- Cloud storage integration
- Mobile application
- Enhanced NLP capabilities
- Email notifications for upcoming tasks
- Integration with other email providers

## Privacy

This application processes your emails locally in your browser. No email content is stored on any server. Task data is stored only in your browser's localStorage.

## License

MIT