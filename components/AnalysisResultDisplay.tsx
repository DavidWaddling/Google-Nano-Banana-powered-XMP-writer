import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import CopyButton from './CopyButton';
import { createXmpSidecar } from '../utils/fileUtils';

interface AnalysisResultDisplayProps {
  result: AnalysisResult;
  imageFile: File;
}

const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const ResultCard: React.FC<{ title: string; children: React.ReactNode; textToCopy: string }> = ({ title, children, textToCopy }) => (
  <div className="bg-gray-800 rounded-lg shadow-lg p-6 relative">
    <div className="absolute top-4 right-4">
      <CopyButton textToCopy={textToCopy} />
    </div>
    <h3 className="text-xl font-semibold text-purple-400 mb-3">{title}</h3>
    {children}
  </div>
);

const AnalysisResultDisplay: React.FC<AnalysisResultDisplayProps> = ({ result, imageFile }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const tagsString = result.tags.join(', ');

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
        await createXmpSidecar(imageFile, result);
    } catch (error) {
        console.error("Failed to create or download XMP file:", error);
    } finally {
        setIsDownloading(false);
    }
  };


  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Analysis Complete</h2>
      
      <ResultCard title="Generated Title" textToCopy={result.title}>
        <p className="text-gray-200 text-lg">{result.title}</p>
      </ResultCard>

      <ResultCard title="Generated Description" textToCopy={result.description}>
        <p className="text-gray-200 leading-relaxed">{result.description}</p>
      </ResultCard>

      <ResultCard title="Generated Meta Tags" textToCopy={tagsString}>
        <div className="flex flex-wrap gap-2">
          {result.tags.map((tag, index) => (
            <span key={index} className="bg-gray-700 text-purple-300 text-sm font-medium px-3 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </ResultCard>

      <div className="pt-4 text-center">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="px-8 py-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all shadow-lg transform hover:scale-105 flex items-center justify-center gap-3 w-full max-w-md mx-auto"
        >
          {isDownloading ? (
            <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                <span>Generating XMP...</span>
            </>
          ) : (
            <>
                <DownloadIcon className="w-6 h-6" />
                <span>Download Metadata (.xmp)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AnalysisResultDisplay;