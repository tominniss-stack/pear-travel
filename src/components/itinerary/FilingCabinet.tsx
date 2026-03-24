'use client';

import React, { useState, useCallback } from 'react';
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
    if (mimeType.includes('pdf')) return <FileText className="w-6 h-6 text-red-500" />;
    if (mimeType.includes('image')) return <FileImage className="w-6 h-6 text-blue-500" />;
    return <Paperclip className="w-6 h-6 text-slate-500" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm md:hidden"
          />

          {/* The Drawer Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-[110] w-full md:w-[450px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-2xl">📎</span> Filing Cabinet
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Store boarding passes, tickets, and visas.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              
              {/* Context Selector */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                  Attach next upload to:
                </label>
                <div className="relative">
                  <select 
                    value={selectedPoiId}
                    onChange={(e) => setSelectedPoiId(e.target.value)}
                    className="w-full py-3 pl-10 pr-4 text-sm bg-slate-50 border rounded-xl appearance-none dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm"
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
                  <Link2 className="absolute w-4 h-4 text-slate-400 left-4 top-3.5" />
                </div>
              </div>

              {/* Dropzone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center w-full p-8 mb-8 text-center border-2 border-dashed rounded-2xl transition-all duration-200 ${
                  isDragging 
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' 
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                    <Loader2 className="w-10 h-10 mb-3 text-brand-500 animate-spin" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Uploading securely...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className={`p-4 mb-4 rounded-full ${isDragging ? 'bg-brand-100 dark:bg-brand-900' : 'bg-white dark:bg-slate-700'} shadow-sm transition-colors`}>
                      <UploadCloud className={`w-8 h-8 ${isDragging ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    </div>
                    <p className="mb-1 text-sm font-bold text-slate-900 dark:text-white">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">
                      PDF, JPG, PNG (Max 10MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Document Roster */}
              <div>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  Stored Documents
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full text-xs">
                    {documents.length}
                  </span>
                </h3>
                
                <div className="space-y-3">
                  {documents.length === 0 ? (
                    <div className="p-6 text-sm text-center border border-dashed rounded-xl text-slate-500 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                      No documents uploaded yet. Drop a flight itinerary or booking confirmation above!
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center p-3 transition-all bg-white border rounded-xl shadow-sm group dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700"
                      >
                        <div className="flex items-center justify-center w-12 h-12 mr-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          {getFileIcon(doc.mimeType)}
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <a 
                            href={doc.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm font-bold truncate block text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                          >
                            {doc.fileName}
                          </a>
                          <div className="flex items-center mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {doc.poiId ? (
                              <span className="flex items-center text-amber-600 dark:text-amber-400">
                                <Link2 className="w-3 h-3 mr-1" />
                                Attached to Activity
                              </span>
                            ) : (
                              <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                General Trip Doc
                              </span>
                            )}
                          </div>
                        </div>
                        <button 
                          className="p-2 transition-opacity opacity-0 text-slate-400 hover:text-red-500 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Delete Document (Coming soon)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}