/**
 * Jest Test Setup
 * Configures the test environment with necessary mocks and polyfills
 */

import "@testing-library/jest-dom";
import "jest-canvas-mock";

// Mock Three.js WebGL context
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = jest.fn((contextId: string) => {
    if (contextId === "webgl" || contextId === "webgl2") {
      return {
        canvas: document.createElement("canvas"),
        drawingBufferWidth: 800,
        drawingBufferHeight: 600,
        getExtension: jest.fn(() => ({})),
        getParameter: jest.fn(),
        getShaderPrecisionFormat: jest.fn(() => ({
          rangeMin: 1,
          rangeMax: 1,
          precision: 1,
        })),
        createShader: jest.fn(),
        shaderSource: jest.fn(),
        compileShader: jest.fn(),
        getShaderParameter: jest.fn(() => true),
        createProgram: jest.fn(),
        attachShader: jest.fn(),
        linkProgram: jest.fn(),
        getProgramParameter: jest.fn(() => true),
        useProgram: jest.fn(),
        createBuffer: jest.fn(),
        bindBuffer: jest.fn(),
        bufferData: jest.fn(),
        enableVertexAttribArray: jest.fn(),
        vertexAttribPointer: jest.fn(),
        createTexture: jest.fn(),
        bindTexture: jest.fn(),
        texImage2D: jest.fn(),
        texParameteri: jest.fn(),
        clear: jest.fn(),
        clearColor: jest.fn(),
        enable: jest.fn(),
        disable: jest.fn(),
        depthFunc: jest.fn(),
        viewport: jest.fn(),
        drawArrays: jest.fn(),
        drawElements: jest.fn(),
      } as any;
    }
    if (contextId === "2d") {
      return {
        canvas: document.createElement("canvas"),
        fillStyle: "",
        fillRect: jest.fn(),
        clearRect: jest.fn(),
        getImageData: jest.fn(),
        putImageData: jest.fn(),
        createImageData: jest.fn(),
        setTransform: jest.fn(),
        drawImage: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        stroke: jest.fn(),
        translate: jest.fn(),
        scale: jest.fn(),
        rotate: jest.fn(),
        arc: jest.fn(),
        fill: jest.fn(),
        measureText: jest.fn(() => ({ width: 0 })),
        transform: jest.fn(),
        rect: jest.fn(),
        clip: jest.fn(),
        disable: jest.fn(),
      } as any;
    }
    return null;
  });
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

if (typeof window !== "undefined") {
  // Mock window.matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
  });
}

// Mock window.ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock global fetch (if not already defined)
if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
      headers: new Headers(),
    })
  ) as any;
  (global.fetch as jest.Mock).mockName("fetch");
}

// Suppress console errors and warnings in tests (unless explicitly needed)
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn((...args) => {
    // Allow through specific errors we want to see
    if (
      args[0]?.includes?.("Not implemented: HTMLFormElement.prototype.requestSubmit") ||
      args[0]?.includes?.("Not implemented: HTMLCanvasElement.prototype.getContext") ||
      args[0]?.includes?.("The tag <") || // R3F/JSDOM unrecognized tag warning
      args[0]?.includes?.("is using incorrect casing") || // R3F casing warning
      args[0]?.includes?.("React does not recognize the") || // R3F prop warning generic
      args[0]?.includes?.("for a non-boolean attribute") // R3F boolean prop warning generic
    ) {
      return;
    }
    originalError(...args);
  });

  console.warn = jest.fn((...args) => {
    // Filter out known warnings
    if (args[0]?.includes?.("ReactDOM.render")) {
      return;
    }
    originalWarn(...args);
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Clear mocks between tests
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
});
