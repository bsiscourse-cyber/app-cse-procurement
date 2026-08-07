# APP-CSE 2027 Online Procurement Request System
## System Plan for Engineer (Strictly Aligned with APP_CSE_Template_2027.xlsx)

---

## 1. WHAT THE SYSTEM IS

A web-based annual procurement request system that **digitizes the official APP-CSE 2027 Excel form** (`APP_CSE_Template_2027.xlsx`) for all government offices and agencies. Each office fills out the exact table structure seen in the official Excel template — monthly quantities per item, per quarter — and the Supply Office (admin) receives, reviews, approves, and manages all submissions from a central dashboard.

**Key constraints & requirements from official template:**
- Login = password only (no username), one unique password per account
- **Part I = Available at PS-DBM (Main Warehouse & Depots)**: 316 items across 27 categories (prices pre-loaded from PS-DBM catalogue, read-only)
- **Part II = Other Items Purchased from Other Sources**: 113 items across 5 categories (offices input their own unit price)
- **Full 27-Column Table UI**: Must mirror the Excel table layout 1:1, including `Item Code / Product Code` (Col B)
- **Agency Information Header**: Collects 9 header fields (Department, Agency Code/UACS, Contact Person, Region, Organization Type, Position, Address, E-mail, Telephone/Mobile Nos.)
- **Summary & Budget Calculation Blocks**: Auto-computes Subtotal A, 10% Price Change Provision B, Transport/Freight Provision C, Grand Total D (A+B+C), and stores Approved Budget E for both Part I and Part II
- **Legal Warranty & Signatures Block**: Includes mandatory budget warranty text and tracks 3 signature approvals (Property/Supply Officer, Accountant/Budget Officer, Head of Office/Agency)
- Yearly submission cycle — offices submit once per fiscal year (FY 2027)
- Tech stack: **React + Vite + Bootstrap 5** (frontend), **Node.js + Express** (backend), **MySQL** (database)

---

## 2. USER ROLES

| Role | Who | What They Can Do |
|------|-----|-----------------|
| **Office Account** | Budget Office, HR Office, Accounting, Engineering, etc. | Fill out APP-CSE form, view draft/submitted form, edit draft submission |
| **Admin (Supply Office)** | Supply/Property Officer | Create office accounts, manage passwords, view all office submissions, approve/reject forms, export to official Excel |

---

## 3. LOGIN SYSTEM (Password-Only)

Because there is no username — just one unique password per account:

- The system identifies the office by their **unique password**
- Each office password is generated and assigned by the Admin
- Password format suggestion: `OFFICE-XXXX` (e.g., `BUDGET-2027`, `HR-2027`, `ACCOUNTING-2027`) — readable, memorable, unique
- Admin has a **separate admin password** (e.g., `ADMIN-SUPPLY-2027`) plus `is_admin = 1` in the database
- Login page: single input field (`Password`), one button (`Login`) → system identifies which office owns that password

> ⚠️ **Backend Implementation Note:** Passwords must be stored as bcrypt hashes in the DB. On login, hash the input and match. Since there's no username, fetch accounts and use `bcrypt.compare()` in a loop (fast and scalable for office counts < 500).

---

## 4. DATABASE SCHEMA (MySQL)

