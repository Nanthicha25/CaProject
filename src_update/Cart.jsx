import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, updateDoc, collection, getDocs, query, where, addDoc, setDoc } from 'firebase/firestore';
import History from './History';
import { useLanguage } from "./LanguageContext"; // 1. นำเข้า Hook

function Cart({ user }) {
  const { t, lang } = useLanguage(); // 2. ดึง t และ lang มาใช้งาน
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allProducts, setAllProducts] = useState({}); 
  const [userDocId, setUserDocId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [tempSelectedOption, setTempSelectedOption] = useState("");

  const [showHistory, setShowHistory] = useState(false);

  const [popup, setPopup] = useState({
    isOpen: false,
    message: '',
    type: 'info', 
    onConfirm: null 
  });

  const showPopup = (type, message, onConfirm = null) => {
    setPopup({ isOpen: true, type, message, onConfirm });
  };

  const closePopup = () => {
    setPopup({ ...popup, isOpen: false });
  };

  const handlePopupConfirm = () => {
    if (popup.onConfirm) {
      popup.onConfirm();
    }
    closePopup();
  };

  const handleConfirm = () => {
    const selectedItems = cartItems.filter(item => item.checked);
    if (selectedItems.length === 0) return;

    const totalQty = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

    // ปรับข้อความยืนยันแบบ Dynamic
    const confirmMsg = lang === 'th' 
      ? `ยืนยันการสั่งซื้อสินค้าจำนวน ${totalQty} รายการ?` 
      : `Confirm purchase of ${totalQty} items?`;

    showPopup('confirm', confirmMsg, async () => {
      try {
        const allbuysRef = collection(db, "allbuys");
        const allbuysSnap = await getDocs(allbuysRef);
        let nextNumber = allbuysSnap.size + 1;

        const boothGroups = selectedItems.reduce((acc, item) => {
          const info = getProductInfo(item);
          const bId = item.booth_id || "unknown";
          if (!acc[bId]) acc[bId] = [];
          acc[bId].push({ item, info });
          return acc;
        }, {});

        for (const bId in boothGroups) {
          const group = boothGroups[bId];
          const totalAmount = group.reduce((sum, g) => sum + (g.item.price * g.item.quantity), 0);
          const newDocId = `a_${String(nextNumber).padStart(6, '0')}`;

          const newTransaction = {
            booth_id: bId,
            buyer_id: userDocId,
            id: newDocId,
            transaction_date: new Date().toISOString(),
            total_amount: totalAmount,
            items_detail: group.map(g => ({
              id: `ai_${Date.now()}_${g.item.id}`,
              name: g.info.name,
              option: g.item.type,
              price: g.item.price,
              product_id: g.item.product_id,
              quantity: g.item.quantity,
              subtotal: g.item.price * g.item.quantity,
              variation: g.item.option || g.item.variation || ""
            }))
          };

          await setDoc(doc(db, "allbuys", newDocId), newTransaction);
          nextNumber++;
        }

        const remainingCart = cartItems.filter(item => !item.checked);
        await saveCart(remainingCart);

        showPopup('success', lang === 'th' ? "บันทึกการสั่งซื้อเรียบร้อยแล้ว!" : "Order saved successfully!");
      } catch (error) {
        console.error("Error confirming order:", error);
        showPopup('error', (lang === 'th' ? "เกิดข้อผิดพลาด: " : "Error: ") + error.message);
      }
    });
  };

  useEffect(() => {
    const fetchAllBoothProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "booths"));
        let productMap = {};
        querySnapshot.forEach((doc) => {
          const boothData = doc.data();
          if (boothData.products) {
            boothData.products.forEach(p => {
              productMap[p.id] = {
                ...p,
                boothName: boothData.boothName || boothData.mainCreator || (lang === 'th' ? "ไม่ระบุชื่อบูธ" : "No booth name"),
                boothNumbers: boothData.boothNumbers || []
              };
            });
          }
        });
        setAllProducts(productMap);
      } catch (error) {
        console.error("Error mapping products:", error);
      }
    };
    fetchAllBoothProducts();
  }, [lang]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let unsubscribe = () => {};
    const q = query(collection(db, "buyers"), where("username", "==", user.username));
    
    unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setUserDocId(docSnap.id); 
        const data = docSnap.data();
        const items = (data.cart || []).map(item => ({
          ...item,
          checked: item.checked !== undefined ? item.checked : false 
        }));
        setCartItems(items);
      } else {
        setCartItems([]);
      }
      setLoading(false);
    }, (err) => {
      console.error("🔥 Firestore Error:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const getProductInfo = (item) => {
    const p = allProducts[item.product_id];
    if (!p) return { name: t('loading'), image: "https://placehold.co/100?text=Loading", stock: 0, boothName: "Loading...", boothNumbers: [], variations: [] };
    
    let img = p.product_images?.cover_image || p.images?.[0] || "https://placehold.co/100?text=No+Image";
    let currentStock = p.stock || 0;
    const currentOptName = item.option || item.variation;

    if (p.variations) {
      p.variations.forEach(v => {
        if (v.options) {
          const opt = v.options.find(o => o.name === currentOptName);
          if (opt) {
            if (opt.image) img = opt.image;
            if (opt.stock !== undefined) currentStock = opt.stock;
          }
        }
      });
    }
    return { name: p.name, image: img, stock: currentStock, boothName: p.boothName, boothNumbers: p.boothNumbers || [], variations: p.variations || [] };
  };

  const updateItemOption = (id, newOptionName) => {
    const newCart = cartItems.map(item => {
      if (item.id === id) {
        return { ...item, option: newOptionName, variation: newOptionName }; 
      }
      return item;
    });
    saveCart(newCart);
    setEditingItem(null); 
  };

  const saveCart = async (newCart) => {
    if (!userDocId) return;
    try {
      await updateDoc(doc(db, "buyers", userDocId), { cart: newCart });
    } catch (error) {
      console.error("Error updating cart:", error);
    }
  };

  const deleteItem = (id) => {
    showPopup('confirm', lang === 'th' ? "ลบรายการนี้ออกจากตะกร้าใช่หรือไม่?" : "Remove this item from cart?", () => {
      saveCart(cartItems.filter(item => item.id !== id));
    });
  };

  const deleteSelectedItems = () => {
    const itemsToDelete = cartItems.filter(item => item.checked).length;
    if (itemsToDelete === 0) return;
    
    showPopup('confirm', lang === 'th' ? `ต้องการลบสินค้าที่เลือกจำนวน ${itemsToDelete} รายการ ใช่หรือไม่?` : `Remove ${itemsToDelete} selected items?`, () => {
      saveCart(cartItems.filter(item => !item.checked));
    });
  };

  const updateQty = (id, change, max) => {
    const newCart = cartItems.map(item => {
      if (item.id === id) {
        const n = item.quantity + change;
        return (n >= 1 && n <= max) ? { ...item, quantity: n } : item;
      }
      return item;
    });
    saveCart(newCart);
  };

  const toggleItem = (id) => {
    const newCart = cartItems.map(item => item.id === id ? { ...item, checked: !item.checked } : item);
    setCartItems(newCart); 
  };

  const toggleAll = (e) => {
    const isChecked = e.target.checked;
    setCartItems(cartItems.map(item => {
      const info = getProductInfo(item);
      const isDisabled = info.stock <= 0 && item.type !== 'Reserved';
      return { ...item, checked: isDisabled ? false : isChecked };
    }));
  };

  const toggleBoothItems = (groupItems, isChecked) => {
    const idsToUpdate = groupItems.map(g => g.item.id);
    setCartItems(cartItems.map(item => {
      if (idsToUpdate.includes(item.id)) {
        const info = getProductInfo(item);
        const isDisabled = info.stock <= 0 && item.type !== 'Reserved';
        return { ...item, checked: isDisabled ? false : isChecked };
      }
      return item;
    }));
  };

  const selectedItems = cartItems.filter(item => item.checked);
  const totalPrice = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  const groupedCart = cartItems.reduce((acc, item) => {
    const info = getProductInfo(item);
    const boothKey = `${info.boothName}-${(info.boothNumbers || []).join(',')}`;
    if (!acc[boothKey]) {
      acc[boothKey] = { boothName: info.boothName, boothNumbers: info.boothNumbers || [], items: [] };
    }
    acc[boothKey].items.push({ item, info });
    return acc;
  }, {});

  if (!user) {
    return <div className="text-center py-20 text-gray-500 font-bold text-xl">{t('please_login_first')}</div>;
  }

  if (loading) return <div className="text-center py-20 text-pink-500 font-bold animate-pulse">{t('loading')}</div>;

  if (showHistory) {
    return <History user={user} onBack={() => setShowHistory(false)} />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-40 md:pb-32 animate-fade-in">
      <div className="flex justify-between items-center mb-6 pt-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">
          {t('cart')} {lang === 'th' ? 'ของ' : 'of'} {user.username}
        </h1>
        <button 
          onClick={() => setShowHistory(true)} 
          className="text-pink-500 font-bold hover:underline flex items-center gap-1 text-sm md:text-base"
        >
          <span>🕒</span> {t('history')}
        </button>
      </div>

      {/* Header Table (PC) */}
      <div className="bg-white p-4 rounded-t-lg border border-gray-200 hidden md:grid grid-cols-12 md:gap-2 text-gray-500 font-bold text-xs lg:text-sm uppercase tracking-wider mb-4">
        <div className="col-span-5 flex items-center gap-4">
          <input type="checkbox" onChange={toggleAll} checked={cartItems.length > 0 && selectedItems.length === cartItems.length} className="w-4 h-4 accent-pink-500 cursor-pointer"/>
          <span>{t('table_product')}</span>
        </div>
        <div className="col-span-1 text-center">{t('table_type')}</div>
        <div className="col-span-2 text-center">{t('table_stock')}</div>
        <div className="col-span-2 text-center">{t('table_quantity')}</div>
        <div className="col-span-1 text-center">{t('table_price')}</div>
        <div className="col-span-1 text-center">{t('action_delete')}</div>
      </div>

      <div className="flex flex-col gap-6 rounded-b-lg overflow-hidden">
        {cartItems.length === 0 ? (
          <div className="p-20 text-center text-gray-400 bg-white border border-gray-200 rounded-xl font-bold">{t('cart_empty')}</div>
        ) : (
          Object.values(groupedCart).map((group, gIdx) => {
            const selectableGroupItems = group.items.filter(g => !(g.info.stock <= 0 && g.item.type !== 'Reserved'));
            const isAllGroupChecked = selectableGroupItems.length > 0 && selectableGroupItems.every(g => g.item.checked);

            return (
              <div key={gIdx} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-2">
                <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={isAllGroupChecked}
                    onChange={(e) => toggleBoothItems(group.items, e.target.checked)}
                    className="w-4 h-4 accent-pink-500 cursor-pointer shrink-0" 
                  />
                  <span className="font-black text-gray-800">🏪 {group.boothName}</span>
                  {group.boothNumbers.length > 0 && (
                    <span className="text-[10px] font-bold bg-pink-100 text-pink-600 px-2 py-0.5 rounded border border-pink-200">
                      {t('booth')}: {group.boothNumbers.join(', ')}
                    </span>
                  )}
                </div>

                {group.items.map(({ item, info }) => {
                  const isSoldOut = info.stock <= 0;
                  const isDisabled = isSoldOut && item.type !== 'Reserved';

                  return (
                    <div key={item.id} className={`p-4 border-b border-gray-100 last:border-0 grid grid-cols-1 md:grid-cols-12 md:gap-2 items-center transition-colors ${isDisabled ? 'bg-gray-50/50' : 'bg-white'}`}>
                      <div className="md:col-span-5 flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={item.checked && !isDisabled} 
                          disabled={isDisabled}
                          onChange={() => toggleItem(item.id)} 
                          className="w-4 h-4 accent-pink-500 cursor-pointer shrink-0" 
                        />
                        <div className="relative shrink-0">
                          <img src={info.image} alt={item.name} className={`w-14 h-14 md:w-16 md:h-16 object-cover border rounded shadow-sm ${isDisabled ? 'opacity-50 grayscale' : ''}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-bold truncate text-xs md:text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-800'}`}>
                            {info.name}
                          </p>
                          <button 
                            onClick={() => {
                              setEditingItem(item.id);
                              setTempSelectedOption(item.option || item.variation || "");
                            }}
                            disabled={isDisabled}
                            className="text-[10px] text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded mt-1 transition flex items-center gap-1"
                          >
                            <span className="truncate">{t('table_option')}: {item.option || item.variation || '-'}</span>
                            <span className="shrink-0 text-[8px]">▼</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="md:col-span-1 flex justify-start md:justify-center py-2 md:py-0">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          item.type === 'Reserved' ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-blue-100 text-blue-600 border border-blue-200'
                        }`}>
                          {item.type}
                        </span>
                      </div>

                      <div className="md:col-span-2 text-left md:text-center text-gray-600 text-xs">
                        <span className="md:hidden font-bold text-gray-400 mr-2">{t('table_stock')}:</span>
                        <span className={isSoldOut ? 'text-red-500 font-bold' : ''}>{info.stock} {t('unit')}</span>
                      </div>

                      <div className="md:col-span-2 flex justify-start md:justify-center items-center py-2 md:py-0">
                        <div className={`flex items-center border rounded overflow-hidden h-7 ${isDisabled ? 'border-gray-200' : 'border-gray-300'}`}>
                          <button onClick={() => updateQty(item.id, -1, info.stock)} disabled={isDisabled} className="px-2 py-1 hover:bg-gray-100 text-gray-600 border-r transition">-</button>
                          <input type="text" value={item.quantity} readOnly className="w-7 text-center text-[10px] outline-none bg-white text-gray-800" />
                          <button onClick={() => updateQty(item.id, 1, info.stock)} disabled={isDisabled || item.quantity >= info.stock} className="px-2 py-1 hover:bg-gray-100 text-gray-600 border-l transition">+</button>
                        </div>
                      </div>

                      <div className="md:col-span-1 text-left md:text-center font-bold text-sm md:text-base">
                        <span className="md:hidden font-bold text-gray-400 mr-2">{t('table_price')}:</span>
                        <span className={isDisabled ? 'text-gray-400' : 'text-pink-500'}>฿{item.price * item.quantity}</span>
                      </div>

                      <div className="md:col-span-1 text-right md:text-center">
                        <button onClick={() => deleteItem(item.id)} className="text-red-500 transition text-[10px] font-bold uppercase">{t('action_delete')}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Editing Option Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <span className="font-bold text-gray-800">{t('select_option_title')}</span>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {(() => {
                const currentCartItem = cartItems.find(i => i.id === editingItem);
                const info = getProductInfo(currentCartItem);
                if (!info.variations?.length) return <p className="text-center text-gray-400 py-10">No options available</p>;

                return info.variations.map((v, vIdx) => (
                  <div key={vIdx} className="space-y-3">
                    <p className="font-bold text-gray-800 text-sm">{t('select')} {v.name}:</p>
                    <div className="grid grid-cols-2 gap-3">
                      {v.options?.map((opt, oIdx) => {
                        const isSelected = tempSelectedOption === opt.name;
                        return (
                          <button
                            key={oIdx}
                            disabled={opt.stock === 0}
                            onClick={() => setTempSelectedOption(opt.name)}
                            className={`p-3 border-2 rounded-xl text-xs font-bold transition-all
                              ${isSelected ? 'border-pink-500 bg-pink-50 text-pink-600' : 'border-gray-100 bg-white text-gray-600'}
                              ${opt.stock === 0 ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}`}
                          >
                            {opt.name}
                            <span className="block text-[8px] font-medium mt-1 opacity-60">{t('table_stock')}: {opt.stock}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="p-4 bg-gray-50 flex gap-3">
              <button onClick={() => setEditingItem(null)} className="flex-1 py-3 text-gray-500 font-bold">{t('action_cancel')}</button>
              <button 
                onClick={() => updateItemOption(editingItem, tempSelectedOption)} 
                className="flex-1 py-3 bg-pink-500 text-white font-bold rounded-xl shadow-lg active:scale-95"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Checkout Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-2xl z-50">
        <div className="max-w-6xl mx-auto p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" onChange={toggleAll} checked={cartItems.length > 0 && selectedItems.length === cartItems.length} className="w-4 h-4 accent-pink-500" />
              <span className="text-gray-700 font-bold text-sm">{t('select_all')} ({cartItems.length})</span>
            </label>
            <button onClick={deleteSelectedItems} className="text-red-500 font-bold text-sm" disabled={selectedItems.length === 0}>
              {t('action_delete')}
            </button>
          </div>

          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">{t('total')} ({totalQuantity} {t('unit')})</p>
              <p className="text-2xl font-black text-pink-500 leading-none">฿{totalPrice}</p>
            </div>
            <button 
              onClick={handleConfirm} 
              disabled={selectedItems.length === 0} 
              className="bg-pink-500 disabled:bg-gray-300 text-white px-10 py-3 rounded-full font-black shadow-lg transition-all active:scale-95"
            >
              {t('confirm')}
            </button>
          </div>
        </div>
      </div>

      {/* Custom Popup (Modal) */}
      {popup.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 text-2xl font-black
              ${popup.type === 'success' ? 'bg-green-100 text-green-500' : 
                popup.type === 'error' ? 'bg-red-100 text-red-500' : 
                'bg-blue-100 text-blue-500'}`}>
              {popup.type === 'success' ? '✓' : popup.type === 'error' ? '✕' : '?'}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {popup.type === 'success' ? t('success') : popup.type === 'confirm' ? t('confirm_title') : t('error_title')}
            </h3>
            <p className="text-gray-600 mb-8">{popup.message}</p>
            <div className="flex gap-3 w-full">
              {popup.type === 'confirm' && (
                <button onClick={closePopup} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3.5 rounded-xl">{t('action_cancel')}</button>
              )}
              <button onClick={handlePopupConfirm} className="flex-1 bg-pink-500 text-white font-bold py-3.5 rounded-xl shadow-md">{t('confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;