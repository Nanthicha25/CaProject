//src/Seller/SellerCalhistory.jsx
import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, limit, doc, deleteDoc, writeBatch, getDoc } from "firebase/firestore";
import { db } from "../firebase"; 
import { useLanguage } from '../LanguageContext';

const SellerCalhistory = ({ onBack, boothId }) => {
  const { t } = useLanguage();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State สำหรับจัดการ Popup
  const [popup, setPopup] = useState({
    isOpen: false,
    type: '',
    message: '',
    targetId: null // เก็บ ID ของรายการที่จะลบ
  });

  useEffect(() => {
    if (!boothId) return; 

    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, "transactions"),
          where("booth_id", "==", boothId),
          orderBy("transaction_date", "desc"),
          limit(30)
        );
        const querySnapshot = await getDocs(q);
        const historyData = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          docId: doc.id
        }));

        setHistory(historyData);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [boothId]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("th-TH", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  // --- ฟังก์ชันจัดการ Popup และการลบ ---
  const openDeletePopup = (id) => {
    setPopup({
      isOpen: true,
      type: 'confirm',
      message: t('popupDeleteConfirmMsg'),
      targetId: id
    });
  };

  const closePopup = () => {
    setPopup({ isOpen: false, type: '', message: '', targetId: null });
  };

  const handlePopupConfirm = async () => {
    if (popup.type === 'confirm' && popup.targetId) {
      try {
        // 1. หาข้อมูล Transaction ที่ต้องการลบจาก State
        const targetTransaction = history.find(t => t.docId === popup.targetId);
        
        if (targetTransaction && targetTransaction.items_detail) {
          const batch = writeBatch(db);

          // 2. จัดกลุ่มสินค้าตาม product_id เพื่อลดการอ่าน DB ซ้ำซ้อน
          const itemsByProduct = {};
          targetTransaction.items_detail.forEach(item => {
            if (!itemsByProduct[item.product_id]) itemsByProduct[item.product_id] = [];
            itemsByProduct[item.product_id].push(item);
          });

          // 3. วนลูปคืนค่า Stock ให้สินค้าแต่ละตัว
          for (const productId of Object.keys(itemsByProduct)) {
            const productRef = doc(db, "products", productId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
              const productData = productSnap.data();
              let newTotalStock = productData.total_stock || 0;
              let newVariations = productData.variations ? [...productData.variations] : [];

              itemsByProduct[productId].forEach(item => {
                // คืนค่าจำนวนสต๊อกรวม
                newTotalStock += item.quantity;

                // ถ้ามี Variation ให้หาตัวเลือกที่ตรงกันแล้วคืนค่าสต๊อกย่อย
                if (productData.has_variations && item.variation_name) {
                  newVariations = newVariations.map(variation => {
                    if (variation.variation_name === item.variation_name && variation.option_name === item.option_name) {
                      return { ...variation, stock: (variation.stock || 0) + item.quantity };
                    }
                    return variation;
                  });
                }
              });

              // นำคำสั่งอัปเดตสต๊อกใส่ลงใน Batch
              batch.update(productRef, {
                total_stock: newTotalStock,
                ...(productData.has_variations ? { variations: newVariations } : {})
              });
            }
          }

          // 4. นำคำสั่งลบ Transaction ใส่ลงใน Batch
          batch.delete(doc(db, "transactions", popup.targetId));

          // 5. สั่งรันคำสั่งทั้งหมดใน Batch พร้อมกัน
          await batch.commit();
        } else {
          // กรณีไม่มี Item Detail ให้ลบแค่บิลเฉยๆ
          await deleteDoc(doc(db, "transactions", popup.targetId));
        }
        
        // อัปเดต State ลบรายการนั้นออกจากหน้าจอโดยไม่ต้องรีเฟรช
        setHistory(prev => prev.filter(item => item.docId !== popup.targetId));
        
        // แสดง Popup สำเร็จ
        setPopup({
          isOpen: true,
          type: 'success',
          message: t('popupDeleteSuccessMsg'),
          targetId: null
        });

        // ปิด Popup อัตโนมัติหลังจาก 2 วินาที
        setTimeout(() => {
          setPopup(prev => ({ ...prev, isOpen: false }));
        }, 2000);

      } catch (error) {
        console.error("Error deleting document and restoring stock: ", error);
        setPopup({
          isOpen: true,
          type: 'error',
          message: t('popupDeleteErrorMsg'),
          targetId: null
        });
      }
    } else {
      closePopup();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-fade-in relative">

      <div className="p-4 md:p-8 flex-1 max-w-5xl mx-auto w-full">
        <div className="relative flex items-center justify-center mb-8">
          <button 
            onClick={onBack} 
            className="absolute left-0 flex items-center text-purple-500 hover:text-purple-600 font-bold transition bg-purple-50 px-4 py-2 rounded-full"
          >
            <span className="mr-2">←</span> {t('back')}
          </button>

          <h2 className="text-3xl font-black text-gray-800 flex items-center justify-center gap-3">
            {t('historyTitle')}
          </h2>
        </div>

        {loading ? (
          <div className="text-center mt-12 text-gray-400 font-bold text-lg animate-pulse">{t('loadingHistory')}</div>
        ) : history.length === 0 ? (
          <div className="text-center mt-12 py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 font-bold text-lg">{t('noHistory')}</div>
        ) : (
          history.map((transaction) => (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 mb-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden" key={transaction.docId}>
              <div className="absolute top-0 left-0 w-2 h-full bg-purple-500"></div>
              
              <div className="flex justify-between border-b border-dashed border-gray-200 pb-4 mb-4 items-start md:items-center flex-col md:flex-row gap-2">
                <div className="text-sm text-gray-500">
                  <span className="flex items-center gap-1">🕒 {t('time')} {formatDate(transaction.transaction_date)}</span>
                </div>
                <div className="flex">
                  {/* เปลี่ยนปุ่มเป็นสีแดงและเรียกใช้ openDeletePopup */}
                  <button 
                    onClick={() => openDeletePopup(transaction.docId)}
                    className="font-bold text-red-500 hover:text-red-700 bg-red-50 px-4 py-1.5 rounded-lg transition-colors text-sm flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {t('deleteBtn')}
                  </button>
                </div>
              </div>

              {/* รายการสินค้าในออเดอร์ */}
              <div className="space-y-3 mb-6">
                {transaction.items_detail?.map((item, index) => (
                  <div className="flex gap-4 items-center hover:bg-purple-50 p-3 rounded-xl transition-colors border border-transparent hover:border-purple-100 cursor-default" key={item.transitem_id || index}>
                    
                    <div className="w-14 h-14 bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400 rounded-lg shadow-inner overflow-hidden">
                      {item.image ? (
                         <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                         "IMG"
                      )}
                    </div>
                    
                    <div className="flex-1 text-sm">
                      <strong className="text-gray-800 text-base">{item.product_name}</strong>
                      
                      {(item.variation_name || item.option_name) && (
                        <div className="text-purple-500 font-medium text-xs mt-0.5 bg-purple-50 inline-block px-2 py-0.5 rounded">
                          {item.variation_name} {item.option_name ? `- ${item.option_name}` : ''}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right text-sm text-gray-600">
                      {item.quantity} x ฿{item.price_per_unit} <br/> 
                      <strong className="text-gray-800 text-base">=฿{item.subtotal}</strong>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-between items-center font-bold text-gray-800 text-base md:text-lg bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-3xl">
                <span className="text-gray-500 text-sm md:text-base flex items-center gap-1 md:gap-2">
                  <span className="hidden md:inline">{t('paymentMethodLabel')}</span> 
                  <span className="uppercase text-gray-700">{transaction.payment_method}</span>
                </span>
                <div className="text-right">
                  {t('totalLabel')} <span className="text-purple-600 font-black text-xl md:text-2xl ml-2">฿{transaction.total_amount}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ส่วนของ Popup */}
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
              {popup.type === 'success' ? t('popupSuccess') : popup.type === 'error' ? t('popupError') : popup.type === 'confirm' ? t('popupConfirm') : t('popupAlert')}
            </h3>
            <p className="text-gray-600 mb-8">{popup.message}</p>
            <div className="flex gap-3 w-full">
              {popup.type === 'confirm' && (
                <button onClick={closePopup} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-all active:scale-95">{t('cancel')}</button>
              )}
              <button onClick={handlePopupConfirm} className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95">
                {popup.type === 'confirm' ? t('popupOk') : t('popupClose')}
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default SellerCalhistory;