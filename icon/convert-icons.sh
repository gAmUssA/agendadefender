#!/bin/bash

# Check if we have the required tools
if ! command -v sips &> /dev/null || ! command -v iconutil &> /dev/null; then
    echo "Error: Required tools (sips, iconutil) not found. These should be available on macOS by default."
    exit 1
fi

# Source PNG file
SOURCE="agenda-defender.png"
if [ ! -f "$SOURCE" ]; then
    echo "Error: Source file $SOURCE not found"
    exit 1
fi

# Create temporary directory for icon generation
ICONSET="agenda-defender.iconset"
mkdir -p "$ICONSET"

# Generate different sizes for macOS
sips -z 16 16     "$SOURCE" --out "$ICONSET/icon_16x16.png"
sips -z 32 32     "$SOURCE" --out "$ICONSET/icon_16x16@2x.png"
sips -z 32 32     "$SOURCE" --out "$ICONSET/icon_32x32.png"
sips -z 64 64     "$SOURCE" --out "$ICONSET/icon_32x32@2x.png"
sips -z 128 128   "$SOURCE" --out "$ICONSET/icon_128x128.png"
sips -z 256 256   "$SOURCE" --out "$ICONSET/icon_128x128@2x.png"
sips -z 256 256   "$SOURCE" --out "$ICONSET/icon_256x256.png"
sips -z 512 512   "$SOURCE" --out "$ICONSET/icon_256x256@2x.png"
sips -z 512 512   "$SOURCE" --out "$ICONSET/icon_512x512.png"
sips -z 1024 1024 "$SOURCE" --out "$ICONSET/icon_512x512@2x.png"

# Create .icns file for macOS
iconutil -c icns "$ICONSET"

# Clean up temporary directory
rm -rf "$ICONSET"

echo "Icon conversion complete!"
echo "Created agenda-defender.icns for macOS"
echo ""
echo "Note: For Windows .ico file, you'll need to use a third-party tool or online converter"
echo "You can use the 256x256 PNG from the iconset for Windows and Linux"
