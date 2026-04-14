import { jsPDF } from 'jspdf';

/**
 * Loads the Amiri Arabic font into the provided jsPDF instance.
 */
export const loadArabicFont = async (pdf: jsPDF) => {
  try {
    const fontUrl = 'https://cdn.jsdelivr.net/gh/googlefonts/amiri@main/fonts/ttf/Amiri-Regular.ttf';
    const response = await fetch(fontUrl);
    const fontBuffer = await response.arrayBuffer();
    const fontBase64 = btoa(
      new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    pdf.addFileToVFS('Amiri-Regular.ttf', fontBase64);
    pdf.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    return true;
  } catch (e) {
    console.error('Failed to load Arabic font:', e);
    return false;
  }
};

/**
 * Helper to determine if a string contains Arabic characters.
 */
export const containsArabic = (text: string) => {
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text);
};
