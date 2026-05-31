import React, { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useLanguage } from "./LanguageContext"; // 1. นำเข้า Hook ภาษา

function ProductDetail({ product, onBack, onRequireAuth, user, onGoToStore, isSellerView }) {
  const { lang, t } = useLanguage(); // 2. ดึงค่า lang และ t มาใช้งาน

  const coverImg = product.product_images?.cover_image || product.images?.[0] || "https://placehold.co/400x400?text=No+Image";
  const secondaryImages = product.product_images?.images || [];
  const allImages = coverImg ? [coverImg, ...secondaryImages] : secondaryImages;

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

  useEffect(() => {
    if (coverImg) setMainImage(coverImg);
  }, [coverImg]);

  const totalStock = product.variations?.reduce((acc, v) => {
    const optionSum = v.options?.reduce((sum, opt) => sum + (opt.stock || 0), 0) || 0;
    return acc + optionSum;
  }, 0) || product.stock || 0;

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

  const categoryPath = product.classification?.category
    ? product.classification.category.split('/').join(' > ') 
    : t('no_category');

  const showPopup = (message, type = 'info', onCloseAction = null) => {
    setPopup({ isOpen: true, message, type, onCloseAction });
  };

  const closePopup = () => {
    if (popup.onCloseAction) {
      popup.onCloseAction();
    }
    setPopup({ ...popup, isOpen: false, onCloseAction: null });
  };

  const handleAddToCart = async (type = 'Wishlist') => {
    if (isSellerView) {
      showPopup(t('seller_mode_warning'), "warning");
      return;
    }

    if (!user || (!user.id && !user.uid)) {
      showPopup(t('please_login_first'), "warning", onRequireAuth);
      return;
    }

    if (product.variations?.length > 0 && !selectedOption) {
      showPopup(t('select_options_sub'), "warning");
      return;
    }

    setIsAdding(true);
    try {
      const currentUserId = user.id || user.uid;
      const userRef = doc(db, "buyers", currentUserId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        let currentCart = userData.cart || [];

        const cartItemId = selectedOption ? `${product.id}-${selectedOption.name}` : product.id;
        const existingItemIndex = currentCart.findIndex(item => item.id === cartItemId);

        if (existingItemIndex !== -1) {
          const newQty = currentCart[existingItemIndex].quantity + quantity;
          currentCart[existingItemIndex].quantity = newQty > displayStock ? displayStock : newQty;
        } else {
          currentCart.push({
            id: cartItemId,
            product_id: product.id,
            name: product.name,
            price: product.price,
            image: selectedOption?.image || coverImg,
            variation: selectedOption?.name || "",
            type: type,
            quantity: quantity,
            checked: false
          });
        }

        await updateDoc(userRef, { cart: currentCart });
        showPopup(t('success_checkout'), "success");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      showPopup(t('error_checkout') + ": " + error.message, "error");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-gray-100 max-w-6xl mx-auto animate-fade-in relative">
      {/* ปุ่มย้อนกลับ */}
      <button onClick={onBack} className="mb-8 flex items-center text-gray-400 hover:text-pink-500 font-bold transition-all group">
        <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> {t('back_to_sell')}
      </button>

      <div className="flex flex-col md:flex-row gap-10">
        {/* รูปภาพสินค้า */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          <div className="aspect-square w-full rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
            <img src={mainImage} alt="" className="w-full h-full object-contain" onError={(e) => e.target.src = "https://placehold.co/400x400?text=No+Image"} />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {allImages.map((img, idx) => (
              <button key={idx} onClick={() => setMainImage(img)} className={`w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${mainImage === img ? 'border-pink-500' : 'border-transparent opacity-60'}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* รายละเอียด */}
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="mb-6">
             <span className="inline-block text-pink-500 font-bold text-xs md:text-sm bg-pink-50 px-3 py-1 rounded-full mb-3 uppercase tracking-wide">
               {categoryPath}
             </span>
             <h1 className="text-3xl font-black text-gray-800">{product.name}</h1>
             <p className="text-gray-500 mt-2">{product.description}</p>
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl mb-8 flex flex-wrap items-baseline gap-3">
            <span className="text-4xl font-black text-pink-500">฿{product.price}</span>
            {product.classification?.preorder && (
              <span className="text-sm font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-lg border border-orange-200 shadow-sm">
                PRE-ORDER
              </span>
            )}
          </div>

          {/* Variations */}
          {product.variations?.map((v, idx) => (
            <div key={idx} className="mb-6">
              <p className="font-bold mb-3">{lang === 'th' ? 'เลือก' : 'Select'} {v.name}:</p>
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
              <span className="font-bold">{t('table_quantity')}</span>
              <div className="flex items-center gap-4">
                <button onClick={() => handleQuantityChange('decrease')} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">-</button>
                <span className="font-bold">{quantity}</span>
                <button onClick={() => handleQuantityChange('increase')} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">+</button>
              </div>
            </div>
            
            <p className="text-right text-sm font-medium text-gray-400">
              {t('table_stock')}: <span className={displayStock === 0 ? 'text-red-500' : 'text-gray-600'}>{displayStock} {t('unit')}</span>
              {selectedOption && ` (${lang === 'th' ? 'ลาย' : 'Pattern'} ${selectedOption.name})`}
            </p>
          </div>

          <div className="mt-8 flex gap-4">
            <button onClick={() => handleAddToCart('Reserved')} disabled={isAdding || displayStock === 0} className="flex-1 border-2 border-pink-500 text-pink-500 py-4 rounded-2xl font-black transition-all hover:bg-pink-50 disabled:opacity-50 active:scale-95">
                🔖 {lang === 'th' ? 'จองสินค้า' : 'Pre-order'}
            </button>
            <button onClick={() => handleAddToCart('Wishlist')} disabled={isAdding || displayStock === 0} className="flex-[1.5] bg-pink-500 text-white py-4 rounded-2xl font-black shadow-lg transition-all hover:bg-pink-600 disabled:bg-gray-300 disabled:shadow-none flex justify-center items-center active:scale-95">
               {isAdding ? (
                 <span className="animate-pulse">{t('processing')}</span>
               ) : `🛒 ${t('cart')}`}
            </button>
          </div>
        </div>
      </div>

      {/* Popup Modal */}
      {popup.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in px-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 text-2xl font-black
              ${popup.type === 'success' ? 'bg-green-100 text-green-500' : 
                popup.type === 'error' ? 'bg-red-100 text-red-500' : 
                'bg-yellow-100 text-yellow-500'}`}>
              {popup.type === 'success' && '✓'}
              {popup.type === 'error' && '✕'}
              {popup.type === 'warning' && '!'}
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {popup.type === 'success' ? t('confirm') : popup.type === 'error' ? t('error_delete') : t('confirm')}
            </h3>
            
            <p className="text-gray-600 mb-8">{popup.message}</p>
            
            <button
              onClick={closePopup}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95"
            >
              {t('confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetail;