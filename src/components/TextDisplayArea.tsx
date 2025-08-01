import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, FileText, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface TextDisplayAreaProps {
  text: string;
  filename?: string;
  pageCount?: number;
  metadata?: {
    title?: string;
    author?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
  };
  isError?: boolean;
  onSaveToDatabase?: () => void;
  isSaving?: boolean;
}

export const TextDisplayArea: React.FC<TextDisplayAreaProps> = ({
  text,
  filename,
  pageCount,
  metadata,
  isError = false,
  onSaveToDatabase,
  isSaving = false
}) => {
  const { toast } = useToast();

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Text copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy text to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownloadText = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename?.replace('.pdf', '') || 'extracted-text'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "Text file saved to your downloads",
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      // PDF dates are in format: D:YYYYMMDDHHmmSSOHH'mm'
      const cleanDate = dateString.replace(/^D:/, '').substring(0, 14);
      const year = cleanDate.substring(0, 4);
      const month = cleanDate.substring(4, 6);
      const day = cleanDate.substring(6, 8);
      return `${year}-${month}-${day}`;
    } catch {
      return dateString;
    }
  };

  if (!text && !isError) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {isError ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <FileText className="h-5 w-5 text-primary" />
              )}
              {isError ? 'Extraction Error' : 'Extracted Text'}
            </CardTitle>
            <CardDescription>
              {isError ? (
                'Failed to extract text from the PDF'
              ) : (
                <>
                  {filename && <span className="font-medium">{filename}</span>}
                  {pageCount && <span className="ml-2">• {pageCount} pages</span>}
                  {text && <span className="ml-2">• {text.length.toLocaleString()} characters</span>}
                </>
              )}
            </CardDescription>
          </div>
          
          {!isError && text && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyText}
                className="h-8"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadText}
                className="h-8"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              {onSaveToDatabase && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onSaveToDatabase}
                  disabled={isSaving}
                  className="h-8"
                >
                  {isSaving ? 'Saving...' : 'Save to Database'}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Metadata display */}
        {!isError && metadata && Object.values(metadata).some(Boolean) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {metadata.title && (
              <Badge variant="secondary" className="text-xs">
                Title: {metadata.title}
              </Badge>
            )}
            {metadata.author && (
              <Badge variant="secondary" className="text-xs">
                Author: {metadata.author}
              </Badge>
            )}
            {metadata.creationDate && (
              <Badge variant="secondary" className="text-xs">
                Created: {formatDate(metadata.creationDate)}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Textarea
          value={text}
          readOnly
          className={`min-h-[400px] font-mono text-sm resize-none ${
            isError ? 'text-destructive bg-destructive/5' : ''
          }`}
          placeholder={isError ? 'Error details will appear here...' : 'Extracted text will appear here...'}
        />
      </CardContent>
    </Card>
  );
};