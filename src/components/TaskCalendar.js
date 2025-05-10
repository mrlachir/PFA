import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, Grid, Chip, Tooltip, IconButton, useTheme, alpha, Button, ButtonGroup } from '@mui/material';
import { LocalizationProvider, DateCalendar, PickersDay } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, isEqual, parseISO, isValid, addDays, startOfWeek, endOfWeek, eachDayOfInterval, getHours, getMinutes, addHours, setHours, setMinutes, differenceInMinutes } from 'date-fns';
import { enUS } from 'date-fns/locale';
import InfoIcon from '@mui/icons-material/Info';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ViewDayIcon from '@mui/icons-material/ViewDay';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import TodayIcon from '@mui/icons-material/Today';
import EmailIcon from '@mui/icons-material/Email';
import FlagIcon from '@mui/icons-material/Flag';
import { loadTasks } from '../services/storageService';

const TaskCalendar = ({ tasks: propTasks = [] }) => {
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [highlightedDates, setHighlightedDates] = useState([]);
  const [viewMode] = useState('week'); // Only week view is available
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [tasks, setTasks] = useState([]);
  
  // Load tasks from storage on component mount
  useEffect(() => {
    const storedTasks = loadTasks();
    if (storedTasks && storedTasks.length > 0) {
      setTasks(storedTasks);
    } else if (propTasks && propTasks.length > 0) {
      setTasks(propTasks);
    }
    
    console.log('TaskCalendar loaded tasks:', storedTasks || propTasks);
  }, [propTasks]);

  // Process tasks to get dates with tasks
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      const dates = tasks
        .filter(task => task.dueDate)
        .map(task => {
          try {
            return parseISO(task.dueDate);
          } catch (error) {
            console.error('Error parsing date:', task.dueDate, error);
            return null;
          }
        })
        .filter(date => date !== null && isValid(date));
      setHighlightedDates(dates);
    }
  }, [tasks]);

  // Get tasks for the selected date
  const getTasksForSelectedDate = () => {
    if (!tasks || tasks.length === 0) return [];
    
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      
      try {
        const taskDate = parseISO(task.dueDate);
        if (!isValid(taskDate)) return false;
        
        return isEqual(
          new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate()),
          new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
        );
      } catch (error) {
        console.error('Error parsing task date:', error);
        return false;
      }
    });
  };

  // Get color based on priority
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#f44336'; // Red
      case 'Medium': return '#ff9800'; // Orange
      case 'Low': return '#4caf50'; // Green
      default: return '#ff9800'; // Default - Orange
    }
  };
  
  // Get urgency color based on level
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

  // Format date for display
  // Restore formatDateTime function
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    const date = parseISO(dateString);
    // Restore 'h:mm a' format with explicit enUS locale
    return isValid(date) ? format(date, 'h:mm a', { locale: enUS }) : 'Invalid Date';
  };
  
  
  // Get day of month with proper suffix (1st, 2nd, 3rd, etc)
  const getDayWithSuffix = (date) => {
    if (!date) return '';
    
    const day = date.getDate();
    if (day > 3 && day < 21) return `${day}th`;
    
    switch (day % 10) {
      case 1: return `${day}st`;
      case 2: return `${day}nd`;
      case 3: return `${day}rd`;
      default: return `${day}th`;
    }
  };

  const tasksForSelectedDate = getTasksForSelectedDate();

  // Generate time slots for day/week view (hourly from 7am to 9pm)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour <= 21; hour++) {
      slots.push(setHours(new Date(selectedDate), hour));
    }
    return slots;
  };

  // Generate days for week view
  const generateWeekDays = () => {
    if (viewMode === 'week') {
      return eachDayOfInterval({
        start: weekStart,
        end: endOfWeek(weekStart, { weekStartsOn: 0 })
      });
    }
    return [selectedDate];
  };

  // Get tasks for a specific day and time slot
  const getTasksForTimeSlot = (date, hour) => {
    if (!tasks || tasks.length === 0) return [];

    const tasksInSlot = tasks.filter(task => {
      if (!task.dueDate) return false;
      
      try {
        const taskDate = parseISO(task.dueDate);
        if (!isValid(taskDate)) return false;
        
        // Check if the task's date matches the slot's date
        const isSameDay = isEqual(
          new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate())
        );
        
        if (!isSameDay) return false;
        
        // Check if the task's hour matches the current hour
        const taskHour = getHours(taskDate);
        return taskHour === hour;
      } catch (error) {
        console.error('Error parsing task date in time slot:', error);
        return false;
      }
    });

    return tasksInSlot;
  };

  // Handle week navigation
  const navigateWeek = (direction) => {
    const newWeekStart = direction === 'next' 
      ? addDays(weekStart, 7) 
      : addDays(weekStart, -7);
    setWeekStart(newWeekStart);
    setSelectedDate(newWeekStart);
  };

  // Go to today
  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setWeekStart(startOfWeek(today, { weekStartsOn: 0 }));
  };

  // Render time slot
  const renderTimeSlot = (time, day) => {
    const hour = getHours(time);
    // Restore task logic
    const tasksInSlot = getTasksForTimeSlot(day, hour); 
    const hasTask = tasksInSlot.length > 0; 
    
    // Log if tasks are found for rendering
    // if (hasTask) {
    //   console.log(`Rendering tasks for hour ${hour} on ${day.toISOString()}:`, tasksInSlot);
    // }

    return (
      <Box 
        key={`${day.toISOString()}-${hour}`} // Use toISOString for key
        sx={{
          height: '60px', // Keep height for consistency
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`, // Lighter border
          borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`, // Very light vertical border
          position: 'relative',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.04) // Slightly more visible hover
          },
          // Add some padding inside the slot for task positioning
          p: '2px' 
        }}
      >
        {/* Restore task rendering logic with validity checks */}
        {hasTask && tasksInSlot.map(task => {
          const taskStartDate = parseISO(task.startTime);
          // Ensure start date is valid before proceeding
          if (!isValid(taskStartDate)) return null; 

          // Define slot boundaries
          const slotStartTime = setMinutes(setHours(new Date(day), hour), 0);
          const slotEndTime = addHours(slotStartTime, 1);

          // Determine task end time, defaulting to 1 hour if invalid/missing
          let taskEndDate;
          if (task.endTime) {
            const parsedEnd = parseISO(task.endTime);
            if (isValid(parsedEnd)) {
              taskEndDate = parsedEnd;
            } else {
              taskEndDate = addHours(taskStartDate, 1); // Default duration
            }
          } else {
            taskEndDate = addHours(taskStartDate, 1); // Default duration
          }

          // Calculate top offset
          let topOffset = 0;
          if (taskStartDate > slotStartTime) {
            topOffset = (getMinutes(taskStartDate) / 60) * 100;
          }

          // Calculate height based on duration within the slot
          const effectiveStartTimeInSlot = taskStartDate > slotStartTime ? taskStartDate : slotStartTime;
          const effectiveEndTimeInSlot = taskEndDate < slotEndTime ? taskEndDate : slotEndTime;
          
          let durationInSlotMinutes = differenceInMinutes(effectiveEndTimeInSlot, effectiveStartTimeInSlot);
          
          // Ensure minimum visual duration and handle potential negative duration if logic is flawed
          durationInSlotMinutes = Math.max(5, durationInSlotMinutes); // Min 5 minutes visual representation

          let taskHeight = (durationInSlotMinutes / 60) * 100;
          // Cap height by remaining space
          taskHeight = Math.min(taskHeight, 100 - topOffset);
          
          // Ensure height is not negative
          taskHeight = Math.max(0, taskHeight);

          // Skip rendering if height is non-positive
          if (taskHeight <= 0) {
            return null;
          }

          return (
            <Tooltip 
              title={`${task.title}`} 
              arrow 
              key={task.id}
            >
              <Box 
                sx={{
                  position: 'absolute',
                  top: `${topOffset}%`, 
                  left: '4px', 
                  right: '4px', 
                  height: `${taskHeight}%`, 
                  minHeight: '20px', 
                  borderRadius: '4px',
                  bgcolor: alpha(task.urgencyLevel ? getUrgencyColor(task.urgencyLevel) : getPriorityColor(task.priority || 'Medium'), 0.7), 
                  border: `1px solid ${task.urgencyLevel ? getUrgencyColor(task.urgencyLevel) : getPriorityColor(task.priority || 'Medium')}`,
                  p: '2px 4px', 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.7rem', 
                  color: theme.palette.getContrastText(alpha(task.urgencyLevel ? getUrgencyColor(task.urgencyLevel) : getPriorityColor(task.priority || 'Medium'), 0.7)), 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start', 
                  zIndex: 1, 
                  boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.2)}`, 
                  '&:hover': {
                    bgcolor: alpha(task.urgencyLevel ? getUrgencyColor(task.urgencyLevel) : getPriorityColor(task.priority || 'Medium'), 0.9),
                    boxShadow: `0 2px 4px ${alpha(theme.palette.common.black, 0.3)}`,
                    zIndex: 2, 
                  }
                }}
              >
                {task.title}
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const days = generateWeekDays();
    const timeSlots = generateTimeSlots();

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '600px', overflow: 'hidden' }}>
        {/* Week Header */}
        <Box sx={{ display: 'flex', borderBottom: `1px solid ${theme.palette.divider}`, flexShrink: 0 }}>
          <Box sx={{ width: '60px', flexShrink: 0, borderRight: `1px solid ${theme.palette.divider}` }} /> {/* Time column spacer */}
          {days.map(day => (
            <Box 
              key={day.toISOString()} // Use toISOString for key
              sx={{
                flex: 1, 
                textAlign: 'center', 
                py: 1, 
                borderRight: `1px solid ${theme.palette.divider}`,
                bgcolor: isEqual(new Date(day.getFullYear(), day.getMonth(), day.getDate()), new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())) 
                  ? alpha(theme.palette.primary.main, 0.1) 
                  : 'transparent',
                '&:last-child': { borderRight: 'none' }
              }}
            >
              {/* Simplified Day Name */}
              <Typography variant="caption" sx={{ display: 'block', color: theme.palette.text.secondary }}>
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </Typography>
              {/* Simplified Day Number */}
              <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                {day.getDate()}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Scrollable Content Area */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex' }}>
          {/* Time Column */}
          <Box sx={{ width: '60px', flexShrink: 0, borderRight: `1px solid ${theme.palette.divider}` }}>
            {timeSlots.map(time => (
              <Box 
                key={time.toISOString()} // Use toISOString for key
                sx={{
                  height: '60px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`, // Very light border
                  color: theme.palette.text.secondary,
                  fontSize: '0.75rem'
                }}
              >
                 {/* Restore format call for time column with explicit locale */}
                 {format(time, 'HH', { locale: enUS })}
              </Box>
            ))}
          </Box>

          {/* Day Columns */}
          {days.map(day => (
            <Box 
              key={`day-col-${day.toISOString()}`} // Use toISOString for key
              sx={{
                flex: 1, 
                position: 'relative', 
                borderRight: `1px solid ${theme.palette.divider}`,
                '&:last-child': { borderRight: 'none' }
              }}
            >
              {timeSlots.map(time => renderTimeSlot(time, day))}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Paper elevation={2} sx={{ p: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventIcon color="primary" /> Task Calendar
        </Typography>
        <Box>
          <ButtonGroup variant="outlined" size="small" aria-label="Calendar Navigation">
            <Button onClick={() => navigateWeek('prev')}>Previous Week</Button>
            <Button onClick={goToToday}>Today</Button>
            <Button onClick={() => navigateWeek('next')}>Next Week</Button>
          </ButtonGroup>
          {/* <Tooltip title="Week View displays tasks scheduled within specific time slots.">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip> */}
        </Box>
      </Box>

      <Typography variant="subtitle1" align="center" sx={{ mb: 2 }}>
        {format(weekStart, 'MMM dd', { locale: enUS })} - {format(endOfWeek(weekStart, { weekStartsOn: 0 }), 'MMM dd, yyyy', { locale: enUS })}
      </Typography>

      {renderWeekView()}

      {/* Removed Day View and Month View Calendar Picker */}
      {/* ... */}
    </Paper>
  );
};

export default TaskCalendar;