#!/usr/bin/env node
/**
 * Kill processes occupying development ports
 * Usage: node scripts/kill-ports.js [port1,port2,...]
 * Default ports: 5173, 3000
 */

import { execSync } from 'child_process';
import process from 'process';

const DEFAULT_PORTS = [5173, 3000];
const ports = process.argv.slice(2).length > 0
  ? process.argv.slice(2)[0].split(',').map(p => parseInt(p.trim(), 10))
  : DEFAULT_PORTS;

function killPort(port) {
  try {
    // Windows: find PID using netstat and kill it
    const findCmd = `netstat -ano | findstr :${port} | findstr LISTENING`;
    let output;
    try {
      output = execSync(findCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      // No process found on this port
      console.log(`✓ Port ${port} is free`);
      return;
    }

    const lines = output.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      console.log(`✓ Port ${port} is free`);
      return;
    }

    // Extract PIDs and kill them
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(parseInt(pid, 10))) {
        pids.add(pid);
      }
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
        console.log(`✓ Killed process ${pid} on port ${port}`);
      } catch (e) {
        console.log(`✗ Failed to kill process ${pid} on port ${port}`);
      }
    }
  } catch (error) {
    console.log(`✗ Error checking port ${port}: ${error.message}`);
  }
}

console.log('Killing processes on ports:', ports.join(', '));
for (const port of ports) {
  killPort(port);
}
console.log('');
