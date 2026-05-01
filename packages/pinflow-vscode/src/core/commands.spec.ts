import { startStandardWorkflow, type TerminalFactory } from './commands.js';

describe('startStandardWorkflow', () => {
  it('starts pinflow dev and pinflow follow in visible terminals', () => {
    const calls: Array<{ terminal: string; text?: string; shown?: true }> = [];
    const createTerminal: TerminalFactory = (name, cwd) => ({
      sendText(text) {
        calls.push({ terminal: `${name}:${cwd}`, text });
      },
      show() {
        calls.push({ terminal: `${name}:${cwd}`, shown: true });
      },
    });

    startStandardWorkflow('/repo', createTerminal);

    expect(calls).toEqual([
      { terminal: 'PinFlow Dev:/repo', text: 'pinflow dev' },
      { terminal: 'PinFlow Dev:/repo', shown: true },
      { terminal: 'PinFlow Follow:/repo', text: 'pinflow follow' },
      { terminal: 'PinFlow Follow:/repo', shown: true },
    ]);
  });
});
