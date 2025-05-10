import { formatISO } from 'date-fns';

// Helper functions copied from taskExtractor.js since they're not exported
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

function generateTaskId() {
  return 'task_' + Math.random().toString(36).substr(2, 9);
}

// Hugging Face API endpoint and token - same as in taskExtractor.js
const HF_API_URL = 'https://api-inference.huggingface.co/models/google/flan-t5-base';
const HF_API_TOKEN = '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';

// Backup model in case the primary model fails
const BACKUP_HF_API_URL = 'https://api-inference.huggingface.co/models/google/flan-t5-large';

// Maximum retries for API calls
const MAX_API_RETRIES = 3;

// Delay between retries (in milliseconds)
const RETRY_DELAY = 1000;

/**
 * Extract tasks from user-provided text input
 * @param {string} text - The text input from the user
 * @returns {Promise<Array>} - List of extracted tasks
 */
export async function extractTasksFromText(text) {
  try {
    if (!text || text.trim() === '') {
      console.warn('Empty text provided to extractTasksFromText');
      return [];
    }

    // Enhanced task identification and priority prompt with more context
    const taskPrompt = `Analyze this text and extract the following information in a structured format:

1. Task: The main task or to-do item (be specific and actionable)
2. Priority: Level (CRITICAL/HIGH/MEDIUM/LOW) based on urgency words, deadlines, and context
3. Time: Any specific start and end times mentioned (in format like "9:00am to 11:00am")
4. Deadline: Any hard deadline mentioned (specific date or relative like "tomorrow")
5. Context: Any additional context that helps understand the task better

If there are multiple tasks, focus on the most important one.
If there's no task, respond with 'No task found'.

Text: ${text}`;
    
    let taskResponse;
    try {
      taskResponse = await callHuggingFaceAPI(taskPrompt);
    } catch (apiError) {
      console.error('API call failed, using fallback extraction:', apiError);
      return extractTasksWithFallback(text);
    }
    
    if (!taskResponse || taskResponse.includes('No task found')) {
      console.log('No task found in the text');
      return [];
    }
    
    // Parse the structured response
    const responseLines = taskResponse.split('\n').map(line => line.trim());
    const taskTitle = responseLines[0] || 'Task from text input';
    
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
    let category = 'Other'; // Default category
    try {
      const categoryPrompt = `Categorize this task into one of these categories: Work, Personal, Shopping, Health, Finance, Education, Other: ${taskTitle}`;
      const categoryResponse = await callHuggingFaceAPI(categoryPrompt);
      if (categoryResponse && categoryResponse.trim()) {
        category = categoryResponse.trim();
      }
    } catch (categoryError) {
      console.warn('Failed to categorize task, using default category:', categoryError);
      // Continue with default category
    }
    
    const task = {
      id: generateTaskId(),
      title: taskTitle,
      description: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
      dueDate: dueDate ? formatISO(dueDate) : null,
      startTime: startTime ? formatISO(startTime) : null,
      endTime: endTime ? formatISO(endTime) : null,
      urgencyLevel,
      category,
      status: 'pending',
      createdAt: formatISO(new Date()),
      source: 'text-input'
    };
    
    return [task];
  } catch (error) {
    console.error('Error extracting task from text:', error);
    throw new Error('Failed to extract task information from text');
  }
}

/**
 * Fallback function to extract tasks when the API call fails
 * Uses simple regex patterns to identify potential tasks
 * @param {string} text - The text input from the user
 * @returns {Array} - List of extracted tasks
 */
/**
 * Enhanced fallback function to extract tasks when the API call fails
 * Uses more sophisticated regex patterns and heuristics to identify potential tasks
 * @param {string} text - The text input from the user
 * @returns {Array} - List of extracted tasks
 */
