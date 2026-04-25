import React, { useState, useEffect } from "react";
import SellerCalOptionProduct from './SellerCaloptionproduct';
import SellerCalhistory from './SellerCalhistory'; 
import { doc, getDoc, updateDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../firebase"; 

const SellerCalculate = () => {
  const [boothData, setBoothData] = useState(null);
  const [selectedCreator, setSelectedCreator] = useState("ทั้งหมด");
  const [cart, setCart] = useState([]); 
  const [selections, setSelections] = useState({}); 
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProductForOption, setSelectedProductForOption] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // เพิ่ม State สำหรับเก็บวิธีชำระเงิน
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const BOOTH_ID = "b_0001"; 

  const fetchBoothData = async () => {
    try {
      const docRef = doc(db, "booths", BOOTH_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setBoothData(docSnap.data());
      }
    } catch (error) {
      console.error("Error fetching booth:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoothData();
  }, []);

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
    const hasVariations = product.variations && product.variations.length > 0;
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
    const hasVariations = product.variations && product.variations.length > 0;
    let varName = "";
    let optName = "";

    if (hasVariations) {
      const selected = selections[product.id];
      if (selected) {
        varName = selected.variationName;
        optName = selected.optionName;
      } else {
        varName = product.variations[0].name;
        optName = product.variations[0].options[0].name;
      }
    }

    const key = getCartKey(product.id, varName, optName);
    const existingItem = cart.find(item => item.cartKey === key);
    let currentQty = existingItem ? existingItem.quantity : 0;
    let newQty = currentQty + delta;

    if (newQty < 0) newQty = 0;

    if (newQty === 0) {
      setCart(cart.filter(item => item.cartKey !== key));
    } else {
      if (existingItem) {
        setCart(cart.map(item => item.cartKey === key ? { ...item, quantity: newQty } : item));
      } else {
        setCart([...cart, {
          cartKey: key,
          product_id: product.id,
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
    if (cart.length === 0) return;
    setLoading(true);

    try {
      const updatedProducts = boothData.products.map(product => {
        let updatedProduct = { ...product };
        const cartItemsForThisProduct = cart.filter(c => c.product_id === product.id);
        
        cartItemsForThisProduct.forEach(cartItem => {
          if (!updatedProduct.variations) {
            updatedProduct.stock = Math.max(0, updatedProduct.stock - cartItem.quantity);
          } else {
            updatedProduct.variations = updatedProduct.variations.map(variation => {
              if (variation.name === cartItem.variation) {
                return {
                  ...variation,
                  options: variation.options.map(opt => {
                    if (opt.name === cartItem.option) {
                      return { ...opt, stock: Math.max(0, opt.stock - cartItem.quantity) };
                    }
                    return opt;
                  })
                };
              }
              return variation;
            });
            updatedProduct.stock = Math.max(0, updatedProduct.stock - cartItem.quantity);
          }
        });
        return updatedProduct;
      });

      const boothRef = doc(db, "booths", BOOTH_ID);
      await updateDoc(boothRef, { products: updatedProducts });

      const transactionData = {
        booth_id: BOOTH_ID,
        buyer_id: "u_000001", 
        transaction_date: new Date().toISOString(),
        status: "completed",
        payment_method: paymentMethod, 
        total_amount: totalAmount,
        items_detail: cart.map((item, index) => ({
          id: `ti_${String(Date.now()).slice(-8)}_${index}`,
          product_id: item.product_id,
          name: item.name,
          variation: item.variation,
          option: item.option,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity
        }))
      };

      await addDoc(collection(db, "transactions"), transactionData);

      setCart([]);
      setIsPopupOpen(false);
      setBoothData({ ...boothData, products: updatedProducts });
      alert("บันทึกการขายและตัดสต็อกเรียบร้อย!");

    } catch (error) {
      console.error("Checkout failed:", error);
      alert("เกิดข้อผิดพลาดในการทำรายการ");
    } finally {
      setLoading(false);
    }
  };

  if (showHistory) {
    return <SellerCalhistory onBack={() => setShowHistory(false)} />;
  }

  if (loading && !boothData) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
      <p className="text-purple-500 font-bold">กำลังโหลดข้อมูล...</p>
    </div>
  );

  const allCreators = boothData ? ["ทั้งหมด", boothData.mainCreator, ...(boothData.coCreators || [])] : [];
  const displayProducts = boothData?.products?.filter(p =>
    selectedCreator === "ทั้งหมด" ? true : (p.creator || boothData.mainCreator) === selectedCreator
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-fade-in relative p-4 md:p-8">
      
      {/* 🌟 กรอบเทาพื้นหลังขาวล้อมรอบทั้งหมดตั้งแต่ bar บนถึง bar ล่าง 🌟 */}
      {/* ซ้าย: หัวข้อตัวสีดำ */}
          <div className="w-full flex justify-between text-black font-black text-xl px-6 py-4 whitespace-nowrap flex items-center">
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Calculate total price</h1>

            {/* ขวา: ปุ่มประวัติการขาย */}
            <div className="flex items-center"><button 
              className="bg-blue-600 text-white px-6 py-2 text-lg font-bold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm" 
              onClick={() => setShowHistory(true)}
            >
              ประวัติการขาย
            </button></div>
          </div>
      

      <div className="flex flex-col flex-1 w-full max-w-[1600px] mx-auto border-2 border-gray-300 bg-white shadow-sm overflow-hidden">
        
          
        {/* 1. แถบด้านบน: หัวข้อตัวสีดำทางซ้าย, Tabs เลือกระหว่างนักวาดตรงกลาง, ปุ่มประวัติขวาสุด */}
        <div className="flex items-stretch justify-between border-b-2 border-gray-300 w-full bg-white">
          
          

          {/* กลาง: Tabs เลือกระหว่างนักวาด (มีเส้นคั่นซ้าย-ขวา) */}
          <div className="flex flex-1 overflow-x-auto border-x-2 border-gray-300">
            {allCreators.map((creator, index) => (
              <button 
                key={index} 
                className={`flex-1 p-4 text-lg font-bold cursor-pointer transition-colors whitespace-nowrap border-r border-gray-200 last:border-r-0 ${selectedCreator === creator ? "bg-purple-50 text-purple-600" : "bg-white text-gray-500 hover:bg-purple-50 hover:text-purple-600"}`}
                onClick={() => setSelectedCreator(creator)}
              >
                {creator === "ทั้งหมด" ? "🌟 รวมทั้งหมด" : `🎨 ${creator}`}
              </button>
            ))}
          </div>

          
        </div>

        {/* 2. Grid Layout แสดงผลตามนักวาดที่เลือก */}
        <div className="p-4 md:p-6 flex-1 overflow-y-auto bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {displayProducts.map(product => {
              const hasVariations = product.variations && product.variations.length > 0;
              const coverImage = product.product_images?.cover_image;
              
              let currentQty = 0;
              cart.forEach(item => { if (item.product_id === product.id) currentQty += item.quantity; });

              return (
                <div 
                  className="bg-white border-2 border-gray-100 rounded-2xl flex flex-col overflow-hidden cursor-pointer hover:scale-105 hover:shadow-xl hover:border-purple-300 transition-all duration-300 group" 
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                >
                  <div 
                    className="h-36 bg-purple-100 flex items-center justify-center text-purple-400 text-2xl font-bold border-b border-gray-100 bg-cover bg-center group-hover:scale-105 transition-transform" 
                    style={coverImage ? { backgroundImage: `url(${coverImage})` } : {}}
                  >
                    {!coverImage && product.name}
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between font-bold text-gray-700 mb-1 text-sm md:text-base">
                      <span className="line-clamp-2">{product.name}</span>
                      <span className="text-purple-600 font-black">฿{product.price}</span>
                    </div>
                    
                    <div className="text-xs text-gray-400 mb-3 bg-gray-50 inline-block px-2 py-0.5 rounded w-fit">
                      นักวาด: {product.creator || boothData.mainCreator}
                    </div>
                    
                    {hasVariations ? (
                      <div className="text-sm text-blue-500 mb-2 font-bold flex items-center gap-1">
                        <span>▶</span> คลิกเพื่อเลือกตัวเลือก
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 mb-2">
                        คงเหลือ: <span className="font-bold">{product.stock}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-end mt-auto">
                      <div></div> 
                      <div className="flex items-center border-2 border-purple-200 rounded-lg bg-white w-fit">
                        <button 
                          className="text-purple-600 text-xl cursor-pointer px-3 py-1 hover:bg-purple-100 transition-colors font-bold rounded-l-md" 
                          onClick={(e) => { e.stopPropagation(); updateQuantity(product, -1); }}
                        >
                          -
                        </button>
                        <div className="text-center border-x-2 border-purple-200 px-4 py-1 font-bold text-gray-700 bg-gray-50">
                          {currentQty}
                        </div>
                        <button 
                          className="text-purple-600 text-xl cursor-pointer px-3 py-1 hover:bg-purple-100 transition-colors font-bold rounded-r-md" 
                          onClick={(e) => { e.stopPropagation(); updateQuantity(product, 1); }}
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

        {/* 3. แถบ Footer */}
        <div className="bg-white border-t-4 border-purple-500 p-4 md:px-8 mt-auto w-full">
          <div className="flex justify-between items-center w-full">
            <div className="text-xl md:text-3xl font-black text-gray-800">
              ยอดรวม: <span className="text-purple-600">฿{totalAmount}</span>
            </div>
            
            {/* แบ่งปุ่มชำระเงินเป็น Transfer และ Cash */}
            <div className="flex gap-4">
              <button 
                className="bg-blue-400 text-white border-2 border-blue-400 px-6 py-3 md:px-8 rounded-xl text-lg font-bold hover:bg-white hover:text-blue-400 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={() => { setPaymentMethod("transfer"); setIsPopupOpen(true); }}
                disabled={totalAmount === 0 || loading}
              >
                {loading ? "..." : "Transfer"}
              </button>
              <button 
                className="bg-green-400 text-white border-2 border-green-400 px-6 py-3 md:px-8 rounded-xl text-lg font-bold hover:bg-white hover:text-green-400 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={() => { setPaymentMethod("cash"); setIsPopupOpen(true); }}
                disabled={totalAmount === 0 || loading}
              >
                {loading ? "..." : "Cash"}
              </button>
            </div>
          </div>
        </div>

      </div> {/* สิ้นสุดกรอบเทาคลุมทั้งหมด */}

      {/* Popup Confirm */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] transition-opacity">
          <div className="bg-white p-8 rounded-3xl text-center min-w-[320px] shadow-2xl animate-fade-in border border-purple-100">
            <div className="text-5xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">ยืนยันการทำรายการ?</h2>
            {/* แสดงวิธีชำระเงินให้คนขายตรวจสอบก่อนยืนยัน */}
            <p className="text-gray-500 mb-2">ชำระผ่าน: <span className={`font-bold uppercase ${paymentMethod === 'cash' ? 'text-green-600' : 'text-blue-600'}`}>{paymentMethod}</span></p>
            <p className="text-gray-500 mb-6">ยอดชำระทั้งหมด <span className="text-purple-600 font-bold text-xl">฿{totalAmount}</span></p>
            <div className="flex justify-around gap-4 mt-6">
              <button className="flex-1 bg-gray-100 text-gray-600 px-4 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors" onClick={() => setIsPopupOpen(false)}>ยกเลิก</button>
              <button className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-purple-700 shadow-md transition-colors" onClick={handleConfirmCheckout}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {/* หน้าต่าง Popup สำหรับสินค้าที่มี Option */}
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