import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { useLanguage } from "./LanguageContext"; // 1. นำเข้า Hook

function History({ user, onBack }) {
  const { t, lang } = useLanguage(); // 2. ดึง t และ lang มาใช้งาน
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allProducts, setAllProducts] = useState({});

  // 1. ดึงข้อมูลสินค้าจากทุกบูธ
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

  // 2. ดึงข้อมูลประวัติการทำรายการ
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    let unsubscribeAllbuys = () => {};

    const fetchUserAndHistory = async () => {
      try {
        const userQ = query(collection(db, "buyers"), where("username", "==", user.username));
        const userSnap = await getDocs(userQ);
        
        if (userSnap.empty) {
          setHistoryList([]);
          setLoading(false);
          return;
        }

        const buyerData = userSnap.docs[0].data();
        const actualBuyerId = buyerData.id || buyerData.buyer_id || userSnap.docs[0].id;

        const historyQ = query(collection(db, "allbuys"), where("buyer_id", "==", actualBuyerId));
        
        unsubscribeAllbuys = onSnapshot(historyQ, (snapshot) => {
          if (!snapshot.empty) {
            const hList = snapshot.docs.map(doc => ({
              docId: doc.id,
              ...doc.data()
            }));
            
            hList.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
            setHistoryList(hList);
          } else {
            setHistoryList([]);
          }
          setLoading(false);
        }, (err) => {
          console.error("🔥 Firestore Error:", err);
          setLoading(false);
        });

      } catch (err) {
        console.error("Error fetching history:", err);
        setLoading(false);
      }
    };

    fetchUserAndHistory();
    return () => unsubscribeAllbuys();
  }, [user]);

  // 3. ฟังก์ชันหารูปภาพสินค้า
  const getProductImage = (productId, variationName) => {
    const p = allProducts[productId];
    if (!p) return "https://placehold.co/100?text=Loading";
    let img = p.product_images?.cover_image || p.images?.[0] || "https://placehold.co/100?text=No+Image";
    
    if (variationName && p.variations) {
      p.variations.forEach(v => {
        if (v.options) {
          const opt = v.options.find(o => o.name === variationName);
          if (opt && opt.image) img = opt.image;
        }
      });
    }
    return img;
  };

  const getProductStock = (productId, variationName) => {
    const p = allProducts[productId];
    if (!p) return 0;
    let currentStock = p.stock || 0;
    if (variationName && p.variations) {
      p.variations.forEach(v => {
        if (v.options) {
          const opt = v.options.find(o => o.name === variationName);
          if (opt && opt.stock !== undefined) currentStock = opt.stock;
        }
      });
    }
    return currentStock;
  };

  const getBoothName = (boothId, items) => {
    if (items && items.length > 0 && allProducts[items[0].product_id]) {
      const info = allProducts[items[0].product_id];
      const boothBadge = info.boothNumbers && info.boothNumbers.length > 0 
        ? `(${t('booth')}: ${info.boothNumbers.join(', ')})` 
        : '';
      return `${info.boothName} ${boothBadge}`;
    }
    return `Booth ID: ${boothId}`;
  };

  const overallTotal = historyList.reduce((sum, doc) => sum + (doc.total_amount || 0), 0);

  if (!user) {
    return <div className="text-center py-20 text-gray-500 font-bold text-xl">{t('please_login_first')}</div>;
  }

  if (loading) return <div className="text-center py-20 text-pink-500 font-bold animate-pulse">{t('loading_history')}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 pb-20 pt-4">

      <button onClick={onBack} className="mb-6 flex items-center text-gray-400 hover:text-pink-500 font-bold transition-all group">
        <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> {t('back_to_cart')}
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-800">{t('history_title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('history_subtitle')} {user.username}</p>
        </div>
        
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 flex items-center gap-4 shadow-sm w-full md:w-auto">
          <div className="bg-pink-100 p-3 rounded-full text-pink-500 text-xl">💰</div>
          <div>
            <p className="text-xs text-pink-600 font-bold uppercase tracking-wider">{t('total_spent')}</p>
            <p className="text-2xl font-black text-pink-600 leading-none">฿{overallTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 hidden md:grid grid-cols-12 md:gap-2 text-gray-500 font-medium text-xs lg:text-sm uppercase tracking-wider mb-4">
        <div className="col-span-5 flex items-center">
          <span>{t('table_product')}</span>
        </div>
        <div className="col-span-1 text-center">{t('table_type')}</div>
        <div className="col-span-2 text-center">{t('table_stock')}</div>
        <div className="col-span-2 text-center">{t('table_quantity')}</div>
        <div className="col-span-2 text-center">{t('table_price')}</div>
      </div> 

      <div className="flex flex-col gap-8 rounded-b-lg">
        {historyList.length === 0 ? (
          <div className="p-20 text-center text-gray-400 bg-white border border-gray-200 rounded-xl shadow-sm">
            {t('no_history')}
          </div>
        ) : (
          historyList.map((historyDoc, idx) => {
            const formattedDate = new Date(historyDoc.transaction_date).toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            return (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-white p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                  <div>
                    <span className="font-black text-gray-800 text-base md:text-lg flex items-center gap-2">
                      🏪 {getBoothName(historyDoc.booth_id, historyDoc.items_detail)}
                    </span>
                    <span className="text-xs text-gray-400 font-medium block mt-1">
                      {formattedDate}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 font-bold uppercase block">{t('total_amount_label')}</span>
                    <span className="text-lg font-black text-pink-500">฿{historyDoc.total_amount?.toLocaleString() || 0}</span>
                  </div>
                </div>

                {(historyDoc.items_detail || []).map((item, itemIdx) => {
                  const imageSrc = getProductImage(item.product_id, item.variation);
                  const isReserved = item.option === 'Reserved';
                  const isWishlist = item.option === 'Wishlist';

                  return (
                    <div key={itemIdx} className="p-4 border-b border-gray-100 last:border-0 grid grid-cols-1 md:grid-cols-12 md:gap-2 items-center bg-white transition-colors">
                      
                      <div className="md:col-span-5 flex items-center gap-3">
                        <div className="relative shrink-0">
                          <img src={imageSrc} alt={item.name} className="w-14 h-14 md:w-16 md:h-16 object-cover border rounded shadow-sm" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate text-xs md:text-sm text-gray-800">
                            {item.name || "Unknown Product"}
                          </p>
                          <div className="text-[10px] text-gray-500 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded mt-1 inline-flex items-center max-w-full">
                            <span className="truncate">{t('table_option')}: {item.variation || '-'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="md:col-span-1 flex justify-start md:justify-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight whitespace-nowrap shadow-sm ${
                          isReserved ? 'bg-orange-100 text-orange-600 border border-orange-200' : 
                          isWishlist ? 'bg-blue-100 text-blue-600 border border-blue-200' : 
                          'bg-pink-100 text-pink-600 border border-pink-200'
                        }`}>
                          {item.option}
                        </span>
                      </div>

                      <div className="md:col-span-2 text-left md:text-center text-gray-600 text-xs">
                        <span className="md:hidden font-medium text-gray-400 mr-2">{t('table_stock')}:</span>
                        <span>{getProductStock(item.product_id, item.variation)} {t('unit')}</span>
                      </div>

                      <div className="md:col-span-2 flex justify-start md:justify-center items-center">
                        <span className="md:hidden font-medium text-gray-400 mr-6">{t('table_quantity')}:</span>
                        <div className="flex items-center justify-center border border-gray-200 rounded h-7 bg-white px-3 text-[10px] text-gray-800 font-bold">
                          x{item.quantity}
                        </div>
                      </div>

                      <div className="md:col-span-2 text-left md:text-center font-bold text-sm md:text-base">
                        <span className="md:hidden font-medium text-gray-400 mr-2">{t('table_price')}:</span>
                        <span className="text-gray-800">฿{item.subtotal?.toLocaleString() || (item.price * item.quantity).toLocaleString()}</span>
                      </div>

                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

export default History;