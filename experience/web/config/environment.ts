/**
 * Centralized environment configuration for the frontend.
 * Handles API URLs, WebSocket endpoints, and build-time/runtime variable resolution.
 */

// Interface for the window object with injected environment variables
interface WindowWithEnv extends Window {
  env?: {
    NEXT_PUBLIC_API_URL?: string;
    NEXT_PUBLIC_OBSERVER_URL?: string;
    NEXT_PUBLIC_LISTENER_URL?: string;
    NEXT_PUBLIC_VERSOR_URL?: string;
  };
}

// Function to determine the base API URL
const getApiUrl = () => {
  // 1. Check for runtime environment variable (Next.js public runtime config)
  if (
    typeof window !== "undefined" &&
    (window as unknown as WindowWithEnv).env &&
    (window as unknown as WindowWithEnv).env?.NEXT_PUBLIC_API_URL
  ) {
    return (window as unknown as WindowWithEnv).env?.NEXT_PUBLIC_API_URL as string;
  }

  // 2. Check for build-time environment variable
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 3. Check for production mode match (default to relative path)
  if (process.env.NODE_ENV === "production") {
    return "/api/observer";
  }

  // 4. Fallback to localhost for development
  return "http://localhost:8000";
};

// Function to determine the WebSocket URL
const getWsUrl = (apiUrl: string) => {
  // Handle relative URLs
  if (apiUrl.startsWith("/")) {
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${window.location.host}${apiUrl}`;
    }
    return apiUrl; // Fallback for SSR
  }

  // If API URL is https, use wss. Otherwise ws.
  if (apiUrl.startsWith("https")) {
    return apiUrl.replace("https", "wss");
  }
  return apiUrl.replace("http", "ws");
};

export const API_URL = getApiUrl();
export const WS_URL = getWsUrl(API_URL);

// Specific Service URLs
// 1. Check specific env var
// 2. If API_URL is localhost, use default ports
// 3. If API_URL is prod (https), use path-based routing or subdomain conventions
// Note: In detailed cloud deployment, these might be distinct.
// Using explicit env vars is best practice for cloud.

export const OBSERVER_URL =
  (typeof window !== "undefined" &&
    (window as unknown as WindowWithEnv).env?.NEXT_PUBLIC_OBSERVER_URL) ||
  process.env.NEXT_PUBLIC_OBSERVER_URL ||
  API_URL; // Observer IS the main API usually

export const LISTENER_URL =
  (typeof window !== "undefined" &&
    (window as unknown as WindowWithEnv).env?.NEXT_PUBLIC_LISTENER_URL) ||
  process.env.NEXT_PUBLIC_LISTENER_URL ||
  (API_URL.includes("localhost")
    ? "http://localhost:8002"
    : API_URL.replace("/observer", "/listener"));

export const VERSOR_URL =
  (typeof window !== "undefined" &&
    (window as unknown as WindowWithEnv).env?.NEXT_PUBLIC_VERSOR_URL) ||
  process.env.NEXT_PUBLIC_VERSOR_URL ||
  (API_URL.includes("localhost")
    ? "http://localhost:8001"
    : API_URL.replace("/observer", "/versor"));

// Helper for constructing specific service URLs if needed
export const getServiceUrl = (path: string) => {
  const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${baseUrl}/${cleanPath}`;
};

export const getServiceWsUrl = (path: string) => {
  const baseUrl = WS_URL.endsWith("/") ? WS_URL.slice(0, -1) : WS_URL;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${baseUrl}/${cleanPath}`;
};
