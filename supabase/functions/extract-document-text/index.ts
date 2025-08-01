import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    let fileType = formData.get('fileType') as string;

    if (!file) {
      throw new Error('No file provided');
    }

    // If fileType is not provided, try to infer from file extension
    if (!fileType && file.name) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      fileType = extension || 'unknown';
    } else if (!fileType && file.type) {
      // Try to infer from MIME type
      const mimeTypeMap: { [key: string]: string } = {
        'application/pdf': 'pdf',
        'text/plain': 'txt',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'text/csv': 'csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.ms-excel': 'xls'
      };
      fileType = mimeTypeMap[file.type] || 'unknown';
    }

    // Ensure fileType is not null/undefined
    if (!fileType) {
      fileType = 'unknown';
    }

    console.log(`Processing file: ${file.name}, type: ${fileType}, size: ${file.size} bytes`);

    let extractedText = '';
    const fileBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);

    switch (fileType.toLowerCase()) {
      case 'pdf':
        extractedText = await extractFromPDF(uint8Array);
        break;
      case 'txt':
        extractedText = new TextDecoder().decode(uint8Array);
        break;
      case 'docx':
        extractedText = await extractFromDocx(uint8Array);
        break;
      case 'csv':
        extractedText = await extractFromCSV(uint8Array);
        break;
      case 'xlsx':
      case 'xls':
        extractedText = await extractFromExcel(uint8Array);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the document');
    }

    console.log(`Successfully extracted ${extractedText.length} characters from ${file.name}`);

    return new Response(JSON.stringify({
      success: true,
      extractedText: extractedText.substring(0, 50000), // Limit to 50k chars
      filename: file.name,
      fileSize: file.size,
      textLength: extractedText.length,
      preview: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in extract-document-text function:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      extractedText: '',
      filename: '',
      fileSize: 0,
      textLength: 0,
      preview: ''
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function extractFromPDF(uint8Array: Uint8Array): Promise<string> {
  try {
    console.log('🔍 Starting PDF.js text extraction...');
    console.log(`📄 PDF size: ${uint8Array.length} bytes`);
    
    // Import PDF.js for proper PDF parsing
    const pdfjsLib = await import('https://esm.sh/pdfjs-dist@4.4.168/build/pdf.min.mjs');
    
    // Disable workers for edge function environment
    pdfjsLib.GlobalWorkerOptions.workerSrc = null;
    
    console.log('📚 PDF.js loaded successfully');
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      verbosity: 0, // Reduce logging
      standardFontDataUrl: null,
      cMapUrl: null,
      cMapPacked: false,
    });
    
    const pdfDocument = await loadingTask.promise;
    console.log(`📄 PDF loaded: ${pdfDocument.numPages} pages`);
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      try {
        console.log(`🔍 Processing page ${pageNum}...`);
        
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract text items and combine them
        const pageText = textContent.items
          .map((item: any) => {
            if (item.str && typeof item.str === 'string') {
              return item.str.trim();
            }
            return '';
          })
          .filter((text: string) => text.length > 0)
          .join(' ');
        
        if (pageText.trim()) {
          fullText += pageText + '\n';
          console.log(`✅ Page ${pageNum}: extracted ${pageText.length} characters`);
        } else {
          console.log(`⚠️ Page ${pageNum}: no text content found`);
        }
        
        // Clean up page resources
        page.cleanup();
        
      } catch (pageError) {
        console.error(`❌ Error processing page ${pageNum}:`, pageError.message);
        continue;
      }
    }
    
    // Clean up document resources
    pdfDocument.destroy();
    
    // Clean and format the extracted text
    fullText = fullText
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
    
    console.log(`🎯 Extraction complete: ${fullText.length} characters total`);
    
    if (fullText.length > 10) {
      console.log(`📋 Sample extracted text: "${fullText.substring(0, 300)}..."`);
      return fullText;
    }
    
    // If no text was extracted, it's likely a scanned PDF
    return `📄 PDF Analysis Complete - No extractable text found.

🔍 PDF Information:
- Pages: ${pdfDocument?.numPages || 'Unknown'}
- File size: ${(uint8Array.length / 1024).toFixed(1)} KB
- Text extraction: Failed (likely scanned/image-based)

💡 This appears to be a scanned PDF that requires OCR processing.

🔧 Recommended Solutions:
1. **OCR Conversion**: Use Adobe Acrobat with OCR feature
2. **Google Drive**: Upload to Google Drive, it will auto-OCR and make it searchable
3. **Online OCR**: Use services like:
   - smallpdf.com/ocr-pdf
   - pdf24.org/ocr-pdf
   - ilovepdf.com/ocr-pdf
4. **Mobile Apps**: Use Adobe Scan, Microsoft Office Lens, or CamScanner
5. **Manual Entry**: Copy and paste text if you can select it in a PDF viewer

📝 For best results with lab reports, ensure they're created digitally or scanned with OCR enabled.`;
    
  } catch (error) {
    console.error('💥 PDF.js extraction error:', error);
    console.error('💥 Error details:', error.message);
    
    // Fallback to basic extraction if PDF.js fails
    console.log('🔄 Falling back to basic text extraction...');
    return await basicPDFExtraction(uint8Array);
  }
}

