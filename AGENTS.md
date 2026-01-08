# Agent Instructions

This document provides instructions for AI agents working with this codebase.

## Project Overview

APK Inspector is a TypeScript CLI tool that extracts and displays information from Android APK and APKM files.

## Technology Stack

- **Runtime**: Node.js 24.x
- **Language**: TypeScript with ES Modules
- **Key Dependencies**:
  - `adbkit-apkreader` - Parses APK files and Android manifests
  - `yauzl` - Extracts APKM bundles (ZIP format)

## Project Structure

```
apk-inspector/
├── index.ts        # Main entry point and all logic
├── package.json    # Project configuration
├── tsconfig.json   # TypeScript configuration
└── node_modules/   # Dependencies
```

## Key Concepts

### APK Files
Standard Android application packages. The tool reads the `AndroidManifest.xml` to extract:
- Package name
- Permissions (`uses-permission` elements)
- Queries (packages, intents, providers)

### APKM Files
APK bundle format used by APKMirror. Contains multiple APKs in a ZIP archive. The tool extracts `base.apk` for inspection.

## Development Commands

```bash
# Run the tool
npm start <file.apk>

# Build TypeScript
npm run build
```

## Code Guidelines

- Keep all logic in `index.ts` unless it grows significantly
- Use async/await for all asynchronous operations
- Handle errors gracefully with meaningful messages
- Maintain type safety with explicit interfaces
