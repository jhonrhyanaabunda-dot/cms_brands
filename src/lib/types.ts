// Shared string-literal types — mirrors what would be Prisma enums
// on Postgres. On SQLite these columns are stored as TEXT.

export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SEO_MANAGER"
  | "CONTENT_MANAGER"
  | "DEALER_CLIENT"
  | "VIEWER";

export type WorkflowStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "NEEDS_REVISION"
  | "APPROVED"
  | "SCHEDULED"
  | "PUBLISHED"
  | "ARCHIVED";

export type ContentType =
  | "BLOG"
  | "LANDING_PAGE"
  | "DEALER_PAGE"
  | "OEM_PAGE"
  | "CITY_PAGE"
  | "FAQ"
  | "GBP_POST"
  | "OFFER"
  | "INVENTORY_CAMPAIGN"
  | "SERVICE_CAMPAIGN"
  | "MODEL_RESEARCH"
  | "COMPARE_PAGE"
  | "TRADE_IN_PAGE"
  | "FINANCE_PAGE"
  | "SERVICE_PAGE";

export type ReviewSentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";
export type ReplyStatus = "DRAFT" | "APPROVED" | "POSTED" | "REJECTED";
export type OemBrand =
  | "BMW"
  | "MERCEDES_BENZ"
  | "NISSAN"
  | "FORD"
  | "LINCOLN"
  | "TOYOTA"
  | "HONDA"
  | "SUBARU"
  | "OTHER";
export type DealershipStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";
