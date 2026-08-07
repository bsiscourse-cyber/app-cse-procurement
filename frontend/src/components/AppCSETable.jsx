import React, { useState } from 'react';
import { Search, SearchX, Filter, X } from 'lucide-react';

const AppCSETable = ({ items, entriesMap, setEntriesMap, part, readOnly, onlyWithValues = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Handle quantity change for a month
  const handleQtyChange = (itemId, monthKey, val) => {
    const numVal = Math.max(0, parseInt(val) || 0);
    const key = `${part}_${itemId}`;
    setEntriesMap(prev => {
      const existing = prev[key] || { item_id: itemId, item_part: part, jan:0, feb:0, mar:0, apr:0, may:0, jun:0, jul:0, aug:0, sep:0, oct:0, nov:0, decm:0, unit_price: 0 };
      return {
        ...prev,
        [key]: {
          ...existing,
          [monthKey]: numVal
        }
      };
    });
  };

  // Handle unit price change for Part II items
  const handlePriceChange = (itemId, val) => {
    const numVal = Math.max(0, parseFloat(val) || 0);
    const key = `${part}_${itemId}`;
    setEntriesMap(prev => {
      const existing = prev[key] || { item_id: itemId, item_part: part, jan:0, feb:0, mar:0, apr:0, may:0, jun:0, jul:0, aug:0, sep:0, oct:0, nov:0, decm:0, unit_price: 0 };
      return {
        ...prev,
        [key]: {
          ...existing,
          unit_price: numVal
        }
      };
    });
  };

  // Helper to compute item total quantity
  const getItemTotalQty = (itemId) => {
    const key = `${part}_${itemId}`;
    const entry = entriesMap[key] || {};
    return (entry.jan||0)+(entry.feb||0)+(entry.mar||0)+(entry.apr||0)+(entry.may||0)+(entry.jun||0)+(entry.jul||0)+(entry.aug||0)+(entry.sep||0)+(entry.oct||0)+(entry.nov||0)+(entry.decm||0);
  };

  // Unique categories list for dropdown filter
  const allCategoriesList = Array.from(new Set(items.map(item => item.category).filter(Boolean)));

  // Group items by category and filter by search query & category selection
  const categories = [];
  const itemsByCategory = {};
  const cleanQuery = searchQuery.trim().toLowerCase();

  items.forEach(item => {
    const totalQty = getItemTotalQty(item.id);
    if (onlyWithValues && totalQty <= 0) {
      return; // Skip 0-quantity items ONLY when onlyWithValues is true (Admin Approval view)
    }

    // Category Filter
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
      return;
    }

    // Search Query Filter (Item Description, Product Code, Category/Type, Item No)
    if (cleanQuery) {
      const matchSpec = item.specification?.toLowerCase().includes(cleanQuery);
      const matchCode = item.product_code?.toLowerCase().includes(cleanQuery);
      const matchCat = item.category?.toLowerCase().includes(cleanQuery);
      const matchNo = String(item.item_no || '').toLowerCase().includes(cleanQuery);

      if (!matchSpec && !matchCode && !matchCat && !matchNo) {
        return;
      }
    }

    if (!itemsByCategory[item.category]) {
      itemsByCategory[item.category] = [];
      categories.push(item.category);
    }
    itemsByCategory[item.category].push(item);
  });

  // Count matching items
  const matchingCount = Object.values(itemsByCategory).reduce((acc, list) => acc + list.length, 0);

  // Number formatter
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amount || 0);
  };

  return (
    <div className="border rounded-4 overflow-hidden bg-white shadow-sm mb-4">
      {/* Product Search & Category Filter Header Bar */}
      <div className="px-3 py-3 border-bottom d-flex flex-column flex-lg-row align-items-lg-center justify-content-between" style={{ background: '#f8fafc', gap: '20px' }}>
        {/* Left Side: Search Bar & Category Filter with Generous 28px Gap */}
        <div className="d-flex align-items-center flex-wrap flex-lg-nowrap flex-grow-1" style={{ gap: '28px' }}>
          {/* Search Box */}
          <div className="position-relative flex-shrink-0" style={{ width: '270px' }}>
            <div className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted pointer-events-none">
              <Search size={18} className="text-primary" />
            </div>
            <input
              type="text"
              className="form-control ps-5 pe-5 rounded-pill shadow-sm border-1 bg-white"
              placeholder="Search product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                fontSize: '0.825rem',
                borderColor: '#cbd5e1',
                height: '40px'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3 text-muted text-decoration-none border-0 bg-transparent shadow-none"
                style={{ cursor: 'pointer', zIndex: 5 }}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category Dropdown (With compact font-size and spacious width) */}
          <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: '560px' }}>
            <span className="small text-muted fw-semibold flex-shrink-0 d-none d-sm-inline" style={{ fontSize: '0.8rem' }}>
              <Filter size={14} className="me-1 text-secondary" />
              Category:
            </span>
            <select
              className="form-select rounded-pill shadow-sm border-1 bg-white fw-medium"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                fontSize: '0.785rem',
                height: '40px',
                borderColor: '#cbd5e1',
                width: '100%',
                maxWidth: '520px',
                cursor: 'pointer'
              }}
            >
              <option value="ALL" style={{ fontSize: '0.8rem' }}>All Categories / Item Types ({items.length})</option>
              {allCategoriesList.map((cat, idx) => (
                <option key={idx} value={cat} style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Side: Items Count Badge */}
        <span
          className="badge rounded-pill px-3.5 fw-bold shadow-sm flex-shrink-0 d-flex align-items-center justify-content-center align-self-start align-self-lg-auto"
          style={{
            fontSize: '0.82rem',
            height: '40px',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            color: '#0369a1',
            border: '1px solid #7dd3fc',
            letterSpacing: '0.01em'
          }}
        >
          <span className="fw-extrabold me-1" style={{ fontSize: '0.9rem', color: '#0284c7' }}>{matchingCount}</span>
          <span>{matchingCount === 1 ? 'item' : 'items'} found</span>
        </span>
      </div>

      <div className="table-responsive-excel bg-white">
        <table className="excel-table">
          <thead>
            {/* Header Row 1 */}
            <tr>
              <th rowSpan={2} className="sticky-col-1" style={{ minWidth: '50px' }}>Item No</th>
              <th rowSpan={2} className="sticky-col-2" style={{ minWidth: '130px' }}>Item Code</th>
              <th rowSpan={2} className="sticky-col-3" style={{ minWidth: '280px' }}>Item Description / Specifications</th>
              <th rowSpan={2} style={{ minWidth: '90px' }}>Unit</th>
              <th colSpan={21}>Monthly Quantity Requirement & Quarterly Computations</th>
              <th rowSpan={2} style={{ minWidth: '110px' }}>Unit Price</th>
              <th rowSpan={2} style={{ minWidth: '120px' }}>Total Amount for Year</th>
            </tr>
            {/* Header Row 2 */}
            <tr>
              {/* Q1 */}
              <th className="sub-header" style={{ minWidth: '55px' }}>Jan</th>
              <th className="sub-header" style={{ minWidth: '55px' }}>Feb</th>
              <th className="sub-header" style={{ minWidth: '55px' }}>Mar</th>
              <th className="sub-header bg-warning text-dark" style={{ minWidth: '65px' }}>Q1 Qty</th>
              <th className="sub-header bg-warning text-dark" style={{ minWidth: '90px' }}>Q1 Amount</th>
              {/* Q2 */}
              <th className="sub-header" style={{ minWidth: '55px' }}>April</th>
              <th className="sub-header" style={{ minWidth: '55px' }}>May</th>
              <th className="sub-header" style={{ minWidth: '55px' }}>June</th>
              <th className="sub-header bg-warning text-dark" style={{ minWidth: '65px' }}>Q2 Qty</th>
              <th className="sub-header bg-warning text-dark" style={{ minWidth: '90px' }}>Q2 Amount</th>
              {/* Q3 */}
              <th className="sub-header" style={{ minWidth: '55px' }}>July</th>
              <th className="sub-header" style={{ minWidth: '55px' }}>Aug</th>
              <th className="sub-header" style={{ minWidth: '55px' }}>Sept</th>
              <th className="sub-header bg-warning text-dark" style={{ minWidth: '65px' }}>Q3 Qty</th>
              <th className="sub-header bg-warning text-dark" style={{ minWidth: '90px' }}>Q3 Amount</th>
              {/* Q4 */}
              <th className="sub-header" style={{ minWidth: '55px' }}>Oct</th>
              <th className="sub-header" style={{ minWidth: '55px' }}>Nov</th>
              <th className="sub-header" style={{ minWidth: '55px' }}>Dec</th>
              <th className="sub-header bg-warning text-dark" style={{ minWidth: '65px' }}>Q4 Qty</th>
              <th className="sub-header bg-warning text-dark" style={{ minWidth: '90px' }}>Q4 Amount</th>
              {/* Total Qty */}
              <th className="sub-header bg-warning text-dark" style={{ minWidth: '75px' }}>Total Qty</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={27} className="text-center py-5">
                  <div className="d-flex flex-column align-items-center justify-content-center py-4 text-secondary">
                    <SearchX size={44} className="text-muted opacity-50 mb-2" />
                    <h6 className="fw-bold text-dark mb-1">
                      {cleanQuery || selectedCategory !== 'ALL' ? 'No products found' : 'No items requested with quantity > 0'}
                    </h6>
                    <p className="small text-muted mb-3" style={{ maxWidth: '440px' }}>
                      {cleanQuery
                        ? `No items found matching "${searchQuery}". Please check your search term or try searching for another item or type.`
                        : selectedCategory !== 'ALL'
                        ? 'No items found matching the selected category filter.'
                        : 'No items with non-zero quantities in this view.'}
                    </p>
                    {(cleanQuery || selectedCategory !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
                        className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold"
                      >
                        Clear Search & Category Filter
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
            categories.map((cat, catIdx) => (
              <React.Fragment key={`cat_${catIdx}`}>
                {/* Category Header Row */}
                <tr className="category-row">
                  <td colSpan={27} className="sticky-col-1">
                    {cat}
                  </td>
                </tr>

                {/* Items under Category */}
                {itemsByCategory[cat].map((item) => {
                  const key = `${part}_${item.id}`;
                  const entry = entriesMap[key] || {};
                  
                  const jan = entry.jan || 0;
                  const feb = entry.feb || 0;
                  const mar = entry.mar || 0;
                  const apr = entry.apr || 0;
                  const may = entry.may || 0;
                  const jun = entry.jun || 0;
                  const jul = entry.jul || 0;
                  const aug = entry.aug || 0;
                  const sep = entry.sep || 0;
                  const oct = entry.oct || 0;
                  const nov = entry.nov || 0;
                  const decm = entry.decm || 0;

                  // Price logic
                  const price = part === 1 ? parseFloat(item.unit_price || 0) : parseFloat(entry.unit_price || 0);

                  // Auto-calculations
                  const q1Qty = jan + feb + mar;
                  const q1Amount = q1Qty * price;

                  const q2Qty = apr + may + jun;
                  const q2Amount = q2Qty * price;

                  const q3Qty = jul + aug + sep;
                  const q3Amount = q3Qty * price;

                  const q4Qty = oct + nov + decm;
                  const q4Amount = q4Qty * price;

                  const totalQty = q1Qty + q2Qty + q3Qty + q4Qty;
                  const totalAmount = totalQty * price;

                  return (
                    <tr key={`item_${item.id}`}>
                      <td className="text-center sticky-col-1 fw-medium">{item.item_no}</td>
                      <td className="sticky-col-2 mono-font text-muted small">{item.product_code}</td>
                      <td className="sticky-col-3 text-dark">{item.specification}</td>
                      <td className="text-center text-secondary small">{item.unit}</td>

                      {/* Jan, Feb, Mar */}
                      <td className="text-center"><input type="number" min="0" title={`Month: January — Qty: ${jan}`} disabled={readOnly} className="qty-input" value={jan || ''} onChange={(e) => handleQtyChange(item.id, 'jan', e.target.value)} /></td>
                      <td className="text-center"><input type="number" min="0" title={`Month: February — Qty: ${feb}`} disabled={readOnly} className="qty-input" value={feb || ''} onChange={(e) => handleQtyChange(item.id, 'feb', e.target.value)} /></td>
                      <td className="text-center"><input type="number" min="0" title={`Month: March — Qty: ${mar}`} disabled={readOnly} className="qty-input" value={mar || ''} onChange={(e) => handleQtyChange(item.id, 'mar', e.target.value)} /></td>
                      {/* Q1 Auto */}
                      <td className="auto-calc text-center">{q1Qty}</td>
                      <td className="auto-calc">{formatCurrency(q1Amount)}</td>

                      {/* Apr, May, Jun */}
                      <td className="text-center"><input type="number" min="0" title={`Month: April — Qty: ${apr}`} disabled={readOnly} className="qty-input" value={apr || ''} onChange={(e) => handleQtyChange(item.id, 'apr', e.target.value)} /></td>
                      <td className="text-center"><input type="number" min="0" title={`Month: May — Qty: ${may}`} disabled={readOnly} className="qty-input" value={may || ''} onChange={(e) => handleQtyChange(item.id, 'may', e.target.value)} /></td>
                      <td className="text-center"><input type="number" min="0" title={`Month: June — Qty: ${jun}`} disabled={readOnly} className="qty-input" value={jun || ''} onChange={(e) => handleQtyChange(item.id, 'jun', e.target.value)} /></td>
                      {/* Q2 Auto */}
                      <td className="auto-calc text-center">{q2Qty}</td>
                      <td className="auto-calc">{formatCurrency(q2Amount)}</td>

                      {/* Jul, Aug, Sep */}
                      <td className="text-center"><input type="number" min="0" title={`Month: July — Qty: ${jul}`} disabled={readOnly} className="qty-input" value={jul || ''} onChange={(e) => handleQtyChange(item.id, 'jul', e.target.value)} /></td>
                      <td className="text-center"><input type="number" min="0" title={`Month: August — Qty: ${aug}`} disabled={readOnly} className="qty-input" value={aug || ''} onChange={(e) => handleQtyChange(item.id, 'aug', e.target.value)} /></td>
                      <td className="text-center"><input type="number" min="0" title={`Month: September — Qty: ${sep}`} disabled={readOnly} className="qty-input" value={sep || ''} onChange={(e) => handleQtyChange(item.id, 'sep', e.target.value)} /></td>
                      {/* Q3 Auto */}
                      <td className="auto-calc text-center">{q3Qty}</td>
                      <td className="auto-calc">{formatCurrency(q3Amount)}</td>

                      {/* Oct, Nov, Dec */}
                      <td className="text-center"><input type="number" min="0" title={`Month: October — Qty: ${oct}`} disabled={readOnly} className="qty-input" value={oct || ''} onChange={(e) => handleQtyChange(item.id, 'oct', e.target.value)} /></td>
                      <td className="text-center"><input type="number" min="0" title={`Month: November — Qty: ${nov}`} disabled={readOnly} className="qty-input" value={nov || ''} onChange={(e) => handleQtyChange(item.id, 'nov', e.target.value)} /></td>
                      <td className="text-center"><input type="number" min="0" title={`Month: December — Qty: ${decm}`} disabled={readOnly} className="qty-input" value={decm || ''} onChange={(e) => handleQtyChange(item.id, 'decm', e.target.value)} /></td>
                      {/* Q4 Auto */}
                      <td className="auto-calc text-center">{q4Qty}</td>
                      <td className="auto-calc">{formatCurrency(q4Amount)}</td>

                      {/* Total Qty */}
                      <td className="auto-calc text-center fw-bold">{totalQty}</td>

                      {/* Unit Price */}
                      <td className="text-end fw-medium">
                        {part === 1 ? (
                          <span>₱{price.toFixed(2)}</span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={readOnly}
                            className="price-input"
                            value={entry.unit_price || ''}
                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                            placeholder="0.00"
                          />
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="auto-calc fw-bold text-dark">{formatCurrency(totalAmount)}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
    </div>
  );
};

export default React.memo(AppCSETable);
