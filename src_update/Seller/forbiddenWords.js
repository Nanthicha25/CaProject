// src/Seller/forbiddenWords.js

// 1. รายการคำต้องห้าม (ก๊อปปี้มาวางเพิ่มได้เรื่อย ๆ จนครบ 1,000+ คำ)
export const FORBIDDEN_WORDS = [
  "คำหยาบ1", "คำหยาบ2", "กัญชา", "พนัน", "ยาเสพติด", "คาสิโน", 
  "sex", "porn", "เย็ด", "ควย", "มึง", "กู", "เลว", "ชั่ว","จิ๋มปลอม", "ดิลโด้", "ถุงยาง",
  "หนังโป๊", "คลิปหลุด", "เงี่ยน", "น้ำแตก", "เว็บตรง", "แทงบอล", "หวยใต้ดิน",
  "ยาไอซ์", "ยาบ้า", "กระท่อม", "ยาเค", "พอต", "บุหรี่ไฟฟ้า", "ค_ว_ย", "สล็อต888", "เยด", "คูย",
  , "vีด", "ค ว ย", "ส.ล็.อ.ต"
];

/**
 * ฟังก์ชันสำหรับตรวจสอบเนื้อหา
 */
export const validateContent = (text) => {
  if (!text) return { isValid: true };

  // ปรับแต่งข้อความ: แปลงเป็นตัวพิมพ์เล็ก และลบช่องว่าง/จุด/ขีด เพื่อดักการเลี่ยง
  const cleanText = text.toLowerCase().replace(/[\s\.\-\_\/]/g, '');

  // 1. ตรวจสอบคำต้องห้ามจากรายการข้างบน
  for (const word of FORBIDDEN_WORDS) {
    if (cleanText.includes(word.toLowerCase())) {
      return { 
        isValid: false, 
        message: `พบคำไม่เหมาะสมในเนื้อหา (คำว่า: ${word})` 
      };
    }
  }

  // 2. ตรวจสอบการรัวคีย์บอร์ด (ตัวอักษรเดียวซ้ำกันเกิน 7 ตัว)
  const repeatedPattern = /(.)\1{7,}/; 
  if (repeatedPattern.test(cleanText)) {
    return { isValid: false, message: "กรุณาอย่าใช้ตัวอักษรซ้ำกันมากเกินไป" };
  }

  // 3. ตรวจสอบพยัญชนะล้วนยาว ๆ (ดักการพิมพ์มั่วแบบไม่มีสระ)
  const gibberishThai = /[ก-ฮ]{10,}/; 
  const gibberishEng = /[b-df-hj-np-tv-z]{10,}/i; 
  if (gibberishThai.test(cleanText) || gibberishEng.test(cleanText)) {
    return { isValid: false, message: "เนื้อหาดูเหมือนเป็นการพิมพ์ข้อความสุ่ม" };
  }

  return { isValid: true };
};