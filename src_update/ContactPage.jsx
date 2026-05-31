import React from 'react';
import { useLanguage } from "./LanguageContext";

// Import รูปจากโฟลเดอร์ Seller/pic
import xLogo from "./Seller/pic/vector-twitters-new-x-logo-dark-background-vector_883031-16.avif";
import facebookLogo from "./Seller/pic/facebook-ads.webp";
import gmailLogo from "./Seller/pic/google-mail-gmail-icon-logo-symbol-free-png.webp";

const ContactPage = () => {
  const { t, lang } = useLanguage();
  const themeColor = "rgb(236, 72, 153)"; // Pink-500

  const contactLinks = [
    { label: lang === 'th' ? 'แจ้งปัญหาการใช้งาน' : 'Report Problem', url: "https://www.google.com/" },
    { label: lang === 'th' ? 'ข้อเสนอแนะ' : 'Suggestion', url: "https://www.google.com/" }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-10 md:p-16 text-center">
          <h1 
            className="text-4xl md:text-6xl font-black mb-6 tracking-tighter" 
            style={{ color: themeColor }}
          >
            {t('contact_title') || (lang === 'th' ? 'ติดต่อเรา' : 'Contact Us')}
          </h1>
          
          <div className="space-y-4 mb-12 text-left">
            {contactLinks.map((link, index) => (
              <div 
                key={index} 
                className="flex flex-col sm:flex-row justify-between items-center p-6 bg-gray-50 rounded-2xl border border-gray-100 transition-all hover:bg-pink-50/50 hover:border-pink-100"
              >
                <span className="font-bold text-lg text-gray-700">{link.label}</span>
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-pink-500 font-bold underline break-all hover:text-pink-600 transition-colors"
                >
                  {link.url.replace('https://', '')}
                </a>
              </div>
            ))}
          </div>

          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-8">Social Media</p>
          <div className="flex justify-center gap-6">
            {[
              { img: xLogo, url: "https://x.com" },
              { img: facebookLogo, url: "https://facebook.com" },
              { img: gmailLogo, url: "mailto:support@artlist.com" }
            ].map((social, i) => (
              <a 
                key={i} 
                href={social.url} 
                target="_blank" 
                rel="noreferrer" 
                className="w-16 h-16 rounded-2xl border border-gray-100 p-1 hover:border-pink-300 hover:-translate-y-1 transition-all bg-white shadow-sm"
              >
                <img src={social.img} className="w-full h-full object-cover rounded-xl" alt={social.url} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;