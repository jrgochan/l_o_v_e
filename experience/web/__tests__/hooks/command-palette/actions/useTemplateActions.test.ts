import { renderHook } from "@testing-library/react";
import { useTemplateActions } from "@/hooks/command-palette/actions/useTemplateActions";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { logger } from "@/utils/logger";

jest.mock("@/stores/useAtlasAdminStore");
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
    (useAtlasAdminStore.getState as jest.Mock).mockReturnValue({
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
});
