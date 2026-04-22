#!/usr/bin/env node
import { program } from '@domscribe/relay/program';

program.parse(['npx', 'pinflow', 'mcp', ...process.argv.slice(2)]);
