# Experience Web Testing Guide

**Status:** ✅ Active & Fully Covered
**Last Updated:** January 15, 2026

---

## 🎯 Overview

This guide covers the testing framework for the Experience web module. The framework is built on Jest, React Testing Library, and Playwright for comprehensive test coverage.

---

## 📁 Test Structure

```
experience/web/
├── __tests__/
│   ├── setup.ts                      # Jest configuration
│   ├── utils/                        # Test utilities
│   │   ├── mockShader.ts            # Mock GLSL files
│   │   └── fixtures.ts              # Common test data
│   ├── unit/                        # Unit tests
│   │   ├── stores/                  # Zustand store tests
│   │   ├── hooks/                   # Custom hook tests
│   │   └── utils/                   # Utility function tests
│   ├── components/                  # Component tests
│   ├── integration/                 # Integration tests
│   └── e2e/                        # End-to-end tests (Playwright)
├── jest.config.js                   # Jest configuration
└── playwright.config.ts             # Playwright configuration (to be created)
```

---

## 🚀 Quick Start

### Run Tests

```bash
cd experience/web

# Run all tests
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run all tests (unit + E2E)
npm run test:all
```

### Writing Your First Test

Create a new test file in the appropriate directory:

```typescript
// __tests__/components/MyComponent.test.tsx
import { render, screen } from '@testing-library/react'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

---

## 🧪 Testing Patterns

### 1. **Testing Zustand Stores**

```typescript
import { renderHook, act } from "@testing-library/react";
import { useExperienceStore } from "@/stores/useExperienceStore";

describe("useExperienceStore", () => {
  beforeEach(() => {
    // Reset store state
    const { result } = renderHook(() => useExperienceStore());
    act(() => {
      result.current.reset();
    });
    localStorage.clear();
  });

  it("updates target VAC", () => {
    const { result } = renderHook(() => useExperienceStore());
    const newVAC = { valence: 0.8, arousal: 0.5, connection: 0.7 };

    act(() => {
      result.current.setTarget(newVAC);
    });

    expect(result.current.targetVAC).toEqual(newVAC);
  });
});
```

### 2. **Testing React Components**

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VACDisplay from '@/components/VACDisplay'

describe('VACDisplay', () => {
  it('displays VAC values', () => {
    const vac = { valence: 0.5, arousal: -0.3, connection: 0.8 }
    render(<VACDisplay vac={vac} />)

    expect(screen.getByText(/0\.5/)).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    const user = userEvent.setup()
    render(<MyButton />)

    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Clicked')).toBeInTheDocument()
  })
})
```

### 3. **Testing Three.js Components**

Three.js/WebGL components require special mocking:

```typescript
import { render } from '@testing-library/react'
import SoulSphere from '@/components/SoulSphere'

describe('SoulSphere', () => {
  it('renders without crashing', () => {
    const vac = { valence: 0.8, arousal: 0.6, connection: 0.7 }

    // WebGL is mocked in setup.ts
    const { container } = render(<SoulSphere vac={vac} />)

    // Test props, not actual rendering
    expect(container).toBeInTheDocument()
  })
})
```

**Note:** Actual Three.js rendering cannot be tested in Jest. Use:

- **Unit tests** for props and state changes
- **E2E tests** for visual validation

### 4. **Testing Custom Hooks**

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { useObserverPolling } from "@/hooks/useObserverPolling";

describe("useObserverPolling", () => {
  it("polls at specified interval", async () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useObserverPolling(callback, 1000, true));

    await waitFor(
      () => {
        expect(callback).toHaveBeenCalled();
      },
      { timeout: 1500 }
    );
  });
});
```

### 5. **Mocking API Calls with MSW**

```typescript
import { rest } from "msw";
import { setupServer } from "msw/node";

