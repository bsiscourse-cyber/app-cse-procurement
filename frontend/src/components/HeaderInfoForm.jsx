import React from 'react';

const HeaderInfoForm = ({ headerInfo, setHeaderInfo, readOnly }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setHeaderInfo(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-header bg-white py-3 border-bottom">
        <h6 className="mb-0 font-weight-bold text-dark d-flex align-items-center gap-2">
          <span className="badge bg-primary rounded-circle p-2">1</span>
          AGENCY GENERAL INFORMATION (Matches Excel Header Rows 23–26)
        </h6>
      </div>
      <div className="card-body p-4 bg-light bg-opacity-25">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label small fw-bold text-muted">Department / Bureau / Office</label>
            <input
              type="text"
              name="department_bureau"
              className="form-control form-control-sm"
              value={headerInfo.department_bureau || ''}
              onChange={handleChange}
              disabled={readOnly}
              placeholder="e.g. Budget Office"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-bold text-muted">Agency Code / UACS</label>
            <input
              type="text"
              name="agency_code_uacs"
              className="form-control form-control-sm"
              value={headerInfo.agency_code_uacs || ''}
              onChange={handleChange}
              disabled={readOnly}
              placeholder="e.g. A100-2027"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-bold text-muted">Contact Person</label>
            <input
              type="text"
              name="contact_person"
              className="form-control form-control-sm"
              value={headerInfo.contact_person || ''}
              onChange={handleChange}
              disabled={readOnly}
              placeholder="e.g. Juan Dela Cruz"
            />
          </div>

          <div className="col-md-4">
            <label className="form-label small fw-bold text-muted">Region</label>
            <input
              type="text"
              name="region"
              className="form-control form-control-sm"
              value={headerInfo.region || ''}
              onChange={handleChange}
              disabled={readOnly}
              placeholder="e.g. NCR / Region IV-A"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-bold text-muted">Organization Type</label>
            <input
              type="text"
              name="org_type"
              className="form-control form-control-sm"
              value={headerInfo.org_type || ''}
              onChange={handleChange}
              disabled={readOnly}
              placeholder="e.g. NGA / SUC / LGU"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-bold text-muted">Position</label>
            <input
              type="text"
              name="position"
              className="form-control form-control-sm"
              value={headerInfo.position || ''}
              onChange={handleChange}
              disabled={readOnly}
              placeholder="e.g. Chief Budget Officer"
            />
          </div>

          <div className="col-md-4">
            <label className="form-label small fw-bold text-muted">Address</label>
            <input
              type="text"
              name="address"
              className="form-control form-control-sm"
              value={headerInfo.address || ''}
              onChange={handleChange}
              disabled={readOnly}
              placeholder="e.g. Main Campus, Building 1"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-bold text-muted">E-mail Address</label>
            <input
              type="email"
              name="email"
              className="form-control form-control-sm"
              value={headerInfo.email || ''}
              onChange={handleChange}
              disabled={readOnly}
              placeholder="e.g. budget@agency.gov.ph"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-bold text-muted">Telephone / Mobile Nos.</label>
            <input
              type="text"
              name="telephone_mobile"
              className="form-control form-control-sm"
              value={headerInfo.telephone_mobile || ''}
              onChange={handleChange}
              disabled={readOnly}
              placeholder="e.g. 02-8123-4568 / 0917-000-0000"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(HeaderInfoForm);
