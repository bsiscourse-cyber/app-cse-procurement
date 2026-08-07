import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, ArrowRight, ShieldCheck, Users, Eye, EyeOff } from 'lucide-react';
import DevTeamModal from '../components/DevTeamModal';

const Login = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);

  const { user, login } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to appropriate dashboard
  useEffect(() => {
    if (user) {
      if (user.is_admin) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  // Load remembered password if saved
  useEffect(() => {
    const savedRemember = localStorage.getItem('appcse_remember_me') === 'true';
    const savedPassword = localStorage.getItem('appcse_remembered_password') || '';
    if (savedRemember && savedPassword) {
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanPassword = password ? password.trim() : '';

    try {
      const user = await login(cleanPassword);

      if (rememberMe) {
        localStorage.setItem('appcse_remember_me', 'true');
        localStorage.setItem('appcse_remembered_password', cleanPassword);
      } else {
        localStorage.removeItem('appcse_remember_me');
        localStorage.removeItem('appcse_remembered_password');
      }

      if (user.is_admin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login failed:', err);
      localStorage.removeItem('appcse_remembered_password');
      setError(err.response?.data?.message || 'Invalid office password. If you recently updated your password, please enter your new password.');
    } finally {
      setLoading(false);
    }
  };

  const bgImageUrl = encodeURI('/bg-login/TAMPILISAN CAMPUS.png');

  return (
    <>
      <div
        className="min-vh-100 d-flex flex-column justify-content-center align-items-center py-5 position-relative"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.25) 0%, rgba(30, 41, 59, 0.35) 100%), url("${bgImageUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* White Frosted Glass Login Card */}
        <div
          className="card border-0 shadow-lg p-4"
          style={{
            width: '100%',
            maxWidth: '420px',
            borderRadius: '24px',
            background: 'rgba(255, 255, 255, 0.72)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.25)'
          }}
        >
          <div className="card-body text-center p-3">
            {/* Header */}
            <h3 className="fw-extrabold text-dark text-uppercase tracking-wide mb-4" style={{ letterSpacing: '0.05em', color: '#0f172a' }}>
              OFFICE LOGIN
            </h3>

            {error && (
              <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3 text-start border-0 shadow-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Input with Lock Icon and Eye Icon Toggle */}
              <div className="mb-3 position-relative">
                <div className="position-absolute top-50 start-0 translate-middle-y ps-3 text-secondary pointer-events-none">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control form-control-lg text-center ps-5 pe-5 rounded-pill font-monospace border-1"
                  placeholder="Password"
                  style={{
                    background: 'rgba(255, 255, 255, 0.55)',
                    borderColor: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)',
                    color: '#0f172a',
                    fontSize: '1rem',
                    fontWeight: '500',
                    textAlign: 'center'
                  }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3 text-secondary text-decoration-none border-0 bg-transparent shadow-none"
                  style={{ cursor: 'pointer', zIndex: 5 }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <style>{`
                  input::placeholder {
                    color: rgba(51, 65, 85, 0.65) !important;
                  }
                  input:focus {
                    background: rgba(255, 255, 255, 0.85) !important;
                    border-color: #2563eb !important;
                    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15) !important;
                    color: #0f172a !important;
                  }
                `}</style>
              </div>

              {/* Instant Responsive Checkbox */}
              <div className="d-flex align-items-center justify-content-start mb-4 px-1">
                <div
                  className="d-flex align-items-center gap-2"
                  style={{ userSelect: 'none', cursor: 'pointer' }}
                  onClick={() => setRememberMe(!rememberMe)}
                >
                  <input
                    type="checkbox"
                    id="rememberMeCheck"
                    checked={rememberMe}
                    onChange={(e) => {
                      e.stopPropagation();
                      setRememberMe(e.target.checked);
                    }}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: '#2563eb',
                      cursor: 'pointer'
                    }}
                  />
                  <label
                    htmlFor="rememberMeCheck"
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: 'pointer', fontSize: '0.875rem', color: '#1e293b', fontWeight: '600', margin: 0 }}
                  >
                    Remember me
                  </label>
                </div>
              </div>


              {/* Dark Navy Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-lg w-100 rounded-pill d-flex align-items-center justify-content-center gap-2 font-weight-bold text-white shadow-sm border-0 py-3"
                style={{
                  background: '#0b192c',
                  fontSize: '0.95rem',
                  letterSpacing: '0.04em'
                }}
              >
                {loading ? (
                  <span>AUTHENTICATING...</span>
                ) : (
                  <>
                    <span>LOGIN TO SYSTEM</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Subtitle Footer */}
            <div className="mt-4 pt-1 d-flex flex-column align-items-center gap-2 text-secondary small">
              <div className="d-flex align-items-center gap-1.5">
                <ShieldCheck size={16} className="text-primary" />
                <span style={{ fontSize: '0.825rem', color: '#334155', fontWeight: '500' }}>
                  Official PS-DBM Digitized Form System
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page Footer (Bottom Right) */}
        <div className="position-absolute bottom-0 end-0 p-3 p-md-4">
          <button
            type="button"
            onClick={() => setShowDevModal(true)}
            className="btn btn-link text-decoration-none btn-sm px-3 py-2 font-weight-bold text-white d-flex align-items-center gap-2 rounded-pill shadow-sm"
            style={{
              fontSize: '0.825rem',
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff'
            }}
          >
            <Users size={15} />
            <span>Development Team</span>
          </button>
        </div>
      </div>

      <DevTeamModal isOpen={showDevModal} onClose={() => setShowDevModal(false)} />
    </>
  );
};

export default Login;

