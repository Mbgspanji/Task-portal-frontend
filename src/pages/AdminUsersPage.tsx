import { useState, useEffect, useCallback } from 'react';
import type { FC, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';
import type { User, UserRole } from '../utils/types';
import Navbar from '../components/Navbar';
import './AdminUsersPage.css';

const AdminUsersPage: FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('employee');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Delete State
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 5;

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getAllUsers();
      setUsers(res.data.data);
    } catch {
      setError('Gagal memuat daftar pengguna.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchUsers);
  }, [fetchUsers]);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      const res = await adminApi.createUser({ name, email, password, role });
      setUsers((prev) => [res.data.data, ...prev]);
      setShowCreateModal(false);
      setName('');
      setEmail('');
      setPassword('');
      setRole('employee');
      setSuccessMsg(`Akun ${role === 'admin' ? 'Admin' : 'Employee'} berhasil dibuat!`);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setFormError(axiosErr?.response?.data?.message || 'Gagal membuat akun.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditPassword('');
    setFormError('');
  };

  const handleUpdateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormError('');
    setIsSubmitting(true);

    try {
      const payload: { name: string; email: string; role: UserRole; password?: string } = {
        name: editName,
        email: editEmail,
        role: editRole,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await adminApi.updateUser(editingUser.id, payload);
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...res.data.data } : u))
      );
      setEditingUser(null);
      setSuccessMsg('Data pengguna berhasil diperbarui!');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setFormError(axiosErr?.response?.data?.message || 'Gagal memperbarui pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);

    try {
      await adminApi.deleteUser(deletingUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      setDeletingUser(null);
      setSuccessMsg(`Pengguna "${deletingUser.name}" berhasil dihapus.`);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Gagal menghapus pengguna.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter & Search
  const filteredUsers = users.filter((u) => {
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const orderedUsers = [...filteredUsers].sort((a, b) => {
    const dateDifference = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return dateDifference || b.id - a.id;
  });

  const userPageCount = Math.max(1, Math.ceil(orderedUsers.length / usersPerPage));
  const currentUserPage = Math.min(userPage, userPageCount);
  const paginatedUsers = orderedUsers.slice(
    (currentUserPage - 1) * usersPerPage,
    currentUserPage * usersPerPage
  );

  return (
    <div className="admin-users-page dashboard-page">
      <Navbar />
      <main className="admin-main">
        <div className="container">

          {/* Page Header */}
          <div className="page-header fade-in">
            <div>
              <h1 className="page-title">👥 Manajemen Pengguna (CRUD)</h1>
              <p className="page-subtitle">Kelola akun, pilih role (Admin/Employee), edit data, atau hapus pengguna.</p>
            </div>
            <button
              id="btn-add-user"
              className="btn btn-primary"
              onClick={() => {
                setShowCreateModal(true);
                setFormError('');
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              + Tambah Pengguna
            </button>
          </div>

          {/* Alerts */}
          {successMsg && (
            <div className="alert alert-success fade-in">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              {successMsg}
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* Users Card Section */}
          <div className="users-section fade-in">
            {/* Toolbar: Search and Filter Tabs */}
            <div className="users-toolbar">
              <div className="search-box">
                <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Cari nama atau email..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setUserPage(1); }}
                />
              </div>

              <div className="filter-tabs">
                <button
                  type="button"
                  className={`filter-tab ${filterRole === 'all' ? 'active' : ''}`}
                  onClick={() => { setFilterRole('all'); setUserPage(1); }}
                >
                  Semua ({users.length})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${filterRole === 'admin' ? 'active' : ''}`}
                  onClick={() => { setFilterRole('admin'); setUserPage(1); }}
                >
                  🛡️ Admin ({users.filter((u) => u.role === 'admin').length})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${filterRole === 'employee' ? 'active' : ''}`}
                  onClick={() => { setFilterRole('employee'); setUserPage(1); }}
                >
                  👤 Employee ({users.filter((u) => u.role === 'employee').length})
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="loading-state">
                <div className="spinner" style={{ width: '2rem', height: '2rem', color: 'var(--color-primary)' }} />
                <p>Memuat daftar pengguna...</p>
              </div>
            ) : orderedUsers.length === 0 ? (
              <div className="empty-state">
                <div className="icon">👥</div>
                <p>Tidak ada pengguna yang cocok dengan pencarian.</p>
              </div>
            ) : (
              <div className="table-wrapper users-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Pengguna</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status Email</th>
                      <th>Bergabung</th>
                      <th style={{ textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((u, index) => {
                      const isCurrentLoggedIn = currentUser?.id === u.id;
                      return (
                        <tr key={u.id} className="user-table-row">
                          <td className="row-num">{(currentUserPage - 1) * usersPerPage + index + 1}</td>
                          <td>
                            <div className="user-cell">
                              <div className={`mini-avatar ${u.role === 'admin' ? 'mini-avatar-admin' : ''}`}>
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="user-cell-meta">
                                <span className="user-table-name">{u.name}</span>
                                {isCurrentLoggedIn && <span className="you-tag">(Anda)</span>}
                              </div>
                            </div>
                          </td>
                          <td className="user-table-email">{u.email}</td>
                          <td>
                            <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-employee'}`}>
                              {u.role === 'admin' ? '🛡️ Admin' : '👤 Employee'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${u.is_verified !== false ? 'badge-verified' : 'badge-pending'}`}>
                              {u.is_verified !== false ? '✓ Terverifikasi' : '⏳ Pending'}
                            </span>
                          </td>
                          <td className="user-card-date">
                            {new Date(u.created_at).toLocaleDateString('id-ID', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="user-row-actions">
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs btn-action-edit"
                                onClick={() => openEditModal(u)}
                                title="Edit Pengguna"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                Edit
                              </button>

                              <button
                                type="button"
                                className="btn btn-ghost btn-xs btn-action-delete"
                                onClick={() => setDeletingUser(u)}
                                disabled={isCurrentLoggedIn}
                                title={isCurrentLoggedIn ? 'Anda tidak dapat menghapus akun sendiri' : 'Hapus Pengguna'}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Baris placeholder agar tabel selalu konsisten 5 baris */}
                    {Array.from({ length: Math.max(0, usersPerPage - paginatedUsers.length) }).map((_, i) => (
                      <tr key={`user-placeholder-${i}`} className="user-table-row user-row-placeholder" aria-hidden="true">
                        <td className="row-num" style={{ opacity: 0 }}>—</td>
                        <td style={{ opacity: 0 }}>&nbsp;</td>
                        <td className="user-table-email" style={{ opacity: 0 }}>&nbsp;</td>
                        <td><span style={{ visibility: 'hidden' }}>—</span></td>
                        <td><span style={{ visibility: 'hidden' }}>—</span></td>
                        <td className="user-card-date" style={{ opacity: 0 }}>&nbsp;</td>
                        <td style={{ textAlign: 'right', opacity: 0 }}>&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer Pagination */}
                <div className="datatable-footer">
                  <span className="datatable-summary">
                    Menampilkan {orderedUsers.length === 0 ? 0 : (currentUserPage - 1) * usersPerPage + 1}
                    {' '}-{' '}
                    {Math.min(currentUserPage * usersPerPage, orderedUsers.length)} dari {orderedUsers.length} pengguna
                  </span>
                  <div className="datatable-pagination" aria-label="User table pagination">
                    <button
                      type="button"
                      className="datatable-page-button"
                      onClick={() => setUserPage((page) => Math.max(1, page - 1))}
                      disabled={currentUserPage === 1}
                    >
                      Sebelumnya
                    </button>
                    <span className="datatable-page-number">
                      Hal {currentUserPage} dari {userPageCount}
                    </span>
                    <button
                      type="button"
                      className="datatable-page-button"
                      onClick={() => setUserPage((page) => Math.min(userPageCount, page + 1))}
                      disabled={currentUserPage === userPageCount}
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

      {/* CREATE USER MODAL (With Role Selector) */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah Pengguna Baru</h2>
              <p>Pilih role dan masukkan data akun yang akan dibuat</p>
            </div>

            {formError && (
              <div className="alert alert-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser}>
              {/* Role Selection */}
              <div className="form-group">
                <label className="form-label">Pilih Role Pengguna *</label>
                <div className="role-selection-grid">
                  <label
                    className={`role-card ${role === 'employee' ? 'selected' : ''}`}
                    onClick={() => setRole('employee')}
                  >
                    <input
                      type="radio"
                      name="new-user-role"
                      value="employee"
                      checked={role === 'employee'}
                      onChange={() => setRole('employee')}
                      className="role-radio"
                    />
                    <div className="role-card-icon">👤</div>
                    <div className="role-card-text">
                      <strong className="role-card-title">Employee</strong>
                      <span className="role-card-desc">Mengakses & mengelola task milik sendiri</span>
                    </div>
                  </label>

                  <label
                    className={`role-card ${role === 'admin' ? 'selected' : ''}`}
                    onClick={() => setRole('admin')}
                  >
                    <input
                      type="radio"
                      name="new-user-role"
                      value="admin"
                      checked={role === 'admin'}
                      onChange={() => setRole('admin')}
                      className="role-radio"
                    />
                    <div className="role-card-icon">🛡️</div>
                    <div className="role-card-text">
                      <strong className="role-card-title">Admin</strong>
                      <span className="role-card-desc">Hak penuh manajemen user & task</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="user-name" className="form-label">Nama Lengkap *</label>
                <input
                  id="user-name"
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Rina Melati"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label htmlFor="user-email" className="form-label">Alamat Email *</label>
                <input
                  id="user-email"
                  type="email"
                  className="form-input"
                  placeholder="rina@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="user-password" className="form-label">Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="user-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0,
                      background: 'none', border: 'none', padding: '0 0.875rem',
                      cursor: 'pointer', color: 'var(--text-muted)',
                      display: 'flex', alignItems: 'center'
                    }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { setShowCreateModal(false); setFormError(''); }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <><span className="spinner" /> Membuat...</> : '+ Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL (With Role Selector & Password Reset) */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Data Pengguna</h2>
              <p>Perbarui informasi akun, role, atau ganti password</p>
            </div>

            {formError && (
              <div className="alert alert-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateUser}>
              {/* Role Selection */}
              <div className="form-group">
                <label className="form-label">Role Pengguna *</label>
                <div className="role-selection-grid">
                  <label
                    className={`role-card ${editRole === 'employee' ? 'selected' : ''}`}
                    onClick={() => setEditRole('employee')}
                  >
                    <input
                      type="radio"
                      name="edit-user-role"
                      value="employee"
                      checked={editRole === 'employee'}
                      onChange={() => setEditRole('employee')}
                      className="role-radio"
                      disabled={currentUser?.id === editingUser.id}
                    />
                    <div className="role-card-icon">👤</div>
                    <div className="role-card-text">
                      <strong className="role-card-title">Employee</strong>
                      <span className="role-card-desc">Tugas pribadi</span>
                    </div>
                  </label>

                  <label
                    className={`role-card ${editRole === 'admin' ? 'selected' : ''}`}
                    onClick={() => setEditRole('admin')}
                  >
                    <input
                      type="radio"
                      name="edit-user-role"
                      value="admin"
                      checked={editRole === 'admin'}
                      onChange={() => setEditRole('admin')}
                      className="role-radio"
                    />
                    <div className="role-card-icon">🛡️</div>
                    <div className="role-card-text">
                      <strong className="role-card-title">Admin</strong>
                      <span className="role-card-desc">Hak akses admin</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="edit-name" className="form-label">Nama Lengkap *</label>
                <input
                  id="edit-name"
                  type="text"
                  className="form-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-email" className="form-label">Alamat Email *</label>
                <input
                  id="edit-email"
                  type="email"
                  className="form-input"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-password" className="form-label">
                  Ganti Password <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Opsional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="edit-password"
                    type={showEditPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Kosongkan jika tidak ingin mengubah password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    minLength={8}
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0,
                      background: 'none', border: 'none', padding: '0 0.875rem',
                      cursor: 'pointer', color: 'var(--text-muted)',
                      display: 'flex', alignItems: 'center'
                    }}
                    onClick={() => setShowEditPassword(!showEditPassword)}
                  >
                    {showEditPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { setEditingUser(null); setFormError(''); }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <><span className="spinner" /> Menyimpan...</> : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="modal-overlay" onClick={() => setDeletingUser(null)}>
          <div className="modal-content modal-confirm-danger" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-danger">⚠️</div>
            <h2>Hapus Pengguna?</h2>
            <p>
              Apakah Anda yakin ingin menghapus pengguna <strong>{deletingUser.name}</strong> ({deletingUser.email})?
              Semua task terkait pengguna ini juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="modal-footer" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteUser}
                disabled={isDeleting}
              >
                {isDeleting ? <><span className="spinner" /> Menghapus...</> : 'Ya, Hapus Pengguna'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
