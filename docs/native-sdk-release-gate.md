# Native SDK release gate

The released Voomate Web Agent runs through one signed Web SDK. A website and a browser-based
web app use the same package and the same origin allowlist. Native iOS and Android SDKs are not
shown as selectable setup targets until the controls below are shipped and verified.

## Shared control-plane contract

- A native app exchanges its app-scoped public configuration for a short-lived, audience-bound
  session after device and application attestation. It never embeds a long-lived tenant secret.
- The session is bound to one tenant, agent, application identifier, configuration revision,
  and execution lease. Pausing or archiving revokes eligibility immediately.
- The SDK only sends the minimum telemetry needed for lifecycle receipts. It never uploads raw
  microphone audio, prompts, or customer content as diagnostics.
- Every runtime action continues through the same tenant-scoped policy, capability, audit, and
  confirmation path as the Web Agent.

## iOS release requirements

- Swift Package Manager package with a documented minimum iOS version and no private APIs.
- App Attest / DeviceCheck verification on the session-exchange service, with a safe fallback
  only for devices where Apple documents it as unavailable.
- `NSMicrophoneUsageDescription` shown only when voice is intentionally enabled by the user.
  No recording starts before that system permission is granted.
- Apple privacy manifest and accurate App Store Connect privacy answers for every collected SDK
  data type, including diagnostics and any identifiers.
- No arbitrary remote-code execution, no hidden browser bridge, and no collection for tracking
  without the host app obtaining the required consent.

## Android release requirements

- Kotlin/AndroidX package with a documented minimum API level and dependency inventory.
- Play Integrity verification on the session-exchange service, with attestation failures treated
  as a controlled unavailable state rather than a bypass.
- `RECORD_AUDIO` requested at the moment a user starts voice. The host app must show a clear
  disclosure and handle denial without blocking its core experience.
- Google Play Data Safety disclosure and a maintained SDK data-practice record supplied to host
  developers.
- If a WebView is used, allowlist navigation, disable unsafe JavaScript interfaces, and do not
  expose host credentials or native capabilities to arbitrary page content.

## Release evidence

Before either selector is enabled in the merchant dashboard, the team must have:

1. A signed SDK artifact, example host app, integration test suite, and rollback path.
2. Attestation and session-exchange tests for valid, invalid, revoked, and paused agents.
3. Privacy review, store listing disclosure review, and microphone-denial tests.
4. Runtime receipts, latency measurements, error reporting that excludes private content, and a
   support escalation path.
5. A separate catalog/runtime release entry—not a UI-only flag.

Reference policies: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/),
[Apple app privacy details](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/),
and [Google Play SDK requirements](https://support.google.com/googleplay/android-developer/answer/13326895).
