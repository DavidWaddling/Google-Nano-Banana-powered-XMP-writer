import exifr from 'exifr';
import { AnalysisResult } from '../types';

export const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            reject(new Error("Failed to read file as data URL."));
        }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });

  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const escapeXml = (unsafe: string): string => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

const TIFF_TAGS = new Set(['Make', 'Model', 'Orientation', 'XResolution', 'YResolution', 'ResolutionUnit', 'Software', 'DateTime', 'Artist', 'Copyright']);
const EXIF_TAGS = new Set(['ExposureTime', 'FNumber', 'ExposureProgram', 'ISOSpeedRatings', 'ExifVersion', 'DateTimeDigitized', 'ShutterSpeedValue', 'ApertureValue', 'BrightnessValue', 'ExposureBiasValue', 'MaxApertureValue', 'MeteringMode', 'LightSource', 'Flash', 'FocalLength', 'ColorSpace', 'PixelXDimension', 'PixelYDimension', 'FocalPlaneXResolution', 'FocalPlaneYResolution', 'FocalPlaneResolutionUnit', 'SensingMethod', 'FileSource', 'SceneType', 'CustomRendered', 'ExposureMode', 'WhiteBalance', 'DigitalZoomRatio', 'FocalLengthIn35mmFilm', 'SceneCaptureType', 'GainControl', 'Contrast', 'Saturation', 'Sharpness', 'SubjectDistanceRange', 'LensSpecification', 'LensMake', 'LensModel', 'BodySerialNumber', 'ImageUniqueID']);

const generateAllExifXmpTags = (exifData: any): string => {
    const tags: string[] = [];
    const handledKeys = new Set(['DateTimeOriginal']); // This is used for xmp:CreateDate

    for (const key in exifData) {
        if (Object.prototype.hasOwnProperty.call(exifData, key) && !handledKeys.has(key)) {
            const value = exifData[key];

            // Skip complex objects, empty values, or buffers
            if (value === null || value === undefined || typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
                continue;
            }

            let namespace: 'tiff' | 'exif' | null = null;
            if (TIFF_TAGS.has(key)) {
                namespace = 'tiff';
            } else if (EXIF_TAGS.has(key)) {
                namespace = 'exif';
            }

            if (namespace) {
                const tagName = `${namespace}:${key}`;
                let tagContent: string;

                if (Array.isArray(value)) {
                    // For arrays like ISOSpeedRatings
                    tagContent = `<rdf:Seq>${value.map(v => `<rdf:li>${escapeXml(String(v))}</rdf:li>`).join('')}</rdf:Seq>`;
                    tags.push(`<${tagName}>${tagContent}</${tagName}>`);
                } else if (value instanceof Date) {
                    tagContent = value.toISOString();
                    tags.push(`<${tagName}>${tagContent}</${tagName}>`);
                } else {
                    tagContent = escapeXml(String(value));
                    tags.push(`<${tagName}>${tagContent}</${tagName}>`);
                }
            }
        }
    }
    return tags.join('\n   ');
};

const toDegreesMinutesSeconds = (coordinate: number, isLatitude: boolean): string => {
    const absolute = Math.abs(coordinate);
    const degrees = Math.floor(absolute);
    const minutes = Math.floor((absolute - degrees) * 60);
    const seconds = (((absolute - degrees) * 60) - minutes) * 60;
    const ref = isLatitude ? (coordinate >= 0 ? 'N' : 'S') : (coordinate >= 0 ? 'E' : 'W');
    
    return `${degrees},${minutes},${seconds.toFixed(2)}${ref}`;
};


export const createXmpSidecar = async (file: File, result: AnalysisResult): Promise<void> => {
    let exifData: any = {};
    try {
        exifData = await exifr.parse(file, true);
    } catch (e) {
        console.warn("Could not parse EXIF data from file:", e);
    }

    const keywords = result.tags.map(tag => `<rdf:li>${escapeXml(tag)}</rdf:li>`).join('\n          ');
    const createDate = exifData?.DateTimeOriginal ? new Date(exifData.DateTimeOriginal).toISOString() : new Date().toISOString();
    const allExifTags = generateAllExifXmpTags(exifData);
    
    const generatedMetadataTags: string[] = [];

    if (result.location) {
        generatedMetadataTags.push(`<Iptc4xmpCore:Location>${escapeXml(result.location)}</Iptc4xmpCore:Location>`);
    }

    const hasExifGps = exifData && exifData.GPSLatitude && exifData.GPSLongitude;
    const hasGeminiGps = result.latitude !== undefined && result.longitude !== undefined;

    if (!hasExifGps && hasGeminiGps) {
        const latStr = toDegreesMinutesSeconds(result.latitude!, true);
        const lonStr = toDegreesMinutesSeconds(result.longitude!, false);
        generatedMetadataTags.push(`<exif:GPSLatitude>${latStr}</exif:GPSLatitude>`);
        generatedMetadataTags.push(`<exif:GPSLongitude>${lonStr}</exif:GPSLongitude>`);
    }

    const xmpString = `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:08:21        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:exif="http://ns.adobe.com/exif/1.0/"
    xmlns:tiff="http://ns.adobe.com/tiff/1.0/"
    xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/">
   <dc:title>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${escapeXml(result.title)}</rdf:li>
    </rdf:Alt>
   </dc:title>
   <dc:description>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${escapeXml(result.description)}</rdf:li>
    </rdf:Alt>
   </dc:description>
   <dc:subject>
    <rdf:Bag>
     ${keywords}
    </rdf:Bag>
   </dc:subject>
   <xmp:CreateDate>${createDate}</xmp:CreateDate>
   ${allExifTags}
   ${generatedMetadataTags.join('\n   ')}
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;

    const blob = new Blob([xmpString], { type: 'application/rdf+xml;charset=utf-8' });

    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const xmpFilename = `${baseName}.xmp`;
    triggerDownload(blob, xmpFilename);
};
