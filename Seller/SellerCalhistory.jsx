import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "../firebase"; 

const SellerCalhistory = ({ onBack }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const BOOTH_ID = "b_0001";

  // --- ส่วนของ State สำหรับ Modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'order'|'item', id: string, name: string, parentId?: string, amount?: number }

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "transactions"),
        where("booth_id", "==", BOOTH_ID)
      );
      const querySnapshot = await getDocs(q);
      const historyData = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        docId: doc.id
      }));

      historyData.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
      setHistory(historyData);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("th-TH", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  // --- ฟังก์ชันเปิด Modal ---
  const openDeleteModal = (type, id, name, parentId = null, amount = 0) => {
    setDeleteTarget({ type, id, name, parentId, amount });
    setIsModalOpen(true);
  };

  // --- ฟังก์ชันยืนยันการลบ (เชื่อมต่อ Firebase) ---
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === "order") {
        // ลบทั้ง Document ออเดอร์
        await deleteDoc(doc(db, "transactions", deleteTarget.id));
      } else {
        // ลบสินค้าชิ้นเดียวออกจาก Array ใน Firestore (และ Update ยอดรวม)
        const orderRef = doc(db, "transactions", deleteTarget.parentId);
        const currentOrder = history.find(h => h.docId === deleteTarget.parentId);
        const itemToDelete = currentOrder.items_detail.find(i => i.id === deleteTarget.id);

        await updateDoc(orderRef, {
          items_detail: arrayRemove(itemToDelete),
          total_amount: currentOrder.total_amount - deleteTarget.amount
        });
      }
      
      setIsModalOpen(false);
      fetchHistory(); // Refresh ข้อมูลใหม่
    } catch (error) {
      console.error("Delete error:", error);
      alert("เกิดข้อผิดพลาดในการลบข้อมูล");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-fade-in relative">
      <div className="p-4 md:p-8 flex-1 max-w-5xl mx-auto w-full">
        <button 
          className="bg-white text-purple-600 border border-purple-200 px-4 py-2 rounded-xl font-bold ml-4 hover:bg-purple-50 transition-colors flex items-center gap-2 shadow-sm" 
          onClick={onBack}
        >
          ◀ กลับไปหน้าขาย
        </button>
        
        <h2 className="text-3xl font-black text-center text-gray-800 mb-8 flex items-center justify-center gap-3">
          <span className="text-purple-500">📄</span> ประวัติการขาย (History)
        </h2>

        {loading ? (
          <div className="text-center mt-12 text-gray-400 font-bold text-lg animate-pulse">กำลังโหลดข้อมูลประวัติ...</div>
        ) : history.length === 0 ? (
          <div className="text-center mt-12 py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 font-bold text-lg">ยังไม่มีประวัติการขาย</div>
        ) : (
          history.map((transaction) => (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 mb-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden" key={transaction.docId}>
              <div className="absolute top-0 left-0 w-2 h-full bg-purple-500"></div>
              
              {/* Header ออเดอร์ */}
              <div className="px-3 flex justify-between border-b border-dashed border-gray-200 pb-4 mb-4 items-center gap-4">
                <div className="flex-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1 font-medium">
                    🕒 เวลา: {formatDate(transaction.transaction_date)}
                  </span>
                </div>

                <div className="flex items-center gap-12">
                  <div className="w-24"></div> 
                  <div className="w-16 text-right">
                    <button 
                      onClick={() => openDeleteModal('order', transaction.docId, 'ทั้งออเดอร์')}
                      className="text-red-500 font-bold hover:text-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              {/* รายการสินค้า */}
              <div className="space-y-3 mb-6">
                {transaction.items_detail?.map((item) => (
                  <div className="flex gap-4 items-center hover:bg-purple-50 p-3 rounded-xl transition-colors border border-transparent hover:border-purple-100 cursor-default" key={item.id}>
                    <div className="w-14 h-14 bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400 rounded-lg shadow-inner">
                      IMG
                    </div>
                    <div className="flex-1 min-w-0">
                      <strong className="text-gray-800 text-base block">{item.name}</strong>
                      {item.variation && (
                        <div className="mt-1">
                          <span className="px-2 py-0.5 border border-purple-200 bg-purple-50 text-purple-600 rounded text-xs font-medium">
                            {item.variation} - {item.option}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-12">
                      <div className="text-right text-sm w-24">
                        <span className="text-gray-500">{item.quantity} x ฿{item.price}</span>
                        <div className="text-gray-800 font-bold text-base">= ฿{item.subtotal}</div>
                      </div>
                      <div className="w-16 text-right">
                        <button 
                          onClick={() => openDeleteModal('item', item.id, item.name, transaction.docId, item.subtotal)}
                          className="text-red-500 font-bold hover:text-red-700 transition-colors"
                        >
                          Delete
                        </button>     
                      </div>  
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer ยอดรวม */}
              <div className="border-t border-gray-100 pt-4 flex justify-between items-center font-bold text-gray-800 text-base md:text-lg bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-3xl">
                <span className="text-gray-500 text-sm md:text-base flex items-center gap-2">
                  💳 ชำระผ่าน: <span className="uppercase text-gray-700">{transaction.payment_method}</span>
                </span>
                <div className="text-right">
                  ยอดรวม: <span className="text-purple-600 font-black text-xl md:text-2xl ml-2">฿{transaction.total_amount}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- ส่วนของ Popup Modal (UI ม่วงสวยๆ) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-purple-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden relative animate-pop-in border border-purple-100">
            <div className="bg-purple-600 p-8 text-center text-white relative">
              <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 scale-110">
                <span className="text-4xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-black">ยืนยันการลบ?</h3>
            </div>
            
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-2">คุณต้องการลบรายการนี้ใช่หรือไม่?</p>
              <div className="bg-purple-50 p-4 rounded-2xl mb-8 border border-purple-100">
                  <p className="font-bold text-purple-700 text-lg">
                      {deleteTarget?.type === 'order' ? '❌ ลบออเดอร์ทั้งหมด' : `🛍️ ${deleteTarget?.name}`}
                  </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl transition-all"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={confirmDelete}
                  className="py-4 px-6 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-200 transition-all"
                >
                  ยืนยันลบ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerCalhistory;