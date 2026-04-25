import React, { useState, useEffect } from 'react';
import SellerAddProduct from './SellerAddproduct';
import { db } from '../firebase'; // ตรวจสอบ path ไฟล์ firebase.js ให้ถูกต้อง
import { collection, getDocs } from 'firebase/firestore';

const DEFAULT_PRODUCT = "https://placehold.co/400x400/f3f4f6/9ca3af?text=Product";

function SellerProduct({ user, eventData }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // State สำหรับเก็บข้อมูลสินค้าจาก Firestore
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);

    // --- ส่วนที่เพิ่ม: State สำหรับ Modal ลบ ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ดึงข้อมูลสินค้าจาก Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "booths"));
        let allMyProducts = [];
        
        querySnapshot.forEach((doc) => {
          const booth = doc.data();
          if (booth.products) {
            // กรองเอาเฉพาะสินค้าที่ creator ตรงกับชื่อคนที่ล็อกอิน (ไม่เห็นของคนอื่นในบูธ)
            const myItems = booth.products.filter(p => p.creator?.trim() === user?.username?.trim());
            allMyProducts = [...allMyProducts, ...myItems];
          }
        });
        
        // ลบสินค้าที่ ID ซ้ำกันออก (เผื่อกรณีข้อมูลซ้ำซ้อน)
        const uniqueProducts = Array.from(new Map(allMyProducts.map(item => [item.id, item])).values());
        setMyProducts(uniqueProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.username) {
      fetchProducts();
    }
  }, [user]);

  // ถ้ามีการกดเพิ่ม หรือ แก้ไข ให้แสดงหน้า SellerAddProduct
  if (isAdding || editingId) {
    return (
      <SellerAddProduct 
        user={user} 
        eventData={eventData} // ส่ง eventData ไปเผื่อไฟล์ลูกยังต้องใช้
        editingProductId={editingId} 
        onBack={() => {
          setIsAdding(false);
          setEditingId(null);
        }} 
      />
    );
  }



  // ฟังก์ชันเมื่อกดปุ่มลบในตาราง
  const handleDeleteClick = (product) => {
    setDeleteTarget(product);
    setIsModalOpen(true);
  };

  // ฟังก์ชันยืนยันการลบจริง
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      // อ้างอิงไปยัง Document ของ Booth นั้นๆ (ใช้ boothId ที่เก็บไว้ตอน Fetch)
      const boothRef = doc(db, "booths", deleteTarget.boothId);
      
      await updateDoc(boothRef, {
        products: arrayRemove(deleteTarget) // ลบ Object สินค้าที่ตรงกันออกจาก Array
      });

      // อัปเดต UI ทันที
      setMyProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
      setIsModalOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting:", error);
      alert("ไม่สามารถลบข้อมูลได้");
    }
  };


  return (
  <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
    {/* Header Section */}
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">จัดการสินค้า (Inventory)</h1>
        <p className="text-gray-500 mt-1">สินค้าทั้งหมดของ {user.username}</p>
      </div>
      <button 
        onClick={() => setIsAdding(true)} 
        className="bg-purple-600 text-white border-2 border-purple-600 px-5 py-3 rounded-xl font-bold hover:bg-white hover:text-purple-600 transition-all duration-300 shadow-md active:scale-95 w-full md:w-auto whitespace-nowrap flex justify-center items-center gap-2"
      >
        <span className="text-xl leading-none">+</span> เพิ่มสินค้าใหม่
      </button>
    </div>

    {/* Table / Card Container */}
    <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
      <div className="overflow-x-auto overflow-y-hidden">
        {/* ใช้ตารางแบบซ่อนหัวบนมือถือ และแสดงผลเป็นบล็อก */}
        <table className="w-full border-collapse">
          {/* หัวตาราง - ซ่อนบนหน้าจอขนาดเล็ก */}
          <thead className="hidden md:table-header-group">
            <tr>
              <th className="bg-purple-50 p-4 border-b-2 border-purple-400 text-purple-700 font-bold text-sm text-left">สินค้า (Product)</th>
              <th className="bg-purple-50 p-4 border-b-2 border-purple-400 text-purple-700 font-bold text-sm text-left">ตัวเลือก (Variation)</th>
              <th className="bg-purple-50 p-4 border-b-2 border-purple-400 text-purple-700 font-bold text-sm text-left">Option</th>
              <th className="bg-purple-50 p-4 border-b-2 border-purple-400 text-purple-700 font-bold text-sm text-left">ราคา (Price)</th>
              <th className="bg-purple-50 p-4 border-b-2 border-purple-400 text-purple-700 font-bold text-sm text-left">สต็อก (Stock)</th>
              <th className="bg-purple-50 p-4 border-b-2 border-purple-400 text-purple-700 font-bold text-sm text-center">จัดการ (Actions)</th>
            </tr>
          </thead>
          
          <tbody className="block md:table-row-group">
            {loading ? (
              <tr className="block md:table-row">
                <td colSpan="5" className="p-10 text-center text-purple-500 font-bold block md:table-cell">
                  <div className="flex justify-center items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                    กำลังโหลดข้อมูลสินค้า...
                  </div>
                </td>
              </tr>
            ) : myProducts.length === 0 ? (
              <tr className="block md:table-row">
                <td colSpan="5" className="p-10 text-center text-gray-400 font-medium block md:table-cell">คุณยังไม่มีสินค้าในระบบ</td>
              </tr>
            ) : (
              myProducts.map(product => {
                const totalStock = product.variations && product.variations.length > 0
                  ? product.variations.reduce((sum, v) => sum + (v.options?.reduce((optSum, opt) => optSum + (opt.stock || 0), 0) || 0), 0)
                  : product.stock ?? 0;

                const catName = product.classification?.category?.split('/').pop() || "ไม่ได้ระบุหมวดหมู่";

                return (
                  <tr key={product.id} className="block md:table-row hover:bg-purple-50/30 transition border-b border-gray-100 last:border-0 md:border-b">
                    
                    {/* ข้อมูลสินค้าหลัก */}
                    <td className="p-4 block md:table-cell align-middle">
                      <div className="flex items-center gap-4">
                        <img 
                          src={product.product_images?.cover_image || product.images?.[0] || DEFAULT_PRODUCT} 
                          alt={product.name} 
                          className="w-14 h-14 md:w-12 md:h-12 rounded-lg object-cover border border-gray-200 shadow-sm shrink-0" 
                          onError={(e) => { e.target.src = DEFAULT_PRODUCT }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-800 text-sm md:text-base flex flex-wrap items-center gap-2">
                            <span className="truncate">{product.name}</span>
                            {product.classification?.preorder && (
                              <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-full border border-orange-200 shrink-0 font-bold">PRE</span>
                            )}
                          </p>
                          <p className="text-xs text-purple-500 font-medium mt-0.5">{catName}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">ID: {product.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* ตัวเลือกสินค้า - แสดงเป็น Label บนมือถือ */}
                    <td className="px-4 py-2 md:p-4 block md:table-cell align-middle">
                      <div className="flex justify-between md:block">
                        <span className="text-xs font-bold text-gray-400 uppercase md:hidden">ตัวเลือก:</span>
                        <span className="text-sm md:text-base text-gray-700">สีขาว</span>
                      </div>
                    </td>

                    {/* option - แสดงเป็น Label บนมือถือ */}
                    <td className="px-4 py-2 md:p-4 block md:table-cell align-middle">
                      <div className="flex justify-between md:block">
                        <span className="text-xs font-bold text-gray-400 uppercase md:hidden">option:</span>
                        <span className="text-sm md:text-base text-gray-700">สีขาว</span>
                      </div>
                    </td>

                    {/* ราคา */}
                    <td className="px-4 py-2 md:p-4 block md:table-cell align-middle">
                      <div className="flex justify-between items-baseline md:block">
                        <span className="text-xs font-bold text-gray-400 uppercase md:hidden">ราคา:</span>
                        <span className="font-black text-purple-600 text-lg md:text-xl">฿{product.price}</span>
                      </div>
                    </td>
                    
                   {/* สต็อก */}
                    <td className="px-4 py-2 md:p-4 block md:table-cell align-middle">
                    <div className="flex justify-between items-center md:block">
                    <span className="text-xs font-bold text-gray-400 uppercase md:hidden">สต็อกคงเหลือ:</span>
                    {/* เช็คเงื่อนไข: ถ้า totalStock เป็น 0 ให้ใช้ text-red-500 ถ้าไม่ใช่ให้ใช้ text-gray-700 หรือ text-black */}
                    <p className={`text-lg font-black ${totalStock === 0 ? 'text-red-500' : 'text-gray-700'}`}>
                      <span className="font-black">{totalStock}</span>
                     </p>
                    </div>
                    </td>

                   {/* ปุ่มจัดการ */}
                    <td className="p-4 block md:table-cell align-middle">
                    <div className="flex flex-col items-end md:items-center justify-center gap-2 border-t md:border-0 mt-2 pt-3 md:mt-0 md:pt-0">
    
                     {/* ปุ่มแก้ไข - อยู่บรรทัดบน ชิดขวา */}
                      <button 
                      onClick={() => setEditingId(product.id)} 
                      className="text-blue-500 font-bold text-sm hover:underline hover:text-blue-700 transition"
                       >
                      แก้ไข (Edit)
                      </button>

                      {/* ปุ่มลบ - อยู่บรรทัดล่าง ชิดขวาตรงกัน */}
                      <button 
                      onClick={() => handleDeleteClick(product)} 
                      className="text-red-500 font-bold text-sm hover:underline hover:text-red-700 transition"
                      >
                       ลบ (Delete)
                      </button>
                        </div>
                    </td>
                    
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>

                {/* --- Popup Modal --- */}
{isModalOpen && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    {/* Overlay */}
    <div className="absolute inset-0 bg-purple-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
    
    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden relative animate-pop-in border border-purple-100">
      <div className="bg-purple-600 p-8 text-center text-white">
        <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">⚠️</span>
        </div>
        <h3 className="text-2xl font-black">ยืนยันการลบ?</h3>
      </div>
      
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-2">คุณต้องการลบรายการนี้ใช่หรือไม่?</p>
        <div className="bg-purple-50 p-4 rounded-2xl mb-8 border border-purple-100">
            <p className="font-bold text-purple-700 text-lg">
                🛍️ {deleteTarget?.name}
            </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setIsModalOpen(false)} className="py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl">ยกเลิก</button>
          <button onClick={confirmDelete} className="py-4 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-200">ยืนยันลบ</button>
        </div>
      </div>
    </div>
  </div>
)}

    </div>
  );
}

export default SellerProduct;