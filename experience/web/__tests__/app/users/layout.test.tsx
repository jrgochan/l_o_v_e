import { render, screen } from "@testing-library/react";
import UsersLayout from "@/app/users/layout";

jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: jest.fn() }),
    usePathname: () => "/users",
}));

jest.mock("@/stores/authStore", () => ({
    useAuthStore: jest.fn((selector) => {
        const state = {
            isAuthenticated: () => true,
            isLoading: false,
            token: "valid-token",
            user: { role: "user" }
        };
        return selector ? selector(state) : state;
    }),
}));

describe("UsersLayout", () => {
    it("renders children correctly", async () => {
        render(
            <UsersLayout>
                <div data-testid="child-content">User Content</div>
            </UsersLayout>
        );

        expect(await screen.findByTestId("child-content")).toBeInTheDocument();
        expect(screen.getByText("User Content")).toBeInTheDocument();
    });
});
