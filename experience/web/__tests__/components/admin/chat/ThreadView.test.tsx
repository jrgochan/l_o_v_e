
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ThreadView } from "@/components/admin/chat/ThreadView";
import { api } from "@/utils/api";
import { DisplayMessage } from "@/types/chat";

// Mock the API client
jest.mock("@/utils/api", () => ({
    api: {
        get: jest.fn(),
    },
}));

// Mock ChatMessageList to avoid complex children rendering
jest.mock("@/components/admin/chat/ChatMessageList", () => ({
    ChatMessageList: ({ messages }: { messages: DisplayMessage[] }) => (
        <div data-testid="chat-message-list">
            {messages.map((m) => (
                <div key={m.id}>{m.content}</div>
            ))}
        </div>
    ),
}));

describe("ThreadView", () => {
    const mockOnClose = jest.fn();
    const mockMessages = [
        {
            id: "msg-1",
            type: "user",
            content: "Hello",
            timestamp: "2023-01-01T10:00:00Z",
        },
        {
            id: "msg-2",
            type: "analysis",
            content: "Hi there",
            timestamp: "2023-01-01T10:01:00Z",
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (api.get as jest.Mock).mockResolvedValue(mockMessages);
    });

    it("fetches thread data on mount", async () => {
        render(
            <ThreadView
                rootMessageId="root-1"
                onClose={mockOnClose}
                toneMode="warm"
                deepFeelingMode={true}
            />
        );

        expect(api.get).toHaveBeenCalledWith(
            expect.stringContaining("observer/chat/messages/root-1/thread")
        );

        await waitFor(() => {
            expect(screen.getByTestId("chat-message-list")).toBeInTheDocument();
        });

        expect(screen.getByText("Hello")).toBeInTheDocument();
        expect(screen.getByText("Hi there")).toBeInTheDocument();
    });

    it("handles loading state", () => {
        // Return a promise that never resolves to keep it loading
        (api.get as jest.Mock).mockReturnValue(new Promise(() => { }));

        render(
            <ThreadView
                rootMessageId="root-1"
                onClose={mockOnClose}
                toneMode="warm"
                deepFeelingMode={true}
            />
        );

        // There shouldn't be an explicit "Loading..." text in the simple component, 
        // maybe check for a spinner or the absence of the list
        // The component has a spinner div
        const spinner = document.querySelector(".animate-spin");
        // Since using testing-library, better way:
        // We can't query by class easily without setup, but we know list is not there
        expect(screen.queryByTestId("chat-message-list")).not.toBeInTheDocument();
    });

    it("handles error state", async () => {
        (api.get as jest.Mock).mockRejectedValue(new Error("API Error"));

        render(
            <ThreadView
                rootMessageId="root-1"
                onClose={mockOnClose}
                toneMode="warm"
                deepFeelingMode={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByText("Could not load thread context.")).toBeInTheDocument();
        });
    });

    it("calls onClose when close button is clicked", async () => {
        render(
            <ThreadView
                rootMessageId="root-1"
                onClose={mockOnClose}
                toneMode="warm"
                deepFeelingMode={true}
            />
        );

        // Wait for fetch to complete to avoid act warning
        await waitFor(() => {
            expect(screen.getByTestId("chat-message-list")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("✕"));
        expect(mockOnClose).toHaveBeenCalled();
    });

    it("does not fetch if rootMessageId is missing", () => {
        render(
            <ThreadView
                rootMessageId=""
                onClose={mockOnClose}
                toneMode="warm"
                deepFeelingMode={true}
            />
        );

        expect(api.get).not.toHaveBeenCalled();
    });
});
