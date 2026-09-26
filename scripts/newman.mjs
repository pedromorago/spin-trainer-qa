// Runs the Newman collection against the QA API (QA_API_URL or the local docker-compose) with a new player.
// Reports: console, JUnit (build/newman) and Allure (build/allure-results/newman).
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import newman from 'newman';
import { qaSessionToken } from './lib/qa-jwt.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const apiUrl = process.env.QA_API_URL ?? 'http://localhost:8081/api/v1';
const player = randomUUID();
const allureResults = `${root}build/allure-results/newman`;
rmSync(allureResults, { recursive: true, force: true });

newman.run(
  {
    collection: `${root}newman/spin-trainer.postman_collection.json`,
    environment: `${root}newman/qa.postman_environment.json`,
    envVar: [
      { key: 'baseUrl', value: apiUrl },
      { key: 'token', value: qaSessionToken(player) },
    ],
    reporters: ['cli', 'junit', 'allure'],
    reporter: {
      junit: { export: `${root}build/newman/junit.xml` },
      allure: { resultsDir: allureResults },
    },
  },
  (error, summary) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
      return;
    }
    console.log(`Player: ${player}`);
    if (summary.run.failures.length > 0 || summary.run.error) {
      process.exitCode = 1;
    }
  },
);
