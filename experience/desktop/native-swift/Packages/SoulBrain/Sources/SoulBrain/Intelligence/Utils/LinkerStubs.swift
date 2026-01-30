//
//  LinkerStubs.swift
//  SoulBrain
//
//  Created for iOS Compatibility.
//

#if os(iOS)
import Foundation

// Stub for _MTLTensorDomain (MLX)
// This symbol is referenced by MLX libraries. 
// Since we don't link MLX on iOS, but something is trying to reference it, 
// we provide a dummy definition to satisfy the linker.
@_cdecl("MTLTensorDomain")
public var _MTLTensorDomain: String = "MTLTensorDomainStub"

// Stub for _MTLIOErrorDomain (Metal)
// This should exist in Metal framework, but if it's missing, we stub it.
@_cdecl("MTLIOErrorDomain")
public var _MTLIOErrorDomain: String = "MTLIOErrorDomainStub"

#endif
