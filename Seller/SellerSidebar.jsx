// src/Seller/SellerSidebar.jsx
import React from 'react';

function SellerSidebar({ isOpen, setIsOpen, currentPage, setCurrentPage }) {
  const menuItems = [
    { id: 'homepage', label: 'Homepage', icon: '🏠' },
    { id: 'product', label: 'Product', icon: '📦' },
    { id: 'calculate', label: 'Calculate', icon: '🧮' },
    { id: 'conclusion', label: 'Conclusion', icon: '📊' },
    { id: 'contact', label: 'Contact us', icon: '📞' }
  ];

  return (
    <>
      {/* Overlay Background */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Sidebar Panel */}
      <div 
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50">
          <h2 className="text-xl font-black text-purple-600">Creator Panel</h2>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-purple-600 font-bold p-1">
            ✕
          </button>
        </div>
        
        <nav className="p-4 flex flex-col gap-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                setIsOpen(false);
              }}
              className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${
                currentPage === item.id 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}

export default SellerSidebar;