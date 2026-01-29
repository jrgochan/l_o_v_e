// swift-tools-version: 6.0
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "SoulCore",
    platforms: [
        .macOS(.v14),
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "SoulCore",
            targets: ["SoulCore"]
        )
    ],
    targets: [
        .target(
            name: "SoulCore",
            resources: [
                .process("Resources")
            ]
        ),
        .testTarget(
            name: "SoulCoreTests",
            dependencies: ["SoulCore"]
        )
    ]
)
