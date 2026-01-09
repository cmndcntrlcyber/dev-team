/**
 * Chrome DevTools MCP Wrapper
 * 
 * Provides a simplified interface for dev-team agents to use Chrome DevTools
 * capabilities for debugging, troubleshooting, and UI/UX optimization.
 * 
 * @module chrome-devtools-wrapper
 */

import axios from 'axios';

const CHROME_DEBUG_URL = process.env.CHROME_DEBUG_URL || 'http://localhost:9222';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Chrome DevTools Wrapper Class
 */
class ChromeDevToolsWrapper {
  constructor(browserUrl = CHROME_DEBUG_URL) {
    this.browserUrl = browserUrl;
    this.connected = false;
  }

  /**
   * Check if Chrome is running and accessible
   */
  async isChromeRunning() {
    try {
      const response = await axios.get(`${this.browserUrl}/json/version`, {
        timeout: 5000
      });
      this.connected = true;
      return {
        connected: true,
        version: response.data
      };
    } catch (error) {
      this.connected = false;
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Get all open pages/tabs
   */
  async getPages() {
    try {
      const response = await axios.get(`${this.browserUrl}/json/list`, {
        timeout: 5000
      });
      return {
        success: true,
        pages: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * DEBUGGING HELPERS
   */

  /**
   * Capture console logs and errors from a page
   * @param {string} pageUrl - URL of the page to monitor
   * @param {number} duration - How long to monitor (ms)
   */
  async captureConsoleLogs(pageUrl, duration = 10000) {
    return {
      task: 'capture_console_logs',
      url: pageUrl,
      duration,
      note: 'Use cgIazK0mcp0list_console_messages tool for implementation'
    };
  }

  /**
   * Debug JavaScript errors on a page
   * @param {string} pageUrl - URL to debug
   */
  async debugJavaScriptErrors(pageUrl) {
    return {
      task: 'debug_javascript_errors',
      url: pageUrl,
      steps: [
        '1. Navigate to page',
        '2. List console messages (filter type=error)',
        '3. Get network requests (check for failed API calls)',
        '4. Take screenshot of error state'
      ],
      tools: [
        'cgIazK0mcp0navigate_page',
        'cgIazK0mcp0list_console_messages',
        'cgIazK0mcp0list_network_requests',
        'cgIazK0mcp0take_screenshot'
      ]
    };
  }

  /**
   * Inspect network requests for debugging
   * @param {string} pageUrl - URL to monitor
   */
  async inspectNetworkRequests(pageUrl) {
    return {
      task: 'inspect_network_requests',
      url: pageUrl,
      steps: [
        '1. Navigate to page',
        '2. List all network requests',
        '3. Filter for failed requests (4xx, 5xx)',
        '4. Get detailed request/response data'
      ],
      tools: [
        'cgIazK0mcp0navigate_page',
        'cgIazK0mcp0list_network_requests',
        'cgIazK0mcp0get_network_request'
      ]
    };
  }

  /**
   * Analyze DOM for issues
   * @param {string} pageUrl - URL to analyze
   */
  async analyzeDOMIssues(pageUrl) {
    return {
      task: 'analyze_dom_issues',
      url: pageUrl,
      steps: [
        '1. Navigate to page',
        '2. Take page snapshot (DOM tree)',
        '3. Evaluate script to check for common issues',
        '4. Document findings'
      ],
      tools: [
        'cgIazK0mcp0navigate_page',
        'cgIazK0mcp0take_snapshot',
        'cgIazK0mcp0evaluate_script'
      ]
    };
  }

  /**
   * TROUBLESHOOTING HELPERS
   */

  /**
   * Diagnose page load issues
   * @param {string} pageUrl - URL to diagnose
   */
  async diagnosePageLoad(pageUrl) {
    return {
      task: 'diagnose_page_load',
      url: pageUrl,
      steps: [
        '1. Start performance trace',
        '2. Navigate to page',
        '3. Stop performance trace',
        '4. Analyze insights (LCP, FCP, TTI)',
        '5. Identify bottlenecks'
      ],
      tools: [
        'cgIazK0mcp0performance_start_trace',
        'cgIazK0mcp0navigate_page',
        'cgIazK0mcp0performance_stop_trace',
        'cgIazK0mcp0performance_analyze_insight'
      ]
    };
  }

  /**
   * Troubleshoot form submission issues
   * @param {string} pageUrl - URL with form
   * @param {object} formData - Data to submit
   */
  async troubleshootFormSubmission(pageUrl, formData) {
    return {
      task: 'troubleshoot_form',
      url: pageUrl,
      formData,
      steps: [
        '1. Navigate to page',
        '2. Fill form fields',
        '3. Monitor console for errors',
        '4. Monitor network for POST requests',
        '5. Check for validation errors',
        '6. Take screenshots of each state'
      ],
      tools: [
        'cgIazK0mcp0navigate_page',
        'cgIazK0mcp0fill_form',
        'cgIazK0mcp0list_console_messages',
        'cgIazK0mcp0list_network_requests',
        'cgIazK0mcp0take_screenshot'
      ]
    };
  }

  /**
   * Debug broken UI elements
   * @param {string} pageUrl - URL to debug
   * @param {string} elementSelector - CSS selector of broken element
   */
  async debugBrokenUIElement(pageUrl, elementSelector) {
    return {
      task: 'debug_ui_element',
      url: pageUrl,
      selector: elementSelector,
      steps: [
        '1. Navigate to page',
        '2. Take snapshot to find element',
        '3. Evaluate script to inspect element properties',
        '4. Check computed styles',
        '5. Check for JavaScript errors affecting element',
        '6. Take screenshot highlighting element'
      ],
      tools: [
        'cgIazK0mcp0navigate_page',
        'cgIazK0mcp0take_snapshot',
        'cgIazK0mcp0evaluate_script',
        'cgIazK0mcp0take_screenshot'
      ]
    };
  }

  /**
   * UI/UX OPTIMIZATION HELPERS
   */

  /**
   * Test responsive design across devices
   * @param {string} pageUrl - URL to test
   */
  async testResponsiveDesign(pageUrl) {
    return {
      task: 'test_responsive_design',
      url: pageUrl,
      devices: [
        { name: 'Mobile', width: 375, height: 667 },
        { name: 'Tablet', width: 768, height: 1024 },
        { name: 'Desktop', width: 1920, height: 1080 }
      ],
      steps: [
        '1. For each device size:',
        '   a. Resize page',
        '   b. Navigate to URL',
        '   c. Take screenshot',
        '   d. Check for layout issues',
        '2. Compare screenshots',
        '3. Document differences'
      ],
      tools: [
        'cgIazK0mcp0resize_page',
        'cgIazK0mcp0navigate_page',
        'cgIazK0mcp0take_screenshot',
        'cgIazK0mcp0take_snapshot'
      ]
    };
  }

  /**
   * Capture visual regression screenshots
   * @param {string} pageUrl - URL to capture
   * @param {string} scenario - Description of scenario
   */
  async captureVisualRegression(pageUrl, scenario) {
    return {
      task: 'visual_regression',
      url: pageUrl,
      scenario,
      steps: [
        '1. Navigate to page',
        '2. Wait for page to fully load',
        '3. Take full page screenshot',
        '4. Save with timestamp and scenario name',
        '5. Compare with baseline if exists'
      ],
      tools: [
        'cgIazK0mcp0navigate_page',
        'cgIazK0mcp0wait_for',
        'cgIazK0mcp0take_screenshot'
      ],
      output: `screenshots/${scenario}-${Date.now()}.png`
    };
  }

  /**
   * Test user flow end-to-end
   * @param {string} startUrl - Starting URL
   * @param {array} steps - Array of user actions
   */
  async testUserFlow(startUrl, steps) {
    return {
      task: 'test_user_flow',
      url: startUrl,
      steps: steps,
      implementation: [
        '1. Navigate to start URL',
        '2. For each step:',
        '   a. Perform action (click, fill, etc)',
        '   b. Wait for navigation/changes',
        '   c. Verify expected state',
        '   d. Capture screenshot',
        '   e. Log any errors',
        '3. Generate flow report'
      ],
      tools: [
        'cgIazK0mcp0navigate_page',
        'cgIazK0mcp0click',
        'cgIazK0mcp0fill',
        'cgIazK0mcp0wait_for',
        'cgIazK0mcp0take_screenshot',
        'cgIazK0mcp0list_console_messages'
      ]
    };
  }

  /**
   * Analyze page performance
   * @param {string} pageUrl - URL to analyze
   */
  async analyzePerformance(pageUrl) {
    return {
      task: 'analyze_performance',
      url: pageUrl,
      steps: [
        '1. Start performance trace with reload',
        '2. Stop trace after page load',
        '3. Analyze all available insights',
        '4. Generate performance report with metrics'
      ],
      tools: [
        'cgIazK0mcp0performance_start_trace',
        'cgIazK0mcp0performance_stop_trace',
        'cgIazK0mcp0performance_analyze_insight'
      ],
      metrics: [
        'LCP (Largest Contentful Paint)',
        'FCP (First Contentful Paint)',
        'TTI (Time to Interactive)',
        'TBT (Total Blocking Time)',
        'CLS (Cumulative Layout Shift)'
      ]
    };
  }

  /**
   * Check accessibility issues
   * @param {string} pageUrl - URL to check
   */
  async checkAccessibility(pageUrl) {
    return {
      task: 'check_accessibility',
      url: pageUrl,
      steps: [
        '1. Navigate to page',
        '2. Take snapshot (includes ARIA info)',
        '3. Evaluate script to check:',
        '   - Alt text on images',
        '   - Form labels',
        '   - Heading hierarchy',
        '   - Color contrast',
        '   - Keyboard navigation',
        '4. Generate accessibility report'
      ],
      tools: [
        'cgIazK0mcp0navigate_page',
        'cgIazK0mcp0take_snapshot',
        'cgIazK0mcp0evaluate_script',
        'cgIazK0mcp0press_key'
      ]
    };
  }

  /**
   * UTILITY HELPERS
   */

  /**
   * Generate debug report for a page
   * @param {string} pageUrl - URL to debug
   */
  async generateDebugReport(pageUrl) {
    return {
      task: 'generate_debug_report',
      url: pageUrl,
      sections: [
        'Console Errors',
        'Network Failures',
        'Performance Metrics',
        'JavaScript Errors',
        'Resource Load Times',
        'Screenshots'
      ],
      steps: [
        '1. Navigate to page',
        '2. Collect console messages',
        '3. Collect network requests',
        '4. Run performance trace',
        '5. Take screenshots',
        '6. Compile into markdown report'
      ]
    };
  }

  /**
   * Monitor page for specific time period
   * @param {string} pageUrl - URL to monitor
   * @param {number} duration - Duration in milliseconds
   */
  async monitorPage(pageUrl, duration = 60000) {
    return {
      task: 'monitor_page',
      url: pageUrl,
      duration,
      monitored: [
        'Console messages (especially errors)',
        'Network requests (failed requests)',
        'Performance metrics',
        'Memory usage',
        'CPU usage'
      ],
      output: 'Real-time monitoring report'
    };
  }
}

// Export singleton instance
export const chromeDevTools = new ChromeDevToolsWrapper();

// Export class for custom instances
export default ChromeDevToolsWrapper;

// Example usage documentation
export const USAGE_EXAMPLES = {
  debugging: {
    captureErrors: `
      const result = await chromeDevTools.debugJavaScriptErrors('http://localhost:3000');
      // Returns workflow for debugging JS errors
    `,
    networkDebug: `
      const result = await chromeDevTools.inspectNetworkRequests('http://localhost:3000/api');
      // Returns workflow for inspecting network issues
    `
  },
  troubleshooting: {
    pageLoad: `
      const result = await chromeDevTools.diagnosePageLoad('http://localhost:3000');
      // Returns workflow for diagnosing load issues
    `,
    formIssues: `
      const result = await chromeDevTools.troubleshootFormSubmission(
        'http://localhost:3000/signup',
        { email: 'test@example.com', password: 'test123' }
      );
      // Returns workflow for troubleshooting forms
    `
  },
  uiux: {
    responsive: `
      const result = await chromeDevTools.testResponsiveDesign('http://localhost:3000');
      // Returns workflow for testing responsive design
    `,
    performance: `
      const result = await chromeDevTools.analyzePerformance('http://localhost:3000');
      // Returns workflow for performance analysis
    `,
    accessibility: `
      const result = await chromeDevTools.checkAccessibility('http://localhost:3000');
      // Returns workflow for accessibility checks
    `
  }
};