```sql
-- Office Accounts & Profile
CREATE TABLE offices (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  office_name    VARCHAR(255) NOT NULL,        -- e.g. "Budget Office"
  password_hash  VARCHAR(255) NOT NULL,        -- bcrypt hash
  is_admin       TINYINT(1) DEFAULT 0,         -- 0 = office, 1 = admin
  department     VARCHAR(255),                 -- Department / Bureau / Office
  contact_person VARCHAR(255),
  position       VARCHAR(255),
  email          VARCHAR(255),
  telephone      VARCHAR(100),
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Submission Header Fields (1:1 with Excel Header Rows 23-26)
CREATE TABLE submissions (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  office_id           INT NOT NULL,
  fiscal_year         INT DEFAULT 2027,
  
  -- 9 Agency Header Fields from Excel
  department_bureau   VARCHAR(255),            -- Row 23 Col A
  agency_code_uacs    VARCHAR(100),            -- Row 23 Col D
  contact_person      VARCHAR(255),            -- Row 23 Col J
  region              VARCHAR(100),            -- Row 24 Col A
  org_type            VARCHAR(100),            -- Row 24 Col D
  position            VARCHAR(255),            -- Row 24 Col J
  address             TEXT,                    -- Row 25 Col A
  email               VARCHAR(255),            -- Row 25 Col D
  telephone_mobile    VARCHAR(100),            -- Row 26 Col D
  
  -- Status Workflow
  status              VARCHAR(20) DEFAULT 'draft',   -- draft | submitted | approved
  submitted_at        DATETIME,
  approved_at         DATETIME,
  
  -- Summary & Budget Calculations (Part I)
  part1_total_a       DECIMAL(14,2) DEFAULT 0.00,    -- Sum of Part I items Total Amount
  part1_provision_b   DECIMAL(14,2) DEFAULT 0.00,    -- 10% of part1_total_a
  part1_freight_c     DECIMAL(14,2) DEFAULT 0.00,    -- Transport & Freight Cost
  part1_grand_total_d DECIMAL(14,2) DEFAULT 0.00,    -- A + B + C
  part1_budget_text_e TEXT,                          -- Approved Budget text / words

  -- Summary & Budget Calculations (Part II)
  part2_total_a       DECIMAL(14,2) DEFAULT 0.00,    -- Sum of Part II items Total Amount
  part2_provision_b   DECIMAL(14,2) DEFAULT 0.00,    -- 10% of part2_total_a
  part2_freight_c     DECIMAL(14,2) DEFAULT 0.00,    -- Transport & Freight Cost
  part2_grand_total_d DECIMAL(14,2) DEFAULT 0.00,    -- A + B + C
  part2_budget_text_e TEXT,                          -- Approved Budget text / words

  -- Overall Combined Grand Total
  overall_grand_total DECIMAL(14,2) DEFAULT 0.00,    -- Part I Grand Total + Part II Grand Total
  
  -- Signatory Tracker
  prepared_by_name    VARCHAR(255),                  -- Property / Supply Officer
  certified_by_name   VARCHAR(255),                  -- Accountant / Budget Officer
  approved_by_name    VARCHAR(255),                  -- Head of Office / Agency
  date_prepared       DATE,
  
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (office_id) REFERENCES offices(id)
);

-- Master Table for Part I Items (Pre-loaded 316 items from Excel)
CREATE TABLE part1_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  item_no       INT NOT NULL,                -- Item number in template
  product_code  VARCHAR(100) NOT NULL,       -- e.g. "12191601-AL-E04" (Col B)
  specification TEXT NOT NULL,               -- Item Description (Col C)
  unit          VARCHAR(50) NOT NULL,        -- Unit of Measure (Col D)
  category      VARCHAR(255) NOT NULL,       -- Category Group (e.g. "ALCOHOL OR ACETONE...")
  unit_price    DECIMAL(12,2) NOT NULL,      -- PS-DBM Unit Price (Col Z)
  part          INT DEFAULT 1
);

-- Master Table for Part II Items (Pre-loaded 113 items from Excel)
CREATE TABLE part2_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  item_no       INT NOT NULL,                -- Item number in template
  product_code  VARCHAR(100) NOT NULL,       -- e.g. "80141505-TS-072" (Col B)
  specification TEXT NOT NULL,               -- Item Description (Col C)
  unit          VARCHAR(50) NOT NULL,        -- Unit of Measure (Col D)
  category      VARCHAR(255) NOT NULL,       -- Category Group (e.g. "AIR CONDITIONING UNITS")
  part          INT DEFAULT 2
);

-- Quantity & Amount Entries per Office Submission per Item
CREATE TABLE submission_entries (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  submission_id       INT NOT NULL,
  item_id             INT NOT NULL,          -- References part1_items or part2_items
  item_part           INT NOT NULL,          -- 1 or 2
  
  -- Monthly Quantity Inputs (Col E-G, J-L, O-Q, T-V)
  jan INT DEFAULT 0, feb INT DEFAULT 0, mar INT DEFAULT 0,
  apr INT DEFAULT 0, may INT DEFAULT 0, jun INT DEFAULT 0,
  jul INT DEFAULT 0, aug INT DEFAULT 0, sep INT DEFAULT 0,
  oct INT DEFAULT 0, nov INT DEFAULT 0, decm INT DEFAULT 0,   -- 'decm' avoids MySQL reserved word 'dec'
  
  -- Unit Price (Overridden for Part II, inherited from part1_items for Part I)
  unit_price          DECIMAL(12,2) DEFAULT 0.00,
  
  -- Computed Columns (MySQL 5.7+)
  q1_qty    INT GENERATED ALWAYS AS (jan + feb + mar) STORED,
  q1_amount DECIMAL(14,2) GENERATED ALWAYS AS ((jan + feb + mar) * unit_price) STORED,
  
  q2_qty    INT GENERATED ALWAYS AS (apr + may + jun) STORED,
  q2_amount DECIMAL(14,2) GENERATED ALWAYS AS ((apr + may + jun) * unit_price) STORED,
  
  q3_qty    INT GENERATED ALWAYS AS (jul + aug + sep) STORED,
  q3_amount DECIMAL(14,2) GENERATED ALWAYS AS ((jul + aug + sep) * unit_price) STORED,
  
  q4_qty    INT GENERATED ALWAYS AS (oct + nov + decm) STORED,
  q4_amount DECIMAL(14,2) GENERATED ALWAYS AS ((oct + nov + decm) * unit_price) STORED,
  
  total_qty INT GENERATED ALWAYS AS (jan+feb+mar+apr+may+jun+jul+aug+sep+oct+nov+decm) STORED,
  total_amount DECIMAL(14,2) GENERATED ALWAYS AS ((jan+feb+mar+apr+may+jun+jul+aug+sep+oct+nov+decm) * unit_price) STORED,
  
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
);
```

