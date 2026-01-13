import { render, screen } from "@testing-library/react";
import { LoggerProvider } from "../../components/LoggerProvider";
import { useLoggerInit } from "@/hooks/useLoggerInit";

// Mock Hook
jest.mock("@/hooks/useLoggerInit", () => ({
    useLoggerInit: jest.fn(),
}));

describe("LoggerProvider", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should render children", () => {
        render(
            <LoggerProvider>
                <div data-testid="child">Child</div>
            </LoggerProvider>
        );

        expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("should initialize logger", () => {
        render(
            <LoggerProvider>
                <div />
            </LoggerProvider>
        );

        expect(useLoggerInit).toHaveBeenCalled();
    });
});
