//src/Seller/SellerStorePage.jsx
import React, { useState, useEffect } from 'react';
import ProductDetail from '../Buyer/ProductDetail'; 
import { db } from '../firebase'; 
import { collection, query, where, getDocs, doc, updateDoc, or } from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';

const DEFAULT_COVER = "https://placehold.co/1200x400/e9d5ff/9333ea?text=No+Cover+Image";
const DEFAULT_PROFILE = "https://placehold.co/700x700/f3f4f6/a855f7?text=Logo";
const DEFAULT_PRODUCT = "https://placehold.co/400x400/f3f4f6/9ca3af?text=Product";

// --- ใส่ค่า Cloudinary ของคุณตรงนี้ ---
const CLOUDINARY_CLOUD_NAME = "dlbmwbcjj"; 
const CLOUDINARY_UPLOAD_PRESET = "caproject";

function SellerStorePage({ user }) {
  const { t } = useLanguage();
  const [myBooth, setMyBooth] = useState(null);
  const [products, setProducts] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCreator, setSelectedCreator] = useState("all");
  
  const [popup, setPopup] = useState({ isOpen: false, message: '', type: 'success' });

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ coverImage: '', description: '' });
  const [saving, setSaving] = useState(false);
  
  // --- เพิ่ม State สำหรับเช็คว่ากำลังโหลดรูปลง Cloudinary อยู่ไหม ---
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  useEffect(() => {
    const fetchMyBooth = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "booths"),
          or(
              where("main_creator", "==", user.username),
              where("co_creators", "array-contains", user.username)
            )
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const data = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
          setMyBooth(data);
          setEditData({
            coverImage: data.cover_image || '', 
            description: data.description || ''
          });

          if (data.booth_id) {
            const productsQuery = query(collection(db, "products"), where("booth_id", "==", data.booth_id));
            const productsSnapshot = await getDocs(productsQuery);
            const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(productsData);
          }
        }
      } catch (error) {
        console.error("Error fetching my booth:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.username) fetchMyBooth();
  }, [user]);

  // --- ฟังก์ชันอัปโหลดรูปปกไป Cloudinary ---
  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingCover(true); // เปิดสถานะกำลังโหลด
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.secure_url) {
        // เมื่อได้ Link กลับมา ให้เอาไปเซ็ตใส่ editData แทนการพิมพ์ข้อความ
        setEditData({ ...editData, coverImage: data.secure_url });
      }
    } catch (error) {
      console.error("Upload error:", error);
      setPopup({ isOpen: true, message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ', type: 'error' });
    } finally {
      setIsUploadingCover(false); // ปิดสถานะกำลังโหลด
    }
  };

  const handleSaveBooth = async () => {
    if (!myBooth) return;
    setSaving(true);
    try {
      const boothRef = doc(db, "booths", myBooth.id);
      await updateDoc(boothRef, {
        cover_image: editData.coverImage,
        description: editData.description
      });
      
      setMyBooth(prev => ({ 
        ...prev, 
        cover_image: editData.coverImage,
        description: editData.description 
      }));
      
      setIsEditing(false);
      setPopup({ isOpen: true, message: t('saveBoothSuccess'), type: 'success' });
    } catch (error) {
      console.error("Error updating booth:", error);
      setPopup({ isOpen: true, message: t('saveBoothError'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
      <p className="text-purple-500 font-bold">{t('loadingBooth')}</p>
    </div>
  );

  if (!myBooth) return (
    <div className="flex flex-col items-center justify-center h-96 bg-white rounded-3xl border-2 border-dashed border-gray-200">
      <span className="text-5xl mb-4">🏪</span>
      <h2 className="text-xl font-bold text-gray-500">{t('boothNotFound')}</h2>
      <p className="text-gray-400 mt-2">{t('userNoBooth1')}{user.username}{t('userNoBooth2')}</p>
    </div>
  );

  const allCreators = ["all", myBooth.main_creator, ...(myBooth.co_creators || [])];
  const filteredProducts = products?.filter(p =>
    selectedCreator === "all" ? true : (p.creator || myBooth.main_creator) === selectedCreator
  ) || [];

  if (selectedProduct) {
    return (
      <ProductDetail 
        product={selectedProduct} 
        user={user}
        isSellerView={true}
        onBack={() => setSelectedProduct(null)}
      />
    );
  }

  return (
    <div className="bg-white rounded-3xl animate-fade-in w-full min-h-[800px] shadow-sm border border-purple-100 overflow-hidden relative">
      
      {/* --- Popup Modal --- */}
      {popup.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in px-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center border border-purple-50">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 text-3xl shadow-inner
              ${popup.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 
                popup.type === 'error' ? 'bg-rose-50 text-rose-500' : 
                'bg-amber-50 text-amber-500'}`}>
              {popup.type === 'success' && '✓'}
              {popup.type === 'error' && '✕'}
              {popup.type === 'warning' && '!'}
            </div>
            <h3 className="text-2xl font-black text-gray-800 mb-2">
              {popup.type === 'success' ? t('popupSuccessTitle') : 
               popup.type === 'error' ? t('popupErrorTitle') : t('popupAlertTitle')}
            </h3>
            <p className="text-gray-500 font-medium mb-8 leading-relaxed">
              {popup.message}
            </p>
            <button 
              onClick={() => setPopup({ ...popup, isOpen: false })}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg active:scale-95
                ${popup.type === 'error' 
                  ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200 text-white' 
                  : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200 text-white'}`}
            >
              {t('btnOk')}
            </button>
          </div>
        </div>
      )}

      {/* --- Header ร้านค้า --- */}
      <div className="bg-white pb-6 shadow-sm relative">
        {myBooth.main_creator === user.username && (
          <div className="absolute top-4 right-4 z-10">
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)} 
                  className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full font-bold hover:bg-gray-200 transition shadow-sm"
                >
                  {t('btnCancel')}
                </button>
                <button
                  onClick={handleSaveBooth} 
                  disabled={saving || isUploadingCover}
                  className="bg-purple-600 text-white px-6 py-2 rounded-full font-bold hover:bg-purple-700 transition shadow-md disabled:bg-purple-300"
                >
                  {saving ? t('btnSaving') : t('btnSaveData')}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsEditing(true)} 
                className="bg-white/90 backdrop-blur-sm text-purple-600 border border-purple-200 px-4 py-2 rounded-full font-bold hover:bg-purple-50 transition shadow-md flex items-center gap-2"
              >
                <span>✏️</span>{t('btnEditBooth')}
              </button>
            )}
          </div>
        )}

        {/* --- ส่วนแสดงรูปปก --- */}
        <div className="w-full aspect-[3/1] bg-gray-50 relative group border-b border-gray-100"> 
          <img 
            src={isEditing ? (editData.coverImage || DEFAULT_COVER) : (myBooth.cover_image || DEFAULT_COVER)} 
            alt="Cover"
            className={`w-full h-full object-contain transition ${isEditing ? 'opacity-60' : ''}`}
            onError={(e) => { e.target.src = DEFAULT_COVER }}
          />
          
          {/* --- แก้ไข UI ตรงนี้: เปลี่ยนจาก input text เป็นปุ่มอัปโหลดรูป --- */}
          {isEditing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] transition-all">
              <label className="cursor-pointer bg-white/90 px-8 py-6 rounded-2xl shadow-xl border-2 border-dashed border-purple-400 hover:bg-purple-50 transition flex flex-col items-center gap-3">
                {isUploadingCover ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span className="text-purple-600 font-bold">{t('downloading')}</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl">📸</span>
                    {/* เพิ่ม hidden md:block เพื่อซ่อนข้อความบนจอมือถือ */}
                    <span className="hidden md:block text-purple-700 font-bold text-lg text-center">{t('clickToUpload')}</span>
                    <span className="hidden md:block text-sm text-gray-500 text-center">{t('suggestedSize')}</span>
                  </>
                )}
                {/* Input ที่ซ่อนไว้ */}
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverUpload}
                  disabled={isUploadingCover}
                />
              </label>
            </div>
          )}

          {/* ปรับขนาดให้เล็กลง (w-24 h-24) และขยับลงมาอีก (-bottom-16) */}
          <div className="absolute -bottom-16 md:-bottom-14 left-8 w-24 h-24 md:w-32 md:h-32 bg-white rounded-2xl p-1 shadow-md border-2 border-purple-500 z-10 transition-all">
            <img 
              src={myBooth.profile_image || DEFAULT_PROFILE} 
              alt="Profile"
              className="w-full h-full object-cover rounded-xl" 
              onError={(e) => { e.target.src = DEFAULT_PROFILE }}
            />
          </div>
        </div>

        <div className="pt-16 px-8 flex flex-col items-start gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-black text-gray-800">
              {myBooth.booth_name || myBooth.main_creator}
            </h1>
            <span className="bg-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
              {t('yourBoothBadge')}
            </span>
          </div>

          {isEditing ? (
            <textarea 
              value={editData.description}
              onChange={(e) => setEditData({...editData, description: e.target.value})}
              placeholder={t('placeholderDesc')}
              rows="3"
              className="w-full max-w-2xl mt-4 p-4 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none transition"
            />
          ) : (
            <p className="text-gray-600 mt-1 max-w-2xl">{myBooth.description || t('noDesc')}</p>
          )}

          <div className="mt-2 flex gap-2">
             <span className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-md border border-purple-100">
               Booth: {myBooth.booth_numbers?.join(', ') || 'N/A'}
             </span>
          </div>
        </div>
      </div>

      {/* --- ส่วนแสดงสินค้าด้านล่าง (คงเดิม) --- */}
      <div className="px-4 md:px-8 pt-2 pb-8">
        <div className="flex flex-col mb-8 gap-4 sticky top-0 bg-white z-10 py-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center shrink-0">
            <span className="bg-purple-500 w-2 h-6 rounded-full mr-3"></span> 
            {t('productsInBooth')} ({products.length || 0} {t('itemsCount')})
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 w-full no-scrollbar">
            {allCreators.map(creator => (
              <button
                key={creator}
                onClick={() => setSelectedCreator(creator)}
                className={`whitespace-nowrap px-6 py-2 rounded-full font-bold transition border-2 ${
                  selectedCreator === creator 
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md' 
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600'
                }`}
              >
                {creator === "all" ? t('tabAllCreators') : `🎨 ${creator}`}
              </button>
            ))}
          </div>
        </div>
        
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((item, index) => {
              const itemTotalStock = isNaN(Number(item.total_stock)) ? 0 : Number(item.total_stock);

              return (
                <div
                  key={item.id || index}
                  onClick={() => setSelectedProduct(item)} 
                  className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 overflow-hidden group flex flex-col"
                >
                  <div className="aspect-square bg-white relative overflow-hidden">
                    <img 
                      src={item.cover_image || DEFAULT_PRODUCT} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                    />
                    {item.preorder && ( 
                      <div className="absolute top-3 right-3 bg-orange-500/90 px-2 py-1 rounded-md text-[10px] font-black text-white">
                        PRE-ORDER
                      </div>
                    )}
                  </div>

                  <div className="p-4 md:p-5 flex flex-col flex-1 justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm md:text-base truncate">
                        {item.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1.5 font-medium">
                        🎨 {item.creator || myBooth.main_creator}
                      </p>
                    </div>

                    <div className="flex items-end justify-between mt-1">
                      <p className={`text-xs font-bold mb-1 ${itemTotalStock === 0 ? 'text-red-500' : 'text-black'}`}>
                        {t('itemsLeft')} {itemTotalStock}
                      </p>
                      <p className="text-purple-600 font-black text-lg">฿{isNaN(Number(item.price)) ? "0" : item.price}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400 font-bold bg-white rounded-2xl border-2 border-dashed border-gray-200">
            {t('noProductsFrom1')} {selectedCreator === "all" ? t('tabAllCreators') : selectedCreator} {t('noProductsFrom2')}
          </div>
        )}
      </div>
    </div>
  );
}

export default SellerStorePage;