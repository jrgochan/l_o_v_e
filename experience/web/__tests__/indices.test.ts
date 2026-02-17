import * as CommandPalette from "@/components/command-palette";
import * as Input from "@/components/input";
import * as Journey from "@/components/journey";
import * as Strategy from "@/components/strategy";
import * as Viewer from "@/components/viewer";

describe("Indices", () => {
  it("exports modules", () => {
    expect(CommandPalette).toBeDefined();
    expect(Input).toBeDefined();
    expect(Journey).toBeDefined();
    expect(Strategy).toBeDefined();
    expect(Viewer).toBeDefined();
  });
});
