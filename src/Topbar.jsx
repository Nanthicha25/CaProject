import React from 'react';
import { useLanguage } from "./LanguageContext"; // 1. นำเข้า Context

function Topbar({ setIsSidebarOpen, user, setUser, setCurrentPage }) {
  // 2. ดึงค่าจาก Context มาใช้
  const { lang, toggleLang, t } = useLanguage(); 

  // ปรับไอคอนให้ Responsive ตามโค้ดแรก
  const BuyerIcon = () => (
    <svg className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 text-pink-500 bg-pink-100 p-1 sm:p-1.5 rounded-full shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
    </svg>
  );

  const SellerIcon = () => (
    <svg className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 text-purple-600 bg-purple-100 p-1 sm:p-1.5 rounded-full shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
    </svg>
  );

  return (
    // ปรับ Header ให้มีความสูงยืดหยุ่นและ Padding ที่เล็กลงในมือถือ
    <header className="bg-white border-b border-gray-200 px-2 sm:px-4 py-2 sm:py-3 sticky top-0 z-30 flex items-center justify-between shadow-sm min-h-[56px] sm:min-h-[64px]">
      
      {/* ฝั่งซ้าย: Menu + Logo */}
      <div className="flex items-center min-w-0">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-1.5 sm:p-2 bg-white text-black rounded-md hover:bg-gray-100 transition shrink-0"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
        <span 
          onClick={() => setCurrentPage('home')}
          className="ml-1.5 sm:ml-4 font-black text-pink-500 text-sm xs:text-base sm:text-xl cursor-pointer truncate"
        >
          Art List
        </span>
      </div>

      {/* ฝั่งขวา: ปุ่มภาษา + ส่วน User */}
      <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 h-8 xs:h-10 sm:h-12 ml-1 shrink-0">
        
        {/* --- ส่วนที่เพิ่มใหม่: ปุ่มสลับภาษา --- */}
        <button 
          onClick={toggleLang} 
          className="flex items-center justify-center gap-1 px-2 sm:px-4 h-full text-[10px] xs:text-xs sm:text-sm font-bold border border-gray-200 rounded-full hover:bg-gray-50 transition text-gray-500 bg-white shrink-0"
        >
          <span className={lang === 'th' ? 'text-pink-500' : ''}>TH</span>
          <span className="text-gray-300 font-light scale-90 sm:scale-100">|</span>
          <span className={lang === 'en' ? 'text-pink-500' : ''}>EN</span>
        </button>

        {user ? (
          <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 bg-white pl-1 pr-2 sm:px-3 h-full rounded-full border border-gray-200 shadow-sm min-w-0">
            {user.role === 'seller' ? <SellerIcon /> : <BuyerIcon />}
            
            <div className="flex flex-col justify-center min-w-0 overflow-hidden">
              <span className="font-bold text-gray-800 text-[10px] xs:text-xs sm:text-sm leading-none mb-0.5 truncate max-w-[40px] xs:max-w-[70px] sm:max-w-none">
                {user.username}
              </span>
              <span className="text-[7px] xs:text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-tighter sm:tracking-wider leading-none">
                {user.role === 'seller' ? 'Creator' : 'User'}
              </span>
            </div>
            
            <button 
              onClick={() => {
                setUser(null);
                setCurrentPage('landing');
              }} 
              className="ml-0.5 sm:ml-2 text-[10px] xs:text-xs sm:text-sm text-red-500 hover:text-red-600 font-bold transition shrink-0"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 sm:gap-2 h-full">
            <button 
              onClick={() => setCurrentPage('login')}
              className="px-2.5 sm:px-5 h-full border border-blue-600 text-blue-600 font-bold rounded-full hover:bg-blue-50 transition text-[10px] sm:text-sm"
            >
              Login
            </button>
            <button 
              onClick={() => setCurrentPage('signup')}
              className="px-2.5 sm:px-5 h-full bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition shadow-md text-[10px] sm:text-sm"
            >
              Sign-up
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Topbar;