import { render, screen } from "@testing-library/react";
import AdminLayout from "@/app/admin/layout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { UserRole } from "@/types/auth";

// Mock AuthGuard to verify props
jest.mock("@/components/auth/AuthGuard", () => ({
  AuthGuard: jest.fn(({ children }) => <>{children}</>),
}));

describe("AdminLayout", () => {
  it("wraps children with AuthGuard requiring ADMIN role", () => {
    render(
      <AdminLayout>
        <div>Admin Page Content</div>
      </AdminLayout>
    );

    expect(screen.getByText("Admin Page Content")).toBeInTheDocument();

    // Check the mock call arguments directly
    const lastCall = (AuthGuard as jest.Mock).mock.lastCall;
    expect(lastCall[0]).toMatchObject({
      requiredRole: [UserRole.ADMIN, UserRole.CLINICIAN],
    });
  });
});
