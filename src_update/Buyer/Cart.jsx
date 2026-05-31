//src/Buyer/Cart.jsx
import React, { useState, useEffect, useMemo } from 'react'; // เพิ่ม useMemo เพื่อความเสถียร
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, collection, getDocs,
query, where, setDoc, deleteDoc, writeBatch, orderBy, limit } from 'firebase/firestore';
import History from './History';
import { useLanguage } from '../LanguageContext';

function Cart({ user }) {
  const { t } = useLanguage();
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

    showPopup('confirm', `${t('confirmOrder1')}${totalQty}${t('confirmOrder2')}`, async () => {
      try {
        const allbuysRef = collection(db, "allbuys");
        const qLastOrder = query(allbuysRef, orderBy("allbuy_id", "desc"), limit(1));
        const allbuysSnap = await getDocs(qLastOrder);
        let nextNumber = 1;
        if (!allbuysSnap.empty) {
            const lastId = allbuysSnap.docs[0].data().allbuy_id;
            const lastNum = parseInt(lastId.replace('a_', ''), 10);
            if (!isNaN(lastNum)) nextNumber = lastNum + 1;
        }

        const boothGroups = selectedItems.reduce((acc, item) => {
          const info = getProductInfo(item);
          const bId = item.booth_id || "unknown";
          if (!acc[bId]) acc[bId] = [];
          acc[bId].push({ item, info });
          return acc;
        }, {});

        const batch = writeBatch(db);

        for (const bId in boothGroups) {
          const group = boothGroups[bId];
          const totalAmount = group.reduce((sum, g) => sum + (g.item.price * g.item.quantity), 0);
          const itemCount = group.reduce((sum, g) => sum + g.item.quantity, 0);
          const newDocId = `a_${String(nextNumber).padStart(6, '0')}`;
          
          const boothName = group[0].info.boothName || t('unknownBooth');
          const boothNumbers = group[0].info.boothNumbers || [];

          const newTransaction = {
            allbuy_id: newDocId,
            booth_id: bId,
            booth_name: boothName,
            booth_numbers: boothNumbers,
            item_count: itemCount,
            total_amount: totalAmount,
            transaction_date: new Date().toISOString(),
            user_id: userDocId,
            items_detail: group.map((g, index) => ({
              allbuy_id: newDocId,
              buysitems_id: `ai_${Date.now()}_${index}`,
              image: g.item.image || g.info.image || "https://placehold.co/400x400",
              option_name: g.item.option_name || "",
              price_per_unit: g.item.price,
              product_id: g.item.product_id,
              product_name: g.item.product_name || g.info.name,
              quantity: g.item.quantity,
              subtotal: g.item.price * g.item.quantity,
              type: g.item.type || "Wishlist",
              variation_name: g.item.variation_name || ""
            }))
          };

          batch.set(doc(db, "allbuys", newDocId), newTransaction);
          nextNumber++;

          group.forEach(g => {
            batch.delete(doc(db, "users", userDocId, "carts", g.item.id));
          });
        }

        await batch.commit();
        showPopup('success', t('orderSuccess'));
      } catch (error) {
        console.error("Error confirming order:", error);
        showPopup('error', t('orderError') + error.message);
      }
    });
  };

  // --- FIX 2: ใช้ Memo เพื่อป้องกัน Render Error และ Infinite Loop ---
  const missingIdsKey = useMemo(() => {
    const ids = cartItems.map(i => i.product_id).filter(id => id && !allProducts[id]);
    return [...new Set(ids)].sort().join(',');
  }, [cartItems, allProducts]);

  useEffect(() => {
    if (!missingIdsKey) return;

    const fetchMissingProducts = async () => {
      const idsToFetch = missingIdsKey.split(',').filter(Boolean);
      try {
        const chunks = [];
        for (let i = 0; i < idsToFetch.length; i += 30) {
          chunks.push(idsToFetch.slice(i, i + 30));
        }

        let newFetched = {};
        for (const chunk of chunks) {
          const q = query(collection(db, "products"), where("product_id", "in", chunk));
          const snap = await getDocs(q);
          snap.forEach(docSnap => {
            const productData = docSnap.data();
            
            // --- FIX 1: แก้ไข error .split is not a function ---
            const boothNumsArray = Array.isArray(productData.booth_numbers) 
                ? productData.booth_numbers 
                : [];

            newFetched[productData.product_id || docSnap.id] = {
              ...productData,
              boothName: productData.booth_name || t('unknownBooth'),
              boothNumbers: boothNumsArray
            };
          });
        }
        setAllProducts(prev => ({ ...prev, ...newFetched }));
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchMissingProducts();
  }, [missingIdsKey]); 

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let unsubscribe = () => {};

    const fetchUserCart = async () => {
      try {
        let uDocId = user.user_id || user.uid; 
        
        if (!uDocId) {
            const qUser = query(collection(db, "users"), where("username", "==", user.username), limit(1));
            const userSnap = await getDocs(qUser);
            if (!userSnap.empty) uDocId = userSnap.docs[0].id;
        }

        if (uDocId) {
          setUserDocId(uDocId);
          const cartsRef = collection(db, "users", uDocId, "carts");
          unsubscribe = onSnapshot(cartsRef, (snapshot) => {
            const items = snapshot.docs.map(docSnap => {
              const data = docSnap.data();
              return {
                id: docSnap.id, 
                ...data,
                checked: data.checked === true || data.checked === "TRUE"
              };
            });
            setCartItems(items);
            setLoading(false);
          });
        } else {
          setCartItems([]);
          setLoading(false);
        }
      } catch (err) {
        console.error("🔥 Firestore Error:", err);
        setLoading(false);
      }
    };

    fetchUserCart();
    return () => unsubscribe();
  }, [user]);

  const getProductInfo = (item) => {
    const p = allProducts[item.product_id];
    
    let img = item.image || "https://placehold.co/100?text=No+Image";
    let currentName = item.product_name || t('noProductName');
    let currentBoothName = item.booth_name; 
    let currentBoothNumbers = Array.isArray(item.booth_numbers) ? item.booth_numbers : [];
    let currentStock = 99; 
    
    const currentOptName = item.option_name || item.variation_name;

    if (p) {
      currentName = p.name || p.product_name || currentName; 
      currentBoothName = p.boothName || p.booth_name || currentBoothName;
      currentBoothNumbers = p.boothNumbers || currentBoothNumbers;
      
      if (p.has_variations && p.variations) {
        const opt = p.variations.find(v => v.option_name === currentOptName || v.variation_name === currentOptName);
        if (opt) {
          if (opt.image) img = opt.image;
          currentStock = opt.stock !== undefined ? opt.stock : 0;
        } else {
          currentStock = 0;
        }
      } else {
        currentStock = p.total_stock !== undefined ? p.total_stock : 0;
        if (p.cover_image && (!item.image || item.image.includes("placehold"))) {
          img = p.cover_image;
        }
      }
    }

    return { 
      name: currentName, 
      image: img, 
      stock: currentStock, 
      boothName: currentBoothName || t('unknownBooth'), 
      boothNumbers: currentBoothNumbers, 
      variations: p?.variations || [],
      has_variations: p?.has_variations || false
    };
  };

  const updateItemOption = async (id, newOptionName) => {
    if (!userDocId) return;
    const cartRef = doc(db, "users", userDocId, "carts", id);
    await updateDoc(cartRef, {
      option_name: newOptionName,
      variation_name: newOptionName
    });
    setEditingItem(null); 
  };

  const deleteItem = (id) => {
    showPopup('confirm', t('deleteItemPrompt'), async () => {
      const cartRef = doc(db, "users", userDocId, "carts", id);
      await deleteDoc(cartRef);
    });
  };

  const deleteSelectedItems = () => {
    const itemsToDelete = cartItems.filter(item => item.checked);
    if (itemsToDelete.length === 0) return;
    showPopup('confirm', `${t('deleteSelected1')}${itemsToDelete.length}${t('deleteSelected2')}`, async () => {
      const batch = writeBatch(db);
      itemsToDelete.forEach(item => {
        const cartRef = doc(db, "users", userDocId, "carts", item.id);
        batch.delete(cartRef);
      });
      await batch.commit();
    });
  };

  const updateQty = async (id, change, max) => {
    const item = cartItems.find(i => i.id === id);
    if (!item) return;
    const n = item.quantity + change;
    if (n >= 1 && n <= max) {
      const cartRef = doc(db, "users", userDocId, "carts", id);
      await updateDoc(cartRef, { quantity: n });
    }
  };

  const toggleItem = async (id) => {
    const item = cartItems.find(i => i.id === id);
    if (!item) return;
    const cartRef = doc(db, "users", userDocId, "carts", id);
    await updateDoc(cartRef, { checked: !item.checked });
  };

  const toggleAll = async (e) => {
    const isChecked = e.target.checked;
    const batch = writeBatch(db);
    cartItems.forEach(item => {
      const info = getProductInfo(item);
      const isDisabled = info.stock <= 0 && item.type !== 'Reserved';
      const finalChecked = isDisabled ? false : isChecked;
      if (item.checked !== finalChecked) {
        const cartRef = doc(db, "users", userDocId, "carts", item.id);
        batch.update(cartRef, { checked: finalChecked });
      }
    });
    await batch.commit();
  };

  const toggleBoothItems = async (groupItems, isChecked) => {
    const batch = writeBatch(db);
    groupItems.forEach(g => {
      const info = getProductInfo(g.item);
      const isDisabled = info.stock <= 0 && g.item.type !== 'Reserved';
      const finalChecked = isDisabled ? false : isChecked;
      if (g.item.checked !== finalChecked) {
        const cartRef = doc(db, "users", userDocId, "carts", g.item.id);
        batch.update(cartRef, { checked: finalChecked });
      }
    });
    await batch.commit();
  };

  const selectedItems = cartItems.filter(item => item.checked);
  const totalPrice = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  const selectableItems = cartItems.filter(item => {
    const info = getProductInfo(item);
    return !(info.stock <= 0 && item.type !== 'Reserved');
  });
  const isAllChecked = selectableItems.length > 0 && selectableItems.every(item => item.checked);

  const groupedCart = cartItems.reduce((acc, item) => {
    const info = getProductInfo(item);
    const bId = item.booth_id || "unknown";
    if (!acc[bId]) {
      acc[bId] = { boothName: info.boothName, boothNumbers: info.boothNumbers, items: [] };
    }
    acc[bId].items.push({ item, info });
    return acc;
  }, {});

  if (!user) {
    return <div className="text-center py-20 text-gray-500 font-bold text-xl">{t('pleaseLoginCart')}</div>;
  }

  if (loading) return <div className="text-center py-20 text-pink-500 font-bold animate-pulse">{t('loadingCart')}</div>;

  if (showHistory) {
    return <History user={user} onBack={() => setShowHistory(false)} />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-40 md:pb-32">
      <div className="flex justify-between items-center mb-6 pt-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          {t('shoppingCartOf')}{user.username}
        </h1>
        <button 
          onClick={() => setShowHistory(true)}
          className="text-pink-500 font-medium hover:underline flex items-center gap-1 text-sm md:text-base"
        >
          <span>🕒</span> {t('historyBtn')}
        </button>
      </div>

      <div className="bg-white p-4 rounded-t-lg border border-gray-200 hidden md:grid grid-cols-12 md:gap-2 text-gray-500 font-medium text-xs lg:text-sm uppercase tracking-wider mb-4">
        <div className="col-span-4 flex items-center gap-4">
          <input type="checkbox" onChange={toggleAll} checked={isAllChecked} className="w-4 h-4 accent-pink-500 cursor-pointer"/>
          <span>{t('colProduct')}</span>
        </div>
        <div className="col-span-1 text-center">{t('colType')}</div>
        <div className="col-span-2 text-center">{t('colStock')}</div>
        <div className="col-span-2 text-center">{t('colQty')}</div>
        <div className="col-span-2 text-center">{t('colPrice')}</div>
        <div className="col-span-1 text-center">{t('colAction')}</div>
      </div>

      <div className="flex flex-col gap-6 rounded-b-lg overflow-hidden">
        {cartItems.length === 0 ? (
          <div className="p-20 text-center text-gray-400 bg-white border border-gray-200 rounded-xl">{t('emptyCart')}</div>
        ) : (
          Object.values(groupedCart).map((group, gIdx) => {
            const selectableGroupItems = group.items.filter(g => !(g.info.stock <= 0 && g.item.type !== 'Reserved'));
            const isAllGroupChecked = selectableGroupItems.length > 0 && selectableGroupItems.every(g => g.item.checked);

            return (
              <div key={gIdx} className="bg-white border border-gray-200 rounded-b-lg shadow-sm overflow-hidden mb-1">
                <div className="bg-white p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-0">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      checked={isAllGroupChecked}
                      onChange={(e) => toggleBoothItems(group.items, e.target.checked)}
                      className="w-4 h-4 accent-pink-500 cursor-pointer shrink-0" 
                    />
                    <span className="font-black text-gray-800">🏪 {group.boothName}</span>
                  </div>
                  {group.boothNumbers.length > 0 && (
                    <div className="ml-7 sm:ml-0"> 
                      <span className="text-[10px] font-bold bg-pink-100 text-pink-600 px-2 py-0.5 rounded border border-pink-200 inline-block">
                        {t('boothLabel')}: {group.boothNumbers.join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {group.items.map(({ item, info }) => {
                  const isSoldOut = info.stock <= 0;
                  const isDisabled = isSoldOut && item.type !== 'Reserved';

                  return (
                    <div key={item.id} className={`p-4 border-b border-gray-100 last:border-0 flex flex-col md:grid md:grid-cols-12 md:gap-2 md:items-center transition-colors ${isDisabled ? 'bg-gray-50/50' : 'bg-white'}`}>
                      <div className="md:col-span-4 md:order-1 flex items-start md:items-center gap-3 w-full">
                        <input
                          type="checkbox" 
                          checked={item.checked && !isDisabled}
                          disabled={isDisabled}
                          onChange={() => toggleItem(item.id)} 
                          className="w-4 h-4 accent-pink-500 cursor-pointer shrink-0 disabled:opacity-30 mt-1.5 md:mt-0" 
                        />
                        <div className="relative shrink-0">
                          <img src={info.image} alt={info.name} className={`w-20 h-20 md:w-16 md:h-16 object-cover border border-gray-200 rounded-lg shadow-sm ${isDisabled ? 'opacity-50 grayscale' : ''}`} />
                          {isDisabled && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                              <span className="text-white text-[8px] font-black">{t('soldOut')}</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                          <p className={`font-bold truncate text-sm w-full leading-tight ${isDisabled ? 'text-gray-400' : 'text-gray-800'}`}>
                            {info.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            {info.has_variations ? (
                              <button 
                                onClick={() => {
                                  setEditingItem(item.id);
                                  setTempSelectedOption(item.option_name || item.variation_name || "");
                                }}
                                disabled={isDisabled}
                                className="text-[10px] text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2 py-1 rounded transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                              >
                                <span className="truncate max-w-[100px] md:max-w-full">
                                  {t('chooseLabel')}: {item.option_name || item.variation_name || '-'}
                                </span>
                                <span className="shrink-0 text-[8px]">▼</span>
                              </button>
                            ) : null}
                            <span className={`md:hidden px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight shadow-sm ${item.type === 'Reserved' ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-blue-100 text-blue-600 border border-blue-200'}`}>
                              {item.type}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="hidden md:flex md:col-span-1 md:order-2 justify-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight shadow-sm ${item.type === 'Reserved' ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-blue-100 text-blue-600 border border-blue-200'}`}>
                          {item.type}
                        </span>
                      </div>

                      <div className="flex flex-col gap-3 mt-3 pl-7 md:pl-0 md:mt-0 md:contents">
                        <div className="flex flex-wrap items-end justify-between md:contents gap-y-2">
                          <div className="md:col-span-2 md:order-5 text-left md:text-center font-black text-[15px] md:text-base w-full sm:w-auto mb-1 md:mb-0">
                            <span className={isDisabled ? 'text-gray-400' : 'text-pink-500'}>฿{item.price * item.quantity}</span>
                          </div>
                          <div className="flex items-center justify-between w-full sm:w-auto gap-3 md:contents">
                            <div className="md:col-span-2 md:order-3 text-right md:text-center text-gray-500 text-[11px] md:text-xs">
                              <span className="md:hidden font-medium mr-1">{t('stockLabel')}</span>
                              <span className={isSoldOut ? 'text-red-500 font-bold' : ''}>{info.stock}</span>
                            </div>
                            <div className="md:col-span-2 md:order-4 flex justify-end md:justify-center items-center">
                              <div className={`flex items-center border rounded-lg overflow-hidden h-8 md:h-7 ${isDisabled ? 'border-gray-200' : 'border-gray-300'}`}>
                                <button onClick={() => updateQty(item.id, -1, info.stock)} disabled={isDisabled} className="px-3 md:px-2 py-1 hover:bg-gray-100 text-gray-600 border-r transition disabled:bg-gray-50">-</button>
                                <input type="text" value={item.quantity} readOnly className="w-8 md:w-7 text-center text-xs md:text-[10px] outline-none bg-white text-gray-800 disabled:bg-gray-50 disabled:text-gray-400 font-bold" disabled={isDisabled} />
                                <button onClick={() => updateQty(item.id, 1, info.stock)} disabled={isDisabled || item.quantity >= info.stock} className="px-3 md:px-2 py-1 hover:bg-gray-100 text-gray-600 border-l transition disabled:bg-gray-50">+</button>
                              </div>
                            </div>
                          </div>
                          <div className={`md:col-span-1 md:order-6 text-right md:text-center shrink-0 ml-auto md:ml-0 ${isDisabled ? 'flex justify-end w-full mt-2 md:block md:w-auto md:mt-0' : 'hidden md:block'}`}>
                            <button 
                              onClick={() => deleteItem(item.id)} 
                              className="text-red-500 transition text-sm font-medium md:font-medium bg-transparent px-0 py-0"
                            >
                              {t('deleteBtn')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
              <span className="font-bold text-gray-800">{t('selectOptionTitle')}</span>
              <span className="text-xs text-pink-500 font-bold bg-pink-50 px-2 py-1 rounded border border-pink-100">
                {t('currentOption')}{tempSelectedOption || '-'}
              </span>
            </div>
            <div className="p-4 overflow-y-auto space-y-6 bg-white">
              {(() => {
                const currentCartItem = cartItems.find(i => i.id === editingItem);
                const info = getProductInfo(currentCartItem);

                if (!info.variations || info.variations.length === 0) {
                  return <p className="text-center text-gray-400 py-10">{t('noOptions')}</p>;
                }

                const groupedVariations = info.variations.reduce((acc, opt) => {
                  const groupName = opt.variation_name || "ตัวเลือก";
                  if (!acc[groupName]) acc[groupName] = [];
                  acc[groupName].push(opt);
                  return acc;
                }, {});

                return (
                  <div className="space-y-6">
                    {Object.entries(groupedVariations).map(([groupName, options], gIdx) => (
                      <div key={gIdx} className="space-y-3">
                        <p className="font-bold text-gray-800 text-sm">{t('selectPrefix')} {groupName}:</p>
                        <div className="grid grid-cols-2 gap-3">
                          {options.map((opt, oIdx) => {
                            const optName = opt.option_name || opt.variation_name;
                            const isSelected = tempSelectedOption === optName;
                            const isOutOfStock = opt.stock === 0;

                            return (
                              <button
                                key={oIdx}
                                disabled={isOutOfStock}
                                onClick={() => setTempSelectedOption(optName)}
                                className={`group relative p-2 border rounded-lg text-sm transition-all duration-200 bg-white flex items-center gap-3
                                  ${isSelected ? 'border-pink-500 ring-1 ring-pink-500' : 'border-gray-200 hover:border-pink-200'}
                                  ${isOutOfStock ? 'opacity-40 cursor-not-allowed bg-gray-50' : 'active:scale-95'}
                                `}
                              >
                                <div className="shrink-0">
                                  <img 
                                    src={opt.image || "https://placehold.co/50?text=No+Img"} 
                                    alt={optName}
                                    className="w-10 h-10 object-cover rounded-md border border-gray-100"
                                  />
                                </div>
                                <div className="min-w-0 text-left">
                                  <span className={`block truncate font-medium ${isSelected ? 'text-pink-600' : 'text-gray-700'}`}>
                                    {optName}
                                  </span>
                                  {opt.stock !== undefined && (
                                    <span className="text-[10px] text-gray-400 block mt-0.5">{t('stockLabel')}{opt.stock}</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="p-4 bg-gray-50 flex gap-3 border-t border-gray-100">
              <button onClick={() => setEditingItem(null)} className="flex-1 py-2.5 text-gray-500 hover:text-gray-700 font-bold text-sm transition">{t('cancelBtn')}</button>
              <button onClick={() => updateItemOption(editingItem, tempSelectedOption)} disabled={!tempSelectedOption} className="flex-1 py-2.5 bg-pink-500 text-white font-bold text-sm rounded-lg hover:bg-pink-600 transition shadow-md shadow-pink-200 disabled:bg-gray-300 disabled:shadow-none">{t('confirmBtn')}</button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_15px_-1px_rgba(0,0,0,0.1)] z-50">
        <div className="max-w-6xl mx-auto p-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center justify-between w-full md:w-auto md:flex-1 md:justify-start md:gap-4 border-b md:border-0 pb-3 md:pb-0">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" onChange={toggleAll} checked={isAllChecked} className="w-4 h-4 accent-pink-500" />
              <span className="text-gray-700 font-medium group-hover:text-pink-500 transition text-sm md:text-base">{t('selectAll')} ({selectableItems.length})</span>
            </label>
            <div className="hidden md:block w-px h-4 bg-gray-300"></div>
            <button onClick={deleteSelectedItems} className="text-red-500 font-medium text-sm transition" disabled={selectedItems.length === 0}>{t('deleteBtn')}</button>
          </div>
          
          <div className="hidden md:flex md:flex-1 justify-center items-center gap-2">
            <span className="text-gray-500 text-sm">{t('totalItems1')}{totalQuantity}{t('totalItems2')}</span>
            <span className="text-2xl font-black text-pink-500 leading-none">฿{totalPrice}</span>
          </div>

          <div className="flex flex-col xs:flex-row items-center gap-4 w-full md:w-auto md:flex-1 md:justify-end">
            <div className="md:hidden text-center sm:text-right flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
              <span className="text-gray-500 text-xs md:text-sm">{t('totalItems1')}{totalQuantity}{t('totalItems2')}</span>
              <span className="text-xl md:text-2xl font-black text-pink-500 leading-none">฿{totalPrice}</span>
            </div>
            <div className="flex gap-2 w-full xs:w-auto">
              <button onClick={handleConfirm} disabled={selectedItems.length === 0} className="flex-1 xs:flex-none bg-pink-500 disabled:bg-gray-200 text-white px-4 lg:px-8 py-2 md:py-3 rounded-lg hover:bg-pink-600 font-bold transition shadow-md active:scale-95 text-sm md:text-base">{t('checkoutConfirm')}</button>
            </div>
          </div>
        </div>
      </div>

      {popup.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center transform transition-all scale-100">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 text-2xl font-black
              ${popup.type === 'success' ? 'bg-green-100 text-green-500' : 
                popup.type === 'error' ? 'bg-red-100 text-red-500' : 
                popup.type === 'confirm' ? 'bg-blue-100 text-blue-500' : 'bg-yellow-100 text-yellow-500'}`}>
              {popup.type === 'success' && '✓'}
              {popup.type === 'error' && '✕'}
              {popup.type === 'confirm' && '?'}
              {(!['success', 'error', 'confirm'].includes(popup.type)) && '!'}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {popup.type === 'success' ? t('popupSuccess') : popup.type === 'error' ? t('popupError') : popup.type === 'confirm' ? t('popupConfirmTitle') : t('popupAlert')}
            </h3>
            <p className="text-gray-600 mb-8">{popup.message}</p>
            <div className="flex gap-3 w-full">
              {popup.type === 'confirm' && (
                <button onClick={closePopup} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-all active:scale-95">{t('popupCancel')}</button>
              )}
              <button onClick={handlePopupConfirm} className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95">{t('popupOk')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;