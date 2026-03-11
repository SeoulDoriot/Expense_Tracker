export type TransactionFormType = "Income" | "Expense";

export const TRANSACTION_CATEGORIES: Record<TransactionFormType, string[]> = {
  Expense: [
    "Food",
    "Transport",
    "Utilities",
    "Shopping",
    "Entertainment",
    "Health",
    "Education",
    "Bills",
    "Other",
  ],
  Income: [
    "Salary",
    "Freelance",
    "Side Job",
    "Bonus",
    "Investment",
    "Allowance",
    "Gift",
    "Other",
  ],
};

export function getTransactionCategories(type: TransactionFormType) {
  return TRANSACTION_CATEGORIES[type];
}

export function isValidTransactionCategory(type: TransactionFormType, category: string) {
  return TRANSACTION_CATEGORIES[type].includes(category);
}
