export default {
  "src/**/*.{ts,js}": ["eslint --fix --max-warnings 0", "prettier --write"],
  "tests/**/*.ts": ["prettier --write"],
  "*.{md,json,yml,yaml}": ["prettier --write"],
};
