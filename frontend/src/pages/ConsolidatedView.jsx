import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import NavBar from '../components/NavBar';
import {
  ArrowLeft, BarChart3, Copy, CheckCircle2, X,
  AlertCircle, Search, Filter, TrendingUp, Building2
} from 'lucide-react';

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','decm'];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmt = (amt) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amt || 0);

const statusColor = (s) => s === 'approved' ? '#059669' : s === 'submitted' ? '#0284c7' : '#d97706';
const statusBg   = (s) => s === 'approved' ? 'rgba(16,185,129,0.12)' : s === 'submitted' ? 'rgba(14,165,233,0.12)' : 'rgba(245,158,11,0.12)';
const statusBdr  = (s) => s === 'approved' ? 'rgba(16,185,129,0.3)'  : s === 'submitted' ? 'rgba(56,189,248,0.3)'   : 'rgba(245,158,11,0.3)';

const ConsolidatedView = () => {
  const [searchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const initYear = parseInt(searchParams.get('year'), 10) || currentYear;

  const [fiscalYears, setFiscalYears]   = useState([initYear]);
  const [selectedYear, setSelectedYear] = useState(initYear);
  const [data, setData]                 = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [activeTab, setActiveTab]       = useState('part1');
  const [searchQuery, setSearchQuery]   = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedOfficeId, setSelectedOfficeId] = useState('ALL');

  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyToYear, setCopyToYear]       = useState('');
  const [copyLoading, setCopyLoading]     = useState(false);
  const [copyResult, setCopyResult]       = useState(null);

  useEffect(() => { fetchFiscalYears(); }, []);
  useEffect(() => { fetchConsolidated(); }, [selectedYear]);

  const fetchFiscalYears = async () => {
    try {
      const res = await client.get('/admin/fiscal-years');
      setFiscalYears(Array.from(new Set([currentYear, ...res.data])).sort((a, b) => b - a));
    } catch (e) { console.error(e); }
  };

  const fetchConsolidated = async () => {
    try {
      setLoading(true); setError('');
      const res = await client.get(`/admin/consolidated/${selectedYear}`);
      setData(res.data);
      setSelectedOfficeId('ALL');
      setSearchQuery('');
      setSelectedCategory('ALL');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load consolidated data.');
    } finally { setLoading(false); }
  };

  const handleCopyYear = async () => {
    const to = parseInt(copyToYear, 10);
    if (!to || to < 2020 || to > 2100) { alert('Enter a valid year.'); return; }
    if (to === selectedYear) { alert('Target year must differ from source year.'); return; }
    if (!window.confirm(`Copy all FY ${selectedYear} submissions to FY ${to} as drafts?`)) return;
    try {
      setCopyLoading(true); setCopyResult(null);
      const res = await client.post('/admin/copy-year', { from_year: selectedYear, to_year: to });
      setCopyResult({ success: true, message: res.data.message });
      fetchFiscalYears();
    } catch (e) {
      setCopyResult({ success: false, message: e.response?.data?.message || 'Copy failed.' });
    } finally { setCopyLoading(false); }
  };

  // ── Resolve qty/amount for an item given selected office ──
  const resolve = (item) => {
    if (selectedOfficeId === 'ALL') {
      return { qty: item.totalQty, amount: item.totalAmount, months: item.agg || {} };
    }
    const e = item.perOffice?.[selectedOfficeId];
    if (!e) return { qty: 0, amount: 0, months: {} };
    const qty = MONTHS.reduce((s, m) => s + (e[m] || 0), 0);
    return { qty, amount: qty * item.unitPrice, months: e };
  };

  // ── Filter + group ────────────────────────────────────────
  const buildView = (master) => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = master.filter(item => {
      const { qty } = resolve(item);
      if (qty <= 0) return false;
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (q) return (
        item.specification?.toLowerCase().includes(q) ||
        item.product_code?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        String(item.item_no || '').includes(q)
      );
      return true;
    });
    const cats = [], grouped = {};
    filtered.forEach(item => {
      if (!grouped[item.category]) { grouped[item.category] = []; cats.push(item.category); }
      grouped[item.category].push(item);
    });
    const grandTotal = filtered.reduce((s, i) => s + resolve(i).amount, 0);
    const grandQty   = filtered.reduce((s, i) => s + resolve(i).qty, 0);
    return { cats, grouped, total: filtered.length, grandTotal, grandQty };
  };

  if (loading) return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center" style={{ background: '#f1f5f9' }}>
      <div className="text-center">
        <div className="spinner-border text-success" style={{ width: '3rem', height: '3rem' }}></div>
        <p className="mt-3 text-muted fw-medium">Loading FY {selectedYear}…</p>
      </div>
    </div>
  );

  const masterItems   = activeTab === 'part1' ? (data?.part1 || []) : (data?.part2 || []);
  const allCategories = Array.from(new Set(masterItems.map(i => i.category).filter(Boolean)));
  const { cats, grouped, total, grandTotal, grandQty } = buildView(masterItems);

  const p1 = (data?.part1 || []);
  const p2 = (data?.part2 || []);
  const p1Grand = p1.reduce((s, i) => s + resolve(i).amount, 0);
  const p2Grand = p2.reduce((s, i) => s + resolve(i).amount, 0);
  const overall = p1Grand + p2Grand;

  const selOffice = selectedOfficeId !== 'ALL' ? data?.offices?.find(o => String(o.office_id) === selectedOfficeId) : null;
  const showMonths = selectedOfficeId !== 'ALL';

  return (
    <div className="min-vh-100 pb-5" style={{ background: '#f1f5f9' }}>
      <NavBar />
      <div className="container-fluid px-4 py-4">

        {/* Back */}
        <div className="mb-3">
          <Link to="/admin" className="btn btn-link text-decoration-none text-secondary d-flex align-items-center gap-1 p-0">
            <ArrowLeft size={18} /> Back to Admin Dashboard
          </Link>
        </div>

        {/* Header banner */}
        <div className="card shadow-sm border-0 mb-4" style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)' }}>
          <div className="card-body p-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <BarChart3 size={26} style={{ color: '#34d399' }} />
                <h4 className="fw-bold mb-0 text-white">Consolidated APP-CSE View</h4>
              </div>
              <p className="small text-light opacity-75 mb-0">
                {selOffice
                  ? `${selOffice.office_name} — FY ${selectedYear}`
                  : `All ${data?.offices?.length || 0} offices aggregated — FY ${selectedYear}`}
              </p>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <label className="small fw-semibold text-white-50 mb-0">Fiscal Year:</label>
              <select className="form-select form-select-sm rounded-pill fw-bold" style={{ minWidth: '100px', fontSize: '0.85rem' }}
                value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}>
                {fiscalYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
              </select>
              <button type="button" onClick={() => { setShowCopyModal(true); setCopyResult(null); setCopyToYear(''); }}
                className="btn btn-warning rounded-pill d-flex align-items-center gap-2 px-3 fw-bold text-dark shadow-sm">
                <Copy size={16} /> Copy to New Year
              </button>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger d-flex align-items-center gap-2 mb-4"><AlertCircle size={18} /> {error}</div>}

        {/* ── OFFICE SELECTOR ── */}
        {data && (
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body py-3 px-4">
              <div className="d-flex flex-column flex-md-row align-items-md-center gap-3">
                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  <Building2 size={20} className="text-primary" />
                  <span className="fw-bold text-dark small text-nowrap">Office / Department:</span>
                </div>
                <select
                  className="form-select fw-semibold"
                  style={{
                    maxWidth: '480px',
                    fontSize: '0.9rem',
                    borderRadius: '10px',
                    borderColor: selectedOfficeId !== 'ALL' ? '#3b82f6' : '#cbd5e1',
                    borderWidth: '2px',
                    background: selectedOfficeId !== 'ALL' ? '#eff6ff' : '#fff',
                    color: selectedOfficeId !== 'ALL' ? '#1d4ed8' : '#1e293b',
                  }}
                  value={selectedOfficeId}
                  onChange={(e) => { setSelectedOfficeId(e.target.value); setSearchQuery(''); setSelectedCategory('ALL'); }}>
                  <option value="ALL">📊 All Offices ({data.offices.length})</option>
                  {data.offices.map(o => (
                    <option key={o.office_id} value={String(o.office_id)}>
                      {o.office_name}  [{o.status?.toUpperCase()}]
                    </option>
                  ))}
                </select>
                {selOffice && (
                  <span className="badge rounded-pill fw-semibold py-2 px-3 flex-shrink-0"
                    style={{ fontSize: '0.8rem', background: statusBg(selOffice.status), color: statusColor(selOffice.status), border: `1px solid ${statusBdr(selOffice.status)}` }}>
                    {selOffice.status?.toUpperCase()}
                  </span>
                )}
                <div className="ms-auto text-end flex-shrink-0">
                  <div className="small fw-semibold text-muted text-uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.07em' }}>
                    {selectedOfficeId === 'ALL' ? 'Combined Grand Total' : 'Office Grand Total'}
                  </div>
                  <div className="fw-extrabold" style={{ fontSize: '1.3rem', color: selectedOfficeId === 'ALL' ? '#059669' : '#1d4ed8' }}>
                    {fmt(overall)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary cards */}
        {data && (
          <div className="row g-3 mb-4">
            {[
              { label: `Part I Total${selectedOfficeId !== 'ALL' ? ' — '+selOffice?.office_name : ' (All Offices)'}`, val: p1Grand, color: '#4f46e5', border: '#818cf8', bg: '#eef2ff' },
              { label: `Part II Total${selectedOfficeId !== 'ALL' ? ' — '+selOffice?.office_name : ' (All Offices)'}`, val: p2Grand, color: '#0891b2', border: '#22d3ee', bg: '#ecfeff' },
              { label: 'Overall Combined Grand Total', val: overall, color: '#059669', border: '#34d399', bg: '#f0fdf4' },
            ].map((s, i) => (
              <div key={i} className="col-12 col-md-4">
                <div className="card border-0 shadow-sm h-100" style={{ borderLeft: `5px solid ${s.border}`, background: s.bg }}>
                  <div className="card-body py-3 px-4">
                    <div className="fw-semibold text-uppercase mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.08em', color: s.color }}>{s.label}</div>
                    <div className="fw-extrabold" style={{ fontSize: '1.35rem', color: s.color }}>{fmt(s.val)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main table card */}
        <div className="card border-0 shadow-sm">

          {/* Tabs */}
          <div className="card-header bg-white border-bottom p-0">
            <ul className="nav nav-pills nav-fill px-3 pt-2">
              {['part1','part2'].map(tab => {
                const items = tab === 'part1' ? p1 : p2;
                const withQty = items.filter(i => resolve(i).qty > 0).length;
                return (
                  <li key={tab} className="nav-item">
                    <button
                      className={`nav-link py-2 fw-semibold ${activeTab === tab ? 'active bg-primary text-white' : 'text-dark'}`}
                      onClick={() => { setActiveTab(tab); setSearchQuery(''); setSelectedCategory('ALL'); }}
                      style={{ borderRadius: '8px 8px 0 0', fontSize: '0.88rem' }}>
                      {tab === 'part1' ? 'PART I — PS-DBM Items' : 'PART II — Other Items'}
                      <span className="ms-2 badge bg-white text-primary" style={{ fontSize: '0.72rem' }}>
                        {withQty} item{withQty !== 1 ? 's' : ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>



          {/* Table */}
          <div className="card-body p-0">
            {cats.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <TrendingUp size={40} className="mb-3 opacity-25" />
                <h6 className="fw-bold">No items with quantities found</h6>
                <p className="small">
                  {selOffice
                    ? `${selOffice.office_name} has no ${activeTab === 'part1' ? 'Part I' : 'Part II'} items with quantities.`
                    : 'No offices have ordered items here yet.'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.84rem' }}>
                  <thead className="table-dark">
                    <tr>
                      <th className="py-3 px-3" style={{ minWidth: '55px' }}>No</th>
                      <th className="py-3 px-3" style={{ minWidth: '100px' }}>Code</th>
                      <th className="py-3 px-3" style={{ minWidth: '240px' }}>Description / Specification</th>
                      <th className="py-3 px-3 text-center" style={{ minWidth: '65px' }}>Unit</th>
                      <th className="py-3 px-3 text-end" style={{ minWidth: '90px' }}>Unit Price</th>
                      {showMonths && MONTHS.map((m, idx) => (
                        <th key={m} className="py-3 px-1 text-center" style={{ minWidth: '40px', fontSize: '0.7rem', opacity: 0.85 }}>
                          {MONTH_LABELS[idx]}
                        </th>
                      ))}
                      <th className="py-3 px-3 text-center" style={{ minWidth: '80px' }}>
                        Total Qty
                        {!showMonths && <><br /><span style={{ fontSize: '0.65rem', opacity: 0.7 }}>All Offices</span></>}
                      </th>
                      <th className="py-3 px-3 text-end" style={{ minWidth: '120px' }}>Total Amount</th>
                      {!showMonths && <th className="py-3 px-3 text-center" style={{ minWidth: '75px' }}>Offices</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {cats.map(cat => (
                      <React.Fragment key={cat}>
                        <tr>
                          <td colSpan={showMonths ? (5 + 12 + 2) : 8}
                            style={{
                              background: 'linear-gradient(90deg,#1e293b,#334155)',
                              color: '#ffffff',
                              fontWeight: '700',
                              fontSize: '0.79rem',
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              padding: '10px 16px',
                              borderBottom: '2px solid #334155',
                            }}>
                            📁 {cat}
                          </td>
                        </tr>
                        {grouped[cat].map(item => {
                          const { qty, amount, months } = resolve(item);
                          const officeCount = selectedOfficeId === 'ALL'
                            ? Object.values(item.perOffice || {}).filter(e => MONTHS.reduce((s, m) => s + (e[m] || 0), 0) > 0).length
                            : null;
                          return (
                            <tr key={item.id}>
                              <td className="px-3 text-center text-muted fw-medium">{item.item_no}</td>
                              <td className="px-3 small" style={{ fontFamily: 'monospace', color: '#64748b' }}>{item.product_code}</td>
                              <td className="px-3 fw-semibold text-dark">{item.specification}</td>
                              <td className="px-3 text-center text-secondary small">{item.unit}</td>
                              <td className="px-3 text-end fw-medium" style={{ fontFamily: 'monospace' }}>{fmt(item.unitPrice)}</td>
                              {showMonths && MONTHS.map(m => (
                                <td key={m} className="px-1 text-center" style={{ fontSize: '0.78rem', color: (months[m] || 0) > 0 ? '#1d4ed8' : '#cbd5e1' }}>
                                  {(months[m] || 0) > 0 ? <strong>{months[m]}</strong> : <span style={{ opacity: 0.3 }}>—</span>}
                                </td>
                              ))}
                              <td className="px-3 text-center fw-bold text-primary" style={{ fontFamily: 'monospace' }}>{qty}</td>
                              <td className="px-3 text-end fw-bold" style={{ color: '#059669', fontFamily: 'monospace' }}>{fmt(amount)}</td>
                              {!showMonths && (
                                <td className="px-3 text-center">
                                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill" style={{ fontSize: '0.75rem' }}>
                                    {officeCount}
                                  </span>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>

                </table>
              </div>
            )}
          </div>
        </div>

        {/* Overall footer */}
        <div className="card border-0 shadow-sm mt-4" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}>
          <div className="card-body p-4 d-flex justify-content-between align-items-center">
            <div>
              <h5 className="fw-bold mb-1 text-warning">OVERALL COMBINED GRAND TOTAL (Part I + Part II)</h5>
              <p className="mb-0 small text-light opacity-75">
                {selOffice ? `${selOffice.office_name} — FY ${selectedYear}` : `All ${data?.offices?.length} offices — FY ${selectedYear}`}
              </p>
            </div>
            <h2 className="fw-extrabold mb-0 text-warning">{fmt(overall)}</h2>
          </div>
        </div>
      </div>

      {/* Copy Modal */}
      {showCopyModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '460px' }}>
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 pb-0 px-4 pt-4" style={{ background: 'linear-gradient(135deg,#1e293b,#334155)' }}>
                <div>
                  <h5 className="fw-bold text-white mb-1 d-flex align-items-center gap-2">
                    <Copy size={20} style={{ color: '#fbbf24' }} /> Copy FY {selectedYear} → New Fiscal Year
                  </h5>
                  <p className="text-white-50 small mb-0">All office submissions will be copied as drafts to the target year.</p>
                </div>
                <button type="button" className="btn btn-link text-white ms-auto p-0 border-0" onClick={() => { setShowCopyModal(false); setCopyResult(null); }}>
                  <X size={22} />
                </button>
              </div>
              <div className="modal-body px-4 pt-4 pb-3" style={{ background: '#f8fafc' }}>
                {copyResult ? (
                  <div className={`alert d-flex align-items-start gap-2 rounded-3 ${copyResult.success ? 'alert-success' : 'alert-danger'}`}>
                    {copyResult.success ? <CheckCircle2 size={18} className="mt-1 flex-shrink-0" /> : <AlertCircle size={18} className="mt-1 flex-shrink-0" />}
                    <div>
                      <div className="fw-semibold">{copyResult.success ? 'Copy Successful!' : 'Copy Failed'}</div>
                      <div className="small">{copyResult.message}</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="form-label fw-semibold small text-dark mb-2">Source Year (From)</label>
                      <div className="form-control bg-light text-muted fw-bold" style={{ borderRadius: '10px' }}>FY {selectedYear}</div>
                    </div>
                    <div className="mb-2">
                      <label className="form-label fw-semibold small text-dark mb-2">Target Year (To) <span className="text-danger">*</span></label>
                      <input type="number" className="form-control fw-bold" placeholder={`e.g. ${selectedYear + 1}`}
                        min="2020" max="2100" value={copyToYear} onChange={(e) => setCopyToYear(e.target.value)}
                        style={{ borderRadius: '10px', fontSize: '1.1rem' }} autoFocus />
                      <div className="form-text mt-2">⚠️ Offices that already have a FY {copyToYear || '—'} submission will be <strong>skipped</strong>.</div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer border-0 px-4 pb-4 pt-0 bg-white d-flex gap-2">
                <button type="button" className="btn btn-light rounded-pill flex-fill fw-semibold"
                  onClick={() => { setShowCopyModal(false); setCopyResult(null); }}>
                  {copyResult ? 'Close' : 'Cancel'}
                </button>
                {!copyResult && (
                  <button type="button"
                    className="btn btn-warning rounded-pill flex-fill fw-bold d-flex align-items-center justify-content-center gap-2"
                    onClick={handleCopyYear} disabled={copyLoading || !copyToYear}>
                    {copyLoading ? <><span className="spinner-border spinner-border-sm" /> Copying...</> : <><Copy size={16} /> Copy to FY {copyToYear || '?'}</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsolidatedView;
