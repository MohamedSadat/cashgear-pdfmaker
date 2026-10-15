import { PdfClientError } from '@repo/pdf-client';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToolRunner } from '../src/tool-runner/ToolRunner';
import { fakeModeTool, fakeSingleTool, fakeTool, pdfFile, renderWithIntl } from './helpers';

const pdfResult = { bytes: new Uint8Array([37, 80, 68, 70]), kind: 'pdf' } as const;
const zipResult = { bytes: new Uint8Array([80, 75, 3, 4]), kind: 'zip' } as const;
/** The Blob behind the last object URL the runner created. */
const lastBlob = () => vi.mocked(URL.createObjectURL).mock.lastCall?.[0] as Blob;

const fileInput = () => document.querySelector<HTMLInputElement>('input[type=file]')!;
const rowNames = () =>
  screen.getAllByTestId('file-row').map((row) => row.querySelector('bdi')!.textContent);

describe('ToolRunner', () => {
  it('lists added files and reorders them with Move up / Move down', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ToolRunner tool={fakeTool} run={vi.fn()} />);
    await user.upload(fileInput(), [pdfFile('a.pdf'), pdfFile('b.pdf'), pdfFile('c.pdf')]);
    await waitFor(() => expect(rowNames()).toEqual(['a.pdf', 'b.pdf', 'c.pdf']));

    const rows = screen.getAllByTestId('file-row');
    await user.click(within(rows[2]!).getByRole('button', { name: 'Move up' }));
    expect(rowNames()).toEqual(['a.pdf', 'c.pdf', 'b.pdf']);
    await user.click(
      within(screen.getAllByTestId('file-row')[0]!).getByRole('button', { name: 'Move down' }),
    );
    expect(rowNames()).toEqual(['c.pdf', 'a.pdf', 'b.pdf']);
  });

  it('rejects a file whose bytes are not a PDF, whatever its name', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ToolRunner tool={fakeTool} run={vi.fn()} />);
    const fake = new File(['just text'], 'fake.pdf', { type: 'application/pdf' });
    await user.upload(fileInput(), [pdfFile('ok.pdf'), fake]);
    expect(await screen.findByRole('alert')).toHaveTextContent("“fake.pdf” isn't a file type");
    expect(rowNames()).toEqual(['ok.pdf']);
  });

  it('disables the action until enough files are added', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ToolRunner tool={fakeTool} run={vi.fn()} />);
    await user.upload(fileInput(), [pdfFile('one.pdf')]);
    expect(await screen.findByRole('button', { name: 'Combine' })).toBeDisabled();
    expect(screen.getByText('Add at least 2 files.')).toBeInTheDocument();
  });

  it('blocks a selection over the size limit', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ToolRunner tool={fakeTool} run={vi.fn()} />);
    const mib = 1024 * 1024;
    await user.upload(fileInput(), [pdfFile('big1.pdf', 6 * mib), pdfFile('big2.pdf', 6 * mib)]);
    expect(await screen.findByRole('alert')).toHaveTextContent('exceed 10 MB');
    expect(screen.getByRole('button', { name: 'Combine' })).toBeDisabled();
  });

  it('renders schema options and passes them to the run', async () => {
    const user = userEvent.setup();
    const run = vi.fn().mockResolvedValue(pdfResult);
    renderWithIntl(<ToolRunner tool={fakeTool} run={run} />);
    await user.upload(fileInput(), [pdfFile('a.pdf'), pdfFile('b.pdf')]);
    await user.type(await screen.findByLabelText('File name (optional)'), 'تقرير');
    await user.click(screen.getByRole('button', { name: 'Combine' }));

    expect(run).toHaveBeenCalledWith(
      'fake',
      [expect.any(File), expect.any(File)],
      { outputName: 'تقرير' },
      expect.objectContaining({ producer: expect.any(String) }),
    );
    const link = await screen.findByRole('link', { name: 'Download' });
    expect(link).toHaveAttribute('download', 'تقرير.pdf');
    expect(lastBlob().type).toBe('application/pdf');
    expect(link).toHaveAttribute('href', 'blob:test-result');
  });

  it('shows a translated error naming the file that caused it', async () => {
    const user = userEvent.setup();
    const run = vi.fn().mockRejectedValue(new PdfClientError('ENCRYPTED', { fileIndex: 1 }));
    renderWithIntl(<ToolRunner tool={fakeTool} run={run} />, 'ar');
    await user.upload(fileInput(), [pdfFile('a.pdf'), pdfFile('سري.pdf')]);
    await user.click(await screen.findByRole('button', { name: 'اجمع' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('الملف «سري.pdf» محمي بكلمة مرور');
    // Back to the editable state, with the offending file still listed.
    expect(rowNames()).toEqual(['a.pdf', 'سري.pdf']);
  });
});

describe('ToolRunner with one file and a required option', () => {
  it('hides "Add more files" once the single file is added', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ToolRunner tool={fakeSingleTool} run={vi.fn()} />);
    expect(fileInput()).not.toHaveAttribute('multiple');
    expect(screen.getByText('Drop a file here')).toBeInTheDocument();
    await user.upload(fileInput(), pdfFile('only.pdf'));
    await waitFor(() => expect(rowNames()).toEqual(['only.pdf']));
    expect(screen.queryByText('Add more files')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move up' })).not.toBeInTheDocument();
  });

  it('keeps the action disabled until the required option is valid', async () => {
    const user = userEvent.setup();
    const run = vi.fn().mockResolvedValue(pdfResult);
    renderWithIntl(<ToolRunner tool={fakeSingleTool} run={run} />);
    await user.upload(fileInput(), pdfFile('only.pdf'));

    const field = await screen.findByLabelText('Page');
    const action = screen.getByRole('button', { name: 'Pick' });
    expect(field).toBeRequired();
    expect(action).toBeDisabled();
    expect(screen.getByText('Enter a page.')).toBeInTheDocument();
    expect(screen.queryByText('Digits only.')).not.toBeInTheDocument();

    await user.type(field, 'x');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Digits only.');
    expect(screen.queryByText('Enter a page.')).not.toBeInTheDocument();
    expect(action).toBeDisabled();

    await user.clear(field);
    await user.type(field, '2');
    expect(field).not.toHaveAttribute('aria-invalid');
    expect(action).toBeEnabled();
    await user.click(action);
    expect(run).toHaveBeenCalledWith(
      'fakeSingle',
      [expect.any(File)],
      { page: '2', outputName: '' },
      expect.anything(),
    );
    expect(await screen.findByRole('link', { name: 'Download' })).toHaveAttribute(
      'download',
      'picked.pdf',
    );
  });

  it('shows the required-option hint in Arabic', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ToolRunner tool={fakeSingleTool} run={vi.fn()} />, 'ar');
    await user.upload(fileInput(), pdfFile('ملف.pdf'));
    expect(await screen.findByText('أدخل رقم صفحة.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'اختر' })).toBeDisabled();
  });
});

