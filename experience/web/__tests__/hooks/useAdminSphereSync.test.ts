import { renderHook } from "@testing-library/react";
import { useAdminSphereSync } from "@/hooks/useAdminSphereSync";
import { useSelectionSync } from "@/hooks/sync/useSelectionSync";
import { usePathSync } from "@/hooks/sync/usePathSync";

jest.mock("@/hooks/sync/useSelectionSync");
jest.mock("@/hooks/sync/usePathSync");

describe("useAdminSphereSync", () => {
  it("should call sync hooks", () => {
    renderHook(() => useAdminSphereSync());
    expect(useSelectionSync).toHaveBeenCalled();
    expect(usePathSync).toHaveBeenCalled();
  });
});
