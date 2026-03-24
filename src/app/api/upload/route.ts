import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const tripId = formData.get('tripId') as string | null;
    const poiId = formData.get('poiId') as string | null;

    // Validation
    if (!file) {
      return NextResponse.json({ error: 'No file received.' }, { status: 400 });
    }
    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required to associate the document.' }, { status: 400 });
    }

    // Convert the file to a buffer for Node's fs module
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create a unique filename to prevent overwriting
    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Stricter sanitisation
    const uniqueFilename = `${timestamp}-${safeFilename}`;
    
    // ── 1. LOCAL STORAGE LOGIC (Folders per Trip) ──
    const baseUploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public/uploads');
    
    // Create a specific folder for this trip
    const tripUploadDir = path.join(baseUploadDir, tripId);
    
    // Ensure the trip directory exists
    await mkdir(tripUploadDir, { recursive: true });
    
    // Write the physical file
    const filepath = path.join(tripUploadDir, uniqueFilename);
    await writeFile(filepath, buffer);
    
    // The public URL for the browser
    const fileUrl = `/uploads/${tripId}/${uniqueFilename}`;

    // ── 2. DATABASE LOGIC (Create Prisma Record) ──
    const newDocument = await prisma.document.create({
      data: {
        tripId: tripId,
        poiId: poiId || null, // Null if it's a general trip document
        fileName: file.name,
        fileUrl: fileUrl,
        mimeType: file.type,
        sizeBytes: file.size,
      }
    });

    return NextResponse.json({ 
      message: 'File uploaded and logged successfully', 
      document: newDocument 
    }, { status: 201 });

  } catch (error) {
    console.error('File Upload & DB Error:', error);
    return NextResponse.json({ error: 'Failed to process file upload.' }, { status: 500 });
  }
}