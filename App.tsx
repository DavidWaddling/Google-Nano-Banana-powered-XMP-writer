import React, { useState } from 'react';
import { AnalysisResult } from './types';
import { fileToGenerativePart, createXmpSidecar } from './utils/fileUtils';
import { analyzeImage } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import Spinner from './components/Spinner';
import AnalysisResultDisplay from './components/AnalysisResultDisplay';
import { GEMINI_API_KEY } from './services/apiKey';

const GithubIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" {...props}>
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"></path>
    </svg>
);

const XMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_FILES = 5;

interface FileState {
  id: string;
  file: File;
  imageUrl: string;
  result: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
}

const App: React.FC = () => {
  const [files, setFiles] = useState<FileState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<string>('');

  const isApiKeySet = GEMINI_API_KEY !== "[Put your Google Gemini API key Here]";

  const handleImageSelect = (selectedFiles: FileList) => {
    setError(null);
    const newFiles: File[] = Array.from(selectedFiles);
    
    const acceptedFiles: FileState[] = [];
    const validationErrors: string[] = [];

    newFiles.forEach(file => {
      if (files.some(f => f.file.name === file.name && f.file.size === file.size)) {
        return; // Skip duplicates
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        validationErrors.push(`${file.name}: File is too large (max ${MAX_FILE_SIZE_MB}MB)`);
        return;
      }
      if (file.type !== 'image/jpeg') {
        validationErrors.push(`${file.name}: Invalid file type (must be JPG)`);
        return;
      }
      acceptedFiles.push({
        id: `${file.name}-${file.size}`,
        file,
        imageUrl: URL.createObjectURL(file),
        result: null,
        isLoading: false,
        error: null,
      });
    });
    
    setFiles(prevFiles => {
      const combined = [...prevFiles, ...acceptedFiles];
      if (combined.length > MAX_FILES) {
        validationErrors.push(`You can only upload ${MAX_FILES} files. ${combined.length - MAX_FILES} additional files were discarded.`);
        if (validationErrors.length > 0) {
            setError(validationErrors.join('\n'));
        }
        return combined.slice(0, MAX_FILES);
      }
      if (validationErrors.length > 0) {
        setError(validationErrors.join('\n'));
      }
      return combined;
    });
  };

  const handleAnalyze = async () => {
    setFiles(currentFiles => 
        currentFiles.map(f => (f.result ? f : { ...f, isLoading: true, error: null }))
    );

    const filesToAnalyze = files.filter(f => !f.result);

    const analysisPromises = filesToAnalyze.map(async (fileState) => {
        try {
            const imagePart = await fileToGenerativePart(fileState.file);
            const result = await analyzeImage(imagePart, location);
            const finalResult: AnalysisResult = { ...result, location: location || undefined };
            setFiles(currentFiles => 
                currentFiles.map(f => f.id === fileState.id ? { ...f, result: finalResult, isLoading: false } : f)
            );
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during analysis.";
            setFiles(currentFiles => 
                currentFiles.map(f => f.id === fileState.id ? { ...f, error: errorMessage, isLoading: false } : f)
            );
        }
    });

    await Promise.all(analysisPromises);
  };

  const handleReset = () => {
    files.forEach(f => URL.revokeObjectURL(f.imageUrl));
    setFiles([]);
    setError(null);
    setLocation('');
  };
  
  const handleRemoveFile = (idToRemove: string) => {
    setFiles(currentFiles => {
        const fileToRemove = currentFiles.find(f => f.id === idToRemove);
        if (fileToRemove) {
            URL.revokeObjectURL(fileToRemove.imageUrl);
        }
        return currentFiles.filter(f => f.id !== idToRemove);
    });
  };

  const handleDownloadAll = async () => {
    const filesWithResults = files.filter(f => f.result);
    for (const fileState of filesWithResults) {
        if (fileState.result) {
            await createXmpSidecar(fileState.file, fileState.result);
        }
    }
  };

  const filesToAnalyzeCount = files.filter(f => !f.result && !f.isLoading && !f.error).length;
  const analyzedCount = files.filter(f => f.result).length;
  const isAnalyzing = files.some(f => f.isLoading);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-5xl">
        <header className="text-center mb-10">
            <div className="flex justify-center items-center gap-4 mb-4">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                    Dave's Multi file Meta Tagger with Location
                </h1>
                <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                    <GithubIcon className="w-8 h-8" />
                </a>
            </div>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Upload up to 5 jpg files (max 2 MB each) to let Gemini generate a fitting title, a rich description, and SEO-friendly meta tags.
            </p>
        </header>

        {!isApiKeySet && (
            <div className="w-full max-w-3xl mx-auto mb-8 p-4 bg-yellow-900/50 border border-yellow-600 rounded-lg text-yellow-200 text-center animate-fade-in">
                <h2 className="text-xl font-bold mb-2">Configuration Needed</h2>
                <p>To enable image analysis, please set your Google Gemini API key in the <code>services/apiKey.ts</code> file.</p>
                <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-purple-400 underline hover:text-purple-300">Get your API key here</a>
            </div>
        )}

        <div className="w-full max-w-xl mx-auto mb-8 text-center">
            <label htmlFor="location-input" className="block text-sm font-medium text-gray-400 mb-2">
                Optional: Where were these photos taken? (e.g., "Toronto, Canada")
            </label>
            <input
                id="location-input"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter city, landmark, or region..."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors disabled:opacity-50"
                aria-describedby="location-help"
                disabled={!isApiKeySet || isAnalyzing}
            />
            <p id="location-help" className="mt-2 text-xs text-gray-500">
                Providing a location helps generate more accurate metadata and can add GPS coordinates to your files if they are missing.
            </p>
        </div>
        
        <main className="flex flex-col items-center gap-8">
          {files.length === 0 && <ImageUploader onImageSelect={handleImageSelect} />}
          
          {error && <div className="text-red-400 bg-red-900/50 p-4 rounded-lg text-center whitespace-pre-wrap">{error}</div>}

          {files.length > 0 && (
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full">
                {files.map(fs => (
                  <div key={fs.id} className="relative aspect-square bg-gray-800 rounded-lg shadow-md overflow-hidden group">
                    <img src={fs.imageUrl} alt={fs.file.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleRemoveFile(fs.id)} className="p-2 bg-red-600/80 rounded-full text-white hover:bg-red-500">
                        <XMarkIcon className="w-6 h-6" />
                      </button>
                    </div>
                    {fs.isLoading && (
                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
                           <Spinner />
                           <span className="text-xs text-gray-300">Analyzing...</span>
                        </div>
                    )}
                    {fs.error && (
                        <div className="absolute inset-0 bg-red-900/80 p-2 flex items-center justify-center text-center text-xs text-red-200">
                            {fs.error}
                        </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <button
                    onClick={handleAnalyze}
                    disabled={!isApiKeySet || isAnalyzing || filesToAnalyzeCount === 0}
                    className="px-8 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all shadow-lg transform hover:scale-105"
                >
                    {isAnalyzing ? "Analyzing..." : `Analyze ${filesToAnalyzeCount} File(s)`}
                </button>
                <button
                    onClick={handleReset}
                    className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                >
                    Clear All
                </button>
              </div>
            </div>
          )}

          {analyzedCount > 0 && (
             <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in mt-8">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Analysis Complete</h2>
                    <button
                        onClick={handleDownloadAll}
                        className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all shadow-lg transform hover:scale-105"
                    >
                        Download All XMPs
                    </button>
                </div>
                {files.map(fs => fs.result && (
                  <div key={fs.id} className="bg-gray-800/50 p-4 sm:p-6 rounded-xl shadow-lg flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0 w-full md:w-48">
                      <img src={fs.imageUrl} alt={fs.file.name} className="rounded-lg w-full h-auto object-cover aspect-square" />
                      <p className="text-xs text-gray-400 mt-2 truncate" title={fs.file.name}>{fs.file.name}</p>
                    </div>
                    <div className="flex-grow">
                      <AnalysisResultDisplay result={fs.result} imageFile={fs.file} />
                    </div>
                  </div>
                ))}
             </div>
          )}
        </main>

        <footer className="text-center mt-12 py-6 border-t border-gray-800">
            <p className="text-gray-500 text-sm">
                Developed by Dave Waddling dave@waddling.com
            </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
