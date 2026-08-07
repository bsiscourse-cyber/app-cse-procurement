import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import NavBar from '../components/NavBar';
import { Building2, Plus, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';

const AdminOffices = () => {
  const [formData, setFormData] = useState({
    office_name: '',
    department: '',
    contact_person: '',
    position: '',
    email: '',
    telephone: ''
  });
  const [createdAccount, setCreatedAccount] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCreatedAccount(null);
    setLoading(true);

    try {
      const res = await client.post('/admin/offices', formData);
      setCreatedAccount(res.data);
      setFormData({
        office_name: '',
        department: '',
        contact_person: '',
        position: '',
        email: '',
        telephone: ''
      });
    } catch (err) {
      console.error('Error creating office account:', err);
      setError(err.response?.data?.message || 'Failed to create office account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light pb-5">
      <NavBar />

      <div className="container py-4" style={{ maxWidth: '720px' }}>
        <div className="mb-3">
          <Link to="/admin" className="btn btn-link text-decoration-none text-secondary d-flex align-items-center gap-1 p-0">
            <ArrowLeft size={18} /> Back to Admin Dashboard
          </Link>
        </div>

        <div className="card shadow-sm border-0">
          <div className="card-header bg-dark text-white p-4">
            <div className="d-flex align-items-center gap-2">
              <Building2 size={24} className="text-warning" />
              <h5 className="fw-bold mb-0">Create New Office Account</h5>
            </div>
            <p className="text-light opacity-75 small mb-0 mt-1">Generates a unique office password for logging into the APP-CSE system</p>
          </div>

          <div className="card-body p-4">
            {error && <div className="alert alert-danger mb-4">{error}</div>}

            {createdAccount && (
              <div className="alert alert-success border-success p-4 mb-4 rounded-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <CheckCircle2 size={24} className="text-success" />
                  <h6 className="fw-bold mb-0 text-success">Office Account Created Successfully!</h6>
                </div>
                <p className="small mb-3">Please provide the auto-generated password below to the office officer:</p>
                <div className="bg-white border rounded p-3 d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <KeyRound size={20} className="text-primary" />
                    <span className="small text-muted fw-bold">GENERATED PASSWORD:</span>
                  </div>
                  <span className="font-monospace fs-4 fw-extrabold text-primary px-3 py-1 bg-primary bg-opacity-10 rounded">
                    {createdAccount.rawPassword}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="row g-3 mb-4">
                <div className="col-12">
                  <label className="form-label small fw-bold text-dark">Office Name *</label>
                  <input
                    type="text"
                    name="office_name"
                    className="form-control"
                    placeholder="e.g. Engineering Office"
                    value={formData.office_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold text-dark">Department</label>
                  <input
                    type="text"
                    name="department"
                    className="form-control"
                    placeholder="e.g. Infrastructure Dept"
                    value={formData.department}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold text-dark">Contact Person</label>
                  <input
                    type="text"
                    name="contact_person"
                    className="form-control"
                    placeholder="e.g. Engr. Jose Rizal"
                    value={formData.contact_person}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold text-dark">Position</label>
                  <input
                    type="text"
                    name="position"
                    className="form-control"
                    placeholder="e.g. Chief Engineer"
                    value={formData.position}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold text-dark">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    placeholder="e.g. engineering@agency.gov.ph"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-bold text-dark">Telephone / Mobile Nos.</label>
                  <input
                    type="text"
                    name="telephone"
                    className="form-control"
                    placeholder="e.g. 02-8123-9999"
                    value={formData.telephone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg w-100 rounded-pill font-weight-bold d-flex align-items-center justify-content-center gap-2"
              >
                <Plus size={20} />
                <span>{loading ? 'Creating Account...' : 'Generate Office Account & Password'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOffices;