function extractTasksWithFallback(text) {
  console.log('Using enhanced fallback extraction method for text:', text.substring(0, 50) + '...');
  
  try {
    // Enhanced regex patterns to find potential task statements
    const taskPatterns = [
      // Direct task indicators
      /I need to ([^.,;!?]+)/i,
      /have to ([^.,;!?]+)/i,
      /must ([^.,;!?]+)/i,
      /should ([^.,;!?]+)/i,
      /don't forget to ([^.,;!?]+)/i,
      /remember to ([^.,;!?]+)/i,
      /going to ([^.,;!?]+)/i,
      /plan(?:ning)? to ([^.,;!?]+)/i,
      
      // Task with deadline indicators
      /([^.,;!?]+) by ([^.,;!?]+)/i,
      /([^.,;!?]+) due (?:on|by) ([^.,;!?]+)/i,
      /([^.,;!?]+) before ([^.,;!?]+)/i,
      
      // Imperative statements (often tasks)
      /^([A-Z][^.,;!?]+)[.!]?$/im,
      
      // Meeting or appointment indicators
      /meeting (?:about|on|for) ([^.,;!?]+)/i,
      /appointment (?:with|for) ([^.,;!?]+)/i,
      /call (?:with|to) ([^.,;!?]+)/i
    ];
    
    let taskTitle = null;
    let deadlineHint = null;
    
    // Try each pattern until we find a match
    for (const pattern of taskPatterns) {
      const match = text.match(pattern);
      if (match) {
        // For patterns with deadline hints (the ones with two capture groups)
        if (match[2]) {
          taskTitle = match[1].trim();
          deadlineHint = match[2].trim();
        } else if (match[1]) {
          taskTitle = match[1].trim();
        }
        
        if (taskTitle) break;
      }
    }
    
    // If no pattern matched, use the first sentence or the whole text
    if (!taskTitle) {
      const firstSentence = text.split(/[.!?]\s/)[0];
      taskTitle = firstSentence.length > 10 ? firstSentence : text.substring(0, Math.min(50, text.length));
    }
    
    // Look for date/time indicators
    const dateTimePatterns = {
      today: /today/i,
      tomorrow: /tomorrow/i,
      nextWeek: /next week/i,
      time: /at (\d{1,2}(?::\d{2})? ?(?:am|pm))/i
    };
    
    // Set default start time to now + 1 hour
    const now = new Date();
    let startTime = new Date(now);
    startTime.setHours(startTime.getHours() + 1);
    
    // Adjust based on time indicators in text
    if (dateTimePatterns.tomorrow.test(text)) {
      startTime.setDate(startTime.getDate() + 1);
      startTime.setHours(9, 0, 0, 0); // Default to 9 AM for tomorrow
    } else if (dateTimePatterns.nextWeek.test(text)) {
      startTime.setDate(startTime.getDate() + 7);
      startTime.setHours(9, 0, 0, 0); // Default to 9 AM for next week
    }
    
    // Check for specific time
    const timeMatch = text.match(dateTimePatterns.time);
    if (timeMatch && timeMatch[1]) {
      const timeStr = timeMatch[1];
      const timeParts = timeStr.match(/(\d{1,2})(?::(\d{2}))? ?(am|pm)/i);
      
      if (timeParts) {
        let [_, hours, minutes, period] = timeParts;
        hours = parseInt(hours);
        if (period.toLowerCase() === 'pm' && hours !== 12) hours += 12;
        if (period.toLowerCase() === 'am' && hours === 12) hours = 0;
        
        startTime.setHours(hours, minutes ? parseInt(minutes) : 0, 0, 0);
      }
    }
    
    // Set end time to start time + 1 hour
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);
    
    // Determine urgency based on keywords
    let urgencyLevel = 3; // Default medium urgency
    
    if (/urgent|immediately|asap|right away|critical/i.test(text)) {
      urgencyLevel = 5; // High urgency
    } else if (/soon|quickly|important/i.test(text)) {
      urgencyLevel = 4; // Medium-high urgency
    } else if (/sometime|when you can|low priority|eventually/i.test(text)) {
      urgencyLevel = 2; // Low urgency
    }
    
    // Create the task object
    const task = {
      id: generateTaskId(),
      title: taskTitle,
      description: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
      startTime: formatISO(startTime),
      endTime: formatISO(endTime),
      urgencyLevel,
      category: 'Other', // Default category
      status: 'pending',
      createdAt: formatISO(new Date()),
      source: 'text-input-fallback'
    };
    
    console.log('Fallback extraction created task:', task);
    return [task];
  } catch (fallbackError) {
    console.error('Even fallback extraction failed:', fallbackError);
    // Return a very basic task as last resort
    return [{
      id: generateTaskId(),
      title: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      description: text,
      startTime: formatISO(new Date()),
      endTime: formatISO(new Date(new Date().setHours(new Date().getHours() + 1))),
      urgencyLevel: 3,
      category: 'Other',
      status: 'pending',
      createdAt: formatISO(new Date()),
      source: 'text-input-emergency-fallback'
    }];
  }
}

/**
 * Call the Hugging Face API with a prompt
 * @param {string} prompt - The prompt to send to the API
 * @returns {Promise<string>} - The model's response
 */
/**
 * Call the Hugging Face API with a prompt and retry logic
 * @param {string} prompt - The prompt to send to the API
 * @param {number} retryCount - Current retry attempt (internal use)
 * @param {boolean} useBackupModel - Whether to use the backup model
 * @returns {Promise<string>} - The model's response
 */
async function callHuggingFaceAPI(prompt, retryCount = 0, useBackupModel = false) {
  try {
    console.log('Calling Hugging Face API with prompt:', prompt.substring(0, 100) + '...');
    
    // Select the appropriate API URL based on whether we're using the backup model
    const apiUrl = useBackupModel ? BACKUP_HF_API_URL : HF_API_URL;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_API_TOKEN}`
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_length: 512,
          temperature: 0.7,  // Add some randomness for more creative responses
          top_p: 0.9,        // Nucleus sampling for better quality
          do_sample: true    // Enable sampling
        }
      }),
    });

    // Handle rate limiting (429) with exponential backoff
    if (response.status === 429 && retryCount < MAX_API_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      console.warn(`Rate limited by API, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_API_RETRIES})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return callHuggingFaceAPI(prompt, retryCount + 1, useBackupModel);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      console.error(`API request failed with status ${response.status}:`, errorText);
      
      // If we haven't tried the backup model yet and we've exhausted retries or got a 5xx error
      if (!useBackupModel && (retryCount >= MAX_API_RETRIES || response.status >= 500)) {
        console.log('Trying backup model...');
        return callHuggingFaceAPI(prompt, 0, true);
      }
      
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const generatedText = Array.isArray(result) ? result[0].generated_text : result.generated_text;
    
    if (!generatedText) {
      console.error('API returned empty response:', result);
      
      // If we haven't tried the backup model yet
      if (!useBackupModel) {
        console.log('Received empty response, trying backup model...');
        return callHuggingFaceAPI(prompt, 0, true);
      }
      
      throw new Error('API returned empty response');
    }
    
    console.log('API response received:', generatedText.substring(0, 100) + '...');
    return generatedText;
  } catch (error) {
    console.error('Error calling Hugging Face API:', error);
    
    // If we haven't exhausted our retries yet
    if (retryCount < MAX_API_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      console.warn(`API call failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_API_RETRIES})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return callHuggingFaceAPI(prompt, retryCount + 1, useBackupModel);
    }
    
    // If we haven't tried the backup model yet
    if (!useBackupModel) {
      console.log('Trying backup model after error...');
      return callHuggingFaceAPI(prompt, 0, true);
    }
    
    throw new Error(`Failed to process with NLP model: ${error.message}`);
  }
}