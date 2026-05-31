//src/Seller/SellerContact.jsx
import React from 'react';
import xLogo from "./pic/vector-twitters-new-x-logo-dark-background-vector_883031-16.avif";
import facebookLogo from "./pic/facebook-ads.webp";
import gmailLogo from "./pic/google-mail-gmail-icon-logo-symbol-free-png.webp";
import { useLanguage } from '../LanguageContext';

const SellerContact = () => {
  const { t } = useLanguage();
  // กำหนดค่าสีและข้อมูลไว้ที่ตัวแปร เพื่อให้แก้ไขง่าย
  const themeColor = "rgb(147, 51, 234)";
  const contactLinks = [
    { label: t('reportProblem'), url: "https://forms.gle/y1qTA3Q2oMtxENFn8" },
    { label: t('suggestion'), url: "https://forms.gle/KovTaPcp9BDg4Yz67" }
  ];

  const socialLinks = [
  { 
    name: "X", 
    url: "https://x.com/projectogetherr", 
    img: xLogo // ใช้ชื่อตัวแปร ไม่ต้องมีเครื่องหมายคำพูด
  },
  { 
    name: "Facebook", 
    url: "https://www.facebook.com/share/18wasfCsjM/", 
    img: facebookLogo 
  },
  { 
    name: "Gmail", 
    url: "https://www.google.com/", 
    img: gmailLogo 
  }
];

  return (
    // 1. เปลี่ยน items-center เป็น items-start และเพิ่ม pt-12 เพื่อให้ขยับขึ้นบน
   // 1. ปรับ pt (Padding Top) ให้ค่าน้อยลงเพื่อให้กรอบขยับขึ้นไปชิดด้านบน
    // จากเดิม pt-5 md:pt-20 -> เปลี่ยนเป็น pt-2 md:pt-6
    <div className="min-h-screen w-full bg-[#f8f9fa] flex items-start justify-center p-4 sm:p-8 pt-2 md:pt-6">
      {/* Contact Card */}
      <div className="w-full max-w-[650px] bg-white rounded-[30px] shadow-[0_10px_30px_rgba(147,51,234,0.15)] p-8 md:p-12 text-center transition-all">
        
        {/* Title */}
        <h1 
          className="text-3xl md:text-5xl font-bold pb-4 mb-8 border-b border-gray-100"
          style={{ color: themeColor }}
        >
          {t('contactTitle')}
        </h1>

        {/* Links Section */}
        <div className="flex flex-col gap-6 items-start md:items-center mb-10">
          <div className="inline-block text-left space-y-4 w-full">
            {contactLinks.map((link, index) => (
              /* เพิ่ม min-w-0 ที่นี่เพื่อให้ลูกสามารถหดตัว (truncate) ได้ */
              <div key={index} className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 min-w-0">
                <span 
                  className="font-bold text-lg md:text-xl whitespace-nowrap"
                  style={{ color: themeColor }}
                >
                  {link.label}
                </span>
                
                {/* แก้ไขคลาสของ <a> ตรงนี้ */}
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 underline text-base md:text-lg hover:text-[rgb(147,51,234)] transition-colors truncate block"
                  title={link.url} // เพิ่ม title เพื่อให้เอาเมาส์ชี้แล้วยังเห็นลิงก์เต็มๆ
                >
                  {link.url}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Social Icons Container */}
        <div className="flex justify-center items-center gap-4 md:gap-6 mt-6">
          {socialLinks.map((social, index) => (
            <a
              key={index}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative w-14 h-14 md:w-16 md:h-16 rounded-xl border border-gray-200 overflow-hidden hover:-translate-y-1.5 hover:shadow-lg transition-all duration-300"
            >
              <img 
                src={social.img} 
                alt={social.name} 
                className="w-full h-full object-cover"
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SellerContact;