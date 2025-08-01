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
    console.log('📄 Starting PDF text extraction...');
    console.log(`📄 PDF size: ${uint8Array.length} bytes`);
    
    // Try basic text extraction first
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const pdfContent = textDecoder.decode(uint8Array);
    
    // Extract text using simple pattern matching
    const textMatches = [];
    
    // Pattern 1: Text in parentheses (common in PDF text objects)
    const parenthesesRegex = /\(([^)]+)\)/g;
    let match;
    const seenTexts = new Set();
    
    while ((match = parenthesesRegex.exec(pdfContent)) !== null) {
      let text = match[1];
      
      // Clean up the text
      text = text.replace(/\\[nrt]/g, ' ').trim();
      
      // Skip very short or very long strings
      if (text.length < 3 || text.length > 100) continue;
      
      // Skip obvious metadata
      if (/^(Identity|Adobe|UCS|HiQPdf|PDF|CMap|Type|Font|Resource)$/i.test(text)) continue;
      if (/^[\d\.\-\s]+$/.test(text) && text.length < 8) continue;
      
      // Only include text with letters
      if (/[a-zA-Z]{2,}/.test(text) && !seenTexts.has(text.toLowerCase())) {
        seenTexts.add(text.toLowerCase());
        textMatches.push(text);
      }
    }
    
    // Pattern 2: Look for BT/ET blocks (text blocks in PDF)
    const btEtRegex = /BT\s+.*?ET/gs;
    const btEtMatches = pdfContent.match(btEtRegex) || [];
    
    for (const block of btEtMatches) {
      const blockParenthesesRegex = /\(([^)]+)\)/g;
      let blockMatch;
      
      while ((blockMatch = blockParenthesesRegex.exec(block)) !== null) {
        let text = blockMatch[1];
        text = text.replace(/\\[nrt]/g, ' ').trim();
        
        if (text.length >= 3 && text.length <= 100 && 
            /[a-zA-Z]{2,}/.test(text) && 
            !seenTexts.has(text.toLowerCase())) {
          seenTexts.add(text.toLowerCase());
          textMatches.push(text);
        }
      }
    }
    
    // Pattern 3: Look for Tj and TJ operators (text showing operators)
    const tjRegex = /\(([^)]+)\)\s*[Tt][jJ]/g;
    while ((match = tjRegex.exec(pdfContent)) !== null) {
      let text = match[1];
      text = text.replace(/\\[nrt]/g, ' ').trim();
      
      if (text.length >= 3 && text.length <= 100 && 
          /[a-zA-Z]{2,}/.test(text) && 
          !seenTexts.has(text.toLowerCase())) {
        seenTexts.add(text.toLowerCase());
        textMatches.push(text);
      }
    }
    
    let extractedText = textMatches.join(' ');
    extractedText = extractedText.replace(/\s+/g, ' ').trim();
    
    if (extractedText.length > 50) {
      console.log(`✅ Successfully extracted ${extractedText.length} characters from PDF`);
      console.log(`📋 Sample extracted text: "${extractedText.substring(0, 200)}..."`);
      return extractedText;
    }
    
    // If we got minimal text, provide helpful guidance
    return `📄 PDF Text Extraction Complete

⚠️ Limited text could be extracted from this PDF (${extractedText.length} characters).

This could mean:
- The PDF is scanned/image-based and requires OCR
- The document uses complex formatting or embedded fonts
- The PDF may be password-protected or corrupted
- The file contains mostly images/graphics

📝 Extracted content: "${extractedText}"

🔧 Recommendations:
1. **Try manual copy-paste**: If you can select text in a PDF viewer, copy and paste it directly
2. **Use OCR tools**: For scanned documents, try:
   - Adobe Acrobat Pro (OCR feature)
   - Google Drive (upload PDF, it will OCR automatically)
   - Online OCR services like SmallPDF or PDFCandy
3. **Re-scan with better quality**: If it's a scanned document, try higher resolution
4. **Check file format**: Ensure the PDF opens properly in other applications

💡 For best results with medical/lab reports, OCR tools specifically designed for document processing work best.`;
    
  } catch (error) {
    console.error('💥 PDF extraction error:', error);
    console.error('💥 Error details:', error.message);
    
    return `❌ PDF extraction failed: ${error.message}

🔧 This PDF appears to be:
- Corrupted or password protected
- Using unsupported encoding
- Too complex for basic text extraction

💡 Please try:
1. Copy and paste text directly from a PDF viewer
2. Use OCR tools: Adobe Acrobat, Google Drive, smallpdf.com
3. Convert to a different format and try again`;
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