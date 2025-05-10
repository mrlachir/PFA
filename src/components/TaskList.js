import React, { useState, useMemo, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Divider,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  useTheme,
  alpha
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { format, parseISO, isValid } from 'date-fns';
import { loadTasks, saveTasks } from '../services/storageService';
import { 
  scheduleTaskReminders, 
  cancelTaskReminders, 
  scheduleRemindersForTasks, 
  notifyTasksExtracted,
  enableTaskReminders,
  disableTaskReminders,
  areRemindersEnabled
} from '../services/notificationService';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import FlagIcon from '@mui/icons-material/Flag';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const TaskList = ({ tasks = [], onTaskUpdate }) => {
  const theme = useTheme();
  const [displayedTasks, setDisplayedTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('dueDate');
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedStartTime, setEditedStartTime] = useState(null);
  const [editedEndTime, setEditedEndTime] = useState(null);
  const [editedStatus, setEditedStatus] = useState('');
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [selectedTaskForPriority, setSelectedTaskForPriority] = useState(null);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);

  // Function to handle viewing task details
  const handleViewTaskDetails = (task) => {
    setSelectedTaskDetails(task);
    setTaskDetailsOpen(true);
  };

  // Function to handle editing a task
  const handleEditTask = (task) => {
    setEditingTask(task);
    setEditedStatus(task.status || 'New');
    
    // Initialize the date pickers with the task's times
    if (task.startTime) {
      setEditedStartTime(new Date(task.startTime));
    } else {
      setEditedStartTime(null);
    }
    
    if (task.endTime) {
      setEditedEndTime(new Date(task.endTime));
    } else {
      setEditedEndTime(null);
    }
    
    setEditDialogOpen(true);
    // Close the details dialog if it's open
    if (taskDetailsOpen) {
      setTaskDetailsOpen(false);
    }
  };

  // Function to handle deleting a task
  const handleDeleteTask = (taskId) => {
    // Cancel any reminders for this task
    cancelTaskReminders(taskId);
    
    // Remove the task from the list
    const updatedTasks = allTasks.filter(task => task.id !== taskId);
    setAllTasks(updatedTasks);
    saveTasks(updatedTasks);
  };
  
  // Function to toggle reminders for a task
  const handleToggleReminders = (event, taskId, task) => {
    // Stop event propagation to prevent card click
    event.stopPropagation();
    
    // Check if reminders are currently enabled
    const remindersEnabled = areRemindersEnabled(taskId);
    
    if (remindersEnabled) {
      // Disable reminders
      disableTaskReminders(taskId);
      // Show notification
      notifyTasksExtracted([{
        ...task,
        title: 'Reminders Disabled',
        description: `Reminders have been turned off for task: ${task.title}`
      }]);
    } else {
      // Enable reminders
      enableTaskReminders(taskId, task);
      // Show notification
      notifyTasksExtracted([{
        ...task,
        title: 'Reminders Enabled',
        description: `Reminders have been turned on for task: ${task.title}`
      }]);
    }
    
    // Force a re-render
    setAllTasks([...allTasks]);
  };

  useEffect(() => {
    const storedTasks = loadTasks();
    if (storedTasks && storedTasks.length > 0) {
      setAllTasks(storedTasks);
      // Schedule reminders for all loaded tasks
      scheduleRemindersForTasks(storedTasks);
    } else if (tasks && tasks.length > 0) {
      setAllTasks(tasks);
      // Schedule reminders for provided tasks
      scheduleRemindersForTasks(tasks);
    }
  }, [tasks]);

  useEffect(() => {
    filterAndSortTasks();
  }, [allTasks, searchTerm, statusFilter, priorityFilter, sortBy]);

  const filterAndSortTasks = () => {
    let filtered = [...allTasks];

    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => {
        // Convert status values to match the filter options
        const taskStatus = task.status || 'New';
        return taskStatus === statusFilter;
      });
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => {
        // Check both urgencyLevel and priority properties
        if (task.urgencyLevel) {
          // Convert urgencyLevel to priority string
          const urgencyToPriority = {
            5: 'High',
            4: 'High',
            3: 'Medium',
            2: 'Low',
            1: 'Low'
          };
          return urgencyToPriority[task.urgencyLevel] === priorityFilter;
        } else {
          // Fall back to priority property if urgencyLevel is not set
          return task.priority === priorityFilter;
        }
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          // Handle cases where dueDate might be missing
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1; // Items without dueDate go to the end
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
          
        case 'priority':
          // Map urgencyLevel to priority order
          const getTaskPriorityValue = (task) => {
            if (task.urgencyLevel) {
              // Higher urgencyLevel = higher priority (lower sort value)
              return 6 - task.urgencyLevel; // Convert 5->1, 4->2, etc.
            } else if (task.priority) {
              const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
              return priorityOrder[task.priority] || 4; // Default to lowest priority if unknown
            } else {
              return 4; // Default value for items without priority
            }
          };
          
          const aValue = getTaskPriorityValue(a);
          const bValue = getTaskPriorityValue(b);
          return aValue - bValue;
          
        case 'title':
          // Handle missing titles gracefully
          if (!a.title && !b.title) return 0;
          if (!a.title) return 1;
          if (!b.title) return -1;
          return a.title.localeCompare(b.title);
          
        case 'status':
          // Sort by status: New -> In Progress -> Completed
          const statusOrder = { 'New': 1, 'In Progress': 2, 'Completed': 3 };
          const aStatus = statusOrder[a.status || 'New'] || 1;
          const bStatus = statusOrder[b.status || 'New'] || 1;
          return aStatus - bStatus;
          
        default:
          return 0;
      }
    });

    setDisplayedTasks(filtered);
  };

  const handleStatusToggle = (taskId) => {
    const task = allTasks.find(t => t.id === taskId);
    if (task) {
      const newStatus = task.status === 'Completed' ? 'In Progress' : 'Completed';
      const updatedTask = { ...task, status: newStatus };

      const updatedTasks = allTasks.map(t => t.id === taskId ? updatedTask : t);
      setAllTasks(updatedTasks);

      saveTasks(updatedTasks);

      if (onTaskUpdate) {
        onTaskUpdate(updatedTask);
      }
    }
  };

  const handleMenuOpen = (event, taskId) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedTaskId(taskId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedTaskId(null);
  };

  const handlePriorityChange = (taskId, level) => {
    const task = allTasks.find(t => t.id === taskId);
    if (task) {
      const updatedTask = { ...task, urgencyLevel: level };
      const updatedTasks = allTasks.map(t => t.id === taskId ? updatedTask : t);
      setAllTasks(updatedTasks);
      saveTasks(updatedTasks);
      if (onTaskUpdate) {
        onTaskUpdate(updatedTask);
      }
    }
  };

  const handleChangePriority = (priority) => {
    const task = allTasks.find(t => t.id === selectedTaskId);
    if (task) {
      const updatedTask = { ...task, priority };

      const updatedTasks = allTasks.map(t => t.id === selectedTaskId ? updatedTask : t);
      setAllTasks(updatedTasks);

      saveTasks(updatedTasks);

      if (onTaskUpdate) {
        onTaskUpdate(updatedTask);
      }
    }
    handleMenuClose();
  };

  const handleChangeStatus = (status) => {
    const task = allTasks.find(t => t.id === selectedTaskId);
    if (task) {
      const updatedTask = { ...task, status };

      const updatedTasks = allTasks.map(t => t.id === selectedTaskId ? updatedTask : t);
      setAllTasks(updatedTasks);

      saveTasks(updatedTasks);

      if (onTaskUpdate) {
        onTaskUpdate(updatedTask);
      }
    }
    handleMenuClose();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return theme.palette.error.main;
      case 'Medium': return theme.palette.warning.main;
      case 'Low': return theme.palette.success.main;
      default: return theme.palette.warning.main;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'In Progress': return 'info';
      case 'New': return 'default';
      case 'Overdue': return 'error';
      default: return 'default';
    }
  };

  const getUrgencyColor = (level) => {
    switch (level) {
      case 1: return '#8bc34a'; // Low - Green
      case 2: return '#4caf50'; // Low-Medium - Light Green
      case 3: return '#ff9800'; // Medium - Orange
      case 4: return '#f44336'; // Medium-High - Red
      case 5: return '#d32f2f'; // High - Dark Red
      default: return '#ff9800'; // Default - Orange
    }
  };

  const getUrgencyLabel = (level) => {
    switch (level) {
      case 1: return 'Low';
      case 2: return 'Low-Medium';
      case 3: return 'Medium';
      case 4: return 'Medium-High';
      case 5: return 'High';
      default: return 'Medium';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    const date = parseISO(dateString);
    return isValid(date) ? format(date, 'MMM d, yyyy h:mm a') : 'Invalid Date';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) {
        return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }

      if (date.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date error';
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, borderRadius: 2, overflow: 'hidden', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
            Task List
          </Typography>
          <Chip
            label={`${displayedTasks.length} ${displayedTasks.length === 1 ? 'task' : 'tasks'}`}
            color="primary"
            size="small"
            variant="outlined"
            sx={{ ml: 1 }}
          />
        </Box>

      </Box>

      {/* Filters and Search */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Search Tasks"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                sx: { borderRadius: 1.5 }
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="New">New</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={priorityFilter}
                label="Priority"
                onChange={(e) => setPriorityFilter(e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value="dueDate">Due Date</MenuItem>
                <MenuItem value="priority">Priority</MenuItem>
                <MenuItem value="status">Status</MenuItem>
                <MenuItem value="title">Title</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Divider sx={{ mb: 3 }} />

      {/* Task List */}
      <Box sx={{ mt: 3, maxHeight: { xs: 'calc(100vh - 350px)', md: 'calc(100vh - 300px)' }, overflowY: 'auto', pr: 1, '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-track': { bgcolor: 'transparent' }, '&::-webkit-scrollbar-thumb': { bgcolor: alpha(theme.palette.primary.main, 0.2), borderRadius: '4px', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.3) } } }}>
        {displayedTasks.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No tasks found matching your filters
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search or filter criteria
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {displayedTasks.map((task) => (
            <Card 
              key={task.id} 
              elevation={2} // Slightly reduced elevation for a cleaner look
              onClick={() => {
                // setEditingTask(task);
                // Use startTime or dueDate for the start time picker
                // setEditedStartTime(task.startTime ? parseISO(task.startTime) : 
                //                  (task.dueDate ? parseISO(task.dueDate) : null));
                // // Use endTime for the end time picker
                // setEditedEndTime(task.endTime ? parseISO(task.endTime) : null);
                // // Set status, defaulting to 'New' if not set
                // setEditedStatus(task.status || 'New');
                // setEditDialogOpen(true);
                // console.log('Opening edit dialog for task:', task);
              }}
              sx={{ 
                borderLeft: `5px solid ${getUrgencyColor(task.urgencyLevel)}`, // Thicker border
                transition: 'all 0.2s ease-in-out', // Smoother transition
                cursor: 'pointer',
                borderRadius: 1.5, // Slightly softer corners
                overflow: 'hidden',
                bgcolor: theme.palette.background.paper, // Ensure background color
                '&:hover': {
                  transform: 'translateY(-2px)', // Subtle lift
                  boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.1)}`, // Softer shadow on hover
                  borderColor: alpha(getUrgencyColor(task.urgencyLevel), 0.8) // Slightly fade border on hover
                }
              }}>
              <CardContent sx={{ p: 2 }}> 
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden', flex: 1 }}>
                    <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 600, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </Typography>
                    {task.dueDate && (
                      <Tooltip title={areRemindersEnabled(task.id) ? "Reminders active (click to disable)" : "Reminders disabled (click to enable)"}>
                        <IconButton
                          onClick={(e) => handleToggleReminders(e, task.id, task)}
                          size="small"
                          sx={{ p: 0, ml: 0.5 }}
                        >
                          {areRemindersEnabled(task.id) ? (
                            <NotificationsActiveIcon fontSize="small" color="primary" sx={{ fontSize: '0.875rem' }} />
                          ) : (
                            <NotificationsOffIcon fontSize="small" color="action" sx={{ fontSize: '0.875rem', opacity: 0.5 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  <Chip
                    size="small"
                    label={task.status || 'New'}
                    color={getStatusColor(task.status || 'New')}
                    sx={{ height: 20, fontSize: '0.7rem', ml: 1 }}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {task.dueDate ? `${formatDateTime(task.dueDate)}` : ''}
                    {task.startTime && task.endTime ? ` (${formatDateTime(task.startTime).split(' ')[1]} - ${formatDateTime(task.endTime).split(' ')[1]})` : ''}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Tooltip title="Task Priority">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <FlagIcon 
                          fontSize="small" 
                          sx={{ 
                            color: getPriorityColor(task.urgencyLevel || task.priority || 'Medium'),
                            fontSize: '0.875rem'
                          }} 
                        />
                      </Box>
                    </Tooltip>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                  <Button 
                    size="small" 
                    variant="text" 
                    onClick={() => handleViewTaskDetails(task)}
                    sx={{ fontSize: '0.7rem', p: 0, minWidth: 'auto', textTransform: 'none' }}
                  >
                    More Info
                  </Button>
                  
                  <Box>
                    <IconButton 
                      size="small" 
                      onClick={() => handleEditTask(task)}
                      sx={{ p: 0.5 }}
                    >
                      <EditIcon fontSize="small" sx={{ fontSize: '0.875rem' }} />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeleteTask(task.id)}
                      sx={{ p: 0.5, ml: 0.5 }}
                    >
                      <DeleteIcon fontSize="small" sx={{ fontSize: '0.875rem' }} />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
</Box>
      {/* Edit Task Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}`, pb: 2 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            Edit Task
          </Typography>
          {editingTask && (
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.5 }}>
              {editingTask.title}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'medium' }}>Time Range</Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <DateTimePicker
                  label="Start Time"
                  value={editedStartTime}
                  onChange={(newValue) => {
                    setEditedStartTime(newValue);
                    console.log('New start time:', newValue);
                  }}
                  sx={{ flex: 1 }}
                  slotProps={{
                    textField: {
                      variant: 'outlined',
                      size: 'small',
                      sx: { borderRadius: 1.5 }
                    }
                  }}
                />
                <DateTimePicker
                  label="End Time"
                  value={editedEndTime}
                  onChange={(newValue) => {
                    setEditedEndTime(newValue);
                    console.log('New end time:', newValue);
                  }}
                  sx={{ flex: 1 }}
                  slotProps={{
                    textField: {
                      variant: 'outlined',
                      size: 'small',
                      sx: { borderRadius: 1.5 }
                    }
                  }}
                />
              </Box>
            </LocalizationProvider>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'medium' }}>Priority</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                {[5, 4, 3, 2, 1].map((level) => (
                  <Button
                    key={level}
                    variant={editingTask?.urgencyLevel === level ? 'contained' : 'outlined'}
                    onClick={() => {
                      setEditingTask(prev => ({ ...prev, urgencyLevel: level }));
                    }}
                    startIcon={
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          bgcolor: getUrgencyColor(level),
                          display: 'inline-block'
                        }} 
                      />
                    }
                    sx={{
                      justifyContent: 'flex-start',
                      borderColor: alpha(getUrgencyColor(level), 0.3),
                      color: editingTask?.urgencyLevel === level ? 'white' : getUrgencyColor(level),
                      bgcolor: editingTask?.urgencyLevel === level ? getUrgencyColor(level) : 'transparent',
                      '&:hover': {
                        bgcolor: editingTask?.urgencyLevel === level 
                          ? getUrgencyColor(level) 
                          : alpha(getUrgencyColor(level), 0.1),
                        borderColor: getUrgencyColor(level)
                      }
                    }}
                  >
                    {getUrgencyLabel(level)}
                  </Button>
                ))}
              </Box>
            </Box>
            
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={editedStatus}
                label="Status"
                onChange={(e) => setEditedStatus(e.target.value)}
                size="small"
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value="New">New</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button 
            onClick={() => setEditDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 1.5 }}
          >
            Cancel
          </Button>
          <Button              onClick={() => {
              if (editingTask) {
                // Cancel existing reminders for this task
                cancelTaskReminders(editingTask.id);
                
                const updatedTask = {
                  ...editingTask,
                  startTime: editedStartTime ? format(editedStartTime, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : null,
                  endTime: editedEndTime ? format(editedEndTime, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : null,
                  dueDate: editedStartTime ? format(editedStartTime, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : editingTask.dueDate,
                  status: editedStatus,
                  urgencyLevel: editingTask.urgencyLevel
                };
                
                console.log('Saving updated task:', updatedTask);
                
                // Update the task in allTasks
                const updatedTasks = allTasks.map(t => 
                  t.id === editingTask.id ? updatedTask : t
                );
                
                // Update state and storage
                setAllTasks(updatedTasks);
                saveTasks(updatedTasks);
                
                // Schedule reminders for the updated task
                if (updatedTask.dueDate) {
                  scheduleTaskReminders(updatedTask);
                  
                  // Close the dialog first
                  setEditDialogOpen(false);
                  
                  // Format date for display
                  const dueDate = new Date(updatedTask.dueDate);
                  const formattedDate = dueDate.toLocaleDateString() + ' ' + dueDate.toLocaleTimeString();
                  
                  // Show notification using the notification system
                  const message = `Task due: ${formattedDate}

Reminders set for:
- 1 day before
- 1 hour before
- 10 minutes before`;
                  
                  // Use the notifySystem function from notification service
                  notifyTasksExtracted([updatedTask]);
                }
                
                // Call the onTaskUpdate callback if provided
                if (onTaskUpdate) {
                  onTaskUpdate(updatedTask);
                }
              }
              setEditDialogOpen(false);
              setEditingTask(null);
            }} 
            variant="contained" 
            color="primary"
            sx={{ borderRadius: 1.5 }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Priority Edit Dialog */}
      <Dialog 
        open={priorityDialogOpen} 
        onClose={() => setPriorityDialogOpen(false)}
        PaperProps={{
          sx: { borderRadius: 2, overflow: 'hidden' }
        }}
      >
        <DialogTitle sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
          Set Task Priority
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1, px: 3, minWidth: 300 }}>
          {selectedTaskForPriority && (
            <>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
                {selectedTaskForPriority.title}
              </Typography>
              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Current Priority: {getUrgencyLabel(selectedTaskForPriority.urgencyLevel)}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                  {[5, 4, 3, 2, 1].map((level) => (
                    <Button
                      key={level}
                      variant={selectedTaskForPriority.urgencyLevel === level ? 'contained' : 'outlined'}
                      onClick={() => {
                        handlePriorityChange(selectedTaskForPriority.id, level);
                        setPriorityDialogOpen(false);
                      }}
                      startIcon={
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%', 
                            bgcolor: getUrgencyColor(level),
                            display: 'inline-block'
                          }} 
                        />
                      }
                      sx={{
                        justifyContent: 'flex-start',
                        borderColor: alpha(getUrgencyColor(level), 0.3),
                        color: selectedTaskForPriority.urgencyLevel === level ? 'white' : getUrgencyColor(level),
                        bgcolor: selectedTaskForPriority.urgencyLevel === level ? getUrgencyColor(level) : 'transparent',
                        '&:hover': {
                          bgcolor: selectedTaskForPriority.urgencyLevel === level 
                            ? getUrgencyColor(level) 
                            : alpha(getUrgencyColor(level), 0.1),
                          borderColor: getUrgencyColor(level)
                        }
                      }}
                    >
                      {getUrgencyLabel(level)}
                    </Button>
                  ))}
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPriorityDialogOpen(false)} color="primary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Details Dialog */}
      <Dialog
        open={taskDetailsOpen}
        onClose={() => setTaskDetailsOpen(false)}
        PaperProps={{
          sx: { borderRadius: 2, overflow: 'hidden', maxWidth: 500 }
        }}
      >
        {selectedTaskDetails && (
          <>
            <DialogTitle sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Task Details</Typography>
                <Chip
                  size="small"
                  label={selectedTaskDetails.status || 'New'}
                  color={getStatusColor(selectedTaskDetails.status || 'New')}
                />
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 2, pb: 1, px: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>
                {selectedTaskDetails.title}
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Due Date</Typography>
                  <Typography variant="body2">
                    {selectedTaskDetails.dueDate ? formatDate(selectedTaskDetails.dueDate) : 'Not set'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Priority</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <FlagIcon 
                      fontSize="small" 
                      sx={{ 
                        color: getPriorityColor(selectedTaskDetails.urgencyLevel || selectedTaskDetails.priority || 'Medium'),
                        mr: 1
                      }} 
                    />
                    <Typography variant="body2">
                      {getUrgencyLabel(selectedTaskDetails.urgencyLevel) || selectedTaskDetails.priority || 'Medium'}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Start Time</Typography>
                  <Typography variant="body2">
                    {selectedTaskDetails.startTime ? formatDateTime(selectedTaskDetails.startTime) : 'Not set'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">End Time</Typography>
                  <Typography variant="body2">
                    {selectedTaskDetails.endTime ? formatDateTime(selectedTaskDetails.endTime) : 'Not set'}
                  </Typography>
                </Grid>
              </Grid>
              
              {selectedTaskDetails.description && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                  <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                    {selectedTaskDetails.description}
                  </Typography>
                </Box>
              )}
              
              {selectedTaskDetails.category && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Category</Typography>
                  <Chip 
                    label={selectedTaskDetails.category} 
                    size="small" 
                    variant="outlined"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              )}
              
              {selectedTaskDetails.dueDate && (
                <Box sx={{ mt: 3, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center' }}>
                      {areRemindersEnabled(selectedTaskDetails.id) ? (
                        <NotificationsActiveIcon fontSize="small" sx={{ mr: 1, color: theme.palette.primary.main }} />
                      ) : (
                        <NotificationsOffIcon fontSize="small" sx={{ mr: 1, color: theme.palette.text.secondary }} />
                      )}
                      {areRemindersEnabled(selectedTaskDetails.id) ? 'Reminders Active' : 'Reminders Disabled'}
                    </Typography>
                    
                    <Button
                      size="small"
                      variant="outlined"
                      color={areRemindersEnabled(selectedTaskDetails.id) ? 'primary' : 'default'}
                      startIcon={areRemindersEnabled(selectedTaskDetails.id) ? <NotificationsOffIcon /> : <NotificationsActiveIcon />}
                      onClick={() => {
                        if (areRemindersEnabled(selectedTaskDetails.id)) {
                          disableTaskReminders(selectedTaskDetails.id);
                        } else {
                          enableTaskReminders(selectedTaskDetails.id, selectedTaskDetails);
                        }
                        // Force re-render by setting state
                        setSelectedTaskDetails({...selectedTaskDetails});
                        setAllTasks([...allTasks]);
                      }}
                    >
                      {areRemindersEnabled(selectedTaskDetails.id) ? 'Disable' : 'Enable'}
                    </Button>
                  </Box>
                  
                  {areRemindersEnabled(selectedTaskDetails.id) ? (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      You will be notified:
                      <Box component="ul" sx={{ mt: 0.5, pl: 2 }}>
                        <li>1 day before due date</li>
                        <li>1 hour before due date</li>
                        <li>10 minutes before due date</li>
                      </Box>
                    </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ mt: 1, color: theme.palette.text.secondary }}>
                      Reminders are currently turned off for this task.
                    </Typography>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button 
                onClick={() => handleEditTask(selectedTaskDetails)} 
                color="primary" 
                variant="outlined"
                startIcon={<EditIcon />}
              >
                Edit Task
              </Button>
              <Button 
                onClick={() => setTaskDetailsOpen(false)} 
                color="primary"
                variant="contained"
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Paper>
  );
};

export default TaskList;
