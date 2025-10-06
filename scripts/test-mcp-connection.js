#!/usr/bin/env node

/**
 * Cloudflare MCP Connection Test Script
 * 
 * This script validates the Cloudflare MCP portal connection and tests
 * basic functionality of the configured MCP servers.
 * 
 * Usage: node scripts/test-mcp-connection.js
 */

import 'dotenv/config';
import { spawn } from 'child_process';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function header(message) {
  log(`\n${'='.repeat(60)}`, COLORS.cyan);
  log(message, COLORS.bright + COLORS.cyan);
  log('='.repeat(60), COLORS.cyan);
}

function success(message) {
  log(`✓ ${message}`, COLORS.green);
}

function error(message) {
  log(`✗ ${message}`, COLORS.red);
}

function info(message) {
  log(`ℹ ${message}`, COLORS.blue);
}

function warning(message) {
  log(`⚠ ${message}`, COLORS.yellow);
}

// Validate environment variables
function validateEnvironment() {
  header('Environment Configuration Check');
  
  const required = [
    'CF_ACCOUNT_ID',
    'MCP_PORTAL_URL',
  ];
  
  const optional = [
    'CF_API_TOKEN_WORKERS_AI',
    'CF_API_TOKEN_R2',
    'CF_API_TOKEN_D1',
    'CF_TOKEN_C3S_NEXUS',
  ];
  
  let allValid = true;
  
  info('Checking required variables:');
  for (const varName of required) {
    if (process.env[varName]) {
      success(`${varName}: configured`);
    } else {
      error(`${varName}: missing`);
      allValid = false;
    }
  }
  
  info('\nChecking optional variables:');
  for (const varName of optional) {
    if (process.env[varName]) {
      success(`${varName}: configured`);
    } else {
      warning(`${varName}: not configured (some features may not work)`);
    }
  }
  
  return allValid;
}

// Test MCP remote connection
async function testMCPConnection() {
  header('MCP Portal Connection Test');
  
  const portalUrl = process.env.MCP_PORTAL_URL || 'https://mcp.c3s.nexus';
  info(`Testing connection to: ${portalUrl}`);
  
  return new Promise((resolve) => {
    const proc = spawn('npx', [
      '-y',
      'mcp-remote',
      `${portalUrl}/sse`,
      '--test'
    ], {
      env: {
        ...process.env,
        CF_API_TOKEN: process.env.CF_TOKEN_C3S_NEXUS,
        CF_ACCOUNT_ID: process.env.CF_ACCOUNT_ID,
      },
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    const timeout = setTimeout(() => {
      proc.kill();
      warning('Connection test timed out after 30 seconds');
      warning('This may indicate network issues or portal configuration problems');
      resolve(false);
    }, 30000);
    
    proc.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code === 0 || output.includes('connected') || errorOutput.includes('connected')) {
        success('MCP portal connection successful');
        resolve(true);
      } else {
        error('MCP portal connection failed');
        if (errorOutput) {
          info('Error details:');
          console.log(errorOutput);
        }
        resolve(false);
      }
    });
    
    proc.on('error', (err) => {
      clearTimeout(timeout);
      error(`Connection error: ${err.message}`);
      resolve(false);
    });
  });
}

// Check Cline MCP settings
async function checkClineSettings() {
  header('Cline MCP Settings Check');
  
  const settingsPath = process.env.HOME + 
    '/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json';
  
  try {
    const fs = await import('fs');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    if (settings.mcpServers && settings.mcpServers['github.com/cloudflare/mcp-server-cloudflare']) {
      success('Cloudflare MCP server configured in Cline');
      
      const config = settings.mcpServers['github.com/cloudflare/mcp-server-cloudflare'];
      info(`Portal URL: ${config.args[2]}`);
      info(`Disabled: ${config.disabled}`);
      info(`Timeout: ${config.timeout}s`);
      
      if (config.env && config.env.CF_ACCOUNT_ID) {
        success('Account ID configured');
      } else {
        warning('Account ID not configured in MCP settings');
      }
      
      return true;
    } else {
      error('Cloudflare MCP server not found in Cline settings');
      return false;
    }
  } catch (err) {
    error(`Could not read Cline settings: ${err.message}`);
    warning('This may be normal if you haven\'t installed Cline yet');
    return false;
  }
}

// Provide setup instructions
function provideInstructions() {
  header('Next Steps');
  
  log('\nTo complete the MCP setup:\n', COLORS.bright);
  
  log('1. Configure MCP Portal in Cloudflare Dashboard:', COLORS.cyan);
  log('   • Navigate to: https://one.dash.cloudflare.com/');
  log('   • Go to: Zero Trust → Access → Applications → AI controls → MCP servers');
  log('   • Add the following servers:');
  log('     - Workers Bindings: https://bindings.mcp.cloudflare.com/sse');
  log('     - Browser Rendering: https://browser.mcp.cloudflare.com/sse');
  log('     - Documentation: https://docs.mcp.cloudflare.com/sse');
  log('     - Observability: https://observability.mcp.cloudflare.com/sse');
  log('     - Workers Builds: https://builds.mcp.cloudflare.com/sse\n');
  
  log('2. Restart VS Code / Cline:', COLORS.cyan);
  log('   • Close and reopen VS Code to load new MCP configuration');
  log('   • The Cloudflare MCP server should appear in "Connected MCP Servers"\n');
  
  log('3. Verify Connection:', COLORS.cyan);
  log('   • Open Cline and check for Cloudflare MCP tools');
  log('   • Try a simple query to test connectivity');
  log('   • Check docs/MCP_CONFIGURATION.md for usage examples\n');
  
  log('4. Integrate with Dev-Team Agents:', COLORS.cyan);
  log('   • See docs/MCP_CONFIGURATION.md for agent integration patterns');
  log('   • Each agent can now use appropriate Cloudflare MCP tools');
  log('   • Monitor usage and adjust timeouts as needed\n');
}

// Main test execution
async function main() {
  log('\n' + '='.repeat(60), COLORS.bright + COLORS.cyan);
  log('Cloudflare MCP Connection Test', COLORS.bright + COLORS.cyan);
  log('='.repeat(60) + '\n', COLORS.bright + COLORS.cyan);
  
  // Step 1: Validate environment
  const envValid = validateEnvironment();
  if (!envValid) {
    error('\nEnvironment validation failed. Please check your .env file.');
    process.exit(1);
  }
  
  // Step 2: Check Cline settings
  await checkClineSettings();
  
  // Step 3: Test MCP connection
  const connectionSuccessful = await testMCPConnection();
  
  // Step 4: Provide instructions
  provideInstructions();
  
  // Summary
  header('Test Summary');
  if (envValid && connectionSuccessful) {
    success('All tests passed! MCP configuration looks good.');
    log('\nYou can now use Cloudflare MCP tools in your dev-team agents.', COLORS.green);
  } else {
    warning('Some tests failed. Please review the output above.');
    log('\nRefer to docs/MCP_CONFIGURATION.md for troubleshooting.', COLORS.yellow);
  }
  
  log('');
}

// Run tests
main().catch((err) => {
  error(`Test execution failed: ${err.message}`);
  console.error(err);
  process.exit(1);
});
