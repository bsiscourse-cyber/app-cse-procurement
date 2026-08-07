CREATE DATABASE IF NOT EXISTS appcse_db;
USE appcse_db;

-- Office Accounts & Profiles
CREATE TABLE IF NOT EXISTS offices (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  office_name     VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  is_admin        TINYINT(1) DEFAULT 0,
  department      VARCHAR(255),
  contact_person  VARCHAR(255),
  position        VARCHAR(255),
  email           VARCHAR(255),
  telephone       VARCHAR(100),
  profile_picture VARCHAR(255) DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Master Part I Items (Pre-loaded 316 items from Excel)
CREATE TABLE IF NOT EXISTS part1_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  item_no       INT NOT NULL,
  product_code  VARCHAR(100) NOT NULL,
  specification TEXT NOT NULL,
  unit          VARCHAR(50) NOT NULL,
  category      VARCHAR(255) NOT NULL,
  unit_price    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  part          INT DEFAULT 1
);

-- Master Part II Items (Pre-loaded 113 items from Excel)
CREATE TABLE IF NOT EXISTS part2_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  item_no       INT NOT NULL,
  product_code  VARCHAR(100) NOT NULL,
  specification TEXT NOT NULL,
  unit          VARCHAR(50) NOT NULL,
  category      VARCHAR(255) NOT NULL,
  part          INT DEFAULT 2
);

-- Submissions Header & Summary Details
CREATE TABLE IF NOT EXISTS submissions (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  office_id           INT NOT NULL,
  fiscal_year         INT DEFAULT 2026,
  
  -- 9 Agency Header Fields from Excel
  department_bureau   VARCHAR(255),
  agency_code_uacs    VARCHAR(100),
  contact_person      VARCHAR(255),
  region              VARCHAR(100),
  org_type            VARCHAR(100),
  position            VARCHAR(255),
  address             TEXT,
  email               VARCHAR(255),
  telephone_mobile    VARCHAR(100),
  
  -- Status Workflow (draft | submitted | approved)
  status              VARCHAR(20) DEFAULT 'draft',
  submitted_at        DATETIME,
  approved_at         DATETIME,
  
  -- Summary & Budget Calculations (Part I)
  part1_total_a       DECIMAL(14,2) DEFAULT 0.00,
  part1_provision_b   DECIMAL(14,2) DEFAULT 0.00,
  part1_freight_c     DECIMAL(14,2) DEFAULT 0.00,
  part1_grand_total_d DECIMAL(14,2) DEFAULT 0.00,
  part1_budget_text_e TEXT,

  -- Summary & Budget Calculations (Part II)
  part2_total_a       DECIMAL(14,2) DEFAULT 0.00,
  part2_provision_b   DECIMAL(14,2) DEFAULT 0.00,
  part2_freight_c     DECIMAL(14,2) DEFAULT 0.00,
  part2_grand_total_d DECIMAL(14,2) DEFAULT 0.00,
  part2_budget_text_e TEXT,

  -- Overall Combined Grand Total
  overall_grand_total DECIMAL(14,2) DEFAULT 0.00,
  
  -- Signatory Fields
  prepared_by_name    VARCHAR(255),
  certified_by_name   VARCHAR(255),
  approved_by_name    VARCHAR(255),
  date_prepared       DATE,
  
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
);

-- Submission Quantity & Amount Entries
CREATE TABLE IF NOT EXISTS submission_entries (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  submission_id       INT NOT NULL,
  item_id             INT NOT NULL,
  item_part           INT NOT NULL, -- 1 or 2
  
  -- Monthly Quantities
  jan INT DEFAULT 0, feb INT DEFAULT 0, mar INT DEFAULT 0,
  apr INT DEFAULT 0, may INT DEFAULT 0, jun INT DEFAULT 0,
  jul INT DEFAULT 0, aug INT DEFAULT 0, sep INT DEFAULT 0,
  oct INT DEFAULT 0, nov INT DEFAULT 0, decm INT DEFAULT 0,
  
  -- Unit Price (Overridden for Part II, inherited from part1_items for Part I)
  unit_price          DECIMAL(12,2) DEFAULT 0.00,
  
  -- Computed Columns
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
  
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

-- Password Reset Requests
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  office_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
);

-- Notifications for Staff / Office Accounts & Admin
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  office_id   INT NOT NULL,
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  type        VARCHAR(50) DEFAULT 'info',
  target_id   INT NULL,
  is_read     TINYINT(1) DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
);

-- Additional Requests Header
CREATE TABLE IF NOT EXISTS additional_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  office_id INT NOT NULL,
  office_name VARCHAR(255) NOT NULL,
  reason_notes TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  feedback_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
);

-- Additional Request Items
CREATE TABLE IF NOT EXISTS additional_request_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  item_id INT NOT NULL,
  item_part INT NOT NULL,
  jan INT DEFAULT 0, feb INT DEFAULT 0, mar INT DEFAULT 0,
  apr INT DEFAULT 0, may INT DEFAULT 0, jun INT DEFAULT 0,
  jul INT DEFAULT 0, aug INT DEFAULT 0, sep INT DEFAULT 0,
  oct INT DEFAULT 0, nov INT DEFAULT 0, decm INT DEFAULT 0,
  unit_price DECIMAL(12,2) DEFAULT 0.00,
  total_qty INT DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0.00,
  FOREIGN KEY (request_id) REFERENCES additional_requests(id) ON DELETE CASCADE
);


