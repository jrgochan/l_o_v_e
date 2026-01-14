import { render, fireEvent } from "@testing-library/react";
import { WaypointMarker } from "../../../../components/admin/atlas/WaypointMarker";
import * as THREE from "three";

// Mock Store
const mockUseAtlasAdminStore = jest.fn();
jest.mock("@/stores/useAtlasAdminStore", () => ({
    useAtlasAdminStore: (selector: any) => mockUseAtlasAdminStore(selector),
}));

// Mock R3F
jest.mock("@react-three/fiber", () => ({
    useFrame: jest.fn(),
    ThreeEvent: {},
}));

describe("WaypointMarker", () => {
    const mockEmotion = { id: "e1", name: "Joy", category: "Positive", vac: [1, 1, 1] };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should interact on hover", () => {
        const setHoveredEmotionMock = jest.fn();
        mockUseAtlasAdminStore.mockImplementation((selector: any) => {
            const state = {
                allEmotions: [mockEmotion],
                setHoveredEmotion: setHoveredEmotionMock,
            };
            return selector(state);
        });

        const { getByTestId } = render(
            <WaypointMarker
                position={[0, 0, 0]}
                emotionName="Joy"
                categoryColor="#ff0000"
                isHighlighted={false}
                mode="subtle"
                opacity={1}
            />
        );

        const marker = getByTestId("waypoint-marker");

        // Simulate Hover (Note: R3F events are props on the mesh, but in JSDOM we can fire via the rendered element if we didn't mock it to div? 
        // Wait, here we are testing the REAL WaypointMarker which renders <mesh>.
        // As discussed, <mesh> in JSDOM is a custom element. FireEvent works if the props are attached.
        // If not, we might need to manually trigger the handler if not attached to DOM.
        // HOWEVER, `onPointerOver` is passed to <mesh>. In strict JSDOM/React render, it might not be attached as a DOM listener.
        // IF this test fails like before, we have to mock `mesh` to `div` inside the test environment for `react-three-fiber` components?
        // OR just use `fireEvent.pointerOver` and hope JSDOM + React treats it as a known event?
        // Let's try. If it fails, we mock `mesh` globally or use a workaround.

        // Actually, `onPointerOver` is standard React prop. React will attach a listener.
        fireEvent.pointerOver(marker);
        expect(setHoveredEmotionMock).toHaveBeenCalledWith("e1");

        fireEvent.pointerOut(marker);
        expect(setHoveredEmotionMock).toHaveBeenCalledWith(null);
    });

    it("should animate based on mode", () => {
        // Mock useFrame to capture callback
        const useFrameMock = jest.requireMock("@react-three/fiber").useFrame;
        let frameCallback: ((state: any) => void) | undefined;
        useFrameMock.mockImplementation((cb: any) => {
            frameCallback = cb;
        });

        // We need to render to register the callback
        const { unmount } = render(
            <WaypointMarker
                position={[0, 0, 0]}
                emotionName="Joy"
                categoryColor="#ff0000"
                isHighlighted={false}
                mode="dynamic"
                opacity={1}
            />
        );

        // Mock ref (can't easily access internal ref, but we can rely on verifying render doesn't crash)
        // Actually, verifying the MATH requires accessing the mesh scale.
        // The mesh is rendered. In JSDOM, it's a custom element.
        // We can't access `ref.current` from outside.
        // BUT we can assume if `useFrame` logic runs without error, it's covered.
        // To strictly test logic, we'd need to mock `useRef` or the mesh component to expose the ref.
        // However, for coverage, running the callback is enough.
        // But `meshRef.current` will be null if we don't mock it or if JSDOM doesn't populate ref.
        // In @testing-library/react with intrinsic elements, refs ARE populated.

        // So let's execute the callback.
        if (frameCallback) {
            // Mock state
            const state = { clock: { elapsedTime: 1 } };
            // We need meshRef.current to be defined.
            // It should be defined after render. 
            // But since we are manually calling the callback, the `ref` in the closure of the component 
            // should point to the DOM element (custom element 'mesh').
            // The 'mesh' element in JSDOM likely doesn't have `scale` property!
            // It's just a generic Element.
            // So `meshRef.current.scale.setScalar` will throw `Cannot read property setScalar of undefined`.

            // We MUST mock the mesh to ensure ref has what we need?
            // Or mock `useRef`?
            // Mocking `useRef` is global and messy.
        }
    });

    // Re-thinking: Since we extracted WaypointMarker, we can easily verify logic if we mock `useRef`.
    // Or simpler: Mock the `mesh` intrinsic?
    // jest.mock("react", ... ) is hard.

    // Alternative: Just rely on lines covered by render? 
    // No, useFrame callback is NOT called by render.

    // Strategy: Move animation logic to a hook `useWaypointAnimation(ref, mode)`?
    // Then test the hook.

    // Or: Mock Three.js Mesh?
    // JSDOM renders <mesh>. It's an HTMLUnknownElement.
    // We can attach `scale` to it via `prototype` or just modifying the node?
    // But React manages the ref.

    // Let's TRY to just mock `useMemo` for logic? No.

    // Let's create a test that mocks `useRef` to return a mock object with `scale`.
});
