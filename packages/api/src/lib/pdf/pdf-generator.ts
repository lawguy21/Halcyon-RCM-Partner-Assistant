/**
 * Halcyon PDF Generator
 * Core PDF generation class using PDFKit for hospital-ready reports
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import {
  HALCYON_COLORS,
  FONT_SIZES,
  PAGE_MARGINS,
  PAGE_DIMENSIONS,
  SPACING,
  TABLE_HEADER_STYLE,
  TABLE_BODY_STYLE,
  TABLE_ALTERNATE_ROW_COLOR,
  TABLE_BORDER_COLOR,
  HEADER_STYLES,
  FOOTER_STYLES,
  SECTION_STYLES,
  getUrgencyColor,
  formatCurrency,
  formatPercentage,
  formatDate,
} from './styles.js';

// ============================================================================
// TYPES
// ============================================================================

export interface PDFGeneratorOptions {
  /** Organization name for header */
  organizationName?: string;
  /** Organization logo (Buffer) */
  logo?: Buffer;
  /** Report title */
  title: string;
  /** Report subtitle */
  subtitle?: string;
  /** Page size */
  pageSize?: 'letter' | 'legal' | 'a4';
  /** Page orientation */
  orientation?: 'portrait' | 'landscape';
  /** Include page numbers */
  showPageNumbers?: boolean;
  /** Include confidential watermark */
  confidential?: boolean;
  /** Footer text */
  footerText?: string;
}

export interface TableColumn {
  /** Column header text */
  header: string;
  /** Width as percentage (0-100) or 'auto' */
  width?: number | 'auto';
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Format function for cell values */
  format?: (value: unknown) => string;
}

export interface TableRow {
  [key: string]: unknown;
}

// ============================================================================
// HALCYON PDF GENERATOR CLASS
// ============================================================================

export class HalcyonPDFGenerator {
  private doc: PDFKit.PDFDocument;
  private options: PDFGeneratorOptions;
  private pageWidth: number;
  private pageHeight: number;
  private contentWidth: number;
  private margins: typeof PAGE_MARGINS.standard;
  private currentY: number;
  private pageNumber: number;
  private totalPages: number;
  private chunks: Buffer[];

  constructor(options: PDFGeneratorOptions) {
    this.options = {
      pageSize: 'letter',
      orientation: 'portrait',
      showPageNumbers: true,
      confidential: false,
      footerText: 'Confidential - Halcyon RCM Partner Assistant',
      ...options,
    };

    // Get page dimensions
    const dimensions = PAGE_DIMENSIONS[this.options.pageSize || 'letter'];
    if (this.options.orientation === 'landscape') {
      this.pageWidth = dimensions.height;
      this.pageHeight = dimensions.width;
    } else {
      this.pageWidth = dimensions.width;
      this.pageHeight = dimensions.height;
    }

    this.margins = PAGE_MARGINS.standard;
    this.contentWidth = this.pageWidth - this.margins.left - this.margins.right;
    this.currentY = this.margins.top;
    this.pageNumber = 1;
    this.totalPages = 1;
    this.chunks = [];

    // Initialize PDFKit document
    this.doc = new PDFDocument({
      size: this.options.pageSize?.toUpperCase() as PDFKit.PDFDocumentOptions['size'],
      layout: this.options.orientation,
      margins: this.margins,
      bufferPages: true,
    });

    // Collect chunks
    this.doc.on('data', (chunk: Buffer) => this.chunks.push(chunk));
  }

  // ==========================================================================
  // DOCUMENT LIFECYCLE
  // ==========================================================================

  /**
   * Generate the PDF and return as Buffer
   */
  async generate(): Promise<Buffer> {
    // Add page numbers if enabled
    if (this.options.showPageNumbers) {
      this.addPageNumbers();
    }

    // Finalize document
    this.doc.end();

    // Wait for all chunks and combine
    return new Promise((resolve, reject) => {
      this.doc.on('end', () => {
        const buffer = Buffer.concat(this.chunks);
        resolve(buffer);
      });
      this.doc.on('error', reject);
    });
  }

