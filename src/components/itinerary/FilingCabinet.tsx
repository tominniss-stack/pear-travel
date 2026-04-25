'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, UploadCloud, FileText, FileImage, 
  Trash2, Link2, CheckCircle2, Loader2, Paperclip
} from 'lucide-react';
import { deleteDocument } from '@/app/actions/documents';

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string>('TRIP_LEVEL');
  const [mounted, setMounted] = useState(false);

  const handleDelete = async (docId: string) => {
    try {
      setDeletingId(docId);
      const result = await deleteDocument(docId);
      if (result.success && onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document.');
    } finally {
      setDeletingId(null);
    }
  };

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
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm md:hidden"
          />

          {/* The Drawer Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-[9999] w-full md:w-[450px] bg-white dark:bg-[#0a0a0a] shadow-2xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col text-zinc-900 dark:text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 sm:p-8">
              <div>
                <h2 className="text-2xl font-medium tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                  <span className="text-2xl">📎</span> Filing Cabinet
                </h2>
                <p className="text-sm text-zinc-500 mt-2">
                  Store boarding passes, tickets, and visas.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-0">
              
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
                className={`relative flex flex-col items-center justify-center w-full p-8 sm:p-10 mb-8 text-center rounded-3xl transition-all duration-300 border ${
                  isDragging 
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10' 
                    : 'border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'
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
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-4">Uploading securely...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <UploadCloud className="w-8 h-8 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-4">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-zinc-500 mt-2">
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
                    <div className="p-6 text-sm text-center border rounded-xl text-zinc-500 border-zinc-200/60 dark:border-zinc-800 bg-white/50 dark:bg-zinc-800/50 mt-3">
                      No documents uploaded yet. Drop a flight itinerary or booking confirmation above!
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="group flex items-center p-4 transition-all bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 hover:border-zinc-200 dark:hover:border-zinc-700 mt-3"
                      >
                        <div className="flex items-center flex-1 min-w-0 pr-4">
                          <div className="flex items-center justify-center w-12 h-12 mr-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 text-zinc-400">
                            {getFileIcon(doc.mimeType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <a 
                              href={doc.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-zinc-900 dark:text-white truncate block hover:text-brand-600 transition-colors"
                            >
                              {doc.fileName}
                            </a>
                            <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
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
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(doc.id);
                            }}
                            disabled={deletingId === doc.id}
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 disabled:opacity-50 flex items-center justify-center"
                            title="Delete Document"
                          >
                            {deletingId === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
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
