import { createApp } from "./app.js";
import { readServerEnv } from "./env.js";

const { port } = readServerEnv();
const app = createApp();

console.log(`Server listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