---

## 5. FOLDER STRUCTURE (React Vite + Node.js)

```
project-root/
├── frontend/                    # React 18 + Vite + Bootstrap 5
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx            # Password-only authentication
│   │   │   ├── OfficeDashboard.jsx  # Main office hub (Header info + Part I & Part II tabs)
│   │   │   ├── AdminDashboard.jsx   # Admin management panel
│   │   │   ├── AdminOffices.jsx     # Admin office account generator
│   │   │   └── AdminSubmission.jsx  # Admin submission inspector & approval page
│   │   ├── components/
│   │   │   ├── AppCSETable.jsx      # The core 27-column spreadsheet UI component
│   │   │   ├── HeaderInfoForm.jsx   # Agency header details form (9 fields)
│   │   │   ├── SummaryBlock.jsx     # Subtotal A, 10% Provision B, Freight C, Grand Total D
│   │   │   ├── SignatureBlock.jsx   # Signatories & Warranty Statement
│   │   │   ├── NavBar.jsx
│   │   │   └── StatusBadge.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Authentication & Office session management
│   │   ├── api/
│   │   │   └── client.js            # Axios HTTP client
│   │   └── App.jsx
│   └── vite.config.js
│
└── backend/                     # Node.js + Express
    ├── routes/
    │   ├── auth.js              # POST /api/auth/login
    │   ├── submissions.js       # CRUD for submissions & header info
    │   ├── entries.js           # Batch save & update monthly item quantities
    │   ├── items.js             # GET /api/items/part1 and /api/items/part2
    │   └── admin.js             # Admin management & Excel export
    ├── middleware/
    │   └── auth.js              # JWT verification & role authorization
    ├── db/
    │   ├── pool.js              # mysql2 promise pool connection
    │   └── seed.js              # Automated seeder for all 316 Part I + 113 Part II items
    └── server.js
```

---

## 6. PAGES & FLOW

### A. Login Page (`/`)
```
┌─────────────────────────────────────────┐
│         APP-CSE 2027                    │
│   Annual Procurement Request System     │
│                                         │
│   [ Enter your office password        ] │
│                                         │
│              [ LOGIN ]                  │
└─────────────────────────────────────────┘
```

---

### B. Office Dashboard (`/dashboard`)
Shows agency header details (9 fields), Tab switcher for **Part I** and **Part II**, Summary calculations, and Signatory fields.

---

### C. The Core Table UI (`AppCSETable.jsx`) — 1:1 Excel Match

The table mirrors `APP_CSE_Template_2027.xlsx` with **all 27 columns**:

