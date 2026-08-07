import React from 'react';
import { ShieldCheck } from 'lucide-react';

const SignatureBlock = ({ signatories, setSignatories, readOnly }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSignatories(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="card shadow-sm border-0 my-4">
      <div className="card-body p-4 bg-light">
        {/* Legal Warranty Box */}
        <div className="alert alert-secondary border border-secondary border-opacity-25 d-flex gap-3 align-items-start mb-4">
          <ShieldCheck size={28} className="text-primary flex-shrink-0 mt-1" />
          <div>
            <h6 className="alert-heading fw-bold mb-1">LEGAL BUDGET WARRANTY STATEMENT</h6>
            <p className="mb-0 small text-dark">
              "We hereby warrant that the total amount reflected in this Annual Procurement Plan to procure the listed common-use supplies, materials, and equipment has been included in or is within our approved budget for the year."
            </p>
          </div>
        </div>

        {/* 3 Signatories Grid */}
        <div className="row g-4 mt-2">
          <div className="col-md-4">
            <div className="border rounded p-3 bg-white">
              <label className="form-label small fw-bold text-muted mb-1">Prepared by:</label>
              <input
                type="text"
                name="prepared_by_name"
                disabled={readOnly}
                className="form-control form-control-sm mb-2"
                value={signatories.prepared_by_name || ''}
                onChange={handleChange}
                placeholder="Property / Supply Officer"
              />
              <span className="badge bg-secondary opacity-75">Property / Supply Officer</span>

              <div className="mt-3">
                <label className="form-label small fw-bold text-muted mb-1">Date Prepared:</label>
                <input
                  type="date"
                  name="date_prepared"
                  disabled={readOnly}
                  className="form-control form-control-sm"
                  value={signatories.date_prepared ? signatories.date_prepared.substring(0,10) : ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="border rounded p-3 bg-white">
              <label className="form-label small fw-bold text-muted mb-1">Certified Funds Available:</label>
              <input
                type="text"
                name="certified_by_name"
                disabled={readOnly}
                className="form-control form-control-sm mb-2"
                value={signatories.certified_by_name || ''}
                onChange={handleChange}
                placeholder="Accountant / Budget Officer"
              />
              <span className="badge bg-secondary opacity-75">Accountant / Budget Officer</span>
            </div>
          </div>

          <div className="col-md-4">
            <div className="border rounded p-3 bg-white">
              <label className="form-label small fw-bold text-muted mb-1">Approved by:</label>
              <input
                type="text"
                name="approved_by_name"
                disabled={readOnly}
                className="form-control form-control-sm mb-2"
                value={signatories.approved_by_name || ''}
                onChange={handleChange}
                placeholder="Head of Office / Agency"
              />
              <span className="badge bg-secondary opacity-75">Head of Office / Agency</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SignatureBlock);
