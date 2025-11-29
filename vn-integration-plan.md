# VN Market Service Integration Plan

## Overview
This document outlines the integration of vn-market-service as a submodule within cp-wealthfolio, enabling unified development and deployment while maintaining separate databases.

## Project Structure
```
cp-wealthfolio/
├── services/
│   └── vn-market-service/          # Git submodule
│       ├── app/
│       ├── db/
│       ├── requirements.txt
│       └── Dockerfile
├── src-tauri/
│   ├── sidecar/
│   │   └── vn-market-service/      # Build artifacts (auto-generated)
│   ├── tauri.conf.json             # Updated with sidecar config
│   └── scripts/
│       └── build-vn-market.sh      # Build script
├── scripts/
│   └── dev-services.mjs            # Service management
├── package.json                    # Updated with service scripts
└── vn-integration-plan.md          # This file
```

## Integration Phases

### Phase 1: Project Structure Setup
**Objective:** Set up basic project structure with submodule

**Tasks:**
1. Create `services/` directory
2. Add vn-market-service as git submodule
3. Create `scripts/` directory for service management
4. Initial commit with submodule

**Commands:**
```bash
cd /Users/chitq/WS/software/WF/cp-wealthfolio
git checkout -b feature/integrate-vn-market-service
mkdir -p services
git submodule add ../vn-market-service services/vn-market-service
git submodule update --init --recursive
mkdir -p scripts
git add .
git commit -m "feat: Add vn-market-service as submodule"
```

### Phase 2: Service Management Scripts
**Objective:** Create scripts for development and build processes

**Files to Create:**

#### `scripts/dev-services.mjs`
```javascript
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting vn-market-service...');

const servicePath = join(__dirname, '../services/vn-market-service');
const service = spawn('python3', ['-m', 'uvicorn', 'app.main:app', '--port', '8765'], {
  cwd: servicePath,
  stdio: 'inherit',
  env: {
    ...process.env,
    VN_MARKET_DB_PATH: './db/assets.db',
    VN_MARKET_SERVICE_HOST: '127.0.0.1',
    VN_MARKET_SERVICE_PORT: '8765'
  }
});

service.on('error', (error) => {
  console.error('Failed to start vn-market-service:', error);
  process.exit(1);
});

service.on('close', (code) => {
  console.log(`vn-market-service exited with code ${code}`);
});

process.on('SIGINT', () => {
  console.log('Stopping vn-market-service...');
  service.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Stopping vn-market-service...');
  service.kill('SIGTERM');
  process.exit(0);
});
```

#### `scripts/build-vn-market.sh`
```bash
#!/bin/bash
set -e

echo "Building vn-market-service for Tauri sidecar..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 is required but not installed."
    exit 1
fi

# Navigate to service directory
SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../services/vn-market-service" && pwd)"
OUTPUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../src-tauri/sidecar" && pwd)"

cd "$SERVICE_DIR"

echo "Installing Python dependencies..."
pip3 install -r requirements.txt --target ./python_deps

# Create output directory
mkdir -p "$OUTPUT_DIR/vn-market-service"

# Copy service files
echo "Copying service files..."
cp -r app "$OUTPUT_DIR/vn-market-service/"
cp requirements.txt "$OUTPUT_DIR/vn-market-service/"
cp -r python_deps "$OUTPUT_DIR/vn-market-service/"

# Create startup script
cat > "$OUTPUT_DIR/vn-market-service/start.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
export PYTHONPATH="./python_deps:$PYTHONPATH"
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8765
EOF

chmod +x "$OUTPUT_DIR/vn-market-service/start.sh"

echo "vn-market-service build completed!"
echo "Output: $OUTPUT_DIR/vn-market-service"
```

#### Update `package.json`
Add these scripts to the existing `scripts` section:
```json
{
  "scripts": {
    "dev:services": "node scripts/dev-services.mjs",
    "build:services": "bash scripts/build-vn-market.sh",
    "services:install": "cd services/vn-market-service && pip3 install -r requirements.txt",
    "services:start": "cd services/vn-market-service && python3 -m uvicorn app.main:app --port 8765",
    "services:stop": "pkill -f vn-market-service || true",
    "services:logs": "tail -f services/vn-market-service/logs/*.log"
  }
}
```

### Phase 3: Tauri Integration
**Objective:** Configure Tauri to run vn-market-service as sidecar

#### Update `src-tauri/tauri.conf.json`
```json
{
  "build": {
    "beforeDevCommand": "pnpm dev:services & pnpm dev",
    "beforeBuildCommand": "pnpm build:services && pnpm build"
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "sidecar": [
      {
        "name": "vn-market-service",
        "path": "../sidecar/vn-market-service"
      }
    ]
  }
}
```

#### Update VN Market Provider
**File:** `src-core/src/market_data/providers/vn_market_provider.rs`

```rust
impl VnMarketProvider {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            base_url: "http://127.0.0.1:8765".to_string(), // Local sidecar
        }
    }
    
    // Add health check method
    pub async fn health_check(&self) -> bool {
        let url = format!("{}/health", self.base_url);
        if let Ok(response) = self.client.get(&url).send().await {
            response.status().is_success()
        } else {
            false
        }
    }
    
    // Add retry logic for service startup
    async fn ensure_service_ready(&self) -> Result<(), MarketDataError> {
        let mut attempts = 0;
        let max_attempts = 30; // 30 seconds timeout
        
        while attempts < max_attempts {
            if self.health_check().await {
                return Ok(());
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            attempts += 1;
        }
        
        Err(MarketDataError::ProviderError(
            "VN Market Service failed to start within timeout".to_string()
        ))
    }
}
```

