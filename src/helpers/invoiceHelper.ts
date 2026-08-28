import PDFDocument from 'pdfkit';
import axios from 'axios';
import config from '../config';

export const generateInvoiceHTML = (parcel: any, customer?: any) => {
    const invoiceNo = parcel.parcelId || `INV-${parcel._id?.toString().slice(-8).toUpperCase() || '0000'}`;
    const invoiceDate = new Date(parcel.createdAt || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    const isPaid = parcel.paymentMethod === 'online' || parcel.status === 'delivered';
    const isCancelled = parcel.status === 'cancelled';
    const statusText = isPaid ? 'PAID' : isCancelled ? 'CANCELLED' : 'PENDING (HAND CASH)';

    const totalOfRun = parcel.totalOfRun ?? 0;
    const serviceFee = parcel.serviceFee ?? 0;
    const goodRisks = parcel.goodRisks ?? 0;
    const totalToPay = parcel.totalToPay ?? parcel.totalDeliveryFee ?? 0;

    const brandDark = '#1B2A4A';
    const brandGreen = '#16A34A';

    const logoHtml = config.logo_url
        ? `<img src="${config.logo_url}" alt="Milesquad Logo" style="max-height:60px; max-width:220px; width:auto; height:auto; display:block; margin:0 auto; object-fit:contain;" />`
        : `<h1 style="margin:0; color:${brandDark}; font-size:28px; font-weight:800; font-family:'Segoe UI', Arial, sans-serif; letter-spacing:1px;">MILES<span style="color:${brandGreen};">QUAD</span></h1>`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice #${invoiceNo}</title>
</head>
<body style="margin:0; padding:40px 20px; background-color:#ffffff; font-family:'Segoe UI', Arial, sans-serif; color:#1B2A4A; line-height:1.5;">
  <div style="max-width:650px; margin:0 auto;">
    
    <!-- Top Center Logo & Header Info -->
    <div style="text-align:center; margin-bottom:25px;">
      <div style="margin-bottom:14px; text-align:center;">
        ${logoHtml}
      </div>
      <div style="font-size:20px; font-weight:800; color:${brandDark}; letter-spacing:1px; text-transform:uppercase; margin-top:10px;">INVOICE</div>
      <div style="font-size:13px; color:#4b5563; margin-top:6px;">
        Invoice No: <strong style="color:${brandDark};">#${invoiceNo}</strong> &nbsp;&bull;&nbsp;
        Date: <strong style="color:${brandDark};">${invoiceDate}</strong> &nbsp;&bull;&nbsp;
        Status: <strong style="color:${brandGreen};">${statusText}</strong>
      </div>
    </div>

    <!-- Divider Line -->
    <div style="border-bottom:1px solid #e5e7eb; margin-bottom:28px;"></div>

    <!-- 2-Column Details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px; font-size:13px;">
      <tr>
        <!-- BILLED TO -->
        <td width="48%" valign="top" style="vertical-align:top;">
          <div style="font-size:12px; font-weight:800; color:${brandGreen}; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px;">BILLED TO</div>
          <div style="font-size:14px; font-weight:700; color:${brandDark}; margin-bottom:4px;">${customer?.fullName || 'Customer'}</div>
          <div style="color:#4b5563; line-height:1.6;">
            Phone: ${customer?.phone || parcel.receiverPhone || 'N/A'}<br />
            Email: ${customer?.email || 'N/A'}<br />
            Payment Method: ${(parcel.paymentMethod || 'HAND_CASH').toUpperCase()}
          </div>
        </td>
        <td width="4%"></td>
        <!-- DELIVERY DETAILS -->
        <td width="48%" valign="top" style="vertical-align:top;">
          <div style="font-size:12px; font-weight:800; color:${brandGreen}; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px;">DELIVERY DETAILS</div>
          <div style="color:#4b5563; line-height:1.6;">
            <strong style="color:${brandDark};">Good Type:</strong> ${parcel.goodType || 'Parcel'}<br />
            <strong style="color:${brandDark};">Vehicle Type:</strong> ${parcel.vehicleType || 'Standard'}<br />
            <strong style="color:${brandDark};">Pickup:</strong> ${parcel.pickupLocation?.address || 'N/A'}<br />
            <strong style="color:${brandDark};">Dropoff:</strong> ${parcel.dropLocation?.address || 'N/A'}
          </div>
        </td>
      </tr>
    </table>

    <!-- PRICE BREAKDOWN -->
    <div style="margin-bottom:32px;">
      <div style="font-size:12px; font-weight:800; color:${brandGreen}; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:10px;">PRICE BREAKDOWN</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px; border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:2px solid ${brandDark};">
            <th align="left" style="padding:8px 0; font-weight:700; color:${brandDark};">Description</th>
            <th align="right" style="padding:8px 0; font-weight:700; color:${brandDark};">Amount (XOF)</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0; color:#4b5563;">Total of the run</td>
            <td align="right" style="padding:10px 0; color:${brandDark}; font-weight:600;">${totalOfRun.toLocaleString('en-US')} XOF</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0; color:#4b5563;">Service fee</td>
            <td align="right" style="padding:10px 0; color:${brandDark}; font-weight:600;">${serviceFee.toLocaleString('en-US')} XOF</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0; color:#4b5563;">Good insurance</td>
            <td align="right" style="padding:10px 0; color:${brandDark}; font-weight:600;">${goodRisks.toLocaleString('en-US')} XOF</td>
          </tr>
          <tr style="border-top:2px solid ${brandDark};">
            <td style="padding:14px 0; font-size:15px; font-weight:800; color:${brandDark};">Total to Pay</td>
            <td align="right" style="padding:14px 0; font-size:18px; font-weight:800; color:${brandGreen};">${totalToPay.toLocaleString('en-US')} XOF</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- FOOTER -->
    <div style="border-top:1px solid #e5e7eb; padding-top:18px; text-align:center; font-size:12px; color:#4b5563;">
      Thank you for delivering with Milesquad!
    </div>

  </div>
</body>
</html>
    `;
};

export const generateInvoicePDFBuffer = async (parcel: any, customer?: any): Promise<Buffer> => {
    let logoBuffer: Buffer | null = null;
    if (config.logo_url) {
        try {
            const res = await axios.get(config.logo_url, { responseType: 'arraybuffer', timeout: 3000 });
            logoBuffer = Buffer.from(res.data);
        } catch {
            logoBuffer = null;
        }
    }

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const buffers: Buffer[] = [];

            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const invoiceNo = parcel.parcelId || `INV-${parcel._id?.toString().slice(-8).toUpperCase() || '0000'}`;
            const invoiceDate = new Date(parcel.createdAt || Date.now()).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });

            const isPaid = parcel.paymentMethod === 'online' || parcel.status === 'delivered';
            const isCancelled = parcel.status === 'cancelled';
            const statusText = isPaid ? 'PAID' : isCancelled ? 'CANCELLED' : 'PENDING (HAND CASH)';

            const totalOfRun = parcel.totalOfRun ?? 0;
            const serviceFee = parcel.serviceFee ?? 0;
            const goodRisks = parcel.goodRisks ?? 0;
            const totalToPay = parcel.totalToPay ?? parcel.totalDeliveryFee ?? 0;

            const brandDark = '#1B2A4A';
            const brandGreen = '#16A34A';
            const mutedColor = '#4B5563';

            let headerEndY = 35;

            // Top Center Logo
            if (logoBuffer) {
                try {
                    doc.image(logoBuffer, (doc.page.width - 120) / 2, 30, { width: 120 });
                    headerEndY = 95;
                } catch {
                    doc.fillColor(brandDark).fontSize(24).font('Helvetica-Bold').text('MILESQUAD', { align: 'center' });
                    headerEndY = 65;
                }
            } else {
                doc.fillColor(brandDark).fontSize(24).font('Helvetica-Bold').text('MILESQUAD', { align: 'center' });
                headerEndY = 65;
            }

            // Top Center Invoice Title & Meta Info
            doc.y = headerEndY;
            doc.fillColor(brandDark).fontSize(16).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
            doc.moveDown(0.3);
            doc.fillColor(mutedColor).fontSize(9).font('Helvetica').text(`Invoice No: #${invoiceNo}   |   Date: ${invoiceDate}   |   Status: ${statusText}`, { align: 'center' });
            doc.moveDown(1.2);

            // Divider Line
            const line1Y = doc.y;
            doc.moveTo(40, line1Y).lineTo(555, line1Y).strokeColor('#E5E7EB').lineWidth(1).stroke();
            doc.y = line1Y + 18;

            const colY = doc.y;

            // Column 1: BILLED TO
            doc.fillColor(brandGreen).fontSize(11).font('Helvetica-Bold').text('BILLED TO', 40, colY);
            doc.fillColor(brandDark).fontSize(10).font('Helvetica-Bold').text(customer?.fullName || 'Customer', 40, colY + 16);
            doc.fillColor(mutedColor).fontSize(9).font('Helvetica').text(`Phone: ${customer?.phone || parcel.receiverPhone || 'N/A'}`, 40, colY + 30);
            doc.fillColor(mutedColor).fontSize(9).font('Helvetica').text(`Email: ${customer?.email || 'N/A'}`, 40, colY + 43);
            doc.fillColor(mutedColor).fontSize(9).font('Helvetica').text(`Payment Method: ${(parcel.paymentMethod || 'HAND_CASH').toUpperCase()}`, 40, colY + 56);

            // Column 2: DELIVERY DETAILS
            doc.fillColor(brandGreen).fontSize(11).font('Helvetica-Bold').text('DELIVERY DETAILS', 310, colY);
            doc.fillColor(brandDark).fontSize(9).font('Helvetica-Bold').text('Good Type: ', 310, colY + 16, { continued: true })
               .font('Helvetica').fillColor(mutedColor).text(parcel.goodType || 'Parcel');
            doc.fillColor(brandDark).fontSize(9).font('Helvetica-Bold').text('Vehicle Type: ', 310, colY + 30, { continued: true })
               .font('Helvetica').fillColor(mutedColor).text(parcel.vehicleType || 'Standard');
            doc.fillColor(brandDark).fontSize(9).font('Helvetica-Bold').text('Pickup: ', 310, colY + 43, { continued: true })
               .font('Helvetica').fillColor(mutedColor).text(parcel.pickupLocation?.address || 'N/A', { width: 245 });
            doc.fillColor(brandDark).fontSize(9).font('Helvetica-Bold').text('Dropoff: ', 310, colY + 68, { continued: true })
               .font('Helvetica').fillColor(mutedColor).text(parcel.dropLocation?.address || 'N/A', { width: 245 });

            // Price Breakdown Section
            doc.y = Math.max(colY + 100, doc.y + 20);
            const breakdownY = doc.y;

            doc.fillColor(brandGreen).fontSize(11).font('Helvetica-Bold').text('PRICE BREAKDOWN', 40, breakdownY);
            doc.moveDown(0.8);

            const tableTop = doc.y;
            // Table Header Line
            doc.fillColor(brandDark).fontSize(9).font('Helvetica-Bold').text('Description', 40, tableTop);
            doc.fillColor(brandDark).fontSize(9).font('Helvetica-Bold').text('Amount (XOF)', 400, tableTop, { align: 'right', width: 155 });
            
            doc.moveTo(40, tableTop + 14).lineTo(555, tableTop + 14).strokeColor(brandDark).lineWidth(1.5).stroke();

            // Table Rows
            let rowY = tableTop + 22;
            doc.fillColor(mutedColor).fontSize(9).font('Helvetica').text('Total of the run', 40, rowY);
            doc.fillColor(brandDark).fontSize(9).font('Helvetica').text(`${totalOfRun.toLocaleString('en-US')} XOF`, 400, rowY, { align: 'right', width: 155 });
            doc.moveTo(40, rowY + 14).lineTo(555, rowY + 14).strokeColor('#E5E7EB').lineWidth(0.5).stroke();

            rowY += 20;
            doc.fillColor(mutedColor).fontSize(9).font('Helvetica').text('Service fee', 40, rowY);
            doc.fillColor(brandDark).fontSize(9).font('Helvetica').text(`${serviceFee.toLocaleString('en-US')} XOF`, 400, rowY, { align: 'right', width: 155 });
            doc.moveTo(40, rowY + 14).lineTo(555, rowY + 14).strokeColor('#E5E7EB').lineWidth(0.5).stroke();

            rowY += 20;
            doc.fillColor(mutedColor).fontSize(9).font('Helvetica').text('Good insurance', 40, rowY);
            doc.fillColor(brandDark).fontSize(9).font('Helvetica').text(`${goodRisks.toLocaleString('en-US')} XOF`, 400, rowY, { align: 'right', width: 155 });
            doc.moveTo(40, rowY + 14).lineTo(555, rowY + 14).strokeColor('#E5E7EB').lineWidth(1.5).stroke();

            // Total to Pay
            rowY += 22;
            doc.fillColor(brandDark).fontSize(11).font('Helvetica-Bold').text('Total to Pay', 40, rowY);
            doc.fillColor(brandGreen).fontSize(14).font('Helvetica-Bold').text(`${totalToPay.toLocaleString('en-US')} XOF`, 400, rowY, { align: 'right', width: 155 });

            // Footer
            doc.moveTo(40, 750).lineTo(555, 750).strokeColor('#E5E7EB').lineWidth(1).stroke();
            doc.fillColor(mutedColor).fontSize(9).font('Helvetica').text('Thank you for delivering with Milesquad!', 40, 762, { align: 'center', width: 515 });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};