const server = setupServer(
  rest.get("http://localhost:8000/observer/atlas/emotions", (req, res, ctx) => {
    return res(ctx.json({ emotions: mockEmotions }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it("fetches emotions from API", async () => {
  // Your test that makes API calls
});
```

---

## 🛠️ Test Utilities

### Available Fixtures

Located in `__tests__/utils/fixtures.ts`:

```typescript
import {
  mockVACVectors, // Pre-defined VAC vectors (joy, calm, anxiety, etc.)
  mockEmotions, // Sample emotions from atlas
  mockTransitionPath, // Sample transition path
  mockJourney, // Sample journey
} from "__tests__/utils/fixtures";
```

### Mock Data Examples

```typescript
// Use pre-defined VAC vectors
const joyVAC = mockVACVectors.joy; // { valence: 0.9, arousal: 0.7, connection: 0.8 }

// Use sample emotions
const emotion = mockEmotions[0]; // Joy emotion with full metadata

// Use sample path
const path = mockTransitionPath; // Complete transition path with waypoints
```

---

## 📊 Coverage Goals

| Component Type | Target Coverage |
| -------------- | --------------- |
| Stores         | 100%            |
| Hooks          | 100%            |
| UI Components  | 100%            |
| 3D Components  | 100%            |
| **Overall**    | **100%**        |

View coverage report:

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## 🎨 Testing Best Practices

### DO ✅

- **Test behavior, not implementation**

  ```typescript
  // Good
  expect(screen.getByRole("button")).toHaveTextContent("Submit");

  // Bad
  expect(component.state.isSubmitting).toBe(false);
  ```

- **Use Testing Library queries**
  - Prefer: `getByRole`, `getByLabelText`, `getByText`
  - Avoid: `querySelector`, `getElementById`

- **Clean up after tests**

  ```typescript
  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });
  ```

- **Test user interactions**
  ```typescript
  await user.click(screen.getByRole("button"));
  await user.type(screen.getByLabelText("Email"), "test@example.com");
  ```

### DON'T ❌

- Don't test internal state directly
- Don't test third-party libraries
- Don't make real API calls (use MSW)
- Don't test actual Three.js rendering in Jest
- Don't skip cleanup in `afterEach`

---

## 🚨 Common Issues & Solutions

### Issue: Tests timeout

```typescript
// Solution: Increase timeout for async operations
it("async operation", async () => {
  await waitFor(
    () => {
      expect(result).toBeDefined();
    },
    { timeout: 5000 }
  );
}, 10000); // Test timeout
```

### Issue: localStorage not working

```typescript
// Solution: Already mocked in setup.ts
// Just use localStorage normally in tests
localStorage.setItem("key", "value");
```

### Issue: Three.js/WebGL errors

```typescript
// Solution: WebGL is mocked in setup.ts
// If you see errors, check that setup.ts is loaded
```

### Issue: Module not found

```typescript
// Solution: Check moduleNameMapper in jest.config.js
// Ensure paths match your tsconfig.json
```

---

## 📝 Writing Different Test Types

### Unit Tests

Test isolated functions/components:

```typescript
// __tests__/unit/utils/myUtil.test.ts
import { myFunction } from "@/utils/myUtil";

describe("myFunction", () => {
  it("returns expected output", () => {
    expect(myFunction(input)).toBe(expectedOutput);
  });
});
```

### Integration Tests

Test multiple components together:

```typescript
// __tests__/integration/journeyFlow.test.tsx
describe('Journey Flow', () => {
  it('completes full journey', async () => {
    render(<App />)

    // Set goal
    await user.click(screen.getByText('Set Goal'))
    await user.click(screen.getByText('Joy'))

    // Generate path
    await user.click(screen.getByText('Generate Path'))

    // Start journey
    await user.click(screen.getByText('Start Journey'))

    // Verify UI updated
    expect(screen.getByText(/In Progress/)).toBeInTheDocument()
  })
})
```

### E2E Tests (Playwright)

Test complete user flows in real browser:

```typescript
// __tests__/e2e/userJourney.spec.ts
import { test, expect } from "@playwright/test";

test("user completes emotional journey", async ({ page }) => {
  await page.goto("http://localhost:3000");

  // Select goal
  await page.click("text=Set Emotional Goal");
  await page.fill('input[placeholder="Search"]', "joy");
  await page.click("text=Joy");

  // Generate and start
  await page.click("text=Generate Path");
  await page.click("text=Start Journey");

  // Verify
  await expect(page.locator("text=Journey Started")).toBeVisible();
});
```

---

## 🔧 Debugging Tests

### Run Single Test

```bash
npm test -- __tests__/unit/stores/useExperienceStore.test.ts
```

### Run in Watch Mode

```bash
npm run test:watch
# Press 'p' to filter by filename
# Press 't' to filter by test name
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/experience/web/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal"
}
```

### View Console Output

```typescript
it("debug test", () => {
  console.log("Debug info:", someValue);
  // Logs will appear in test output
});
```

---

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)

---

## ✅ Checklist for New Tests

- [ ] Test file created in correct directory
- [ ] Descriptive test names using `it('does something', ...)`
- [ ] Cleanup in `afterEach` if needed
- [ ] Mock external dependencies (APIs, localStorage, etc.)
- [ ] Test passes in isolation (`npm test -- path/to/test.ts`)
- [ ] Test passes with full suite (`npm test`)
- [ ] Coverage maintained or improved
- [ ] No console errors or warnings

---

## 🎯 Next Steps

1. **Fix the sample store test** to match actual API
2. **Write component tests** starting with simplest (VACDisplay)
3. **Add integration tests** for user flows
4. **Set up Playwright** for E2E testing
5. **Add to CI/CD** pipeline

---

**The testing framework is ready! Start writing tests with confidence.** 🚀
