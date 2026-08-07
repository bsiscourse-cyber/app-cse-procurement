import React from 'react';

const SummaryBlock = ({ summary, setSummary, title, readOnly }) => {
  const handleFreightChange = (e) => {
    const val = Math.max(0, parseFloat(e.target.value) || 0);
    setSummary(prev => {
      const grand = (prev.total_a || 0) + (prev.provision_b || 0) + val;
      return {
        ...prev,
        freight_c: val,
        grand_total_d: grand
      };
    });
  };

  const handleBudgetTextChange = (e) => {
    const text = e.target.value;
    setSummary(prev => ({
      ...prev,
      budget_text_e: text
    }));
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amt || 0);
  };

  return (
    <div className="card shadow-sm border-0 my-4">
      <div className="card-header bg-dark text-white py-3">
        <h6 className="mb-0 font-weight-bold">{title} SUMMARY & BUDGET COMPUTATIONS</h6>
      </div>
      <div className="card-body p-0">
        <div className="summary-card">
          <div className="summary-row">
            <span className="fw-semibold">A. TOTAL (Sum of Total Amount for all items)</span>
            <span className="fw-bold text-dark">{formatCurrency(summary.total_a)}</span>
          </div>
          <div className="summary-row bg-light bg-opacity-50">
            <span className="text-secondary">B. ADDITIONAL PROVISION FOR PRICE CHANGES (10% of TOTAL)</span>
            <span className="fw-semibold text-secondary">{formatCurrency(summary.provision_b)}</span>
          </div>
          <div className="summary-row align-items-center">
            <span className="text-secondary">C. ADDITIONAL PROVISION FOR TRANSPORT AND FREIGHT COST (If Applicable)</span>
            <div className="d-flex align-items-center gap-1">
              <span className="fw-semibold">₱</span>
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={readOnly}
                className="form-control form-control-sm text-end font-weight-bold"
                style={{ width: '140px' }}
                value={summary.freight_c || ''}
                onChange={handleFreightChange}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="summary-row total-row bg-warning bg-opacity-25 py-3">
            <span className="fs-6 text-dark fw-bold">D. GRAND TOTAL (A + B + C)</span>
            <span className="fs-6 text-dark fw-bold">{formatCurrency(summary.grand_total_d)}</span>
          </div>
          <div className="p-3 border-top bg-light">
            <label className="form-label small fw-bold text-muted">
              E. APPROVED BUDGET BY THE AGENCY HEAD (In Figures and Words)
            </label>
            <textarea
              rows="2"
              disabled={readOnly}
              className="form-control form-control-sm"
              value={summary.budget_text_e || ''}
              onChange={handleBudgetTextChange}
              placeholder="e.g. One Hundred Fifty Thousand Pesos Only (₱150,000.00)"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SummaryBlock);
