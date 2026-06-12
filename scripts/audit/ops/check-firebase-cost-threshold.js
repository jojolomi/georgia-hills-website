const budget = Number(process.env.FIREBASE_MONTHLY_BUDGET_USD || '0');
const current = Number(process.env.FIREBASE_CURRENT_MONTH_COST_USD || '0');
const environment = process.env.GH_ENVIRONMENT || 'production';

if (!budget || !current) {
  console.log('No cost values provided. Set FIREBASE_MONTHLY_BUDGET_USD and FIREBASE_CURRENT_MONTH_COST_USD to enforce threshold checks.');
  process.exit(0);
}

const ratio = current / budget;
console.log(`Firebase cost monitor (${environment}): $${current.toFixed(2)} / $${budget.toFixed(2)} (${(ratio * 100).toFixed(1)}%)`);

if (ratio >= 1) {
  console.error('Cost budget exceeded.');
  process.exit(1);
}

if (ratio >= 0.8) {
  console.warn('Cost usage above 80% of budget.');
}
