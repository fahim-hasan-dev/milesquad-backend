import PDFDocument from 'pdfkit';
import config from '../config';

export const generateInvoiceHTML = (parcel: any, customer?: any) => {
    const invoiceNo = `INV-${parcel._id?.toString().slice(-8).toUpperCase() || '0000'}`;
    const invoiceDate = new Date(parcel.createdAt || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    const isPaid = parcel.paymentMethod === 'online' || parcel.status === 'delivered';
    const statusText = isPaid ? 'PAID' : 'PENDING (HAND CASH)';
    const statusBg = isPaid ? '#2ecc71' : '#f39c12';

    const totalOfRun = parcel.totalOfRun ?? 0;
    const serviceFee = parcel.serviceFee ?? 0;
    const goodRisks = parcel.goodRisks ?? 0;
    const totalToPay = parcel.totalToPay ?? parcel.totalDeliveryFee ?? 0;

    const logoHeader = config.logo_url
        ? `<div style="text-align:center; margin-bottom:20px;">
             <img src="${config.logo_url}" alt="Milesquad Logo" style="max-height:60px; max-width:200px; width:auto; height:auto; display:inline-block; object-fit:contain;" />
           </div>`
        : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice #${invoiceNo}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f7f6; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f6; padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 6px 20px rgba(0,0,0,0.06); padding:40px;">
          
          <!-- Header Logo & Title -->
          <tr>
            <td colspan="2">
              ${logoHeader}
              <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:2px solid #edf2f7; padding-bottom:20px; margin-bottom:25px;">
                <tr>
                  <td style="vertical-align:middle;">
                    <h1 style="margin:0; font-size:24px; color:#1a202c; font-weight:700;">BOOKING INVOICE</h1>
                    <p style="margin:4px 0 0; color:#718096; font-size:14px;">Invoice No: <strong>#${invoiceNo}</strong></p>
                    <p style="margin:2px 0 0; color:#718096; font-size:13px;">Date: ${invoiceDate}</p>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="background-color:${statusBg}; color:#ffffff; font-size:13px; font-weight:700; padding:6px 14px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px;">
                      ${statusText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Billed To & Delivery Details -->
          <tr>
            <td colspan="2">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:25px;">
                <tr>
                  <td width="50%" style="vertical-align:top; padding-right:15px;">
                    <h3 style="margin:0 0 8px; font-size:14px; text-transform:uppercase; color:#a0aec0; letter-spacing:0.5px;">Billed To</h3>
                    <p style="margin:0; font-size:15px; font-weight:600; color:#2d3748;">${customer?.fullName || 'Customer'}</p>
                    <p style="margin:4px 0 0; font-size:13px; color:#4a5568;">📞 ${customer?.phone || parcel.receiverPhone || 'N/A'}</p>
                    ${customer?.email ? `<p style="margin:2px 0 0; font-size:13px; color:#4a5568;">✉️ ${customer.email}</p>` : ''}
                  </td>
                  <td width="50%" style="vertical-align:top; padding-left:15px;">
                    <h3 style="margin:0 0 8px; font-size:14px; text-transform:uppercase; color:#a0aec0; letter-spacing:0.5px;">Delivery Info</h3>
                    <p style="margin:0; font-size:13px; color:#4a5568;"><strong>Vehicle:</strong> ${parcel.vehicleType || 'Standard'}</p>
                    <p style="margin:2px 0 0; font-size:13px; color:#4a5568;"><strong>Good Type:</strong> ${parcel.goodType || 'Parcel'}</p>
                    <p style="margin:2px 0 0; font-size:13px; color:#4a5568;"><strong>Payment Method:</strong> ${(parcel.paymentMethod || 'Hand Cash').toUpperCase()}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pickup & Drop Locations -->
          <tr>
            <td colspan="2">
              <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:15px; margin-bottom:30px;">
                <p style="margin:0 0 8px; font-size:13px; color:#2b6cb0;">📍 <strong>Pickup:</strong> ${parcel.pickupLocation?.address || 'N/A'}</p>
                <p style="margin:0; font-size:13px; color:#c53030;">🏁 <strong>Dropoff:</strong> ${parcel.dropLocation?.address || 'N/A'}</p>
              </div>
            </td>
          </tr>

          <!-- Price Breakdown Table -->
          <tr>
            <td colspan="2">
              <h3 style="margin:0 0 12px; font-size:16px; color:#2d3748; font-weight:700;">Price Breakdown</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:25px; background-color:#f7fafc; border-radius:8px; overflow:hidden;">
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:12px 16px; font-size:14px; color:#4a5568;">Total of the run</td>
                  <td align="right" style="padding:12px 16px; font-size:14px; color:#2d3748; font-weight:600;">${totalOfRun.toLocaleString()} XOF</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:12px 16px; font-size:14px; color:#4a5568;">Service fee</td>
                  <td align="right" style="padding:12px 16px; font-size:14px; color:#2d3748; font-weight:600;">${serviceFee.toLocaleString()} XOF</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:12px 16px; font-size:14px; color:#4a5568;">Good insurance</td>
                  <td align="right" style="padding:12px 16px; font-size:14px; color:#2d3748; font-weight:600;">${goodRisks.toLocaleString()} XOF</td>
                </tr>
                <tr style="background-color:#edf2f7;">
                  <td style="padding:16px; font-size:16px; color:#1a202c; font-weight:700;">Total to pay</td>
                  <td align="right" style="padding:16px; font-size:20px; color:#276749; font-weight:800;">${totalToPay.toLocaleString()} XOF</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Note -->
          <tr>
            <td colspan="2" align="center" style="border-top:1px solid #edf2f7; padding-top:20px;">
              <p style="margin:0; font-size:13px; color:#a0aec0;">Thank you for delivering with <strong>Milesquad</strong>!</p>
              <p style="margin:4px 0 0; font-size:12px; color:#cbd5e0;">If you have any questions, please contact support.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
};

export const generateInvoicePDFBuffer = (parcel: any, customer?: any): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const buffers: Buffer[] = [];

            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const invoiceNo = `INV-${parcel._id?.toString().slice(-8).toUpperCase() || '0000'}`;
            const invoiceDate = new Date(parcel.createdAt || Date.now()).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });

            const isPaid = parcel.paymentMethod === 'online' || parcel.status === 'delivered';
            const totalOfRun = parcel.totalOfRun ?? 0;
            const serviceFee = parcel.serviceFee ?? 0;
            const goodRisks = parcel.goodRisks ?? 0;
            const totalToPay = parcel.totalToPay ?? parcel.totalDeliveryFee ?? 0;

            // Title Banner
            doc.fillColor('#10B981').fontSize(22).text('MILESQUAD INVOICE', { align: 'center' });
            doc.moveDown(0.5);

            doc.fillColor('#4A5568').fontSize(11).text(`Invoice No: #${invoiceNo}`, { align: 'right' });
            doc.text(`Date: ${invoiceDate}`, { align: 'right' });
            doc.text(`Status: ${isPaid ? 'PAID' : 'PENDING (HAND CASH)'}`, { align: 'right' });
            doc.moveDown(1.5);

            // Billed To
            doc.fillColor('#2D3748').fontSize(14).text('BILLED TO', { underline: true });
            doc.fontSize(11).fillColor('#4A5568');
            doc.text(`Customer Name: ${customer?.fullName || 'Customer'}`);
            doc.text(`Phone: ${customer?.phone || parcel.receiverPhone || 'N/A'}`);
            if (customer?.email) doc.text(`Email: ${customer.email}`);
            doc.moveDown(1);

            // Delivery Details
            doc.fillColor('#2D3748').fontSize(14).text('DELIVERY DETAILS', { underline: true });
            doc.fontSize(11).fillColor('#4A5568');
            doc.text(`Good Type: ${parcel.goodType || 'Parcel'}`);
            doc.text(`Vehicle Type: ${parcel.vehicleType || 'Standard'}`);
            doc.text(`Payment Method: ${(parcel.paymentMethod || 'Hand Cash').toUpperCase()}`);
            doc.text(`Pickup Address: ${parcel.pickupLocation?.address || 'N/A'}`);
            doc.text(`Dropoff Address: ${parcel.dropLocation?.address || 'N/A'}`);
            doc.moveDown(1.5);

            // Price Breakdown Table
            doc.fillColor('#2D3748').fontSize(14).text('PRICE BREAKDOWN', { underline: true });
            doc.moveDown(0.5);

            const tableTop = doc.y;
            doc.fontSize(11).fillColor('#4A5568');

            doc.text('Total of the run', 50, tableTop);
            doc.text(`${totalOfRun.toLocaleString()} XOF`, 400, tableTop, { align: 'right' });
            doc.moveDown(0.5);

            const row2Top = doc.y;
            doc.text('Service fee', 50, row2Top);
            doc.text(`${serviceFee.toLocaleString()} XOF`, 400, row2Top, { align: 'right' });
            doc.moveDown(0.5);

            const row3Top = doc.y;
            doc.text('Good insurance', 50, row3Top);
            doc.text(`${goodRisks.toLocaleString()} XOF`, 400, row3Top, { align: 'right' });
            doc.moveDown(0.8);

            // Total
            doc.strokeColor('#CBD5E0').lineWidth(1).lineCap('butt').moveTo(50, doc.y).lineTo(540, doc.y).stroke();
            doc.moveDown(0.5);

            const totalTop = doc.y;
            doc.fillColor('#10B981').fontSize(14).text('Total to pay', 50, totalTop);
            doc.fillColor('#10B981').fontSize(16).text(`${totalToPay.toLocaleString()} XOF`, 400, totalTop, { align: 'right' });

            doc.moveDown(3);
            doc.fillColor('#A0AEC0').fontSize(10).text('Thank you for delivering with Milesquad!', { align: 'center' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};
