import React, { useState } from 'react';
import client from '../api/client';
import { X, CheckCircle2, XCircle, FileText, Building, Send, Info, CornerDownRight } from 'lucide-react';

const AdminAdditionalReviewModal = ({ isOpen, onClose, requestItem, onSuccess }) => {
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [insertToForm, setInsertToForm] = useState(true);
  const [processing, setProcessing] = useState(false);
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

  if (!isOpen || !requestItem) return null;

  const handleReview = async (action) => {
    try {
      setProcessing(true);
      setMessage({ type: '', text: '' });

      const res = await client.post('/admin/additional-request/review', {
        request_id: requestItem.id,
        action,
        feedback_notes: feedbackNotes,
        insert_to_form: insertToForm
      });

      setMessage({ type: 'success', text: res.data.message });
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error reviewing request:', err);
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Action failed' });
    } finally {
      setProcessing(false);
    }
  };

  const grandTotal = requestItem.items?.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0) || 0;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
      style={{
        zIndex: 2050,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overscrollBehavior: 'contain'
      }}
      onClick={onClose}
    >
      <div
        className="card border-0 shadow-lg d-flex flex-column"
        style={{
          width: '94vw',
          maxWidth: '1400px',
          height: '92vh',
          maxHeight: '92vh',
          borderRadius: '0px',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: '0 35px 95px -15px rgba(0, 0, 0, 0.65)',
          overscrollBehavior: 'contain'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3.5 d-flex justify-content-between align-items-center border-bottom text-white flex-shrink-0" style={{ background: '#0f172a' }}>
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <Building size={22} className="text-warning" />
            </div>
            <div>
              <h5 className="fw-bold mb-0 text-white">Review Additional Procurement Request</h5>
              <p className="small text-light opacity-75 mb-0" style={{ fontSize: '0.78rem' }}>Submitted by {requestItem.office_name}</p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm text-light rounded-circle p-2 border-0 opacity-75"
            onClick={onClose}
            style={{ background: 'rgba(255, 255, 255, 0.1)', width: '36px', height: '36px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="card-body p-4 overflow-auto flex-grow-1" style={{ height: 'calc(92vh - 130px)', overscrollBehavior: 'contain' }}>
          {message.text && (
            <div className={`alert alert-${message.type} py-2.5 px-3.5 small rounded-3 mb-3 shadow-sm`}>
              {message.text}
            </div>
          )}

          {/* Office Info Summary */}
          <div className="p-3 bg-light rounded-3 border mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="fw-bold text-dark">{requestItem.office_name}</span>
              <span className="badge bg-primary rounded-pill px-3 py-1">Request #{requestItem.id}</span>
            </div>
            <div className="small text-muted">
              Submitted on: {new Date(requestItem.created_at).toLocaleString()}
            </div>
            {requestItem.reason_notes && (
              <div className="mt-2 pt-2 border-top small text-dark">
                <strong>Justification Notes:</strong> {requestItem.reason_notes}
              </div>
            )}
          </div>

          {/* Additional Items Requested Table */}
          <h6 className="fw-bold text-dark mb-2">Requested Additional Items</h6>
          <div className="table-responsive mb-3 border rounded-3 overflow-hidden">
            <table className="table table-hover table-sm align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead className="table-dark">
                <tr>
                  <th>Part</th>
                  <th>Item Code / Specification</th>
                  <th>Unit</th>
                  <th className="text-center">Total Qty</th>
                  <th className="text-end">Unit Price</th>
                  <th className="text-end">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {requestItem.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="fw-medium">Part {item.item_part}</td>
                    <td>{item.p1_spec || item.p2_spec || 'Item #' + item.item_id}</td>
                    <td>{item.p1_unit || item.p2_unit || 'unit'}</td>
                    <td className="text-center fw-bold text-primary">{item.total_qty}</td>
                    <td className="text-end">₱{parseFloat(item.unit_price || 0).toFixed(2)}</td>
                    <td className="text-end fw-bold">₱{parseFloat(item.total_amount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-light">
                <tr>
                  <td colSpan={5} className="text-end fw-bold">Total Additional Amount:</td>
                  <td className="text-end fw-bold text-success fs-6">₱{grandTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Merge / Insert Option Checkbox */}
          <div className="p-3 bg-warning-subtle border border-warning-subtle rounded-3 mb-3">
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="insertToFormCheck"
                checked={insertToForm}
                onChange={(e) => setInsertToForm(e.target.checked)}
                style={{ cursor: 'pointer', width: '2.5em', height: '1.25em' }}
              />
              <label className="form-check-label fw-bold text-dark ms-2" htmlFor="insertToFormCheck" style={{ cursor: 'pointer' }}>
                <CornerDownRight size={16} className="text-warning me-1" />
                Automatically insert & merge these additional items into {requestItem.office_name}'s APP-CSE 2027 form upon approval
              </label>
            </div>
            <div className="small text-muted mt-1 ms-4 ps-1" style={{ fontSize: '0.78rem' }}>
              If enabled, quantities and amounts for these items will automatically be added directly to the office's main submitted form entries.
            </div>
          </div>

          {/* Admin Feedback Input */}
          <div className="mb-4">
            <label className="form-label small fw-bold text-dark mb-1">
              Supply Office Admin Feedback / Notes (Sent to Office Account)
            </label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="Add feedback or remarks for the office regarding this additional request..."
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              style={{ fontSize: '0.875rem' }}
            ></textarea>
          </div>

          {/* Action Buttons */}
          <div className="d-flex justify-content-end gap-2 pt-3 border-top">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline-secondary rounded-pill px-4"
              disabled={processing}
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => handleReview('reject')}
              disabled={processing}
              className="btn btn-danger rounded-pill px-4 font-weight-bold d-flex align-items-center gap-2"
            >
              <XCircle size={16} />
              <span>Reject Request</span>
            </button>
            <button
              type="button"
              onClick={() => handleReview('approve')}
              disabled={processing}
              className="btn btn-success rounded-pill px-4 font-weight-bold d-flex align-items-center gap-2 text-white"
            >
              <CheckCircle2 size={16} />
              <span>Approve & Merge Request</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAdditionalReviewModal;
