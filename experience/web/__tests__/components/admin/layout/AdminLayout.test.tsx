
import { render, screen } from "@testing-library/react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { useAuthStore } from "@/stores/authStore";
import { usePathname } from "next/navigation";

// Mock dependencies
jest.mock("@/stores/authStore");
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));
jest.mock("@/components/admin/layout/AdminGuard", () => ({
  AdminGuard: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-guard">{children}</div>,
}));

describe("AdminLayout", () => {
  const mockUser = { id: "1", email: "admin@example.com" };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: mockUser });
    (usePathname as jest.Mock).mockReturnValue("/admin/users");
  });

  it("renders children wrapped in AdminGuard", () => {
    render(
      <AdminLayout>
        <div data-testid="child-content">Content</div>
      </AdminLayout>
    );

    expect(screen.getByTestId("admin-guard")).toBeInTheDocument();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("renders user information", () => {
    render(<AdminLayout>Content</AdminLayout>);
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });

  it("renders sidebar navigation with active states", () => {
    (usePathname as jest.Mock).mockReturnValue("/admin/users");
    render(<AdminLayout>Content</AdminLayout>);

    const usersLink = screen.getByRole("link", { name: /users/i });
    const sessionsLink = screen.getByRole("link", { name: /sessions/i });

    // Active link usually has text-cyan-400 or bg-cyan-900/30
    expect(usersLink.className).toContain("text-cyan-400");
    expect(sessionsLink.className).not.toContain("text-cyan-400");
  });

  it("updates active link based on pathname", () => {
    (usePathname as jest.Mock).mockReturnValue("/admin/data");
    render(<AdminLayout>Content</AdminLayout>);

    const dataLink = screen.getByRole("link", { name: /data management/i });
    expect(dataLink.className).toContain("text-cyan-400");
  });
});
