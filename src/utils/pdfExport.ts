import { jsPDF } from 'jspdf';

export interface ExportPdfOptions {
  username?: string;
  displayName?: string;
  totalEntries: number;
  wordsWritten: number;
  mediaAdded: number;
  currentStreak: number;
  categories: { name: string; percentage: number }[];
  recentEntries?: { title: string; type: string; rating?: number | null; date?: string }[];
}

/**
 * Generates and downloads a formatted PDF report of the user's Deony archive summary.
 */
export function generateStatisticsPdf(options: ExportPdfOptions): boolean {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // Background Tint
    doc.setFillColor(254, 251, 249);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header Top Bar Accent
    doc.setFillColor(17, 67, 73); // #114349 Dark Teal
    doc.rect(0, 0, pageWidth, 6, 'F');

    let currentY = margin;

    // Brand & Title
    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(17, 67, 73);
    doc.text('Deony', margin, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(94, 94, 93);
    doc.text('DIGITAL SANCTUARY & MEDIA ARCHIVE', margin, currentY + 6);

    // Date & User tag on right
    const generatedDate = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const userLabel = options.displayName || options.username ? `@${options.username || options.displayName}` : 'Personal Archive';
    doc.setFontSize(9);
    doc.text(userLabel, pageWidth - margin, currentY, { align: 'right' });
    doc.text(`Generated: ${generatedDate}`, pageWidth - margin, currentY + 5, { align: 'right' });

    currentY += 16;

    // Divider
    doc.setDrawColor(200, 195, 189);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    currentY += 12;

    // Report Headline
    doc.setFont('times', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(31, 27, 24);
    doc.text('Year in Review & Archive Summary', margin, currentY);

    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(94, 94, 93);
    doc.text(
      'An archival reflection of your media consumption, written thoughts, and perspective over time.',
      margin,
      currentY
    );

    currentY += 12;

    // KPI Summary Grid (4 Boxes)
    const boxGap = 4;
    const boxWidth = (contentWidth - boxGap * 3) / 4;
    const boxHeight = 26;

    const kpiCards = [
      { label: 'COMPLETED', value: options.totalEntries.toString(), sub: 'Experiences' },
      { label: 'WORDS LOGGED', value: options.wordsWritten.toLocaleString(), sub: 'Written thoughts' },
      { label: 'UNIQUE MEDIA', value: options.mediaAdded.toString(), sub: 'In collection' },
      { label: 'DAY STREAK', value: options.currentStreak.toString(), sub: 'Consecutive days' },
    ];

    kpiCards.forEach((card, idx) => {
      const bx = margin + idx * (boxWidth + boxGap);
      
      // Card container
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(229, 226, 221);
      doc.roundedRect(bx, currentY, boxWidth, boxHeight, 2, 2, 'FD');

      // Top label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(113, 120, 122);
      doc.text(card.label, bx + 3, currentY + 6);

      // Main value
      doc.setFont('times', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(17, 67, 73);
      doc.text(card.value, bx + 3, currentY + 16);

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(94, 94, 93);
      doc.text(card.sub, bx + 3, currentY + 22);
    });

    currentY += boxHeight + 14;

    // Category Distribution Section
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(17, 67, 73);
    doc.text('Top Categories', margin, currentY);

    currentY += 6;

    if (options.categories && options.categories.length > 0) {
      options.categories.forEach((cat) => {
        // Label & percentage
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(31, 27, 24);
        doc.text(cat.name, margin, currentY + 4);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`${cat.percentage}%`, pageWidth - margin, currentY + 4, { align: 'right' });

        // Progress bar track
        doc.setFillColor(235, 230, 225);
        doc.roundedRect(margin, currentY + 6, contentWidth, 3, 1.5, 1.5, 'F');

        // Progress bar fill
        const fillW = Math.max((contentWidth * cat.percentage) / 100, 3);
        doc.setFillColor(17, 67, 73);
        doc.roundedRect(margin, currentY + 6, fillW, 3, 1.5, 1.5, 'F');

        currentY += 14;
      });
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(113, 120, 122);
      doc.text('No completed categories recorded yet.', margin, currentY + 4);
      currentY += 10;
    }

    currentY += 8;

    // Recent Experiences Log Section (if provided)
    if (options.recentEntries && options.recentEntries.length > 0) {
      doc.setFont('times', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(17, 67, 73);
      doc.text('Recent Archival Entries', margin, currentY);

      currentY += 6;

      // Table header
      doc.setFillColor(242, 238, 233);
      doc.rect(margin, currentY, contentWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(94, 94, 93);
      doc.text('TITLE', margin + 3, currentY + 4.5);
      doc.text('TYPE', margin + 85, currentY + 4.5);
      doc.text('RATING', margin + 120, currentY + 4.5);
      doc.text('DATE', pageWidth - margin - 3, currentY + 4.5, { align: 'right' });

      currentY += 8;

      options.recentEntries.slice(0, 7).forEach((entry, rIdx) => {
        // Alternating row background
        if (rIdx % 2 === 1) {
          doc.setFillColor(248, 245, 241);
          doc.rect(margin, currentY - 1, contentWidth, 7, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(31, 27, 24);
        
        // Truncate title if long
        const safeTitle = doc.splitTextToSize(entry.title || 'Untitled', 75)[0];
        doc.text(safeTitle, margin + 3, currentY + 4);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(94, 94, 93);
        doc.text(entry.type || 'Media', margin + 85, currentY + 4);

        const ratingText = entry.rating !== null && entry.rating !== undefined 
          ? `${entry.rating > 5 ? entry.rating / 2 : entry.rating} / 5 Stars` 
          : 'Unrated';
        doc.text(ratingText, margin + 120, currentY + 4);

        doc.text(entry.date || 'Recorded', pageWidth - margin - 3, currentY + 4, { align: 'right' });

        currentY += 7.5;
      });
    }

    // Philosophy Quote Callout Box
    currentY = Math.max(currentY + 6, 230);
    doc.setFillColor(239, 246, 247); // soft primary tint
    doc.setDrawColor(17, 67, 73);
    doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'FD');

    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(17, 67, 73);
    doc.text(
      '"A permanent, personal archive of the films, books, and art that shape your perspective.\nForget social metrics — build a digital sanctuary for your mind."',
      margin + 6,
      currentY + 8
    );

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(113, 120, 122);
    doc.text(
      '© Deony — Introspection through permanence · deony.com',
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // Save/Download PDF
    const filename = `deony-archive-summary-${new Date().getFullYear()}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    return false;
  }
}
