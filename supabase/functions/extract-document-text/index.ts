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
  console.log('🔍 Starting basic PDF text extraction...');
  console.log(`📄 PDF size: ${uint8Array.length} bytes`);
  
  try {
    // Convert to string for basic analysis
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const pdfContent = textDecoder.decode(uint8Array);
    
    console.log('📊 Basic PDF analysis...');
    const contentLength = pdfContent.length;
    const hasTextObjects = pdfContent.includes('BT') && pdfContent.includes('ET');
    const hasStreams = pdfContent.includes('stream');
    const hasImages = pdfContent.includes('/Image');
    const hasFont = pdfContent.includes('/Font');
    
    console.log(`- Content length: ${contentLength}`);
    console.log(`- Text objects: ${hasTextObjects}`);
    console.log(`- Streams: ${hasStreams}`);
    console.log(`- Images: ${hasImages}`);
    console.log(`- Fonts: ${hasFont}`);
    
    let extractedText = '';
    const meaningfulTexts = new Set();
    
    // Smart text extraction with better filtering
    console.log('🎯 Extracting meaningful text...');
    const regex = /\(([^)]+)\)/g;
    let match;
    let count = 0;
    const maxIterations = 800; // Increased to find more content
    
    while ((match = regex.exec(pdfContent)) !== null && count < maxIterations) {
      count++;
      
      let text = match[1];
      if (!text) continue;
      
      // Clean the text
      text = text
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, ' ')
        .replace(/\\t/g, ' ')
        .replace(/\\(.)/g, '$1') // Remove escape sequences
        .trim();
      
      // Skip if too short or too long
      if (text.length < 3 || text.length > 100) continue;
      
      // Skip obvious PDF metadata and technical junk
      const junkPatterns = [
        /^(Identity|Adobe|UCS|CMap|Type|Font|HiQPdf|PDF|Creator|Producer|BaseFont|Helvetica|Times|Arial|Courier|Symbol|ZapfDingbats)$/i,
        /^(obj|endobj|stream|endstream|xref|trailer|startxref)$/i,
        /^[\d\.\-\s\\/\\]+$/, // Numbers, dots, spaces only
        /^[A-F0-9]{6,}$/i, // Hex codes
        /^R$/i, // Single letter R (common in PDFs)
        /^(TJ|Tj|Td|TD|Tm|T\*)$/i, // PDF operators
        /^\d+\s+\d+\s+R$/i, // PDF references like "1 0 R"
      ];
      
      // Check if it's junk
      const isJunk = junkPatterns.some(pattern => pattern.test(text));
      if (isJunk) continue;
      
      // Must contain actual letters (not just numbers/symbols)
      if (!/[a-zA-Z]{2,}/.test(text)) continue;
      
      // Skip if it's mostly symbols or special characters
      const symbolCount = (text.match(/[^\w\s\.,;:!?\-()%\/]/g) || []).length;
      if (symbolCount > text.length * 0.4) continue;
      
      // Look for medical/lab content patterns
      const medicalKeywords = [
        /\b(patient|name|age|date|test|result|normal|abnormal|high|low|blood|urine|hemoglobin|glucose|cholesterol)\b/i,
        /\b\d+\.?\d*\s*(mg\/dl|mmol\/l|g\/dl|%|bpm|cm|kg|lbs|units?)\b/i,
        /\b(dr|doctor|physician|lab|laboratory|report|analysis|specimen|sample)\b/i,
        /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/, // Names like "John Doe"
        /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, // Dates
        /\b\d{1,2}:\d{2}\b/, // Times
      ];
      
      // Check if it looks like meaningful content
      const isMedical = medicalKeywords.some(pattern => pattern.test(text));
      const hasProperWords = /\b[A-Za-z]{3,}\b/.test(text); // Has words 3+ chars
      const isCapitalized = /^[A-Z]/.test(text); // Starts with capital
      const hasNumbers = /\d/.test(text);
      
      // Prioritize medical content, proper sentences, or meaningful data
      if (isMedical || (hasProperWords && (isCapitalized || hasNumbers))) {
        const lowerText = text.toLowerCase();
        if (!meaningfulTexts.has(lowerText)) {
          meaningfulTexts.add(lowerText);
          extractedText += text + ' ';
          
          // Log what we're extracting to help debug
          if (isMedical) {
            console.log(`✅ Medical content: "${text}"`);
          } else {
            console.log(`✅ Meaningful text: "${text}"`);
          }
        }
      }
    }
    
    console.log(`✅ Processed ${count} text items`);
    
    // Clean up extracted text
    extractedText = extractedText.replace(/\s+/g, ' ').trim();
    
    console.log(`📏 Extracted ${extractedText.length} characters`);
    
    if (extractedText.length > 20) {
      const preview = extractedText.substring(0, 200);
      console.log(`📋 Preview: "${preview}..."`);
      return extractedText;
    }
    
    // If very little text extracted
    console.log('⚠️ Minimal text extracted');
    
    return `📄 PDF Analysis Results:

🔍 Structure Found:
- Text Objects: ${hasTextObjects ? 'Yes' : 'No'}
- Font Information: ${hasFont ? 'Yes' : 'No'}
- Image Content: ${hasImages ? 'Yes' : 'No'}
- File Size: ${(uint8Array.length / 1024).toFixed(1)} KB

⚠️ Limited text extraction - this appears to be a scanned PDF.

💡 To extract text from this lab report:

1. **Google Drive Method** (Easiest):
   - Upload PDF to Google Drive
   - Google will automatically make it searchable
   - Copy text from the searchable version

2. **Adobe Acrobat**:
   - Open PDF in Adobe Acrobat
   - Use "Recognize Text" feature
   - Save as searchable PDF

3. **Online OCR Tools**:
   - smallpdf.com/ocr-pdf
   - pdf24.org/ocr-pdf
   - ilovepdf.com/ocr-pdf

4. **Mobile Apps**:
   - Adobe Scan
   - CamScanner
   - Microsoft Office Lens

5. **Manual Entry**:
   - If you can select text in a PDF viewer, copy and paste it directly

📝 Extracted content: "${extractedText}"`;
    
  } catch (error) {
    console.error('❌ PDF extraction error:', error.name, error.message);
    
    return `❌ Unable to process this PDF file.

Error: ${error.message}

This could mean:
- The file is password protected
- The file is corrupted
- The file is not a valid PDF

💡 Please try:
1. Opening the PDF in a PDF viewer to verify it works
2. If password protected, remove the password first
3. Copy and paste text directly if you can select it
4. Use OCR tools for scanned documents`;
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