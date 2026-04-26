/**
 * Vitest global setup. Runs once before all test files.
 * Place global mocks (e.g. msw server lifecycle) here in later phases.
 */

// Point dotenv at a non-existent path so a developer's local `.env`
// never leaks into config tests. Tests inject env vars explicitly.
process.env.DOTENV_CONFIG_PATH = '/dev/null';

export {};
