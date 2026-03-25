// lib/md-to-docx.ts – Konvertiert Markdown-Inhalt zu einem .docx Buffer
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, convertInchesToTwip,
} from 'docx';

// ── Einfacher Markdown-Parser (Zeilen-basiert) ────────────────────────────────
type Block =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'hr' }
  | { type: 'bold_line'; text: string }
  | { type: 'bullet'; text: string; indent: number }
  | { type: 'para'; text: string }
  | { type: 'empty' };

function parseMarkdown(md: string): Block[] {
  const lines  = md.split('\n');
  const blocks: Block[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4).trim() });
    } else if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3).trim() });
    } else if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.slice(2).trim() });
    } else if (line === '---') {
      blocks.push({ type: 'hr' });
    } else if (/^(\s*[-*]|\d+\.) /.test(line)) {
      const indent = Math.floor(line.search(/\S/) / 2);
      const text   = line.replace(/^\s*[-*\d.]+\s/, '').trim();
      blocks.push({ type: 'bullet', text, indent });
    } else if (/^\*\*[^*]+\*\*$/.test(line.trim())) {
      blocks.push({ type: 'bold_line', text: line.trim().replace(/\*\*/g, '') });
    } else if (line.trim() === '') {
      blocks.push({ type: 'empty' });
    } else {
      blocks.push({ type: 'para', text: line.trim() });
    }
  }
  return blocks;
}

// ── Inline-Markdown (fett, kursiv) in TextRun-Array auflösen ─────────────────
function inlineRuns(text: string, opts?: { bold?: boolean; color?: string }): TextRun[] {
  const runs: TextRun[] = [];
  // Splitte an **bold** und *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, color: opts?.color }));
    } else if (part.startsWith('*') && part.endsWith('*')) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true, color: opts?.color }));
    } else if (part) {
      runs.push(new TextRun({ text: part, bold: opts?.bold, color: opts?.color }));
    }
  }
  return runs.length ? runs : [new TextRun({ text: '', bold: opts?.bold })];
}

// ── Block → docx Paragraph ────────────────────────────────────────────────────
function blockToParagraph(block: Block): Paragraph | null {
  switch (block.type) {
    case 'h1':
      return new Paragraph({
        text:    block.text,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 320, after: 120 },
      });
    case 'h2':
      return new Paragraph({
        text:    block.text,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
      });
    case 'h3':
      return new Paragraph({
        text:    block.text,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 60 },
      });
    case 'hr':
      return new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
        spacing: { before: 120, after: 120 },
        children: [new TextRun('')],
      });
    case 'bold_line':
      return new Paragraph({
        children: [new TextRun({ text: block.text, bold: true })],
        spacing:  { before: 80, after: 40 },
      });
    case 'bullet':
      return new Paragraph({
        children: inlineRuns(block.text),
        bullet:   { level: block.indent },
        spacing:  { before: 40, after: 40 },
      });
    case 'empty':
      return new Paragraph({ children: [new TextRun('')], spacing: { before: 60, after: 60 } });
    case 'para':
      return new Paragraph({
        children: inlineRuns(block.text),
        spacing:  { before: 60, after: 60 },
        alignment: AlignmentType.JUSTIFIED,
      });
    default:
      return null;
  }
}

// ── Öffentliche API ───────────────────────────────────────────────────────────
export async function markdownToDocx(markdownContent: string, title: string): Promise<Buffer> {
  const blocks     = parseMarkdown(markdownContent);
  const paragraphs = blocks.map(blockToParagraph).filter((p): p is Paragraph => p !== null);

  const doc = new Document({
    creator:     'kiclear.ai',
    description: 'EU AI Act Compliance Dokument',
    title,
    styles: {
      paragraphStyles: [
        {
          id:   'Heading1',
          name: 'Heading 1',
          run:  { bold: true, size: 32, color: '1a1a2e' },
        },
        {
          id:   'Heading2',
          name: 'Heading 2',
          run:  { bold: true, size: 26, color: '2d6a4f' },
        },
        {
          id:   'Heading3',
          name: 'Heading 3',
          run:  { bold: true, size: 22, color: '333333' },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top:    convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left:   convertInchesToTwip(1.2),
              right:  convertInchesToTwip(1.2),
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
