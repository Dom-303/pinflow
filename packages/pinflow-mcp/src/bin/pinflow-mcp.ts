#!/usr/bin/env node
import { program } from '@pinflow/relay/program';

program.parse(['npx', 'pinflow', 'mcp', ...process.argv.slice(2)]);
