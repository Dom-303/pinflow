import './pinflow-runs-header.js';
import { PinflowRunsHeader } from './pinflow-runs-header.js';

describe('<pinflow-runs-header>', () => {
  it('renders singular for count of 1', async () => {
    const el = document.createElement('pinflow-runs-header') as PinflowRunsHeader;
    el.count = 1;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('1 run');
    expect(el.shadowRoot!.textContent).not.toContain('1 runs');
    el.remove();
  });

  it('renders plural for count of 0 or > 1', async () => {
    const el = document.createElement('pinflow-runs-header') as PinflowRunsHeader;
    el.count = 5;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('5 runs');
    el.remove();
  });

  it('emits pinflow-compare-mode-toggle when the Compare button is clicked', async () => {
    // Arrange
    const el = document.createElement('pinflow-runs-header') as PinflowRunsHeader;
    document.body.appendChild(el);
    await el.updateComplete;
    const events: Event[] = [];
    el.addEventListener('pinflow-compare-mode-toggle', (e) => events.push(e));

    // Act
    el.shadowRoot!
      .querySelector<HTMLButtonElement>('button[aria-pressed]')!
      .click();

    // Assert
    expect(events).toHaveLength(1);
    el.remove();
  });

  it('shows n/2 selected and a Clear button when compareMode is on with selections', async () => {
    // Arrange
    const el = document.createElement('pinflow-runs-header') as PinflowRunsHeader;
    el.count = 4;
    el.compareMode = true;
    el.selectedCount = 1;
    document.body.appendChild(el);

    // Act
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.textContent).toContain('1/2 selected');
    const clearButton = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button'),
    ).find((b) => b.textContent?.trim() === 'Clear');
    expect(clearButton).toBeDefined();
    el.remove();
  });

  it('hides the Clear button when nothing is selected', async () => {
    // Arrange
    const el = document.createElement('pinflow-runs-header') as PinflowRunsHeader;
    el.count = 4;
    el.compareMode = true;
    el.selectedCount = 0;
    document.body.appendChild(el);

    // Act
    await el.updateComplete;

    // Assert
    const clearButton = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button'),
    ).find((b) => b.textContent?.trim() === 'Clear');
    expect(clearButton).toBeUndefined();
    el.remove();
  });

  it('emits pinflow-compare-clear when the Clear button is clicked', async () => {
    // Arrange
    const el = document.createElement('pinflow-runs-header') as PinflowRunsHeader;
    el.compareMode = true;
    el.selectedCount = 2;
    document.body.appendChild(el);
    await el.updateComplete;
    const events: Event[] = [];
    el.addEventListener('pinflow-compare-clear', (e) => events.push(e));

    // Act
    Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === 'Clear')!
      .click();

    // Assert
    expect(events).toHaveLength(1);
    el.remove();
  });
});
