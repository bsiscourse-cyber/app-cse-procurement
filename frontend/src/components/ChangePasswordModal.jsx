import React, { useState } from 'react';
import client from '../api/client';
import { KeyRound, Lock, CheckCircle, X, Eye, EyeOff } from 'lucide-react';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'danger', text: 'New password and confirm password do not match' });
      return;
    }

    if (newPassword.length < 4) {
      setMessage({ type: 'danger', text: 'New password must be at least 4 characters long' });
      return;
    }

    setLoading(true);

    try {
      const res = await client.post('/auth/change-password', {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim()
      });

      if (localStorage.getItem('appcse_remember_me') === 'true') {
        localStorage.setItem('appcse_remembered_password', newPassword.trim());
      } else {
        localStorage.removeItem('appcse_remembered_password');
      }

      setMessage({ type: 'success', text: res.data.message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setMessage({ type: '', text: '' });
      }, 1500);
    } catch (err) {
      console.error('Error changing password:', err);
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
      style={{
        zIndex: 2050,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        overscrollBehavior: 'contain'
      }}
      onClick={onClose}
    >
      <div
        className="card border-0 shadow-lg text-white d-flex flex-column"
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90vh',
          borderRadius: '0px',
          overflow: 'hidden',
          background: '#1e293b',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.6)',
          overscrollBehavior: 'contain'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Seamless Header */}
        <div className="p-4 d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25 flex-shrink-0" style={{ background: '#0f172a' }}>
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: '44px', height: '44px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.25)' }}
            >
              <KeyRound size={22} style={{ color: '#fbbf24' }} />
            </div>
            <div>
              <h5 className="fw-bold mb-0 text-white" style={{ fontSize: '1.15rem' }}>Change Office Password</h5>
              <div className="small text-light opacity-75 mt-0.5" style={{ fontSize: '0.775rem' }}>Update your account access credentials securely</div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm text-light rounded-circle p-2 border-0 opacity-75"
            onClick={onClose}
            style={{ background: 'rgba(255, 255, 255, 0.08)', width: '36px', height: '36px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="card-body p-4 overflow-auto flex-grow-1" style={{ overscrollBehavior: 'contain' }}>
          {message.text && (
            <div className={`alert alert-${message.type} py-2.5 px-3.5 small rounded-3 mb-4 border-0 shadow-sm`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-light opacity-75 mb-1">Current Password</label>
              <div className="input-group">
                <span className="input-group-text border-secondary border-opacity-25 text-light opacity-50" style={{ background: '#0f172a' }}><Lock size={16} /></span>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="form-control text-white border-secondary border-opacity-25 shadow-none"
                  style={{ background: '#0f172a' }}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="btn input-group-text border-secondary border-opacity-25 text-light opacity-75 shadow-none"
                  style={{ background: '#0f172a' }}
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold text-light opacity-75 mb-1">New Password</label>
              <div className="input-group">
                <span className="input-group-text border-secondary border-opacity-25 text-light opacity-50" style={{ background: '#0f172a' }}><KeyRound size={16} /></span>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="form-control text-white border-secondary border-opacity-25 shadow-none"
                  style={{ background: '#0f172a' }}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="btn input-group-text border-secondary border-opacity-25 text-light opacity-75 shadow-none"
                  style={{ background: '#0f172a' }}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-semibold text-light opacity-75 mb-1">Confirm New Password</label>
              <div className="input-group">
                <span className="input-group-text border-secondary border-opacity-25 text-light opacity-50" style={{ background: '#0f172a' }}><CheckCircle size={16} /></span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-control text-white border-secondary border-opacity-25 shadow-none"
                  style={{ background: '#0f172a' }}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="btn input-group-text border-secondary border-opacity-25 text-light opacity-75 shadow-none"
                  style={{ background: '#0f172a' }}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 pt-3 border-top border-secondary border-opacity-25">
              <button
                type="button"
                className="btn rounded-pill px-4 py-2 font-weight-bold"
                onClick={onClose}
                style={{
                  background: '#334155',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '0.9rem'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary rounded-pill px-4 py-2 font-weight-bold shadow-sm"
                style={{ background: '#2563eb', border: 'none' }}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
