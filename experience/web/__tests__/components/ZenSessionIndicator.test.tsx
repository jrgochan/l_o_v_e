import { render, screen, act } from "@testing-library/react";
import { ZenSessionIndicator } from "../../components/ZenSessionIndicator";

describe("ZenSessionIndicator", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should render nothing when not visible", () => {
    const { container } = render(<ZenSessionIndicator lastSync={Date.now()} visible={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("should show 'Following Admin Session' initially", () => {
    render(<ZenSessionIndicator lastSync={Date.now()} visible={true} />);
    expect(screen.getByText("Following Admin Session")).toBeInTheDocument();
  });

  it("should show elapsed time", () => {
    const now = Date.now();
    render(<ZenSessionIndicator lastSync={now} visible={true} />);

    act(() => {
      jest.advanceTimersByTime(5000); // 5s
    });

    expect(screen.getByText("Updated 5s ago")).toBeInTheDocument();
  });

  it("should show waiting state after 30s", () => {
    const now = Date.now();
    render(<ZenSessionIndicator lastSync={now} visible={true} />);

    act(() => {
      jest.advanceTimersByTime(31000); // 31s
    });

    expect(screen.getByText("Waiting for Admin Session...")).toBeInTheDocument();
  });

  it("should show stale state after 10s", () => {
    const now = Date.now();
    render(<ZenSessionIndicator lastSync={now} visible={true} />);

    act(() => {
      jest.advanceTimersByTime(11000); // 11s
    });

    expect(screen.getByText("No updates for 11s")).toBeInTheDocument();
  });
});
