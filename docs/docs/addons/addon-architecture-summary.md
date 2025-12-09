# WealthVN Addon Architecture

A straightforward explanation of how WealthVN's addon system works.

## What Are WealthVN Addons?

Addons are TypeScript modules that extend WealthVN's functionality. Each addon
is a JavaScript function that receives an `AddonContext` object and can register
UI components, add navigation items, and access financial data through APIs.

## Basic Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    WealthVN Host Application                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Addon Runtime  │  │  Permission     │  │   API Bridge    │  │
│  │                 │  │   System        │  │                 │  │
│  │ • Load/Unload   │  │ • Detection     │  │ • Type Bridge   │  │
│  │ • Lifecycle     │  │ • Validation    │  │ • Domain APIs   │  │
│  │ • Context Mgmt  │  │ • Enforcement   │  │ • Scoped Access │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        Individual Addons                        │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │   Addon A   │ │   Addon B   │ │   Addon C   │ │   Addon D   │ │
│ │             │ │             │ │             │ │             │ │
│ │ enable()    │ │ enable()    │ │ enable()    │ │ enable()    │ │
│ │ disable()   │ │ disable()   │ │ disable()   │ │ disable()   │ │
│ │ UI/Routes   │ │ UI/Routes   │ │ UI/Routes   │ │ UI/Routes   │ │
│ │ API Calls   │ │ API Calls   │ │ API Calls   │ │ API Calls   │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

The system has two main parts:

- **Host Application**: Manages addon lifecycle, enforces permissions, provides
  APIs
- **Addons**: JavaScript functions that receive context and register
  functionality

## Addon Lifecycle

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│             │    │             │    │             │    │             │
│  ZIP File   │───▶│   Extract   │───▶│  Validate   │───▶│  Analyze    │

## Key Concepts
- Addons run in isolated contexts
- SDK provides safe API access
- Permissions enforced per addon
- Hot reload supported in dev mode

## Quick Start
1. Scaffold: `npx @wealthvn/addon-dev-tools create <name>`
2. Dev server: `npm run dev:server`
3. Main app: `pnpm tauri dev`

## Full Documentation
See complete [addon-architecture.md](addon-architecture.md) for detailed implementation guide.
```
