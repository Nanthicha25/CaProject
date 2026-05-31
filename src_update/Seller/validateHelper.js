// src/Seller/validateHelper.js

export const FORBIDDEN_WORDS = [
  "คำหยาบ1", "คำหยาบ2", "กัญชา", "พนัน", "อาวุธ", 
  "ยาเสพติด", "คาสิโน", "ปืน", "ระเบิด"
];

/**
 * ตรวจสอบความถูกต้องของชื่อสินค้า
 * @param {string} text - ข้อความที่ต้องการเช็ค
 * @returns {object} - { isValid: boolean, message: string }
 */
export const validateProductName = (text) => {
  if (!text || text.trim() === "") {
    return { isValid: false, message: "กรุณาระบุชื่อสินค้า" };
  }

  const originalText = text.trim();

  // 1. ตรวจสอบคำต้องห้าม (คำหยาบ/สิ่งผิดกฎหมาย)
  const cleanText = originalText
    .toLowerCase()
    .replace(/\s/g, '') // ลบช่องว่าง
    .replace(/[^a-zA-Z0-9ก-ฮ]/g, ''); // ลบสัญลักษณ์พิเศษ

  const foundWord = FORBIDDEN_WORDS.find(word => cleanText.includes(word.toLowerCase()));
  if (foundWord) {
    return { isValid: false, message: `ห้ามใช้คำว่า "${foundWord}" ในชื่อสินค้า` };
  }

  // 2. ตรวจสอบการพิมพ์มั่ว (Gibberish Detection)
  
  // กฎ: ตัวอักษรซ้ำกันมากเกินไป (เช่น "อออออ", "aaaaa")
  const repetitivePattern = /(.)\1{4,}/; 
  if (repetitivePattern.test(originalText)) {
    return { isValid: false, message: "ชื่อสินค้ามีการใช้อักขระซ้ำกันมากเกินไป" };
  }

  // กฎ: พยัญชนะภาษาอังกฤษติดกันเกินไป (เช่น "asdfghjkl") - ปกติคำศัพท์ต้องมีสระ
  const gibberishEnglish = /[^aeiouy\s]{8,}/i; 
  if (gibberishEnglish.test(originalText)) {
    return { isValid: false, message: "ชื่อสินค้าดูเหมือนการพิมพ์มั่ว (ไม่มีสระ)" };
  }

  // กฎ: ความยาวสั้นเกินไป
  if (originalText.length < 3) {
    return { isValid: false, message: "ชื่อสินค้าต้องมีความยาวอย่างน้อย 3 ตัวอักษร" };
  }

  return { isValid: true };
};