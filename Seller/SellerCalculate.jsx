import React, { useState, useEffect } from "react";
import SellerCalOptionProduct from './SellerCaloptionproduct';
import SellerCalhistory from './SellerCalhistory'; 
import {
  doc, collection, query, where, getDocs, writeBatch,
  or, limit, onSnapshot // <--- [จุดที่แก้ที่ 1] เพิ่ม onSnapshot เข้ามา
} from "firebase/firestore"; 
import { db } from "../firebase"; 
import { useLanguage } from '../LanguageContext';
 
const SellerCalculate = ({ user }) => {
  const { t } = useLanguage();
  const [boothData, setBoothData] = useState(null);
  const [products, setProducts] = useState([]); 
  const [selectedCreator, setSelectedCreator] = useState("all");
  const [cart, setCart] = useState([]); 
  const [selections, setSelections] = useState({}); 
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProductForOption, setSelectedProductForOption] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [alertPopup, setAlertPopup] = useState({ isOpen: false, type: '', message: '' });
 
  // [จุดที่แก้ที่ 2] รวม fetchBoothData กับ useEffect เข้าด้วยกัน และเปลี่ยนมาใช้ onSnapshot
  useEffect(() => {
    if (!user?.username) return; 

    setLoading(true);
    let unsubscribeProducts = null;

    // 1. ดึงและติดตามข้อมูล Booth แบบ Real-time
    const qBooth = query(
      collection(db, "booths"),
      or(
        where("main_creator", "==", user.username),
        where("co_creators", "array-contains", user.username)
      ),
      limit(1)
    );

    const unsubscribeBooth = onSnapshot(qBooth, (boothSnapshot) => {
      if (!boothSnapshot.empty) {
        const fetchedBooth = { docId: boothSnapshot.docs[0].id, ...boothSnapshot.docs[0].data() };
        setBoothData(fetchedBooth);

        // 2. เมื่อได้ Booth แล้ว ให้ดึงข้อมูล Products ของBooth นี้แบบ Real-time 
        if (fetchedBooth.booth_id) {
          const qProducts = query(
            collection(db, "products"), 
            where("booth_id", "==", fetchedBooth.booth_id)
          );
          
          // ยกเลิกการติดตาม product เก่า (ถ้ามี) ก่อนเริ่มติดตามใหม่
          if (unsubscribeProducts) unsubscribeProducts();

          unsubscribeProducts = onSnapshot(qProducts, (productsSnapshot) => {
            const productsData = productsSnapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
            setProducts(productsData);
            setLoading(false);
          }, (error) => {
            console.error("Error fetching products:", error);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error fetching booth:", error);
      setLoading(false);
    });

    // Cleanup: ยกเลิกการติดตามข้อมูลเมื่อผู้ใช้ออกจากหน้านี้ (ประหยัด Cost)
    return () => {
      unsubscribeBooth();
      if (unsubscribeProducts) unsubscribeProducts();
    };
  }, [user]);
 
  const handleSelectionChange = (productId, variationName, optionName) => {
    setSelections(prev => ({
      ...prev,
      [productId]: { variationName, optionName }
    }));
  };
 
  const getCartKey = (productId, variationName, optionName) => {
    return `${productId}-${variationName || 'none'}-${optionName || 'none'}`;
  };
 
  const handleProductClick = (product) => {
    const hasVariations = product.has_variations; 
    if (hasVariations) {
      setSelectedProductForOption(product);
    } else {
      updateQuantity(product, 1);
    }
  };
 
  const handleOptionConfirm = (selectedItems) => {
    let newCart = [...cart];
    selectedItems.forEach(newItem => {
      const key = `${newItem.product_id}-${newItem.variation}-${newItem.option}`;
      const existingIndex = newCart.findIndex(item => item.cartKey === key);
      
      if (existingIndex >= 0) {
        newCart[existingIndex].quantity = newItem.quantity; 
      } else {
        newCart.push({ ...newItem, cartKey: key }); 
      }
    });
    setCart(newCart.filter(item => item.quantity > 0));
    setSelectedProductForOption(null); 
  };
 
  const updateQuantity = (product, delta) => {
    const hasVariations = product.has_variations;
    let varName = "";
    let optName = "";
 
    if (hasVariations && product.variations && product.variations.length > 0) {
      const selected = selections[product.product_id];
      if (selected) {
        varName = selected.variationName;
        optName = selected.optionName;
      } else {
        varName = product.variations[0].variation_name;
        optName = product.variations[0].option_name;
      }
    }
 
    const key = getCartKey(product.product_id, varName, optName);
    const existingItem = cart.find(item => item.cartKey === key);
    let currentQty = existingItem ? existingItem.quantity : 0;
    let newQty = currentQty + delta;
 
    if (newQty < 0) newQty = 0;
 
    if (!hasVariations && delta > 0 && newQty > product.total_stock) {
      setAlertPopup({ isOpen: true, type: 'error', message: t('stockLimitAlert') || 'สินค้าเกินจำนวนสต๊อก' });
      return; // หยุดการทำงาน ไม่เพิ่มจำนวน
    }
 
    if (newQty === 0) {
      setCart(cart.filter(item => item.cartKey !== key));
    } else {
      if (existingItem) {
        setCart(cart.map(item => item.cartKey === key ? { ...item, quantity: newQty } : item));
      } else {
        setCart([...cart, {
          cartKey: key,
          product_id: product.product_id,
          name: product.name,
          price: product.price,
          variation: varName,
          option: optName,
          quantity: newQty
        }]);
      }
    }
  };
 
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
 
  const handleConfirmCheckout = async () => {
    if (cart.length === 0 || !boothData) return;
    setLoading(true);
 
    try {
      const batch = writeBatch(db);
      const updatedProductsList = [...products];
      const cartByProduct = {};
      
      cart.forEach(item => {
        if(!cartByProduct[item.product_id]) cartByProduct[item.product_id] = [];
        cartByProduct[item.product_id].push(item);
      });
 
      for (const productId of Object.keys(cartByProduct)) {
        const productIndex = updatedProductsList.findIndex(p => p.product_id === productId);
        if (productIndex === -1) continue;
 
        const productToUpdate = { ...updatedProductsList[productIndex] };
        const productRef = doc(db, "products", productToUpdate.docId);
        const cartItemsForThisProduct = cartByProduct[productId];
 
        cartItemsForThisProduct.forEach(cartItem => {
          if (!productToUpdate.has_variations) {
            productToUpdate.total_stock = Math.max(0, productToUpdate.total_stock - cartItem.quantity);
          } else {
            productToUpdate.variations = productToUpdate.variations.map(variation => {
              if (variation.variation_name === cartItem.variation && variation.option_name === cartItem.option) {
                return { ...variation, stock: Math.max(0, variation.stock - cartItem.quantity) };
              }
              return variation;
            });
            productToUpdate.total_stock = Math.max(0, productToUpdate.total_stock - cartItem.quantity);
          }
        });
 
        batch.update(productRef, {
          total_stock: productToUpdate.total_stock,
          ...(productToUpdate.has_variations ? { variations: productToUpdate.variations } : {})
        });
 
        updatedProductsList[productIndex] = productToUpdate; 
      }
 
      // 3. ปรับโครงสร้างTransaction ให้ตรงกับ Firestoreเป๊ะๆ
      const transactionRef = doc(collection(db, "transactions"));
      const currentDate = new Date();
      // Format วันที่ DD/MM/YYYY ตามตัวอย่าง
      const formattedDateOnly = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`; 
 
      const transactionData = {
        booth_id: boothData.booth_id,
        user_id: user.username, 
        transaction_id: transactionRef.id,
        transaction_date: currentDate.toISOString(),
        date_only: formattedDateOnly, 
        payment_method: paymentMethod, 
        total_amount: totalAmount,
        items_detail: cart.map((item, index) => {
          // ดึงข้อมูลสินค้าเดิมเพื่อเอา Image และCategory
          const refProd = updatedProductsList.find(p => p.product_id === item.product_id);
          const coverImage = refProd?.cover_image || (refProd?.extra_images ? refProd.extra_images.split(',')[0] : "");
 
          return {
            transitem_id: `ti_${String(Date.now()).slice(-8)}_${index}`,
            transaction_id: transactionRef.id, 
            product_id: item.product_id,
            product_name: item.name,
            variation_name: item.variation || "",
            option_name: item.option || "",
            price_per_unit: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
            creator: refProd?.creator || boothData.main_creator,
            category_path: refProd?.category_path || "",
            image: coverImage || "" 
          };
        })
      };
 
      batch.set(transactionRef, transactionData);
      await batch.commit();
 
      setCart([]);
      setIsPopupOpen(false);
      setProducts(updatedProductsList); 
      
      setAlertPopup({ isOpen: true, type: 'success', message: t('checkoutSuccess') });
 
    } catch (error) {
      console.error("Checkout failed:", error);
 
      setAlertPopup({ isOpen: true, type: 'error', message: t('checkoutError') });
      
    } finally {
      setLoading(false);
    }
  };
 
  if (showHistory) {
    return (
      <SellerCalhistory 
        onBack={() => setShowHistory(false)}
        boothId={boothData?.booth_id} 
      />
    );
  }
 
  if (loading && !boothData) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
      <p className="text-purple-500 font-bold">{t('loading')}</p>
    </div>
  );
 
  const allCreators = boothData ? ["all", boothData.main_creator, ...(boothData.co_creators || [])] : [];
  
  const displayProducts = products?.filter(p =>
    selectedCreator === "all" ? true : (p.creator || boothData?.main_creator) === selectedCreator
  ) || [];
 
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-fade-in relative p-4 md:p-8">
      
      {/* 1. ส่วนหัวที่ถูกย้ายขึ้นมาด้านบน แบบหน้า Shopping Cart */}
      <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-6 px-2 gap-4 md:gap-0">
        <h1 className="text-2xl md:text-3xl font-black font-bold text-gray-800">
          {t('calculate')}
        </h1>
        <button 
          className="flex items-center gap-2 text-blue-500 hover:text-blue-600 font-bold transition-colors text-lg" 
          onClick={() => setShowHistory(true)}
        >
          <span className="text-xl">🕒</span> {t('salesHistory')}
        </button>
      </div>
 
      {/* 2. เพิ่ม rounded-2xlเข้ามาเพื่อให้ขอบกรอบมนขึ้น และครอบคลุมไปถึงด้านล่างสุด */}
      <div className="flex flex-col flex-1 w-full max-w-[1600px] mx-auto border-2 border-gray-300 bg-white shadow-sm overflow-hidden rounded-2xl">
        
        {/* 3. แถบรายชื่อ Creator (นำหัวข้อและปุ่มด้านข้างออกไปแล้ว) */}
        <div className="flex items-stretch border-b-2 border-gray-300 w-full bg-white">
          <div className="flex flex-1 overflow-x-auto">
            {allCreators.map((creator, index) => (
              <button 
                key={index}
                className={`flex-1 p-4 text-lg font-bold cursor-pointer transition-colors whitespace-nowrap border-r border-gray-200 last:border-r-0 ${selectedCreator === creator ? "bg-purple-50 text-purple-600" : "bg-white text-gray-500 hover:bg-purple-50 hover:text-purple-600"}`}
                onClick={() => setSelectedCreator(creator)}
              >
                {creator === "all" ? t('allCreators') : `🎨 ${creator}`}
              </button>
            ))}
          </div>
        </div>
 
        <div className="p-4 md:p-6 flex-1 overflow-y-auto bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {displayProducts.map(product => {
              const hasVariations = product.has_variations;
              const coverImage = product.cover_image || (product.extra_images ? product.extra_images.split(',')[0] : null); 
              
              let currentQty = 0;
              cart.forEach(item => { if (item.product_id === product.product_id) currentQty += item.quantity; });
 
              return (
                <div 
                  className="bg-white border-2 border-gray-100 rounded-2xl flex flex-col overflow-hidden cursor-pointer hover:scale-105 hover:shadow-xl hover:border-purple-300 transition-all duration-300 group" 
                  key={product.product_id}
                  onClick={() => handleProductClick(product)}
                >
                  <div 
                    className="w-full aspect-square bg-purple-100 flex items-center justify-center text-purple-400 text-2xl font-bold border-b border-gray-100 bg-cover bg-center group-hover:scale-105 transition-transform" 
                    style={coverImage ? { backgroundImage: `url(${coverImage})` } : {}}
                  >
                    {!coverImage && product.name}
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between font-bold text-gray-700 mb-1 text-sm md:text-base">
                      <span className="line-clamp-2">{product.name}</span>
                      <span className="text-purple-600 font-black">฿{product.price}</span>
                    </div>
                    
                    <div className="text-xs text-gray-600 mb-3 bg-gray-50 inline-block px-2 py-0.5 rounded w-fit">
                      {product.creator || boothData?.main_creator}
                    </div>
                    
                    {hasVariations ? (
                      <div className="text-sm text-blue-500 mb-2 font-bold flex items-center gap-1">
                        <span>▶</span> {t('options')}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 mb-2">
                        {t('stock')} <span className="font-bold">{product.total_stock}</span>
                      </div>
                    )}
 
                    <div className="flex justify-end items-end mt-auto w-full">
                      <div className="flex items-center border-2 border-purple-200 rounded-lg bg-white max-w-full">
                        <button
                          className="text-purple-600 text-lg md:text-xl cursor-pointer px-2 md:px-3 py-1 hover:bg-purple-100 transition-colors font-bold rounded-l-md" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (hasVariations) {
                              setSelectedProductForOption(product);
                            } else {
                              updateQuantity(product, -1); 
                            }
                          }}
                        >
                          -
                        </button>
                        <div className="text-center border-x-2 border-purple-200 px-2 md:px-4 py-1 font-bold text-gray-700 bg-gray-50 text-sm md:text-base min-w-[32px] md:min-w-[40px]">
                          {currentQty}
                        </div>
                        <button
                          className="text-purple-600 text-lg md:text-xl cursor-pointer px-2 md:px-3 py-1 hover:bg-purple-100 transition-colors font-bold rounded-r-md" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (hasVariations) {
                              setSelectedProductForOption(product);
                            } else {
                              updateQuantity(product, 1); 
                            }
                          }}
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
 
        <div className="bg-white border-t-4 border-purple-500 p-4 md:px-8 mt-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-center w-full gap-4 md:gap-0">
            <div className="text-xl md:text-3xl font-black text-gray-800 w-full md:w-auto text-left">
              {t('total')} <span className="text-purple-600">฿{totalAmount}</span>
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
              <button 
                className="flex-1 md:flex-none bg-blue-400 text-white border-2 border-blue-400 px-6 py-3 md:px-8 rounded-xl text-lg font-bold hover:bg-white hover:text-blue-400 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={() => { setPaymentMethod("transfer"); setIsPopupOpen(true); }}
                disabled={totalAmount === 0 || loading}
              >
                {loading ? "..." : "Transfer"}
              </button>
              <button 
                className="flex-1 md:flex-none bg-green-400 text-white border-2 border-green-400 px-6 py-3 md:px-8 rounded-xl text-lg font-bold hover:bg-white hover:text-green-400 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={() => { setPaymentMethod("cash"); setIsPopupOpen(true); }}
                disabled={totalAmount === 0 || loading}
              >
                {loading ? "..." : "Cash"}
              </button>
            </div>
          </div>
        </div>
 
      </div> 
 
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] transition-opacity">
          <div className="bg-white p-8 rounded-3xl text-center min-w-[320px] shadow-2xl animate-fade-in border border-purple-100">
            <div className="text-5xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('confirmTitle')}</h2>
            <p className="text-gray-500 mb-2">{t('paymentVia')} <span className={`font-bold uppercase ${paymentMethod === 'cash' ? 'text-green-600' : 'text-blue-600'}`}>{paymentMethod}</span></p>
            <p className="text-gray-500 mb-6">{t('totalAmountText')} <span className="text-purple-600 font-bold text-xl">฿{totalAmount}</span></p>
            <div className="flex justify-around gap-4 mt-6">
              <button className="flex-1 bg-gray-100 text-gray-600 px-4 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors" onClick={() => setIsPopupOpen(false)}>{t('cancel')}</button>
              <button className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-purple-700 shadow-md transition-colors" onClick={handleConfirmCheckout}>{t('confirm')}</button>
            </div>
          </div>
        </div>
      )}
 
      {selectedProductForOption && (
        <SellerCalOptionProduct 
          product={selectedProductForOption}
          currentCart={cart}
          onConfirm={handleOptionConfirm}
          onCancel={() => setSelectedProductForOption(null)}
        />
      )}
 
    </div>
  );
};
 
export default SellerCalculate;