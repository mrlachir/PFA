import React, { useState, useMemo } from 'react';
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
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import FlagIcon from '@mui/icons-material/Flag';

const TaskList = ({ tasks, onTaskUpdate }) => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortDirection, setSortDirection] = useState('asc');
  const [editingTask, setEditingTask] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedStartTime, setEditedStartTime] = useState(null);
  const [editedEndTime, setEditedEndTime] = useState(null);
  const [editedStatus, setEditedStatus] = useState('');
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [selectedTaskForPriority, setSelectedTaskForPriority] = useState(null);

  // Get unique categories from tasks
  const categories = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    const uniqueCategories = [...new Set(tasks.map(task => task.category))];
    return uniqueCategories.filter(Boolean);
  }, [tasks]);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    
    return tasks
      .filter(task => {
        // Search term filter
        const matchesSearch = searchTerm === '' || 
          task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        // Status filter
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
        
        // Category filter
        const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
        
        return matchesSearch && matchesStatus && matchesCategory;
      })
      .sort((a, b) => {
        // Sort by selected field
        if (sortBy === 'dueDate') {
          // Handle null due dates
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return sortDirection === 'asc' ? 1 : -1;
          if (!b.dueDate) return sortDirection === 'asc' ? -1 : 1;
          
          const dateA = parseISO(a.dueDate);
          const dateB = parseISO(b.dueDate);
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        } else if (sortBy === 'urgencyLevel') {
          return sortDirection === 'asc' 
            ? a.urgencyLevel - b.urgencyLevel 
            : b.urgencyLevel - a.urgencyLevel;
        } else if (sortBy === 'title') {
          return sortDirection === 'asc' 
            ? a.title.localeCompare(b.title) 
            : b.title.localeCompare(a.title);
        }
        return 0;
      });
  }, [tasks, searchTerm, statusFilter, categoryFilter, sortBy, sortDirection]);

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
  
  // Get urgency label based on level
  const getUrgencyLabel = (level) => {
    switch (level) {
      case 1: return 'Low';
      case 2: return 'Low-Medium';
      case 3: return 'Medium';
      case 4: return 'High';
      case 5: return 'Critical';
      default: return 'Medium';
    }
  };
  
  // Handle priority change
  const handlePriorityChange = (taskId, newLevel) => {
    if (onTaskUpdate && taskId) {
      const updatedTask = tasks.find(task => task.id === taskId);
      if (updatedTask) {
        onTaskUpdate({
          ...updatedTask,
          urgencyLevel: newLevel
        });
      }
    }
  };

  // Format date for display
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    const date = parseISO(dateString);
    return isValid(date) ? format(date, 'MMM d, yyyy h:mm a') : 'Invalid date';
  };

  // Toggle sort direction
  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2, overflow: 'hidden', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
            Task List
          </Typography>
          <Chip 
            label={`${filteredTasks.length} ${filteredTasks.length === 1 ? 'task' : 'tasks'}`} 
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
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Category"
                onChange={(e) => setCategoryFilter(e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {categories.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Tooltip title="Sort by Due Date">
                <Chip
                  icon={<SortIcon />}
                  label="Due Date"
                  clickable
                  color={sortBy === 'dueDate' ? 'primary' : 'default'}
                  onClick={() => handleSortChange('dueDate')}
                  variant={sortBy === 'dueDate' ? 'filled' : 'outlined'}
                  sx={{ borderRadius: 1.5 }}
                />
              </Tooltip>
              <Tooltip title="Sort by Urgency">
                <Chip
                  icon={<FlagIcon />}
                  label="Urgency"
                  clickable
                  color={sortBy === 'urgencyLevel' ? 'primary' : 'default'}
                  onClick={() => handleSortChange('urgencyLevel')}
                  variant={sortBy === 'urgencyLevel' ? 'filled' : 'outlined'}
                  sx={{ borderRadius: 1.5 }}
                />
              </Tooltip>
              <Tooltip title="Sort by Title">
                <Chip
                  icon={<FilterListIcon />}
                  label="Title"
                  clickable
                  color={sortBy === 'title' ? 'primary' : 'default'}
                  onClick={() => handleSortChange('title')}
                  variant={sortBy === 'title' ? 'filled' : 'outlined'}
                  sx={{ borderRadius: 1.5 }}
                />
              </Tooltip>
            </Box>
          </Grid> */}
        </Grid>
      </Paper>

      <Divider sx={{ mb: 3 }} />

      {/* Task List */}
      <Box sx={{ mt: 3, maxHeight: { xs: 'calc(100vh - 350px)', md: 'calc(100vh - 300px)' }, overflowY: 'auto', pr: 1, '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-track': { bgcolor: 'transparent' }, '&::-webkit-scrollbar-thumb': { bgcolor: alpha(theme.palette.primary.main, 0.2), borderRadius: '4px', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.3) } } }}>
        {filteredTasks.length === 0 ? (
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
            {filteredTasks.map((task) => (
            <Card 
              key={task.id} 
              elevation={2} // Slightly reduced elevation for a cleaner look
              onClick={() => {
                setEditingTask(task);
                setEditedStartTime(task.startTime ? parseISO(task.startTime) : null);
                setEditedEndTime(task.endTime ? parseISO(task.endTime) : null);
                setEditedStatus(task.status);
                setEditDialogOpen(true);
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
              <CardContent sx={{ p: 2 }}> {/* Consistent padding */} 
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {/* Removed Avatar for a cleaner look, status indicated by chip below */}
                    <Box>
                      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, lineHeight: 1.3 }}> {/* Adjusted typography */} 
                        {task.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        {formatDateTime(task.startTime)} {task.endTime ? `- ${formatDateTime(task.endTime)}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                  <Tooltip title={`Priority: ${getUrgencyLabel(task.urgencyLevel)}. Click to change.`}>
                    <Chip
                      icon={<FlagIcon sx={{ fontSize: '1rem', ml: '3px' }} />} // Add icon to priority chip
                      size="small"
                      label={getUrgencyLabel(task.urgencyLevel)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTaskForPriority(task);
                        setPriorityDialogOpen(true);
                      }}
                      sx={{ 
                        bgcolor: alpha(getUrgencyColor(task.urgencyLevel), 0.15),
                        color: getUrgencyColor(task.urgencyLevel),
                        fontWeight: 500, // Medium weight
                        borderRadius: 1,
                        cursor: 'pointer',
                        height: '24px', // Consistent height
                        '.MuiChip-label': { px: '8px' }, // Adjust label padding
                        '&:hover': {
                          bgcolor: alpha(getUrgencyColor(task.urgencyLevel), 0.25),
                        }
                      }}
                    />
                  </Tooltip>
                </Box>
                
                {task.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1.5, pl: 0.5, fontSize: '0.85rem' }}> {/* Adjusted description style */}
                    {task.description.length > 100 ? `${task.description.substring(0, 100)}...` : task.description} {/* Truncate long descriptions */} 
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', mt: 1.5, gap: 1, flexWrap: 'wrap', justifyContent: 'flex-start' }}> {/* Align chips left */} 
                  {task.category && (
                    <Chip 
                      label={task.category} 
                      size="small" 
                      variant="outlined"
                      sx={{ borderRadius: 1, fontWeight: 500 }}
                    />
                  )}
                  <Chip 
                    label={task.status}
                    icon={task.status === 'completed' ? <CheckCircleIcon sx={{ fontSize: '1rem', ml: '3px' }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: '1rem', ml: '3px' }} />} // Add icon to status chip
                    size="small"
                    sx={{ 
                      borderRadius: 1,
                      fontWeight: 500,
                      bgcolor: task.status === 'completed' ? alpha(theme.palette.success.main, 0.1) : 
                              task.status === 'in-progress' ? alpha(theme.palette.info.main, 0.1) : 
                              alpha(theme.palette.grey[500], 0.1),
                      color: task.status === 'completed' ? theme.palette.success.dark : 
                             task.status === 'in-progress' ? theme.palette.info.dark : 
                             theme.palette.grey[700],
                      height: '24px', // Consistent height
                      '.MuiChip-label': { px: '8px' }, // Adjust label padding
                    }}
                  />
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
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <DateTimePicker
                  label="Start Time"
                  value={editedStartTime}
                  onChange={setEditedStartTime}
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
                  onChange={setEditedEndTime}
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
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={editedStatus}
                label="Status"
                onChange={(e) => setEditedStatus(e.target.value)}
                size="small"
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
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
          <Button 
            onClick={() => {
              if (editingTask && onTaskUpdate) {
                onTaskUpdate({
                  ...editingTask,
                  startTime: editedStartTime ? format(editedStartTime, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : null,
                  endTime: editedEndTime ? format(editedEndTime, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : null,
                  status: editedStatus
                });
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
    </Paper>
  );
};

export default TaskList;
