import { renderHook } from "@testing-library/react";
import { useNavigationActions } from "../../../hooks/navigation/useNavigationActions";

// Mock sub-hooks
jest.mock("../../../hooks/navigation/actions/useFocusActions", () => ({
    useFocusActions: () => ({
        focusEmotion: "mockFocus",
        autoFocusEmotion: "mockAutoFocus"
    })
}));

jest.mock("../../../hooks/navigation/actions/useSelectionActions", () => ({
    useSelectionActions: () => ({
        selectEmotionByName: "mockSelect",
        addToSelection: "mockAdd"
    })
}));

jest.mock("../../../hooks/navigation/actions/useViewActions", () => ({
    useViewActions: () => ({
        viewInSphere: "mockView",
        viewMultipleInSphere: "mockViewMultiple"
    })
}));

describe("useNavigationActions", () => {
    it("should compose actions from sub-hooks", () => {
        const { result } = renderHook(() => useNavigationActions({
            findEmotionByName: jest.fn(),
        }));

        expect(result.current.focusEmotion).toBe("mockFocus");
        expect(result.current.selectEmotionByName).toBe("mockSelect");
        expect(result.current.viewInSphere).toBe("mockView");
    });
});
