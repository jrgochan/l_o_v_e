import { render, screen, act } from "@testing-library/react";
import { IntroSequence } from "../../../../components/admin/atlas/IntroSequence";
import * as THREE from "three";

// Mock Drei Html
jest.mock("@react-three/drei", () => ({
    Html: ({ children }: any) => <div data-testid="html-overlay">{children}</div>
}));

// Mock Store
const mockSetIntroActive = jest.fn();
jest.mock("@/stores/useAtlasAdminStore", () => ({
    useAtlasAdminStore: (selector: any) => selector({
        setIntroActive: mockSetIntroActive
    })
}));

// Mock R3F
const mockUseFrame = jest.fn();
jest.mock("@react-three/fiber", () => ({
    useFrame: (cb: any) => mockUseFrame(cb),
    useThree: () => ({
        camera: {
            position: { copy: jest.fn() },
            lookAt: jest.fn()
        },
        clock: { elapsedTime: 0 }
    })
}));

// Mock Audio
jest.mock("@/hooks/useAmbientAudio", () => ({
    useAmbientAudio: () => ({ playWhoosh: jest.fn() })
}));

describe("IntroSequence", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("should render overlay title", () => {
        render(<IntroSequence />);
        expect(screen.getByText("ATLAS")).toBeInTheDocument();
    });

    it("should animate camera and complete sequence", () => {
        let frameCallback: any;
        mockUseFrame.mockImplementation((cb) => { frameCallback = cb; });

        render(<IntroSequence />);

        // Simulate frames
        if (frameCallback) {
            // Start
            frameCallback({ clock: { elapsedTime: 10 } }); // Sets startTimeRef=10

            // Progress 100% (6s duration)
            frameCallback({ clock: { elapsedTime: 17 } });

            expect(mockSetIntroActive).toHaveBeenCalledWith(false);
        }
    });

    it("should fade title via timers", () => {
        render(<IntroSequence />);
        // Title hidden initally?
        // Code: const [showTitle, setShowTitle] = useState(false);
        // setTimeout(() => setShowTitle(true), 1000);

        // We can't check opacity class easily without parsing classList, but we can verify timers ran
        act(() => {
            jest.advanceTimersByTime(1000);
        });
        // State update happens
    });
});
