//src/Buyer/ProductDetail.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { setDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';

function ProductDetail({ product, onBack, onRequireAuth, user, onGoToStore, isSellerView }) {
  const { t, lang } = useLanguage();
  
  const coverImg = product.cover_image || "https://placehold.co/400x400?text=No+Image";
  const secondaryImages = product.extra_images ? product.extra_images.split(',') : [];
  const allImages = [coverImg, ...secondaryImages].filter(Boolean);

  const [mainImage, setMainImage] = useState(coverImg);
  const [selectedOption, setSelectedOption] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const [popup, setPopup] = useState({ 
    isOpen: false, 
    message: '', 
    type: 'info', 
    onCloseAction: null 
  });

  const isAdult = product.isR18 === true || product.category_main === 'R-18';

  useEffect(() => {
    if (isAdult) {
      setPopup({
        isOpen: true,
        message: lang === 'th' 
          ? "สินค้านี้เหมาะกับคนที่มีอายุ 18 ปีขึ้นไป เป็นสินค้าที่มีการตรวจบัตรประชาชนเมื่อซื้อจริง"
          : "This product is restricted to individuals aged 18 and older. ID verification will be required for purchases.",
        type: 'warning',
        onCloseAction: null
      });
    }
  }, [product?.id, product?.product_id, isAdult, lang]);

  useEffect(() => {
    if (coverImg) setMainImage(coverImg);
  }, [coverImg]);

  const processedVariations = [];
  if (product.variations && Array.isArray(product.variations)) {
    const grouped = {};
    product.variations.forEach(v => {
      const groupName = v.variation_name || t('defaultVariation');
      if (!grouped[groupName]) grouped[groupName] = [];
      grouped[groupName].push({
        ...v,
        name: v.option_name,
        stock: v.stock || 0
      });
    });
    for (const key in grouped) {
      processedVariations.push({ name: key, options: grouped[key] });
    }
  }

  const totalStock = product.total_stock || 0;
  const displayStock = selectedOption ? selectedOption.stock : totalStock;

  const handleSelectOption = (option) => {
    setSelectedOption(option);
    setQuantity(1);
    if (option.image) setMainImage(option.image);
  };

  const handleQuantityChange = (type) => {
    if (type === 'decrease' && quantity > 1) setQuantity(q => q - 1);
    if (type === 'increase' && quantity < displayStock) setQuantity(q => q + 1);
  };

  const categoryPath = product.category_path
    ? product.category_path.split('/').join(' > ') 
    : t('defaultCategory');

  const showPopup = (message, type = 'info', onCloseAction = null) => {
    setPopup({ isOpen: true, message, type, onCloseAction });
  };

  const closePopup = () => {
    if (popup.onCloseAction) {
      popup.onCloseAction(); 
    }
    setPopup({ ...popup, isOpen: false, onCloseAction: null });
  };

  // ฟังก์ชันสำหรับการกดปุ่มจอง (Reserve)
  const handleReserveClick = () => {
    if (isSellerView) {
      showPopup(t('sellerModeWarning'), "warning");
      return;
    }
    if (!user || (!user.id && !user.uid)) {
      showPopup(t('loginRequired'), "warning", onRequireAuth);
      return;
    }
    if (processedVariations.length > 0 && !selectedOption) {
      showPopup(t('selectOptionWarning'), "warning");
      return;
    }

    setPopup({
      isOpen: true,
      message: t('reserveConfirmTitle'),
      type: 'confirm', 
      onCloseAction: () => handleAddToCart('Reserved')
    });
  };

  // ✨ ฟังก์ชันใหม่: สำหรับการกดปุ่ม Add to Cart (Wishlist)
  const handleWishlistClick = () => {
    if (isSellerView) {
      showPopup(t('sellerModeWarning'), "warning");
      return;
    }
    if (!user || (!user.id && !user.uid)) {
      showPopup(t('loginRequired'), "warning", onRequireAuth);
      return;
    }
    if (processedVariations.length > 0 && !selectedOption) {
      showPopup(t('selectOptionWarning'), "warning");
      return;
    }

    setPopup({
      isOpen: true,
      message: lang === 'th' 
        ? "การเพิ่มลงตะกร้าเป็นเพียงการบันทึกช่วยจำ (Wishlist) ว่าคุณต้องการซื้อสินค้าชิ้นนี้เท่านั้น ไม่ได้เป็นการสั่งซื้อหรือจองสินค้าจริง และผู้ขายจะไม่ทราบว่าคุณกดเพิ่มสินค้านี้ ต้องการดำเนินการต่อหรือไม่?"
        : "Adding to the cart is just a personal note (wishlist) for the items you want to buy. It is not an actual purchase or reservation, and the seller will not be notified. Do you want to proceed?",
      type: 'confirm',
      onCloseAction: () => handleAddToCart('Wishlist')
    });
  };

  const handleAddToCart = async (type = 'Wishlist') => {
    if (isSellerView) {
      showPopup(t('sellerModeWarning'), "warning");
      return;
    }

    if (!user || (!user.id && !user.uid)) {
      showPopup(t('loginRequired'), "warning", onRequireAuth);
      return;
    }

    if (processedVariations.length > 0 && !selectedOption) {
      showPopup(t('selectOptionWarning'), "warning");
      return;
    }

    setIsAdding(true);

    try {
      const currentUserId = user.id || user.uid;
      const optionName = selectedOption ? selectedOption.option_name : "";
      
      const cartDocId = `${product.product_id}_${optionName || 'default'}_${type.toLowerCase()}`;
      const cartItemRef = doc(db, "users", currentUserId, "carts", cartDocId);

      const cartSnap = await getDoc(cartItemRef);
      const savedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

      if (cartSnap.exists()) {
        const existingData = cartSnap.data();
        const currentQty = existingData.quantity || 0;
        
        let newQty = currentQty + quantity;
        if (newQty > displayStock) newQty = displayStock;

        await updateDoc(cartItemRef, { 
          quantity: newQty
        });
      } else {
        await setDoc(cartItemRef, {
          booth_id: product.booth_id || "",
          cart_id: cartDocId,
          checked: false,
          image: selectedOption?.image || coverImg,
          option_name: optionName,
          price: product.price || 0,
          product_id: product.product_id,
          product_name: product.name,
          quantity: quantity,
          type: savedType,
          user_id: currentUserId,
          variation_name: selectedOption ? selectedOption.variation_name : ""
        });
      }

      showPopup(t('addToCartSuccess'), "success");

    } catch (error) {
      console.error("Error adding to cart:", error);
      showPopup(t('errorPrefix') + error.message, "error");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-gray-100 max-w-6xl mx-auto animate-fade-in relative">
      
      <button onClick={onBack} className="mb-8 flex items-center text-gray-400 hover:text-pink-500 font-bold transition-all group">
        <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> {t('backToStore')}
      </button>

      <div className="flex flex-col md:flex-row gap-10">
        
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          <div className="aspect-square w-full rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 relative">
            
            {/* Badge R-18 แปะบนรูปฝั่งซ้าย */}
            {isAdult && (
              <div className="absolute top-4 left-4 z-20 bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded shadow-md">
                R-18
              </div>
            )}

            <img src={mainImage} alt="" className="w-full h-full object-contain" onError={(e) => e.target.src = "https://placehold.co/400x400?text=No+Image"} />
            
            {/* ฟิลเตอร์สีแดงอ่อนๆ สำหรับสินค้า 18+ */}
            {isAdult && <div className="absolute inset-0 bg-rose-900/5 pointer-events-none"></div>}
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {allImages.map((img, idx) => (
              <button key={idx} onClick={() => setMainImage(img)} className={`w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${mainImage === img ? 'border-pink-500' : 'border-transparent opacity-60'}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="w-full md:w-1/2 flex flex-col">
          <div className="mb-6">
             <span className="inline-block text-pink-500 font-bold text-xs md:text-sm bg-pink-50 px-3 py-1 rounded-full mb-3 uppercase tracking-wide">
               {categoryPath}
             </span>
             <h1 className="text-3xl font-black text-gray-800">{product.name}</h1>
             <p className="text-gray-500 mt-2 whitespace-pre-wrap">{product.description}</p>

             {/* ส่วนเพิ่มลิงก์ Pre-order และ R-18 (รองรับ 2 ภาษา) */}
             {(product.preorderLink || product.r18Link) && (
               <div className="mt-4 flex flex-col gap-2 p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                 {product.preorderLink && (
                   <a href={product.preorderLink} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-2 w-fit">
                     <span>🔗</span> {lang === 'th' ? 'ลิงก์พรีออเดอร์' : 'Pre-order Link'}
                   </a>
                 )}
                 {product.r18Link && (
                   <a href={product.r18Link} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-2 w-fit">
                     <span>🔗</span> {lang === 'th' ? 'ลิงก์ตัวอย่างเนื้อหา R-18' : 'R-18 Content Preview Link'}
                   </a>
                 )}
               </div>
             )}
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl mb-8 flex flex-wrap items-center gap-3">
            <span className="text-4xl font-black text-pink-500">฿{product.price}</span>
            {product.preorder && (
              <span className="text-sm font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-lg border border-orange-200 shadow-sm">
                PRE-ORDER
              </span>
            )}
            {/* ป้าย R-18 ข้างๆ ราคา */}
            {isAdult && (
              <span className="text-sm font-black text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-200 shadow-sm">
                R-18
              </span>
            )}
          </div>

          {processedVariations.map((v, idx) => (
            <div key={idx} className="mb-6">
              <p className="font-bold mb-3">{t('selectLabel')} {v.name}:</p>
              <div className="flex flex-wrap gap-3">
                {v.options?.map((opt, optIdx) => (
                  <button key={optIdx} disabled={opt.stock === 0} onClick={() => handleSelectOption(opt)}
                    className={`p-2 border-2 rounded-xl transition-all ${selectedOption?.name === opt.name ? 'border-pink-500 bg-white' : 'border-gray-100 bg-white'} ${opt.stock === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}>
                    {opt.image && <img src={opt.image} className="w-12 h-12 rounded-lg mb-1" alt="" />}
                    <p className="text-xs font-bold">{opt.name}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border p-4 rounded-2xl">
              <span className="font-bold">{t('qtyLabel')}</span>
              <div className="flex items-center gap-4">
                <button onClick={() => handleQuantityChange('decrease')} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">-</button>
                <span className="font-bold">{quantity}</span>
                <button onClick={() => handleQuantityChange('increase')} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">+</button>
              </div>
            </div>
            
            <p className="text-right text-sm font-medium text-gray-400">
              {t('refStock')}<span className={displayStock === 0 ? 'text-red-500' : 'text-gray-600'}>{displayStock} {t('pieces')}</span>
              {selectedOption && ` (${t('patternLabel')}${selectedOption.name})`}
            </p>
          </div>

          <div className="mt-8 flex gap-4">
            <button 
              onClick={handleReserveClick} 
              disabled={isAdding || displayStock === 0 || !product.preorder} 
              className="flex-1 border-2 border-pink-500 text-pink-500 py-4 rounded-2xl font-black transition-all hover:bg-pink-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {t('reserveBtn')}
            </button>
            {/* ✨ เปลี่ยน onClick เป็น handleWishlistClick */}
            <button onClick={handleWishlistClick} disabled={isAdding || displayStock === 0} className="flex-[1.5] bg-pink-500 text-white py-4 rounded-2xl font-black shadow-lg transition-all hover:bg-pink-600 disabled:bg-gray-300 disabled:shadow-none flex justify-center items-center">
               {isAdding ? (
                 <span className="animate-pulse">{t('addingBtn')}</span>
               ) : t('addCartBtn')}
            </button>
          </div>
        </div>
      </div>

      {popup.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in px-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center transform transition-all scale-100">
            
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 text-2xl font-black
              ${popup.type === 'success' ? 'bg-green-100 text-green-500' : 
                popup.type === 'error' ? 'bg-red-100 text-red-500' : 
                popup.type === 'confirm' ? 'bg-blue-100 text-blue-500' : 
                'bg-yellow-100 text-yellow-500'}`}>
              {popup.type === 'success' && '✓'}
              {popup.type === 'error' && '✕'}
              {(popup.type === 'warning' || popup.type === 'confirm') && '!'}
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {popup.type === 'success' ? t('popupSuccess') : 
               popup.type === 'error' ? t('popupError') : 
               popup.type === 'confirm' ? t('confirmSelection') : t('popupAlert')}
            </h3>
            
            <p className="text-gray-600 mb-8 leading-relaxed whitespace-pre-wrap">{popup.message}</p>
            
            {popup.type === 'confirm' ? (
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setPopup({ ...popup, isOpen: false, onCloseAction: null })}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  {t('cancelBtn')}
                </button>
                <button
                  onClick={closePopup}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  {t('confirmBtn')}
                </button>
              </div>
            ) : (
              <button
                onClick={closePopup}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                {t('btnOk')}
              </button>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetail;