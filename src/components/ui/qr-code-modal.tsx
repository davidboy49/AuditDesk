"use client";

import { useEffect, useState, useRef } from "react";
import { QrCode, Copy, Check, Printer, X, ExternalLink, ShieldCheck, Sparkles, Building2 } from "lucide-react";
import QRCode from "qrcode";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrToken: string;
  projectTitle: string;
  projectCode: string;
  departments?: string;
}

export default function QRCodeModal({
  isOpen,
  onClose,
  qrToken,
  projectTitle,
  projectCode,
  departments = "IT, Finance, Operations"
}: QRCodeModalProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [scanUrl, setScanUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isPresentMode, setIsPresentMode] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/meetings/scan/${qrToken}`;
    setScanUrl(url);

    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: {
        dark: "#0F172A", // Slate 900
        light: "#FFFFFF"
      }
    })
      .then((urlData) => setDataUrl(urlData))
      .catch((err) => console.error("Failed to generate QR code", err));
  }, [isOpen, qrToken]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(scanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className={`relative w-full ${isPresentMode ? 'max-w-4xl bg-slate-900 border-2 border-indigo-500/50 shadow-2xl shadow-indigo-500/20' : 'max-w-md bg-slate-900 border border-slate-800'} rounded-2xl p-6 text-slate-100 shadow-2xl transition-all duration-300`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                Universal Audit Plan QR Code
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-normal">
                  {projectCode}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Single entry point for all departmental Open Meetings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presentation vs Normal Body */}
        {isPresentMode ? (
          <div className="py-8 flex flex-col items-center text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-sm font-medium">
              <Sparkles className="w-4 h-4" /> Presenting Open Meeting QR Code
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{projectTitle}</h2>
              <p className="text-sm text-slate-400 max-w-lg mx-auto">
                Auditees: Please scan this QR code on your mobile device to open your department's specific meeting agenda, audit scope, and submit digital consent.
              </p>
            </div>

            {/* QR Frame */}
            <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-indigo-500/20 border-4 border-indigo-500/40">
              {dataUrl ? (
                <img src={dataUrl} alt="Audit Plan QR Code" className="w-72 h-72 object-contain" />
              ) : (
                <div className="w-72 h-72 flex items-center justify-center text-slate-400 text-sm">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Directs IT, Finance, HR & Auditees to their isolated department views
            </div>
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center text-center space-y-4">
            {/* QR Container */}
            <div className="relative group p-3 bg-white rounded-2xl shadow-lg border border-slate-200">
              {dataUrl ? (
                <img src={dataUrl} alt="Audit Plan QR Code" className="w-56 h-56 object-contain" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-sm">
                  Generating QR...
                </div>
              )}
            </div>

            {/* Information Banner */}
            <div className="w-full text-left p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Applicable Departments
                </span>
                <span className="text-[11px] text-emerald-400 font-medium">Auto-Routed</span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-1 font-mono">
                {departments || "All Project Departments"}
              </p>
              <div className="pt-1 text-[11px] text-slate-400 border-t border-slate-800/60 flex items-center justify-between">
                <span>Direct Link:</span>
                <span className="font-mono text-indigo-300 text-[10px] truncate max-w-[200px]">{scanUrl}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPresentMode(!isPresentMode)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isPresentMode ? "Standard View" : "Presentation Mode"}
            </button>
            <a
              href={scanUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Test Portal
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy Link"}
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Banner
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
