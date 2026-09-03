export const PACKAGE_TIERS = ["beginner", "silver", "gold"] as const;
export const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Categories for the priced, client-facing `packages` table (distinct from the
// tier_packages tiers above, which are a separate/legacy 3-slot system).
export const PACKAGE_CATEGORIES = ["beginner", "intermediate", "elite", "business", "athlete"] as const;
export const PACKAGE_BILLING_INTERVALS = ["one_time", "monthly", "quarterly"] as const;
