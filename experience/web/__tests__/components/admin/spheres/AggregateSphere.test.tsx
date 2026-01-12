import { render } from "@testing-library/react";
import { AggregateSphere } from "@/components/admin/spheres/AggregateSphere";

// Aggressive Three.js Mock
const mockAdd = jest.fn();
const mockRender = jest.fn();
const mockSetSize = jest.fn();
const mockSetClearColor = jest.fn();
const mockDispose = jest.fn();

jest.mock("three", () => {
    return {
        Scene: jest.fn(() => ({
            add: mockAdd,
            remove: jest.fn(),
            dispose: jest.fn()
        })),
        PerspectiveCamera: jest.fn(() => ({
            position: { z: 0, set: jest.fn() }
        })),
        WebGLRenderer: jest.fn(() => ({
            setSize: mockSetSize,
            setClearColor: mockSetClearColor,
            render: mockRender,
            dispose: mockDispose,
            domElement: document.createElement("canvas")
        })),
        AmbientLight: jest.fn(),
        DirectionalLight: jest.fn(() => ({
            position: { set: jest.fn() }
        })),
        SphereGeometry: jest.fn(() => ({
            dispose: jest.fn()
        })),
        MeshPhongMaterial: jest.fn(() => ({
            dispose: jest.fn()
        })),
        Mesh: jest.fn(() => ({
            rotation: { y: 0 }
        })),
        BufferGeometry: jest.fn(() => ({
            setAttribute: jest.fn(),
            attributes: {
                position: {
                    count: 10,
                    array: new Float32Array(30),
                    needsUpdate: false
                }
            },
            dispose: jest.fn()
        })),
        Float32Array: Float32Array,
        BufferAttribute: jest.fn(),
        PointsMaterial: jest.fn(() => ({
            dispose: jest.fn()
        })),
        Points: jest.fn(() => ({
            geometry: {
                attributes: {
                    position: {
                        count: 10,
                        array: new Float32Array(30),
                        needsUpdate: false
                    }
                }
            }
        })),
        Color: jest.fn(() => ({
            getHex: jest.fn(() => 0xffffff)
        })),
        AdditiveBlending: 2
    };
});

describe("AggregateSphere", () => {
    const mockEmotions = [
        { id: "1", name: "Joy", vac: { valence: 0.8, arousal: 0.5, connection: 0.5 }, confidence: 0.9 }
    ];
    const mockAggregate = {
        vac: { valence: 0.6, arousal: 0.4, connection: 0.5 },
        top_emotions: mockEmotions,
        complexity_score: 0.3
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should render without crashing", () => {
        render(
            <AggregateSphere
                emotions={mockEmotions as any}
                aggregate={mockAggregate as any}
            />
        );
        // We mainly verify that the component mounted and initialized THREE resources
        // The mocks checks happen implicitly via construction
        expect(mockSetSize).toHaveBeenCalledWith(300, 300);
    });

    it("should clean up resources on unmount", () => {
        const { unmount } = render(
            <AggregateSphere
                emotions={mockEmotions as any}
                aggregate={mockAggregate as any}
            />
        );
        unmount();
        expect(mockDispose).toHaveBeenCalled();
    });
});
