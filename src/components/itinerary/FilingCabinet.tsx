'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, UploadCloud, FileText, FileImage, 
  Trash2, Link2, CheckCircle2, Loader2, Paperclip
} from 'lucide-react';

interface POIReference {
  id: string;
  name: string;
  dayName?: string;
}

interface DocumentInfo {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  poiId?: string | null;
}

interface FilingCabinetProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  availablePOIs?: POIReference[]; 
  documents?: DocumentInfo[];     
  onUploadSuccess?: () => void; 
}

export default function FilingCabinet({ 
  isOpen, 
  onClose, 
  tripId,
  availablePOIs = [],
  documents = [],
  onUploadSuccess
}: FilingCabinetProps) {
  
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPoiId, setSelectedPoiId] = useState<string>('TRIP_LEVEL');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ─── DRAG & DROP HANDLERS ──────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files && files.length > 0) {
      await processUpload(files[0]);
    }
  }, [selectedPoiId, tripId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processUpload(files[0]);
    }
  };

  // ─── UPLOAD LOGIC ──────────────────────────────────────────────────────────
  const processUpload = async (file: File) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF or Image file.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tripId', tripId);
      if (selectedPoiId !== 'TRIP_LEVEL') {
        formData.append('poiId', selectedPoiId);
      }

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Failed to upload file to storage');

      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Reset selection to trip level after a successful upload
      setSelectedPoiId('TRIP_LEVEL');

    } catch (error) {
      console.error('Upload Error:', error);
      alert('There was an error uploading your document.');
    } finally {
      setIsUploading(false);
    }
  };

  // ─── HELPER COMPONENTS ─────────────────────────────────────────────────────
  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="w-5 h-5 text-zinc-400" />;
    if (mimeType.includes('image')) return <FileImage className="w-5 h-5 text-zinc-400" />;
    return <Paperclip className="w-5 h-5 text-zinc-400" />;
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm md:hidden"
          />

          {/* The Drawer Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-[9999] md:w-[450px] flex flex-col w-full bg-zinc-50 dark:bg-zinc-900/50 rounded-l-3xl p-6 sm:p-8 shadow-2xl border-l border-zinc-200 dark:border-zinc-800"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                  <span className="text-2xl">📎</span> Filing Cabinet
                </h2>
                <p className="text-sm text-zinc-500 mb-6">
                  Store boarding passes, tickets, and visas.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              
              {/* Context Selector */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Attach next upload to:
                </label>
                <div className="relative">
                  <select 
                    value={selectedPoiId}
                    onChange={(e) => setSelectedPoiId(e.target.value)}
                    className="w-full py-3 pl-10 pr-4 text-sm bg-white dark:bg-zinc-800/50 border rounded-xl appearance-none border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none transition-all"
                  >
                    <option value="TRIP_LEVEL">General Trip Document (Unassigned)</option>
                    {availablePOIs.length > 0 && <optgroup label="Specific Activities">
                      {availablePOIs.map(poi => (
                        <option key={poi.id} value={poi.id}>
                          {poi.name} {poi.dayName ? `(${poi.dayName})` : ''}
                        </option>
                      ))}
                    </optgroup>}
                  </select>
                  <Link2 className="absolute w-4 h-4 text-zinc-400 left-4 top-3.5" />
                </div>
              </div>

              {/* Dropzone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative w-full flex flex-col items-center justify-center p-8 sm:p-10 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white/50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer group mb-8 ${
                  isDragging 
                    ? '!bg-zinc-100 dark:!bg-zinc-800 border-zinc-300 dark:border-zinc-700' 
                    : ''
                }`}
              >
                <input 
                  type="file" 
                  className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileSelect}
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  disabled={isUploading}
                />
                
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-10 h-10 mb-3 text-zinc-400 animate-spin" />
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200 mt-4">Uploading securely...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <UploadCloud className={`w-8 h-8 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors`} />
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200 mt-4">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      PDF, JPG, PNG (Max 10MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Document Roster */}
              <div>
                <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                  Stored Documents
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2.5 py-0.5 rounded-full text-xs">
                    {documents.length}
                  </span>
                </h3>
                
                <div className="space-y-0">
                  {documents.length === 0 ? (
                    <div className="p-6 text-sm text-center border rounded-xl text-zinc-500 border-zinc-200/60 dark:border-zinc-800 bg-white/50 dark:bg-zinc-800/50">
                      No documents uploaded yet. Drop a flight itinerary or booking confirmation above!
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="group flex items-center justify-between p-4 mt-3 bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all"
                      >
                        <div className="flex items-center flex-1 min-w-0 pr-4">
                          <div className="flex items-center justify-center w-10 h-10 mr-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 text-zinc-400">
                            {getFileIcon(doc.mimeType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <a 
                              href={doc.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-zinc-900 dark:text-white truncate block hover:underline"
                            >
                              {doc.fileName}
                            </a>
                            <div className="flex items-center mt-1 text-xs text-zinc-400 uppercase tracking-wider">
                              {doc.poiId ? (
                                <span className="flex items-center">
                                  <Link2 className="w-3 h-3 mr-1" />
                                  Attached
                                </span>
                              ) : (
                                <span className="flex items-center">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  General
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <a 
                            href={doc.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                            title="View Document"
                          >
                            <Link2 className="w-4 h-4" />
                          </a>
                          <button 
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                            title="Delete Document (Coming soon)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
