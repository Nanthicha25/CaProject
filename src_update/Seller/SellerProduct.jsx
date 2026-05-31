// src/Seller/SellerProduct.jsx
import React, { useState, useEffect } from 'react';
import SellerAddProduct from './SellerAddproduct';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';

const DEFAULT_PRODUCT = "https://placehold.co/400x400/f3f4f6/9ca3af?text=Product";

function SellerProduct({ user, eventData }) {
  const { t, lang } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับจัดการ Popup ลบสินค้า
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null, productName: "" });
  const [isDeleting, setIsDeleting] = useState(false);

  // State สำหรับจัดการการเรียงลำดับ (Sorting)
  const [sortConfig, setSortConfig] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "products"),
          where("creator", "==", user?.username?.trim())
        );
        
        const querySnapshot = await getDocs(q);
        const productsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setMyProducts(productsList);
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

  // ฟังก์ชันช่วยแสดงสถานะ Badge (ภาษาอังกฤษล้วน)
  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-[10px] font-bold border border-green-200 uppercase shrink-0">Approved</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-[10px] font-bold border border-red-200 uppercase shrink-0">Rejected</span>;
      default:
        return <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-[10px] font-bold border border-orange-200 uppercase shrink-0">Pending</span>;
    }
  };

  // ฟังก์ชันสลับการจัดเรียง
  const handleSort = (key) => {
    setSortConfig(prevConfig => {
      const existingIndex = prevConfig.findIndex(item => item.key === key);
      if (existingIndex >= 0) {
        const newConfig = [...prevConfig];
        // สร้าง Object ใหม่เพื่อไม่ให้ไปแก้ไข State เดิมโดยตรง (ป้องกันปัญหา React ไม่ Re-render)
        const currentItem = { ...newConfig[existingIndex] };
        
        if (currentItem.direction === 'asc') {
          currentItem.direction = 'desc'; // สลับเป็น desc
          newConfig[existingIndex] = currentItem;
        } else {
          newConfig.splice(existingIndex, 1); // ถ้าเป็น desc แล้วกดอีกครั้ง ให้เอาออกจากการ sort
        }
        return newConfig;
      } else {
        return [...prevConfig, { key, direction: 'asc' }]; // เพิ่มเงื่อนไขการ sort เข้าไปใหม่
      }
    });
  };

  // เรียงลำดับข้อมูลก่อนนำไปแสดงผล (เรียงตามลำดับความสำคัญของคอลัมน์ที่ถูกกด)
  const sortedProducts = [...myProducts].sort((a, b) => {
    if (sortConfig.length === 0) return 0;
    
    for (let i = 0; i < sortConfig.length; i++) {
      const { key, direction } = sortConfig[i];
      let valA = a[key];
      let valB = b[key];

      // ทำให้การเรียงตัวเลขถูกต้อง
      if (key === 'price' || key === 'total_stock') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = String(valA || 'pending').toLowerCase();
        valB = String(valB || 'pending').toLowerCase();
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
    }
    return 0; // ถ้าค่าเท่ากันทั้งหมด ให้คงลำดับเดิมไว้
  });

  const openDeleteModal = (docId, productName) => {
    setDeleteModal({ isOpen: true, productId: docId, productName: productName });
  };

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setDeleteModal({ isOpen: false, productId: null, productName: "" });
    }
  };

  const executeDelete = async () => {
    if (!deleteModal.productId) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "products", deleteModal.productId));
      setMyProducts(prev => prev.filter(product => product.id !== deleteModal.productId));
      setDeleteModal({ isOpen: false, productId: null, productName: "" });
    } catch (error) {
      console.error("Error deleting product:", error);
      alert(`${t('errorDelete')}`); 
    } finally {
      setIsDeleting(false);
    }
  };

  if (isAdding || editingId) {
    return (
      <SellerAddProduct 
        user={user} 
        eventData={eventData}
        editingProductId={editingId} 
        onBack={() => {
          setIsAdding(false);
          setEditingId(null);
        }} 
      />
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{t('manageProducts')}</h1>
          <p className="text-gray-500 mt-1">{t('allProductsOf')} {user.username}</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="bg-purple-600 text-white border-2 border-purple-600 px-5 py-2.5 rounded-lg font-bold hover:bg-white hover:text-purple-600 transition duration-300 shadow-sm w-full md:w-auto whitespace-nowrap flex justify-center items-center gap-2">
          <span className="text-xl leading-none">+</span> {t('addNewProductBtn')}
        </button>
      </div>

      {/* แถบปุ่มจัดการจัดเรียง (Sorting Controls) */}
      {!loading && myProducts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm font-bold text-gray-500">{lang === 'th' ? 'จัดเรียง:' : 'Sort by:'}</span>
          
          {(() => {
            const statusSort = sortConfig.find(s => s.key === 'status');
            const priceSort = sortConfig.find(s => s.key === 'price');
            const stockSort = sortConfig.find(s => s.key === 'total_stock');
            
            return (
              <>
                <button 
                  onClick={() => handleSort('status')} 
                  className={`text-sm px-3 py-1.5 border rounded-lg shadow-sm transition flex items-center gap-1 ${statusSort ? 'bg-purple-100 border-purple-300 text-purple-700 font-bold' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Status {statusSort ? (statusSort.direction === 'asc' ? '↑' : '↓') : '↕'}
                  {sortConfig.length > 1 && statusSort && <span className="ml-1 text-[10px] bg-purple-200 text-purple-800 rounded-full w-4 h-4 flex items-center justify-center">{sortConfig.findIndex(s => s.key === 'status') + 1}</span>}
                </button>
                <button 
                  onClick={() => handleSort('price')} 
                  className={`text-sm px-3 py-1.5 border rounded-lg shadow-sm transition flex items-center gap-1 ${priceSort ? 'bg-purple-100 border-purple-300 text-purple-700 font-bold' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  {t('colPrice') || 'Price'} {priceSort ? (priceSort.direction === 'asc' ? '↑' : '↓') : '↕'}
                  {sortConfig.length > 1 && priceSort && <span className="ml-1 text-[10px] bg-purple-200 text-purple-800 rounded-full w-4 h-4 flex items-center justify-center">{sortConfig.findIndex(s => s.key === 'price') + 1}</span>}
                </button>
                <button 
                  onClick={() => handleSort('total_stock')} 
                  className={`text-sm px-3 py-1.5 border rounded-lg shadow-sm transition flex items-center gap-1 ${stockSort ? 'bg-purple-100 border-purple-300 text-purple-700 font-bold' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  {t('colStock') || 'Stock'} {stockSort ? (stockSort.direction === 'asc' ? '↑' : '↓') : '↕'}
                  {sortConfig.length > 1 && stockSort && <span className="ml-1 text-[10px] bg-purple-200 text-purple-800 rounded-full w-4 h-4 flex items-center justify-center">{sortConfig.findIndex(s => s.key === 'total_stock') + 1}</span>}
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* --- UI สำหรับมือถือ --- */}
      <div className="md:hidden flex flex-col gap-4 mb-8">
        {loading ? (
          <div className="flex justify-center items-center gap-2 p-10 text-purple-500 font-bold bg-white rounded-xl shadow-sm border border-purple-200">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
            {t('loadingProducts')}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="p-10 text-center text-gray-400 font-medium bg-white rounded-xl shadow-sm border border-purple-200">{t('noProducts')}</div>
        ) : (
          sortedProducts.map((product) => {
            const hasVariations = product.has_variations && product.variations?.length > 0;
            const uniqueVariationsCount = hasVariations ? new Set(product.variations.map(v => v.variation_name)).size : 0;
            const optionCount = hasVariations ? product.variations.length : 0;
            
            return (
              <div key={`mobile-${product.id}`} className="bg-white rounded-[1.5rem] shadow-sm border border-purple-50 p-5 flex flex-col relative">
                
                <div className="absolute top-5 right-5 flex flex-col items-end gap-3 z-10">
                  <button 
                    onClick={() => setEditingId(product.product_id || product.id)} 
                    className="text-blue-500 font-black text-sm hover:opacity-70 transition"
                  >
                    {t('editBtn')}
                  </button>
                  <button 
                    onClick={() => openDeleteModal(product.id, product.name)}
                    className="text-red-500 font-black text-sm hover:opacity-70 transition"
                  >
                    {t('deleteBtnp')}
                  </button>
                </div>

                <div className="flex gap-4 items-start mb-4 pr-16">
                  <img 
                    src={product.cover_image || DEFAULT_PRODUCT} 
                    alt={product.name} 
                    className="w-[72px] h-[72px] rounded-xl object-cover bg-pink-100 shrink-0"
                    onError={(e) => { e.target.src = DEFAULT_PRODUCT }}
                  />
                  <div className="flex-1 min-w-0">
                    {/* บรรทัดที่ 1: ชื่อสินค้าขึ้นก่อน */}
                    <div className="mb-1">
                      <h3 className="font-black text-gray-800 text-lg leading-tight truncate" title={product.name}>
                        {product.name}
                      </h3>
                    </div>
                    
                    {/* บรรทัดที่ 2: ตามด้วยสถานะ */}
                    <div className="mb-2">
                      {getStatusBadge(product.status)}
                    </div>
                    
                    {/* บรรทัดที่ 3: R-18 และ PRE อยู่บรรทัดเดียวกัน */}
                    {(product.isR18 || product.preorder) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {product.isR18 && (
                          <span className="text-[10px] text-white font-bold bg-red-600 px-2 py-0.5 rounded-full inline-block">
                            R-18
                          </span>
                        )}
                        {product.preorder && (
                          <span className="text-[10px] text-purple-600 font-bold bg-purple-100 px-2 py-0.5 rounded-full inline-block">
                            PRE
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {product.status === 'rejected' && product.admin_reason && (
                  <div className="mb-4 bg-red-50 border border-red-100 p-2 rounded-lg">
                    <p className="text-[11px] text-red-600 font-bold">⚠️ {lang === 'th' ? 'เหตุผลที่ถูกปฏิเสธ' : 'Reason for rejection'}:</p>
                    <p className="text-[11px] text-red-500">{product.admin_reason}</p>
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center font-bold text-gray-400 text-sm">
                    <span className="uppercase">{t('colVariation')}:</span>
                    <span className="text-gray-600 font-medium">{uniqueVariationsCount > 0 ? uniqueVariationsCount : "-"}</span>
                  </div>
                  
                  <div className="flex justify-between items-center font-bold text-gray-400 text-sm">
                    <span className="uppercase">{t('colOption')}:</span>
                    <span className="text-gray-600 font-medium">{optionCount > 0 ? optionCount : "-"}</span>
                  </div>
                  
                  <div className="flex justify-between items-center font-bold text-gray-400 text-sm mt-2">
                    <span className="uppercase">{t('colPrice')}:</span>
                    <span className="text-purple-500 font-black text-2xl">฿{product.price}</span>
                  </div>
                  
                  <div className="flex justify-between items-center font-bold text-gray-400 text-sm mt-[-4px]">
                    <span className="uppercase">{t('colStock')}:</span>
                    <span className={`font-black text-xl ${product.total_stock === 0 ? 'text-red-500' : 'text-gray-800'}`}>
                      {product.total_stock || 0}
                    </span>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* --- UI สำหรับ Desktop --- */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr>
                {/* ย้ายคอลัมน์สถานะมาไว้หน้าสุด ตรงตามที่ต้องการ */}
                <th className="bg-purple-50 p-4 border-b-2 border-purple-400 text-purple-700 font-bold text-sm whitespace-nowrap text-center">{lang === 'th' ? 'สถานะ' : 'Status'}</th>
                <th className="bg-purple-50 p-4 border-b-2 border-purple-400 text-purple-700 font-bold text-sm whitespace-nowrap">{t('colProduct')}</th>
                <th className="bg-purple-50 p-4 border-b-2 border-purple-400 text-purple-700 font-bold text-sm whitespace-nowrap text-center">{t('colImage')}</th>
                <th className="bg-purple-50 p-4 border-b-2 border-purple-400 text-purple-700 font-bold text-sm whitespace-nowrap">{t('colVariation')}</th>
                <th className="bg-purple-50 p-4 border-b-2 border-purple-400 text-purple-700 font-bold text-sm whitespace-nowrap">{t('colOption')}</th>
                <th className="bg-purple-50 p-4 border-b-2 border-purple-400 text-purple-700 font-bold text-sm whitespace-nowrap">{t('colPrice')}</th>
                <th className="bg-purple-50 p-4 border-b-2 border-purple-400 text-purple-700 font-bold text-sm whitespace-nowrap text-center">{t('colStock')}</th>
                <th className="bg-purple-50 p-4 border-b-2 border-purple-400 text-purple-700 font-bold text-sm whitespace-nowrap text-center">{t('colActions')}</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-10 text-center text-purple-500 font-bold">
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                      {t('loadingProducts')}
                    </div>
                  </td>
                </tr>
              ) : sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-10 text-center text-gray-400 font-medium">{t('noProducts')}</td>
                </tr>
              ) : (
                sortedProducts.map((product) => {
                  const displayRows = product.has_variations && product.variations?.length > 0
                    ? product.variations
                    : [{ variation_name: "-", option_name: "-", stock: product.total_stock || 0, image: product.cover_image }];

                  return displayRows.map((variant, vIdx) => (
                    <tr key={`${product.id}-${vIdx}`} className="hover:bg-white transition border-b border-gray-100">
                      
                      {/* คอลัมน์สถานะ (อยู่หน้าสุด) */}
                      <td className="p-4 align-top text-center">
                        {vIdx === 0 && getStatusBadge(product.status)}
                      </td>

                      {/* คอลัมน์ Product */}
                      <td className="p-4 align-top">
                        {vIdx === 0 && (
                          <div className="flex items-start gap-3">
                            <img 
                              src={product.cover_image || DEFAULT_PRODUCT} 
                              alt={product.name} 
                              className="w-12 h-12 rounded object-cover border border-gray-200 mt-1 shrink-0"
                              onError={(e) => { e.target.src = DEFAULT_PRODUCT }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-bold text-gray-800 text-sm max-w-[200px] truncate" title={product.name}>{product.name}</p>
                                {product.isR18 && <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black leading-none shrink-0">R18</span>}
                              </div>
                              {product.preorder && <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded mr-1">PRE-ORDER</span>}
                              {product.status === 'rejected' && product.admin_reason && (
                                <p className="text-[10px] text-red-500 bg-red-50 p-1.5 rounded mt-1.5 border border-red-100">
                                  <strong>X:</strong> {product.admin_reason}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="p-4 align-middle text-center">
                        {product.has_variations ? (
                          <img 
                            src={variant.image || DEFAULT_PRODUCT} 
                            alt={variant.option_name} 
                            className="w-10 h-10 rounded object-cover border border-gray-200 inline-block"
                            onError={(e) => { e.target.src = DEFAULT_PRODUCT }}
                          />
                        ) : (
                          <span className="text-sm text-gray-600">-</span>
                        )}
                      </td>

                      <td className="p-4 align-middle text-sm text-gray-600">
                        {variant.variation_name}
                      </td>

                      <td className="p-4 align-middle text-sm text-gray-600">
                        {variant.option_name}
                      </td>

                      <td className="p-4 align-middle">
                        <span className="font-bold text-gray-800">฿{product.price}</span>
                      </td>

                      <td className="p-4 align-middle text-center">
                        <span className={`font-bold ${variant.stock === 0 ? 'text-red-500' : 'text-gray-800'}`}>
                          {variant.stock}
                        </span>
                      </td>

                      <td className="p-4 align-middle text-center">
                        {vIdx === 0 && (
                          <div className="flex items-center justify-center gap-3">
                            <button 
                              onClick={() => setEditingId(product.product_id || product.id)} 
                              className="text-blue-500 font-bold text-sm hover:underline"
                            >
                              {t('editBtn')}
                            </button>
                            <button 
                              onClick={() => openDeleteModal(product.id, product.name)}
                              className="text-red-500 font-bold text-sm hover:underline"
                            >
                              {t('deleteBtnp')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal ยืนยันการลบ */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 px-4 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform scale-100 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            
            <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
              {t('confirmDelete')}
            </h2>
            <p className="text-center text-gray-500 mb-6 text-sm">
              {t('wantedToDelete1')} <span className="font-bold text-gray-800">"{deleteModal.productName}"</span> {t('wantedToDelete2')}
              <span className="text-xs text-red-400 mt-1 inline-block">{t('wantedToDelete')}</span>
            </p>
            
            <div className="flex gap-3 w-full">
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
              >
                {t('cancelBtn')}
              </button>
              <button
                onClick={executeDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {lang === 'th' ? 'กำลังลบ...' : 'Deleting...'}
                  </>
                ) : (
                  t('deleteBtnp')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default SellerProduct;