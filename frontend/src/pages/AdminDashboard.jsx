import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import NavBar from '../components/NavBar';
import ManageOfficesModal from '../components/ManageOfficesModal';
import ManageCatalogModal from '../components/ManageCatalogModal';
import { Plus, Eye, CheckCircle2, Building, FileEdit, Clock, Check, Package, BarChart3 } from 'lucide-react';

const AdminDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showManageOffices, setShowManageOffices] = useState(false);
  const [showManageCatalog, setShowManageCatalog] = useState(false);
  const currentYear = new Date().getFullYear();
  const [fiscalYears, setFiscalYears] = useState([currentYear]);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    fetchFiscalYears();
  }, []);

  useEffect(() => {
    fetchSubmissions(true);
    const interval = setInterval(() => {
      fetchSubmissions(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedYear]);

  const fetchFiscalYears = async () => {
    try {
      const res = await client.get('/admin/fiscal-years');
      const years = res.data;
      const merged = Array.from(new Set([currentYear, ...years])).sort((a, b) => b - a);
      setFiscalYears(merged);
    } catch (err) {
      console.error('Error fetching fiscal years:', err);
    }
  };

  const fetchSubmissions = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await client.get(`/admin/submissions?year=${selectedYear}`);
      setSubmissions(prev => {
        const newJson = JSON.stringify(res.data);
        return JSON.stringify(prev) === newJson ? prev : res.data;
      });
      setError('');
    } catch (err) {
      console.error('Error fetching submissions:', err);
      if (showSpinner) setError('Failed to load office submissions');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const handleApprove = async (submissionId, officeName) => {
    if (!window.confirm(`Approve APP-CSE ${selectedYear} submission for ${officeName}?`)) return;
    try {
      await client.post(`/admin/approve/${submissionId}`, { action: 'approve' });
      fetchSubmissions(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error approving submission');
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amt || 0);
  };

  const totalOffices = submissions.length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const submittedCount = submissions.filter(s => s.status === 'submitted').length;
  const draftCount = submissions.filter(s => !s.submission_id || s.status === 'draft').length;
  const overallGrandTotal = submissions.reduce((sum, s) => sum + parseFloat(s.overall_grand_total || 0), 0);

  const renderStatusBadge = (status) => {
    if (status === 'approved') {
      return (
        <span className="badge rounded-pill px-3 py-1.5 d-inline-flex align-items-center justify-content-center font-weight-bold"
          style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)', fontSize: '0.775rem', letterSpacing: '0.04em', gap: '7px' }}>
          <span>APPROVED</span><CheckCircle2 size={14} style={{ color: '#10b981' }} />
        </span>
      );
    }
    if (status === 'submitted') {
      return (
        <span className="badge rounded-pill px-3 py-1.5 d-inline-flex align-items-center justify-content-center font-weight-bold"
          style={{ background: 'rgba(14,165,233,0.12)', color: '#0284c7', border: '1px solid rgba(56,189,248,0.3)', fontSize: '0.775rem', letterSpacing: '0.04em', gap: '7px' }}>
          <span>SUBMITTED</span><Clock size={14} style={{ color: '#38bdf8' }} />
        </span>
      );
    }
    return (
      <span className="badge rounded-pill px-3 py-1.5 d-inline-flex align-items-center justify-content-center font-weight-bold"
        style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.775rem', letterSpacing: '0.04em', gap: '7px' }}>
        <span>DRAFT</span><FileEdit size={14} style={{ color: '#f59e0b' }} />
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-vh-100 bg-light d-flex justify-content-center align-items-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
          <p className="mt-3 text-muted fw-medium">Loading Supply Office Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light pb-5">
      <NavBar />

      <div className="container-fluid px-4 py-4">
        {/* Banner Header */}
        <div className="card shadow-sm border-0 mb-4 bg-dark text-white">
          <div className="card-body p-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <h4 className="fw-bold mb-0 text-white">Supply Office Admin Dashboard</h4>
              <p className="text-light opacity-75 small mb-0">Overview of all office APP-CSE {selectedYear} requests and approvals</p>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Link
                to={`/admin/consolidated?year=${selectedYear}`}
                className="btn btn-success rounded-pill d-flex align-items-center gap-2 px-3 py-2 fw-bold shadow-sm text-white"
                style={{ textDecoration: 'none' }}
              >
                <BarChart3 size={18} />
                <span>View Consolidation</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowManageCatalog(true)}
                className="btn btn-info text-white rounded-pill d-flex align-items-center gap-2 px-3 py-2 fw-bold shadow-sm"
              >
                <Package size={18} />
                <span>Manage Items & Prices</span>
              </button>
              <button
                type="button"
                onClick={() => setShowManageOffices(true)}
                className="btn btn-warning rounded-pill d-flex align-items-center gap-2 px-3 py-2 fw-bold text-dark shadow-sm"
              >
                <Plus size={18} />
                <span>Create Office Account</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          {[
            { label: 'Total Offices', value: totalOffices, color: '#4f46e5', border: '#6366f1' },
            { label: 'Approved', value: approvedCount, color: '#059669', border: '#10b981' },
            { label: 'Submitted', value: submittedCount, color: '#0284c7', border: '#0ea5e9' },
            { label: 'Draft / Not Started', value: draftCount, color: '#d97706', border: '#f59e0b' },
          ].map((stat, i) => (
            <div className="col-6 col-md-3" key={i}>
              <div className="card border-0 shadow-sm h-100" style={{ borderLeft: `4px solid ${stat.border}` }}>
                <div className="card-body py-3 px-3">
                  <div className="small text-muted fw-semibold mb-1 text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.06em' }}>{stat.label}</div>
                  <div className="fw-extrabold" style={{ fontSize: '1.6rem', color: stat.color }}>{stat.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && <div className="alert alert-danger mb-4">{error}</div>}

        {/* Office Submissions Table */}
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 border-bottom d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
            <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
              <Building size={20} className="text-primary" />
              Office Submissions — FY {selectedYear} ({submissions.length} Offices)
            </h6>
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <label className="small fw-semibold text-muted mb-0 text-nowrap">Fiscal Year:</label>
                <select
                  className="form-select form-select-sm rounded-pill fw-bold"
                  style={{ fontSize: '0.82rem', minWidth: '90px', borderColor: '#94a3b8', cursor: 'pointer' }}
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                >
                  {fiscalYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
              <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1 text-uppercase fw-bold" style={{ fontSize: '0.75rem' }}>
                ● Live
              </span>
            </div>
          </div>

          {/* Grand Total Strip */}
          <div className="px-4 py-2 border-bottom d-flex align-items-center justify-content-between" style={{ background: 'linear-gradient(90deg,#f0fdf4,#dcfce7)' }}>
            <span className="small fw-semibold text-success">Combined Grand Total — All Offices, FY {selectedYear}</span>
            <span className="fw-extrabold text-success" style={{ fontSize: '1.05rem' }}>{formatCurrency(overallGrandTotal)}</span>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th className="py-3 px-3">OFFICE / DEPARTMENT</th>
                    <th className="py-3 px-3">CONTACT PERSON</th>
                    <th className="py-3 px-3 text-end text-nowrap" style={{ minWidth: '160px' }}>PART I TOTAL</th>
                    <th className="py-3 px-3 text-end text-nowrap" style={{ minWidth: '160px' }}>PART II TOTAL</th>
                    <th className="py-3 px-3 text-end text-nowrap" style={{ minWidth: '170px' }}>GRAND TOTAL</th>
                    <th className="py-3 px-3 text-center">STATUS</th>
                    <th className="py-3 px-3 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.office_id}>
                      <td className="fw-bold text-dark py-3 px-3">
                        <div>{sub.office_name}</div>
                        <div className="small text-muted fw-normal">{sub.department || '—'}</div>
                      </td>
                      <td className="small text-secondary py-3 px-3">
                        <div className="fw-semibold text-dark">{sub.contact_person || '—'}</div>
                        {sub.email && (
                          <a href={`mailto:${sub.email}`} className="text-primary text-decoration-underline fst-italic" style={{ fontSize: '0.81rem' }}>
                            {sub.email}
                          </a>
                        )}
                      </td>
                      <td className="text-end mono-font fw-medium text-secondary py-3 px-3 text-nowrap" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {sub.part1_grand_total_d != null ? formatCurrency(sub.part1_grand_total_d) : <span className="text-muted fst-italic">—</span>}
                      </td>
                      <td className="text-end mono-font fw-medium text-secondary py-3 px-3 text-nowrap" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {sub.part2_grand_total_d != null ? formatCurrency(sub.part2_grand_total_d) : <span className="text-muted fst-italic">—</span>}
                      </td>
                      <td className="text-end mono-font fw-bold text-primary py-3 px-3 text-nowrap" style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>
                        {sub.overall_grand_total != null ? formatCurrency(sub.overall_grand_total) : <span className="text-muted fst-italic small">No submission</span>}
                      </td>
                      <td className="text-center py-3 px-4">
                        {sub.submission_id ? renderStatusBadge(sub.status) : (
                          <span className="badge rounded-pill px-3 py-1.5 d-inline-flex align-items-center"
                            style={{ background: 'rgba(100,116,139,0.1)', color: '#64748b', border: '1px solid #cbd5e1', fontSize: '0.775rem' }}>
                            NOT STARTED
                          </span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="d-flex justify-content-center align-items-center gap-2">
                          {sub.submission_id && (
                            <Link
                              to={`/admin/submission/${sub.submission_id}?officeId=${sub.office_id}`}
                              className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1.5 fw-bold d-flex align-items-center gap-1"
                            >
                              <Eye size={15} />
                              <span>View Form</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ManageOfficesModal isOpen={showManageOffices} onClose={() => { setShowManageOffices(false); fetchSubmissions(false); }} />
      <ManageCatalogModal isOpen={showManageCatalog} onClose={() => setShowManageCatalog(false)} />
    </div>
  );
};

export default AdminDashboard;
