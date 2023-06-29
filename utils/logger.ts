import { pino } from "pino";

export const logger = pino({
  name: 'led-api',
  level: 'info'
});
