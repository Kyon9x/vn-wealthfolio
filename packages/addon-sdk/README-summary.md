# @wealthvn/addon-sdk

[![Version](https://img.shields.io/npm/v/@wealthvn/addon-sdk?style=flat-square)](https://www.npmjs.com/package/@wealthvn/addon-sdk)
[![Downloads](https://img.shields.io/npm/dm/@wealthvn/addon-sdk?style=flat-square)](https://www.npmjs.com/package/@wealthvn/addon-sdk)
[![License](https://img.shields.io/npm/l/@wealthvn/addon-sdk?style=flat-square)](https://github.com/afadil/wealthvn/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/node/v/@wealthvn/addon-sdk?style=flat-square)](https://nodejs.org/)

A comprehensive TypeScript SDK for building secure, feature-rich addons for
WealthVN. Extend your portfolio management experience with custom analytics,
integrations, and visualizations.

## 📚 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Project Structure](#-project-structure)
- [Manifest Configuration](#-manifest-configuration)
- [Development Guide](#-development-guide)
- [Security & Permissions](#-security--permissions)
- [Build Configuration](#-build-configuration)
- [Building and Packaging](#-building-and-packaging)
- [Installation & Testing](#-installation--testing)
- [API Reference](#-api-reference)
- [Migration Guide](#-migration-guide)
- [Contributing](#-contributing)
- [NPM Registry Information](#-npm-registry-information)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)
- [Links](#-links)

## Quick API Reference

- `ctx.api.data` - Access portfolio data
- `ctx.api.secrets` - Secure storage
- `ctx.ui.routes` - Add sidebar routes
- `ctx.events` - Event system

## Example

```typescript
export default defineAddon({
  routes: {
    '/my-feature': () => <MyComponent />
  }
})
```

## Full Documentation

See complete [README.md](README.md) for comprehensive guide.
