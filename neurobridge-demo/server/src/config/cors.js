const configuredOrigins = new Set(
  (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const localFrontendOrigin = /^https?:\/\/(localhost|127\.0\.0\.1):(4173|517[3-9]|5180)$/;

export function isOriginAllowed(origin) {
  return configuredOrigins.has(origin) || origin === process.env.RENDER_EXTERNAL_URL || localFrontendOrigin.test(origin);
}

export function corsOrigin(origin, callback) {
  callback(null, !origin || isOriginAllowed(origin));
}
