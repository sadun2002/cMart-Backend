// ============================================================
// cMart Platform — Global Constants
// Change COMPANY_NAME here to rebrand the entire platform.
// ============================================================

export const COMPANY_NAME = 'cMart';
export const COMPANY_TAGLINE = 'The Smart Way to Run Your Store';
export const COMPANY_EMAIL = 'hello@cmart.lk';
export const COMPANY_SUPPORT_EMAIL = 'support@cmart.lk';
export const COMPANY_URL = 'https://cmart.lk';
export const PLATFORM_SUBDOMAIN_BASE = 'cmart.lk'; // storename.cmart.lk
export const COMPANY_PHONE = '+94 77 000 0000';
export const COMPANY_ADDRESS = 'Colombo, Sri Lanka';

// ============================================================
// PLAN LIMITS
// ============================================================

export const PLAN_LIMITS = {
  FREE: {
    maxProducts: 100,
    maxEmployees: 2,
    maxOrdersPerMonth: 100,
    customDomain: false,
    prioritySupport: false,
    advancedReports: false,
    multiLocation: false,
  },
  PRO: {
    maxProducts: 1000,
    maxEmployees: 10,
    maxOrdersPerMonth: Infinity,
    customDomain: false,
    prioritySupport: true,
    advancedReports: true,
    multiLocation: false,
  },
  ENTERPRISE: {
    maxProducts: Infinity,
    maxEmployees: Infinity,
    maxOrdersPerMonth: Infinity,
    customDomain: true,
    prioritySupport: true,
    advancedReports: true,
    multiLocation: true,
  },
} as const;

// ============================================================
// PLAN PRICING (LKR)
// ============================================================

export const PLAN_PRICING = {
  FREE: 0,
  PRO: 2500,
  ENTERPRISE: 10000,
} as const;

export const TRIAL_DAYS = 14;

// ============================================================
// JWT CONFIG
// ============================================================

export const JWT_EXPIRES_IN = '15m';
export const JWT_REFRESH_EXPIRES_IN = '7d';

// ============================================================
// PAGINATION
// ============================================================

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ============================================================
// INVOICE
// ============================================================

export const INVOICE_PREFIX = 'INV';
export const ORDER_PREFIX = 'ORD';

// ============================================================
// CURRENCY
// ============================================================

export const DEFAULT_CURRENCY = 'LKR';
export const DEFAULT_LOCALE = 'en-LK';

// ============================================================
// EMPLOYEE POSITIONS
// ============================================================

export const EMPLOYEE_POSITIONS = ['CASHIER', 'MANAGER', 'SUPERVISOR', 'STAFF'] as const;

// ============================================================
// DEFAULT EMPLOYEE PERMISSIONS (Cashier role)
// ============================================================

export const DEFAULT_CASHIER_PERMISSIONS = {
  canProcessSales: true,
  canViewProducts: true,
  canAddProducts: false,
  canEditProducts: false,
  canDeleteProducts: false,
  canViewCustomers: true,
  canAddCustomers: true,
  canViewReports: false,
  canViewAllSales: false,
  canManageInventory: false,
  canManageEmployees: false,
};

export const DEFAULT_MANAGER_PERMISSIONS = {
  canProcessSales: true,
  canViewProducts: true,
  canAddProducts: true,
  canEditProducts: true,
  canDeleteProducts: false,
  canViewCustomers: true,
  canAddCustomers: true,
  canViewReports: true,
  canViewAllSales: true,
  canManageInventory: true,
  canManageEmployees: false,
};

// ============================================================
// SUPPORTED LANGUAGES
// ============================================================

export const SUPPORTED_LANGUAGES = ['en', 'si'] as const;
export const DEFAULT_LANGUAGE = 'en';

// ============================================================
// SUPPORTED TIMEZONES (Sri Lanka)
// ============================================================

export const DEFAULT_TIMEZONE = 'Asia/Colombo';
