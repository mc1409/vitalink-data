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
    console.log('🔍 Starting PDF text extraction...');
    console.log(`📄 PDF size: ${uint8Array.length} bytes`);
    
    // Convert to text for analysis
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const pdfContent = textDecoder.decode(uint8Array);
    
    // Analyze PDF structure
    console.log('🔍 Analyzing PDF structure...');
    const hasTextObjects = pdfContent.includes('BT') && pdfContent.includes('ET');
    const hasStreams = pdfContent.includes('stream') && pdfContent.includes('endstream');
    const hasImages = pdfContent.includes('/Image') || pdfContent.includes('/XObject');
    const hasFont = pdfContent.includes('/Font');
    const hasFlateFilter = pdfContent.includes('/FlateDecode');
    
    console.log(`📊 PDF Structure Analysis:
    - Text objects (BT/ET): ${hasTextObjects}
    - Content streams: ${hasStreams}
    - Images: ${hasImages}
    - Fonts: ${hasFont}
    - Compressed content: ${hasFlateFilter}
    - Content length: ${pdfContent.length} chars`);
    
    let extractedText = '';
    let extractionMethod = 'Parentheses Pattern';
    
    try {
      // Method 1: Extract text from parentheses with smart filtering
      console.log('🎯 Method 1: Smart text extraction from parentheses...');
      const parenthesesRegex = /\(([^)]+)\)/g;
      let match;
      const seenTexts = new Set();
      let parenthesesCount = 0;
      
      // Define patterns for medical/lab content vs PDF metadata
      const medicalPatterns = [
        /\b(hemoglobin|glucose|cholesterol|blood|urine|test|result|normal|abnormal|high|low|mg\/dl|mmol\/l)\b/i,
        /\b\d+\.?\d*\s*(mg\/dl|mmol\/l|g\/dl|%|bpm|cm|kg|lbs)\b/i,
        /\b(patient|name|age|date|doctor|lab|report|analysis)\b/i,
        /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/, // Names like "John Doe"
        /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, // Dates
        /\b\d+:\d+\b/, // Times
      ];
      
      const metadataPatterns = [
        /^(Identity|Adobe|UCS|CMap|Type|Font|Encoding|BaseFont|Times|Helvetica|Arial|Courier)$/i,
        /^(HiQPdf|PDF|Creator|Producer|Version|Acrobat)$/i,
        /^[\d\.\-\s\\/\\]+$/,
        /^[A-F0-9]{8,}$/i, // Hex strings
        /^(obj|endobj|stream|endstream|xref|trailer)$/i,
      ];
      
      while ((match = parenthesesRegex.exec(pdfContent)) !== null) {
        try {
          parenthesesCount++;
          let text = match[1];
          
          if (!text || typeof text !== 'string') continue;
          
          // Clean escape sequences safely
          text = text
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/\\t/g, ' ')
            .replace(/\\(.)/g, '$1')
            .trim();
          
          if (!text) continue;
          
          // Skip if it matches metadata patterns
          const isMetadata = metadataPatterns.some(pattern => {
            try {
              return pattern.test(text);
            } catch (e) {
              console.warn('Pattern test error:', e);
              return false;
            }
          });
          
          if (isMetadata) continue;
          
          // Check if it's meaningful content
          const isMedical = medicalPatterns.some(pattern => {
            try {
              return pattern.test(text);
            } catch (e) {
              console.warn('Medical pattern test error:', e);
              return false;
            }
          });
          
          const hasLetters = /[a-zA-Z]/.test(text);
          const hasNumbers = /\d/.test(text);
          const isReasonableLength = text.length >= 2 && text.length <= 100;
          const symbolCount = (text.match(/[^\w\s\.,;:!?\-()%\/]/g) || []).length;
          const notTooManySymbols = symbolCount < text.length * 0.3;
          
          if (isReasonableLength && hasLetters && notTooManySymbols && !seenTexts.has(text.toLowerCase())) {
            // Prioritize medical content or well-formed text
            if (isMedical || (hasNumbers && hasLetters) || /^[A-Z][a-z]/.test(text)) {
              seenTexts.add(text.toLowerCase());
              extractedText += text + ' ';
              console.log(`✅ Extracted: "${text}"`);
            }
          }
        } catch (matchError) {
          console.warn('Error processing match:', matchError);
          continue;
        }
      }
      
      console.log(`📝 Processed ${parenthesesCount} parentheses patterns, extracted ${extractedText.length} chars`);
      
    } catch (method1Error) {
      console.error('Method 1 failed:', method1Error);
      extractedText = '';
    }
    
    // Method 2: Enhanced text object extraction if Method 1 insufficient
    if (extractedText.trim().length < 100 && hasTextObjects) {
      console.log('🔄 Method 2: Text objects extraction...');
      extractionMethod = 'Text Objects';
      
      // More comprehensive patterns for text extraction
      const textPatterns = [
        /\(([^)]+)\)\s*Tj/g,                    // Simple text show
        /\[([^\]]*)\]\s*TJ/g,                   // Array text show
        /\(([^)]+)\)\s*[\d\s\.-]*\s*Td/g,      // Text with positioning
        /\(([^)]+)\)\s*[\d\s\.-]*\s*[Tt][jJdDmM]/g, // Text with operators
      ];
      
      for (const pattern of textPatterns) {
        let textMatch;
        while ((textMatch = pattern.exec(pdfContent)) !== null) {
          let text = textMatch[1];
          
          // Clean and validate
          text = text
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\(.)/g, '$1');
          
          if (text.length > 2 && 
              !/^[\d\.\-\s\\/\\]+$/.test(text) && 
              !/^(Identity|Adobe|UCS|CMap)$/i.test(text) &&
              /[a-zA-Z]/.test(text) &&
              !seenTexts.has(text.toLowerCase())) {
            
            seenTexts.add(text.toLowerCase());
            extractedText += text + ' ';
          }
        }
      }
    }
    
    // Method 3: Stream content analysis for complex PDFs
    if (extractedText.trim().length < 50 && hasStreams) {
      console.log('🔄 Method 3: Stream content extraction...');
      extractionMethod = 'Stream Content';
      
      const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
      let streamMatch;
      let streamCount = 0;
      
      while ((streamMatch = streamRegex.exec(pdfContent)) !== null) {
        streamCount++;
        const streamContent = streamMatch[1];
        
        // Look for readable text patterns in streams
        const readablePatterns = [
          /\b[A-Z][a-z]+(?:\s+[A-Za-z]+){2,}\b/g,    // Names and phrases
          /\b\d+(?:\.\d+)?\s*[a-zA-Z]+\/[a-zA-Z]+\b/g, // Units like mg/dL
          /\b[A-Za-z]{4,}(?:\s+[A-Za-z]{3,})*\b/g,     // Longer words
        ];
        
        for (const pattern of readablePatterns) {
          const matches = streamContent.match(pattern) || [];
          for (const match of matches.slice(0, 10)) { // Limit to prevent noise
            if (match.length > 5 && match.length < 100 && 
                !/^(Identity|Adobe|UCS|CMap|Type|Font)$/i.test(match) &&
                !seenTexts.has(match.toLowerCase())) {
              
              seenTexts.add(match.toLowerCase());
              extractedText += match + ' ';
            }
          }
        }
      }
      console.log(`📄 Processed ${streamCount} streams`);
    }
    
    // Clean up the final text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n\r\t\u00A0-\u024F\u1E00-\u1EFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`🎯 Final extraction results:`);
    console.log(`📏 Text length: ${extractedText.length} characters`);
    
    if (extractedText.length > 10) {
      console.log(`📋 Sample: "${extractedText.substring(0, 200)}..."`);
      return extractedText;
    }
    
    // If extraction yielded minimal results, provide diagnostic info
    const diagnosis = [];
    if (!hasTextObjects) diagnosis.push("No text objects found");
    if (hasImages && !hasFont) diagnosis.push("Image-based content");
    if (!hasStreams) diagnosis.push("No content streams");
    if (hasFlateFilter) diagnosis.push("Compressed content detected");
    
    return `📄 PDF Analysis Complete - Limited text extraction possible.

🔍 PDF Diagnostic Report:
- Text Objects: ${hasTextObjects ? '✅ Present' : '❌ Missing'}
- Content Streams: ${hasStreams ? '✅ Present' : '❌ Missing'}  
- Images: ${hasImages ? '✅ Detected' : '❌ None'}
- Fonts: ${hasFont ? '✅ Present' : '❌ Missing'}
- Compression: ${hasFlateFilter ? '✅ Detected' : '❌ None'}
- File size: ${(uint8Array.length / 1024).toFixed(1)} KB

🎯 Assessment: ${diagnosis.join(', ') || 'Complex PDF structure'}

💡 This appears to be a scanned or image-based PDF requiring OCR.

🔧 Recommended Solutions:
1. **OCR Conversion**: Use Adobe Acrobat, Google Drive, or online OCR tools
2. **Manual Entry**: Copy and paste text if selectable in a PDF viewer
3. **Mobile OCR**: Use smartphone apps to scan and convert text
4. **Re-scan**: Create a new PDF with OCR enabled during scanning
5. **Online Tools**: Try smallpdf.com, PDF24, or similar OCR services

📝 Extracted content: "${extractedText}"`;
    
  } catch (error) {
    console.error('💥 PDF extraction error:', error);
    console.error('💥 Error details:', error.message);
    console.error('💥 Error stack:', error.stack);
    
    return `❌ PDF processing failed: ${error.message}

🔧 This could indicate:
- Password protection 🔒
- Corrupted file structure 💔
- Unsupported PDF version 📄
- Complex compression/encoding 🗜️

💡 Solutions:
1. Try copying and pasting text directly from a PDF viewer
2. Use OCR tools to convert the PDF to searchable text
3. Save the PDF as a different format and try again`;
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