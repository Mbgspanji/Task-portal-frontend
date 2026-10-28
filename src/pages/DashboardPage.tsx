import { useState, useEffect, useCallback } from 'react';
import type { FC, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
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

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [taskPage, setTaskPage] = useState(1);
  const location = useLocation();
  const tasksPerPage = 5;

  // Create / Edit task form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStatus, setNewStatus] = useState<TaskStatus>('todo');
  const [assignedUserId, setAssignedUserId] = useState<number | ''>('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      setError('Gagal memuat tugas. Silakan refresh halaman.');
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
      setError('Gagal memuat data pengguna.');
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

  // Tutup dropdown menu aksi saat klik di luar area menu atau tombol Escape
  useEffect(() => {
    if (openActionId === null) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.action-menu')) {
        setOpenActionId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenActionId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openActionId]);

  // Reset dropdown menu aksi saat berpindah route / tab atau saat ganti halaman / filter
  useEffect(() => {
    setOpenActionId(null);
  }, [location.pathname, taskPage, filterStatus, searchQuery]);

  // Reset dropdown menu aksi saat unmount
  useEffect(() => {
    return () => {
      setOpenActionId(null);
    };
  }, []);

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setNewTitle('');
    setNewDesc('');
    setNewStatus('todo');
    setAssignedUserId(user?.id || '');
    setCreateError('');
    setShowCreateModal(true);
  };

  const openEditTask = (task: Task) => {
    setOpenActionId(null);
    setEditingTask(task);
    setNewTitle(task.title);
    setNewDesc(task.description || '');
    setNewStatus(task.status);
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
        let updatedTask = {
          ...res.data.data,
          status: normalizeTaskStatus(res.data.data.status),
        };

        if (newStatus !== editingTask.status) {
          const statusRes = await taskApi.updateStatus(editingTask.id, newStatus);
          updatedTask = {
            ...updatedTask,
            ...statusRes.data.data,
            status: normalizeTaskStatus(statusRes.data.data.status),
          };
        }

        setTasks((prev) =>
          prev.map((task) =>
            task.id === editingTask.id
              ? { ...task, ...updatedTask }
              : task
          )
        );
      } else {
        const payload: { title: string; description: string; status: string; userId?: number } = {
          title: newTitle,
          description: newDesc,
          status: newStatus,
        };
        if (user?.role === 'admin' && assignedUserId) {
          payload.userId = Number(assignedUserId);
        }

        const res = await taskApi.createTask(payload);
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
        (editingTask ? 'Gagal memperbarui task.' : 'Gagal membuat task.')
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    setIsDeleting(true);

    try {
      await taskApi.deleteTask(deletingTask.id);
      setTasks((prev) => prev.filter((t) => t.id !== deletingTask.id));
      setDeletingTask(null);
    } catch {
      setError('Gagal menghapus task.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter & Search
  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.user_name && t.user_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const orderedTasks = [...filteredTasks].sort((a, b) => {
    const dateDifference = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return dateDifference || b.id - a.id;
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
                {taskOnly ? '📋 Manajemen Tugas (CRUD)' : user?.role === 'admin' ? '🛡️ Admin Dashboard' : '📋 Task Saya'}
              </h1>
              <p className="dashboard-subtitle">
                {taskOnly
                  ? 'Buat, lihat, ubah status, edit, dan hapus tugas Anda'
                  : user?.role === 'admin'
                  ? 'Monitor dan kelola seluruh tugas karyawan dan pengguna di portal'
                  : `Selamat datang kembali, ${user?.name}! Kelola tugas harian Anda.`}
              </p>
            </div>
            <button
              id="btn-create-task"
              className="btn btn-primary"
              onClick={handleOpenCreateModal}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              + Task Baru
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
                <p className="stat-label">Total Task</p>
              </div>
            </div>

            <div className="stat-card" onClick={() => { setFilterStatus('in_progress'); setTaskPage(1); }}>
              <div className="stat-icon stat-icon-time">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <p className="stat-value">{tasks.filter((t) => t.status === 'in_progress').length}</p>
                <p className="stat-label">Sedang Berjalan</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-date">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div>
                <p className="stat-value stat-value-date">{currentDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                <p className="stat-label">Hari Ini ({currentDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})</p>
              </div>
            </div>

            {!taskOnly && user?.role === 'admin' && (
              <div className="stat-card users-stat-card">
                <div className="stat-icon stat-icon-users">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div className="users-stat-content">
                  <p className="stat-value">{users.length}</p>
                  <p className="stat-label">Pengguna</p>
                  <a className="summary-link" href="/admin/users">Kelola User →</a>
                </div>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* Tasks Section */}
          <div className="tasks-section fade-in" id="tasks">
            <div className="tasks-toolbar">
              {/* Search Box */}
              <div className="search-box">
                <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Cari judul atau deskripsi task..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setTaskPage(1); }}
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="filter-tabs">
                {(['all', 'todo', 'in_progress', 'done'] as const).map((status) => (
                  <button
                    key={status}
                    className={`filter-tab ${filterStatus === status ? 'active' : ''}`}
                    onClick={() => { setFilterStatus(status); setTaskPage(1); }}
                    id={`filter-${status}`}
                  >
                    {status === 'all' ? 'Semua' : STATUS_CONFIG[status as TaskStatus].label}
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
                <p>Memuat daftar task...</p>
              </div>
            ) : orderedTasks.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📋</div>
                <p>{filterStatus === 'all' ? 'Belum ada task. Buat task pertama Anda!' : `Tidak ada task dengan status "${filterStatus}".`}</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Judul Task</th>
                      <th>Deskripsi</th>
                      {user?.role === 'admin' && <th>Pemilik Task</th>}
                      <th>Status</th>
                      <th>Dibuat</th>
                      <th style={{ textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTasks.map((task, idx) => {
                      const canManage = user?.role === 'admin' || task.user_id === user?.id;
                      return (
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
                                <div className="mini-avatar">{task.user_name?.charAt(0) || 'U'}</div>
                                <div>
                                  <p className="user-cell-name">{task.user_name || 'User'}</p>
                                  <p className="user-cell-email">{task.user_email || ''}</p>
                                </div>
                              </div>
                            </td>
                          )}
                          <td>
                            <span className={`status-badge badge ${STATUS_CONFIG[task.status].className}`}>
                              {STATUS_CONFIG[task.status].label}
                            </span>
                          </td>
                          <td className="date-cell">
                            {new Date(task.created_at).toLocaleDateString('id-ID', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="task-actions">
                              {canManage && (
                                <div className="action-menu">
                                  <button
                                    type="button"
                                    className="action-menu-trigger"
                                    onClick={() => setOpenActionId(openActionId === task.id ? null : task.id)}
                                    aria-label={`Open actions for ${task.title}`}
                                    aria-expanded={openActionId === task.id}
                                    id={`btn-actions-${task.id}`}
                                  >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
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
                                        Edit Task
                                      </button>
                                      <button
                                        type="button"
                                        className="action-menu-item action-menu-item-danger"
                                        onClick={() => {
                                          setOpenActionId(null);
                                          setDeletingTask(task);
                                        }}
                                        id={`btn-delete-${task.id}`}
                                        role="menuitem"
                                      >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                        Hapus Task
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Baris placeholder agar tampilan tabel selalu konsisten 5 baris */}
                    {Array.from({ length: Math.max(0, tasksPerPage - paginatedTasks.length) }).map((_, i) => (
                      <tr key={`task-placeholder-${i}`} className="task-row task-row-placeholder" aria-hidden="true">
                        <td className="row-num" style={{ opacity: 0 }}>—</td>
                        <td className="task-title-cell" style={{ opacity: 0 }}>&nbsp;</td>
                        <td className="task-desc-cell" style={{ opacity: 0 }}>&nbsp;</td>
                        {user?.role === 'admin' && <td style={{ opacity: 0 }}>&nbsp;</td>}
                        <td><span style={{ visibility: 'hidden' }}>—</span></td>
                        <td className="date-cell" style={{ opacity: 0 }}>&nbsp;</td>
                        <td style={{ textAlign: 'right', opacity: 0 }}>&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer Pagination */}
                <div className="datatable-footer">
                  <span className="datatable-summary">
                    Menampilkan {orderedTasks.length === 0 ? 0 : (currentTaskPage - 1) * tasksPerPage + 1}
                    {' '}-{' '}
                    {Math.min(currentTaskPage * tasksPerPage, orderedTasks.length)} dari {orderedTasks.length} task
                  </span>
                  <div className="datatable-pagination" aria-label="Task table pagination">
                    <button
                      type="button"
                      className="datatable-page-button"
                      onClick={() => setTaskPage((page) => Math.max(1, page - 1))}
                      disabled={currentTaskPage === 1}
                    >
                      Sebelumnya
                    </button>
                    <span className="datatable-page-number">
                      Hal {currentTaskPage} dari {taskPageCount}
                    </span>
                    <button
                      type="button"
                      className="datatable-page-button"
                      onClick={() => setTaskPage((page) => Math.min(taskPageCount, page + 1))}
                      disabled={currentTaskPage === taskPageCount}
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* CREATE / EDIT TASK MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setEditingTask(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTask ? 'Edit Task' : 'Buat Task Baru'}</h2>
              <p>{editingTask ? 'Perbarui informasi judul dan deskripsi task' : 'Masukkan informasi detail task yang ingin dibuat'}</p>
            </div>

            {createError && (
              <div className="alert alert-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {createError}
              </div>
            )}

            <form onSubmit={handleSaveTask}>
              {/* If Admin creating new task, allow assigning to any user */}
              {!editingTask && user?.role === 'admin' && users.length > 0 && (
                <div className="form-group">
                  <label htmlFor="assign-user" className="form-label">Tugaskan Kepada (Assigned To)</label>
                  <select
                    id="assign-user"
                    className="form-select"
                    value={assignedUserId}
                    onChange={(e) => setAssignedUserId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value={user.id}>Diri Saya Sendiri ({user.name})</option>
                    {users
                      .filter((u) => u.id !== user.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email}) - {u.role}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="task-title" className="form-label">Judul Task *</label>
                <input
                  id="task-title"
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Implementasi fitur autentikasi JWT"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  maxLength={255}
                />
              </div>

              <div className="form-group">
                <label htmlFor="task-desc" className="form-label">Deskripsi Task</label>
                <textarea
                  id="task-desc"
                  className="form-textarea"
                  placeholder="Tambahkan detail catatan atau instruksi pengerjaan..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  maxLength={2000}
                />
              </div>

              {editingTask ? (
                <div className="form-group">
                  <label htmlFor="task-edit-status" className="form-label">Status Task</label>
                  <select
                    id="task-edit-status"
                    className="form-select"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label htmlFor="task-status" className="form-label">Status Awal</label>
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
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { setShowCreateModal(false); setEditingTask(null); }}
                  id="btn-cancel-create"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCreating}
                  id="btn-submit-create"
                >
                  {isCreating
                    ? <><span className="spinner" /> {editingTask ? 'Menyimpan...' : 'Membuat...'}</>
                    : editingTask ? 'Simpan Perubahan' : '+ Buat Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingTask && (
        <div className="modal-overlay" onClick={() => setDeletingTask(null)}>
          <div className="modal-content modal-confirm-danger" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-danger">⚠️</div>
            <h2>Hapus Task?</h2>
            <p>
              Apakah Anda yakin ingin menghapus task <strong>"{deletingTask.title}"</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="modal-footer" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDeletingTask(null)}
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <><span className="spinner" /> Menghapus...</> : 'Ya, Hapus Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
