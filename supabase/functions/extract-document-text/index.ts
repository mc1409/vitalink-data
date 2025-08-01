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
    console.error('Error in extract-document-text function:', error);
    
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
    console.log('Starting PDF text extraction...');
    
    // Convert to text using a more reliable method
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const pdfContent = textDecoder.decode(uint8Array);
    
    // Analyze PDF structure first
    console.log('Analyzing PDF structure...');
    const hasTextObjects = pdfContent.includes('BT') && pdfContent.includes('ET');
    const hasStreams = pdfContent.includes('stream') && pdfContent.includes('endstream');
    const hasImages = pdfContent.includes('/Image') || pdfContent.includes('/XObject');
    const hasFont = pdfContent.includes('/Font');
    
    console.log(`PDF Analysis:
    - Has text objects (BT/ET): ${hasTextObjects}
    - Has streams: ${hasStreams}
    - Has images: ${hasImages}
    - Has fonts: ${hasFont}
    - Total content length: ${pdfContent.length} characters`);
    
    // Extract text content from PDF structure
    let extractedText = '';
    let extractionMethod = '';
    
    // Method 1: Extract text from PDF text objects
    if (hasTextObjects) {
      console.log('Trying Method 1: Text objects extraction...');
      extractionMethod = 'Text Objects';
      
      const textObjectRegex = /BT\s+(.*?)\s+ET/gs;
      const textObjects = pdfContent.match(textObjectRegex) || [];
      console.log(`Found ${textObjects.length} text objects`);
      
      for (const textObj of textObjects) {
        // Extract text from Tj and TJ operators
        const tjRegex = /\((.*?)\)\s*Tj/g;
        const arrayRegex = /\[(.*?)\]\s*TJ/g;
        
        let match;
        let tjCount = 0;
        while ((match = tjRegex.exec(textObj)) !== null) {
          tjCount++;
          const text = match[1].replace(/\\[rn]/g, ' ').replace(/\\\\/g, '\\');
          if (text.length > 1 && !/^[\d\.\-\s]+$/.test(text)) {
            extractedText += text + ' ';
          }
        }
        
        let tjArrayCount = 0;
        while ((match = arrayRegex.exec(textObj)) !== null) {
          tjArrayCount++;
          const arrayContent = match[1];
          const stringRegex = /\((.*?)\)/g;
          let stringMatch;
          while ((stringMatch = stringRegex.exec(arrayContent)) !== null) {
            const text = stringMatch[1].replace(/\\[rn]/g, ' ').replace(/\\\\/g, '\\');
            if (text.length > 1 && !/^[\d\.\-\s]+$/.test(text)) {
              extractedText += text + ' ';
            }
          }
        }
        
        if (tjCount > 0 || tjArrayCount > 0) {
          console.log(`Text object had ${tjCount} Tj operators and ${tjArrayCount} TJ arrays`);
        }
      }
    }
    
    // Method 2: If not enough text found, try broader extraction
    if (extractedText.trim().length < 100) {
      console.log('Method 1 insufficient, trying Method 2: Parentheses extraction...');
      extractionMethod = 'Parentheses Pattern';
      
      // Extract text from parentheses (common PDF text storage)
      const parenthesesRegex = /\(([^)]*)\)/g;
      let match;
      let parenthesesCount = 0;
      while ((match = parenthesesRegex.exec(pdfContent)) !== null) {
        parenthesesCount++;
        const text = match[1];
        if (text && text.length > 2 && !/^[\d\.\-\s\\/\\]+$/.test(text) && !text.includes('\\')) {
          // Filter out likely non-text content
          if (/^[A-Za-z0-9\s\.,;:!?\-()%\/]+$/.test(text)) {
            extractedText += text + ' ';
          }
        }
      }
      console.log(`Found ${parenthesesCount} parentheses patterns`);
    }
    
    // Method 3: Extract from stream objects if still not enough
    if (extractedText.trim().length < 50) {
      console.log('Methods 1-2 insufficient, trying Method 3: Stream extraction...');
      extractionMethod = 'Stream Content';
      
      const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
      let streamMatch;
      let streamCount = 0;
      while ((streamMatch = streamRegex.exec(pdfContent)) !== null) {
        streamCount++;
        const streamContent = streamMatch[1];
        
        // Look for readable text patterns in streams
        const readableTextRegex = /[A-Za-z][A-Za-z0-9\s\.,;:!?\-]{5,}/g;
        const textMatches = streamContent.match(readableTextRegex) || [];
        
        for (const textMatch of textMatches.slice(0, 20)) { // Limit to prevent noise
          if (textMatch.length > 5 && textMatch.length < 100) {
            extractedText += textMatch + ' ';
          }
        }
      }
      console.log(`Processed ${streamCount} streams`);
    }
    
    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`Extraction completed using ${extractionMethod}. Final text length: ${extractedText.length} characters`);
    
    if (extractedText.length > 0) {
      console.log(`Sample extracted text: "${extractedText.substring(0, 200)}..."`);
    }
    
    if (extractedText.length < 10) {
      const diagnosis = [];
      if (!hasTextObjects) diagnosis.push("No text objects found");
      if (hasImages && !hasFont) diagnosis.push("Contains images but no fonts");
      if (!hasStreams) diagnosis.push("No content streams");
      
      return `PDF Analysis Complete - This appears to be a scanned/image-based PDF.

📊 PDF Structure Analysis:
- Text Objects: ${hasTextObjects ? '✅ Found' : '❌ None'}
- Content Streams: ${hasStreams ? '✅ Found' : '❌ None'}
- Images: ${hasImages ? '✅ Detected' : '❌ None'}
- Fonts: ${hasFont ? '✅ Found' : '❌ None'}
- File size: ${(uint8Array.length / 1024).toFixed(1)} KB

💡 Diagnosis: ${diagnosis.join(', ') || 'Complex PDF structure'}

🔧 Solutions:
1. This is likely a scanned lab report - needs OCR (Optical Character Recognition)
2. Try converting to text format using Adobe Acrobat or similar tool
3. Copy and paste text directly from the PDF if selectable
4. Use an online OCR service to convert the images to text
5. Re-scan the document with OCR enabled

📋 Minimal extracted content: "${extractedText}"`;
    }
    
    return extractedText;
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    return `PDF processing encountered an error: ${error.message}. 

This indicates the PDF may have:
- Password protection
- Corrupted structure  
- Non-standard encoding
- Complex compression

Please try copying and pasting the text content directly.`;
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