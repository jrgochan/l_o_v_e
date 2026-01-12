import { renderHook } from "@testing-library/react";
import { useOllamaModels } from "@/hooks/useOllamaModels";
import { useOllamaCRUD } from "@/hooks/ollama/useOllamaCRUD";
import { useOllamaPull } from "@/hooks/ollama/useOllamaPull";

jest.mock("@/hooks/ollama/useOllamaCRUD");
jest.mock("@/hooks/ollama/useOllamaPull");

describe("useOllamaModels", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useOllamaCRUD as jest.Mock).mockReturnValue({
            localModels: [],
            loading: false,
            fetchLocalModels: jest.fn()
        });
        (useOllamaPull as jest.Mock).mockReturnValue({
            pulling: {},
            pullModel: jest.fn()
        });
    });

    it("should compose CRUD and Pull hooks", () => {
        const { result } = renderHook(() => useOllamaModels());

        expect(useOllamaCRUD).toHaveBeenCalled();
        expect(useOllamaPull).toHaveBeenCalled();
        expect(result.current.localModels).toEqual([]);
        expect(result.current.pulling).toEqual({});
    });
});
