#!/usr/bin/env node
import { program } from '@pinflow/relay/program';

program.parse(['npx', 'domscribe', 'mcp', ...process.argv.slice(2)]);
