import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import NavBar from '../components/NavBar';
import AppCSETable from '../components/AppCSETable';
import HeaderInfoForm from '../components/HeaderInfoForm';
import SummaryBlock from '../components/SummaryBlock';
import SignatureBlock from '../components/SignatureBlock';
import { ArrowLeft, CheckCircle2, XCircle, FileSpreadsheet, FileEdit, Clock, RotateCcw } from 'lucide-react';

const AdminSubmission = () => {
  const { id } = useParams();
  const [part1Items, setPart1Items] = useState([]);
  const [part2Items, setPart2Items] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [entriesMap, setEntriesMap] = useState({});
  const [headerInfo, setHeaderInfo] = useState({});
  const [part1Summary, setPart1Summary] = useState({});
  const [part2Summary, setPart2Summary] = useState({});
  const [signatories, setSignatories] = useState({});
  const [activeTab, setActiveTab] = useState('part1');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [p1Res, p2Res, subRes] = await Promise.all([
        client.get('/items/part1'),
        client.get('/items/part2'),
        client.get(`/admin/submission/${id}`)
      ]);

      setPart1Items(p1Res.data);
      setPart2Items(p2Res.data);

      const { submission: subData, entriesMap: map } = subRes.data;
      setSubmission(subData);
      setEntriesMap(map || {});

      setHeaderInfo({
        department_bureau: subData.department_bureau || subData.office_name,
        agency_code_uacs: subData.agency_code_uacs || '',
        contact_person: subData.contact_person || '',
        region: subData.region || '',
        org_type: subData.org_type || '',
        position: subData.position || '',
        address: subData.address || '',
        email: subData.email || '',
        telephone_mobile: subData.telephone_mobile || ''
      });

      setPart1Summary({
        total_a: parseFloat(subData.part1_total_a || 0),
        provision_b: parseFloat(subData.part1_provision_b || 0),
        freight_c: parseFloat(subData.part1_freight_c || 0),
        grand_total_d: parseFloat(subData.part1_grand_total_d || 0),
        budget_text_e: subData.part1_budget_text_e || ''
      });

      setPart2Summary({
        total_a: parseFloat(subData.part2_total_a || 0),
        provision_b: parseFloat(subData.part2_provision_b || 0),
        freight_c: parseFloat(subData.part2_freight_c || 0),
        grand_total_d: parseFloat(subData.part2_grand_total_d || 0),
        budget_text_e: subData.part2_budget_text_e || ''
      });

      setSignatories({
        prepared_by_name: subData.prepared_by_name || '',
        certified_by_name: subData.certified_by_name || '',
        approved_by_name: subData.approved_by_name || '',
        date_prepared: subData.date_prepared || ''
      });
    } catch (err) {
      console.error('Error loading submission details:', err);
    } finally {
      setLoading(false);
    }
  };

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const handleApprove = async () => {
    if (!window.confirm(`Approve APP-CSE submission for ${submission?.office_name}?`)) return;

    try {
      await client.post(`/admin/approve/${id}`, { action: 'approve' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error approving submission');
    }
  };

  const handleReject = () => {
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) return;

    try {
      setRejectLoading(true);
      await client.post(`/admin/approve/${id}`, { action: 'reject', remarks: rejectReason.trim() });
      setShowRejectModal(false);
      setRejectReason('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error rejecting submission');
    } finally {
      setRejectLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`Reset submission status for ${submission?.office_name} back to DRAFT?`)) return;

    try {
      await client.post(`/admin/approve/${id}`, { action: 'reset' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error resetting submission');
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amt || 0);
  };

  const renderHeaderStatusBadge = (status) => {
    if (status === 'approved') {
      return (
        <span className="badge rounded-pill px-3 py-1.5 d-inline-flex align-items-center justify-content-center font-weight-bold" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.8rem', gap: '7px' }}>
          <span>APPROVED</span>
          <CheckCircle2 size={15} style={{ color: '#10b981' }} />
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="badge rounded-pill px-3 py-1.5 d-inline-flex align-items-center justify-content-center font-weight-bold" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.8rem', gap: '7px' }}>
          <span>REJECTED (RETURNED)</span>
          <XCircle size={15} style={{ color: '#ef4444' }} />
        </span>
      );
    }
    if (status === 'submitted') {
      return (
        <span className="badge rounded-pill px-3 py-1.5 d-inline-flex align-items-center justify-content-center font-weight-bold" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', border: '1px solid rgba(56, 189, 248, 0.3)', fontSize: '0.8rem', gap: '7px' }}>
          <span>SUBMITTED (PENDING APPROVAL)</span>
          <Clock size={15} style={{ color: '#38bdf8' }} />
        </span>
      );
    }
    return (
      <span className="badge rounded-pill px-3 py-1.5 d-inline-flex align-items-center justify-content-center font-weight-bold" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.8rem', gap: '7px' }}>
        <span>DRAFT</span>
        <FileEdit size={15} style={{ color: '#f59e0b' }} />
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-vh-100 bg-light d-flex justify-content-center align-items-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
          <p className="mt-3 text-muted fw-medium">Loading Approval View...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light pb-5">
      <NavBar />

      <div className="container-fluid px-4 py-4">
        <div className="mb-3">
          <Link to="/admin" className="btn btn-link text-decoration-none text-secondary d-flex align-items-center gap-1 p-0">
            <ArrowLeft size={18} /> Back to Admin Dashboard
          </Link>
        </div>

        {/* Action Banner */}
        <div className="card shadow-sm border-0 mb-4 bg-white">
          <div className="card-body p-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <FileSpreadsheet className="text-primary" size={24} />
                <h4 className="fw-bold mb-0 text-dark">{submission?.office_name} — Approval View</h4>
              </div>
              <p className="text-muted small mb-0">Showing strictly requested items with quantities &gt; 0 for review and approval</p>
            </div>

            <div className="d-flex align-items-center gap-3 flex-wrap">
              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted fw-bold">STATUS:</span>
                {renderHeaderStatusBadge(submission?.status)}
              </div>

              {submission?.status === 'submitted' && (
                <div className="d-flex align-items-center gap-2">
                  <button onClick={handleReject} className="btn btn-outline-danger rounded-pill d-flex align-items-center gap-2 px-3 fw-bold">
                    <XCircle size={17} />
                    <span>Reject</span>
                  </button>
                  <button onClick={handleApprove} className="btn btn-success rounded-pill d-flex align-items-center gap-2 px-4 fw-bold shadow-sm">
                    <CheckCircle2 size={18} />
                    <span>Approve Submission</span>
                  </button>
                </div>
              )}

              {(submission?.status === 'approved' || submission?.status === 'rejected') && (
                <button onClick={handleReset} className="btn btn-outline-secondary rounded-pill d-flex align-items-center gap-2 px-3 fw-bold btn-sm">
                  <RotateCcw size={15} />
                  <span>Reset to Draft</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Agency Info */}
        <HeaderInfoForm headerInfo={headerInfo} setHeaderInfo={setHeaderInfo} readOnly={true} />

        {/* Tabs - Only Showing Items With Values */}
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-white p-2 border-bottom">
            <ul className="nav nav-pills nav-fill">
              <li className="nav-item">
                <button className={`nav-link py-3 font-weight-bold ${activeTab === 'part1' ? 'active bg-primary' : 'text-dark'}`} onClick={() => setActiveTab('part1')}>
                  PART I — REQUESTED PS-DBM ITEMS (Only Items With Quantities)
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link py-3 font-weight-bold ${activeTab === 'part2' ? 'active bg-primary' : 'text-dark'}`} onClick={() => setActiveTab('part2')}>
                  PART II — REQUESTED OTHER ITEMS (Only Items With Quantities)
                </button>
              </li>
            </ul>
          </div>
          <div className="card-body p-3">
            {activeTab === 'part1' && (
              <>
                <AppCSETable items={part1Items} entriesMap={entriesMap} setEntriesMap={setEntriesMap} part={1} readOnly={true} onlyWithValues={true} />
                <SummaryBlock summary={part1Summary} setSummary={setPart1Summary} title="PART I" readOnly={true} />
              </>
            )}

            {activeTab === 'part2' && (
              <>
                <AppCSETable items={part2Items} entriesMap={entriesMap} setEntriesMap={setEntriesMap} part={2} readOnly={true} onlyWithValues={true} />
                <SummaryBlock summary={part2Summary} setSummary={setPart2Summary} title="PART II" readOnly={true} />
              </>
            )}
          </div>
        </div>

        {/* Combined Total */}
        <div className="card bg-dark text-white border-0 shadow-sm mb-4">
          <div className="card-body p-4 d-flex justify-content-between align-items-center">
            <div>
              <h5 className="fw-bold mb-1 text-warning">OVERALL COMBINED GRAND TOTAL (Part I + Part II)</h5>
              <p className="mb-0 small text-light opacity-75">Sum of Part I Grand Total D and Part II Grand Total D</p>
            </div>
            <div className="text-end">
              <h2 className="fw-extrabold mb-0 text-warning">
                {formatCurrency((part1Summary.grand_total_d || 0) + (part2Summary.grand_total_d || 0))}
              </h2>
            </div>
          </div>
        </div>

        <SignatureBlock signatories={signatories} setSignatories={setSignatories} readOnly={true} />
      </div>

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }}>
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 pb-0 px-4 pt-4" style={{ background: 'linear-gradient(135deg,#991b1b,#dc2626)' }}>
                <div>
                  <h5 className="fw-bold text-white mb-1 d-flex align-items-center gap-2">
                    <XCircle size={20} style={{ color: '#fca5a5' }} /> Reject & Return Submission
                  </h5>
                  <p className="text-white-50 small mb-0">{submission?.office_name} — APP-CSE Form</p>
                </div>
                <button type="button" className="btn btn-link text-white ms-auto p-0 border-0 fs-5 text-decoration-none" onClick={() => setShowRejectModal(false)}>
                  ✕
                </button>
              </div>

              <div className="modal-body p-4">
                <label className="form-label fw-bold small text-dark mb-2">
                  Reason / Remarks for Rejection <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control rounded-3"
                  rows="4"
                  placeholder="State the reason for returning this submission (e.g., Please adjust quantities in Part I Alcohol or update contact person details)..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ fontSize: '0.9rem' }}
                  autoFocus
                />
                <div className="form-text small text-muted mt-2">
                  This reason will be sent directly to <strong>{submission?.office_name}</strong> in their notification bell.
                </div>
              </div>

              <div className="modal-footer border-0 px-4 pb-4 pt-0 d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light rounded-pill px-4 fw-bold"
                  onClick={() => setShowRejectModal(false)}
                  disabled={rejectLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2"
                  onClick={confirmReject}
                  disabled={rejectLoading || !rejectReason.trim()}
                >
                  {rejectLoading ? 'Processing...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSubmission;