```
┌──────┬─────────────────┬──────────────────────────────┬────────┬─────┬─────┬─────┬────────┬──────────┬─────┬─────┬──────┬────────┬──────────┬─────┬─────┬──────┬────────┬──────────┬─────┬─────┬─────┬────────┬──────────┬───────┬────────────┬──────────────┐
│ Item │ Item Code       │ Item Specifications          │ Unit   │ Jan │ Feb │ Mar │ Q1 Qty │ Q1 Amount│ Apr │ May │ June │ Q2 Qty │ Q2 Amount│ Jul │ Aug │ Sept │ Q3 Qty │ Q3 Amount│ Oct │ Nov │ Dec │ Q4 Qty │ Q4 Amount│ Total │ Unit Price │ Total Amount │
├──────┼─────────────────┼──────────────────────────────┼────────┼─────┼─────┼─────┼────────┼──────────┼─────┼─────┼──────┼────────┼──────────┼─────┼─────┼──────┼────────┼──────────┼─────┼─────┼─────┼────────┼──────────┼───────┼────────────┼──────────────┤
│  1   │ 12191601-AL-E04 │ ALCOHOL, Ethyl, 500 mL       │ bottle │[  ] │[  ] │[  ] │  AUTO  │   AUTO   │[  ] │[  ] │[   ] │  AUTO  │   AUTO   │[  ] │[  ] │[   ] │  AUTO  │   AUTO   │[  ] │[  ] │[  ] │  AUTO  │   AUTO   │ AUTO  │  ₱ 58.90   │     AUTO     │
│  2   │ 12191601-AL-E03 │ ALCOHOL, Ethyl, 1 Gallon    │ gallon │[  ] │[  ] │[  ] │  AUTO  │   AUTO   │...  │     │      │        │          │     │     │      │        │          │     │     │     │        │          │       │  ₱ 405.80  │     AUTO     │
├──────┴─────────────────┴──────────────────────────────┴────────┴─────┴─────┴─────┴────────┴──────────┴─────┴─────┴──────┴────────┴──────────┴─────┴─────┴──────┴────────┴──────────┴─────┴─────┴─────┴────────┴──────────┴───────┴────────────┼──────────────┤
│ CATEGORY: CLEANING EQUIPMENT AND SUPPLIES                                                                                                                                                                                                                   │
├──────┬─────────────────┬──────────────────────────────┬────────┬─────┬─────┬─────┬────────┬──────────┬─────┬─────┬──────┬────────┬──────────┬─────┬─────┬──────┬────────┬──────────┬─────┬─────┬─────┬────────┬──────────┬───────┬────────────┼──────────────┤
│  19  │ 47131812-AF-A01 │ AIR FRESHENER, aerosol       │ can    │[  ] │[  ] │[  ] │  AUTO  │   AUTO   │...  │     │      │        │          │     │     │      │        │          │     │     │     │        │          │       │  ₱ 81.64   │     AUTO     │
└──────┴─────────────────┴──────────────────────────────┴────────┴─────┴─────┴─────┴────────┴──────────┴─────┴─────┴──────┴────────┴──────────┴─────┴─────┴──────┴────────┴──────────┴─────┴─────┴─────┴────────┴──────────┴───────┴────────────┴──────────────┘
```

#### Complete 27 Column Mapping:
1. `Item No` (Col A)
2. `Item Code / Product Code` (Col B)
3. `Item Description / Specifications` (Col C)
4. `Unit of Measure` (Col D)
5. `Jan` (Col E) - Editable Input
6. `Feb` (Col F) - Editable Input
7. `Mar` (Col G) - Editable Input
8. `Q1 Qty` (Col H) - `Jan + Feb + Mar` (Auto-computed)
9. `Q1 Amount` (Col I) - `Q1 Qty × Unit Price` (Auto-computed)
10. `April` (Col J) - Editable Input
11. `May` (Col K) - Editable Input
12. `June` (Col L) - Editable Input
13. `Q2 Qty` (Col M) - `Apr + May + Jun` (Auto-computed)
14. `Q2 Amount` (Col N) - `Q2 Qty × Unit Price` (Auto-computed)
15. `July` (Col O) - Editable Input
16. `Aug` (Col P) - Editable Input
17. `Sept` (Col Q) - Editable Input
18. `Q3 Qty` (Col R) - `Jul + Aug + Sep` (Auto-computed)
19. `Q3 Amount` (Col S) - `Q3 Qty × Unit Price` (Auto-computed)
20. `Oct` (Col T) - Editable Input
21. `Nov` (Col U) - Editable Input
22. `Dec` (Col V) - Editable Input
23. `Q4 Qty` (Col W) - `Oct + Nov + Dec` (Auto-computed)
24. `Q4 Amount` (Col X) - `Q4 Qty × Unit Price` (Auto-computed)
25. `Total Qty` (Col Y) - `Q1 Qty + Q2 Qty + Q3 Qty + Q4 Qty` (Auto-computed)
26. `Unit Price` (Col Z) - Pre-filled read-only for Part I, Editable input for Part II
27. `Total Amount` (Col AA) - `Total Qty × Unit Price` (Auto-computed)

---

### D. Summary & Signature Blocks (Matching Excel Rows 465-488)

