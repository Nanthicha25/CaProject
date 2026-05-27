//src/Buyer/History.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';

function History({ user, onBack }) {
  const { t } = useLanguage();
  console.log("Checking history for user:", user?.username);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);

  // หมายเหตุ: ลบ useEffect ที่ดึงข้อมูล booths ทั้งหมดทิ้งไปแล้ว เพื่อเซฟ Cost การอ่านระดับ O(N) 
  // และเนื่องจาก Schema ใหม่ products ถูกแยก Collection ออกมาแล้ว

  // ดึงข้อมูลประวัติการทำรายการ
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchUserAndHistory = async () => {
      try {
        // 1. ตรวจสอบ user_id จาก props ก่อน เพื่อลด Cost การอ่าน db หากมีข้อมูลอยู่แล้ว
        let actualBuyerId = user.user_id || user.id;

        if (!actualBuyerId && user.username) {
          const userQ = query(collection(db, "users"), where("username", "==", user.username));
          const userSnap = await getDocs(userQ);

          if (userSnap.empty) {
            setHistoryList([]);
            setLoading(false);
            return;
          }
          const userData = userSnap.docs[0].data();
          actualBuyerId = userData.user_id || userData.id || userSnap.docs[0].id;
        }

        if (!actualBuyerId) {
          setHistoryList([]);
          setLoading(false);
          return;
        }

        // 2. ดึงประวัติจาก allbuys (ใช้ getDocs แทน onSnapshot ประหยัด Cost มากกว่าสำหรับหน้าประวัติ)
        const historyQ = query(collection(db, "allbuys"), where("user_id", "==", actualBuyerId));
        const historySnap = await getDocs(historyQ);

        if (!historySnap.empty) {
          const hList = historySnap.docs.map(doc => ({
            docId: doc.id,
            ...doc.data()
          }));
          hList.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
          setHistoryList(hList);
        } else {
          setHistoryList([]);
        }
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndHistory();
  }, [user]);

  // ใช้ itemImage ที่ส่งมาใน Data ได้เลย (ตรงตาม Schema ตะกร้าที่มีฟิลด์ image) ไม่ต้องควานหาข้าม Collection
  const getProductImage = (productId, variationName, itemImage) => {
    return itemImage || "https://placehold.co/100?text=No+Image";
  };

  const overallTotal = historyList.reduce((sum, doc) => sum + (doc.total_amount || 0), 0);

  if (!user) return <div className="text-center py-20 text-gray-500 font-bold text-xl">{t('pleaseLogin')}</div>;
  if (loading) return <div className="text-center py-20 text-pink-500 font-bold animate-pulse">{t('loadingHistory')}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 pb-20 pt-4">
      <button onClick={onBack} className="mb-6 flex items-center text-gray-400 hover:text-pink-500 font-bold transition-all group">
        <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> {t('backToCart')}
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-800">{t('myHistory')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('historyOf')}{user.username}</p>
        </div>

        <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 flex items-center gap-4 shadow-sm w-full md:w-auto">
          <div className="bg-pink-100 p-3 rounded-full text-pink-500 text-xl">💰</div>
          <div>
            <p className="text-xs text-pink-600 font-bold uppercase tracking-wider">{t('totalSpent')}</p>
            <p className="text-2xl font-black text-pink-600 leading-none">฿{overallTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 hidden md:grid grid-cols-12 md:gap-2 text-gray-500 font-medium text-xs lg:text-sm uppercase tracking-wider mb-4">
        <div className="col-span-6 flex items-center"><span>{t('colProduct')}</span></div>
        <div className="col-span-1 text-center">{t('colType')}</div>
        <div className="col-span-1 text-center">{t('colPrice')}</div>
        <div className="col-span-2 text-center">{t('colQuantity')}</div>
        <div className="col-span-2 text-center">{t('colTotal')}</div>
      </div>

      <div className="flex flex-col gap-8">
        {historyList.length === 0 ? (
          <div className="p-20 text-center text-gray-400 bg-white border border-gray-200 rounded-xl shadow-sm">{t('noHistory')}</div>
        ) : (
          historyList.map((historyDoc, idx) => {
            const formattedDate = new Date(historyDoc.transaction_date).toLocaleString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
            });

            return (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-white p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <span className="font-black text-gray-800 text-base md:text-lg flex flex-col md:flex-row md:items-center gap-1">
                      <span>🏪 {historyDoc.booth_name || t('unknownBooth')}</span>
                      {historyDoc.booth_numbers && (
                        <span className="text-sm font-normal text-gray-500">{t('boothPrefix')}{historyDoc.booth_numbers}</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400 font-medium block mt-1">{formattedDate}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 font-bold uppercase mr-2">{t('totalAmount')}</span>
                    <span className="text-lg font-black text-pink-500">฿{historyDoc.total_amount?.toLocaleString() || 0}</span>
                  </div>
                </div>

                {(historyDoc.items_detail || []).map((item, itemIdx) => {
                  const imageSrc = getProductImage(item.product_id, item.variation_name, item.image);
                  const isReserved = item.type === 'Reserved';
                  const isWishlist = item.type === 'Wishlist';
                  const variationLabel = [item.variation_name, item.option_name].filter(Boolean).join(" - ");

                  return (
                    <div key={itemIdx} className="p-4 border-b border-gray-100 last:border-0 flex flex-col md:grid md:grid-cols-12 md:gap-2 md:items-center bg-white transition-colors">
                      
                      {/* ข้อมูลสินค้าและรูปภาพ */}
                      <div className="md:col-span-6 md:order-1 flex items-start md:items-center gap-3 w-full">
                        <img src={imageSrc} alt={item.product_name} className="w-20 h-20 md:w-16 md:h-16 object-cover border border-gray-200 rounded-lg shadow-sm" />
                        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                          <p className="font-bold truncate text-sm text-gray-800 leading-tight">{item.product_name}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            {variationLabel && (
                              <div className="text-[10px] text-gray-500 bg-gray-50 border border-gray-200 px-2 py-1 rounded transition flex items-center gap-1">
                                <span className="truncate max-w-[100px] md:max-w-full">
                                  {t('chooseOption')}{item.option_name || item.variation || '-'}
                                </span>
                              </div>
                            )}
                            <span className={`md:hidden px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight shadow-sm ${isReserved ? 'bg-orange-100 text-orange-600 border border-orange-200' : isWishlist ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-pink-100 text-pink-600 border border-pink-200'}`}>
                              {item.type}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Type (Desktop) */}
                      <div className="hidden md:flex md:col-span-1 md:order-2 justify-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight shadow-sm ${isReserved ? 'bg-orange-100 text-orange-600 border border-orange-200' : isWishlist ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-pink-100 text-pink-600 border border-pink-200'}`}>
                          {item.type}
                        </span>
                      </div>

                      {/* ราคา, จำนวน, รวม (Mobile Layout) */}
                      <div className="flex flex-col mt-3 md:mt-0 md:contents">
                        <div className="flex items-center justify-between w-full md:contents">
                          
                          {/* ฝั่งซ้าย: ราคา และ จำนวน (Price & Qty) */}
                          <div className="flex items-center gap-4 md:contents flex-nowrap">
                            {/* ราคา */}
                            <div className="md:col-span-1 md:order-3 text-left md:text-center text-gray-600 text-[11px] md:text-xs font-bold whitespace-nowrap">
                              <span className="md:hidden font-medium mr-1 text-gray-400">{t('priceLabel')}</span>
                              ฿{item.price_per_unit?.toLocaleString() || item.price?.toLocaleString()}
                            </div>

                            {/* จำนวน */}
                            <div className="md:col-span-2 md:order-4 flex justify-start md:justify-center items-center whitespace-nowrap">
                              <span className="md:hidden font-medium text-gray-400 mr-2 text-[11px]">{t('qtyLabel')}</span>
                              <div className="flex items-center justify-center border border-gray-200 rounded-lg h-7 bg-white px-3 text-xs text-gray-800 font-bold shadow-sm">
                                x{item.quantity}
                              </div>
                            </div>
                          </div>

                          {/* ฝั่งขวา: ราคารวมรายการ (Total) */}
                          <div className="md:col-span-2 md:order-5 text-right md:text-center font-black text-[15px] md:text-base mb-1 md:mb-0">
                            <span className="md:hidden font-medium text-gray-400 mr-2 text-xs">{t('totalLabel')}</span>
                            <span className="text-gray-800">
                              ฿{(item.subtotal || ((item.price_per_unit || item.price) * item.quantity)).toLocaleString()}
                            </span>
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
    </div>
  );
}

export default History;