// Fallback method for when PDF.js fails
async function basicPDFExtraction(uint8Array: Uint8Array): Promise<string> {
  try {
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const pdfContent = textDecoder.decode(uint8Array);
    
    console.log('🔄 Using fallback extraction method...');
    
    // Simple parentheses extraction as fallback
    const parenthesesRegex = /\(([^)]+)\)/g;
    let match;
    let extractedText = '';
    const seenTexts = new Set();
    let count = 0;
    
    while ((match = parenthesesRegex.exec(pdfContent)) !== null && count < 500) {
      count++;
      let text = match[1];
      
      if (!text || text.length < 2 || text.length > 100) continue;
      
      // Basic cleaning
      text = text.replace(/\\[nrt]/g, ' ').trim();
      
      // Skip obvious metadata
      if (text === 'Identity' || text === 'Adobe' || text === 'UCS' || 
          text === 'HiQPdf' || /^[\d\.\-\s]+$/.test(text)) continue;
      
      if (/[a-zA-Z]/.test(text) && !seenTexts.has(text.toLowerCase())) {
        seenTexts.add(text.toLowerCase());
        extractedText += text + ' ';
      }
    }
    
    extractedText = extractedText.replace(/\s+/g, ' ').trim();
    
    if (extractedText.length > 10) {
      return extractedText;
    }
    
    return `❌ Unable to extract readable text from this PDF.

This PDF may be:
- Scanned/image-based (requires OCR)
- Password protected
- Corrupted or malformed
- Using unsupported encoding

Please try the OCR solutions mentioned above.`;
    
  } catch (fallbackError) {
    console.error('💥 Fallback extraction also failed:', fallbackError);
    return `❌ PDF processing failed completely: ${fallbackError.message}

Please try:
1. Converting the PDF to text using Adobe Acrobat
2. Using online OCR services
3. Copying and pasting text directly if selectable`;
  }
}

async function extractFromDocx(uint8Array: Uint8Array): Promise<string> {
  try {
    const mammoth = await import('https://esm.sh/mammoth@1.6.0');
    const result = await mammoth.extractRawText({ arrayBuffer: uint8Array.buffer });
    return result.value;
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error(`Failed to extract text from DOCX: ${error.message}`);
  }
}

async function extractFromCSV(uint8Array: Uint8Array): Promise<string> {
  try {
    const Papa = await import('https://esm.sh/papaparse@5.4.1');
    const csvText = new TextDecoder().decode(uint8Array);
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    
    if (parsed.errors.length > 0) {
      console.warn('CSV parsing warnings:', parsed.errors);
    }
    
    // Convert to readable format
    let result = `CSV Data Summary (${parsed.data.length} rows):\n\n`;
    
    if (parsed.data.length > 0) {
      const headers = Object.keys(parsed.data[0] as any);
      result += `Columns: ${headers.join(', ')}\n\n`;
      
      // Include first few rows as sample
      const sampleRows = parsed.data.slice(0, Math.min(10, parsed.data.length));
      result += 'Sample Data:\n';
      sampleRows.forEach((row: any, index: number) => {
        result += `Row ${index + 1}: ${JSON.stringify(row)}\n`;
      });
    }
    
    return result;
  } catch (error) {
    console.error('CSV extraction error:', error);
    throw new Error(`Failed to extract text from CSV: ${error.message}`);
  }
}

async function extractFromExcel(uint8Array: Uint8Array): Promise<string> {
  try {
    const XLSX = await import('https://esm.sh/xlsx@0.18.5');
    const workbook = XLSX.read(uint8Array, { type: 'array' });
    
    let result = `Excel Workbook Summary:\n\n`;
    result += `Sheets: ${workbook.SheetNames.join(', ')}\n\n`;
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      result += `Sheet "${sheetName}" (${jsonData.length} rows):\n`;
      
      // Include first few rows
      const sampleRows = jsonData.slice(0, Math.min(10, jsonData.length));
      sampleRows.forEach((row: any, index: number) => {
        if (row && row.length > 0) {
          result += `Row ${index + 1}: ${row.join(' | ')}\n`;
        }
      });
      result += '\n';
    });
    
    return result;
  } catch (error) {
    console.error('Excel extraction error:', error);
    throw new Error(`Failed to extract text from Excel: ${error.message}`);
  }
}