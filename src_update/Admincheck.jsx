// src/Admincheck.jsx
import React, { useState, useEffect } from 'react';
import { db } from './firebase'; // เช็ค path ให้ตรงกับโครงสร้างของคุณ
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

const Admincheck = ({ setCurrentPage, setUser }) => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูล Seller ที่รออนุมัติ
  useEffect(() => {
    fetchPendingSellers();
  }, []);

  const fetchPendingSellers = async () => {
    setLoading(true);
    try {
      // 1. แก้ไขตรงนี้: ดึงข้อมูลจาก collection "sellers" แทน "users"
      const q = query(
        collection(db, "sellers"), 
        where("role", "==", "seller"), 
        where("status", "==", "pending")
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // เรียงจากสมัครล่าสุดขึ้นก่อน
      setSellers(items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
    } catch (error) {
      console.error("Firebase Error:", error);
    }
    setLoading(false);
  };

  const handleApprove = async (id) => {
    if(!window.confirm("ยืนยันการอนุมัติร้านค้านี้เข้าสู่ระบบ?")) return;
    try {
      // 2. แก้ไขตรงนี้: อัปเดตข้อมูลใน collection "sellers"
      await updateDoc(doc(db, "sellers", id), { status: 'approved' });
      setSellers(sellers.filter(s => s.id !== id));
    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const handleReject = async (id) => {
    // ใช้ Prompt ง่ายๆ เพื่อขอเหตุผลในการปฏิเสธ
    const reason = window.prompt("โปรดระบุเหตุผลที่ปฏิเสธ (เช่น ลิงก์โซเชียลไม่ถูกต้อง, นามปากกาผิด):");
    if (reason === null) return; // กดยกเลิก
    if (!reason.trim()) {
      alert("กรุณาระบุเหตุผลด้วยครับ");
      return;
    }

    try {
      // 3. แก้ไขตรงนี้: อัปเดตข้อมูลใน collection "sellers"
      await updateDoc(doc(db, "sellers", id), { 
        status: 'rejected',
        rejectReason: reason
      });
      setSellers(sellers.filter(s => s.id !== id));
    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  return (
    <div className="flex h-screen bg-[#fafafa] font-sans overflow-hidden">
      
      {/* ---------------- Sidebar ฝั่งซ้าย (Fixed) ---------------- */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col shadow-lg z-20">
        <div className="p-6 mt-4">
          <div className="text-pink-500 font-black text-3xl mb-10 text-center tracking-tighter">
            Art List
          </div>

          <ul className="space-y-3">
            {/* ปุ่มไปหน้าตรวจสอบสินค้า */}
            <li>
              <button 
                onClick={() => setCurrentPage('adminpage')}
                className="w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center text-gray-600 hover:bg-pink-50 hover:text-pink-600 font-bold"
              >
                <span className="mr-3 text-lg">📦</span> ตรวจสอบสินค้า
              </button>
            </li>
            
            {/* ปุ่มหน้าปัจจุบัน (หน้าอนุมัติร้านค้า) */}
            <li>
              <button 
                className="w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center bg-pink-500 text-white font-bold shadow-md shadow-pink-200"
              >
                <span className="mr-3 text-lg">🏪</span> อนุมัติร้านค้า
              </button>
            </li>
          </ul>
        </div>
        
        {/* ปุ่มออกจากระบบด้านล่างสุด */}
        <div className="mt-auto p-6 border-t border-gray-100">
          <button 
            onClick={() => setUser(null)}
            className="w-full text-left px-4 py-3 rounded-2xl transition flex items-center text-gray-400 hover:bg-red-50 hover:text-red-500 font-bold"
          >
            <span className="mr-3">🚪</span> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ---------------- Main Content ฝั่งขวา ---------------- */}
      <main className="flex-1 overflow-y-auto relative">
        
        {/* Header แถบด้านบน */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
          <div className="px-8 py-6 md:py-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <span className="w-2 h-6 bg-pink-600 rounded-full"></span>
                Check Seller Signup
              </h1>
              <p className="text-sm text-gray-400 mt-1 uppercase tracking-widest font-semibold">
                Admin Panel
              </p>
            </div>
            
            {/* ปุ่ม Refresh ข้อมูล */}
            <button onClick={fetchPendingSellers} className="p-2 text-pink-600 hover:bg-pink-50 rounded-full transition-colors" title="รีเฟรชข้อมูล">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
          </div>
        </div>

        {/* พื้นที่แสดงรายการคำขอ */}
        <div className="px-8 py-8 max-w-5xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : sellers.length === 0 ? (
            <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="text-4xl mb-4">🎉</div>
              <p className="text-gray-500 font-bold text-lg">ไม่มีร้านค้าที่รอการอนุมัติในขณะนี้</p>
              <p className="text-sm text-gray-400 mt-2">คุณจัดการทุกคำขอเสร็จเรียบร้อยแล้ว</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {sellers.map((seller) => (
                <div key={seller.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  
                  {/* ข้อมูลของครีเอเตอร์ */}
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-800">{seller.penName || 'ไม่ระบุนามปากกา'}</h3>
                      <span className="px-3 py-1 bg-yellow-50 text-yellow-600 text-xs font-bold rounded-full border border-yellow-100">
                        Pending
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm text-gray-600 mb-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                      <p><span className="font-bold text-gray-700 mr-2">Email:</span> {seller.email}</p>
                      <p className="truncate">
                        <span className="font-bold text-gray-700 mr-2">Social:</span>
                        <a href={seller.socialLink} target="_blank" rel="noreferrer" className="text-pink-600 hover:underline hover:text-pink-700 font-medium">
                          ดูโปรไฟล์ ↗
                        </a>
                      </p>
                    </div>

                    {/* แสดงป้ายบอกวันและเลขบูธ */}
                    <div className="flex flex-wrap gap-2">
                      {seller.day30 && (
                        <div className="px-4 py-2 bg-purple-50/80 text-purple-700 rounded-xl text-xs font-bold border border-purple-100 flex items-center gap-2">
                          <span>📅 30 พ.ค.</span>
                          <span className="w-px h-3 bg-purple-200"></span>
                          <span>บูธ: {seller.booth30 || '-'}</span>
                        </div>
                      )}
                      {seller.day31 && (
                        <div className="px-4 py-2 bg-blue-50/80 text-blue-700 rounded-xl text-xs font-bold border border-blue-100 flex items-center gap-2">
                          <span>📅 31 พ.ค.</span>
                          <span className="w-px h-3 bg-blue-200"></span>
                          <span>บูธ: {seller.booth31 || '-'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ปุ่มกดอนุมัติ/ปฏิเสธ */}
                  <div className="flex md:flex-col gap-3 w-full md:w-36 flex-shrink-0">
                    <button 
                      onClick={() => handleApprove(seller.id)}
                      className="flex-1 md:w-full py-3 bg-pink-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-pink-200 hover:bg-pink-700 active:scale-95 transition-all"
                    >
                      อนุมัติร้านค้า
                    </button>
                    <button 
                      onClick={() => handleReject(seller.id)}
                      className="flex-1 md:w-full py-3 bg-white text-gray-500 text-sm font-bold rounded-2xl hover:bg-gray-50 hover:text-red-500 active:scale-95 transition-all border border-gray-200"
                    >
                      ปฏิเสธคำขอ
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </main>

    </div>
  );
};

export default Admincheck;