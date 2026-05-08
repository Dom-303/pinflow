import { describe, expect, it } from 'vitest';

import { parseTranscriptMetadata } from './transcript-metadata.js';

describe('parseTranscriptMetadata', () => {
  it('extracts the model from the Codex boot header', () => {
    const transcript = [
      '[pinflow-runner] Run created: .pinflow/runs/...',
      'OpenAI Codex v0.128.0 (research preview)',
      '--------',
      'workdir: /home/user/project',
      'model: gpt-5.5',
      'provider: openai',
      '--------',
    ].join('\n');

    expect(parseTranscriptMetadata(transcript).model).toBe('gpt-5.5');
  });

  it('extracts the total token count from the trailing usage line', () => {
    const transcript = ['some output', 'more output', 'tokens used', '18,480', ''].join(
      '\n',
    );

    expect(parseTranscriptMetadata(transcript).totalTokens).toBe(18480);
  });

  it('handles a token count without thousands separators', () => {
    const transcript = ['tokens used', '482'].join('\n');

    expect(parseTranscriptMetadata(transcript).totalTokens).toBe(482);
  });

  it('returns undefined fields when the transcript has no metadata markers', () => {
    const transcript = '[pinflow-runner] Run created\nUnrelated noise here.\n';

    const metadata = parseTranscriptMetadata(transcript);

    expect(metadata.model).toBeUndefined();
    expect(metadata.totalTokens).toBeUndefined();
  });

  it('returns undefined for a non-numeric token line instead of throwing', () => {
    const transcript = ['tokens used', 'not-a-number'].join('\n');

    expect(parseTranscriptMetadata(transcript).totalTokens).toBeUndefined();
  });

  it('parses both fields from a realistic full transcript', () => {
    const transcript = [
      '[pinflow-runner] Run created: .pinflow/runs/2026-05/2026-05-07/run-id',
      '[pinflow-runner] Claimed annotation ann_x',
      '[pinflow-runner] codex CLI: codex-cli 0.128.0',
      'OpenAI Codex v0.128.0 (research preview)',
      '--------',
      'workdir: /home/user/project',
      'model: gpt-5',
      'provider: openai',
      '--------',
      'user',
      'PinFlow task. Edit the local repo.',
      '... lots of agent chatter ...',
      'tokens used',
      '12,340',
      '[pinflow-runner] Command exited with code 0',
    ].join('\n');

    const metadata = parseTranscriptMetadata(transcript);

    expect(metadata.model).toBe('gpt-5');
    expect(metadata.totalTokens).toBe(12340);
  });
});
