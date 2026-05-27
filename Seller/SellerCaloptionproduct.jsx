//src/Seller/SellerCaloptionproduct.jsx
import React, { useState, useEffect } from "react";
import { useLanguage } from '../LanguageContext';

const SellerCalOptionProduct = ({ product, onConfirm, onCancel, currentCart = [] }) => {
  const { t } = useLanguage();
  const [quantities, setQuantities] = useState({});
  const [alertPopup, setAlertPopup] = useState({ isOpen: false, type: '', message: '' });

  useEffect(() => {
    if (product && currentCart.length > 0) {
      const initialQty = {};
      currentCart.forEach(item => {
        // [จุดที่แก้ที่ 1] เปลี่ยนจาก product.id เป็น product.product_id ให้ตรงกับ DB
        if (item.product_id === product.product_id && item.variation && item.option) {
          initialQty[`${item.variation}|${item.option}`] = item.quantity;
        }
      });
      setQuantities(initialQty);
    }
  }, [product, currentCart]);

  if (!product || !product.variations) return null;

  // [จุดที่แก้ที่ 2] เขียนฟังก์ชันจัดกลุ่ม Variation ใหม่ เนื่องจากใน DB เก็บเป็น Array ชั้นเดียว 
  // แต่ UI ต้องการแบบแยกกลุ่ม (variation_name -> option_name)
  const groupedVariationsArray = Object.values(
    product.variations.reduce((acc, curr) => {
      const varName = curr.variation_name;
      if (!acc[varName]) {
        acc[varName] = { name: varName, options: [] };
      }
      acc[varName].options.push({
        name: curr.option_name,
        stock: curr.stock,
        image: curr.image
      });
      return acc;
    }, {})
  );

  const updateQuantity = (varName, optName, stock, delta) => {
    const key = `${varName}|${optName}`;
    const current = quantities[key] || 0;
    let newQty = current + delta;

    if (newQty < 0) newQty = 0;
    if (newQty > stock) {
      setAlertPopup({
        isOpen: true,
        type: 'error',
        message: `${t('stockLimitAlert')} ${stock} ${t('unitPieces')}`
      });
      newQty = stock;
    }

    setQuantities(prev => ({
      ...prev,
      [key]: newQty
    }));
  };

  const handleSubmit = () => {
    const selectedItems = [];
    Object.keys(quantities).forEach(key => {
      const qty = quantities[key];
      if (qty > 0) {
        const [varName, optName] = key.split('|');
        selectedItems.push({
          product_id: product.product_id, // [จุดที่แก้ที่ 3] เปลี่ยนจาก product.id เป็น product.product_id
          name: product.name,
          price: product.price,
          variation: varName,
          option: optName,
          quantity: qty
        });
      }
    });
    onConfirm(selectedItems); 
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[1000] p-4">
      
      <div className="bg-gray-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl flex flex-col shadow-2xl animate-fade-in border border-purple-100">
        
        {/* Header Modal */}
        <div className="bg-white p-6 border-b border-purple-100 sticky top-0 z-10 flex justify-between items-center shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-gray-800 border-l-4 border-purple-600 pl-4 flex items-center gap-2">
              {product.name}
            </h2>
            <p className="ml-5 mt-1 text-sm text-gray-500">{t('selectOptionsGuide')}</p>
          </div>
          <button 
            className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-400 hover:text-white hover:bg-gray-300 rounded-full transition-colors text-xl font-bold" 
            onClick={onCancel}
          >
            ✖
          </button>
        </div>

        {/* Body (Variations) */}
        <div className="p-6 flex-1 overflow-x-auto">
          {/* [จุดที่แก้ที่ 4] เปลี่ยนจาก product.variations.map เป็น groupedVariationsArray.map */}
          {groupedVariationsArray.map((variation, vIndex) => (
            <div key={vIndex} className="mb-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-purple-600 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                <span>🏷️</span> {variation.name}
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {variation.options.map((opt, oIndex) => {
                  const key = `${variation.name}|${opt.name}`;
                  const currentQty = quantities[key] || 0;
                  
                  return (
                    <div className="bg-white border-2 border-gray-100 rounded-xl flex flex-col overflow-hidden transition-all duration-300 hover:border-purple-300 hover:shadow-md" key={oIndex}>
                      <div 
                        className="w-full aspect-square bg-gray-100 flex items-center justify-center text-xs text-gray-400 bg-cover bg-center border-b border-gray-100" 
                        style={opt.image ? { backgroundImage: `url(${opt.image})` } : {}}
                      >
                        {!opt.image && "t('noImage')"}
                      </div>
                      
                      <div className="p-3 flex-1 flex flex-col">
                        <div className="font-bold text-gray-700 text-sm line-clamp-1 mb-1">
                          {opt.name}
                        </div>
                        <div className="text-xs text-gray-500 mb-3 bg-gray-50 inline-block px-2 py-0.5 rounded w-fit">
                          {t('stockLabel')} {opt.stock}
                        </div>
                        
                        <div className="flex justify-between items-end mt-auto">
                          <div></div> 
                          
                          {/* ส่วนของปุ่มที่ปรับเป็นแนวนอน */}
                          <div className="flex items-center border-2 border-purple-200 rounded-md bg-white max-w-full">
                            <button 
                              className="text-purple-600 text-lg md:text-xl font-bold cursor-pointer px-2 md:px-3 py-1 hover:bg-purple-100 transition-colors rounded-l-sm" 
                              onClick={() => updateQuantity(variation.name, opt.name, opt.stock, -1)}
                            >
                              -
                            </button>
                            <div className="text-center border-x-2 border-purple-200 px-2 md:px-4 py-0.5 text-sm md:text-base font-bold text-gray-700 bg-gray-50 min-w-[32px] md:min-w-[40px]">
                              {currentQty}
                            </div>
                            <button 
                              className={`text-lg md:text-xl font-bold px-2 md:px-3 py-1 rounded-r-sm transition-colors ${
                                opt.stock <= 0 || currentQty >= opt.stock
                                  ? "text-gray-300 cursor-not-allowed" 
                                  : "text-purple-600 cursor-pointer hover:bg-purple-100"
                              }`}
                              disabled={opt.stock <= 0 || currentQty >= opt.stock}
                              onClick={() => updateQuantity(variation.name, opt.name, opt.stock, 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Modal */}
        <div className="bg-white p-4 border-t border-gray-200 flex justify-end sticky bottom-0 rounded-b-3xl">
          <button 
            className="bg-purple-600 text-white border-2 border-purple-600 px-10 py-3 rounded-xl font-bold hover:bg-white hover:text-purple-600 transition-colors shadow-md text-lg" 
            onClick={handleSubmit}
          >
            {t('confirmSelection')}
          </button>
        </div>
      </div>
      {alertPopup.isOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center transform transition-all scale-100 animate-fade-in">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 text-2xl font-black ${
                alertPopup.type === 'success' ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'
              }`}>
              {alertPopup.type === 'success' ? '✓' : '✕'}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {alertPopup.type === 'success' ? t('popupSuccess') : t('popupError')}
            </h3>
            <p className="text-gray-600 mb-8">{alertPopup.message}</p>
            <button 
              onClick={() => setAlertPopup({ isOpen: false, type: '', message: '' })} 
              className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 text-white ${
                  alertPopup.type === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}
            >
              {t('popupClose')}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default SellerCalOptionProduct;