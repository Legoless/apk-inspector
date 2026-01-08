# APK Inspector

A command-line tool to inspect APK and APKM files for permissions, package queries, intent queries, and provider queries.

## Features

- Inspect standard APK files
- Extract and inspect APKM bundles (automatically extracts base.apk)
- List all requested permissions
- Show queried packages (from `<queries>` element)
- Show queried intents
- Show queried providers

## Requirements

- Node.js 24.x or later

## Installation

```bash
npm install
```

## Usage

```bash
npm start <file.apk|file.apkm> [...]
```

Or directly with tsx:

```bash
npx tsx index.ts <file.apk|file.apkm> [...]
```

### Examples

Inspect a single APK:

```bash
npm start app.apk
```

Inspect multiple files:

```bash
npm start app1.apk app2.apkm app3.apk
```

## Output

The tool outputs:

- **Package name** - The app's package identifier
- **Permissions** - All permissions declared in `uses-permission` elements
- **Queried Packages** - Packages declared in the `<queries>` manifest section
- **Queried Intents** - Intent actions the app queries for
- **Queried Providers** - Content provider authorities the app queries

## License

MIT
