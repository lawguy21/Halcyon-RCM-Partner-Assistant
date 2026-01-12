# Halcyon RCM Partner Assistant

A comprehensive revenue cycle management solution built as a monorepo using npm workspaces.

## Project Structure

```
Halcyon-RCM-Partner-Assistant/
├── packages/
│   ├── core/           # @halcyon-rcm/core - Recovery engine logic
│   ├── file-exchange/  # @halcyon-rcm/file-exchange - CSV/file handling
│   ├── api/            # @halcyon-rcm/api - Express API server
│   └── web/            # @halcyon-rcm/web - Next.js frontend
├── presets/            # Configuration presets for various vendors
│   ├── rcm-vendors/    # RCM vendor-specific configurations
│   ├── ehr-exports/    # EHR export format configurations
│   └── generic/        # Generic/default configurations
└── docker/             # Docker configuration files
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Install all dependencies
npm install

# Build all packages (in dependency order)
npm run build
```

### Development

```bash
# Run all packages in development mode
npm run dev

# Run specific packages
npm run dev:api    # Start API server
npm run dev:web    # Start Next.js frontend
```

### Testing

```bash
# Run all tests
npm run test

# Run tests for specific packages
npm run test:core
npm run test:file-exchange
npm run test:api
npm run test:web
```

## Packages

### @halcyon-rcm/core

The core recovery engine containing business logic, models, and configuration management.

### @halcyon-rcm/file-exchange

Handles CSV parsing, file transformations, and data exchange operations. Depends on `@halcyon-rcm/core`.

### @halcyon-rcm/api

Express-based REST API server. Depends on `@halcyon-rcm/core` and `@halcyon-rcm/file-exchange`.

### @halcyon-rcm/web

Next.js frontend application for the partner assistant interface.

## License

UNLICENSED - Proprietary
