import { renderHook } from "@testing-library/react";
import { useGraphSimulation } from "@/hooks/visualizations/useGraphSimulation";
import * as d3 from "d3";

// We need to mock D3's forceSimulation
// This is complex because d3 is a namespace import
// We'll rely on our __mocks__/d3.js if it exists, or create a specific mock here.
// Assuming __mocks__/d3.js handles basics, but forceSimulation needs chaining.

const mockSimulation = {
  force: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  stop: jest.fn(),
  alphaTarget: jest.fn().mockReturnThis(),
  restart: jest.fn().mockReturnThis(),
};

const mockForceLink = {
  id: jest.fn().mockReturnThis(),
  distance: jest.fn().mockReturnThis(),
};

const mockForceCollide = {
  radius: jest.fn().mockReturnThis(),
};

jest.mock("d3", () => ({
  forceSimulation: jest.fn(() => mockSimulation),
  forceLink: jest.fn(() => mockForceLink),
  forceManyBody: jest.fn().mockReturnValue({ strength: jest.fn() }),
  forceCenter: jest.fn(),
  forceCollide: jest.fn(() => mockForceCollide),
  drag: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
  })),
}));

describe("useGraphSimulation", () => {
  const mockNodes = [{ id: "1", radius: 10 }] as any[];
  const mockLinks = [] as any[];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize simulation on mount", () => {
    renderHook(() =>
      useGraphSimulation({
        nodes: mockNodes,
        links: mockLinks,
        width: 800,
        height: 600,
      })
    );

    expect(d3.forceSimulation).toHaveBeenCalledWith(mockNodes);
    expect(mockSimulation.force).toHaveBeenCalledTimes(4); // link, charge, center, collision
  });

  it("should attach onTick handler", () => {
    const onTick = jest.fn();
    renderHook(() =>
      useGraphSimulation({
        nodes: mockNodes,
        links: mockLinks,
        width: 800,
        height: 600,
        onTick,
      })
    );

    expect(mockSimulation.on).toHaveBeenCalledWith("tick", onTick);
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() =>
      useGraphSimulation({
        nodes: mockNodes,
        links: mockLinks,
        width: 800,
        height: 600,
      })
    );

    unmount();
    expect(mockSimulation.stop).toHaveBeenCalled();
  });

  it("should provide drag behavior factory and handle events", () => {
    const { result } = renderHook(() =>
      useGraphSimulation({
        nodes: mockNodes,
        links: mockLinks,
        width: 800,
        height: 600,
      })
    );

    const mockOn = jest.fn().mockReturnThis();
    (d3.drag as unknown as jest.Mock).mockReturnValue({ on: mockOn });

    result.current.createDragBehavior();

    // Check if listeners were attached
    expect(mockOn).toHaveBeenCalledWith("start", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("drag", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("end", expect.any(Function));

    // Get the handlers
    const startHandler = mockOn.mock.calls.find((call) => call[0] === "start")[1];
    const dragHandler = mockOn.mock.calls.find((call) => call[0] === "drag")[1];
    const endHandler = mockOn.mock.calls.find((call) => call[0] === "end")[1];

    const mockSubject = { x: 10, y: 20, fx: null, fy: null };
    const mockEvent = { active: 0, subject: mockSubject, x: 50, y: 60 };

    // Test drag start
    startHandler(mockEvent);
    expect(mockSimulation.alphaTarget).toHaveBeenCalledWith(0.3);
    expect(mockSimulation.restart).toHaveBeenCalled();
    expect(mockSubject.fx).toBe(10);
    expect(mockSubject.fy).toBe(20);

    // Test drag move
    dragHandler(mockEvent);
    expect(mockSubject.fx).toBe(50);
    expect(mockSubject.fy).toBe(60);

    // Test drag end
    endHandler(mockEvent);
    expect(mockSimulation.alphaTarget).toHaveBeenCalledWith(0);
    expect(mockSubject.fx).toBeNull();
    expect(mockSubject.fy).toBeNull();

    // Test drag with active simulation (should not restart)
    // Checking if branch (!event.active) false path is taken
    mockSimulation.restart.mockClear();
    mockSimulation.alphaTarget.mockClear();

    startHandler({ ...mockEvent, active: 1 });
    expect(mockSimulation.restart).not.toHaveBeenCalled();

    endHandler({ ...mockEvent, active: 1 });
    // Assuming alphaTarget(0) is only called if !active
    expect(mockSimulation.alphaTarget).not.toHaveBeenCalled();
  });

  it("should return default drag if simulation is missing", () => {
    // Mock simulation to be undefined initially (hard to force with the hook logic,
    // but we can call createDragBehavior before the effect runs? No, useRef init is synchronous)
    // Actually, we can just verify the logic branch by mocking useRef implementation or checking returned obj.
    // But let's rely on standard behavior:
    const { result } = renderHook(() =>
      useGraphSimulation({
        nodes: [], // No nodes = return early in effect = simulationRef.current stays undefined
        links: [],
        width: 800,
        height: 600,
      })
    );

    result.current.createDragBehavior();
    // Should just call d3.drag() and return it without attaching listeners
    expect(d3.drag).toHaveBeenCalled();
    // The mock returns an object with .on, but in the source it returns d3.drag() result immediately
    // if !simulation.
  });

  it("should configure forces correctly", () => {
    renderHook(() =>
      useGraphSimulation({
        nodes: mockNodes,
        links: mockLinks,
        width: 800,
        height: 600,
      })
    );

    // Verify link force config
    expect(mockForceLink.id).toHaveBeenCalled();
    const idFn = (mockForceLink.id as jest.Mock).mock.calls[0][0];
    expect(idFn({ id: "test" })).toBe("test"); // Cover the ID accessor

    expect(mockForceLink.distance).toHaveBeenCalledWith(100);

    // Verify collide force radius accessor
    expect(d3.forceCollide).toHaveBeenCalled();
    const radiusFn = (mockForceCollide.radius as jest.Mock).mock.calls[0][0];
    expect(radiusFn({ radius: 10 })).toBe(20); // 10 + 10 constant
  });

  it("should stop existing simulation when re-initializing", () => {
    const { rerender } = renderHook((props) => useGraphSimulation(props), {
      initialProps: {
        nodes: mockNodes,
        links: mockLinks,
        width: 800,
        height: 600,
      },
    });

    // Reset mocks to clear initial setup calls
    jest.clearAllMocks();

    // Rerender with different props to trigger effect re-run
    rerender({
      nodes: [...mockNodes, { id: "2" }],
      links: mockLinks,
      width: 800,
      height: 600,
    });

    // Check if stop was called on the *previous* simulation instance
    // Since mockSimulation is reused, we check if stop was called.
    expect(mockSimulation.stop).toHaveBeenCalled();
  });
});
