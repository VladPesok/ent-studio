import React from 'react';
import {
  FileOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileZipOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FilePptOutlined
} from '@ant-design/icons';

export type FileType = 'video' | 'audio' | 'image' | 'document' | 'text' | 'archive' | 'other';

/**
 * Determines file type based on file extension
 * @param extension - File extension (with or without dot)
 * @returns FileType
 */
export const getFileType = (extension: string): FileType => {
  const ext = extension.toLowerCase().startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  
  // Video files
  if (['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'].includes(ext)) {
    return 'video';
  }
  
  // Audio files
  if (['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'].includes(ext)) {
    return 'audio';
  }
  
  // Image files
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.tiff'].includes(ext)) {
    return 'image';
  }
  
  // Document files
  if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext)) {
    return 'document';
  }
  
  // Text files
  if (['.txt', '.md', '.rtf', '.csv'].includes(ext)) {
    return 'text';
  }
  
  // Archive files
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
    return 'archive';
  }
  
  // Default
  return 'other';
};

/**
 * Returns appropriate icon component for file type
 * @param fileType - The file type
 * @returns React icon component
 */
export const getFileIcon = (fileType: FileType): React.ReactElement => {
  switch (fileType) {
    case 'video':
      return React.createElement(VideoCameraOutlined);
    case 'audio':
      return React.createElement(AudioOutlined);
    case 'image':
      return React.createElement(FileImageOutlined);
    case 'document':
      return getDocumentIcon(fileType);
    case 'text':
      return React.createElement(FileTextOutlined);
    case 'archive':
      return React.createElement(FileZipOutlined);
    default:
      return React.createElement(FileOutlined);
  }
};

/**
 * Returns appropriate icon component for file extension (legacy support)
 * @param extension - File extension (with or without dot)
 * @returns React icon component
 */
export const getFileIconByExtension = (extension: string): React.ReactElement => {
  const ext = extension.toLowerCase().startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  
  // Video files
  if (['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'].includes(ext)) {
    return React.createElement(VideoCameraOutlined);
  }
  
  // Audio files
  if (['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'].includes(ext)) {
    return React.createElement(AudioOutlined);
  }
  
  // Image files
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.tiff'].includes(ext)) {
    return React.createElement(FileImageOutlined);
  }
  
  // Document files - specific icons
  if (['.pdf'].includes(ext)) {
    return React.createElement(FilePdfOutlined);
  }
  
  if (['.doc', '.docx'].includes(ext)) {
    return React.createElement(FileWordOutlined);
  }
  
  if (['.xls', '.xlsx'].includes(ext)) {
    return React.createElement(FileExcelOutlined);
  }
  
  if (['.ppt', '.pptx'].includes(ext)) {
    return React.createElement(FilePptOutlined);
  }
  
  // Text files
  if (['.txt', '.md', '.rtf', '.csv'].includes(ext)) {
    return React.createElement(FileTextOutlined);
  }
  
  // Archive files
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
    return React.createElement(FileZipOutlined);
  }
  
  // Default file icon
  return React.createElement(FileOutlined);
};

/**
 * Helper function to get specific document icons
 * @param extension - File extension
 * @returns React icon component
 */
const getDocumentIcon = (extension: string): React.ReactElement => {
  const ext = extension.toLowerCase().startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  
  if (['.pdf'].includes(ext)) {
    return React.createElement(FilePdfOutlined);
  }
  
  if (['.doc', '.docx'].includes(ext)) {
    return React.createElement(FileWordOutlined);
  }
  
  if (['.xls', '.xlsx'].includes(ext)) {
    return React.createElement(FileExcelOutlined);
  }
  
  if (['.ppt', '.pptx'].includes(ext)) {
    return React.createElement(FilePptOutlined);
  }
  
  return React.createElement(FileOutlined);
};