import React, { useState, useEffect } from "react";

const SellerCalOptionProduct = ({ product, onConfirm, onCancel, currentCart = [] }) => {
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    if (product && currentCart.length > 0) {
      const initialQty = {};
      currentCart.forEach(item => {
        if (item.product_id === product.id && item.variation && item.option) {
          initialQty[`${item.variation}|${item.option}`] = item.quantity;
        }
      });
      setQuantities(initialQty);
    }
  }, [product, currentCart]);

  if (!product || !product.variations) return null;

  const updateQuantity = (varName, optName, stock, delta) => {
    const key = `${varName}|${optName}`;
    const current = quantities[key] || 0;
    let newQty = current + delta;

    if (newQty < 0) newQty = 0;
    if (newQty > stock) {
      alert(`สินค้านี้เหลือสต็อกเพียง ${stock} ชิ้น`);
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
          product_id: product.id,
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
            <p className="ml-5 mt-1 text-sm text-gray-500">กรุณาเลือกตัวเลือกสินค้าที่ต้องการ</p>
          </div>
          <button 
            className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-400 hover:text-white hover:bg-red-500 rounded-full transition-colors text-xl font-bold" 
            onClick={onCancel}
          >
            ✖
          </button>
        </div>

        {/* Body (Variations) */}
        <div className="p-6 flex-1 overflow-x-auto">
          {product.variations.map((variation, vIndex) => (
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
                        className="h-28 bg-gray-100 flex items-center justify-center text-xs text-gray-400 bg-cover bg-center border-b border-gray-100" 
                        style={opt.image ? { backgroundImage: `url(${opt.image})` } : {}}
                      >
                        {!opt.image && "No Image"}
                      </div>
                      
                      <div className="p-3 flex-1 flex flex-col">
                        <div className="font-bold text-gray-700 text-sm line-clamp-1 mb-1">
                          {opt.name}
                        </div>
                        <div className="text-xs text-gray-500 mb-3 bg-gray-50 inline-block px-2 py-0.5 rounded w-fit">
                          คงเหลือ: {opt.stock}
                        </div>
                        
                        <div className="flex justify-between items-end mt-auto">
                          <div></div> 
                          {/* ส่วนของปุ่มที่ปรับเป็นแนวนอน */}
                          <div className="flex items-center border-2 border-purple-200 rounded-md bg-white w-fit">
                            <button 
                              className="text-purple-600 font-bold cursor-pointer px-3 py-1 hover:bg-purple-100 transition-colors rounded-l-sm" 
                              onClick={() => updateQuantity(variation.name, opt.name, opt.stock, -1)}
                            >
                              -
                            </button>
                            <div className="text-center border-x-2 border-purple-200 px-4 py-0.5 text-sm font-bold text-gray-700 bg-gray-50">
                              {currentQty}
                            </div>
                            <button 
                              className="text-purple-600 font-bold cursor-pointer px-3 py-1 hover:bg-purple-100 transition-colors rounded-r-sm" 
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
            ยืนยันการเลือก
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerCalOptionProduct;