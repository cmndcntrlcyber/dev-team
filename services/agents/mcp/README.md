# MCP Agent Service

Chrome DevTools MCP integration for dev-team platform agents. Provides browser automation, debugging, and UI/UX testing capabilities to all specialized agents.

## 📋 Overview

This service wraps the [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) server, providing a simplified, agent-friendly interface for:

- **Debugging**: Console error detection, JavaScript debugging, DOM inspection
- **Troubleshooting**: Network analysis, performance bottlenecks, error reproduction
- **UI/UX Optimization**: Visual testing, responsive design validation, user flow testing

## 🚀 Quick Start

### Prerequisites

1. **Chrome/Chromium** installed and running with remote debugging:
   ```bash
   # Start Chrome with debug port
   /home/cmndcntrl/code/dev-team/scripts/chrome-launcher.sh start
   ```

2. **Node.js** 18+ installed

### Installation

```bash
cd /home/cmndcntrl/code/dev-team/services/agents/mcp
npm install
```

### Test Connection

```bash
# Check if Chrome is accessible
npm run check-chrome

# Expected output:
# {
#   "Browser": "Chrome/142.0...",
#   "Protocol-Version": "1.3",
#   ...
# }
```

## 🔧 Usage

### For Dev-Team Agents

Import the wrapper in your agent code:

```javascript
import { chromeDevTools } from './chrome-devtools-wrapper.js';

// Check Chrome connection
const status = await chromeDevTools.isChromeRunning();
console.log(status);

// Get debugging workflow
const debugFlow = await chromeDevTools.debugJavaScriptErrors('http://localhost:3000');
console.log(debugFlow.steps);
console.log(debugFlow.tools);
```

### Available Methods

#### Debugging
- `debugJavaScriptErrors(pageUrl)` - Find and analyze JS errors
- `captureConsoleLogs(pageUrl, duration)` - Monitor console output
- `inspectNetworkRequests(pageUrl)` - Analyze network traffic
- `analyzeDOMIssues(pageUrl)` - Inspect DOM structure

#### Troubleshooting
- `diagnosePageLoad(pageUrl)` - Performance bottleneck analysis
- `troubleshootFormSubmission(pageUrl, formData)` - Debug form issues
- `debugBrokenUIElement(pageUrl, selector)` - Fix UI element problems

#### UI/UX Optimization
- `testResponsiveDesign(pageUrl)` - Test across device sizes
- `captureVisualRegression(pageUrl, scenario)` - Screenshot comparison
- `testUserFlow(startUrl, steps)` - E2E user flow testing
- `analyzePerformance(pageUrl)` - Core Web Vitals analysis
- `checkAccessibility(pageUrl)` - WCAG compliance check

#### Utilities
- `generateDebugReport(pageUrl)` - Comprehensive debug report
- `monitorPage(pageUrl, duration)` - Real-time monitoring
- `isChromeRunning()` - Check Chrome status
- `getPages()` - List open tabs/pages

## 📚 Example Workflows

### Example 1: Debug Console Errors

```javascript
import { chromeDevTools } from './chrome-devtools-wrapper.js';

const workflow = await chromeDevTools.debugJavaScriptErrors('http://localhost:3000');

// Workflow returns:
// {
//   task: 'debug_javascript_errors',
//   url: 'http://localhost:3000',
//   steps: [
//     '1. Navigate to page',
//     '2. List console messages (filter type=error)',
//     '3. Get network requests (check for failed API calls)',
//     '4. Take screenshot of error state'
//   ],
//   tools: [
//     'cgIazK0mcp0navigate_page',
//     'cgIazK0mcp0list_console_messages',
//     'cgIazK0mcp0list_network_requests',
//     'cgIazK0mcp0take_screenshot'
//   ]
// }

// Then use the MCP tools directly:
// await use_mcp_tool('chrome-devtools', 'cgIazK0mcp0navigate_page', { url: pageUrl });
// await use_mcp_tool('chrome-devtools', 'cgIazK0mcp0list_console_messages', { types: ['error'] });
// etc.
```

### Example 2: Performance Analysis

```javascript
const workflow = await chromeDevTools.analyzePerformance('http://localhost:3000');

// Returns detailed workflow for:
// - Starting performance trace
// - Capturing metrics
// - Analyzing LCP, FCP, TTI, TBT, CLS
// - Identifying bottlenecks
```

### Example 3: Responsive Design Testing

```javascript
const workflow = await chromeDevTools.testResponsiveDesign('http://localhost:3000');

// Returns workflow for testing:
// - Mobile (375x667)
// - Tablet (768x1024)
// - Desktop (1920x1080)
// With screenshots at each breakpoint
```

## 🎯 Integration with Dev-Team Agents

### QA Agent Use Cases

```javascript
// Automated E2E testing
const testFlow = await chromeDevTools.testUserFlow('http://localhost:3000', [
  { action: 'navigate', url: '/signup' },
  { action: 'fill', selector: '#email', value: 'test@example.com' },
  { action: 'fill', selector: '#password', value: 'password123' },
  { action: 'click', selector: '#submit' },
  { action: 'wait', text: 'Welcome' }
]);

// Visual regression testing
const screenshots = await chromeDevTools.captureVisualRegression(
  'http://localhost:3000',
  'homepage-logged-in'
);
```

