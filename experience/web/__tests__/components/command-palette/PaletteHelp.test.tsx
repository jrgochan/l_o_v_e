
import { render, screen } from "@testing-library/react";
import { PaletteHelp } from "@/components/command-palette/PaletteHelp";

describe("PaletteHelp", () => {
    it("renders correctly with all sections", () => {
        render(<PaletteHelp />);

        // Header
        expect(screen.getByText("🎹 Command Palette Guide")).toBeInTheDocument();

        // Sections
        expect(screen.getByText("🚀 Getting Started")).toBeInTheDocument();
        expect(screen.getByText("📌 Basic Navigation")).toBeInTheDocument();
        expect(screen.getByText("⌨️ Advanced: Modifier Keys")).toBeInTheDocument();
        expect(screen.getByText("🔍 Power Search Operators")).toBeInTheDocument();
        expect(screen.getByText("🛤️ Journey Control")).toBeInTheDocument();
        expect(screen.getByText("🗺️ Pre-Built Templates")).toBeInTheDocument();
        expect(screen.getByText("📝 Therapeutic Sessions")).toBeInTheDocument();
        expect(screen.getByText("⚡ Quick Actions")).toBeInTheDocument();
        expect(screen.getByText("💡 Pro Workflow Tips")).toBeInTheDocument();
        expect(screen.getByText("🎯 Example Workflow")).toBeInTheDocument();
    });

    it("displays key shortcuts", () => {
        render(<PaletteHelp />);

        // Check for some shortcuts
        expect(screen.getAllByText("CMD+K").length).toBeGreaterThan(0);
        expect(screen.getAllByText("⌘+Enter").length).toBeGreaterThan(0);
        expect(screen.getAllByText("⌥+Enter").length).toBeGreaterThan(0);
    });

    it("displays command examples", () => {
        render(<PaletteHelp />);

        expect(screen.getAllByText("/journey start").length).toBeGreaterThan(0);
        expect(screen.getAllByText("~joy").length).toBeGreaterThan(0);
        expect(screen.getAllByText("valence>0.5").length).toBeGreaterThan(0);
    });
});
