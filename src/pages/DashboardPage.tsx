import { useState, useEffect, useCallback } from 'react';
import type { FC, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi, taskApi } from '../services/api';
import type { Task, TaskStatus, User } from '../utils/types';
import { normalizeTaskStatus, STATUS_CONFIG, STATUS_OPTIONS } from '../utils/types';
import Navbar from '../components/Navbar';
import './DashboardPage.css';

interface DashboardPageProps {
  taskOnly?: boolean;
}

const DashboardPage: FC<DashboardPageProps> = ({ taskOnly = false }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [openActionId, setOpenActionId] = useState<number | null>(null);

  // Create task form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStatus, setNewStatus] = useState<TaskStatus>('todo');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Status update states
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Filter
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [taskPage, setTaskPage] = useState(1);
  const tasksPerPage = 10;

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await taskApi.getTasks();
      setTasks(
        res.data.data.map((task: Task) => ({
          ...task,
          status: normalizeTaskStatus(task.status),
        }))
      );
    } catch {
      setError('Failed to load tasks. Please try refreshing.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    if (user?.role !== 'admin') return;

    try {
      const res = await adminApi.getAllUsers();
      setUsers(res.data.data);
    } catch {
      setError('Failed to load users. Please try refreshing.');
    }
  }, [user?.role]);

  useEffect(() => {
    void Promise.resolve().then(fetchTasks);
  }, [fetchTasks]);

  useEffect(() => {
    void Promise.resolve().then(fetchUsers);
  }, [fetchUsers]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentDate(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setIsCreating(true);
    try {
      const res = await taskApi.createTask({ title: newTitle, description: newDesc, status: newStatus });
      setTasks((prev) => [
        { ...res.data.data, status: normalizeTaskStatus(res.data.data.status) },
        ...prev,
      ]);
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewStatus('todo');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setCreateError(axiosErr?.response?.data?.message || 'Failed to create task.');
    } finally {
      setIsCreating(false);
    }
  };

  const openEditTask = (task: Task) => {
    setOpenActionId(null);
    setEditingTask(task);
    setNewTitle(task.title);
    setNewDesc(task.description || '');
    setCreateError('');
    setShowCreateModal(true);
  };

  const handleSaveTask = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setIsCreating(true);

    try {
      if (editingTask) {
        const res = await taskApi.updateTask(editingTask.id, {
          title: newTitle,
          description: newDesc,
        });
        setTasks((prev) => prev.map((task) => (
          task.id === editingTask.id
            ? { ...task, ...res.data.data, status: normalizeTaskStatus(res.data.data.status) }
            : task
        )));
      } else {
        const res = await taskApi.createTask({ title: newTitle, description: newDesc, status: newStatus });
        setTasks((prev) => [
          { ...res.data.data, status: normalizeTaskStatus(res.data.data.status) },
          ...prev,
        ]);
      }

      setShowCreateModal(false);
      setEditingTask(null);
      setNewTitle('');
      setNewDesc('');
      setNewStatus('todo');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setCreateError(
        axiosErr?.response?.data?.message ||
        (editingTask ? 'Failed to update task.' : 'Failed to create task.')
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (taskId: number, newStatusVal: TaskStatus) => {
    setUpdatingId(taskId);
    try {
      const res = await taskApi.updateStatus(taskId, newStatusVal);
      setTasks((prev) =>
        prev.map((t) => (
          t.id === taskId
            ? { ...t, ...res.data.data, status: normalizeTaskStatus(res.data.data.status) }
            : t
        ))
      );
    } catch {
      setError('Failed to update task status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm('Delete this task? This action cannot be undone.')) return;
    setOpenActionId(null);
    setDeletingId(taskId);
    try {
      await taskApi.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      setError('Failed to delete task.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTasks = filterStatus === 'all'
    ? tasks
    : tasks.filter((t) => t.status === filterStatus);
  const orderedTasks = [...filteredTasks].sort((a, b) => {
    const dateDifference = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return dateDifference || a.id - b.id;
  });
  const taskPageCount = Math.max(1, Math.ceil(orderedTasks.length / tasksPerPage));
  const currentTaskPage = Math.min(taskPage, taskPageCount);
  const paginatedTasks = orderedTasks.slice(
    (currentTaskPage - 1) * tasksPerPage,
    currentTaskPage * tasksPerPage
  );

  return (
    <div className={`dashboard-page ${taskOnly ? 'task-page' : ''}`}>
      <Navbar />
      <main className="dashboard-main">
        <div className="container">

          {/* Header */}
          <div className="dashboard-header fade-in">
            <div>
              <h1 className="dashboard-title">
                {taskOnly ? '📋 Tasks' : user?.role === 'admin' ? '🛡️ Admin Dashboard' : '📋 My Tasks'}
              </h1>
              <p className="dashboard-subtitle">
                {taskOnly
                  ? 'Create, update, and manage your tasks'
                  : user?.role === 'admin'
                  ? 'Monitor and manage all employee tasks across the portal'
                  : `Welcome back, ${user?.name}! Here are your tasks.`}
              </p>
            </div>
            <button
              id="btn-create-task"
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Task
            </button>
          </div>

          {/* Stats Row */}
          <div className="stats-grid fade-in">
            <div className="stat-card" onClick={() => { setFilterStatus('all'); setTaskPage(1); }}>
              <div className="stat-icon stat-icon-total">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
              </div>

              <div>
                <p className="stat-value">{tasks.length}</p>
                <p className="stat-label">Total Tasks</p>
              </div>

            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-date">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div>
                <p className="stat-value stat-value-date">{currentDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                <p className="stat-label">Today</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-time">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
              </div>
              <div>
                <p className="stat-value stat-value-time">{currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="stat-label">Current Time</p>
              </div>
            </div>
            {!taskOnly && user?.role === 'admin' && (
              <div className="stat-card users-stat-card">
                <div className="stat-icon stat-icon-users">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div className="users-stat-content">
                  <p className="stat-value">{users.length}</p>
                  <p className="stat-label">People</p>
                  <a className="summary-link" href="/admin/users">Manage users</a>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* Tasks Table */}
          <div className="tasks-section fade-in" id="tasks">
            <div className="tasks-toolbar">
              <div className="filter-tabs">
                {(['all', 'todo', 'in_progress', 'done'] as const).map((status) => (
                  <button
                    key={status}
                    className={`filter-tab ${filterStatus === status ? 'active' : ''}`}
                    onClick={() => { setFilterStatus(status); setTaskPage(1); }}
                    id={`filter-${status}`}
                  >
                    {status === 'all' ? 'All' : STATUS_CONFIG[status as TaskStatus].label}
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={fetchTasks} id="btn-refresh">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="loading-state">
                <div className="spinner" style={{ width: '2rem', height: '2rem', color: 'var(--color-primary)' }} />
                <p>Loading tasks...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📋</div>
                <p>{filterStatus === 'all' ? 'No tasks yet. Create your first task!' : `No tasks with status "${filterStatus}".`}</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Title</th>
                      <th>Description</th>
                      {user?.role === 'admin' && <th>Assigned To</th>}
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTasks.map((task, idx) => (
                      <tr key={task.id} className="task-row">
                        <td className="row-num">{(currentTaskPage - 1) * tasksPerPage + idx + 1}</td>
                        <td className="task-title-cell">
                          <span className="task-title">{task.title}</span>
                        </td>
                        <td className="task-desc-cell">
                          <span className="task-desc">{task.description || '—'}</span>
                        </td>
                        {user?.role === 'admin' && (
                          <td>
                            <div className="user-cell">
                              <div className="mini-avatar">{task.user_name?.charAt(0)}</div>
                              <div>
                                <p className="user-cell-name">{task.user_name}</p>
                                <p className="user-cell-email">{task.user_email}</p>
                              </div>
                            </div>
                          </td>
                        )}
                        <td>
                          <select
                            className={`status-select badge ${STATUS_CONFIG[task.status].className}`}
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                            disabled={updatingId === task.id || (user?.role === 'employee' && task.user_id !== user.id)}
                            id={`status-select-${task.id}`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="date-cell">
                          {new Date(task.created_at).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </td>
                        <td>
                          <div className="task-actions">
                            {(user?.role === 'admin' || task.user_id === user?.id) && (
                              <div className="action-menu">
                                <button
                                  type="button"
                                  className="action-menu-trigger"
                                  onClick={() => setOpenActionId(openActionId === task.id ? null : task.id)}
                                  aria-label={`Open actions for ${task.title}`}
                                  aria-expanded={openActionId === task.id}
                                  id={`btn-actions-${task.id}`}
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <circle cx="12" cy="5" r="1.5" />
                                    <circle cx="12" cy="12" r="1.5" />
                                    <circle cx="12" cy="19" r="1.5" />
                                  </svg>
                                </button>
                                {openActionId === task.id && (
                                  <div className="action-menu-dropdown" role="menu">
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => openEditTask(task)}
                                      id={`btn-edit-${task.id}`}
                                      role="menuitem"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                      Edit
                                    </button>
                                    {user?.role === 'admin' && (
                                      <button
                                        type="button"
                                        className="action-menu-item action-menu-item-danger"
                                        onClick={() => handleDelete(task.id)}
                                        disabled={deletingId === task.id}
                                        id={`btn-delete-${task.id}`}
                                        role="menuitem"
                                      >
                                        {deletingId === task.id ? (
                                          <span className="spinner" />
                                        ) : (
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                        )}
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="datatable-footer">
                  <span className="datatable-summary">
                    Showing {orderedTasks.length === 0 ? 0 : (currentTaskPage - 1) * tasksPerPage + 1}
                    {' '}-{' '}
                    {Math.min(currentTaskPage * tasksPerPage, orderedTasks.length)} of {orderedTasks.length}
                  </span>
                  <div className="datatable-pagination" aria-label="Task table pagination">
                    <button
                      type="button"
                      className="datatable-page-button"
                      onClick={() => setTaskPage((page) => Math.max(1, page - 1))}
                      disabled={currentTaskPage === 1}
                    >
                      Previous
                    </button>
                    <span className="datatable-page-number">
                      Page {currentTaskPage} of {taskPageCount}
                    </span>
                    <button
                      type="button"
                      className="datatable-page-button"
                      onClick={() => setTaskPage((page) => Math.min(taskPageCount, page + 1))}
                      disabled={currentTaskPage === taskPageCount}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setEditingTask(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
              <p>{editingTask ? 'Update your task details below' : 'Fill in the details below to add a new task'}</p>
            </div>

            {createError && (
              <div className="alert alert-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {createError}
              </div>
            )}

            <form onSubmit={editingTask ? handleSaveTask : handleCreateTask}>
              <div className="form-group">
                <label htmlFor="task-title" className="form-label">Task Title *</label>
                <input
                  id="task-title"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Design system review"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  maxLength={255}
                />
              </div>
              <div className="form-group">
                <label htmlFor="task-desc" className="form-label">Description</label>
                <textarea
                  id="task-desc"
                  className="form-textarea"
                  placeholder="Optional: add more details about this task..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  maxLength={2000}
                />
              </div>
              {!editingTask && <div className="form-group">
                <label htmlFor="task-status" className="form-label">Initial Status</label>
                <select
                  id="task-status"
                  className="form-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { setShowCreateModal(false); setEditingTask(null); }}
                  id="btn-cancel-create"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCreating}
                  id="btn-submit-create"
                >
                  {isCreating
                    ? <><span className="spinner" /> {editingTask ? 'Saving...' : 'Creating...'}</>
                    : editingTask ? 'Save Changes' : '+ Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
