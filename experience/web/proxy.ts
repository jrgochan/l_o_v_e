import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // CSP: Strict policy allowing necessary sources
  // 'unsafe-eval' is typically required for dev mode hot-reloading (webpack),
  // but we try to restrict it in prod if possible. For now, allowing it
  // to prevent breakage, but ideally should be removed for prod.
  // We allow ws: and wss: for WebSocket connections to Observer.
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https:;
    style-src 'self' 'unsafe-inline' https:;
    img-src 'self' blob: data: https:;
    media-src 'self' blob: https:;
    font-src 'self' data: https:;
    connect-src 'self' ws: wss: http: https:; 
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    ${process.env.NODE_ENV === "development" ? "" : "upgrade-insecure-requests;"}
  `;

  // Replace newlines with spaces
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set Security Headers
  response.headers.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Control referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy (formerly Feature Policy) - disable sensitive features unless needed
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=(), browsing-topics=()"
  );

  // HSTS (Strict-Transport-Security)
  // Only effective on HTTPS, but good practice to set.
  if (process.env.NODE_ENV !== "development") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
