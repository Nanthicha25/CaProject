//src/Buyer/StorePage.jsx
import { useState, useEffect } from 'react';
import ProductDetail from './ProductDetail';
import { db } from '../firebase'; 
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';

export default function StorePage({ activeBooth, onBack, onRequireAuth, user }) {
  const { t } = useLanguage();
  const [selectedCreator, setSelectedCreator] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // 1. เพิ่ม Stateสำหรับเก็บข้อมูลสินค้าและสถานะการโหลด
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. ดึงข้อมูลสินค้าจากCollection 'products' เมื่อเปิดหน้าบูธ
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "products"),
          where("booth_id", "==", activeBooth.booth_id) // ดึงเฉพาะสินค้าของบูธนี้
        );
        const querySnapshot = await getDocs(q);
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(product => product.status === 'approved'); // กรองเฉพาะสินค้าที่อนุมัติแล้ว
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching products: ", error);
      } finally {
        setLoading(false);
      }
    };

    if (activeBooth?.booth_id) {
      fetchProducts();
    }
  }, [activeBooth?.booth_id]);

  const coCreatorsArray = Array.isArray(activeBooth?.co_creators) ? activeBooth.co_creators : [];
  const allCreators = ["all", activeBooth.main_creator, ...coCreatorsArray].filter(Boolean);

  const filteredProducts = products.filter(p => {
    const itemCreator = p.creator || activeBooth.main_creator;
    return selectedCreator === "all" ? true : itemCreator === selectedCreator;
  });

  if (selectedProduct) {
    return (
      <ProductDetail 
        product={selectedProduct} 
        user={user}
        onBack={() => setSelectedProduct(null)}
        onRequireAuth={onRequireAuth}
      />
    );
  }

  return (
    <div className="bg-white rounded-3xl animate-fade-in w-full min-h-[800px] shadow-sm border border-gray-200 overflow-hidden relative">
      
      {/* แถบเมนูด้านบน */}
      <div className="bg-white p-4 sticky top-0 z-20 flex items-center shadow-sm">
        <button onClick={onBack} className="flex items-center text-pink-500 hover:text-pink-600 font-bold transition bg-pink-50 px-4 py-2 rounded-full">
          <span className="mr-2">←</span> {t('back')}
        </button>
        <span className="ml-auto text-black font-black text-lg">
          {t('boothNumber')}{activeBooth.booth_numbers ? activeBooth.booth_numbers.join(', ') : 'N/A'} 
        </span>
      </div>

      <div className="bg-white pb-6 shadow-sm mb-4">
        <div className="w-full aspect-[3/1] bg-gray-50 relative group border-b border-gray-100">
          <img src={activeBooth.cover_image || "https://placehold.co/1500x500/fbcfe8/ec4899"} alt="Cover" className="w-full h-full object-contain" />

          <div className="absolute -bottom-16 md:-bottom-14 left-8 w-24 h-24 md:w-32 md:h-32 bg-white rounded-2xl p-1 shadow-md border-2 border-white z-10 transition-all">
            <img src={activeBooth.profile_image || "https://placehold.co/700x700/fbcfe8/ec4899?text=Logo"} alt="Profile" className="w-full h-full object-cover rounded-xl border border-gray-100" />
          </div>
        </div>
        <div className="pt-16 px-8 flex flex-col items-start gap-1">
          <h1 className="text-3xl md:text-4xl font-black text-gray-800">
            {activeBooth.booth_name || activeBooth.main_creator}
          </h1>
          <p className="text-gray-600">{activeBooth.description}</p>
        </div>
      </div>

      {/* ส่วนตัวกรองและแสดงสินค้า */}
      <div className="px-4 md:px-8 pt-2 pb-8">
        <div className="flex flex-col mb-8 gap-4 sticky top-[72px] bg-white z-10 py-2">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center shrink-0">
            <span className="bg-pink-500 w-2 h-6 rounded-full mr-3"></span> {t('boothItemsTitle')}
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 w-full no-scrollbar">
            {allCreators.map((creator, index) => (
              <button
                key={`${creator}-${index}`}
                onClick={() => setSelectedCreator(creator)}
                className={`whitespace-nowrap px-6 py-2 rounded-full font-bold transition border-2 ${
                  selectedCreator === creator 
                  ? 'bg-pink-500 text-white border-pink-500 shadow-md' 
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-pink-50 hover:border-pink-200 hover:text-pink-500'
                }`}
              >
                {creator === "all" ? t('allCreatorsTab') : `🎨 ${creator}`}
              </button>
            ))}
          </div>
        </div>
        
        {/* รายการสินค้า */}
        {loading ? (
          <div className="text-center py-20 text-pink-500 font-bold animate-pulse">
            {t('loadingProducts')}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((item, index) => {
              const itemTotalStock = item.total_stock || 0;
              
              // --- 1. เช็คสถานะ R-18 ---
              const isAdult = item.isR18 === true || item.category_main === 'R-18';

              return (
                <div 
                  key={item.product_id || index} 
                  onClick={() => setSelectedProduct(item)}
                  // --- 2. เพิ่ม relative ลงใน className ของกล่อง ---
                  className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 overflow-hidden group flex flex-col relative"
                >
                  {/* --- 3. Badge R-18 วางตรงนี้ --- */}
                  {isAdult && (
                    <div className="absolute top-3 left-3 z-20 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-md">
                      R-18
                    </div>
                  )}

                  <div className="aspect-square bg-white relative overflow-hidden">
                    <img 
                      src={item.cover_image || item.extra_images?.split(',')[0] || `https://placehold.co/400x400/f3f4f6/9ca3af?text=${item.name}`} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                    />
                    
                    {/* --- 4. Overlay จางๆ สำหรับ 18+ วางตรงนี้ --- */}
                    {isAdult && (
                       <div className="absolute inset-0 bg-rose-900/5 group-hover:bg-transparent transition-colors"></div>
                    )}
                    
                    {item.preorder && (
                      <div className="absolute top-3 right-3 bg-orange-500/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-black text-white shadow-sm border border-orange-400 z-10">
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
                        🎨 {item.creator || activeBooth.main_creator}
                      </p>
                    </div>

                    <div className="flex items-end justify-between mt-1">
                      <p className={`text-xs font-bold mb-1 ${itemTotalStock === 0 ? 'text-red-500' : 'text-black'}`}>
                        {t('itemsLeft')}{itemTotalStock}
                      </p>
                      <p className="text-pink-500 font-black text-lg">฿{item.price}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400 font-bold bg-white rounded-2xl border-2 border-dashed border-gray-200">
            {t('noProductsFrom')}{selectedCreator}
          </div>
        )}
      </div>
    </div>
  );
}