At the bottom of **Part I** and **Part II**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ SUMMARY & BUDGET COMPUTATION (Part I / Part II)                                         │
├───────────────────────────────────────────────────────────────────┬─────────────────────┤
│ A. TOTAL (Sum of Total Amount for all items in Part)              │ ₱  XXX,XXX.XX       │
│ B. ADDITIONAL PROVISION FOR PRICE CHANGES (10% of TOTAL)          │ ₱   XX,XXX.XX       │
│ C. ADDITIONAL PROVISION FOR TRANSPORT AND FREIGHT COST            │ [ Input Amount   ]  │
│ D. GRAND TOTAL (A + B + C)                                        │ ₱  XXX,XXX.XX       │
│ E. APPROVED BUDGET BY THE AGENCY HEAD (In Figures & Words)        │ [ Input Text     ]  │
└───────────────────────────────────────────────────────────────────┴─────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ LEGAL WARRANTY STATEMENT                                                                │
│ "We hereby warrant that the total amount reflected in this Annual Procurement Plan to   │
│  procure the listed common-use supplies, materials, and equipment has been included     │
│  in or is within our approved budget for the year."                                     │
├──────────────────────────────┬──────────────────────────────┬───────────────────────────┤
│ Prepared by:                 │ Certified Funds Available:   │ Approved by:              │
│ [ Property/Supply Officer  ] │ [ Accountant/Budget Officer] │ [ Head of Office/Agency ] │
│ Date Prepared: [ Pick Date ] │                              │                           │
└──────────────────────────────┴──────────────────────────────┴───────────────────────────┘
```

---

## 7. API ENDPOINTS

| Method | Endpoint | Authorization | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/login` | Public | Login with password, returns JWT token & office profile |
| GET | `/api/items/part1` | Office / Admin | Fetch all 316 Part I items + pre-loaded prices |
| GET | `/api/items/part2` | Office / Admin | Fetch all 113 Part II items |
| GET | `/api/submission/mine` | Office | Get own submission, header details, and quantity entries |
| POST | `/api/submission/save` | Office | Save draft submission & header details |
| POST | `/api/submission/submit` | Office | Lock form and submit for Supply Office approval |
| GET | `/api/admin/submissions` | Admin | Get list of all offices and submission status |
| GET | `/api/admin/submission/:id` | Admin | Inspect specific office's submission details |
| POST | `/api/admin/approve/:id` | Admin | Approve or request revision on a submission |
| POST | `/api/admin/offices` | Admin | Create office account and generate password |
| GET | `/api/admin/export/:id` | Admin | Export submission to 1:1 formatted Excel (`exceljs`) |

---

## 8. SEEDING DATA SPECIFICATION

The backend seed script (`backend/db/seed.js`) parses `EXCEL-GUIDE/APP_CSE_Template_2027.xlsx` and populates:

1. `part1_items`: Exactly **316 items** across **27 categories** with exact product codes, specifications, units, and PS-DBM unit prices.
2. `part2_items`: Exactly **113 items** across **5 categories** with product codes, specifications, and units.

---

## 9. FORMULA & CALCULATION SPECIFICATION

1. `Q1 Qty` = `Jan + Feb + Mar`
2. `Q1 Amount` = `Q1 Qty × Unit Price`
3. `Q2 Qty` = `Apr + May + Jun`
4. `Q2 Amount` = `Q2 Qty × Unit Price`
5. `Q3 Qty` = `Jul + Aug + Sep`
6. `Q3 Amount` = `Q3 Qty × Unit Price`
7. `Q4 Qty` = `Oct + Nov + Dec`
8. `Q4 Amount` = `Q4 Qty × Unit Price`
9. `Total Qty` = `Q1 Qty + Q2 Qty + Q3 Qty + Q4 Qty`
10. `Total Amount` = `Total Qty × Unit Price`
11. `Subtotal A` = `SUM(Total Amount for all items in Part)`
12. `Provision B` = `Subtotal A × 0.10` (10% Price Change Provision)
13. `Freight C` = User input value (default 0.00)
14. `Grand Total D` = `Subtotal A + Provision B + Freight C`
15. `Overall Grand Total` = `Part I Grand Total D + Part II Grand Total D`

---

## 10. BUILD ORDER FOR ENGINEER

1. **Backend & Database Setup**:
   - Execute MySQL schema script.
   - Run `node db/seed.js` to seed 316 Part I items and 113 Part II items from `APP_CSE_Template_2027.xlsx`.
   - Implement password-only auth endpoint (`bcrypt`).
2. **Frontend Core Table**:
   - Implement `AppCSETable.jsx` with full 27 columns and real-time auto-calculations.
   - Implement `HeaderInfoForm.jsx` for 9 agency header fields.
   - Implement `SummaryBlock.jsx` and `SignatureBlock.jsx`.
3. **Office Workflow**:
   - Wire Draft Save and Submit logic.
   - Implement read-only locking once status = `submitted` or `approved`.
4. **Admin Dashboard & Excel Export**:
   - Admin view all submissions, status tracking, and office management.
   - Excel export endpoint using `exceljs` to generate files matching `APP_CSE_Template_2027.xlsx`.
