import { renderHook, act } from "@testing-library/react";
import { useChatResize } from "@/hooks/chat/layout/useChatResize";
import { fireEvent } from "@testing-library/react";

describe("useChatResize", () => {
  it("should initialize with default height", () => {
    const { result } = renderHook(() => useChatResize({ isExpanded: true, defaultHeight: 100 }));
    expect(result.current.height).toBe(100);
    expect(result.current.isResizing).toBe(false);
  });

  it("should start resizing on handleMouseDown if expanded", () => {
    const { result } = renderHook(() => useChatResize({ isExpanded: true }));

    act(() => {
      // @ts-ignore - simulating mouse event enough for hook
      result.current.handleMouseDown({ clientY: 500 } as any);
    });

    expect(result.current.isResizing).toBe(true);
    expect(document.body.style.cursor).toBe("row-resize");
  });

  it("should NOT start resizing if collapsed", () => {
    const { result } = renderHook(() => useChatResize({ isExpanded: false }));

    act(() => {
      // @ts-ignore
      result.current.handleMouseDown({ clientY: 500 } as any);
    });

    expect(result.current.isResizing).toBe(false);
  });

  it("should update height on mouse move (drag up)", () => {
    const { result } = renderHook(() =>
      useChatResize({ isExpanded: true, defaultHeight: 300, minHeight: 100, maxHeight: 600 })
    );

    // Start resize at Y=500, Height=300
    act(() => {
      // @ts-ignore
      result.current.handleMouseDown({ clientY: 500 } as any);
    });

    // Move to Y=400 (drag up 100px) -> Height should increase by 100
    act(() => {
      fireEvent.mouseMove(document, { clientY: 400 });
    });

    // 300 + (500 - 400) = 400
    expect(result.current.height).toBe(400);
  });

  it("should clamp height to min/max", () => {
    const { result } = renderHook(() =>
      useChatResize({ isExpanded: true, defaultHeight: 300, minHeight: 200, maxHeight: 400 })
    );

    act(() => {
      // @ts-ignore
      result.current.handleMouseDown({ clientY: 500 } as any);
    });

    // Drag way up -> Max
    act(() => {
      fireEvent.mouseMove(document, { clientY: 100 }); // +400 pixels
    });
    expect(result.current.height).toBe(400); // capped at max

    // Drag way down -> Min
    act(() => {
      fireEvent.mouseMove(document, { clientY: 900 }); // -400 pixels
    });
    expect(result.current.height).toBe(200); // capped at min
  });

  it("should stop resizing on mouse up", () => {
    const { result } = renderHook(() => useChatResize({ isExpanded: true }));

    act(() => {
      // @ts-ignore
      result.current.handleMouseDown({ clientY: 500 } as any);
    });
    expect(result.current.isResizing).toBe(true);

    act(() => {
      fireEvent.mouseUp(document);
    });
    expect(result.current.isResizing).toBe(false);
    expect(document.body.style.cursor).toBe("auto");
  });

  it("should cleanup event listeners on unmount", () => {
    const { result, unmount } = renderHook(() => useChatResize({ isExpanded: true }));

    act(() => {
      // @ts-ignore
      result.current.handleMouseDown({ clientY: 500 } as any);
    });

    const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));
  });
});
