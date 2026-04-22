#!/usr/bin/env node
/**
 * The pinflow-mcp command
 */
import { program } from '../program.js';

program.parse(['npx', 'pinflow', 'mcp', ...process.argv.slice(2)]);
