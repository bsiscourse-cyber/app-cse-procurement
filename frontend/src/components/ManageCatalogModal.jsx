import React, { useState, useEffect, useMemo } from 'react';
import client from '../api/client';
import { Package, Plus, Edit2, Trash2, Search, Tag, DollarSign, X, Check, Filter, RefreshCw, AlertCircle, Layers, FolderPlus } from 'lucide-react';

const ManageCatalogModal = ({ isOpen, onClose }) => {
  const [activePart, setActivePart] = useState(1); // 1 or 2
  const [catalog, setCatalog] = useState({ part1: [], part2: [], part1Categories: [], part2Categories: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Add / Edit Item Form State
  const [editingItem, setEditingItem] = useState(null); // null = adding, object = editing
  const [showItemForm, setShowItemForm] = useState(false);
  const [formData, setFormData] = useState({
    product_code: '',
    specification: '',
    unit: 'piece',
    category: '',
    custom_category: '',
    unit_price: '0.00',
    update_draft_entries: true
  });

  // Add Category Form State
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Rename Category Form State
  const [showRenameCategory, setShowRenameCategory] = useState(false);
  const [categoryToRename, setCategoryToRename] = useState('');
  const [renameCategoryInput, setRenameCategoryInput] = useState('');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchCatalog(true);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchCatalog = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await client.get('/admin/catalog');
      setCatalog(res.data);
    } catch (err) {
      console.error('Error fetching catalog:', err);
      setMessage({ type: 'danger', text: 'Failed to load item catalog' });
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const currentItems = useMemo(() => {
    return activePart === 1 ? catalog.part1 : catalog.part2;
  }, [activePart, catalog]);

  const currentCategories = useMemo(() => {
    return activePart === 1 ? catalog.part1Categories : catalog.part2Categories;
  }, [activePart, catalog]);

  // Grouped Items by Category
  const groupedCategories = useMemo(() => {
    const map = {};

    // 1. Initialize known categories for active Part
    currentCategories.forEach((cat) => {
      if (cat && cat.trim()) map[cat.trim()] = [];
    });

    // 2. Map items to their respective category
    currentItems.forEach((item) => {
      const cat = (item.category || 'UNASSIGNED SUPPLIES').trim();
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });

    // 3. Filter by selected category if dropdown filter active
    let filteredMap = {};
    if (selectedCategory) {
      if (map[selectedCategory]) {
        filteredMap[selectedCategory] = map[selectedCategory];
      }
    } else {
      filteredMap = map;
    }

    // 4. Filter by search query if search text typed
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const searchResultMap = {};

      Object.entries(filteredMap).forEach(([cat, items]) => {
        const catMatches = cat.toLowerCase().includes(q);
        const matchingItems = items.filter((item) => {
          return (
            (item.specification && item.specification.toLowerCase().includes(q)) ||
            (item.product_code && item.product_code.toLowerCase().includes(q))
          );
        });

        if (catMatches || matchingItems.length > 0) {
          searchResultMap[cat] = catMatches ? items : matchingItems;
        }
      });

      return searchResultMap;
    }

    return filteredMap;
  }, [currentItems, currentCategories, selectedCategory, searchQuery]);

  // Open Add Item Form (Optional pre-filled category)
  const handleOpenAddForm = (presetCategory = '') => {
    setEditingItem(null);
    setFormData({
      product_code: '',
      specification: '',
      unit: 'piece',
      category: presetCategory || currentCategories[0] || 'GENERAL SUPPLIES',
      custom_category: '',
      unit_price: '0.00',
      update_draft_entries: true
    });
    setShowAddCategoryForm(false);
    setShowItemForm(true);
  };

  const handleOpenEditForm = (item) => {
    setEditingItem(item);
    setFormData({
      product_code: item.product_code || '',
      specification: item.specification || '',
      unit: item.unit || 'piece',
      category: item.category || '',
      custom_category: '',
      unit_price: item.unit_price || '0.00',
      update_draft_entries: true
    });
    setShowAddCategoryForm(false);
    setShowItemForm(true);
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    if (!formData.specification.trim()) {
      setMessage({ type: 'danger', text: 'Item description is required' });
      return;
    }

    const finalCategory = formData.category === '__CUSTOM__' ? formData.custom_category.trim() : formData.category.trim();
    if (!finalCategory) {
      setMessage({ type: 'danger', text: 'Category is required' });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      const payload = {
        part: activePart,
        product_code: formData.product_code.trim(),
        specification: formData.specification.trim(),
        unit: formData.unit.trim(),
        category: finalCategory,
        unit_price: parseFloat(formData.unit_price || 0),
        update_draft_entries: formData.update_draft_entries
      };

      if (editingItem) {
        const res = await client.put(`/admin/catalog/item/${editingItem.id}`, payload);
        setMessage({ type: 'success', text: res.data.message });
      } else {
        const res = await client.post('/admin/catalog/item', payload);
        setMessage({ type: 'success', text: res.data.message });
      }

      setShowItemForm(false);
      fetchCatalog(false);
    } catch (err) {
      console.error('Error saving item:', err);
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to save item' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId, spec) => {
    if (!window.confirm(`Are you sure you want to delete item "${spec}"?`)) return;

    try {
      const res = await client.delete(`/admin/catalog/item/${itemId}?part=${activePart}`);
      setMessage({ type: 'success', text: res.data.message });
      fetchCatalog(false);
    } catch (err) {
      console.error('Error deleting item:', err);
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to delete item' });
    }
  };

  // Add New Category Handler
  const handleAddNewCategory = async (e) => {
    e.preventDefault();
    const catName = newCategoryInput.trim();
    if (!catName) return;

    try {
      setSaving(true);
      const res = await client.post('/admin/catalog/category', {
        part: activePart,
        new_category_name: catName
      });
      setMessage({ type: 'success', text: `Category "${catName}" added to Part ${activePart}!` });
      setNewCategoryInput('');
      setShowAddCategoryForm(false);
      fetchCatalog(false);
    } catch (err) {
      console.error('Error adding category:', err);
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to add category' });
    } finally {
      setSaving(false);
    }
  };

  // Rename Category Handler
  const handleRenameCategory = async (e) => {
    e.preventDefault();
    if (!categoryToRename || !renameCategoryInput.trim()) return;

    try {
      setSaving(true);
      const res = await client.post('/admin/catalog/category', {
        part: activePart,
        old_category_name: categoryToRename,
        new_category_name: renameCategoryInput.trim()
      });
      setMessage({ type: 'success', text: res.data.message });
      setShowRenameCategory(false);
      setRenameCategoryInput('');
      fetchCatalog(false);
    } catch (err) {
      console.error('Error renaming category:', err);
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to rename category' });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amt || 0);
  };

  const getUnitBadgeStyle = (unitStr) => {
    const u = (unitStr || '').toLowerCase().trim();
    if (u.includes('piece') || u.includes('pc')) {
      return { bg: '#fffbeb', text: '#b45309', border: '#fde68a' }; // Amber
    } else if (u.includes('box') || u.includes('bx')) {
      return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }; // Blue
    } else if (u.includes('ream') || u.includes('rm')) {
      return { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' }; // Emerald Green
    } else if (u.includes('bottle') || u.includes('btl')) {
      return { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' }; // Purple
    } else if (u.includes('gallon') || u.includes('gal')) {
      return { bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4' }; // Teal
    } else if (u.includes('roll') || u.includes('rl')) {
      return { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' }; // Sky Blue
    } else if (u.includes('set') || u.includes('unit')) {
      return { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' }; // Indigo
    } else if (u.includes('ticket') || u.includes('tkt')) {
      return { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' }; // Rose
    } else if (u.includes('cartridge') || u.includes('toner')) {
      return { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' }; // Orange
    } else if (u.includes('pad') || u.includes('pack') || u.includes('pk')) {
      return { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' }; // Slate
    } else {
      return { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' }; // Soft Gray
    }
  };

  if (!isOpen) return null;

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
        className="card border-0 shadow-lg d-flex flex-column"
        style={{
          width: '96vw',
          maxWidth: '1550px',
          height: '94vh',
          maxHeight: '94vh',
          borderRadius: '0px',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: '0 35px 95px -15px rgba(0, 0, 0, 0.65)',
          overscrollBehavior: 'contain'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Banner Header */}
        <div
          className="px-4 py-4 d-flex justify-content-between align-items-center text-white flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            minHeight: '84px'
          }}
        >
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
              style={{
                width: '46px',
                height: '46px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}
            >
              <Package size={24} className="text-info" />
            </div>
            <div>
              <h5 className="fw-bold mb-1 text-white" style={{ fontSize: '1.15rem', lineHeight: '1.2' }}>
                Item Catalog & Category Management
              </h5>
              <p className="small text-light opacity-75 mb-0" style={{ fontSize: '0.8rem' }}>
                Organize Items by Category, Manage Unit Prices (₱), and Add Categories for Part 1 & Part 2
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            {/* Top Add Category Button */}
            <button
              type="button"
              onClick={() => { setShowAddCategoryForm(!showAddCategoryForm); setShowItemForm(false); setShowRenameCategory(false); }}
              className="btn btn-warning rounded-pill px-3.5 py-1.5 fw-bold d-flex align-items-center gap-2.5 text-dark shadow-sm"
              style={{ fontSize: '0.825rem' }}
            >
              <FolderPlus size={16} />
              <span>Add Category</span>
            </button>

            <button
              type="button"
              className="btn btn-sm text-light rounded-circle p-2 border-0 opacity-75 d-flex align-items-center justify-content-center"
              onClick={onClose}
              style={{ background: 'rgba(255, 255, 255, 0.12)', width: '38px', height: '38px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Part 1 vs Part 2 Navigation Tabs & Search Controls */}
        <div className="px-4 py-3 bg-light border-bottom d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 flex-shrink-0">
          {/* Tabs */}
          <div className="nav nav-pills gap-2">
            <button
              type="button"
              className={`nav-link rounded-pill px-4 py-1.5 small fw-bold border-0 ${activePart === 1 ? 'active bg-primary text-white shadow-sm' : 'text-secondary bg-white border'}`}
              onClick={() => { setActivePart(1); setSelectedCategory(''); setSearchQuery(''); }}
              style={{ fontSize: '0.85rem' }}
            >
              Part I: PS-DBM Common-Use Supplies ({catalog.part1.length})
            </button>
            <button
              type="button"
              className={`nav-link rounded-pill px-4 py-1.5 small fw-bold border-0 ${activePart === 2 ? 'active bg-primary text-white shadow-sm' : 'text-secondary bg-white border'}`}
              onClick={() => { setActivePart(2); setSelectedCategory(''); setSearchQuery(''); }}
              style={{ fontSize: '0.85rem' }}
            >
              Part II: Other Supplies & Equipment ({catalog.part2.length})
            </button>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Category Dropdown Filter */}
            <div className="input-group input-group-sm" style={{ width: '250px' }}>
              <span className="input-group-text bg-white border-end-0"><Filter size={14} className="text-muted" /></span>
              <select
                className="form-select form-select-sm border-start-0"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories ({currentCategories.length})</option>
                {currentCategories.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="input-group input-group-sm" style={{ width: '250px' }}>
              <span className="input-group-text bg-white border-end-0"><Search size={14} className="text-muted" /></span>
              <input
                type="text"
                className="form-control form-control-sm border-start-0"
                placeholder="Search item code or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" className="btn btn-sm btn-outline-secondary border-start-0" onClick={() => setSearchQuery('')}>
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Rename Category Panel Trigger */}
            <button
              type="button"
              className="btn btn-sm btn-outline-dark rounded-pill px-2.5 d-flex align-items-center gap-1 font-weight-semibold"
              onClick={() => { setShowRenameCategory(!showRenameCategory); setShowAddCategoryForm(false); }}
              title="Rename existing categories"
            >
              <Tag size={14} />
              <span>Rename Category</span>
            </button>
          </div>
        </div>

        {/* Add Category Collapsible Panel */}
        {showAddCategoryForm && (
          <div className="p-3.5 bg-warning-subtle border-bottom flex-shrink-0 shadow-sm">
            <form onSubmit={handleAddNewCategory} className="d-flex flex-wrap align-items-center gap-3">
              <span className="fw-bold text-dark small d-flex align-items-center gap-1">
                <FolderPlus size={18} className="text-warning-emphasis" />
                <span>Add New Category to Part {activePart}:</span>
              </span>
              <input
                type="text"
                className="form-control form-control-sm rounded-pill"
                style={{ width: '320px' }}
                placeholder="e.g. CLEANING AND SANITATION SUPPLIES..."
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                required
              />

              <button type="submit" disabled={saving} className="btn btn-sm btn-warning rounded-pill px-4 fw-bold shadow-sm">
                {saving ? 'Creating...' : '+ Create Category'}
              </button>
              <button type="button" className="btn btn-sm btn-link text-secondary text-decoration-none" onClick={() => setShowAddCategoryForm(false)}>
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Rename Category Collapsible Panel */}
        {showRenameCategory && (
          <div className="p-3.5 bg-warning-subtle border-bottom flex-shrink-0 shadow-sm">
            <form onSubmit={handleRenameCategory} className="d-flex flex-wrap align-items-center gap-3">
              <span className="fw-bold text-dark small d-flex align-items-center gap-1">
                <Tag size={16} className="text-warning-emphasis" />
                <span>Rename Category in Part {activePart}:</span>
              </span>
              <select
                className="form-select form-select-sm rounded-pill"
                style={{ width: '260px' }}
                value={categoryToRename}
                onChange={(e) => setCategoryToRename(e.target.value)}
                required
              >
                <option value="">Select Category to Rename...</option>
                {currentCategories.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat}</option>
                ))}
              </select>

              <input
                type="text"
                className="form-control form-control-sm rounded-pill"
                style={{ width: '260px' }}
                placeholder="Enter New Category Name..."
                value={renameCategoryInput}
                onChange={(e) => setRenameCategoryInput(e.target.value)}
                required
              />

              <button type="submit" disabled={saving} className="btn btn-sm btn-warning rounded-pill px-3.5 fw-bold shadow-sm">
                {saving ? 'Renaming...' : 'Rename Category'}
              </button>
              <button type="button" className="btn btn-sm btn-link text-secondary text-decoration-none" onClick={() => setShowRenameCategory(false)}>
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Item Create / Edit Form Sub-Panel */}
        {showItemForm && (
          <div className="p-4 bg-light border-bottom flex-shrink-0 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <Edit2 size={16} className="text-primary" />
                <span>{editingItem ? `Edit Item #${editingItem.item_no} (Part ${activePart})` : `Add New Item to Part ${activePart}`}</span>
              </h6>
              <button type="button" className="btn-close" onClick={() => setShowItemForm(false)}></button>
            </div>

            <form onSubmit={handleSubmitItem}>
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-5">
                  <label className="form-label small fw-bold text-dark mb-1">Item Specification / Description *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. PAPER, MULTICOPY, 80gsm, size: A4"
                    value={formData.specification}
                    onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                    required
                  />
                </div>

                <div className="col-12 col-md-2">
                  <label className="form-label small fw-bold text-dark mb-1">Product Code</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. 14111507-PP-M01"
                    value={formData.product_code}
                    onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                  />
                </div>

                <div className="col-12 col-md-2">
                  <label className="form-label small fw-bold text-dark mb-1">Unit of Measure *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. ream, box, piece, roll"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                  />
                </div>

                <div className="col-12 col-md-3">
                  <label className="form-label small fw-bold text-dark mb-1">Unit Price (₱) *</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white fw-bold">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control form-control-sm fw-bold text-primary"
                      placeholder="0.00"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="row g-3 align-items-center mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-dark mb-1">Category *</label>
                  <select
                    className="form-select form-select-sm mb-1"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">Select Existing Category...</option>
                    {currentCategories.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                    <option value="__CUSTOM__">➕ Add Custom Category Name...</option>
                  </select>

                  {formData.category === '__CUSTOM__' && (
                    <input
                      type="text"
                      className="form-control form-control-sm mt-1 border-primary"
                      placeholder="Enter New Category Name..."
                      value={formData.custom_category}
                      onChange={(e) => setFormData({ ...formData, custom_category: e.target.value })}
                      required
                    />
                  )}
                </div>

                <div className="col-12 col-md-6 d-flex align-items-center pt-3">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="updateDraftCheck"
                      checked={formData.update_draft_entries}
                      onChange={(e) => setFormData({ ...formData, update_draft_entries: e.target.checked })}
                    />
                    <label className="form-check-label small text-secondary fw-medium" htmlFor="updateDraftCheck">
                      Apply updated Unit Price to all unsubmitted office draft forms
                    </label>
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-sm btn-outline-secondary rounded-pill px-3" onClick={() => setShowItemForm(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-sm btn-primary rounded-pill px-4 fw-bold">
                  {saving ? 'Saving...' : editingItem ? 'Update Item & Unit Price' : 'Save New Item'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Scrollable Body - Grouped Category Tables */}
        <div className="card-body p-4 overflow-auto flex-grow-1" style={{ overscrollBehavior: 'contain' }}>
          {message.text && (
            <div className={`alert alert-${message.type} py-2.5 px-3.5 small rounded-3 mb-3 d-flex align-items-center justify-content-between shadow-sm`}>
              <span>{message.text}</span>
              <button type="button" className="btn-close p-0" onClick={() => setMessage({ type: '', text: '' })}></button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted small">Loading catalog items and categories...</p>
            </div>
          ) : Object.keys(groupedCategories).length === 0 ? (
            <div className="text-center py-5 text-muted">
              <Package size={40} className="mb-2 opacity-50 text-secondary" />
              <h6>No categories or items found in Part {activePart}</h6>
              <p className="small mb-0">Try adding a category or adjusting your search filter</p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-4">
              {Object.entries(groupedCategories).map(([categoryName, items]) => (
                <div key={categoryName} className="card border-0 shadow-sm rounded-3 overflow-hidden">
                  {/* Category Header Bar */}
                  <div className="card-header bg-dark text-white py-2.5 px-3.5 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-2">
                      <Tag size={16} className="text-warning" />
                      <h6 className="fw-bold mb-0 text-white" style={{ fontSize: '0.925rem', letterSpacing: '0.02em' }}>
                        {categoryName}
                      </h6>
                      <span className="badge bg-warning text-dark rounded-pill px-2.5 py-0.5 fw-bold ms-1" style={{ fontSize: '0.725rem' }}>
                        {items.length} {items.length === 1 ? 'Item' : 'Items'}
                      </span>
                    </div>

                    {/* Button to Add Item directly to THIS category */}
                    <button
                      type="button"
                      onClick={() => handleOpenAddForm(categoryName)}
                      className="btn btn-sm btn-warning rounded-pill px-3 py-1 font-weight-bold d-flex align-items-center gap-1 shadow-sm"
                      style={{ fontSize: '0.8rem' }}
                      title={`Add new item under ${categoryName}`}
                    >
                      <Plus size={14} />
                      <span>Add Item</span>
                    </button>
                  </div>

                  {/* Items Table for this Category */}
                  <div className="card-body p-0">
                    {items.length === 0 ? (
                      <div className="p-4 text-center text-muted bg-light d-flex align-items-center justify-content-center gap-2">
                        <span className="small">No items under this category yet.</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary rounded-pill px-3 py-0.5 fw-bold"
                          onClick={() => handleOpenAddForm(categoryName)}
                        >
                          + Add Item
                        </button>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.84rem' }}>
                          <thead style={{ background: '#e0f2fe' }}>
                            <tr style={{ background: '#e0f2fe', borderBottom: '2px solid #bae6fd' }}>
                              <th className="py-2.5 px-3 text-center text-nowrap" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: '0.8rem', width: '45px' }}>#</th>
                              <th className="py-2.5 px-3 text-nowrap" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: '0.8rem', width: '180px' }}>PRODUCT CODE</th>
                              <th className="py-2.5 px-3" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: '0.8rem' }}>ITEM DESCRIPTION / SPECIFICATION</th>
                              <th className="py-2.5 px-3 text-center text-nowrap" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: '0.8rem', width: '90px' }}>UNIT</th>
                              <th className="py-2.5 px-3 text-end text-nowrap" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: '0.8rem', width: '140px' }}>UNIT PRICE (₱)</th>
                              <th className="py-2.5 px-3 text-center text-nowrap" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: '0.8rem', width: '120px' }}>ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => (
                              <tr key={item.id}>
                                <td className="text-center fw-bold text-secondary py-2.5 px-3 text-nowrap">{item.item_no || idx + 1}</td>
                                <td className="mono-font small text-primary fw-semibold py-2.5 px-3 text-nowrap">
                                  {item.product_code || '—'}
                                </td>
                                <td className="fw-bold text-dark py-2.5 px-3">
                                  {item.specification}
                                </td>
                                <td className="text-center py-2.5 px-3 text-nowrap">
                                  {(() => {
                                    const uStyle = getUnitBadgeStyle(item.unit);
                                    return (
                                      <span
                                        className="badge px-2.5 py-1 rounded fw-semibold"
                                        style={{
                                          backgroundColor: uStyle.bg,
                                          color: uStyle.text,
                                          border: `1px solid ${uStyle.border}`,
                                          fontSize: '0.75rem'
                                        }}
                                      >
                                        {item.unit}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="text-end fw-bold text-success py-2.5 px-3 text-nowrap" style={{ fontSize: '0.9rem' }}>
                                  {formatCurrency(item.unit_price)}
                                </td>
                                <td className="text-center py-2.5 px-3 text-nowrap">
                                  <div className="d-flex justify-content-center align-items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditForm(item)}
                                      className="btn btn-sm btn-outline-warning rounded-pill px-2.5 py-0.5 d-flex align-items-center gap-1 fw-bold"
                                      title="Edit Item & Unit Price"
                                    >
                                      <Edit2 size={12} />
                                      <span>Edit</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(item.id, item.specification)}
                                      className="btn btn-sm btn-outline-danger rounded-circle p-1.5"
                                      title="Delete Item"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageCatalogModal;
