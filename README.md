# Neon Air Hockey

Arcade air hockey for iPhone and iPad (Android works too). Drag your paddle
with your finger, play the CPU on three difficulties, or play a friend on the
same device with full multi-touch.

Built with Expo SDK 58 / React Native — no Mac needed to ship it (EAS builds
in the cloud).

## Run it

```bash
npm install
npm run web        # play in the browser (touch emulation in devtools)
npx expo start     # scan the QR code with Expo Go on your iPhone
```

## Project layout

| Path | What |
| --- | --- |
| `src/game/physics.ts` | Pure simulation: puck/paddle collisions, sub-stepping, walls, goal posts |
| `src/game/ai.ts` | CPU opponent (easy / normal / hard) |
| `src/game/match.ts` | Phase machine (countdown, play, goal, pause, over), scoring, touch routing |
| `src/screens/` | Menu and game screens |
| `src/feedback.ts` | Sound effects (expo-audio) and haptics |
| `scripts/make_assets.py` | Regenerates every sound, the icon and splash (`python3 scripts/make_assets.py`) |
| `store/` | App Store listing text, privacy policy, screenshots |

## Releasing to the App Store

You need an [Apple Developer Program](https://developer.apple.com/programs/)
membership ($99/year) and a free [Expo account](https://expo.dev/signup).

1. **Pick your bundle ID.** `com.vicarr.neonairhockey` is set in `app.json`
   (`ios.bundleIdentifier`, `android.package`). Change it now if you want — it
   can't change after the first upload.
2. **Log in and link the project**
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest init          # creates the EAS project id in app.json
   ```
3. **Build** (EAS creates certificates and provisioning profiles for you when
   you sign in with your Apple ID):
   ```bash
   npx eas-cli@latest build --platform ios --profile production
   ```
4. **Upload to App Store Connect**
   ```bash
   npx eas-cli@latest submit --platform ios --latest
   ```
   This creates the app record in App Store Connect if it doesn't exist.
5. **Test on your phone** — the build appears in TestFlight after processing
   (~10–30 min). Install TestFlight on your iPhone and play it on real hardware
   before submitting.
6. **Fill in the listing** in App Store Connect using `store/LISTING.md`, upload
   the screenshots from `store/screenshots/`, publish `store/PRIVACY.md`
   somewhere public and paste its URL, set App Privacy to "Data Not Collected".
7. **Submit for review.**

Build numbers auto-increment on EAS (`eas.json` → `autoIncrement`). For a new
release bump `version` in `app.json`.

### Already handled for review

- Opaque 1024×1024 icon (no alpha channel)
- `ITSAppUsesNonExemptEncryption = false` (skips the export-compliance prompt)
- Privacy manifest with required-reason API declarations, no tracking, no data collected
- No microphone / camera / location permission strings (the audio plugin's mic permission is disabled)
- Portrait-only with `UIRequiresFullScreen` so iPad multitasking requirements don't apply
- Game pauses automatically when the app is backgrounded; screen stays awake while playing
- Sounds respect the silent switch and mix with the player's music
