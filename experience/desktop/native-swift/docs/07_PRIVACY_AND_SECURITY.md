# 07. Privacy & Security

**Principle**: "Privacy is Physics"
**Frameworks**: LocalAuthentication, CryptoKit, Security (Keychain)

## 1. Biometric Sentinel (FaceID / TouchID)

The "Soul" is sacred. Access should be guarded physically.

### 1.1. Implementation

- **Framework**: `LocalAuthentication`.
- **Policy**: `.deviceOwnerAuthenticationWithBiometrics`.
- **Trigger**:
    - App Launch (Cold Start).
    - App Foregrounding (after > 1 minute in background).
    - Accessing "Hidden" or "Burner" memories.

### 1.2. Fallback

- If Biometrics fail, fallback to Device Passcode.
- We **DO NOT** implement a custom PIN. Rely on the OS readiness.

## 2. Encryption (Data Sovereignty)

### 2.1. At Rest

- **SwiftData**: By default, SQLite stores on disk.
- **Protection**: Enable `NSPersistentStoreFileProtectionType.complete`.
    - **Effect**: The database file is encrypted on disk and **cannot be read** until the device is unlocked by the user (First Unlock).

### 2.2. The "Digital Legacy" Key (Future)

- **Concept**: Allow a loved one to inherit the soul.
- **Tech**: **Shamir's Secret Sharing** (gf256 implemented in Swift).
- **Flow**:
    1.  Generate a Master Recovery Key (256-bit).
    2.  Split into 3 QR Codes.
    3.  User physically distributes them.
    4.  Reconstruction requires 2 of 3 keys.

## 3. Network Isolation

- **App Sandbox**: explicitly **DENY** generic `com.apple.security.network.client` entitlement if possible.
- **Exception**: Only allow `com.apple.developer.icloud-services` and connections to `api.apple-cloudkit.com`.
- **Verification**: A network audit (Little Snitch) should show ZERO connections to third-party trackers (Google Analytics, Firebase, etc).

## 4. Secure Enclave

- **Usage**: Storing the "Soul Signature" (User's private key for signing journal entries if we implement anti-tamper logs).
- **Framework**: `CryptoKit.SecureEnclave.P256.Signing.PrivateKey`.
