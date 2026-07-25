#!/bin/bash
set -e

# EAS Local Build Script for WSL
# Builds APK and copies it to Windows Desktop

# Detect Windows username (owner of /mnt/c/Users directory, excluding Public/Default)
WIN_USER=$(ls /mnt/c/Users | grep -vE "^(Public|Default|All Users|Default User)$" | head -1)
DESKTOP="/mnt/c/Users/$WIN_USER/Desktop"

cd ~/Coding/FinanceTracker

echo "=== Building APK (local) ==="
eas build --platform android --profile preview --local

# Find the latest APK
LATEST_APK=$(ls -t build-*.apk 2>/dev/null | head -1)

if [ -z "$LATEST_APK" ]; then
    echo "Error: No APK found after build."
    exit 1
fi

echo "=== Copying to $DESKTOP ==="
cp "$LATEST_APK" "$DESKTOP/"
echo "Done: $DESKTOP/$LATEST_APK"
