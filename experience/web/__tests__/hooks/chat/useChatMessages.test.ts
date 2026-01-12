import { renderHook, act } from "@testing-library/react";
import { useChatMessages, DisplayMessage } from "../../../hooks/chat/useChatMessages";

describe("useChatMessages", () => {
  const mockMessage: DisplayMessage = {
    id: "1",
    type: "user",
    content: "Hello",
    timestamp: new Date(),
  };

  it("should initialize with empty messages", () => {
    const { result } = renderHook(() => useChatMessages(false));
    expect(result.current.messages).toEqual([]);
  });

  it("should add messages", () => {
    const { result } = renderHook(() => useChatMessages(false));

    act(() => {
      result.current.addMessage(mockMessage);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toEqual(mockMessage);
  });

  it("should clear messages", () => {
    const { result } = renderHook(() => useChatMessages(false));

    act(() => {
      result.current.addMessage(mockMessage);
    });
    expect(result.current.messages).toHaveLength(1);

    act(() => {
      result.current.clearMessages();
    });
    expect(result.current.messages).toHaveLength(0);
  });

  it("should scroll to bottom when expanded and messages change", () => {
    const scrollIntoView = jest.fn();
    const { result } = renderHook(() => useChatMessages(true)); // isExpanded = true

    // Manually mock ref
    Object.defineProperty(result.current.messagesEndRef, "current", {
      value: { scrollIntoView },
      writable: true,
    });

    act(() => {
      result.current.addMessage(mockMessage);
    });

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  });

  it("should NOT scroll to bottom when collapsed", () => {
    const scrollIntoView = jest.fn();
    const { result } = renderHook(() => useChatMessages(false)); // isExpanded = false

    Object.defineProperty(result.current.messagesEndRef, "current", {
      value: { scrollIntoView },
      writable: true,
    });

    act(() => {
      result.current.addMessage(mockMessage);
    });

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
