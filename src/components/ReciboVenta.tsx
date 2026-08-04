import { useState } from 'react';
import jsPDF from 'jspdf';
import api from '../services/api';

interface DetalleReciboItem {
    producto: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
}

interface ReciboVentaProps {
    idVenta: number;
    fecha: string;
    cliente: string;
    identificacionCliente?: string;
    emailCliente?: string;
    detalle: DetalleReciboItem[];
    subtotal?: number;
    descuentoPromociones?: number;
    descuentoManualPorcentaje?: number;
    modoDescuentoManual?: 'producto' | 'total';
    descuentoManualTotal?: number;
    total: number;
    formaPago: string;
    onCerrar: () => void;
}

export default function ReciboVenta({
    idVenta, fecha, cliente, identificacionCliente, emailCliente,
    detalle, subtotal, descuentoPromociones = 0, descuentoManualPorcentaje = 0,
    modoDescuentoManual, descuentoManualTotal = 0, total, formaPago, onCerrar
}: ReciboVentaProps) {
    const [enviarCorreo, setEnviarCorreo] = useState(false);
    const [email, setEmail] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    const etiquetaDescuentoPorProducto = (descuentoManualPorcentaje > 0 && modoDescuentoManual === 'producto')
        ? 'Descuento aplicado'
        : 'Descuento por promociones';

    const ANCHO_PAPEL = 80;
    const MARGEN = 2;
    const CENTRO = ANCHO_PAPEL / 2;
    const LINEA_DESDE = MARGEN;
    const LINEA_HASTA = ANCHO_PAPEL - MARGEN;
    const COL_PRODUCTO = MARGEN;
    const COL_CANTIDAD = ANCHO_PAPEL - 22;
    const COL_SUBTOTAL = ANCHO_PAPEL - 14;
    const MAX_CHARS_PRODUCTO = 16;

    const generarPDF = (): jsPDF => {
        const doc = new jsPDF({ format: [ANCHO_PAPEL, 200], unit: 'mm' });
        let y = 4;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Agro Verde', CENTRO, y, { align: 'center' });
        y += 4;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Tecnología del norte', CENTRO, y, { align: 'center' });
        y += 5;

        doc.text(`Comprobante de Venta #${idVenta}`, CENTRO, y, { align: 'center' });
        y += 4;
        doc.text(`Fecha: ${new Date(fecha).toLocaleString()}`, MARGEN, y);
        y += 3.5;
        doc.text(`Cliente: ${cliente.substring(0, 28)}`, MARGEN, y);
        y += 3.5;
        if (identificacionCliente) {
            doc.text(`ID: ${identificacionCliente}`, MARGEN, y);
            y += 3.5;
        }
        doc.text(`Forma de pago: ${formaPago}`, MARGEN, y);
        y += 5;

        doc.line(LINEA_DESDE, y, LINEA_HASTA, y);
        y += 3.5;
        doc.setFont('helvetica', 'bold');
        doc.text('Producto', COL_PRODUCTO, y);
        doc.text('Cant.', COL_CANTIDAD, y);
        doc.text('Subt.', COL_SUBTOTAL, y);
        doc.setFont('helvetica', 'normal');
        y += 3.5;
        doc.line(LINEA_DESDE, y, LINEA_HASTA, y);
        y += 3.5;

        detalle.forEach(d => {
            doc.text(d.producto.substring(0, MAX_CHARS_PRODUCTO), COL_PRODUCTO, y);
            doc.text(String(d.cantidad), COL_CANTIDAD, y);
            doc.text(`$${d.subtotal.toFixed(2)}`, COL_SUBTOTAL, y);
            y += 3.5;
        });

        y += 1.5;
        doc.line(LINEA_DESDE, y, LINEA_HASTA, y);
        y += 3.5;

        if (subtotal != null) {
            doc.text('Subtotal:', COL_PRODUCTO, y);
            doc.text(`$${subtotal.toFixed(2)}`, COL_SUBTOTAL, y);
            y += 3.5;
        }

        if (descuentoPromociones > 0) {
            doc.text(`${etiquetaDescuentoPorProducto}:`.substring(0, MAX_CHARS_PRODUCTO + 6), COL_PRODUCTO, y);
            doc.text(`-$${descuentoPromociones.toFixed(2)}`, COL_SUBTOTAL, y);
            y += 3.5;
        }

        if (descuentoManualTotal > 0) {
            doc.text(`Desc. manual (${descuentoManualPorcentaje}%):`, COL_PRODUCTO, y);
            doc.text(`-$${descuentoManualTotal.toFixed(2)}`, COL_SUBTOTAL, y);
            y += 3.5;
        }

        y += 1;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`TOTAL:`, COL_PRODUCTO, y);
        doc.text(`$${total.toFixed(2)}`, COL_SUBTOTAL, y);
        y += 6;

        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text('Este comprobante no tiene', CENTRO, y, { align: 'center' });
        y += 3;
        doc.text('validez tributaria (SRI).', CENTRO, y, { align: 'center' });

        return doc;
    };

    const imprimir = () => {
        const doc = generarPDF();
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
    };

    const descargar = () => {
        const doc = generarPDF();
        doc.save(`Comprobante_Venta_${idVenta}.pdf`);
    };

    const enviarPorCorreo = async () => {
        const destinatario = emailCliente || email.trim();
        if (!destinatario) {
            setError('Este cliente no tiene correo registrado. Ingresa uno manualmente.');
            return;
        }
        setEnviando(true);
        setError('');
        setMensaje('');
        try {
            const doc = generarPDF();
            const pdfBase64 = doc.output('datauristring').split(',')[1];

            const res = await api.post(`/Ventas/${idVenta}/enviar-comprobante`, {
                email: destinatario,
                pdfBase64
            });

            if (res.data.success) {
                setMensaje('Comprobante enviado correctamente.');
            } else {
                setError(res.data.mensaje ?? 'No se pudo enviar el correo.');
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje ?? 'Error al enviar el comprobante.');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onCerrar}>
            {/* 1. SE AGREGA MAX-HEIGHT Y FLEX COLUMN AQUÍ */}
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

                {/* HEADER (Fijo arriba) */}
                <div className="modal-header">
                    <h2>Comprobante de Venta #{idVenta}</h2>
                    <button className="btn-close" onClick={onCerrar}>✕</button>
                </div>

                {/* 2. BODY SCROLLEABLE: Todo el contenido va envuelto aquí */}
                <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
                    <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 12 }}>
                        <p><strong>Cliente:</strong> {cliente}</p>
                        <p><strong>Fecha:</strong> {new Date(fecha).toLocaleString()}</p>
                        <p><strong>Forma de pago:</strong> {formaPago}</p>
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
                        {subtotal != null && (
                            <div className="pos-ticket-fila"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                        )}
                        {descuentoPromociones > 0 && (
                            <div className="pos-ticket-fila" style={{ color: '#ef4444' }}>
                                <span>{etiquetaDescuentoPorProducto}</span><span>-${descuentoPromociones.toFixed(2)}</span>
                            </div>
                        )}
                        {descuentoManualTotal > 0 && (
                            <div className="pos-ticket-fila" style={{ color: '#ef4444' }}>
                                <span>Descuento manual ({descuentoManualPorcentaje}%)</span><span>-${descuentoManualTotal.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="pos-ticket-total"><span>Total</span><span>${total.toFixed(2)}</span></div>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={enviarCorreo}
                                onChange={e => setEnviarCorreo(e.target.checked)}
                            />
                            Enviar comprobante por correo electrónico
                        </label>
                    </div>

                    {enviarCorreo && (
                        <div className="form-group">
                            {emailCliente ? (
                                <div style={{ fontSize: 13, color: '#4b5563', background: '#f3f4f6', padding: '8px 10px', borderRadius: 6 }}>
                                    Se enviará a: <strong>{emailCliente}</strong>
                                </div>
                            ) : (
                                <>
                                    <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 6 }}>
                                        Este cliente no tiene correo registrado.
                                    </p>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="correo@ejemplo.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </>
                            )}
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}
                    {mensaje && <div className="success-message">{mensaje}</div>}
                </div>
                {/* FIN DEL BODY SCROLLEABLE */}

                {/* FOOTER (Fijo abajo, con margen para separarse del scroll) */}
                <div className="modal-footer" style={{ flexWrap: 'wrap', gap: 8, marginTop: '12px' }}>
                    <button className="btn-cancelar" onClick={onCerrar}>Cerrar</button>
                    <button className="btn-action-text" onClick={descargar}>Descargar PDF</button>
                    <button className="btn-action-text" onClick={imprimir}>Imprimir</button>
                    {enviarCorreo && (
                        <button className="btn-guardar" onClick={enviarPorCorreo} disabled={enviando}>
                            {enviando ? 'Enviando...' : 'Enviar por correo'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}