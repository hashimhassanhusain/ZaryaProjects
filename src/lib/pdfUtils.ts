import { jsPDF } from 'jspdf';

/**
 * Loads the Amiri Arabic font into the provided jsPDF instance.
 */
export const loadArabicFont = async (pdf: jsPDF) => {
  try {
    const fontUrl = 'https://fonts.gstatic.com/s/amiri/v30/J7aRnpd8CGxBHqUp.ttf';
    const response = await fetch(fontUrl);
    const fontBuffer = await response.arrayBuffer();
    const fontBase64 = btoa(
      new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    pdf.addFileToVFS('Amiri-Regular.ttf', fontBase64);
    pdf.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');

    const boldFontUrl = 'https://fonts.gstatic.com/s/amiri/v30/J7acnpd8CGxBHp2VkZY4.ttf';
    const boldResponse = await fetch(boldFontUrl);
    if (boldResponse.ok) {
      const boldFontBuffer = await boldResponse.arrayBuffer();
      const boldFontBase64 = btoa(
        new Uint8Array(boldFontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      pdf.addFileToVFS('Amiri-Bold.ttf', boldFontBase64);
      pdf.addFont('Amiri-Bold.ttf', 'Amiri', 'bold');
    }

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