### Phase 4: Service Lifecycle Management
**Objective:** Add service management to main application

#### Update `src-tauri/src/lib.rs`
Add this function to the setup section:
```rust
fn setup_vn_market_service() -> Result<(), Box<dyn std::error::Error>> {
    // Ensure data directory exists
    std::fs::create_dir_all("./data")?;
    
    // Set environment variables for vn-market-service
    std::env::set_var("VN_MARKET_DB_PATH", "./data/vn-market.db");
    std::env::set_var("VN_MARKET_SERVICE_HOST", "127.0.0.1");
    std::env::set_var("VN_MARKET_SERVICE_PORT", "8765");
    
    Ok(())
}
```

Add service health monitoring:
```rust
// In spawn_background_tasks function
let context_clone = context.clone();
tauri::async_runtime::spawn(async move {
    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
    
    loop {
        interval.tick().await;
        
        if let Ok(provider) = context_clone.market_data_service().get_vn_market_provider() {
            if !provider.health_check().await {
                log::warn!("VN Market Service is not responding!");
            }
        }
    }
});
```

### Phase 5: Database Configuration
**Objective:** Configure separate databases for each service

#### Database Paths:
- **Wealthfolio:** `./data/wealthfolio.db`
- **VN Market:** `./data/vn-market.db`

#### Environment Variables:
Create `.env.service` file:
```env
# VN Market Service Configuration
VN_MARKET_DB_PATH=./data/vn-market.db
VN_MARKET_SERVICE_HOST=127.0.0.1
VN_MARKET_SERVICE_PORT=8765
TZ=Asia/Ho_Chi_Minh

# Wealthfolio Database
WEALTHFOLIO_DB_PATH=./data/wealthfolio.db
```

### Phase 6: Build System Integration
**Objective:** Integrate service build into main build process

#### Update Build Commands:
```json
{
  "scripts": {
    "build": "pnpm build:services && pnpm build:types && tsc && vite build && pnpm -r build",
    "build:services": "bash scripts/build-vn-market.sh",
    "build:types": "pnpm -r run build:types"
  }
}
```

#### Cross-Platform Considerations:
- Windows: Use `python` instead of `python3`
- macOS: Handle Python path variations
- Linux: Ensure Python3 is available

### Phase 7: Testing & Validation
**Objective:** Test integration thoroughly

#### Test Cases:
1. **Development Mode:**
   - Services start correctly
   - Communication works
   - Databases are separate

2. **Build Process:**
   - Service builds successfully
   - Sidecar is included in bundle
   - Application starts with service

3. **Service Communication:**
   - VN market provider connects to local service
   - Health checks work
   - Data retrieval functions correctly

4. **Database Separation:**
   - Each service uses its own database
   - No data conflicts
   - Proper data isolation

## Development Workflow

### Development Mode:
```bash
# Terminal 1: Start services
pnpm dev:services

# Terminal 2: Start main app
pnpm dev
```

### Build Process:
```bash
# Build everything
pnpm build

# Or step by step
pnpm build:services  # Build vn-market-service
pnpm build           # Build main app
```

### Git Workflow:
```bash
# Update submodule
cd services/vn-market-service
git pull origin main

# Commit submodule update
cd ../..
git add services/vn-market-service
git commit -m "chore: Update vn-market-service submodule"
```

## Troubleshooting

### Common Issues:

1. **Service Won't Start:**
   - Check Python installation
   - Verify dependencies: `pnpm services:install`
   - Check port conflicts

2. **Build Failures:**
   - Ensure Python3 is in PATH
   - Check permissions on build directories
   - Verify submodule is initialized

3. **Communication Issues:**
   - Verify service is running: `curl http://127.0.0.1:8765/health`
   - Check firewall settings
   - Ensure correct port configuration

4. **Database Issues:**
   - Check directory permissions
   - Verify database paths
   - Ensure proper file permissions

## Benefits of This Integration

1. **Unified Repository:** Single codebase for both services
2. **Independent Development:** Each service can be developed separately
3. **Integrated Build:** Single build process produces bundled app
4. **Version Control:** Submodule tracks vn-market-service versions
5. **Cross-Platform:** Tauri handles platform-specific packaging
6. **Separate Databases:** Maintains data isolation while enabling integration
7. **Offline Capability:** Service runs locally, no external dependencies
8. **Easy Deployment:** Single installer includes everything needed

## Future Enhancements

1. **Service Discovery:** Automatic service detection and configuration
2. **Health Monitoring:** Enhanced health checks and auto-restart
3. **Performance Optimization:** Connection pooling and caching
4. **Configuration UI:** User interface for service configuration
5. **Update Mechanism:** Automatic service updates within main app

## Timeline

- **Phase 1-2:** 1-2 days (Structure and scripts)
- **Phase 3-4:** 2-3 days (Tauri integration)
- **Phase 5-6:** 1-2 days (Database and build)
- **Phase 7:** 1-2 days (Testing and validation)

**Total Estimated Time:** 5-9 days

---

*This plan serves as a comprehensive guide for integrating vn-market-service into cp-wealthfolio. Adjustments may be made based on specific requirements and challenges encountered during implementation.*