// src/Adminpage.jsx
import React, { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import ProductDetail from './Buyer/ProductDetail';

// ปรับปรุง: เปิดรับ Props เพื่อให้สามารถเปลี่ยนหน้า และ Logout ได้
const AdminPage = ({ user, setUser, setCurrentPage }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('General');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // State สำหรับ Modal ปฏิเสธ
  const [rejectModal, setRejectModal] = useState({ isOpen: false, productId: null, reason: '' });

  useEffect(() => {
    fetchPendingProducts();
  }, []);

  const fetchPendingProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "products"), where("status", "==", "pending"));
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        product_id: doc.id,
        ...doc.data() 
      }));
      setProducts(items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
    } catch (error) {
      console.error("Firebase Error:", error);
    }
    setLoading(false);
  };

  const handleApprove = async (id) => {
    if(!window.confirm("ยืนยันการอนุมัติสินค้าชิ้นนี้เข้าสู่ระบบ?")) return;
    try {
      await updateDoc(doc(db, "products", id), { status: 'approved' });
      setProducts(products.filter(p => p.id !== id));
      setSelectedProduct(null);
    } catch (error) { alert("เกิดข้อผิดพลาด: " + error.message); }
  };

  const openRejectModal = (id) => {
    setRejectModal({ isOpen: true, productId: id, reason: '' });
  };

  const confirmReject = async () => {
    if (!rejectModal.reason.trim()) {
      alert("กรุณาระบุเหตุผลในการปฏิเสธด้วยครับ");
      return;
    }
    try {
      await updateDoc(doc(db, "products", rejectModal.productId), { 
        status: 'rejected', 
        rejectReason: rejectModal.reason 
      });
      setProducts(products.filter(p => p.id !== rejectModal.productId));
      setSelectedProduct(null);
      setRejectModal({ isOpen: false, productId: null, reason: '' });
    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const filteredProducts = products.filter(p => {
    const isAdult = p.isR18 === true || p.category_main === 'R-18';
    return activeTab === 'R-18' ? isAdult : !isAdult;
  });

  // UI สำหรับ Modal ปฏิเสธ
  function renderRejectModal() {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}></div>
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in duration-200">
          <h3 className="text-xl font-bold text-gray-800 mb-2">ระบุเหตุผลที่ไม่อนุมัติ</h3>
          <p className="text-sm text-gray-500 mb-4">เหตุผลนี้จะถูกส่งไปให้ผู้ขายเพื่อนำไปแก้ไขสินค้า</p>
          
          <textarea 
            className="w-full border border-gray-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
            rows="4"
            placeholder="ตัวอย่าง: รูปภาพไม่ชัดเจน หรือ ข้อมูลสินค้าไม่ครบถ้วน..."
            value={rejectModal.reason}
            onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
            autoFocus
          ></textarea>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}
              className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-xl active:scale-95 transition-all"
            >
              ยกเลิก
            </button>
            <button 
              onClick={confirmReject}
              className="flex-1 py-3 font-bold text-white bg-pink-600 rounded-xl shadow-lg shadow-pink-200 active:scale-95 transition-all"
            >
              ยืนยันการปฏิเสธ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#fafafa] font-sans overflow-hidden">
      
      {/* ---------------- ส่วนที่ 1: FIXED SIDEBAR ฝั่งซ้าย ---------------- */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col shadow-lg z-20">
        <div className="p-6 mt-4">
          <div className="text-pink-500 font-black text-3xl mb-10 text-center tracking-tighter">
            Art List
          </div>

          <ul className="space-y-3">
            {/* เมนูที่ 1: ตรวจสอบสินค้า (หน้าปัจจุบัน - ไฮไลท์สีชมพู) */}
            <li>
              <button 
                className="w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center bg-pink-500 text-white font-bold shadow-md shadow-pink-200"
              >
                <span className="mr-3 text-lg">📦</span> ตรวจสอบสินค้า
              </button>
            </li>
            
            {/* เมนูที่ 2: อนุมัติร้านค้า (กดแล้วสลับหน้าไป Admincheck) */}
            <li>
              <button 
                onClick={() => setCurrentPage('admincheck')}
                className="w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center text-gray-600 hover:bg-pink-50 hover:text-pink-600 font-bold"
              >
                <span className="mr-3 text-lg">🏪</span> อนุมัติร้านค้า
              </button>
            </li>
          </ul>
        </div>
        
        {/* ปุ่มออกจากระบบท้าย Sidebar */}
        <div className="mt-auto p-6 border-t border-gray-100">
          <button 
            onClick={() => setUser(null)}
            className="w-full text-left px-4 py-3 rounded-2xl transition flex items-center text-gray-400 hover:bg-red-50 hover:text-red-500 font-bold"
          >
            <span className="mr-3">🚪</span> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ---------------- ส่วนที่ 2: MAIN CONTENT ฝั่งขวา ---------------- */}
      <main className="flex-1 overflow-y-auto relative">
        {selectedProduct ? (
          /* รายละเอียดสินค้า (เมื่อกดเข้ามาดู) */
          <div className="bg-white min-h-full pb-10">
            <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <button onClick={() => setSelectedProduct(null)} className="text-gray-500 font-bold flex items-center gap-1 text-sm">
                  <span className="text-lg">←</span> ย้อนกลับ
                </button>
                <div className="flex gap-2">
                  <button onClick={() => openRejectModal(selectedProduct.id)} className="px-4 py-2 text-xs font-bold border border-pink-200 text-pink-600 rounded-lg">ปฏิเสธ</button>
                  <button onClick={() => handleApprove(selectedProduct.id)} className="px-4 py-2 text-xs font-bold bg-pink-600 text-white rounded-lg shadow-md">อนุมัติสินค้า</button>
                </div>
              </div>
            </div>
            <div className="pb-10">
              <ProductDetail product={selectedProduct} onBack={() => setSelectedProduct(null)} isSellerView={true} user={{}} />
            </div>
          </div>
        ) : (
          /* รายการสินค้าที่รอการตรวจสอบทั้งหมด */
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-100">
              <div className="px-8 py-6 md:py-8 flex justify-between items-center">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-6 bg-pink-600 rounded-full"></span>
                    Product Verification
                  </h1>
                  <p className="text-xs md:text-sm text-gray-400 mt-1 uppercase tracking-widest font-semibold">Admin Panel</p>
                </div>
                <button onClick={fetchPendingProducts} className="p-2 text-pink-600 hover:bg-pink-50 rounded-full transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </button>
              </div>
            </div>

            {/* Sticky Tabs */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
              <div className="flex">
                <button onClick={() => setActiveTab('General')} className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'General' ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/30' : 'text-gray-400'}`}>
                  ทั่วไป ({products.filter(p => !(p.isR18 || p.category_main === 'R-18')).length})
                </button>
                <button onClick={() => setActiveTab('R-18')} className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'R-18' ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/30' : 'text-gray-400'}`}>
                  R-18 ({products.filter(p => p.isR18 || p.category_main === 'R-18').length})
                </button>
              </div>
            </div>

            {/* Product Grid */}
            <div className="px-8 py-6">
              {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div></div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-32 bg-white rounded-2xl border border-gray-100">
                  <p className="text-gray-400 font-bold">ไม่มีสินค้าที่รอการตรวจสอบ</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                    <div 
                      key={product.id} 
                      onClick={() => setSelectedProduct(product)}
                      className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-pink-200 cursor-pointer transition-all flex md:flex-col"
                    >
                      <div className="w-32 h-32 md:w-full md:h-64 flex-shrink-0 relative">
                        <img src={product.cover_image} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="p-4 flex flex-col justify-between flex-1">
                        <div>
                          <p className="text-[10px] font-bold text-pink-600 mb-1 uppercase tracking-tight">{product.booth_name}</p>
                          <h3 className="font-bold text-gray-800 text-sm md:text-base line-clamp-2 leading-snug">{product.name}</h3>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-lg font-bold text-gray-900">฿{product.price}</span>
                          <button className="text-[10px] font-bold py-1 px-3 bg-gray-50 text-gray-500 rounded-full border border-gray-100">ตรวจสอบ</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* เรียกใช้ Modal เมื่อมีการกดปฏิเสธ */}
      {rejectModal.isOpen && renderRejectModal()}
    </div>
  );
};

export default AdminPage;