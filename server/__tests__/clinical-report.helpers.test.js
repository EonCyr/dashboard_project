const { compileClinicalReport } = require('../app');

describe('compileClinicalReport', () => {
  const sampleRows = [
    { semester: '2022 Sem 1', vocab: 'A', phonics: 'A', writing: 'A', listening: 'A', band: 'A' },
  ];

  test('PDF format returns a non-empty buffer starting with PDF header', async () => {
    const buffer = await compileClinicalReport({
      format: 'pdf',
      clinicalText: 'Clinical summary text.',
      rows: sampleRows,
    });
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });

  test('DOCX format returns a non-empty buffer starting with the ZIP/DOCX header', async () => {
    const buffer = await compileClinicalReport({
      format: 'docx',
      clinicalText: 'Clinical summary text.',
      rows: sampleRows,
    });
    expect(buffer.length).toBeGreaterThan(0);
    // DOCX files are ZIP archives internally, and ZIP files start with the byte signature 'PK'
    expect(buffer.slice(0, 2).toString()).toBe('PK');
  });
});