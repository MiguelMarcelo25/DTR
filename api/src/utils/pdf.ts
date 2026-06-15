import PDFDocument from 'pdfkit';

export interface PayslipPdfData {
  payslipNo: string;
  companyName: string;
  periodName: string;
  payDate?: string;
  employeeName: string;
  employeeNo: string;
  department?: string;
  position?: string;
  earnings: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
}

const peso = (n: number) =>
  n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Render a payslip PDF to an in-memory Buffer (suitable for download/upload). */
export function generatePayslipPdf(data: PayslipPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(data.companyName, { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(12).fillColor('#555').text('PAYSLIP', { align: 'center' });
    doc.moveDown();

    doc.fillColor('#000').fontSize(10);
    doc.text(`Payslip No: ${data.payslipNo}`);
    doc.text(`Period: ${data.periodName}`);
    if (data.payDate) doc.text(`Pay Date: ${data.payDate}`);
    doc.moveDown(0.5);
    doc.text(`Employee: ${data.employeeName} (${data.employeeNo})`);
    if (data.department) doc.text(`Department: ${data.department}`);
    if (data.position) doc.text(`Position: ${data.position}`);
    doc.moveDown();

    const colLabel = 50;
    const colAmount = 350;

    doc.fontSize(11).fillColor('#1d4ed8').text('Earnings', colLabel);
    doc.fillColor('#000').fontSize(10);
    data.earnings.forEach((e) => {
      const y = doc.y;
      doc.text(e.label, colLabel, y);
      doc.text(peso(e.amount), colAmount, y, { width: 150, align: 'right' });
    });
    doc.moveDown(0.5);

    doc.fontSize(11).fillColor('#b91c1c').text('Deductions', colLabel);
    doc.fillColor('#000').fontSize(10);
    data.deductions.forEach((d) => {
      const y = doc.y;
      doc.text(d.label, colLabel, y);
      doc.text(peso(d.amount), colAmount, y, { width: 150, align: 'right' });
    });
    doc.moveDown();

    doc.moveTo(colLabel, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(0.5);

    const summary = (label: string, amount: number, bold = false) => {
      const y = doc.y;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(label, colLabel, y);
      doc.text(peso(amount), colAmount, y, { width: 150, align: 'right' });
      doc.font('Helvetica');
    };
    summary('Gross Pay', data.grossPay);
    summary('Total Deductions', data.totalDeductions);
    doc.moveDown(0.3);
    summary('NET PAY', data.netPay, true);

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#888').text(
      'This is a system-generated payslip and does not require a signature.',
      { align: 'center' },
    );

    doc.end();
  });
}
