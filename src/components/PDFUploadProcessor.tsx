import React from 'react';
import { SimplePDFUploader } from './SimplePDFUploader';

// This component now uses the new simplified PDF upload approach
const PDFUploadProcessor: React.FC = () => {
  return (
    <SimplePDFUploader 
      enableDatabaseSave={true}
      onTextExtracted={(text, filename) => {
        console.log(`Extracted ${text.length} characters from ${filename}`);
      }}
    />
  );
};

export default PDFUploadProcessor;