#!/usr/bin/env node
/**
 * PinFlow CLI
 *
 * Commands:
 *   serve   - Start the relay server (foreground or daemon)
 *   stop    - Stop a running daemon
 *   status  - Check relay status
 *   mcp     - Start MCP adapter for agent integration
 *   runner  - Run local agent autostart worker
 */
import { program } from '../program.js';

program.parse();
