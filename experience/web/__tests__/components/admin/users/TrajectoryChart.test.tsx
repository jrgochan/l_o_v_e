import { render, screen } from "@testing-library/react";
import { TrajectoryChart } from "@/components/admin/users/TrajectoryChart";
import { VACHistoryPoint } from "@/types/chat";

// Mock D3 to avoid ESM issues in Jest
// We need a chainable mock for selection and scale functions
const mockSelection = {
  selectAll: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  remove: jest.fn().mockReturnThis(),
  attr: jest.fn().mockReturnThis(),
  append: jest.fn().mockReturnThis(),
  style: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  datum: jest.fn().mockReturnThis(),
  call: jest.fn().mockReturnThis(),
  data: jest.fn().mockReturnThis(),
  enter: jest.fn().mockReturnThis(),
  transition: jest.fn().mockReturnThis(),
  duration: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
};

const mockScale = jest.fn(() => 10);
(mockScale as any).domain = jest.fn().mockReturnThis();
(mockScale as any).range = jest.fn().mockReturnThis();

const mockLine = jest.fn(() => "M0,0L10,10");
(mockLine as any).x = jest.fn().mockReturnThis();
(mockLine as any).y = jest.fn().mockReturnThis();
(mockLine as any).curve = jest.fn().mockReturnThis();

const mockAxis = jest.fn();
(mockAxis as any).ticks = jest.fn().mockReturnThis();
(mockAxis as any).tickSize = jest.fn().mockReturnThis();
(mockAxis as any).tickFormat = jest.fn().mockReturnThis();
(mockAxis as any).scale = jest.fn().mockReturnThis();

jest.mock("d3", () => ({
  select: jest.fn(() => mockSelection),
  selectAll: jest.fn(() => mockSelection),
  scaleTime: jest.fn(() => mockScale),
  scaleLinear: jest.fn(() => mockScale),
  axisBottom: jest.fn(() => mockAxis),
  axisLeft: jest.fn(() => mockAxis),
  line: jest.fn(() => mockLine),
  curveMonotoneX: jest.fn(),
  extent: jest.fn(() => [new Date(), new Date()]),
}));

// Mock data
const mockData: VACHistoryPoint[] = [
  {
    timestamp: new Date("2024-01-01T10:00:00Z"),
    vac: { valence: 0.5, arousal: 0.2, connection: 0.1 },
    emotion: "joy",
    confidence: 0.9,
  },
  {
    timestamp: new Date("2024-01-01T10:05:00Z"),
    vac: { valence: 0.7, arousal: 0.3, connection: 0.2 },
    emotion: "excited",
    confidence: 0.85,
  },
  {
    timestamp: new Date("2024-01-01T10:10:00Z"),
    vac: { valence: -0.2, arousal: 0.8, connection: 0.0 }, // Drop in valence, spike in arousal
    emotion: "anxious",
    confidence: 0.7,
  },
];

describe("TrajectoryChart", () => {
  beforeAll(() => {
    // Mock clientWidth for D3
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      value: 400,
    });
  });

  beforeEach(() => {
    // Clear all mock calls before each test
    jest.clearAllMocks();
  });

  it("renders chart title", () => {
    render(<TrajectoryChart data={mockData} />);
    expect(screen.getByText("Emotional Trajectory (Time Series)")).toBeInTheDocument();
  });

  it("renders SVG elements (calls D3 methods) when data is provided", async () => {
    render(<TrajectoryChart data={mockData} />);

    // Since we mocked D3, elements aren't actually added to DOM.
    // We verify D3 methods were called correctly.

    // 1. Check if axis generators were created
    // axisBottom(x) and axisLeft(y)
    // We can't easily check args to axisBottom without mocking scale returns, but we can check calls.

    // 2. Check if text("Valence") and text("Arousal") were called
    // We mocked 'text' on selection
    const selection = require("d3").select(); // get the mock selection object (it's the same object)

    expect(selection.text).toHaveBeenCalledWith("Valence");
    expect(selection.text).toHaveBeenCalledWith("Arousal");

    // 3. Check if paths were drawn
    // We mocked 'line' generator, and 'attr("d", valenceLine)'
    // The component calls: .attr("d", valenceLine)
    // We can't check arguments easily because valenceLine is a function.
    // But we can check if .append("path") was called at least 2 times
    expect(selection.append).toHaveBeenCalledWith("path");
  });

  it("renders nothing (or empty) if data is empty", () => {
    render(<TrajectoryChart data={[]} />);
    expect(screen.getByText("Emotional Trajectory (Time Series)")).toBeInTheDocument();

    // Check that we cleared the chart: .selectAll("*").remove()
    // It happens in useEffect.
    // If empty, it returns early!
    // Wait, line 16: if (!data || data.length === 0 ...) return;
    // So d3.select is NOT called if data is empty or refs null.

    // Reset mocks before this test to specific state if needed, but they persist.
    // We can check that calls didn't happen if we clear them in beforeEach.
    // Ideally we should clear mocks in beforeEach.
    expect(require("d3").select).not.toHaveBeenCalled();
    expect(require("d3").selectAll).not.toHaveBeenCalled();
  });
});
