// swift-tools-version: 6.0
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "SoulBrain",
    platforms: [
        .macOS(.v14),
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "SoulBrain",
            targets: ["SoulBrain"]
        )
    ],
    dependencies: [
        .package(path: "../SoulCore"),
        .package(url: "https://github.com/ml-explore/mlx-swift", from: "0.10.0")
    ],
    targets: [
        .target(
            name: "SoulBrain",
            dependencies: [
                "SoulCore",
                .product(name: "MLX", package: "mlx-swift"),
                .product(name: "MLXRandom", package: "mlx-swift"),
                .product(name: "MLXNN", package: "mlx-swift"),
                .product(name: "MLXOptimizers", package: "mlx-swift")
            ]
        ),
        .testTarget(
            name: "SoulBrainTests",
            dependencies: ["SoulBrain"]
        )
    ]
)
