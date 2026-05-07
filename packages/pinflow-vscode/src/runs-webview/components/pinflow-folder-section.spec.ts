import './pinflow-folder-section.js';
import { PinflowFolderSection } from './pinflow-folder-section.js';

describe('<pinflow-folder-section>', () => {
  it('renders header with displayName and run count', async () => {
    // Arrange
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.displayName = 'my-project';
    el.runs = [
      { runId: 'r_1', summaryPath: '/p1' } as never,
      { runId: 'r_2', summaryPath: '/p2' } as never,
    ];

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('.name')!.textContent).toContain('my-project');
    expect(el.shadowRoot!.querySelector('.count')!.textContent).toContain('2');
    el.remove();
  });

  it('uses singular "run" for exactly one run', async () => {
    // Arrange
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.runs = [{ runId: 'r_1', summaryPath: '/p1' } as never];

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('.count')!.textContent).toBe('1 run');
    el.remove();
  });

  it('uses plural "runs" for zero or multiple runs', async () => {
    // Arrange
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.runs = [];

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('.count')!.textContent).toBe('0 runs');
    el.remove();
  });

  it('sets expanded attribute when defaultExpanded is true', async () => {
    // Arrange
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.defaultExpanded = true;

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.hasAttribute('expanded')).toBe(true);
    el.remove();
  });

  it('toggles expanded state on header click', async () => {
    // Arrange
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    document.body.appendChild(el);
    await el.updateComplete;

    // Act
    el.shadowRoot!.querySelector<HTMLElement>('.header')!.click();
    await el.updateComplete;

    // Assert
    expect(el.hasAttribute('expanded')).toBe(true);
    el.remove();
  });

  it('renders one run-card per run when expanded', async () => {
    // Arrange
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.defaultExpanded = true;
    el.runs = [
      { runId: 'r_1', summaryPath: '/p1' } as never,
      { runId: 'r_2', summaryPath: '/p2' } as never,
      { runId: 'r_3', summaryPath: '/p3' } as never,
    ];

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelectorAll('pinflow-run-card').length).toBe(3);
    el.remove();
  });

  it('renders inline empty-state when expanded with no runs', async () => {
    // Arrange
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.defaultExpanded = true;
    el.runs = [];

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('.empty')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('pinflow-run-card')).toBeNull();
    el.remove();
  });

  it('renders active-dot when isActive is true', async () => {
    // Arrange
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.isActive = true;

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('.active-dot')).not.toBeNull();
    el.remove();
  });
});

describe('<pinflow-folder-section> unconfigured state', () => {
  it('renders Setup button when folderStatus is not-configured', async () => {
    // Arrange
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.folderPath = '/repo';
    el.displayName = 'repo';
    el.folderStatus = 'not-configured';
    el.defaultExpanded = true;
    document.body.appendChild(el);
    await el.updateComplete;

    // Act
    const button = el.shadowRoot!.querySelector<HTMLButtonElement>('.setup-button');

    // Assert
    expect(button).not.toBeNull();
    expect(button!.textContent!.trim()).toContain('Setup PinFlow');
    el.remove();
  });

  it('emits setup-clicked event with folderPath when button clicked', async () => {
    // Arrange
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.folderPath = '/repo';
    el.folderStatus = 'not-configured';
    el.defaultExpanded = true;
    document.body.appendChild(el);
    await el.updateComplete;
    let received: CustomEvent | undefined;
    el.addEventListener('setup-clicked', (e) => {
      received = e as CustomEvent;
    });

    // Act
    el.shadowRoot!.querySelector<HTMLButtonElement>('.setup-button')!.click();

    // Assert
    expect(received).toBeDefined();
    expect(received!.detail).toEqual({ folderPath: '/repo' });

    el.remove();
  });

  it('does not render run cards when not-configured', async () => {
    // Arrange
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.folderPath = '/repo';
    el.folderStatus = 'not-configured';
    el.defaultExpanded = true;
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('pinflow-run-card')).toBeNull();

    el.remove();
  });
});

describe('<pinflow-folder-section> active-run forwarding', () => {
  it('marks only the matching card as expanded and forwards live data', async () => {
    // Arrange
    const el = document.createElement('pinflow-folder-section') as PinflowFolderSection;
    el.folderPath = '/repo';
    el.displayName = 'repo';
    el.runs = [
      { runId: 'r_1', summaryPath: '/p1' } as never,
      { runId: 'r_2', summaryPath: '/p2' } as never,
    ];
    el.folderStatus = 'configured';
    el.defaultExpanded = true;
    el.activeRunId = 'r_2';
    el.liveTranscript = 'live!';
    el.liveChangedFiles = [{ path: 'src/x.ts' }] as never;

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    const cards = Array.from(el.shadowRoot!.querySelectorAll('pinflow-run-card')) as Array<
      HTMLElement & {
        isExpanded: boolean;
        liveTranscript: string;
        liveChangedFiles: readonly { path: string }[] | null;
      }
    >;
    expect(cards.length).toBe(2);
    expect(cards[0].isExpanded).toBe(false);
    expect(cards[0].liveTranscript).toBe('');
    expect(cards[0].liveChangedFiles).toBeNull();
    expect(cards[1].isExpanded).toBe(true);
    expect(cards[1].liveTranscript).toBe('live!');
    expect(cards[1].liveChangedFiles).toEqual([{ path: 'src/x.ts' }]);

    el.remove();
  });
});
