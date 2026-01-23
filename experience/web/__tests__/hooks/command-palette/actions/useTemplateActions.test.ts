import { renderHook } from "@testing-library/react";
import { useTemplateActions } from "@/hooks/command-palette/actions/useTemplateActions";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { logger } from "@/utils/logger";

jest.mock("@/stores/useVisualizationStore");
jest.mock("@/utils/logger");
jest.mock("@/data/journey-templates", () => ({
  JOURNEY_TEMPLATES: [{ id: "t1", name: "T1", from_emotion: "Anxiety", to_emotion: "Calmness" }],
  getTemplateById: jest.fn((id) => {
    if (id === "t1")
      return { id: "t1", name: "T1", from_emotion: "Anxiety", to_emotion: "Calmness" };
    return null;
  }),
}));

describe("useTemplateActions", () => {
  const mockClose = jest.fn();
  const mockSelectMultiple = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useVisualizationStore.getState as jest.Mock).mockReturnValue({
      allEmotions: [
        { id: "e1", name: "Anxiety" },
        { id: "e2", name: "Calmness" },
      ],
    });
  });

  const getHook = () =>
    renderHook(() =>
      useTemplateActions({
        close: mockClose,
        selectMultiple: mockSelectMultiple,
      })
    );

  it("should list templates", async () => {
    const { result } = getHook();
    await result.current.executeTemplateCommand("/templates");
    expect(logger.info).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("should load template", async () => {
    const { result } = getHook();
    await result.current.executeTemplateCommand("/template t1");

    expect(mockSelectMultiple).toHaveBeenCalledWith(["e1", "e2"]);
    expect(mockClose).toHaveBeenCalled();
  });

  it("should ignore unknown template", async () => {
    const { result } = getHook();
    await result.current.executeTemplateCommand("/template unknown");

    expect(mockSelectMultiple).not.toHaveBeenCalled();
  });

  it("should ignore command not matching template syntax", async () => {
    const { result } = getHook();
    await result.current.executeTemplateCommand("/other command");

    expect(mockSelectMultiple).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();
  });

  it("should not select if emotions missing", async () => {
    (useVisualizationStore.getState as jest.Mock).mockReturnValue({
      allEmotions: [], // Empty emotions
    });
    const { result } = getHook();
    await result.current.executeTemplateCommand("/template t1");

    expect(mockSelectMultiple).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();
  });
});
