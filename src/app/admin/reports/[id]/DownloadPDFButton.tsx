'use client';

import type { ReportContent } from '@/types';

interface Props {
  participantName: string;
  role: string;
  team: string;
  cycleName: string;
  generatedAt: string;
  content: ReportContent;
}

export default function DownloadPDFButton({ participantName, role, team, cycleName, generatedAt, content }: Props) {
  const handleDownload = async () => {
    const { default: jsPDF } = await import('jspdf');

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = margin;

    const checkPage = (needed: number) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const addWrappedText = (
      text: string,
      fontSize: number,
      color: [number, number, number],
      style: 'normal' | 'bold' = 'normal',
      indent = 0,
      afterGap = 4
    ) => {
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont('helvetica', style);
      const lines = doc.splitTextToSize(text, contentW - indent) as string[];
      const lineH = fontSize * 0.352778 * 1.5;
      checkPage(lines.length * lineH + afterGap);
      doc.text(lines, margin + indent, y);
      y += lines.length * lineH + afterGap;
    };

    const addSectionHeading = (text: string) => {
      checkPage(14);
      doc.setFontSize(8);
      doc.setTextColor(120, 113, 108);
      doc.setFont('helvetica', 'bold');
      doc.text(text.toUpperCase(), margin, y);
      y += 5;
      doc.setDrawColor(214, 211, 209);
      doc.setLineWidth(0.3);
      doc.line(margin, y, margin + contentW, y);
      y += 5;
    };

    // --- Logo ---
    try {
      const response = await fetch('/matchfire-logo.png');
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      doc.addImage(base64, 'PNG', margin, y, 28, 28);
      y += 33;
    } catch {
      // Logo unavailable — skip
    }

    // --- Title block ---
    addWrappedText('Peer Review Report', 9, [120, 113, 108], 'normal', 0, 3);
    addWrappedText(participantName, 22, [28, 25, 23], 'normal', 0, 2);
    addWrappedText(`${role} · ${team} · ${cycleName}`, 10, [120, 113, 108], 'normal', 0, 2);
    addWrappedText(
      `Generated ${new Date(generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      8,
      [168, 162, 158],
      'normal',
      0,
      10
    );

    // --- Peer Ratings ---
    addSectionHeading('Peer Ratings');

    const scores: [string, number][] = [
      ['Communication', content.scale_scores.communication],
      ['Reliability & Follow-through', content.scale_scores.reliability],
      ['Collaboration', content.scale_scores.collaboration],
    ];

    for (const [label, score] of scores) {
      checkPage(12);
      doc.setFontSize(9);
      doc.setTextColor(68, 64, 60);
      doc.setFont('helvetica', 'normal');
      doc.text(label, margin, y);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`${score.toFixed(1)} / 5`, margin + contentW, y, { align: 'right' });
      y += 4;

      // Bar background
      doc.setFillColor(231, 229, 228);
      doc.roundedRect(margin, y, contentW, 2.5, 1, 1, 'F');
      // Bar fill
      doc.setFillColor(41, 37, 36);
      doc.roundedRect(margin, y, (score / 5) * contentW, 2.5, 1, 1, 'F');
      y += 8;
    }
    y += 4;

    // --- Overview ---
    addSectionHeading('Overview');
    addWrappedText(content.overall_narrative, 10, [68, 64, 60], 'normal', 0, 10);

    // --- What's Working ---
    addSectionHeading("What's Working");
    addWrappedText(content.what_is_working.summary, 10, [68, 64, 60], 'normal', 0, 4);
    for (const theme of content.what_is_working.themes) {
      addWrappedText(`→  ${theme}`, 9, [120, 113, 108], 'normal', 4, 3);
    }
    y += 6;

    // --- Areas to Develop ---
    addSectionHeading('Areas to Develop');
    addWrappedText(content.blind_spots.summary, 10, [68, 64, 60], 'normal', 0, 4);
    for (const theme of content.blind_spots.themes) {
      addWrappedText(`→  ${theme}`, 9, [120, 113, 108], 'normal', 4, 3);
    }
    y += 6;

    // --- Start / Stop / Continue ---
    addSectionHeading('Start · Stop · Continue');

    const sscCols: [string, string[], [number, number, number]][] = [
      ['Start', content.start_stop_continue.start, [21, 128, 61]],
      ['Stop', content.start_stop_continue.stop, [185, 28, 28]],
      ['Continue', content.start_stop_continue.continue, [29, 78, 216]],
    ];

    const colW = (contentW - 8) / 3;

    for (const [label, , color] of sscCols) {
      checkPage(6);
    }

    // Column headings
    for (let i = 0; i < sscCols.length; i++) {
      const [label, , color] = sscCols[i];
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(label.toUpperCase(), margin + i * (colW + 4), y);
    }
    y += 6;

    // Column items — render row by row to manage page breaks
    const maxItems = Math.max(...sscCols.map(([, items]) => items.length));
    for (let row = 0; row < maxItems; row++) {
      checkPage(10);
      for (let col = 0; col < sscCols.length; col++) {
        const [, items] = sscCols[col];
        if (items[row]) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(68, 64, 60);
          const wrapped = doc.splitTextToSize(items[row], colW) as string[];
          doc.text(wrapped, margin + col * (colW + 4), y);
        }
      }
      y += 10;
    }
    y += 4;

    // --- Growth Path ---
    addSectionHeading('Growth Path');
    addWrappedText(content.growth_path.summary, 10, [68, 64, 60], 'normal', 0, 4);
    if (content.growth_path.suggested_focus) {
      checkPage(16);
      doc.setFillColor(245, 245, 244);
      const focusLines = doc.splitTextToSize(content.growth_path.suggested_focus, contentW - 10) as string[];
      const boxH = focusLines.length * 5 + 10;
      doc.rect(margin, y, contentW, boxH, 'F');
      doc.setDrawColor(214, 211, 209);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin, y + boxH);
      y += 5;
      doc.setFontSize(7);
      doc.setTextColor(120, 113, 108);
      doc.setFont('helvetica', 'bold');
      doc.text('SUGGESTED FOCUS', margin + 5, y);
      y += 5;
      doc.setFontSize(9);
      doc.setTextColor(68, 64, 60);
      doc.setFont('helvetica', 'normal');
      doc.text(focusLines, margin + 5, y);
      y += focusLines.length * 5 + 5;
    }

    doc.save(`${participantName.replace(/\s+/g, '-')}-peer-review.pdf`);
  };

  return (
    <button
      onClick={handleDownload}
      className="ml-auto text-xs px-3 py-1.5 bg-stone-900 text-stone-50 rounded hover:bg-stone-700 transition-colors font-medium"
    >
      Download PDF
    </button>
  );
}
