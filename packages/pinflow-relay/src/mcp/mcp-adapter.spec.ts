import { McpAdapter, createMcpAdapter } from './mcp-adapter.js';

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: class {
      metadata: unknown;
      capabilities: unknown;
      registeredTools = new Map<string, unknown>();
      registeredPrompts = new Map<string, unknown>();

      constructor(metadata: unknown, options: unknown) {
        this.metadata = metadata;
        this.capabilities = options;
      }

      registerTool(name: string, config: unknown, handler: unknown) {
        this.registeredTools.set(name, { config, handler });
      }

      registerPrompt(name: string, config: unknown, handler: unknown) {
        this.registeredPrompts.set(name, { config, handler });
      }

      async connect() {
        //
      }
      async close() {
        //
      }
    },
  };
});

vi.mock('../client/relay-http-client.js', () => ({
  RelayHttpClient: class {
    constructor(
      public host: string,
      public port: number,
    ) {}
  },
}));

function getServer(adapter: McpAdapter) {
  return (
    adapter as unknown as {
      server: {
        metadata: { name: string; version: string };
        registeredTools: Map<string, unknown>;
        registeredPrompts: Map<string, unknown>;
      };
    }
  ).server;
}

describe('McpAdapter', () => {
  describe('active mode', () => {
    it('should register all 12 tools', () => {
      // Act
      const adapter = new McpAdapter({
        mode: 'active',
        relayHost: 'localhost',
        relayPort: 9876,
      });

      // Assert
      const server = getServer(adapter);
      expect(server.registeredTools.size).toBe(12);
      expect(server.registeredTools.has('pinflow.resolve')).toBe(true);
      expect(server.registeredTools.has('pinflow.resolve.batch')).toBe(true);
      expect(server.registeredTools.has('pinflow.manifest.stats')).toBe(true);
      expect(server.registeredTools.has('pinflow.manifest.query')).toBe(true);
      expect(server.registeredTools.has('pinflow.annotation.get')).toBe(true);
      expect(server.registeredTools.has('pinflow.annotation.list')).toBe(
        true,
      );
      expect(server.registeredTools.has('pinflow.annotation.process')).toBe(
        true,
      );
      expect(
        server.registeredTools.has('pinflow.annotation.updateStatus'),
      ).toBe(true);
      expect(server.registeredTools.has('pinflow.annotation.respond')).toBe(
        true,
      );
      expect(server.registeredTools.has('pinflow.annotation.search')).toBe(
        true,
      );
      expect(server.registeredTools.has('pinflow.status')).toBe(true);
      expect(server.registeredTools.has('pinflow.query.bySource')).toBe(true);
    });

    it('should register all 4 prompts', () => {
      // Act
      const adapter = new McpAdapter({
        mode: 'active',
        relayHost: 'localhost',
        relayPort: 9876,
      });

      // Assert
      const server = getServer(adapter);
      expect(server.registeredPrompts.size).toBe(4);
      expect(server.registeredPrompts.has('process_next')).toBe(true);
      expect(server.registeredPrompts.has('check_status')).toBe(true);
      expect(server.registeredPrompts.has('explore_component')).toBe(true);
      expect(server.registeredPrompts.has('find_annotations')).toBe(true);
    });

    it('should use the PinFlow MCP server identity', () => {
      const adapter = new McpAdapter({
        mode: 'active',
        relayHost: 'localhost',
        relayPort: 9876,
      });

      const server = getServer(adapter);
      expect(server.metadata.name).toBe('pinflow');
    });

    it('should start and connect transport', async () => {
      const adapter = new McpAdapter({
        mode: 'active',
        relayHost: 'localhost',
        relayPort: 9876,
      });

      // Should not throw
      await adapter.start();
    });

    it('should close gracefully', async () => {
      const adapter = new McpAdapter({
        mode: 'active',
        relayHost: 'localhost',
        relayPort: 9876,
      });

      // Should not throw
      await adapter.close();
    });

    it('uses pinflow-preferring debug logs without changing tool names', async () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const adapter = new McpAdapter({
        mode: 'active',
        relayHost: 'localhost',
        relayPort: 9876,
        debug: true,
      });

      const server = getServer(adapter);
      const resolveTool = server.registeredTools.get('pinflow.resolve') as {
        handler: (args: unknown) => Promise<unknown>;
      };
      const checkStatusPrompt = server.registeredPrompts.get(
        'check_status',
      ) as {
        handler: (args: unknown) => unknown;
      };

      await adapter.start();
      await resolveTool.handler({ entryId: 'ds_test' });
      checkStatusPrompt.handler({});
      await adapter.close();

      expect(consoleError).toHaveBeenCalledWith(
        '[pinflow-mcp] MCP server started',
      );
      expect(consoleError).toHaveBeenCalledWith(
        '[pinflow-mcp] Tool call: pinflow.resolve',
        { entryId: 'ds_test' },
      );
      expect(consoleError).toHaveBeenCalledWith(
        '[pinflow-mcp] GetPrompt: check_status',
        {},
      );
      expect(consoleError).toHaveBeenCalledWith(
        '[pinflow-mcp] MCP server closed',
      );

      consoleError.mockRestore();
    });
  });

  describe('dormant mode', () => {
    it('should register only the status tool', () => {
      // Act
      const adapter = new McpAdapter({
        mode: 'dormant',
        cwd: '/home/user/some-project',
      });

      // Assert
      const server = getServer(adapter);
      expect(server.registeredTools.size).toBe(1);
      expect(server.registeredTools.has('pinflow.status')).toBe(true);
    });

    it('should register no prompts', () => {
      // Act
      const adapter = new McpAdapter({
        mode: 'dormant',
        cwd: '/home/user/some-project',
      });

      // Assert
      const server = getServer(adapter);
      expect(server.registeredPrompts.size).toBe(0);
    });

    it('should start and connect transport', async () => {
      const adapter = new McpAdapter({
        mode: 'dormant',
        cwd: '/home/user/some-project',
      });

      // Should not throw
      await adapter.start();
    });

    it('should close gracefully', async () => {
      const adapter = new McpAdapter({
        mode: 'dormant',
        cwd: '/home/user/some-project',
      });

      // Should not throw
      await adapter.close();
    });
  });
});

describe('createMcpAdapter', () => {
  it('should return an McpAdapter instance for active mode', () => {
    const adapter = createMcpAdapter({
      mode: 'active',
      relayHost: 'localhost',
      relayPort: 9876,
    });

    expect(adapter).toBeInstanceOf(McpAdapter);
  });

  it('should return an McpAdapter instance for dormant mode', () => {
    const adapter = createMcpAdapter({
      mode: 'dormant',
      cwd: '/tmp/test',
    });

    expect(adapter).toBeInstanceOf(McpAdapter);
  });
});
