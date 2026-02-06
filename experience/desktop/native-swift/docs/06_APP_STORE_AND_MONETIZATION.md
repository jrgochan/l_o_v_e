# 06. App Store & Monetization Strategy

**Framework**: StoreKit 2
**Model**: Freemium (Subscription)
**Compliance**: Apple Review Guidelines 4.0 (Design) & 5.1 (Privacy)

## 1. Business Model: "Soul+"

We monetize on **Continuity** and **Depth**, not access.

| Feature           | Free (Local Soul)         | Pro ($4.99/mo)                |
| :---------------- | :------------------------ | :---------------------------- |
| **Storage**       | Local Only                | iCloud Sync (Multi-Device)    |
| **AI Models**     | Standard (Bert/TinyLlama) | Advanced (Soul-Tuned Llama 3) |
| **History**       | 7 Days                    | Infinite                      |
| **Customization** | Standard Themes           | Full "Aura" Control           |

## 2. Technical Implementation (StoreKit 2)

### 2.1. Product Configuration

- **IDs**:
    - `com.love.soul.pro.monthly` ($4.99)
    - `com.love.soul.pro.yearly` ($49.99)
- **Entitlements**: The app must check `Transaction.currentEntitlements` on every launch.

### 2.2. The "Paywall" UI

- **Philosophy**: Not a wall, but a generic invitation.
- **Placement**:
    1.  On onboarding (Soft ask).
    2.  When trying to enable "iCloud Sync" in Settings (Contextual ask).
- **Design**: A specialized "Glass" card with holographic shimmer.

### 2.3. Receipt Validation

- **StoreKit 2**: Validates on-device via JWS (JSON Web Signature). No external server required.
- **Security**: Verify the JWS signature to prevent local tampering/cracking.

## 3. App Store Optimization (ASO)

### 3.1. Keywords

- Primary: "Journal", "Mental Health", "Mood Tracker", "AI Diary".
- Secondary: "Mindfulness", "Private", "CBT", "Reflection".

### 3.2. Screenshots

- Use **Apple Product Frames** (via `fastlane frameit`).
- Focus on the _Visuals_ (The "Aura"). The app looks different from everything else.

## 4. Compliance & Review Risks

### 4.1. Guideline 5.1.1 (Data Collection)

- **Strategy**: We must declare that we collect **Zero Data** off-device. Even iCloud data is legally "User Owned" and not accessible by us.

### 4.2. Guideline 2.5.2 (External Splashing)

- **Risk**: Downloading AI models at runtime.
- **Mitigation**: Use "On-Demand Resources" (ODR) or Apple's official Background Assets framework to download model weights. Do not use generic HTTP downloads for executable code (models are data, so usually fine, but ODR is safer).

### 4.3. AI Safety (Generative AI)

- **Requirement**: Apps generating content must have reporting mechanisms.
- **Implementation**: A "Report" button on any AI-generated insight that feeds into a local blocklist.
