import './pinflow-runs-app.js';
import { PinflowRunsApp } from './pinflow-runs-app.js';

describe('<pinflow-runs-app>', () => {
  it('renders empty-state when runsByFolder is empty', async () => {
    // Arrange
    const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('pinflow-empty-state')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('pinflow-folder-section')).toBeNull();
    el.remove();
  });

  it('renders one folder-section per folder', async () => {
    // Arrange
    const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;

    // Act
    document.body.appendChild(el);
    el.runsByFolder = {
      '/repo/alpha': [{ runId: 'r_1', summaryPath: '/p1' } as never],
      '/repo/beta': [{ runId: 'r_2', summaryPath: '/p2' } as never],
    };
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelectorAll('pinflow-folder-section').length).toBe(2);
    el.remove();
  });

  it('marks the activeFolder section as default-expanded and isActive', async () => {
    // Arrange
    const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;

    // Act
    document.body.appendChild(el);
    el.runsByFolder = {
      '/repo/alpha': [{ runId: 'r_1', summaryPath: '/p1' } as never],
      '/repo/beta': [{ runId: 'r_2', summaryPath: '/p2' } as never],
    };
    el.activeFolder = '/repo/alpha';
    await el.updateComplete;

    // Assert
    const sections = el.shadowRoot!.querySelectorAll('pinflow-folder-section');
    const alphaSection = sections[0] as HTMLElement & {
      defaultExpanded: boolean;
      isActive: boolean;
    };
    const betaSection = sections[1] as HTMLElement & {
      defaultExpanded: boolean;
      isActive: boolean;
    };
    expect(alphaSection.defaultExpanded).toBe(true);
    expect(alphaSection.isActive).toBe(true);
    expect(betaSection.defaultExpanded).toBe(false);
    expect(betaSection.isActive).toBe(false);
    el.remove();
  });

  it('renders 5 folders × 80 runs each without throwing (stress test)', async () => {
    // Arrange
    const runsByFolder = Object.fromEntries(
      Array.from({ length: 5 }, (_, fi) => [
        `/repo/folder-${fi}`,
        Array.from({ length: 80 }, (_, ri) => ({
          runId: `r_${fi}_${ri}`,
          summaryPath: `/p${fi}_${ri}`,
        })) as never[],
      ]),
    );
    const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;

    // Act
    document.body.appendChild(el);
    el.runsByFolder = runsByFolder;
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelectorAll('pinflow-folder-section').length).toBe(5);
    el.remove();
  });
});
