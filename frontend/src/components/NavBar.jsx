import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { LogOut, User, KeyRound, ChevronDown, Building, Edit3, ChevronRight, Bell, Clock, CheckCircle2, PlusCircle, AlertCircle, Users, MoreVertical, Trash2, XCircle, Info, FileText, Volume2, VolumeX } from 'lucide-react';
import EditProfileModal from './EditProfileModal';
import ChangePasswordModal from './ChangePasswordModal';
import ManageOfficesModal from './ManageOfficesModal';
import AdminAdditionalReviewModal from './AdminAdditionalReviewModal';
import DevTeamModal from './DevTeamModal';
import { playNotificationSound, testNotificationSound } from '../utils/sound';

const NavBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  
  // Audio notification state & refs
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('appcse_notif_sound') !== 'false');
  const soundEnabledRef = useRef(soundEnabled);
  const prevUnreadCountRef = useRef(null);
  const prevNotifIdsRef = useRef(new Set());

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const toggleSound = (e) => {
    if (e) e.stopPropagation();
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    localStorage.setItem('appcse_notif_sound', nextState ? 'true' : 'false');
    if (nextState) {
      testNotificationSound();
    }
  };
  
  // Admin Notification States
  const [submittedList, setSubmittedList] = useState([]);
  const [additionalRequestsList, setAdditionalRequestsList] = useState([]);
  const [adminTab, setAdminTab] = useState('submitted'); // 'submitted' or 'additional'
  const [selectedAddReq, setSelectedAddReq] = useState(null);

  // Office Notification States
  const [officeNotifs, setOfficeNotifs] = useState([]);
  const [openNotifMenuId, setOpenNotifMenuId] = useState(null);
  const [filterTab, setFilterTab] = useState('all'); // 'all' or 'unread'
  const [selectedNotifForModal, setSelectedNotifForModal] = useState(null);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showManageOffices, setShowManageOffices] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleNotifItemClick = async (notif) => {
    try {
      if (notif.is_read === 0) {
        handleMarkNotifRead(notif.id);
      }
      setNotifOpen(false);

      if (user?.is_admin) {
        if (notif.type === 'submission') {
          if (notif.target_id) {
            navigate(`/admin/submission/${notif.target_id}`);
          } else {
            try {
              const res = await client.get('/admin/submissions');
              const cleanTitleText = (notif.title || '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|📄|➕|✅|❌|ℹ️/gu, '').replace('New Submission:', '').trim();
              const sub = res.data.find(s => s.office_id === notif.office_id || (cleanTitleText && s.office_name?.includes(cleanTitleText)));
              if (sub && sub.submission_id) {
                navigate(`/admin/submission/${sub.submission_id}`);
              } else {
                navigate('/admin');
              }
            } catch (e) {
              navigate('/admin');
            }
          }
        } else {
          setSelectedNotifForModal(notif);
        }
      } else {
        // Staff user: open notification message modal
        setSelectedNotifForModal(notif);
      }
    } catch (err) {
      console.error('Error handling notification click:', err);
      setNotifOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
        setOpenNotifMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll notifications — 10s interval for real-time alerts
  useEffect(() => {
    if (!user) return;
    fetchOfficeNotifications();
    if (user.is_admin) {
      fetchAdminNotifications();
    }
    const interval = setInterval(() => {
      fetchOfficeNotifications();
      if (user.is_admin) {
        fetchAdminNotifications();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchAdminNotifications = async () => {
    try {
      const [subRes, addRes] = await Promise.all([
        client.get('/admin/submissions'),
        client.get('/admin/additional-requests')
      ]);

      const submitted = subRes.data.filter((item) => item.status === 'submitted');
      setSubmittedList(prev => {
        const newJson = JSON.stringify(submitted);
        return JSON.stringify(prev) === newJson ? prev : submitted;
      });

      const pendingAdd = addRes.data.filter((item) => item.status === 'pending');
      setAdditionalRequestsList(prev => {
        const newJson = JSON.stringify(pendingAdd);
        return JSON.stringify(prev) === newJson ? prev : pendingAdd;
      });
    } catch (err) {
      console.error('Error fetching admin notifications:', err);
    }
  };

  const fetchOfficeNotifications = async () => {
    try {
      const res = await client.get('/notifications');
      const list = Array.isArray(res.data?.notifications) ? res.data.notifications : [];
      
      const unreadCount = list.filter(n => n && !n.is_read).length;
      const newIds = new Set(list.map(n => n.id));

      if (prevUnreadCountRef.current !== null) {
        // Detect new unread notification that wasn't in previous set OR unread count increased
        const hasNewUnread = list.some(n => n && !n.is_read && !prevNotifIdsRef.current.has(n.id));
        if ((hasNewUnread || unreadCount > prevUnreadCountRef.current) && soundEnabledRef.current) {
          playNotificationSound();
        }
      }

      prevUnreadCountRef.current = unreadCount;
      prevNotifIdsRef.current = newIds;

      setOfficeNotifs(prev => {
        const newJson = JSON.stringify(list);
        return JSON.stringify(prev) === newJson ? prev : list;
      });
    } catch (err) {
      console.error('Error fetching office notifications:', err);
    }
  };

  const handleOpenOfficeNotifs = async () => {
    try {
      const nextState = !notifOpen;
      setNotifOpen(nextState);
      setOpenNotifMenuId(null);

      // If opening popover and there are unread notifications, mark them as read
      if (nextState && Array.isArray(officeNotifs) && officeNotifs.some(n => n && n.is_read === 0)) {
        try {
          await client.post('/notifications/mark-read');
          setOfficeNotifs(prev => (Array.isArray(prev) ? prev.map(n => ({ ...n, is_read: 1 })) : []));
        } catch (err) {
          console.error('Failed to mark read:', err);
        }
      }
    } catch (err) {
      console.error('Error toggling notifications:', err);
      setNotifOpen(prev => !prev);
    }
  };

  const handleMarkNotifRead = async (notifId, e) => {
    if (e) e.stopPropagation();
    try {
      await client.post('/notifications/mark-read', { id: notifId });
      setOfficeNotifs(prev => (Array.isArray(prev) ? prev.map(n => n.id === notifId ? { ...n, is_read: 1 } : n) : []));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleDeleteNotif = async (notifId, e) => {
    if (e) e.stopPropagation();
    try {
      await client.delete(`/notifications/${notifId}`);
      setOfficeNotifs(prev => (Array.isArray(prev) ? prev.filter(n => n.id !== notifId) : []));
      setOpenNotifMenuId(null);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleClearAllNotifs = async () => {
    if (!window.confirm('Delete all notifications?')) return;
    try {
      await client.delete('/notifications');
      setOfficeNotifs([]);
      setOpenNotifMenuId(null);
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  const totalAdminNotifs = useMemo(() => (Array.isArray(submittedList) ? submittedList.length : 0) + (Array.isArray(additionalRequestsList) ? additionalRequestsList.length : 0), [submittedList, additionalRequestsList]);
  const unreadOfficeNotifs = useMemo(() => (Array.isArray(officeNotifs) ? officeNotifs.filter(n => n && !n.is_read).length : 0), [officeNotifs]);

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark app-navbar px-4 py-2.5 sticky-top shadow-sm" style={{ background: '#0f172a' }}>
        <div className="container-fluid">
          <Link className="navbar-brand d-flex align-items-center gap-3 text-decoration-none py-1" to={user.is_admin ? '/admin' : '/dashboard'}>
            <div className="position-relative d-flex align-items-center justify-content-center">
              <img
                src="/uni-logo/logo.png"
                alt="JRMSU Logo"
                style={{
                  height: '48px',
                  width: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4))'
                }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <div className="d-flex flex-column justify-content-center">
              <div className="d-flex align-items-center gap-1.5">
                <span className="fw-extrabold text-white" style={{ fontSize: '1.2rem', letterSpacing: '0.02em', lineHeight: 1.1 }}>
                  APP-CSE <span style={{ color: '#38bdf8' }}>System</span>
                </span>
              </div>
              <span className="small text-light opacity-75 mt-1 fw-medium" style={{ fontSize: '0.74rem', letterSpacing: '0.03em' }}>
                Procurement Request System
              </span>
            </div>
          </Link>

          {/* Right Action Controls: Bell & User Pill */}
          <div className="d-flex align-items-center gap-3">
            {/* Unified Notification Bell for both Admin and Office Accounts */}
            <div className="position-relative" ref={notifRef}>
              <button
                type="button"
                className="btn text-light position-relative p-2.5 rounded-circle d-flex align-items-center justify-content-center"
                onClick={handleOpenOfficeNotifs}
                title="Notifications"
                style={{
                  background: unreadOfficeNotifs > 0 ? 'rgba(14, 165, 233, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                  border: unreadOfficeNotifs > 0 ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
                  width: '42px',
                  height: '42px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Bell size={20} className={unreadOfficeNotifs > 0 ? 'text-info' : 'text-light opacity-75'} />
                {Number(unreadOfficeNotifs) > 0 ? (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-circle bg-info text-dark border border-dark" style={{ fontSize: '0.7rem', width: '20px', height: '20px', padding: '3px 0' }}>
                    {unreadOfficeNotifs}
                  </span>
                ) : null}
              </button>              {/* Facebook-style Notifications Popover Dropdown */}
              {notifOpen && (
                <div
                  className="position-absolute end-0 mt-2 p-3 rounded-4 shadow-lg border-0 text-start"
                  style={{
                    width: '380px',
                    maxWidth: '92vw',
                    zIndex: 1050,
                    background: '#242526',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.65), 0 2px 4px rgba(0, 0, 0, 0.4)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Header */}
                  <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                    <h5 className="fw-extrabold text-white mb-0" style={{ fontSize: '1.35rem', letterSpacing: '-0.02em' }}>
                      Notifications
                    </h5>
                    <div className="d-flex align-items-center gap-1">
                      <button
                        type="button"
                        onClick={toggleSound}
                        className="btn btn-dark rounded-circle p-2 d-flex align-items-center justify-content-center border-0"
                        style={{ width: '34px', height: '34px', background: 'rgba(255, 255, 255, 0.1)' }}
                        title={soundEnabled ? 'Mute notification sound' : 'Unmute notification sound'}
                      >
                        {soundEnabled ? <Volume2 size={16} className="text-info" /> : <VolumeX size={16} className="text-white-50" />}
                      </button>

                      <div className="position-relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenNotifMenuId(openNotifMenuId === 'header' ? null : 'header');
                          }}
                          className="btn btn-dark rounded-circle p-2 d-flex align-items-center justify-content-center border-0 text-white-50"
                          style={{ width: '34px', height: '34px', background: 'rgba(255, 255, 255, 0.1)' }}
                          title="Options"
                        >
                          <MoreVertical size={18} />
                        </button>

                        {openNotifMenuId === 'header' && (
                          <div
                            className="position-absolute end-0 mt-1 rounded-3 shadow-lg p-1 text-nowrap"
                            style={{ zIndex: 1100, minWidth: '180px', background: '#3a3b3c', border: '1px solid rgba(255,255,255,0.1)' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={toggleSound}
                              className="btn btn-sm btn-link text-white text-decoration-none w-100 text-start px-3 py-2 small d-flex align-items-center gap-2 border-0"
                              style={{ fontSize: '0.82rem' }}
                            >
                              {soundEnabled ? <Volume2 size={14} className="text-info" /> : <VolumeX size={14} className="text-secondary" />}
                              <span>Sound: {soundEnabled ? 'Enabled' : 'Muted'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleClearAllNotifs();
                                setOpenNotifMenuId(null);
                              }}
                              className="btn btn-sm btn-link text-white text-decoration-none w-100 text-start px-3 py-2 small d-flex align-items-center gap-2 border-0 border-top border-secondary border-opacity-25"
                              style={{ fontSize: '0.82rem' }}
                            >
                              <Trash2 size={14} className="text-danger" />
                              <span>Clear All</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* List Container */}
                  {(() => {
                    const filteredList = Array.isArray(officeNotifs) ? officeNotifs : [];

                    if (filteredList.length === 0) {
                      return (
                        <div className="text-center py-5 text-light opacity-50 small">
                          <CheckCircle2 size={32} className="d-block mx-auto mb-2 text-success opacity-75" />
                          No notifications
                        </div>
                      );
                    }

                    return (
                      <div
                        className="d-flex flex-column gap-1 pe-1"
                        style={{
                          maxHeight: '360px',
                          overflowY: 'auto',
                          overflowX: 'hidden'
                        }}
                      >
                        {filteredList.map((notif) => {
                          const isUnread = notif.is_read === 0;
                          const isMenuOpen = openNotifMenuId === notif.id;
                          const cleanTitle = (notif.title || '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|📄|➕|✅|❌|ℹ️/gu, '').trim();
                          const cleanMessage = (notif.message || '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|📄|➕|✅|❌|ℹ️/gu, '').trim();

                          return (
                            <div
                              key={notif.id}
                              onClick={() => handleNotifItemClick(notif)}
                              className="p-2.5 rounded-3 position-relative d-flex align-items-center gap-3"
                              style={{
                                cursor: 'pointer',
                                transition: 'background 0.15s ease',
                                background: isUnread ? 'rgba(45, 136, 255, 0.1)' : 'transparent',
                                overflowX: 'hidden'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = isUnread ? 'rgba(45, 136, 255, 0.18)' : '#3a3b3c'}
                              onMouseLeave={(e) => e.currentTarget.style.background = isUnread ? 'rgba(45, 136, 255, 0.1)' : 'transparent'}
                            >
                              {/* Clean Notification Content */}
                              <div className="flex-grow-1 min-w-0 text-start" style={{ overflowX: 'hidden' }}>
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  {notif.type === 'submission' && <FileText size={16} className="text-info flex-shrink-0" />}
                                  {notif.type === 'additional' && <PlusCircle size={16} className="text-warning flex-shrink-0" />}
                                  {notif.type === 'approved' && <CheckCircle2 size={16} className="text-success flex-shrink-0" />}
                                  {notif.type === 'rejected' && <XCircle size={16} className="text-danger flex-shrink-0" />}
                                  {(notif.type !== 'submission' && notif.type !== 'additional' && notif.type !== 'approved' && notif.type !== 'rejected') && <Info size={16} className="text-info flex-shrink-0" />}
                                  <span className={`small text-truncate ${notif.type === 'approved' ? 'text-success' : notif.type === 'rejected' ? 'text-danger' : notif.type === 'additional' ? 'text-warning' : 'text-info'} ${isUnread ? 'fw-bold' : 'fw-semibold'}`} style={{ fontSize: '0.85rem' }}>
                                    {cleanTitle}
                                  </span>
                                </div>
                                <div className="text-light opacity-75 small text-truncate" style={{ fontSize: '0.78rem', lineHeight: '1.35', maxWidth: '265px' }}>
                                  {cleanMessage}
                                </div>
                                <div className="mt-1 small" style={{ fontSize: '0.71rem', color: isUnread ? '#2e89ff' : 'rgba(255,255,255,0.5)', fontWeight: isUnread ? '700' : '500' }}>
                                  {getRelativeTime(notif.created_at)}
                                </div>
                              </div>

                              {/* Unread Blue Dot & 3-Dot Options */}
                              <div className="d-flex align-items-center gap-2 flex-shrink-0 ms-1">
                                {isUnread && (
                                  <span
                                    className="rounded-circle flex-shrink-0 d-inline-block shadow-sm"
                                    style={{ width: '12px', height: '12px', background: '#1877f2' }}
                                    title="Unread notification"
                                  />
                                )}

                                <div className="position-relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenNotifMenuId(isMenuOpen ? null : notif.id);
                                    }}
                                    className="btn btn-link text-white-50 p-0 border-0 shadow-none d-flex align-items-center justify-content-center rounded-circle"
                                    style={{ width: '28px', height: '28px' }}
                                    title="Options"
                                  >
                                    <MoreVertical size={16} />
                                  </button>

                                  {isMenuOpen && (
                                    <div
                                      className="position-absolute end-0 mt-1 rounded-3 shadow-lg p-1 text-nowrap"
                                      style={{ zIndex: 1100, minWidth: '120px', background: '#3a3b3c', border: '1px solid rgba(255,255,255,0.1)' }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteNotif(notif.id, e)}
                                        className="btn btn-sm btn-link text-danger text-decoration-none w-100 text-start px-2 py-1.5 small d-flex align-items-center gap-2 border-0"
                                        style={{ fontSize: '0.78rem' }}
                                      >
                                        <Trash2 size={14} />
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* User Profile Pill Button */}
            <div className="position-relative" ref={dropdownRef}>
              <button
                type="button"
                className="btn text-white font-weight-bold d-flex align-items-center rounded-pill py-2 px-3.5"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  gap: '12px'
                }}
              >
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold overflow-hidden flex-shrink-0"
                  style={{
                    width: '34px',
                    height: '34px',
                    background: user.is_admin ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    fontSize: '0.85rem'
                  }}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    user.office_name ? user.office_name.substring(0, 2).toUpperCase() : 'US'
                  )}
                </div>

                <div className="text-start d-none d-md-block" style={{ marginRight: '14px' }}>
                  <div className="fw-bold text-white text-truncate" style={{ maxWidth: '220px', fontSize: '0.85rem', lineHeight: '1.35', marginBottom: '3px' }}>
                    {user.office_name}
                  </div>
                  <div className="small text-light opacity-75 text-truncate" style={{ maxWidth: '220px', fontSize: '0.72rem', lineHeight: '1.2' }}>
                    {user.is_admin ? 'Supply Administrator' : (user.department || 'Office Account')}
                  </div>
                </div>

                <ChevronDown size={16} className={`text-light opacity-75 flex-shrink-0 ms-auto transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {dropdownOpen && (
                <div
                  className="position-absolute end-0 mt-2 p-2 rounded-4 shadow-lg border-0"
                  style={{
                    width: '280px',
                    zIndex: 1050,
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(20px)'
                  }}
                >
                  <div className="px-3 py-2 mb-2 border-bottom border-secondary border-opacity-25">
                    <div className="fw-bold text-white text-truncate">{user.office_name}</div>
                    <div className="small text-light opacity-75 text-truncate" style={{ fontSize: '0.75rem' }}>
                      {user.email || 'No email registered'}
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-1">
                    <button
                      type="button"
                      onClick={() => { setShowEditProfile(true); setDropdownOpen(false); }}
                      className="btn btn-link text-decoration-none text-light p-2.5 rounded-3 d-flex align-items-center justify-content-between text-start border-0"
                      style={{ transition: 'all 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', background: 'rgba(37, 99, 235, 0.15)' }}>
                          <Edit3 size={18} className="text-primary" />
                        </div>
                        <div>
                          <div className="fw-bold text-white small" style={{ fontSize: '0.875rem' }}>Edit Profile</div>
                          <div className="small text-light opacity-75" style={{ fontSize: '0.7rem' }}>Update contact info & logo</div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-light opacity-50" />
                    </button>

                    <button
                      type="button"
                      onClick={() => { setShowChangePassword(true); setDropdownOpen(false); }}
                      className="btn btn-link text-decoration-none text-light p-2.5 rounded-3 d-flex align-items-center justify-content-between text-start border-0"
                      style={{ transition: 'all 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', background: 'rgba(245, 158, 11, 0.15)' }}>
                          <KeyRound size={18} style={{ color: '#fbbf24' }} />
                        </div>
                        <div>
                          <div className="fw-bold text-white small" style={{ fontSize: '0.875rem' }}>Change Password</div>
                          <div className="small text-light opacity-75" style={{ fontSize: '0.7rem' }}>Update access credentials</div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-light opacity-50" />
                    </button>

                    {Boolean(user.is_admin) && (
                      <button
                        type="button"
                        onClick={() => { setShowManageOffices(true); setDropdownOpen(false); }}
                        className="btn btn-link text-decoration-none text-light p-2.5 rounded-3 d-flex align-items-center justify-content-between text-start border-0"
                        style={{ transition: 'all 0.15s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div className="d-flex align-items-center gap-3">
                          <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', background: 'rgba(16, 185, 129, 0.15)' }}>
                            <Building size={18} style={{ color: '#10b981' }} />
                          </div>
                          <div>
                            <div className="fw-bold text-white small" style={{ fontSize: '0.875rem' }}>Manage Offices</div>
                            <div className="small text-light opacity-75" style={{ fontSize: '0.7rem' }}>Add/edit office accounts</div>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-light opacity-50" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => { setShowDevModal(!showDevModal); setDropdownOpen(false); }}
                      className="btn btn-link text-decoration-none text-light p-2.5 rounded-3 d-flex align-items-center justify-content-between text-start border-0"
                      style={{ transition: 'all 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', background: 'rgba(56, 189, 248, 0.15)' }}>
                          <Users size={18} style={{ color: '#38bdf8' }} />
                        </div>
                        <div>
                          <div className="fw-bold text-white small" style={{ fontSize: '0.875rem' }}>Development Team</div>
                          <div className="small text-light opacity-75" style={{ fontSize: '0.7rem' }}>Toggle bottom marquee bar</div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-light opacity-50" />
                    </button>

                    <div className="my-1 border-top border-secondary border-opacity-25"></div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="btn btn-link text-decoration-none text-danger p-2.5 rounded-3 d-flex align-items-center justify-content-between text-start border-0"
                      style={{ transition: 'all 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', background: 'rgba(239, 68, 68, 0.2)' }}>
                          <LogOut size={18} style={{ color: '#f87171' }} />
                        </div>
                        <div>
                          <div className="fw-bold text-danger small" style={{ fontSize: '0.875rem' }}>Logout</div>
                          <div className="text-danger opacity-75" style={{ fontSize: '0.7rem' }}>End active session</div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-danger opacity-75" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Floating Modals & Bottom Footer Drawer */}
      <EditProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} />
      <ChangePasswordModal isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} />
      <ManageOfficesModal isOpen={showManageOffices} onClose={() => setShowManageOffices(false)} />
      <DevTeamModal isOpen={showDevModal} onClose={() => setShowDevModal(false)} />
      <AdminAdditionalReviewModal
        isOpen={Boolean(selectedAddReq)}
        onClose={() => setSelectedAddReq(null)}
        requestItem={selectedAddReq}
        onSuccess={() => {
          fetchAdminNotifications();
          setSelectedAddReq(null);
        }}
      />

      {/* Notification Details & Rejection Feedback Message Modal */}
      {selectedNotifForModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content text-white border-0 shadow-lg" style={{ background: '#1e293b', borderRadius: '16px' }}>
              <div className="modal-header border-bottom border-secondary border-opacity-25 pb-3">
                <div className="d-flex align-items-center gap-2.5">
                  <div className={`p-2 rounded-circle d-flex align-items-center justify-content-center ${selectedNotifForModal.type === 'rejected' ? 'bg-danger bg-opacity-20 text-danger' : selectedNotifForModal.type === 'approved' ? 'bg-success bg-opacity-20 text-success' : 'bg-info bg-opacity-20 text-info'}`}>
                    {selectedNotifForModal.type === 'rejected' && <XCircle size={22} />}
                    {selectedNotifForModal.type === 'approved' && <CheckCircle2 size={22} />}
                    {selectedNotifForModal.type === 'additional' && <PlusCircle size={22} />}
                    {(selectedNotifForModal.type !== 'rejected' && selectedNotifForModal.type !== 'approved' && selectedNotifForModal.type !== 'additional') && <FileText size={22} />}
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold fs-6 mb-0">
                      {(selectedNotifForModal.title || '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|📄|➕|✅|❌|ℹ️/gu, '').trim()}
                    </h5>
                    <span className="text-light opacity-60 small" style={{ fontSize: '0.75rem' }}>
                      {getRelativeTime(selectedNotifForModal.created_at)}
                    </span>
                  </div>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedNotifForModal(null)}></button>
              </div>

              <div className="modal-body py-4">
                {selectedNotifForModal.type === 'rejected' ? (
                  <div className="p-3.5 rounded-3 border" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                    <div className="fw-bold text-danger mb-2 d-flex align-items-center gap-2" style={{ fontSize: '0.9rem' }}>
                      <AlertCircle size={18} />
                      <span>Rejection Feedback / Remarks:</span>
                    </div>
                    <div className="text-light text-wrap opacity-90 fs-6 ps-1" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                      {(selectedNotifForModal.message || '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|📄|➕|✅|❌|ℹ️/gu, '').trim()}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-3 bg-dark bg-opacity-50 border border-secondary border-opacity-25">
                    <div className="text-light text-wrap opacity-90 fs-6" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                      {(selectedNotifForModal.message || '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|📄|➕|✅|❌|ℹ️/gu, '').trim()}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer border-top border-secondary border-opacity-25 pt-3">
                {!user.is_admin && selectedNotifForModal.type === 'rejected' && (
                  <button
                    type="button"
                    className="btn btn-primary fw-bold px-4"
                    onClick={() => {
                      setSelectedNotifForModal(null);
                      navigate('/dashboard');
                    }}
                  >
                    Go to APP-CSE Form
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary px-4 fw-semibold"
                  onClick={() => setSelectedNotifForModal(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NavBar;
