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
    console.log('🔍 Starting advanced PDF text extraction...');
    
    // Try PDF-Parse library first for proper PDF parsing - with proper error handling
    let pdfParseText = '';
    try {
      console.log('📚 Attempting to import pdf-parse library...');
      const pdfParse = await import('https://esm.sh/pdf-parse@1.1.1');
      console.log('✅ pdf-parse imported successfully');
      
      console.log('🔄 Running pdf-parse on document...');
      const data = await pdfParse.default(uint8Array);
      console.log(`📄 PDF Info: ${data.numpages} pages, Title: ${data.info?.Title || 'No title'}`);
      
      if (data.text && data.text.trim().length > 50) {
        console.log(`✅ Successfully extracted ${data.text.length} characters using pdf-parse`);
        console.log(`📝 Sample: "${data.text.substring(0, 200)}..."`);
        return data.text;
      } else {
        console.log('⚠️ pdf-parse extracted minimal text, trying fallback methods...');
        pdfParseText = data.text || '';
      }
    } catch (pdfParseError) {
      console.error('❌ pdf-parse failed with error:', pdfParseError);
      console.log('🔄 Falling back to manual extraction...');
    }

    // Fallback to manual extraction
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const pdfContent = textDecoder.decode(uint8Array);
    
    console.log('🔍 Analyzing PDF structure...');
    const hasTextObjects = pdfContent.includes('BT') && pdfContent.includes('ET');
    const hasStreams = pdfContent.includes('stream') && pdfContent.includes('endstream');
    const hasImages = pdfContent.includes('/Image') || pdfContent.includes('/XObject');
    const hasFont = pdfContent.includes('/Font');
    
    console.log(`📊 PDF Analysis:
    - Text objects (BT/ET): ${hasTextObjects}
    - Content streams: ${hasStreams}
    - Images detected: ${hasImages}
    - Fonts present: ${hasFont}
    - Content length: ${pdfContent.length} chars`);
    
    let extractedText = '';
    let extractionMethod = '';
    
    // Method 1: Extract from PDF text objects using improved regex
    if (hasTextObjects) {
      console.log('🎯 Method 1: Enhanced text objects extraction...');
      extractionMethod = 'Enhanced Text Objects';
      
      // More comprehensive text extraction patterns
      const patterns = [
        // Standard text showing operators
        /\(([^)]+)\)\s*Tj/g,
        /\[([^\]]*)\]\s*TJ/g,
        // Text positioning with content
        /\(([^)]+)\)\s*[\d\s\.-]*\s*Td/g,
        // Text with spacing adjustments
        /\(([^)]+)\)\s*[\d\s\.-]*\s*[Tt][jJdDmM]/g,
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(pdfContent)) !== null) {
          let text = match[1];
          
          // Clean up escape sequences
          text = text
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\(.)/g, '$1'); // Remove other escape sequences
          
          // Filter out likely metadata or positioning info
          if (text.length > 2 && 
              !/^[\d\.\-\s\\/\\]+$/.test(text) && 
              !/^(Identity|Adobe|UCS|CMap)$/i.test(text) &&
              /[a-zA-Z]/.test(text)) {
            extractedText += text + ' ';
          }
        }
      }
      
      // Also extract from array format text
      const arrayTextRegex = /\[\s*(\([^)]+\)(?:\s*[\d\.-]+\s*\([^)]+\))*)\s*\]\s*TJ/g;
      let arrayMatch;
      while ((arrayMatch = arrayTextRegex.exec(pdfContent)) !== null) {
        const arrayContent = arrayMatch[1];
        const stringRegex = /\(([^)]+)\)/g;
        let stringMatch;
        while ((stringMatch = stringRegex.exec(arrayContent)) !== null) {
          let text = stringMatch[1];
          if (text.length > 1 && /[a-zA-Z]/.test(text) && 
              !/^(Identity|Adobe|UCS|CMap)$/i.test(text)) {
            extractedText += text + ' ';
          }
        }
      }
    }
    
    // Method 2: Stream content extraction with better filtering
    if (extractedText.trim().length < 100 && hasStreams) {
      console.log('🔄 Method 2: Enhanced stream content extraction...');
      extractionMethod = 'Enhanced Stream Content';
      
      const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
      let streamMatch;
      while ((streamMatch = streamRegex.exec(pdfContent)) !== null) {
        const streamContent = streamMatch[1];
        
        // Look for readable text patterns
        const readablePatterns = [
          /[A-Za-z]{3,}[\w\s\.,;:!?\-()%\/]{10,}/g,
          /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
          /\b\d+(?:\.\d+)?\s*[a-zA-Z]+\/[a-zA-Z]+\b/g, // Units like mg/dL
        ];
        
        for (const pattern of readablePatterns) {
          const matches = streamContent.match(pattern) || [];
          for (const match of matches.slice(0, 10)) { // Limit to prevent noise
            if (match.length > 5 && match.length < 200 && 
                !/^(Identity|Adobe|UCS|CMap|Type|Font)$/i.test(match)) {
              extractedText += match + ' ';
            }
          }
        }
      }
    }
    
    // Method 3: Generic parentheses extraction with better filtering
    if (extractedText.trim().length < 50) {
      console.log('🔄 Method 3: Filtered parentheses extraction...');
      extractionMethod = 'Filtered Parentheses';
      
      const parenthesesRegex = /\(([^)]{2,})\)/g;
      let match;
      const seenTexts = new Set(); // Avoid duplicates
      
      while ((match = parenthesesRegex.exec(pdfContent)) !== null) {
        let text = match[1];
        
        // Skip common PDF metadata
        if (/^(Identity|Adobe|UCS|CMap|Type|Font|Encoding|BaseFont)$/i.test(text)) {
          continue;
        }
        
        // Clean and validate text
        text = text.replace(/\\[rn]/g, ' ').replace(/\\\\/g, '\\');
        
        if (text.length > 3 && 
            text.length < 150 && 
            /[a-zA-Z]/.test(text) && 
            !/^[\d\.\-\s\\/\\]+$/.test(text) &&
            !seenTexts.has(text.toLowerCase())) {
          
          seenTexts.add(text.toLowerCase());
          extractedText += text + ' ';
        }
      }
    }
    
    // Clean up the final text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n\r\t\u00A0-\u024F\u1E00-\u1EFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`🎯 Extraction completed using ${extractionMethod}`);
    console.log(`📏 Final text length: ${extractedText.length} characters`);
    
    if (extractedText.length > 10) {
      console.log(`📋 Sample extracted text: "${extractedText.substring(0, 300)}..."`);
      return extractedText;
    }
    
    // If still minimal extraction, provide detailed analysis
    const diagnosis = [];
    if (!hasTextObjects) diagnosis.push("No text objects found");
    if (hasImages && !hasFont) diagnosis.push("Image-based content without fonts");
    if (!hasStreams) diagnosis.push("No content streams");
    
    return `📄 PDF Analysis Complete - Advanced extraction attempted but yielded minimal text.

🔍 PDF Structure Analysis:
- Text Objects: ${hasTextObjects ? '✅ Present' : '❌ Missing'}
- Content Streams: ${hasStreams ? '✅ Present' : '❌ Missing'}  
- Images: ${hasImages ? '✅ Detected' : '❌ None'}
- Fonts: ${hasFont ? '✅ Present' : '❌ Missing'}
- File size: ${(uint8Array.length / 1024).toFixed(1)} KB

🎯 Diagnosis: ${diagnosis.join(', ') || 'Complex PDF structure'}

💡 This appears to be a scanned/image-based PDF that requires OCR processing.

🔧 Recommended Solutions:
1. Use OCR software (Adobe Acrobat, Google Drive, etc.) to convert to searchable PDF
2. Copy and paste text directly if it's selectable in a PDF viewer  
3. Use online OCR services like Google Drive or smallpdf.com
4. Re-scan the document with OCR enabled
5. Use mobile OCR apps to capture and convert the content

📝 Extracted content: "${extractedText}"`;
    
  } catch (error) {
    console.error('💥 PDF extraction error:', error);
    return `❌ PDF processing failed: ${error.message}

This could indicate:
- Password protection 🔒
- Corrupted file structure 💔
- Unsupported PDF version 📄
- Complex compression/encoding 🗜️

Please try copying and pasting the text content directly, or use OCR tools to convert the PDF to text.`;
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