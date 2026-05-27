// Sidebar.jsx
import React, { useContext } from 'react';
import { LanguageContext } from './LanguageContext';

//function Sidebar({ isOpen, setIsOpen, currentPage, setCurrentPage }) {

function Sidebar({ isOpen, setIsOpen, currentPage, setCurrentPage }) {
  
  const { t } = useContext(LanguageContext);

  /*// สร้าง Array ของเมนูเพื่อให้นำไปวนลูป (map) ได้ง่าย
  const menuItems = [
    { id: 'home', label: 'หน้าแรก', icon: '🏠' },
    { id: 'search', label: 'ค้นหาสินค้า', icon: '🔍' },
    { id: 'cart', label: 'ตะกร้าสินค้า', icon: '🛒' },
    { id: 'contact', label: 'ติดต่อเรา', icon: '📞' },
  ];*/

  const menuItems = [
    { id: 'home', label: t('home'), icon: '🏠' },
    { id: 'search', label: t('search'), icon: '🔍' },
    { id: 'cart', label: t('cart'), icon: '🛒' },
    { id: 'contact', label: t('contact'), icon: '📞' },
  ];

  // ฟังก์ชันเมื่อกดเลือกเมนู
  const handleMenuClick = (pageId) => {
    setCurrentPage(pageId); // เปลี่ยนหน้า
    setIsOpen(false);       // ปิด Sidebar ดอัตโนมัติ
  };

  return (
    <>
      {/* ==========================================
          ส่วนที่ 1: ฉากหลังสีดำจางๆ (Overlay)
          ========================================== */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* ==========================================
          ส่วนที่ 2: ตัวเมนู Sidebar ฝั่งซ้าย
          ========================================== */}
      <aside 
        className={`fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* ปุ่มกากบาท (Close) */}
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-full transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <div className="p-6 mt-10">
          <div className="text-pink-500 font-black text-3xl mb-10 text-center tracking-tighter">
            Art List
          </div>

          {/* เมนูนำทาง */}
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleMenuClick(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-full transition flex items-center
                    ${currentPage === item.id 
                      ? 'bg-pink-500 text-white font-bold shadow-md hover:bg-pink-600' 
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <span className="mr-3">{item.icon}</span> {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;