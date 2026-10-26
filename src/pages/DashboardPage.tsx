import { useState, useEffect, useCallback } from 'react';
import type { FC, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { taskApi } from '../services/api';
import type { Task, TaskStatus } from '../utils/types';
import { normalizeTaskStatus, STATUS_CONFIG, STATUS_OPTIONS } from '../utils/types';
import Navbar from '../components/Navbar';
import './DashboardPage.css';

const DashboardPage: FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  useEffect(() => {
    void Promise.resolve().then(fetchTasks);
  }, [fetchTasks]);

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

  // Stats
  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };

  return (
    <div className="dashboard-page">
      <Navbar />
      <main className="dashboard-main">
        <div className="container">

          {/* Header */}
          <div className="dashboard-header fade-in">
            <div>
              <h1 className="dashboard-title">
                {user?.role === 'admin' ? '🛡️ Admin Dashboard' : '📋 My Tasks'}
              </h1>
              <p className="dashboard-subtitle">
                {user?.role === 'admin'
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
            <div className="stat-card" onClick={() => setFilterStatus('all')}>
              <div className="stat-icon stat-icon-total">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
              </div>
              <div>
                <p className="stat-value">{stats.total}</p>
                <p className="stat-label">Total Tasks</p>
              </div>
            </div>
            <div className="stat-card" onClick={() => setFilterStatus('todo')}>
              <div className="stat-icon stat-icon-todo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <p className="stat-value">{stats.todo}</p>
                <p className="stat-label">To-Do</p>
              </div>
            </div>
            <div className="stat-card" onClick={() => setFilterStatus('in_progress')}>
              <div className="stat-icon stat-icon-progress">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </div>
              <div>
                <p className="stat-value">{stats.inProgress}</p>
                <p className="stat-label">In Progress</p>
              </div>
            </div>
            <div className="stat-card" onClick={() => setFilterStatus('done')}>
              <div className="stat-icon stat-icon-done">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div>
                <p className="stat-value">{stats.done}</p>
                <p className="stat-label">Completed</p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* Tasks Table */}
          <div className="tasks-section fade-in">
            <div className="tasks-toolbar">
              <div className="filter-tabs">
                {(['all', 'todo', 'in_progress', 'done'] as const).map((status) => (
                  <button
                    key={status}
                    className={`filter-tab ${filterStatus === status ? 'active' : ''}`}
                    onClick={() => setFilterStatus(status)}
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
                    {filteredTasks.map((task, idx) => (
                      <tr key={task.id} className="task-row">
                        <td className="row-num">{idx + 1}</td>
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
                          {user?.role === 'admin' && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(task.id)}
                              disabled={deletingId === task.id}
                              id={`btn-delete-${task.id}`}
                            >
                              {deletingId === task.id ? (
                                <span className="spinner" />
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                              )}
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Task</h2>
              <p>Fill in the details below to add a new task</p>
            </div>

            {createError && (
              <div className="alert alert-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTask}>
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
              <div className="form-group">
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
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreateModal(false)}
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
                  {isCreating ? <><span className="spinner" /> Creating...</> : '+ Create Task'}
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
