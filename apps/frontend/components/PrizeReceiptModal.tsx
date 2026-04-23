'use client';

import React, { useEffect, useRef } from 'react';
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
            <div className="relative bg-white text-black border border-gray-300 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col print:border-none print:shadow-none print:w-[297mm] print:h-[210mm] print:max-w-none print:max-h-none print:rounded-none print:overflow-hidden print:block print:m-0 print:p-8">
                
                {/* Print Control Header (Hidden on print) */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl print:hidden sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-gray-800 font-mono">Form Print Preview</h2>
                    <div className="flex gap-4">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-brand-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-brand-primary/90 transition-all shadow-md"
                        >
                            <Printer size={20} />
                            Print Form
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-800 transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Printable Content Area */}
                <div id="prize-receipt-print-area" className="p-8 md:p-12 print:p-0 flex-1 bg-white">
                    {/* Header: Logo and Title */}
                    <div className="flex flex-col items-center border-b-2 border-black pb-6 mb-8">
                        {logoUrl && (
                            <img src={toApiUrl(logoUrl)} className="h-20 mb-4 object-contain" alt="Event Logo" />
                        )}
                        <h1 className="text-3xl font-black uppercase tracking-widest text-center">Tanda Serah Terima Hadiah</h1>
                        <p className="text-sm uppercase tracking-widest text-gray-600 mt-2">Undian Lucky Draw</p>
                    </div>

                    {/* Content Body */}
                    <div className="text-lg space-y-6">
                        <p className="leading-relaxed">
                            Berdasarkan hasil undian yang telah dilaksanakan, dengan ini menyatakan bahwa hadiah telah diserahkan kepada pihak yang tercantum di bawah ini:
                        </p>

                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:bg-transparent print:border-black">
                            <table className="w-full text-left">
                                <tbody>
                                    <tr className="border-b border-gray-200 print:border-gray-400">
                                        <th className="py-4 font-bold w-1/3 align-top">Nama Pemenang</th>
                                        <td className="py-4 w-4 align-top">:</td>
                                        <td className="py-4 font-bold text-xl uppercase">{winner.name}</td>
                                    </tr>
                                    <tr className="border-b border-gray-200 print:border-gray-400">
                                        <th className="py-4 font-bold align-top">ID / Nomor Pendaftaran</th>
                                        <td className="py-4 align-top">:</td>
                                        <td className="py-4 font-mono">{winner.guestId || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-gray-200 print:border-gray-400">
                                        <th className="py-4 font-bold align-top">Departemen / Perusahaan</th>
                                        <td className="py-4 align-top">:</td>
                                        <td className="py-4">{winner.company || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-gray-200 print:border-gray-400">
                                        <th className="py-4 font-bold align-top">Divisi</th>
                                        <td className="py-4 align-top">:</td>
                                        <td className="py-4">{winner.division || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-gray-200 print:border-gray-400">
                                        <th className="py-4 font-bold align-top">Hadiah yang Didapat</th>
                                        <td className="py-4 align-top">:</td>
                                        <td className="py-4 font-black text-xl">{prize.name}</td>
                                    </tr>
                                    <tr>
                                        <th className="py-4 font-bold align-top">Waktu Memenangkan</th>
                                        <td className="py-4 align-top">:</td>
                                        <td className="py-4">{formattedTime}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <p className="leading-relaxed">
                            Demikian tanda serah terima ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
                        </p>
                    </div>

                    {/* Signature Area */}
                    <div className="mt-16 flex justify-between px-10">
                        <div className="text-center w-64">
                            <p className="mb-24 font-bold">Diserahkan Oleh,</p>
                            <div className="border-b border-black w-full mb-2"></div>
                            <p className="text-sm text-gray-600">Panitia Penyelenggara</p>
                        </div>
                        <div className="text-center w-64">
                            <p className="mb-24 font-bold">Diterima Oleh,</p>
                            <div className="border-b border-black w-full mb-2"></div>
                            <p className="text-sm font-bold uppercase">{winner.name}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Print Styles specific to this component's active state */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page {
                        size: landscape;
                        margin: 15mm;
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
                        margin: 0;
                        padding: 0;
                    }
                    
                    /* Adjust the modal container for printing */
                    .print\\:border-none {
                        border: none !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        height: 100% !important;
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
                }
            `}} />
        </div>
    );
}
