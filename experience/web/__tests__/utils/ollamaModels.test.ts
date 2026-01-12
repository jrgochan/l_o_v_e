import {
    OLLAMA_MODEL_CATALOG,
    searchOllamaModels,
    getModelsByFamily,
    getRecommendedModelsForFunction
} from "@/utils/ollamaModels";

describe("ollamaModels", () => {
    it("should contain popular models", () => {
        expect(OLLAMA_MODEL_CATALOG.length).toBeGreaterThan(5);
        expect(OLLAMA_MODEL_CATALOG.find(m => m.name === "llama3.1:8b")).toBeDefined();
    });

    describe("searchOllamaModels", () => {
        it("should return popular models for short query", () => {
            const results = searchOllamaModels("a");
            expect(results.length).toBe(4);
        });

        it("should filter by name", () => {
            const results = searchOllamaModels("phi");
            expect(results.some(m => m.name === "phi3:mini")).toBe(true);
            expect(results.every(m => m.family.includes("phi") || m.name.includes("phi"))).toBe(true);
        });

        it("should filter by tag", () => {
            const results = searchOllamaModels("clinical");
            expect(results.some(m => m.name === "llama3.1:70b-instruct-q4_0")).toBe(true);
        });
    });

    describe("getModelsByFamily", () => {
        it("should match family case-insensitive", () => {
            const results = getModelsByFamily("Llama");
            expect(results.length).toBeGreaterThan(0);
            expect(results.every(m => m.family === "llama")).toBe(true);
        });
    });

    describe("getRecommendedModelsForFunction", () => {
        it("should find recommended models", () => {
            const results = getRecommendedModelsForFunction("insight_generation");
            expect(results.some(m => m.name.includes("70b") || m.name.includes("mixtral"))).toBe(true);
        });
    });
});
