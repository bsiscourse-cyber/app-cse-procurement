import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { Building, Plus, Trash2, User, Mail, Briefcase, UserCheck, Lock, Edit2, Check, Eye, EyeOff } from 'lucide-react';

const ManageOfficesModal = ({ isOpen, onClose }) => {
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [newOffice, setNewOffice] = useState({
    office_name: '',
    department: '',
    contact_person: '',
    position: '',
    email: '',
    telephone: '',
    password: ''
  });

  const [editingOfficeId, setEditingOfficeId] = useState(null);
  const [showOfficePassword, setShowOfficePassword] = useState(false);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchOffices(true);
      const interval = setInterval(() => {
        fetchOffices(false);
      }, 15000);
      return () => {
        document.body.style.overflow = 'unset';
        clearInterval(interval);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message.text]);

  const fetchOffices = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await client.get('/admin/offices-list');
      setOffices(res.data);
    } catch (err) {
      console.error('Error fetching offices:', err);
      if (showSpinner) setMessage({ type: 'danger', text: 'Failed to load offices list' });
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const handleStartEdit = (off) => {
    setEditingOfficeId(off.id);
    setEmailError('');
    setNewOffice({
      office_name: off.office_name || '',
      department: off.department || '',
      contact_person: off.contact_person || '',
      position: off.position || '',
      email: off.email || '',
      telephone: off.telephone || '',
      password: ''
    });
    setMessage({ type: '', text: '' });
  };

  const handleCancelEdit = () => {
    setEditingOfficeId(null);
    setEmailError('');
    setNewOffice({
      office_name: '',
      department: '',
      contact_person: '',
      position: '',
      email: '',
      telephone: '',
      password: ''
    });
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    // Client-side duplicate email check across all accounts
    if (newOffice.email && newOffice.email.trim()) {
      const cleanEmail = newOffice.email.trim().toLowerCase();
      const existing = offices.find(
        (off) => off.email?.toLowerCase() === cleanEmail && off.id !== editingOfficeId
      );
      if (existing) {
        setSaving(false);
        setEmailError(`This email address is already used by ${existing.office_name}!`);
        return;
      }
    }

    try {
      if (editingOfficeId) {
        // Update Existing Office
        const res = await client.put(`/admin/office/${editingOfficeId}`, newOffice);
        setMessage({ type: 'success', text: res.data.message });
        handleCancelEdit();
      } else {
        // Create New Office
        const res = await client.post('/admin/offices', newOffice);
        setMessage({ type: 'success', text: res.data.message });
        setNewOffice({
          office_name: '',
          department: '',
          contact_person: '',
          position: '',
          email: '',
          telephone: '',
          password: ''
        });
      }
      setEmailError('');
      fetchOffices(false);
    } catch (err) {
      console.error('Form submission error:', err);
      const errMsg = err.response?.data?.message || 'Action failed';
      if (errMsg.toLowerCase().includes('email')) {
        setEmailError(errMsg);
      } else {
        setMessage({ type: 'danger', text: errMsg });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOffice = async (officeId, officeName) => {
    if (!window.confirm(`Are you sure you want to delete office "${officeName}"? This action cannot be undone.`)) return;

    try {
      await client.delete(`/admin/office/${officeId}`);
      setMessage({ type: 'success', text: `Office "${officeName}" deleted successfully` });
      fetchOffices(false);
    } catch (err) {
      console.error('Error deleting office:', err);
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to delete office' });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
      style={{
        zIndex: 2050,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(10px)',
        overscrollBehavior: 'contain'
      }}
      onClick={onClose}
    >
      <div
        className="card border-0 shadow-lg d-flex flex-column"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          borderRadius: '0px',
          overflow: 'hidden',
          overscrollBehavior: 'contain'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Generous Card Header matching EditProfileModal */}
        <div className="card-header bg-dark text-white p-4 d-flex justify-content-between align-items-center flex-shrink-0">
          <div className="d-flex align-items-center gap-2">
            <Building size={22} className="text-warning" />
            <h5 className="fw-bold mb-0">Manage Office Accounts</h5>
          </div>
          <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
        </div>

        {/* Card Body with smooth internal scrolling */}
        <div className="card-body p-4 overflow-auto flex-grow-1" style={{ overscrollBehavior: 'contain' }}>
          {message.text && (
            <div className={`alert alert-${message.type} py-2.5 px-3.5 small rounded-3 mb-3 d-flex align-items-center justify-content-between border-0 shadow-sm`}>
              <span>{message.text}</span>
              <button
                type="button"
                className="btn-close p-0 ms-2 flex-shrink-0"
                onClick={() => setMessage({ type: '', text: '' })}
                style={{ fontSize: '0.8rem', opacity: 0.7 }}
              ></button>
            </div>
          )}

          {/* Create / Edit Office Form Section */}
          <div className={`p-3 rounded-3 mb-4 border ${editingOfficeId ? 'bg-warning-subtle border-warning' : 'bg-light'}`}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                {editingOfficeId ? (
                  <>
                    <Edit2 size={16} className="text-warning" />
                    <span>Edit Office Account Details</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} className="text-primary" />
                    <span>Create New Office Account</span>
                  </>
                )}
              </h6>
              {editingOfficeId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-0.5 small"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="row g-2 mb-2">
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-dark mb-1">Office / Unit Name *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><Building size={16} /></span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Finance Office"
                      value={newOffice.office_name}
                      onChange={(e) => setNewOffice({ ...newOffice, office_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-dark mb-1">Department / Division</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><Briefcase size={16} /></span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Administrative Services"
                      value={newOffice.department}
                      onChange={(e) => setNewOffice({ ...newOffice, department: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-dark mb-1">Contact Person</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><User size={16} /></span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Maria Santos"
                      value={newOffice.contact_person}
                      onChange={(e) => setNewOffice({ ...newOffice, contact_person: e.target.value })}
                    />
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-dark mb-1">Email Address *</label>
                  <div className="input-group has-validation">
                    <span className={`input-group-text bg-white ${emailError ? 'border-danger text-danger' : ''}`}><Mail size={16} /></span>
                    <input
                      type="email"
                      className={`form-control ${emailError ? 'is-invalid border-danger' : ''}`}
                      placeholder="office@univ.edu.ph"
                      value={newOffice.email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewOffice({ ...newOffice, email: val });
                        if (val.trim()) {
                          const cleanEmail = val.trim().toLowerCase();
                          const existing = offices.find(
                            (off) => off.email?.toLowerCase() === cleanEmail && off.id !== editingOfficeId
                          );
                          if (existing) {
                            setEmailError(`This email address is already used by ${existing.office_name}!`);
                          } else {
                            setEmailError('');
                          }
                        } else {
                          setEmailError('');
                        }
                      }}
                      required
                    />
                    {emailError && (
                      <div className="invalid-feedback d-block fw-bold mt-1 text-danger" style={{ fontSize: '0.775rem' }}>
                        ⚠️ {emailError}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Password Input Row */}
              <div className="row g-2 mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-dark mb-1">
                    {editingOfficeId ? 'New Password (leave blank to keep current)' : 'Account Password *'}
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><Lock size={16} /></span>
                    <input
                      type={showOfficePassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder={editingOfficeId ? 'Leave empty to keep unchanged' : 'Enter office password'}
                      value={newOffice.password}
                      onChange={(e) => setNewOffice({ ...newOffice, password: e.target.value })}
                      required={!editingOfficeId}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOfficePassword(!showOfficePassword)}
                      className="btn input-group-text bg-white text-secondary shadow-none"
                    >
                      {showOfficePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                {editingOfficeId ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="btn btn-outline-secondary rounded-pill px-4"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn btn-warning rounded-pill px-4 fw-bold d-flex align-items-center gap-2 text-dark"
                    >
                      <Check size={18} />
                      <span>{saving ? 'Updating...' : 'Save Changes'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary rounded-pill px-4 fw-bold d-flex align-items-center gap-2"
                  >
                    <Plus size={18} />
                    <span>{saving ? 'Creating...' : 'Create Account'}</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Offices List Section - Clickable Rows */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
              <UserCheck size={18} className="text-success" />
              <span>Registered Accounts ({offices.length})</span>
            </h6>
            <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
              💡 Click any account row to edit details or update password
            </div>
          </div>

          <div className="table-responsive rounded-3 border">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-dark">
                <tr>
                  <th className="py-2.5 px-3">OFFICE NAME</th>
                  <th className="py-2.5 px-3">DEPARTMENT</th>
                  <th className="py-2.5 px-3">ROLE</th>
                  <th className="py-2.5 px-3 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {offices.map((off) => (
                  <tr
                    key={off.id}
                    onClick={() => handleStartEdit(off)}
                    style={{
                      cursor: 'pointer',
                      background: editingOfficeId === off.id ? 'rgba(254, 243, 199, 0.6)' : 'transparent'
                    }}
                    title="Click to edit account details"
                  >
                    <td className="fw-bold text-dark py-2.5 px-3">{off.office_name}</td>
                    <td className="small text-secondary py-2.5 px-3">{off.department || '—'}</td>
                    <td className="py-2.5 px-3">
                      {off.is_admin ? (
                        <span className="badge bg-warning text-dark px-3 py-1 rounded-pill font-weight-bold">ADMIN</span>
                      ) : (
                        <span className="badge bg-info text-dark px-3 py-1 rounded-pill font-weight-bold">OFFICE</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="d-flex justify-content-center align-items-center gap-2">
                        {off.is_admin ? (
                          <span className="badge bg-light text-secondary border px-2.5 py-1.5 rounded-pill d-flex align-items-center gap-1 font-weight-bold">
                            <Lock size={13} className="text-secondary" />
                            <span>Protected</span>
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteOffice(off.id, off.office_name); }}
                              className="btn btn-sm btn-outline-danger rounded-circle p-1.5"
                              title="Delete Account"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Inner Footer matching EditProfileModal */}
          <div className="d-flex justify-content-end gap-2 pt-3 border-top mt-4">
            <button
              type="button"
              className="btn btn-secondary rounded-pill px-4 fw-bold"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageOfficesModal;