describe('ToolRunner with modes, a number option and conditional options', () => {
  async function setUp(run = vi.fn().mockResolvedValue(zipResult)) {
    const user = userEvent.setup();
    renderWithIntl(<ToolRunner tool={fakeModeTool} run={run} />);
    await user.upload(fileInput(), pdfFile('only.pdf'));
    const action = await screen.findByRole('button', { name: 'Cut' });
    return { user, run, action };
  }

  it('shows only the options of the chosen mode', async () => {
    const { user, action } = await setUp();
    expect(screen.getByLabelText('Page')).toBeRequired();
    expect(screen.queryByLabelText('Pages per file')).not.toBeInTheDocument();
    expect(action).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Mode'), 'many');
    expect(screen.queryByLabelText('Page')).not.toBeInTheDocument();
    const count = screen.getByRole('spinbutton', { name: 'Pages per file' });
    expect(count).toHaveValue(2);
    expect(count).toHaveAttribute('min', '1');
    expect(count).toHaveAttribute('max', '9');
    // The empty page field is hidden, so it no longer blocks the run.
    expect(action).toBeEnabled();
  });

  it('validates a number option and sends it as a number', async () => {
    const { user, run, action } = await setUp();
    await user.selectOptions(screen.getByLabelText('Mode'), 'many');
    const count = screen.getByLabelText('Pages per file');

    await user.clear(count);
    expect(action).toBeDisabled();
    expect(count).toBeRequired();
    expect(screen.getByText('Enter a count.')).toBeInTheDocument();
    expect(count).not.toHaveAttribute('aria-invalid');

    await user.type(count, '0');
    expect(count).toHaveAttribute('aria-invalid', 'true');
    expect(count).toHaveAccessibleDescription('From 1 to 9.');
    expect(action).toBeDisabled();

    await user.clear(count);
    await user.type(count, '3');
    expect(action).toBeEnabled();
    await user.click(action);
    expect(run).toHaveBeenCalledWith(
      'fakeMode',
      [expect.any(File)],
      { mode: 'many', page: '', count: 3, outputName: '' },
      expect.anything(),
    );
  });

  it('keeps what was typed in a hidden option out of the run', async () => {
    const { user, run, action } = await setUp();
    await user.type(screen.getByLabelText('Page'), 'x');
    await user.selectOptions(screen.getByLabelText('Mode'), 'many');
    await user.clear(screen.getByLabelText('Pages per file'));
    await user.selectOptions(screen.getByLabelText('Mode'), 'one');

    // Back in "one" mode: the page field still holds "x", and the empty count no longer matters.
    const page = screen.getByLabelText('Page');
    expect(page).toHaveValue('x');
    await user.clear(page);
    await user.type(page, '4');
    expect(action).toBeEnabled();
    await user.click(action);
    expect(run).toHaveBeenCalledWith(
      'fakeMode',
      [expect.any(File)],
      { mode: 'one', page: '4', count: 2, outputName: '' },
      expect.anything(),
    );
  });

  it('names and types the download after the kind the run returned', async () => {
    const { user, action } = await setUp();
    await user.selectOptions(screen.getByLabelText('Mode'), 'many');
    await user.click(action);
    expect(await screen.findByRole('link', { name: 'Download' })).toHaveAttribute(
      'download',
      'parts.zip',
    );
    expect(lastBlob().type).toBe('application/zip');
  });

  it('shows the mode choices and number hints in Arabic', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ToolRunner tool={fakeModeTool} run={vi.fn()} />, 'ar');
    await user.upload(fileInput(), pdfFile('ملف.pdf'));
    await user.selectOptions(await screen.findByLabelText('الطريقة'), 'many');
    await user.clear(screen.getByLabelText('صفحات لكل ملف'));
    expect(screen.getByText('أدخل العدد.')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'عدة ملفات' })).toBeInTheDocument();
  });
});
