import { formatISO } from 'date-fns';

// Hugging Face API endpoint and token
const HF_API_URL = 'https://api-inference.huggingface.co/models/google/flan-t5-base';
const HF_API_TOKEN = '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';

/**
 * Extract tasks from email content using Hugging Face NLP model
 * @param {string} emailContent - The content of the email
 * @returns {Promise<Object>} - Task details extracted from the email
 */
async function extractTaskFromContent(emailContent) {
  try {
    // Task identification and priority prompt
    const taskPrompt = `Analyze this text and extract:
1. The main task or to-do item
2. Priority level (CRITICAL/HIGH/MEDIUM/LOW) based on urgency words and context
3. Time constraints (specific start and end times)
4. Hard deadline if mentioned

If there's no task, respond with 'No task found'.

Text: ${emailContent}`;
    
    const taskResponse = await callHuggingFaceAPI(taskPrompt);
    
    if (taskResponse.includes('No task found')) {
      return null;
    }
    
    // Parse the structured response
    const responseLines = taskResponse.split('\n').map(line => line.trim());
    const taskTitle = responseLines[0];
    
    // Extract priority level
    const priorityMap = {
      'CRITICAL': 5,
      'HIGH': 4,
      'MEDIUM': 3,
      'LOW': 2,
      'NONE': 1
    };
    
    const priorityMatch = taskResponse.match(/Priority.*?:\s*(CRITICAL|HIGH|MEDIUM|LOW)/i);
    const urgencyLevel = priorityMatch ? priorityMap[priorityMatch[1].toUpperCase()] : 3;
    
    // Extract time constraints
    const timeMatch = taskResponse.match(/Time.*?:\s*(.+)/i);
    let startTime = null;
    let endTime = null;
    
    if (timeMatch) {
      const timeStr = timeMatch[1];
      const timeRangeMatch = timeStr.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
      
      if (timeRangeMatch) {
        const [_, startStr, endStr] = timeRangeMatch;
        const today = new Date();
        
        // Parse start time
        const startParts = startStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
        if (startParts) {
          let [__, hours, minutes, period] = startParts;
          hours = parseInt(hours);
          if (period.toLowerCase() === 'pm' && hours !== 12) hours += 12;
          if (period.toLowerCase() === 'am' && hours === 12) hours = 0;
          startTime = new Date(today);
          startTime.setHours(hours, minutes ? parseInt(minutes) : 0, 0, 0);
        }
        
        // Parse end time
        const endParts = endStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
        if (endParts) {
          let [__, hours, minutes, period] = endParts;
          hours = parseInt(hours);
          if (period.toLowerCase() === 'pm' && hours !== 12) hours += 12;
          if (period.toLowerCase() === 'am' && hours === 12) hours = 0;
          endTime = new Date(today);
          endTime.setHours(hours, minutes ? parseInt(minutes) : 0, 0, 0);
        }
      }
    }
    
    // Extract deadline
    const deadlineMatch = taskResponse.match(/Deadline.*?:\s*(.+)/i);
    let dueDate = null;
    
    if (deadlineMatch) {
      const deadlineStr = deadlineMatch[1];
      const dateMatch = deadlineStr.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+ \d{1,2}(?:st|nd|rd|th)?, \d{4}|\w+ \d{1,2}(?:st|nd|rd|th)?|tomorrow|today|next \w+/i);
      if (dateMatch) {
        dueDate = parseDateFromText(dateMatch[0]);
      }
    }
    
    // Categorize the task
    const categoryPrompt = `Categorize this task into one of these categories: Work, Personal, Shopping, Health, Finance, Education, Other: ${taskTitle}`;
    const categoryResponse = await callHuggingFaceAPI(categoryPrompt);
    const category = categoryResponse.trim();
    
    return {
      id: generateTaskId(),
      title: taskTitle,
      description: emailContent.substring(0, 200) + (emailContent.length > 200 ? '...' : ''),
      dueDate: dueDate ? formatISO(dueDate) : null,
      startTime: dueDate ? formatISO(dueDate) : null,
      endTime: dueDate ? formatISO(new Date(dueDate.getTime() + 60 * 60 * 1000)) : null, // Default 1 hour duration
      urgencyLevel,
      category,
      status: 'pending',
      createdAt: formatISO(new Date()),
      source: 'email'
    };
  } catch (error) {
    console.error('Error extracting task:', error);
    throw new Error('Failed to extract task information');
  }
}

/**
 * Extract tasks from a list of emails
 * @param {Array} emails - List of email objects from Gmail API
 * @returns {Promise<Array>} - List of extracted tasks
 */
export async function extractTasksFromEmails(emails) {
  const tasks = [];
  
  for (const email of emails) {
    try {
      // Extract email content
      let emailContent = '';
      
      if (email.payload.parts) {
        // Handle multipart message
        for (const part of email.payload.parts) {
          if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
            emailContent = decodeEmailBody(part.body.data);
            break;
          }
        }
      } else if (email.payload.body.data) {
        // Handle single part message
        emailContent = decodeEmailBody(email.payload.body.data);
      }
      
      // Get email subject
      const headers = email.payload.headers;
      const subject = headers.find(header => header.name === 'Subject')?.value || '(No Subject)';
      
      // Combine subject and content for better task extraction
      const fullContent = `${subject}\n\n${emailContent}`;
      
      // Extract task from email content
      const task = await extractTaskFromContent(fullContent);
      if (task) {
        // Add email ID as reference
        task.emailId = email.id;
        tasks.push(task);
      }
    } catch (error) {
      console.error(`Error processing email ${email.id}:`, error);
      // Continue with next email
    }
  }
  
  return tasks;
}

/**
 * Call the Hugging Face API with a prompt
 * @param {string} prompt - The prompt to send to the API
 * @returns {Promise<string>} - The model's response
 */
async function callHuggingFaceAPI(prompt) {
  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_API_TOKEN}`
      },
      body: JSON.stringify({
        inputs: prompt
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result[0].generated_text : result.generated_text;
  } catch (error) {
    console.error('Error calling Hugging Face API:', error);
    throw new Error('Failed to process with NLP model');
  }
}

/**
 * Helper function to decode email body from base64
 * @param {string} data - Base64 encoded email body
 * @returns {string} - Decoded email body
 */
function decodeEmailBody(data) {
  return atob(data.replace(/-/g, '+').replace(/_/g, '/'));
}

/**
 * Parse date from various text formats
 * @param {string} dateText - Date in text format
 * @returns {Date} - JavaScript Date object
 */
function parseDateFromText(dateText) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Handle relative dates
  if (dateText.toLowerCase() === 'today') {
    return today;
  } else if (dateText.toLowerCase() === 'tomorrow') {
    return tomorrow;
  } else if (dateText.toLowerCase().includes('next')) {
    const nextDate = new Date(today);
    if (dateText.toLowerCase().includes('week')) {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (dateText.toLowerCase().includes('month')) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    return nextDate;
  }
  
  // Try to parse with Date constructor
  const parsedDate = new Date(dateText);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }
  
  // Default to a week from now if parsing fails
  const defaultDate = new Date(today);
  defaultDate.setDate(defaultDate.getDate() + 7);
  return defaultDate;
}

/**
 * Generate a unique ID for a task
 * @returns {string} - Unique ID
 */
function generateTaskId() {
  return 'task_' + Math.random().toString(36).substr(2, 9);
}