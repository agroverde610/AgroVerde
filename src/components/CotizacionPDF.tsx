import jsPDF from 'jspdf';

interface DetalleCotizacionItem {
    producto: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
}

interface CotizacionPDFProps {
    idCotizacion: number;
    fecha: string;
    cliente: string;
    telefonoCliente?: string;
    detalle: DetalleCotizacionItem[];
    subtotal: number;
    descuentoPromociones: number;
    total: number;
    onCerrar: () => void;
}

export default function CotizacionPDF({
    idCotizacion, fecha, cliente, telefonoCliente,
    detalle, subtotal, descuentoPromociones, total, onCerrar
}: CotizacionPDFProps) {

    const generarPDF = (): jsPDF => {
        const doc = new jsPDF({ format: [80, 200], unit: 'mm' });
        let y = 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Agro Verde', 40, y, { align: 'center' });
        y += 5;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Tecnología del norte', 40, y, { align: 'center' });
        y += 6;

        doc.text(`Cotización #${idCotizacion}`, 40, y, { align: 'center' });
        y += 5;
        doc.text(`Fecha: ${new Date(fecha).toLocaleString()}`, 5, y);
        y += 4;
        doc.text(`Cliente: ${cliente}`, 5, y);
        y += 4;
        if (telefonoCliente) {
            doc.text(`Teléfono: ${telefonoCliente}`, 5, y);
            y += 4;
        }
        y += 2;

        doc.line(5, y, 75, y);
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.text('Producto', 5, y);
        doc.text('Cant.', 45, y);
        doc.text('Subt.', 65, y);
        doc.setFont('helvetica', 'normal');
        y += 4;
        doc.line(5, y, 75, y);
        y += 4;

        detalle.forEach(d => {
            doc.text(d.producto.substring(0, 20), 5, y);
            doc.text(String(d.cantidad), 45, y);
            doc.text(`$${d.subtotal.toFixed(2)}`, 65, y);
            y += 4;
        });

        y += 2;
        doc.line(5, y, 75, y);
        y += 4;

        doc.text('Subtotal:', 5, y);
        doc.text(`$${subtotal.toFixed(2)}`, 65, y);
        y += 4;

        if (descuentoPromociones > 0) {
            doc.text('Descuento:', 5, y);
            doc.text(`-$${descuentoPromociones.toFixed(2)}`, 65, y);
            y += 4;
        }

        y += 1;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('TOTAL:', 5, y);
        doc.text(`$${total.toFixed(2)}`, 65, y);
        y += 8;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Documento informativo, sujeto a disponibilidad de stock.', 40, y, { align: 'center' });
        y += 3;
        doc.text('No tiene validez tributaria (SRI).', 40, y, { align: 'center' });

        return doc;
    };

    const imprimir = () => {
        const doc = generarPDF();
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
    };

    const descargar = () => {
        const doc = generarPDF();
        doc.save(`Cotizacion_${idCotizacion}.pdf`);
    };

    return (
        <div className="modal-overlay" onClick={onCerrar}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                <div className="modal-header">
                    <h2>Cotización #{idCotizacion}</h2>
                    <button className="btn-close" onClick={onCerrar}>✕</button>
                </div>

                <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 12 }}>
                    <p><strong>Cliente:</strong> {cliente}</p>
                    <p><strong>Fecha:</strong> {new Date(fecha).toLocaleString()}</p>
                    {telefonoCliente && <p><strong>Teléfono:</strong> {telefonoCliente}</p>}
                </div>

                <table className="clientes-table" style={{ marginBottom: 12 }}>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cant.</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {detalle.map((d, i) => (
                            <tr key={i}>
                                <td>{d.producto}</td>
                                <td>{d.cantidad}</td>
                                <td>${d.subtotal.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ fontSize: 13, marginBottom: 16 }}>
                    <div className="pos-ticket-fila"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                    {descuentoPromociones > 0 && (
                        <div className="pos-ticket-fila" style={{ color: '#ef4444' }}>
                            <span>Descuento</span><span>-${descuentoPromociones.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="pos-ticket-total"><span>Total</span><span>${total.toFixed(2)}</span></div>
                </div>

                <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16 }}>
                    Documento informativo, sujeto a disponibilidad de stock. No tiene validez tributaria.
                </p>

                <div className="modal-footer" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <button className="btn-cancelar" onClick={onCerrar}>Cerrar</button>
                    <button className="btn-action-text" onClick={descargar}>Descargar PDF</button>
                    <button className="btn-action-text" onClick={imprimir}>Imprimir</button>
                </div>
            </div>
        </div>
    );
}