  /**
   * Add page numbers to all pages
   */
  private addPageNumbers(): void {
    const pages = this.doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      this.doc.switchToPage(i);
      this.doc
        .fontSize(FONT_SIZES.small)
        .fillColor(HALCYON_COLORS.gray600)
        .text(
          `Page ${i + 1} of ${pages.count}`,
          this.margins.left,
          this.pageHeight - this.margins.bottom + 10,
          { align: 'center', width: this.contentWidth }
        );
    }
  }

  // ==========================================================================
  // HEADER METHODS
  // ==========================================================================

  /**
   * Add report header with title and optional logo
   */
  addHeader(): this {
    const headerHeight = HEADER_STYLES.height;

    // Draw header background line
    this.doc
      .moveTo(this.margins.left, this.currentY + headerHeight - 5)
      .lineTo(this.pageWidth - this.margins.right, this.currentY + headerHeight - 5)
      .strokeColor(HALCYON_COLORS.primary)
      .lineWidth(HEADER_STYLES.borderWidth)
      .stroke();

    // Add logo if provided
    if (this.options.logo) {
      try {
        this.doc.image(this.options.logo, this.margins.left, this.currentY, {
          width: HEADER_STYLES.logoMaxWidth,
          height: HEADER_STYLES.logoMaxHeight,
        });
      } catch {
        // Skip logo if it fails to load
      }
    }

    // Add title
    const titleX = this.options.logo
      ? this.margins.left + HEADER_STYLES.logoMaxWidth + SPACING.md
      : this.margins.left;

    this.doc
      .fontSize(HEADER_STYLES.titleFontSize)
      .font('Helvetica-Bold')
      .fillColor(HALCYON_COLORS.primaryDark)
      .text(this.options.title, titleX, this.currentY, {
        width: this.contentWidth - (this.options.logo ? HEADER_STYLES.logoMaxWidth + SPACING.md : 0),
      });

    // Add subtitle if provided
    if (this.options.subtitle) {
      this.doc
        .fontSize(HEADER_STYLES.subtitleFontSize)
        .font('Helvetica')
        .fillColor(HALCYON_COLORS.gray700)
        .text(this.options.subtitle, titleX, this.currentY + HEADER_STYLES.titleFontSize + 4);
    }

    // Add organization name on the right
    if (this.options.organizationName) {
      this.doc
        .fontSize(FONT_SIZES.body)
        .font('Helvetica')
        .fillColor(HALCYON_COLORS.gray700)
        .text(
          this.options.organizationName,
          this.margins.left,
          this.currentY,
          { align: 'right', width: this.contentWidth }
        );
    }

    // Add generation date
    this.doc
      .fontSize(FONT_SIZES.small)
      .fillColor(HALCYON_COLORS.gray600)
      .text(
        `Generated: ${formatDate(new Date())}`,
        this.margins.left,
        this.currentY + HEADER_STYLES.titleFontSize + 4,
        { align: 'right', width: this.contentWidth }
      );

    this.currentY += headerHeight + SPACING.lg;
    return this;
  }

  // ==========================================================================
  // SECTION METHODS
  // ==========================================================================

  /**
   * Add a section header
   */
  addSectionHeader(title: string): this {
    this.checkPageBreak(SECTION_STYLES.titleFontSize + SPACING.lg);

    this.doc
      .fontSize(SECTION_STYLES.titleFontSize)
      .font('Helvetica-Bold')
      .fillColor(SECTION_STYLES.titleColor)
      .text(title, this.margins.left, this.currentY);

    // Add underline
    const textWidth = this.doc.widthOfString(title);
    this.doc
      .moveTo(this.margins.left, this.currentY + SECTION_STYLES.titleFontSize + 2)
      .lineTo(this.margins.left + textWidth + SPACING.md, this.currentY + SECTION_STYLES.titleFontSize + 2)
      .strokeColor(SECTION_STYLES.underlineColor)
      .lineWidth(SECTION_STYLES.underlineWidth)
      .stroke();

    this.currentY += SECTION_STYLES.titleFontSize + SECTION_STYLES.titleSpaceAfter;
    return this;
  }

  /**
   * Add a subsection header
   */
  addSubsectionHeader(title: string): this {
    this.checkPageBreak(FONT_SIZES.heading3 + SPACING.md);

    this.doc
      .fontSize(FONT_SIZES.heading3)
      .font('Helvetica-Bold')
      .fillColor(HALCYON_COLORS.gray900)
      .text(title, this.margins.left, this.currentY);

    this.currentY += FONT_SIZES.heading3 + SPACING.sm;
    return this;
  }

  // ==========================================================================
  // TEXT METHODS
  // ==========================================================================

  /**
   * Add paragraph text
   */
  addParagraph(text: string, options?: { fontSize?: number; color?: string; bold?: boolean }): this {
    const fontSize = options?.fontSize || FONT_SIZES.body;
    this.checkPageBreak(fontSize * 2);

    this.doc
      .fontSize(fontSize)
      .font(options?.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fillColor(options?.color || HALCYON_COLORS.black)
      .text(text, this.margins.left, this.currentY, {
        width: this.contentWidth,
        align: 'left',
        lineGap: 4,
      });

    this.currentY = this.doc.y + SPACING.sm;
    return this;
  }

  /**
   * Add a key-value pair line
   */
  addKeyValue(label: string, value: string | number, options?: { labelWidth?: number }): this {
    const labelWidth = options?.labelWidth || 180;
    this.checkPageBreak(FONT_SIZES.body + SPACING.xs);

    this.doc
      .fontSize(FONT_SIZES.body)
      .font('Helvetica-Bold')
      .fillColor(HALCYON_COLORS.gray700)
      .text(label + ':', this.margins.left, this.currentY, { continued: false });

    this.doc
      .font('Helvetica')
      .fillColor(HALCYON_COLORS.black)
      .text(String(value), this.margins.left + labelWidth, this.currentY - FONT_SIZES.body - 2);

    this.currentY += FONT_SIZES.body + SPACING.xs;
    return this;
  }

  /**
   * Add bullet list
   */
  addBulletList(items: string[]): this {
    for (const item of items) {
      this.checkPageBreak(FONT_SIZES.body + SPACING.xs);

      this.doc
        .fontSize(FONT_SIZES.body)
        .font('Helvetica')
        .fillColor(HALCYON_COLORS.black)
        .text(`\u2022  ${item}`, this.margins.left + SPACING.md, this.currentY, {
          width: this.contentWidth - SPACING.md,
        });

      this.currentY = this.doc.y + SPACING.xs;
    }

    this.currentY += SPACING.xs;
    return this;
  }

  // ==========================================================================
  // TABLE METHODS
  // ==========================================================================

  /**
   * Add a data table
   */
  addTable(columns: TableColumn[], rows: TableRow[]): this {
    if (rows.length === 0) {
      this.addParagraph('No data available.', { color: HALCYON_COLORS.gray600 });
      return this;
    }

    const columnKeys = columns.map((col) => col.header);
    const rowHeight = TABLE_BODY_STYLE.padding! * 2 + FONT_SIZES.body;
    const headerHeight = TABLE_HEADER_STYLE.padding! * 2 + FONT_SIZES.body;

    // Calculate column widths
    const columnWidths = this.calculateColumnWidths(columns);

    // Draw header
    this.checkPageBreak(headerHeight + rowHeight);
    this.drawTableHeader(columns, columnWidths, headerHeight);

    // Draw rows
    let isAlternate = false;
    for (const row of rows) {
      this.checkPageBreak(rowHeight);
      this.drawTableRow(columns, columnWidths, row, rowHeight, isAlternate);
      isAlternate = !isAlternate;
    }

    this.currentY += SPACING.md;
    return this;
  }

  /**
   * Calculate column widths based on specifications
   */
  private calculateColumnWidths(columns: TableColumn[]): number[] {
    const totalSpecified = columns.reduce((sum, col) => {
      if (typeof col.width === 'number') {
        return sum + col.width;
      }
      return sum;
    }, 0);

    const autoColumns = columns.filter((col) => col.width === 'auto' || col.width === undefined);
    const remainingWidth = 100 - totalSpecified;
    const autoWidth = autoColumns.length > 0 ? remainingWidth / autoColumns.length : 0;

    return columns.map((col) => {
      const percentage = typeof col.width === 'number' ? col.width : autoWidth;
      return (this.contentWidth * percentage) / 100;
    });
  }

  /**
   * Draw table header row
   */
  private drawTableHeader(columns: TableColumn[], columnWidths: number[], height: number): void {
    let x = this.margins.left;

    // Draw background
    this.doc
      .rect(x, this.currentY, this.contentWidth, height)
      .fill(TABLE_HEADER_STYLE.backgroundColor!);

    // Draw text
    for (let i = 0; i < columns.length; i++) {
      this.doc
        .fontSize(TABLE_HEADER_STYLE.fontSize!)
        .font('Helvetica-Bold')
        .fillColor(TABLE_HEADER_STYLE.textColor!)
        .text(
          columns[i].header,
          x + TABLE_HEADER_STYLE.padding!,
          this.currentY + TABLE_HEADER_STYLE.padding!,
          {
            width: columnWidths[i] - TABLE_HEADER_STYLE.padding! * 2,
            align: columns[i].align || 'left',
          }
        );
      x += columnWidths[i];
    }

    this.currentY += height;
  }

  /**
   * Draw table data row
   */
  private drawTableRow(
    columns: TableColumn[],
    columnWidths: number[],
    row: TableRow,
    height: number,
    isAlternate: boolean
  ): void {
    let x = this.margins.left;

    // Draw background
    if (isAlternate) {
      this.doc
        .rect(x, this.currentY, this.contentWidth, height)
        .fill(TABLE_ALTERNATE_ROW_COLOR);
    }

    // Draw border
    this.doc
      .rect(x, this.currentY, this.contentWidth, height)
      .strokeColor(TABLE_BORDER_COLOR)
      .lineWidth(0.5)
      .stroke();

    // Draw text
    for (let i = 0; i < columns.length; i++) {
      const key = columns[i].header.toLowerCase().replace(/\s+/g, '');
      let value = row[key] ?? row[columns[i].header] ?? '';

      // Apply format function if provided
      if (columns[i].format && value !== '') {
        value = columns[i].format(value);
      }

      this.doc
        .fontSize(TABLE_BODY_STYLE.fontSize!)
        .font('Helvetica')
        .fillColor(TABLE_BODY_STYLE.textColor!)
        .text(
          String(value),
          x + TABLE_BODY_STYLE.padding!,
          this.currentY + TABLE_BODY_STYLE.padding!,
          {
            width: columnWidths[i] - TABLE_BODY_STYLE.padding! * 2,
            align: columns[i].align || 'left',
          }
        );
      x += columnWidths[i];
    }

    this.currentY += height;
  }

  // ==========================================================================
  // METRIC/SUMMARY METHODS
  // ==========================================================================

  /**
   * Add a key metrics summary box
   */
  addMetricsBox(metrics: Array<{ label: string; value: string | number; highlight?: boolean }>): this {
    const boxHeight = 80;
    const metricWidth = this.contentWidth / metrics.length;

    this.checkPageBreak(boxHeight + SPACING.md);

    // Draw background
    this.doc
      .rect(this.margins.left, this.currentY, this.contentWidth, boxHeight)
      .fill(HALCYON_COLORS.primaryLightest);

    // Draw border
    this.doc
      .rect(this.margins.left, this.currentY, this.contentWidth, boxHeight)
      .strokeColor(HALCYON_COLORS.primary)
      .lineWidth(1)
      .stroke();

    // Draw metrics
    let x = this.margins.left;
    for (let i = 0; i < metrics.length; i++) {
      const metric = metrics[i];

      // Draw divider between metrics
      if (i > 0) {
        this.doc
          .moveTo(x, this.currentY + 10)
          .lineTo(x, this.currentY + boxHeight - 10)
          .strokeColor(HALCYON_COLORS.primaryLight)
          .lineWidth(1)
          .stroke();
      }

      // Draw value
      this.doc
        .fontSize(FONT_SIZES.heading1)
        .font('Helvetica-Bold')
        .fillColor(metric.highlight ? HALCYON_COLORS.primary : HALCYON_COLORS.primaryDark)
        .text(
          String(metric.value),
          x + SPACING.sm,
          this.currentY + 15,
          { width: metricWidth - SPACING.md, align: 'center' }
        );

      // Draw label
      this.doc
        .fontSize(FONT_SIZES.small)
        .font('Helvetica')
        .fillColor(HALCYON_COLORS.gray700)
        .text(
          metric.label,
          x + SPACING.sm,
          this.currentY + 50,
          { width: metricWidth - SPACING.md, align: 'center' }
        );

      x += metricWidth;
    }

    this.currentY += boxHeight + SPACING.lg;
    return this;
  }

  /**
   * Add urgency badge
   */
  addUrgencyBadge(urgency: string): this {
    const badgeWidth = 80;
    const badgeHeight = 20;
    const color = getUrgencyColor(urgency);

    this.doc
      .roundedRect(this.margins.left, this.currentY, badgeWidth, badgeHeight, 3)
      .fill(color);

    this.doc
      .fontSize(FONT_SIZES.small)
      .font('Helvetica-Bold')
      .fillColor(HALCYON_COLORS.white)
      .text(
        urgency.toUpperCase(),
        this.margins.left,
        this.currentY + 5,
        { width: badgeWidth, align: 'center' }
      );

    this.currentY += badgeHeight + SPACING.sm;
    return this;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Add vertical spacing
   */
  addSpacing(amount?: number): this {
    this.currentY += amount || SPACING.md;
    return this;
  }

  /**
   * Add horizontal line divider
   */
  addDivider(): this {
    this.checkPageBreak(SPACING.md);

    this.doc
      .moveTo(this.margins.left, this.currentY)
      .lineTo(this.pageWidth - this.margins.right, this.currentY)
      .strokeColor(HALCYON_COLORS.gray200)
      .lineWidth(1)
      .stroke();

    this.currentY += SPACING.md;
    return this;
  }

  /**
   * Add a new page
   */
  addPage(): this {
    this.doc.addPage();
    this.currentY = this.margins.top;
    this.pageNumber++;
    return this;
  }

  /**
   * Check if we need a page break
   */
  private checkPageBreak(requiredHeight: number): void {
    const availableHeight = this.pageHeight - this.margins.bottom - FOOTER_STYLES.height;
    if (this.currentY + requiredHeight > availableHeight) {
      this.addPage();
    }
  }

  /**
   * Get current Y position
   */
  getCurrentY(): number {
    return this.currentY;
  }

  /**
   * Set current Y position
   */
  setCurrentY(y: number): this {
    this.currentY = y;
    return this;
  }

  /**
   * Get content width
   */
  getContentWidth(): number {
    return this.contentWidth;
  }

  /**
   * Get margins
   */
  getMargins(): typeof PAGE_MARGINS.standard {
    return this.margins;
  }

  /**
   * Get underlying PDFKit document for advanced operations
   */
  getDocument(): PDFKit.PDFDocument {
    return this.doc;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new PDF generator instance
 */
export function createPDFGenerator(options: PDFGeneratorOptions): HalcyonPDFGenerator {
  return new HalcyonPDFGenerator(options);
}

// Re-export formatting utilities
export { formatCurrency, formatPercentage, formatDate };
