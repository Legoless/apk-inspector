# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

APK Inspector is a TypeScript CLI tool that extracts and displays information from Android APK and APKM files, including permissions, package queries, intent queries, and provider queries.

## Commands

```bash
# Install dependencies
npm install

# Run the tool
npm start <file.apk|file.apkm>

# Run directly with tsx
npx tsx index.ts <file.apk|file.apkm>

# Build TypeScript to dist/
npm run build
```

## Technology Stack

- **Runtime**: Node.js 24.x
- **Language**: TypeScript with ES Modules
- **Key Dependencies**:
  - `adbkit-apkreader` - Parses APK files and Android manifests
  - `yauzl` - Extracts APKM bundles (ZIP format)

## Architecture

The entire application is contained in `index.ts`:

- **ApkInfo interface** - Data structure for extracted APK information
- **XmlNode interface** - Represents parsed AndroidManifest.xml structure
- **extractQueriesFromXml()** - Recursively traverses XML to find `<queries>` element and extracts packages, intents, and providers
- **extractApkFromApkm()** - Extracts `base.apk` from APKM bundles to a temp directory
- **inspectApk()** - Main parsing logic using adbkit-apkreader
- **inspectFile()** - Entry point that handles both APK and APKM files

## Key Concepts

### APK Files
Standard Android packages. The tool reads `AndroidManifest.xml` to extract package name, permissions, and queries.

### APKM Files
APKMirror bundle format (ZIP containing multiple APKs). The tool extracts `base.apk` to a temp directory for inspection, then cleans up.

## Code Guidelines

- Keep all logic in `index.ts` unless it grows significantly
- Use async/await for all asynchronous operations
- Maintain type safety with explicit interfaces
