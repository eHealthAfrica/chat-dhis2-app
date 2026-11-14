# DHIS2 Android APK — Integration Testing

This directory holds the DHIS2 Android Capture APK used for end-to-end integration
testing between the **DHIS2 Android Capture app** and the **ePIMS** system.

## Current APK

| File | Version | Package | Signer | SHA-256 |
|------|---------|---------|--------|---------|
| `dhis2-v3.4.1.apk` | 3.4.1 (release) | `com.dhis2` | DHIS 2 / University of Oslo | `c1b8c749882d844eaf884a0a872a839c71e66c2ad3f581c4878c25e35b33b340` |

This is the official release asset from
[GitHub Releases 3.4.1](https://github.com/dhis2/dhis2-android-capture-app/releases/tag/3.4.1)
(`dhis2-v3.4.1.apk`, 129 451 772 bytes). It is not debuggable.

Do not use a debug build for integration tests. A debug-signed APK (`com.dhis2.debug`, signed
with the Android debug key) is not what field workers install, and it is debuggable.

### Verify before installing

```bash
BT="$ANDROID_HOME/build-tools/36.1.0"   # any recent build-tools version
shasum -a 256 apks/dhis2-v3.4.1.apk      # must match the SHA-256 above
"$BT/apksigner" verify --print-certs apks/dhis2-v3.4.1.apk | grep "Signer #1 certificate DN"
# -> CN=DHIS 2, OU=HISP, O=University of Oslo, ...
```

> **Note:** APK files are excluded from git (see `.gitignore`). Store them locally or
> retrieve from the project's object storage / CI artefact registry.

---

## Why this APK?

The ePIMS-DHIS2 integration flow requires a DHIS2 data-entry client to create events
that ePIMS then receives, reviews, and accepts/rejects. The Android Capture app
replicates the field-worker path:

```
Field worker (Android) → DHIS2 Capture → ePIMS Unvalidated Data → Accept/Reject
```

Using the real APK on an emulator (or physical device) lets integration tests exercise
the full stack rather than only the web-based `chat-dhis2-app` path.

---

## Prerequisites

- **Android emulator** (AVD) or a physical Android device with USB debugging enabled
- **ADB** installed: `brew install android-platform-tools`
- A running **DHIS2 2.41+** instance reachable from the device/emulator
- **ePIMS** running and connected to the same DHIS2 instance

---

## Install the APK on an emulator

```bash
# 1. Start an AVD (replace <avd-name> with your AVD)
emulator -avd <avd-name> &

# 2. Wait for the device to boot
adb wait-for-device

# 3. Install the APK (verify the SHA-256 first, see above)
adb install -r apks/dhis2-v3.4.1.apk

# 4. Verify installation
adb shell pm list packages | grep dhis2   # -> package:com.dhis2
```

---

## Configure the DHIS2 Android app

After installation, open the app and point it at your local DHIS2 instance:

1. Server URL: `http://10.0.2.2:8081` for the local DHIS2 instance from an Android emulator
   (`10.0.2.2` is the host machine as seen from the AVD; `8081` is the local DHIS2 port)
2. Username / Password: use a DHIS2 user that has the `F_CHAT_ADD_SETTINGS` authority
   **or** a plain data-capture user, depending on the test scenario.
3. Sync metadata before running any test.

---

## Running integration tests

Integration tests that involve the Android app are located (or will be located) in
`apps/chat-app/e2e/` under a dedicated `mobile/` folder. They use **Appium + Playwright**
(or standalone Appium with WebdriverIO) to drive the APK while the Playwright tests
drive the ePIMS web UI in parallel.

### Quick smoke run (manual)

```bash
# From the repo root
cd chat-dhis2-app

# 1. Ensure DHIS2 + ePIMS are up
docker compose -f ../epims/docker-compose.e2e.yml up -d

# 2. Install APK (if not already installed)
adb install -r apks/dhis2-v3.4.1.apk

# 3. Run the integration test suite (once Appium harness is wired)
pnpm run test:e2e:mobile
```

---

## Updating the APK

When a new DHIS2 Android release is available:

1. Download the new APK from the [DHIS2 GitHub Releases](https://github.com/dhis2/dhis2-android-capture-app/releases).
2. Place it in this directory as `dhis2-v<version>.apk`.
3. Update the table at the top of this README.
4. Remove the old APK to avoid confusion.
