// Task status types
export type TaskStatus = 'todo' | 'in_progress' | 'done';

// User role types
export type UserRole = 'admin' | 'employee';

// Task entity
export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  user_id: number;
  user_name: string;
  user_email: string;
}

// User entity
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_verified?: boolean;
  created_at: string;
  updated_at?: string;
}

// API payload types
export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: UserRole;
  password?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const normalizeTaskStatus = (status: string): TaskStatus => {
  const normalizedStatus = status.trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (normalizedStatus === 'in_progress' || normalizedStatus === 'inprogress') {
    return 'in_progress';
  }

  if (normalizedStatus === 'done' || normalizedStatus === 'completed') {
    return 'done';
  }

  if (normalizedStatus === 'todo' || normalizedStatus === 'to_do') {
    return 'todo';
  }

  return 'todo';
};

// Status display config
export const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  todo: { label: 'To-Do', className: 'badge-todo' },
  in_progress: { label: 'In Progress', className: 'badge-in-progress' },
  done: { label: 'Done', className: 'badge-done' },
};

export const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To-Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'employee', label: 'Employee', description: 'Can manage own tasks' },
  { value: 'admin', label: 'Admin', description: 'Can manage all tasks & users' },
];
