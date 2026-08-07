import React, { useState, useEffect, useTransition, useMemo } from 'react';
import client from '../api/client';
import { PlusCircle, X, Send, CheckCircle2, Clock, XCircle, ShoppingCart, Info, Loader2 } from 'lucide-react';
import AppCSETable from './AppCSETable';

const AdditionalRequestModal = ({ isOpen, onClose, part1Items, part2Items, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'history'
  const [additionalPart, setAdditionalPart] = useState('1'); // '1' or '2'
  const [entriesMap, setEntriesMap] = useState({});
  const [reasonNotes, setReasonNotes] = useState('');
  const [history, setHistory] = useState([]);
  const [submitting, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [tableReady, setTableReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchHistory();
      // Defer heavy table render so modal opens instantly
      setTableReady(false);
      const timer = requestAnimationFrame(() => {
        startTransition(() => {
          setTableReady(true);
        });
      });
      return () => {
        document.body.style.overflow = 'unset';
        cancelAnimationFrame(timer);
      };
    } else {
      document.body.style.overflow = 'unset';
      setTableReady(false);
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await client.get('/submission/additional/mine');
      setHistory(res.data);
    } catch (err) {
      console.error('Error fetching additional request history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Filter only entries with total_qty > 0
    const validEntries = Object.values(entriesMap).filter(entry => {
      const qty = (entry.jan||0)+(entry.feb||0)+(entry.mar||0)+(entry.apr||0)+(entry.may||0)+(entry.jun||0)+(entry.jul||0)+(entry.aug||0)+(entry.sep||0)+(entry.oct||0)+(entry.nov||0)+(entry.decm||0);
      return qty > 0;
    });

    if (validEntries.length === 0) {
      setMessage({ type: 'danger', text: 'Please enter a quantity > 0 for at least one item before submitting an additional request.' });
      return;
    }

    try {
      setSaving(true);
      const res = await client.post('/submission/additional', {
        reason_notes: reasonNotes,
        entries: validEntries
      });

      setMessage({ type: 'success', text: res.data.message });
      setEntriesMap({});
      setReasonNotes('');
      fetchHistory();
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setActiveTab('history');
      }, 1500);
    } catch (err) {
      console.error('Failed to submit additional request:', err);
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to submit additional request' });
    } finally {
      setSaving(false);
    }
  };

  const renderStatusBadge = (status) => {
    if (status === 'approved') {
      return (
        <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1 font-weight-bold d-inline-flex align-items-center gap-1">
          <CheckCircle2 size={13} /> APPROVED & MERGED
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-3 py-1 font-weight-bold d-inline-flex align-items-center gap-1">
          <XCircle size={13} /> REJECTED
        </span>
      );
    }
    return (
      <span className="badge bg-warning-subtle text-warning border border-warning-subtle rounded-pill px-3 py-1 font-weight-bold d-inline-flex align-items-center gap-1">
        <Clock size={13} /> PENDING ADMIN REVIEW
      </span>
    );
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-2"
      style={{
        zIndex: 2050,
        background: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overscrollBehavior: 'contain'
      }}
      onClick={onClose}
    >
      <div
        className="card border-0 shadow-lg position-relative"
        style={{
          width: '98vw',
          maxWidth: '1850px',
          height: '96vh',
          maxHeight: '96vh',
          borderRadius: '0px',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: '0 30px 90px -15px rgba(0, 0, 0, 0.65)',
          overscrollBehavior: 'contain'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          className="px-4 py-3 d-flex justify-content-between align-items-center text-white flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
              style={{
                width: '40px',
                height: '40px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}
            >
              <PlusCircle size={20} className="text-info" />
            </div>
            <div>
              <h5 className="fw-bold mb-0 text-white" style={{ fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                Additional Procurement Request
              </h5>
              <p className="small text-light opacity-75 mb-0" style={{ fontSize: '0.78rem' }}>
                Request additional items for your submitted/approved APP-CSE 2027 form
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm text-light rounded-circle p-0 border-0 opacity-75 d-flex align-items-center justify-content-center"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              width: '34px',
              height: '34px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs Header */}
        <div className="px-4 py-2.5 bg-light border-bottom d-flex justify-content-between align-items-center flex-shrink-0">
          <div className="nav nav-pills gap-2">
            <button
              type="button"
              className={`nav-link rounded-pill px-4 py-1.5 small fw-bold border-0 ${activeTab === 'new' ? 'active bg-primary text-white shadow-sm' : 'text-secondary bg-white border'}`}
              onClick={() => setActiveTab('new')}
              style={{ fontSize: '0.82rem' }}
            >
              + Create New Additional Request
            </button>
            <button
              type="button"
              className={`nav-link rounded-pill px-4 py-1.5 small fw-bold border-0 ${activeTab === 'history' ? 'active bg-primary text-white shadow-sm' : 'text-secondary bg-white border'}`}
              onClick={() => setActiveTab('history')}
              style={{ fontSize: '0.82rem' }}
            >
              Request History ({history.length})
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="card-body p-4 overflow-auto flex-grow-1" style={{ height: 'calc(96vh - 130px)', overscrollBehavior: 'contain' }}>
          {message.text && (
            <div className={`alert alert-${message.type} py-2.5 px-3.5 small rounded-3 mb-4 shadow-sm`}>
              {message.text}
            </div>
          )}

          {activeTab === 'new' && (
            <form onSubmit={handleSubmit}>
              <div className="alert alert-info py-2.5 px-3.5 small rounded-3 mb-3 d-flex align-items-center gap-2 border-0" style={{ background: '#f0f9ff', color: '#0369a1' }}>
                <Info size={18} className="flex-shrink-0" />
                <span>Fill out the additional quantities required for Part I or Part II items below. Once submitted, Supply Office Admin will review and can automatically insert these items into your submitted form.</span>
              </div>

              {/* Part selector */}
              <div className="mb-3 d-flex align-items-center gap-3">
                <label className="fw-bold small text-dark me-2">Select Item Type:</label>
                <div className="btn-group" role="group">
                  <button
                    type="button"
                    className={`btn btn-sm rounded-start-pill px-3 ${additionalPart === '1' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setAdditionalPart('1')}
                  >
                    PART I (Common-Use Supplies)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm rounded-end-pill px-3 ${additionalPart === '2' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setAdditionalPart('2')}
                  >
                    PART II (Other Items / Equipment)
                  </button>
                </div>
              </div>

              {/* Items Tables — both rendered, inactive hidden with CSS for instant switching */}
              {!tableReady ? (
                <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted" style={{ minHeight: '300px' }}>
                  <Loader2 size={36} className="text-primary mb-3" style={{ animation: 'spin 1s linear infinite' }} />
                  <p className="fw-medium mb-1">Loading items table...</p>
                  <p className="small opacity-75">Preparing {additionalPart === '1' ? part1Items.length : part2Items.length} items</p>
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <>
                  <div style={{ display: additionalPart === '1' ? 'block' : 'none' }}>
                    <AppCSETable
                      items={part1Items}
                      entriesMap={entriesMap}
                      setEntriesMap={setEntriesMap}
                      part={1}
                      readOnly={false}
                    />
                  </div>
                  <div style={{ display: additionalPart === '2' ? 'block' : 'none' }}>
                    <AppCSETable
                      items={part2Items}
                      entriesMap={entriesMap}
                      setEntriesMap={setEntriesMap}
                      part={2}
                      readOnly={false}
                    />
                  </div>
                </>
              )}

              {/* Reason / Justification Notes */}
              <div className="mt-3 mb-4">
                <label className="form-label small fw-bold text-dark mb-1">
                  Justification / Purpose of Additional Request (Optional)
                </label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="State the reason or justification for this additional procurement request..."
                  value={reasonNotes}
                  onChange={(e) => setReasonNotes(e.target.value)}
                  style={{ fontSize: '0.875rem' }}
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-outline-secondary rounded-pill px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary rounded-pill px-4 font-weight-bold d-flex align-items-center gap-2"
                >
                  <Send size={16} />
                  <span>{submitting ? 'Submitting...' : 'Submit Additional Request'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'history' && (
            <div>
              {loadingHistory ? (
                <div className="text-center py-5 text-muted small">Loading history...</div>
              ) : history.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <ShoppingCart size={40} className="d-block mx-auto mb-2 opacity-40" />
                  No additional procurement requests submitted yet.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {history.map((req) => (
                    <div key={req.id} className="card border rounded-3 p-3 shadow-sm bg-white">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <div className="fw-bold text-dark d-flex align-items-center gap-2">
                            <span>Request #{req.id}</span>
                            {renderStatusBadge(req.status)}
                          </div>
                          <div className="small text-muted mt-1">
                            Submitted on {new Date(req.created_at).toLocaleString()}
                          </div>
                        </div>

                        {req.items?.length > 0 && (
                          <span className="badge bg-light text-dark border">
                            {req.items.length} additional item(s)
                          </span>
                        )}
                      </div>

                      {req.reason_notes && (
                        <div className="small text-secondary bg-light p-2.5 rounded-3 mb-2">
                          <strong>Justification:</strong> {req.reason_notes}
                        </div>
                      )}

                      {/* Items Summary Table */}
                      <div className="table-responsive mb-2">
                        <table className="table table-sm table-bordered mb-0 align-middle" style={{ fontSize: '0.8rem' }}>
                          <thead className="table-light">
                            <tr>
                              <th>Part</th>
                              <th>Item Specification</th>
                              <th>Unit</th>
                              <th className="text-center">Total Qty</th>
                              <th className="text-end">Unit Price</th>
                              <th className="text-end">Total Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {req.items?.map((item) => (
                              <tr key={item.id}>
                                <td>Part {item.item_part}</td>
                                <td>{item.p1_spec || item.p2_spec || 'Item #' + item.item_id}</td>
                                <td>{item.p1_unit || item.p2_unit || 'unit'}</td>
                                <td className="text-center fw-bold">{item.total_qty}</td>
                                <td className="text-end">₱{parseFloat(item.unit_price || 0).toFixed(2)}</td>
                                <td className="text-end fw-bold">₱{parseFloat(item.total_amount || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {req.admin_feedback && (
                        <div className={`alert alert-${req.status === 'approved' ? 'success' : 'danger'} py-2 px-3 small mb-0 rounded-3`}>
                          <strong>Supply Office Feedback:</strong> {req.admin_feedback}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdditionalRequestModal;
