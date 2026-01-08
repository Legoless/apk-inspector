# Warp Rules

Project-specific rules for Warp AI agent.

## Build & Run

- Use `npm start <file>` to run the inspector
- Use `npm run build` to compile TypeScript
- Always test changes by running against a sample APK/APKM file

## Code Style

- TypeScript with strict type checking
- ES Modules (`import`/`export`)
- Explicit interfaces for data structures
- Async/await over callbacks

## Testing Changes

After any code modification:

1. Run `npm run build` to check for TypeScript errors
2. Test with a sample file to verify functionality

## File Organization

- Main logic stays in `index.ts`
- If splitting is needed, create a `src/` directory with separate modules
- Keep files under 250 lines when possible
