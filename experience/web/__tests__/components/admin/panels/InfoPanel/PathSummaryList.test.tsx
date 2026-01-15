import { render, screen, fireEvent } from "@testing-library/react";
import { PathSummaryList } from "@/components/admin/panels/InfoPanel/PathSummaryList";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { usePathSorting } from "@/hooks/admin/usePathSorting";

jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/hooks/admin/usePathSorting");

describe("PathSummaryList", () => {
  const mockSetSelectedPath = jest.fn();

  const mockPaths = [
    {
      id: "p1",
      from: { name: "A" },
      to: { name: "B" },
      waypoints: [{ emotion: "Wonder" }],
      total_distance: 10,
      estimated_time: "5m",
      difficulty: "Easy",
    },
  ];

  const sortedPaths = [{ path: mockPaths[0], badges: { isShort: true, isEasy: true } }];

  beforeEach(() => {
    jest.clearAllMocks();
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        setSelectedPath: mockSetSelectedPath,
      })
    );
    (usePathSorting as jest.Mock).mockReturnValue(sortedPaths);
  });

  it("renders list of paths with badges", () => {
    const onWaypointClick = jest.fn();
    render(
      <PathSummaryList
        paths={mockPaths as any}
        selectedPathId={null}
        isComputingPaths={false}
        onWaypointClick={onWaypointClick}
      />
    );
    expect(screen.getByText("A → B")).toBeInTheDocument();
    expect(screen.getByText("Shortest")).toBeInTheDocument();
    expect(screen.getByText("Easiest")).toBeInTheDocument();

    // Click waypoint details
    const detailsBtn = screen.getByText("→ details");
    fireEvent.click(detailsBtn);

    expect(mockSetSelectedPath).toHaveBeenCalledWith("p1");
    // onWaypointClick(path, waypoint, index)
    expect(onWaypointClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1" }),
      expect.objectContaining({ emotion: "Wonder" }),
      0
    );
  });

  it("shows loading spinner when computing", () => {
    render(
      <PathSummaryList
        paths={mockPaths as any}
        selectedPathId={null}
        isComputingPaths={true}
        onWaypointClick={jest.fn()}
      />
    );
    expect(screen.getByText("Computing paths...")).toBeInTheDocument();
  });

  it("renders empty when no paths", () => {
    const { container } = render(
      <PathSummaryList
        paths={[]}
        selectedPathId={null}
        isComputingPaths={false}
        onWaypointClick={jest.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("highlights selected path", () => {
    render(
      <PathSummaryList
        paths={mockPaths as any}
        selectedPathId="p1"
        isComputingPaths={false}
        onWaypointClick={jest.fn()}
      />
    );
    const card = screen.getByText("A → B").closest(".rounded-lg");
    expect(card).toHaveClass("bg-cyan-900/40");
    expect(card).toHaveClass("border-cyan-500");
  });

  it("shows bridge requirements", () => {
    const bridgePath = [
      {
        ...mockPaths[0],
        id: "p2",
        requires_bridge: true,
        bridge_emotions: ["Awe"],
      },
    ];

    // Sort hook mock needs to return this new path
    const sortedBridgePath = [{ path: bridgePath[0], badges: { noBridge: false } }];
    (usePathSorting as jest.Mock).mockReturnValue(sortedBridgePath);

    render(
      <PathSummaryList
        paths={bridgePath as any}
        selectedPathId={null}
        isComputingPaths={false}
        onWaypointClick={jest.fn()}
      />
    );

    expect(screen.getByText("★ Requires: Awe")).toBeInTheDocument();
  });
});
