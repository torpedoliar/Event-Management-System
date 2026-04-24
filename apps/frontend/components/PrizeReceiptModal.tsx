'use client';

import React from 'react';
import { X, Printer } from 'lucide-react';
import { toApiUrl } from '../lib/api';

export interface Winner {
    id: string;
    guestId?: string;
    name: string;
    company?: string;
    division?: string;
    queueNumber: number;
    wonAt?: string;
}

export interface Prize {
    id: string;
    name: string;
    category?: string;
}

interface PrizeReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    winner: Winner | null;
    prize: Prize | null;
    logoUrl?: string | null;
}

export default function PrizeReceiptModal({ isOpen, onClose, winner, prize, logoUrl }: PrizeReceiptModalProps) {
    if (!isOpen || !winner || !prize) return null;

    const handlePrint = () => {
        window.print();
    };

    // Format local time using a consistent layout
    const formattedTime = winner.wonAt 
        ? new Date(winner.wonAt).toLocaleString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : new Date().toLocaleString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300 print:bg-transparent print:p-0">
            {/* Modal Container */}
            <div className="relative bg-white text-black border border-gray-300 rounded-xl w-full max-w-[500px] max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col print:border-none print:shadow-none print:max-w-none print:max-h-none print:rounded-none print:overflow-hidden print:block print:m-0">
                
                {/* Print Control Header (Hidden on print) */}
                <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl print:hidden sticky top-0 z-10">
                    <h2 className="text-base font-bold text-gray-800 font-mono">Form Print Preview</h2>
                    <div className="flex gap-3">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-brand-primary text-white px-4 py-1.5 rounded-lg font-bold hover:bg-brand-primary/90 transition-all shadow-md text-sm"
                        >
                            <Printer size={16} />
                            Print Form
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-800 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Printable Content Area — designed for half-letter (5.5" x 8.5") */}
                <div id="prize-receipt-print-area" className="px-6 py-5 print:px-0 print:py-0 flex-1 bg-white">
                    {/* Header: Logo and Title */}
                    <div className="flex flex-col items-center border-b-2 border-black pb-3 mb-4">
                        {logoUrl && (
                            <img src={toApiUrl(logoUrl)} className="h-12 mb-2 object-contain" alt="Event Logo" />
                        )}
                        <h1 className="text-xl font-black uppercase tracking-wider text-center leading-tight">Tanda Serah Terima Hadiah</h1>
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Undian Lucky Draw</p>
                    </div>

                    {/* Content Body */}
                    <div className="text-sm space-y-3">
                        <p className="leading-relaxed text-xs">
                            Berdasarkan hasil undian yang telah dilaksanakan, dengan ini menyatakan bahwa hadiah telah diserahkan kepada pihak yang tercantum di bawah ini:
                        </p>

                        <div className="bg-gray-50 p-3 rounded border border-gray-200 print:bg-transparent print:border-black">
                            <table className="w-full text-left text-xs">
                                <tbody>
                                    <tr className="border-b border-gray-200 print:border-gray-400">
                                        <th className="py-2 font-bold w-[38%] align-top">Nama Pemenang</th>
                                        <td className="py-2 w-3 align-top">:</td>
                                        <td className="py-2 font-bold text-sm uppercase">{winner.name}</td>
                                    </tr>
                                    <tr className="border-b border-gray-200 print:border-gray-400">
                                        <th className="py-2 font-bold align-top">ID / No. Pendaftaran</th>
                                        <td className="py-2 align-top">:</td>
                                        <td className="py-2 font-mono">{winner.guestId || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-gray-200 print:border-gray-400">
                                        <th className="py-2 font-bold align-top">Dept / Perusahaan</th>
                                        <td className="py-2 align-top">:</td>
                                        <td className="py-2">{winner.company || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-gray-200 print:border-gray-400">
                                        <th className="py-2 font-bold align-top">Divisi</th>
                                        <td className="py-2 align-top">:</td>
                                        <td className="py-2">{winner.division || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-gray-200 print:border-gray-400">
                                        <th className="py-2 font-bold align-top">Hadiah yang Didapat</th>
                                        <td className="py-2 align-top">:</td>
                                        <td className="py-2 font-black text-sm">{prize.name}</td>
                                    </tr>
                                    <tr>
                                        <th className="py-2 font-bold align-top">Waktu Memenangkan</th>
                                        <td className="py-2 align-top">:</td>
                                        <td className="py-2">{formattedTime}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <p className="leading-relaxed text-xs">
                            Demikian tanda serah terima ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
                        </p>
                    </div>

                    {/* Signature Area */}
                    <div className="mt-8 flex justify-between px-4">
                        <div className="text-center w-44">
                            <p className="mb-14 font-bold text-xs">Diserahkan Oleh,</p>
                            <div className="border-b border-black w-full mb-1"></div>
                            <p className="text-[10px] text-gray-600">Panitia Penyelenggara</p>
                        </div>
                        <div className="text-center w-44">
                            <p className="mb-14 font-bold text-xs">Diterima Oleh,</p>
                            <div className="border-b border-black w-full mb-1"></div>
                            <p className="text-[10px] font-bold uppercase">{winner.name}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Print Styles — Top Half of A4 Portrait */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                    
                    /* Hide everything by default */
                    body * {
                        visibility: hidden;
                    }

                    /* Only show our print container and its children */
                    #prize-receipt-print-area, #prize-receipt-print-area * {
                        visibility: visible;
                    }

                    /* Position the print area at the absolute top left of the page */
                    #prize-receipt-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        max-height: 135mm; /* Exactly half of A4 minus margins to fit top half */
                        margin: 0;
                        padding: 5mm;
                        page-break-after: avoid;
                        page-break-before: avoid;
                        break-inside: avoid;
                    }
                    
                    /* Adjust the modal container for printing */
                    .print\\:border-none {
                        border: none !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        height: auto !important;
                        max-width: none !important;
                        max-height: none !important;
                        overflow: visible !important;
                    }

                    /* Hide the print control header */
                    .print\\:hidden {
                        display: none !important;
                    }

                    /* Ensure background colors print correctly */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }

                    /* Compact font sizes for half-A4 */
                    #prize-receipt-print-area h1 {
                        font-size: 16pt !important;
                        margin-bottom: 2px !important;
                    }
                    #prize-receipt-print-area table {
                        font-size: 10pt !important;
                    }
                    #prize-receipt-print-area table th, 
                    #prize-receipt-print-area table td {
                        padding-top: 3px !important;
                        padding-bottom: 3px !important;
                    }
                    #prize-receipt-print-area p {
                        font-size: 9pt !important;
                        margin: 4px 0 !important;
                    }
                    /* Adjust signature gap */
                    .mb-14 {
                        margin-bottom: 2.5rem !important; 
                    }
                    .mt-8 {
                        margin-top: 1rem !important;
                    }
                }
            `}} />
        </div>
    );
}