### Frontend Agent Use Cases

```javascript
// Debug broken components
const uiDebug = await chromeDevTools.debugBrokenUIElement(
  'http://localhost:3000',
  '.broken-component'
);

// Performance profiling
const perfAnalysis = await chromeDevTools.analyzePerformance('http://localhost:3000');

// Accessibility audit
const a11yReport = await chromeDevTools.checkAccessibility('http://localhost:3000');
```

### DevOps Agent Use Cases

```javascript
// Health check deployed apps
const health = await chromeDevTools.generateDebugReport('https://production.app.com');

// Monitor production issues
const monitoring = await chromeDevTools.monitorPage('https://production.app.com', 120000);

// Performance validation
const perf = await chromeDevTools.diagnosePageLoad('https://production.app.com');
```

## 🔌 MCP Tools Reference

The wrapper provides guidance for using these Chrome DevTools MCP tools:

### Navigation & Control
- `cgIazK0mcp0navigate_page` - Navigate to URL
- `cgIazK0mcp0new_page` - Open new tab
- `cgIazK0mcp0close_page` - Close tab
- `cgIazK0mcp0select_page` - Switch tabs
- `cgIazK0mcp0list_pages` - List all tabs

### Inspection
- `cgIazK0mcp0take_snapshot` - Capture DOM tree with accessibility info
- `cgIazK0mcp0take_screenshot` - Capture visual screenshot
- `cgIazK0mcp0list_console_messages` - Get console logs/errors
- `cgIazK0mcp0get_console_message` - Get specific message details
- `cgIazK0mcp0list_network_requests` - List network traffic
- `cgIazK0mcp0get_network_request` - Get request/response details

### Interaction
- `cgIazK0mcp0click` - Click elements
- `cgIazK0mcp0fill` - Fill input fields
- `cgIazK0mcp0fill_form` - Fill multiple fields
- `cgIazK0mcp0hover` - Hover over elements
- `cgIazK0mcp0drag` - Drag and drop
- `cgIazK0mcp0press_key` - Keyboard input
- `cgIazK0mcp0upload_file` - File uploads

### Performance
- `cgIazK0mcp0performance_start_trace` - Begin performance recording
- `cgIazK0mcp0performance_stop_trace` - End recording
- `cgIazK0mcp0performance_analyze_insight` - Analyze metrics

### Utilities
- `cgIazK0mcp0wait_for` - Wait for content
- `cgIazK0mcp0resize_page` - Set viewport size
- `cgIazK0mcp0emulate` - Emulate devices/network
- `cgIazK0mcp0evaluate_script` - Run JavaScript
- `cgIazK0mcp0handle_dialog` - Handle alerts/confirms

## 🐛 Troubleshooting

### Chrome not accessible

```bash
# Check if Chrome is running
curl http://localhost:9222/json/version

# If not, start it
/home/cmndcntrl/code/dev-team/scripts/chrome-launcher.sh start

# Check status
/home/cmndcntrl/code/dev-team/scripts/chrome-launcher.sh status
```

### MCP tools not available

1. **Restart VS Code** - MCP configuration requires reload
2. Check Cline MCP settings:
   ```bash
   cat ~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
   ```
3. Look for "chrome-devtools" entry with `"disabled": false`

### Port conflicts

```bash
# Check what's using port 9222
lsof -i :9222

# Kill existing Chrome debug instance
/home/cmndcntrl/code/dev-team/scripts/chrome-launcher.sh stop

# Start fresh
/home/cmndcntrl/code/dev-team/scripts/chrome-launcher.sh start
```

## 📖 Documentation

- [Chrome DevTools MCP GitHub](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Dev-Team MCP Configuration](/docs/MCP_CONFIGURATION.md)

## 🔄 Development

### Running Tests

```bash
npm test
```

### Adding New Helper Methods

1. Add method to `ChromeDevToolsWrapper` class
2. Document parameters and return workflow
3. Include MCP tool references
4. Add usage example to `USAGE_EXAMPLES`

### Best Practices

- **Always check Chrome connection** before operations
- **Return workflows**, not direct tool calls (agents implement workflows)
- **Include screenshots** in debug/troubleshooting workflows
- **Capture errors** at each step for debugging
- **Document expected outcomes** in workflow steps

## 📝 Version History

- **v1.0.0** (2025-01-17) - Initial release
  - Chrome DevTools MCP integration
  - Debugging helpers
  - Troubleshooting workflows
  - UI/UX optimization methods
  - Performance analysis
  - Accessibility checking

## 📄 License

MIT License - Part of dev-team platform

## 🤝 Contributing

This service is part of the dev-team platform. Improvements welcome:

1. Add new helper methods for common workflows
2. Improve error handling
3. Add more example use cases
4. Enhance documentation

---

**Maintained by**: Dev-Team Platform  
**Last Updated**: January 17, 2025
