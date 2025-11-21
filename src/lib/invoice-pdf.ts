import PDFDocument from "pdfkit";

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  type: "booking" | "application";
  
  // Company info
  companyName: string;
  companyAddress: string;
  companyPhone?: string;
  companyEmail?: string;
  companyGSTIN?: string;
  
  // Customer info
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  
  // Booking/Application details
  itemName: string;
  itemDescription?: string;
  quantity?: number;
  
  // Payment details
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  currency: string;
  paymentStatus: string;
  paymentDate?: string;
  paymentMethod?: string;
  transactionId?: string;
  
  // Additional info
  bookingId?: string;
  applicationId?: string;
  travelDate?: string;
  notes?: string;
}

export function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      margin: 50,
      size: "A4",
    });
    const buffers: Buffer[] = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on("error", reject);

    // Colors
    const primaryColor = "#0F172A"; // neutral-900
    const accentColor = "#2563EB"; // primary-600
    const lightGray = "#F1F5F9"; // neutral-100
    const darkGray = "#64748B"; // neutral-500

    // Header with background
    doc.rect(0, 0, doc.page.width, 120)
      .fill(primaryColor);
    
    // Company name
    doc.fontSize(24)
      .font("Helvetica-Bold")
      .fillColor("#FFFFFF")
      .text(data.companyName, 50, 30, { align: "left" });
    
    // Invoice label
    doc.fontSize(32)
      .font("Helvetica-Bold")
      .fillColor("#FFFFFF")
      .text("INVOICE", doc.page.width - 200, 30, { align: "right" });
    
    // Invoice number and date
    doc.fontSize(10)
      .font("Helvetica")
      .fillColor("#E2E8F0")
      .text(`Invoice #: ${data.invoiceNumber}`, doc.page.width - 200, 70, { align: "right" });
    doc.text(`Date: ${data.invoiceDate}`, doc.page.width - 200, 85, { align: "right" });
    
    // Reset color
    doc.fillColor("#000000");
    
    // Company details section
    let currentY = 150;
    doc.fontSize(10)
      .font("Helvetica-Bold")
      .text("From:", 50, currentY);
    
    currentY += 15;
    doc.font("Helvetica")
      .fontSize(9)
      .text(data.companyName, 50, currentY);
    currentY += 12;
    doc.text(data.companyAddress, 50, currentY, { width: 200 });
    currentY += 12;
    if (data.companyPhone) {
      doc.text(`Phone: ${data.companyPhone}`, 50, currentY);
      currentY += 12;
    }
    if (data.companyEmail) {
      doc.text(`Email: ${data.companyEmail}`, 50, currentY);
      currentY += 12;
    }
    if (data.companyGSTIN) {
      doc.text(`GSTIN: ${data.companyGSTIN}`, 50, currentY);
    }
    
    // Customer details section
    currentY = 150;
    doc.fontSize(10)
      .font("Helvetica-Bold")
      .text("Bill To:", doc.page.width - 250, currentY);
    
    currentY += 15;
    doc.font("Helvetica")
      .fontSize(9)
      .text(data.customerName, doc.page.width - 250, currentY);
    currentY += 12;
    if (data.customerAddress) {
      doc.text(data.customerAddress, doc.page.width - 250, currentY, { width: 200 });
      currentY += 12;
    }
    doc.text(`Email: ${data.customerEmail}`, doc.page.width - 250, currentY);
    currentY += 12;
    if (data.customerPhone) {
      doc.text(`Phone: ${data.customerPhone}`, doc.page.width - 250, currentY);
    }
    
    // Line separator
    currentY = 280;
    doc.moveTo(50, currentY)
      .lineTo(doc.page.width - 50, currentY)
      .strokeColor(lightGray)
      .lineWidth(1)
      .stroke();
    
    // Item details section
    currentY += 30;
    doc.fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(primaryColor)
      .text("Item Details", 50, currentY);
    
    currentY += 25;
    
    // Table header background
    doc.rect(50, currentY - 5, doc.page.width - 100, 25)
      .fill(lightGray);
    
    // Table headers
    doc.fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(primaryColor)
      .text("Description", 55, currentY);
    doc.text("Quantity", 350, currentY);
    doc.text("Amount", doc.page.width - 100, currentY, { align: "right" });
    
    currentY += 30;
    
    // Item row
    doc.font("Helvetica")
      .fontSize(9)
      .fillColor("#000000")
      .text(data.itemName, 55, currentY, { width: 280 });
    
    if (data.itemDescription) {
      currentY += 12;
      doc.fontSize(8)
        .fillColor(darkGray)
        .text(data.itemDescription, 55, currentY, { width: 280 });
    }
    
    const quantity = data.quantity || 1;
    doc.fontSize(9)
      .fillColor("#000000")
      .text(quantity.toString(), 350, currentY - (data.itemDescription ? 12 : 0));
    
    const currencySymbol = data.currency === "INR" ? "₹" : data.currency === "USD" ? "$" : data.currency === "EUR" ? "€" : data.currency;
    doc.text(`${currencySymbol}${data.subtotal.toLocaleString()}`, doc.page.width - 100, currentY - (data.itemDescription ? 12 : 0), { align: "right" });
    
    currentY += 30;
    
    // Line separator
    doc.moveTo(50, currentY)
      .lineTo(doc.page.width - 50, currentY)
      .strokeColor(lightGray)
      .lineWidth(1)
      .stroke();
    
    // Totals section
    currentY += 20;
    const totalsX = doc.page.width - 200;
    
    if (data.discount && data.discount > 0) {
      doc.fontSize(9)
        .font("Helvetica")
        .text("Subtotal:", totalsX, currentY);
      doc.text(`${currencySymbol}${data.subtotal.toLocaleString()}`, doc.page.width - 50, currentY, { align: "right" });
      currentY += 15;
      
      doc.text("Discount:", totalsX, currentY);
      doc.text(`-${currencySymbol}${data.discount.toLocaleString()}`, doc.page.width - 50, currentY, { align: "right" });
      currentY += 15;
    }
    
    if (data.tax && data.tax > 0) {
      doc.text("Tax:", totalsX, currentY);
      doc.text(`${currencySymbol}${data.tax.toLocaleString()}`, doc.page.width - 50, currentY, { align: "right" });
      currentY += 15;
    }
    
    // Total
    currentY += 5;
    doc.moveTo(totalsX, currentY)
      .lineTo(doc.page.width - 50, currentY)
      .strokeColor(primaryColor)
      .lineWidth(2)
      .stroke();
    
    currentY += 15;
    doc.fontSize(14)
      .font("Helvetica-Bold")
      .fillColor(primaryColor)
      .text("Total:", totalsX, currentY);
    doc.text(`${currencySymbol}${data.total.toLocaleString()}`, doc.page.width - 50, currentY, { align: "right" });
    
    // Payment information
    currentY += 40;
    doc.fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(primaryColor)
      .text("Payment Information", 50, currentY);
    
    currentY += 20;
    doc.fontSize(9)
      .font("Helvetica")
      .fillColor("#000000")
      .text(`Status: ${data.paymentStatus}`, 50, currentY);
    
    if (data.paymentDate) {
      currentY += 15;
      doc.text(`Payment Date: ${data.paymentDate}`, 50, currentY);
    }
    
    if (data.paymentMethod) {
      currentY += 15;
      doc.text(`Payment Method: ${data.paymentMethod}`, 50, currentY);
    }
    
    if (data.transactionId) {
      currentY += 15;
      doc.text(`Transaction ID: ${data.transactionId}`, 50, currentY);
    }
    
    if (data.bookingId) {
      currentY += 15;
      doc.text(`Booking ID: ${data.bookingId}`, 50, currentY);
    }
    
    if (data.applicationId) {
      currentY += 15;
      doc.text(`Application ID: ${data.applicationId}`, 50, currentY);
    }
    
    if (data.travelDate) {
      currentY += 15;
      doc.text(`Travel Date: ${data.travelDate}`, 50, currentY);
    }
    
    // Notes section
    if (data.notes) {
      currentY += 30;
      doc.fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(primaryColor)
        .text("Notes:", 50, currentY);
      
      currentY += 15;
      doc.fontSize(9)
        .font("Helvetica")
        .fillColor("#000000")
        .text(data.notes, 50, currentY, { width: doc.page.width - 100 });
    }
    
    // Footer
    const footerY = doc.page.height - 50;
    doc.fontSize(8)
      .font("Helvetica-Oblique")
      .fillColor(darkGray)
      .text(
        "Thank you for your business!",
        doc.page.width / 2,
        footerY,
        { align: "center" }
      );
    
    doc.fontSize(7)
      .text(
        `This is a computer-generated invoice. No signature required.`,
        doc.page.width / 2,
        footerY + 15,
        { align: "center" }
      );

    doc.end();
  });
}

