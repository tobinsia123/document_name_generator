# RoboVault `.enc` opener (macOS)

RoboVault sealed archives use a custom **DRENC1** envelope (AES-256-GCM). macOS does not show a passphrase dialog for unknown formats — you need a small companion app.

## One-time setup

```bash
cd raw_data/AMAZON
pip install cryptography   # if not already installed
./tools/install-macos-opener.sh
```

Or download **RoboVault-Opener-macOS.zip** from Export or Encryption in the web UI, unzip, move the app to Applications, then run the install script above.

## Daily use

1. Download a `.tar.zst.enc` from Export.
2. Double-click it (or right-click → Open With → RoboVault Opener).
3. Enter the **same passphrase** you used on Upload when the job ran.
4. The decrypted `.tar.zst` is written next to the `.enc` file and opened automatically.

## CLI (all platforms)

```bash
python open_enc.py path/to/archive.tar.zst.enc
```

## Windows / Linux

Use `python open_enc.py` until a platform-specific wrapper is added. File association on those OSes can point at the same script.
