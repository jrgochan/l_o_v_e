// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SoulChat",
    platforms: [
        .macOS(.v14),
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "SoulChat",
            targets: ["SoulChat"]
        )
    ],
    dependencies: [
        .package(path: "../SoulCore"),
        .package(url: "https://github.com/nalexn/ViewInspector", from: "0.9.11")
    ],
    targets: [
        .target(
            name: "SoulChat",
            dependencies: ["SoulCore"],
            swiftSettings: [
                .unsafeFlags(["-Xfrontend", "-strict-concurrency=complete"])
            ]
        ),
        .testTarget(
            name: "SoulChatTests",
            dependencies: ["SoulChat", "ViewInspector"]
        )
    ]
)
