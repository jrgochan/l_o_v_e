// swift-tools-version: 6.0
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "SoulBio",
    platforms: [
        .macOS(.v14),
        .iOS(.v17),
        .watchOS(.v10)
    ],
    products: [
        .library(
            name: "SoulBio",
            targets: ["SoulBio"]
        )
    ],
    dependencies: [
        .package(path: "../SoulCore")
    ],
    targets: [
        .target(
            name: "SoulBio",
            dependencies: ["SoulCore"]
        ),
        .testTarget(
            name: "SoulBioTests",
            dependencies: ["SoulBio"]
        )
    ]
)
