import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Building, Briefcase, Camera, X } from 'lucide-react';

const EditProfileModal = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    office_name: '',
    department: '',
    contact_person: '',
    position: '',
    email: '',
    telephone: '',
    profile_picture: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (user) {
      setFormData({
        office_name: user.office_name || '',
        department: user.department || '',
        contact_person: user.contact_person || '',
        position: user.position || '',
        email: user.email || '',
        telephone: user.telephone || '',
        profile_picture: user.profile_picture || ''
      });
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setMessage({ type: 'danger', text: 'Image size must be less than 8MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setFormData(prev => ({ ...prev, profile_picture: compressedBase64 }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await client.put('/auth/profile', formData);
      updateUser(res.data.user);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => {
        onClose();
        setMessage({ type: '', text: '' });
      }, 1000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setMessage({ type: 'danger', text: err.response?.data?.message || err.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

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
          maxWidth: '520px',
          maxHeight: '90vh',
          borderRadius: '0px',
          overflow: 'hidden',
          overscrollBehavior: 'contain'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-header bg-dark text-white p-4 d-flex justify-content-between align-items-center flex-shrink-0">
          <div className="d-flex align-items-center gap-2">
            <User size={22} className="text-warning" />
            <h5 className="fw-bold mb-0">Edit Account Profile</h5>
          </div>
          <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
        </div>

        <div className="card-body p-4 overflow-auto flex-grow-1" style={{ overscrollBehavior: 'contain' }}>
          {message.text && (
            <div className={`alert alert-${message.type} py-2 px-3 small rounded-3 mb-3`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Avatar Upload */}
            <div className="text-center mb-4">
              <div className="position-relative d-inline-block">
                <div
                  className="rounded-circle overflow-hidden d-flex align-items-center justify-content-center shadow-sm"
                  style={{
                    width: '90px',
                    height: '90px',
                    border: '3px solid #0b192c',
                    background: '#e2e8f0'
                  }}
                >
                  {formData.profile_picture ? (
                    <img src={formData.profile_picture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={40} className="text-secondary" />
                  )}
                </div>

                <label
                  htmlFor="avatarInput"
                  className="position-absolute bottom-0 end-0 btn btn-sm btn-primary rounded-circle p-1.5 shadow"
                  style={{ cursor: 'pointer', width: '32px', height: '32px' }}
                  title="Upload Photo"
                >
                  <Camera size={16} />
                  <input
                    type="file"
                    id="avatarInput"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="d-none"
                  />
                </label>
              </div>
              <div className="small text-muted mt-2">Click camera icon to change profile photo</div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-bold text-dark">Office / Account Name</label>
              <div className="input-group">
                <span className="input-group-text bg-light"><Building size={16} /></span>
                <input
                  type="text"
                  name="office_name"
                  className="form-control"
                  value={formData.office_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small fw-bold text-dark">Contact Person</label>
                <input
                  type="text"
                  name="contact_person"
                  className="form-control"
                  value={formData.contact_person}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="col-6">
                <label className="form-label small fw-bold text-dark">Position</label>
                <input
                  type="text"
                  name="position"
                  className="form-control"
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="e.g. Budget Officer"
                />
              </div>
            </div>

            <div className="row g-2 mb-4">
              <div className="col-6">
                <label className="form-label small fw-bold text-dark">Email Address</label>
                <div className="input-group">
                  <span className="input-group-text bg-light"><Mail size={16} /></span>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="office@univ.edu.ph"
                  />
                </div>
              </div>
              <div className="col-6">
                <label className="form-label small fw-bold text-dark">Telephone / Mobile</label>
                <div className="input-group">
                  <span className="input-group-text bg-light"><Phone size={16} /></span>
                  <input
                    type="text"
                    name="telephone"
                    className="form-control"
                    value={formData.telephone}
                    onChange={handleChange}
                    placeholder="09123456789"
                  />
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary rounded-pill px-4 fw-bold">
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
