import React, { useState } from 'react';

interface CopyButtonProps {
  textToCopy: string;
}

const CheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const ClipboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 0 1-2.25 2.25h-1.5a2.25 2.25 0 0 1-2.25-2.25V4.5m-7.5 0h7.5m-7.5 0a2.25 2.25 0 0 0-2.25 2.25v11.25c0 1.242 1.008 2.25 2.25 2.25h9.75c1.242 0 2.25-1.008 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75Z" />
  </svg>
);


const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <CheckIcon className="w-5 h-5 text-green-400" />
      ) : (
        <ClipboardIcon className="w-5 h-5 text-gray-300" />
      )}
    </button>
  );
};

export default CopyButton;
