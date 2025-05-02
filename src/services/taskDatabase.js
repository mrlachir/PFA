/**
 * Task Database Service
 * 
 * This service handles the storage and retrieval of tasks using localStorage.
 * In a production environment, this would be replaced with a proper database solution.
 */

// Key for storing tasks in localStorage
const TASKS_STORAGE_KEY = 'ai_planner_tasks';

/**
 * Get all tasks from storage
 * @returns {Array} Array of task objects
 */
export const getAllTasks = () => {
  try {
    const tasksJson = localStorage.getItem(TASKS_STORAGE_KEY);
    return tasksJson ? JSON.parse(tasksJson) : [];
  } catch (error) {
    console.error('Error retrieving tasks from storage:', error);
    return [];
  }
};

/**
 * Save a new task to storage
 * @param {Object} task - The task object to save
 * @returns {Object} The saved task with generated ID
 */
export const saveTask = (task) => {
  try {
    const tasks = getAllTasks();
    
    // Generate a unique ID if not provided
    if (!task.id) {
      task.id = 'task_' + Date.now() + Math.random().toString(36).substr(2, 9);
    }
    
    // Add created timestamp if not provided
    if (!task.createdAt) {
      task.createdAt = new Date().toISOString();
    }
    
    // Add the new task to the array
    tasks.push(task);
    
    // Save back to localStorage
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    
    return task;
  } catch (error) {
    console.error('Error saving task to storage:', error);
    throw new Error('Failed to save task');
  }
};

/**
 * Save multiple tasks to storage
 * @param {Array} tasks - Array of task objects to save
 * @returns {Array} The saved tasks with generated IDs
 */
export const saveMultipleTasks = (tasks) => {
  try {
    const existingTasks = getAllTasks();
    
    // Process each new task
    const processedTasks = tasks.map(task => {
      // Generate a unique ID if not provided
      if (!task.id) {
        task.id = 'task_' + Date.now() + Math.random().toString(36).substr(2, 9);
      }
      
      // Add created timestamp if not provided
      if (!task.createdAt) {
        task.createdAt = new Date().toISOString();
      }
      
      return task;
    });
    
    // Combine existing and new tasks
    const updatedTasks = [...existingTasks, ...processedTasks];
    
    // Save back to localStorage
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
    
    return processedTasks;
  } catch (error) {
    console.error('Error saving multiple tasks to storage:', error);
    throw new Error('Failed to save tasks');
  }
};

/**
 * Update an existing task
 * @param {Object} updatedTask - The task object with updates
 * @returns {Object} The updated task
 */
export const updateTask = (updatedTask) => {
  try {
    const tasks = getAllTasks();
    
    // Find the task index
    const taskIndex = tasks.findIndex(task => task.id === updatedTask.id);
    
    if (taskIndex === -1) {
      throw new Error(`Task with ID ${updatedTask.id} not found`);
    }
    
    // Update the task
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...updatedTask,
      updatedAt: new Date().toISOString()
    };
    
    // Save back to localStorage
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    
    return tasks[taskIndex];
  } catch (error) {
    console.error('Error updating task:', error);
    throw new Error('Failed to update task');
  }
};

/**
 * Delete a task by ID
 * @param {string} taskId - The ID of the task to delete
 * @returns {boolean} True if deletion was successful
 */
export const deleteTask = (taskId) => {
  try {
    const tasks = getAllTasks();
    
    // Filter out the task to delete
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    
    if (updatedTasks.length === tasks.length) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    // Save back to localStorage
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
    
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw new Error('Failed to delete task');
  }
};

/**
 * Get a task by ID
 * @param {string} taskId - The ID of the task to retrieve
 * @returns {Object|null} The task object or null if not found
 */
export const getTaskById = (taskId) => {
  try {
    const tasks = getAllTasks();
    return tasks.find(task => task.id === taskId) || null;
  } catch (error) {
    console.error('Error retrieving task:', error);
    return null;
  }
};

/**
 * Clear all tasks from storage
 * @returns {boolean} True if clearing was successful
 */
export const clearAllTasks = () => {
  try {
    localStorage.removeItem(TASKS_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing tasks:', error);
    return false;
  }
};