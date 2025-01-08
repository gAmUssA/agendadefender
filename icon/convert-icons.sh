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

# Convert PNG to ICNS for macOS
if [ ! -f "agenda-defender.icns" ]; then
  # Create iconset directory if it doesn't exist
  mkdir -p agenda-defender.iconset

  # Generate different sizes
  sips -z 16 16     "$SOURCE" --out agenda-defender.iconset/icon_16x16.png
  sips -z 32 32     "$SOURCE" --out agenda-defender.iconset/icon_16x16@2x.png
  sips -z 32 32     "$SOURCE" --out agenda-defender.iconset/icon_32x32.png
  sips -z 64 64     "$SOURCE" --out agenda-defender.iconset/icon_32x32@2x.png
  sips -z 128 128   "$SOURCE" --out agenda-defender.iconset/icon_128x128.png
  sips -z 256 256   "$SOURCE" --out agenda-defender.iconset/icon_128x128@2x.png
  sips -z 256 256   "$SOURCE" --out agenda-defender.iconset/icon_256x256.png
  sips -z 512 512   "$SOURCE" --out agenda-defender.iconset/icon_256x256@2x.png
  sips -z 512 512   "$SOURCE" --out agenda-defender.iconset/icon_512x512.png
  sips -z 1024 1024 "$SOURCE" --out agenda-defender.iconset/icon_512x512@2x.png

  # Create ICNS file
  iconutil -c icns agenda-defender.iconset
fi

# Convert PNG to ICO for Windows
if [ ! -f "agenda-defender.ico" ]; then
  # Create temporary directory for ICO conversion
  mkdir -p ico_temp

  # Generate different sizes for ICO
  sips -z 16 16     "$SOURCE" --out ico_temp/icon_16x16.png
  sips -z 32 32     "$SOURCE" --out ico_temp/icon_32x32.png
  sips -z 48 48     "$SOURCE" --out ico_temp/icon_48x48.png
  sips -z 64 64     "$SOURCE" --out ico_temp/icon_64x64.png
  sips -z 128 128   "$SOURCE" --out ico_temp/icon_128x128.png
  sips -z 256 256   "$SOURCE" --out ico_temp/icon_256x256.png

  # Install ImageMagick if not present
  if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required for ICO conversion. Please install it:"
    echo "brew install imagemagick"
    exit 1
  fi

  # Convert to ICO
  convert ico_temp/icon_16x16.png ico_temp/icon_32x32.png ico_temp/icon_48x48.png \
          ico_temp/icon_64x64.png ico_temp/icon_128x128.png ico_temp/icon_256x256.png \
          agenda-defender.ico

  # Clean up temporary directory
  rm -rf ico_temp
fi

echo "Icon conversion complete!"
echo "Created agenda-defender.icns for macOS and agenda-defender.ico for Windows"
echo ""
