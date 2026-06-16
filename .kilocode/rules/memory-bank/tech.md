# Technical Context: CTS Trading System

## Technology Stack

| Technology   | Version | Purpose                         |
| ------------ | ------- | ------------------------------- |
| Next.js      | 15.x    | React framework with App Router |
| React        | 19.x    | UI library                      |
| TypeScript   | 5.8.x   | Type-safe JavaScript            |
| Tailwind CSS | 3.x     | Utility-first CSS               |
| Bun          | Latest  | Package manager & runtime       |

## Development Environment

### Commands

```bash
bun install        # Install dependencies
bun dev            # Start dev server (http://localhost:3002)
bun build          # Production build
bun start          # Start production server
bun lint           # Run ESLint
bun typecheck      # Run TypeScript type checking
```

## Key Dependencies

### Production Dependencies

- Trade engine: trade-engine/, stages/, preset-coordination-engine
- Exchange connectors: BingX, Binance, Bybit, OKX, Pionex, OrangeX
- UI: Radix UI components, Tailwind CSS, Recharts
- Auth: jose, bcryptjs, nanoid

## File Structure

```
/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/              # Core libraries and utilities
├── hooks/            # Custom React hooks
├── styles/           # CSS styles
├── scripts/          # Node.js scripts
├── public/           # Static assets
└── data/             # JSON data files
```