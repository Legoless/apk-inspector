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

### Global Installation

```bash
npm install -g .
```

Or link for development:

```bash
npm link
```

### Local Installation

```bash
npm install
```

## Usage

### Global Command

```bash
apk-inspector <file.apk|file.apkm> [...]
```

### Local (npm start)

```bash
npm start <file.apk|file.apkm> [...]
```

### Examples

Inspect a single APK:

```bash
apk-inspector app.apk
```

Inspect multiple files:

```bash
apk-inspector app1.apk app2.apkm app3.apk
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
