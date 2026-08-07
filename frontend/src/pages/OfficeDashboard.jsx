import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import client from '../api/client';
import NavBar from '../components/NavBar';
import HeaderInfoForm from '../components/HeaderInfoForm';
import AppCSETable from '../components/AppCSETable';
import SummaryBlock from '../components/SummaryBlock';
import SignatureBlock from '../components/SignatureBlock';
import AdditionalRequestModal from '../components/AdditionalRequestModal';
import { Save, Send, CheckCircle2, Lock, FileEdit, Clock, PlusCircle, XCircle, AlertCircle } from 'lucide-react';

const OfficeDashboard = () => {
  const [part1Items, setPart1Items] = useState([]);
  const [part2Items, setPart2Items] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [entriesMap, setEntriesMap] = useState({});
  const [headerInfo, setHeaderInfo] = useState({});
  const [part1Summary, setPart1Summary] = useState({ total_a: 0, provision_b: 0, freight_c: 0, grand_total_d: 0, budget_text_e: '' });
  const [part2Summary, setPart2Summary] = useState({ total_a: 0, provision_b: 0, freight_c: 0, grand_total_d: 0, budget_text_e: '' });
  const [signatories, setSignatories] = useState({ prepared_by_name: '', certified_by_name: '', approved_by_name: '', date_prepared: '' });
  
  const [activeTab, setActiveTab] = useState('part1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdditionalModal, setShowAdditionalModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [p1Res, p2Res, subRes] = await Promise.all([
        client.get('/items/part1'),
        client.get('/items/part2'),
        client.get('/submission/mine')
      ]);

      setPart1Items(p1Res.data);
      setPart2Items(p2Res.data);

      const subData = subRes.data.submission;
      setSubmission(subData);
      setEntriesMap(subRes.data.entriesMap || {});

      setHeaderInfo({
        department_bureau: subData.department_bureau || '',
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
      console.error('Error loading dashboard:', err);
      setMessage({ type: 'danger', text: 'Failed to load submission data' });
    } finally {
      setLoading(false);
    }
  };

  // Debounced summary recalculation — waits 300ms after last keystroke
  const recalcTimeoutRef = useRef(null);
  useEffect(() => {
    if (part1Items.length === 0) return;

    if (recalcTimeoutRef.current) clearTimeout(recalcTimeoutRef.current);
    recalcTimeoutRef.current = setTimeout(() => {
      let p1Sum = 0;
      part1Items.forEach(item => {
        const key = `1_${item.id}`;
        const entry = entriesMap[key] || {};
        const qty = (entry.jan||0)+(entry.feb||0)+(entry.mar||0)+(entry.apr||0)+(entry.may||0)+(entry.jun||0)+(entry.jul||0)+(entry.aug||0)+(entry.sep||0)+(entry.oct||0)+(entry.nov||0)+(entry.decm||0);
        const price = parseFloat(item.unit_price || 0);
        p1Sum += qty * price;
      });

      const p1Provision = p1Sum * 0.10;

      setPart1Summary(prev => {
        const p1Grand = p1Sum + p1Provision + (prev.freight_c || 0);
        return {
          ...prev,
          total_a: p1Sum,
          provision_b: p1Provision,
          grand_total_d: p1Grand
        };
      });

      let p2Sum = 0;
      part2Items.forEach(item => {
        const key = `2_${item.id}`;
        const entry = entriesMap[key] || {};
        const qty = (entry.jan||0)+(entry.feb||0)+(entry.mar||0)+(entry.apr||0)+(entry.may||0)+(entry.jun||0)+(entry.jul||0)+(entry.aug||0)+(entry.sep||0)+(entry.oct||0)+(entry.nov||0)+(entry.decm||0);
        const price = parseFloat(entry.unit_price || 0);
        p2Sum += qty * price;
      });

      const p2Provision = p2Sum * 0.10;

      setPart2Summary(prev => {
        const p2Grand = p2Sum + p2Provision + (prev.freight_c || 0);
        return {
          ...prev,
          total_a: p2Sum,
          provision_b: p2Provision,
          grand_total_d: p2Grand
        };
      });
    }, 300);

    return () => {
      if (recalcTimeoutRef.current) clearTimeout(recalcTimeoutRef.current);
    };
  }, [entriesMap, part1Items, part2Items]);

  const handleEntryChange = useCallback((itemPart, itemId, monthOrPrice, val) => {
    setEntriesMap(prev => {
      const key = `${itemPart}_${itemId}`;
      const existing = prev[key] || { item_part: itemPart, item_id: itemId };
      const parsedVal = monthOrPrice === 'unit_price' ? parseFloat(val || 0) : parseInt(val || 0, 10);
      return {
        ...prev,
        [key]: {
          ...existing,
          [monthOrPrice]: isNaN(parsedVal) ? 0 : parsedVal
        }
      };
    });
  }, []);

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      const payload = {
        headerInfo,
        entries: Object.values(entriesMap),
        part1Summary,
        part2Summary,
        overallGrandTotal: (part1Summary.grand_total_d || 0) + (part2Summary.grand_total_d || 0),
        signatories
      };

      await client.post('/submission/save', payload);
      setMessage({ type: 'success', text: 'Draft saved successfully!' });
    } catch (err) {
      console.error('Save draft failed:', err);
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to save draft' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit your APP-CSE form? Once submitted, your form will be locked for Supply Office approval.')) {
      return;
    }

    try {
      setSaving(true);
      await handleSaveDraft();
      const res = await client.post('/submission/submit');
      setMessage({ type: 'success', text: res.data.message });
      await fetchData();
    } catch (err) {
      console.error('Submit failed:', err);
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to submit form' });
    } finally {
      setSaving(false);
    }
  };

  // Form is editable when status is 'draft' OR 'rejected' (returned for edit)
  const isReadOnly = submission?.status !== 'draft' && submission?.status !== 'rejected';

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
          <span>RETURNED / REJECTED (CAN EDIT)</span>
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
          <p className="mt-3 text-muted fw-medium">Loading APP-CSE 2027 Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light pb-5">
      <NavBar />

      <div className="container-fluid px-4 py-4">
        {submission?.status === 'rejected' && (
          <div className="alert alert-danger d-flex align-items-center gap-2 mb-4 rounded-3 shadow-sm border-danger border-opacity-25">
            <AlertCircle size={20} className="flex-shrink-0" />
            <div>
              <div className="fw-bold">Form Returned / Rejected by Admin</div>
              <div className="small">Your submission was returned for revisions. You can now modify your item quantities and click <strong>Submit Form</strong> again once ready.</div>
            </div>
          </div>
        )}

        {/* Header Action Bar */}
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body p-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <h4 className="fw-bold mb-0 text-dark">APP-CSE 2027 Request Form</h4>
              <p className="text-muted small mb-0">Annual Procurement Plan for Common-Use Supplies & Equipment</p>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted fw-bold">STATUS:</span>
                {renderHeaderStatusBadge(submission?.status)}
              </div>

              {!isReadOnly && (
                <>
                  <button onClick={handleSaveDraft} disabled={saving} className="btn btn-outline-primary rounded-pill d-flex align-items-center gap-2 px-3">
                    <Save size={18} />
                    <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                  </button>
                  <button onClick={handleSubmit} disabled={saving} className="btn btn-primary rounded-pill d-flex align-items-center gap-2 px-4 font-weight-bold">
                    <Send size={18} />
                    <span>Submit Form</span>
                  </button>
                </>
              )}

              {isReadOnly && (
                <div className="d-flex align-items-center gap-3">
                  <div className="text-muted small d-flex align-items-center gap-1 font-weight-bold me-1">
                    <Lock size={16} /> Locked (Submitted/Approved)
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdditionalModal(true)}
                    className="btn btn-warning rounded-pill d-flex align-items-center gap-2 px-3.5 py-2 fw-bold text-dark shadow-sm"
                  >
                    <PlusCircle size={18} />
                    <span>Request Additional Items</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type} alert-dismissible fade show rounded-3 shadow-sm mb-4`} role="alert">
            {message.text}
            <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
          </div>
        )}

        <HeaderInfoForm headerInfo={headerInfo} setHeaderInfo={setHeaderInfo} readOnly={isReadOnly} />

        {/* Tab Navigation Bar */}
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-white p-2 border-bottom">
            <ul className="nav nav-pills nav-fill">
              <li className="nav-item">
                <button
                  className={`nav-link py-3 font-weight-bold ${activeTab === 'part1' ? 'active bg-primary' : 'text-dark'}`}
                  onClick={() => setActiveTab('part1')}
                >
                  PART I — PS-DBM AVAILABLE ITEMS ({part1Items.length} items)
                  <div className="small fw-normal opacity-75">Pre-loaded PS-DBM catalogue prices</div>
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link py-3 font-weight-bold ${activeTab === 'part2' ? 'active bg-primary' : 'text-dark'}`}
                  onClick={() => setActiveTab('part2')}
                >
                  PART II — OTHER ITEMS ({part2Items.length} items)
                  <div className="small fw-normal opacity-75">Items purchased from other sources</div>
                </button>
              </li>
            </ul>
          </div>

          <div className="card-body p-3">
            {/* Both Part tables rendered simultaneously, inactive hidden via CSS for instant switching */}
            <div style={{ display: activeTab === 'part1' ? 'block' : 'none' }}>
              <div className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 mb-3">
                <CheckCircle2 size={18} />
                <span>Showing Part I items. Fill out monthly quantities for items your office needs.</span>
              </div>
              <AppCSETable
                items={part1Items}
                entriesMap={entriesMap}
                setEntriesMap={setEntriesMap}
                part={1}
                readOnly={isReadOnly}
                onlyWithValues={false}
              />
              <SummaryBlock
                summary={part1Summary}
                setSummary={setPart1Summary}
                title="PART I"
                readOnly={isReadOnly}
              />
            </div>

            <div style={{ display: activeTab === 'part2' ? 'block' : 'none' }}>
              <div className="alert alert-warning py-2 px-3 small d-flex align-items-center gap-2 mb-3">
                <CheckCircle2 size={18} />
                <span>Showing Part II items. For items with required quantities, please input your office's unit price in the Unit Price column.</span>
              </div>
              <AppCSETable
                items={part2Items}
                entriesMap={entriesMap}
                setEntriesMap={setEntriesMap}
                part={2}
                readOnly={isReadOnly}
                onlyWithValues={false}
              />
              <SummaryBlock
                summary={part2Summary}
                setSummary={setPart2Summary}
                title="PART II"
                readOnly={isReadOnly}
              />
            </div>
          </div>
        </div>

        {/* Combined Grand Total Summary */}
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

        <SignatureBlock
          signatories={signatories}
          setSignatories={setSignatories}
          readOnly={isReadOnly}
        />
      </div>

      {/* Floating Additional Request Modal */}
      <AdditionalRequestModal
        isOpen={showAdditionalModal}
        onClose={() => setShowAdditionalModal(false)}
        part1Items={part1Items}
        part2Items={part2Items}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
};

export default OfficeDashboard;
