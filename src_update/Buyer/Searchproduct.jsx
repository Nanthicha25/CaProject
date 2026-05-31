// src/Buyer/Searchproduct.jsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import ProductDetail from './ProductDetail';
import { useLanguage } from '../LanguageContext';

function Searchproduct({ user, onRequireAuth }) {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // --- States สำหรับตัวกรอง ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDay, setSelectedDay] = useState("All");
  const [selectedSection, setSelectedSection] = useState("All");
  
  // State สำหรับ Categories และ Tags
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);

  // --- Desktop UI States ---
  const [isTagOpen, setIsTagOpen] = useState(false);
  const [tagSearchTerm, setTagSearchTerm] = useState("");
  const tagDropdownRef = useRef(null);

  // --- Mobile UI States ---
  const [activeFilterModal, setActiveFilterModal] = useState(null); // 'day', 'zone', 'category', 'tags'

  // --- Pagination State (แสดงทีละ 20) ---
  const [visibleCount, setVisibleCount] = useState(20);

  // รีเซ็ตจำนวนที่แสดงกลับเป็น 20 ทุกครั้งที่มีการเปลี่ยน Filter
  useEffect(() => {
    setVisibleCount(20);
  }, [searchTerm, selectedDay, selectedSection, selectedCategory, selectedTags]);

  // 1.ดึงข้อมูลสินค้าโดยตรง (อิงตามไฟล์หลักของคุณ พร้อมระบบลด Cost)
  useEffect(() => {
    const fetchProductsData = async () => {
      try {
        const cachedProducts = sessionStorage.getItem('cached_products');
        const cachedTime = sessionStorage.getItem('cached_products_time');
        const CACHE_DURATION = 5 * 60 * 1000;

        if (cachedProducts && cachedTime && (Date.now() - parseInt(cachedTime) < CACHE_DURATION)) {
          const parsedData = JSON.parse(cachedProducts);
          let sectionsSet = new Set();
          let tagsSet = new Set();
          let categoriesSet = new Set();

          parsedData.forEach(item => {
            if (item.section) sectionsSet.add(item.section);
            if (item.category_main) categoriesSet.add(item.category_main);
            if (item.tagsArray) item.tagsArray.forEach(t => tagsSet.add(t));
          });

          setProducts(parsedData);
          setAvailableSections(Array.from(sectionsSet).sort());
          setAllTags(Array.from(tagsSet).sort());
          setAllCategories(Array.from(categoriesSet).sort());
          setLoading(false);
          return; 
        }

        const q = query(collection(db, "products"), where("status", "==", "approved"));
        const querySnapshot = await getDocs(q);

        let allItems = [];
        let sectionsSet = new Set();
        let tagsSet = new Set();
        let categoriesSet = new Set();

        querySnapshot.forEach((doc) => {
          const itemData = doc.data();
          const itemTags = itemData.tags ? itemData.tags.split(',').map(t => t.trim()) : [];
          
          if (itemData.category_main) categoriesSet.add(itemData.category_main);

          let section = "";
          if (itemData.booth_numbers && Array.isArray(itemData.booth_numbers) && itemData.booth_numbers.length > 0) {
             const firstBooth = itemData.booth_numbers[0];
             if (firstBooth && typeof firstBooth === 'string') {
               section = firstBooth.charAt(0).toUpperCase();
               if (/[A-Z]/.test(section)) sectionsSet.add(section);
             }
          }

          allItems.push({
            id: doc.id,
            ...itemData,
            tagsArray: itemTags,
            section: section
          });

          itemTags.forEach(t => tagsSet.add(t.toLowerCase()));
        });

        setProducts(allItems);
        setAvailableSections(Array.from(sectionsSet).sort());
        setAllTags(Array.from(tagsSet).sort());
        setAllCategories(Array.from(categoriesSet).sort());
        setLoading(false);

        sessionStorage.setItem('cached_products', JSON.stringify(allItems));
        sessionStorage.setItem('cached_products_time', Date.now().toString());

      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    
    fetchProductsData();
  }, []);

  // ดึง Tags จาก System Settings
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const cachedTags = sessionStorage.getItem("cached_tags_list");
        if (cachedTags) {
            setAllTags(JSON.parse(cachedTags));
            return;
        }

        const docRef = doc(db, "tags", "list"); 
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const tagsArray = Object.values(data).map(t => String(t).toLowerCase());
          const sortedTags = tagsArray.sort();
          setAllTags(sortedTags);
          sessionStorage.setItem("cached_tags_list", JSON.stringify(sortedTags));
        }
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    };
    fetchTags();
  }, []);

  // ปิด Dropdown ของ Desktop เมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target)) {
        setIsTagOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTagToggle = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  // 2.ตรรกะการกรองข้อมูลสินค้า (อิงไฟล์หลัก: นับ matchCount และเรียงลำดับ)
  const filteredProducts = products.map(product => {
    const productTags = product.tagsArray.map(t => t.toLowerCase());
    const matchCount = selectedTags.filter(tag => productTags.includes(tag)).length;
    return { ...product, matchCount };
  })
  .filter(product => {
    const boothNumbersText = Array.isArray(product.booth_numbers) ? product.booth_numbers.join(", ") : "";

    const matchSearch = searchTerm === "" || 
      (product.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.creator || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.booth_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      boothNumbersText.toLowerCase().includes(searchTerm.toLowerCase());

    const matchDay = selectedDay === "All" || (product.event_date === selectedDay || product.event_date === "Both");
    const matchSection = selectedSection === "All" || product.section === selectedSection;
    const matchCategory = selectedCategory === "All" || (product.category_main && product.category_main.toLowerCase() === selectedCategory.toLowerCase());
    const matchTags = selectedTags.length === 0 || product.matchCount > 0;

    return matchSearch && matchDay && matchSection && matchCategory && matchTags;
  })
  .sort((a, b) => b.matchCount - a.matchCount); // เรียงตามจำนวน tag ที่ match

  const filteredTagOptions = allTags.filter(tag => tag.includes(tagSearchTerm.toLowerCase()));

  // ตัดแบ่งสินค้าเพื่อแสดงแค่เท่ากับ visibleCount (Pagination)
  const displayedProducts = filteredProducts.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 20);
  };

  if (loading) {
    return <div className="text-center py-20 text-pink-500 font-bold animate-pulse">{t('searchingProducts')}</div>;
  }

  if (selectedProduct) {
    return <ProductDetail product={selectedProduct} onBack={() => setSelectedProduct(null)} user={user} onRequireAuth={onRequireAuth} />;
  }

  // Mobile Filter Pill Component
  const FilterPill = ({ label, active, onClick, count }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all ${
        active 
        ? "bg-pink-500 border-pink-500 text-white shadow-sm" 
        : "bg-white border-gray-200 text-gray-700 hover:border-pink-300"
      }`}
    >
      {label}
      {count > 0 && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${active ? "bg-white text-pink-500" : "bg-pink-500 text-white"}`}>{count}</span>}
      <span className={`text-[10px] ${active ? "text-white" : "text-gray-400"}`}>▼</span>
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 min-h-screen pb-24">
      
      {/* =========================================
          1. UI สำหรับหน้าจอขนาดใหญ่ (Desktop) 
      ========================================= */}
      <div className="hidden md:block">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{t('searchTitle')}</h1>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('eventDayLabel')}</label>
              <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-pink-500 bg-white h-[46px]">
                <option value="All">{t('allDays')}</option>
                <option value="30/5/2026">{t('day1')}</option>
                <option value="31/5/2026">{t('day2')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('zoneLabel')}</label>
              <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-pink-500 bg-white h-[46px]">
                <option value="All">{t('allZones')}</option>
                {availableSections.map(sec => <option key={sec} value={sec}>{t('zonePrefix')}{sec}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('categoryLabel')}</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-pink-500 bg-white capitalize h-[46px]">
                <option value="All">{t('allCategories')}</option>
                {allCategories.map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div ref={tagDropdownRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('tagsLabel')}</label>
              <div onClick={() => setIsTagOpen(!isTagOpen)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-pink-500 bg-white flex justify-between items-center cursor-pointer h-[46px]">
                <span className="truncate text-sm">{selectedTags.length === 0 ? t('filterByTags') : `${selectedTags.length} ${t('tagsSelected')}`}</span>
                <span className="text-gray-400 text-xs">▼</span>
              </div>
              {isTagOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  <div className="p-3 border-b border-gray-100 flex items-center gap-2">
                    <input type="text" placeholder={t('searchTagsPlaceholder')} value={tagSearchTerm} onChange={(e) => setTagSearchTerm(e.target.value)} className="w-full outline-none text-sm" />
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2">
                    {filteredTagOptions.map(tag => (
                      <label key={tag} className="flex items-center gap-3 p-2 hover:bg-pink-50 rounded-lg cursor-pointer">
                        <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => handleTagToggle(tag)} className="w-4 h-4 accent-pink-500" />
                        <span className="text-sm text-gray-700">{tag}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('searchLabel')}</label>
              <input type="text" placeholder={t('searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border border-gray-300 rounded-lg px-5 outline-none focus:border-pink-500 shadow-sm h-[46px]" />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          2. UI สำหรับหน้าจอมือถือ (Mobile) 
      ========================================= */}
      <div className="block md:hidden sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm -mx-4 px-4 pt-2 pb-4 mb-4">
        <h1 className="text-xl font-black text-gray-900 mb-4">{t('searchTitle')}</h1>
        <div className="relative mb-4">
          <input 
            type="text" placeholder={t('searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 pl-12 outline-none focus:border-pink-500 shadow-sm transition-all text-base" 
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
          {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 bg-gray-100 rounded-full p-1">✕</button>}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
          <FilterPill label={selectedDay === "All" ? t('eventDayLabel') : selectedDay === "30/5/2026" ? t('day1') : t('day2')} active={selectedDay !== "All"} onClick={() => setActiveFilterModal('day')} />
          <FilterPill label={selectedSection === "All" ? t('zoneLabel') : `${t('zonePrefix')}${selectedSection}`} active={selectedSection !== "All"} onClick={() => setActiveFilterModal('zone')} />
          <FilterPill label={selectedCategory === "All" ? t('categoryLabel') : selectedCategory} active={selectedCategory !== "All"} onClick={() => setActiveFilterModal('category')} />
          <FilterPill label={t('tagsLabel')} active={selectedTags.length > 0} count={selectedTags.length} onClick={() => setActiveFilterModal('tags')} />
        </div>
      </div>

      {/* =========================================
          3. ส่วนแสดงสินค้า (ใช้ร่วมกันทั้ง Desktop / Mobile) 
      ========================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {displayedProducts.map((product, index) => {
          const stock = product.total_stock || 0;
          const isAdult = product.isR18 === true || product.category_main === 'R-18';

          return (
            <div key={index} onClick={() => setSelectedProduct(product)} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all group cursor-pointer flex flex-col relative">
              {isAdult && <div className="absolute top-3 left-3 z-20 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-md">R-18</div>}
              
              <div className="aspect-square w-full bg-gray-50 relative overflow-hidden">
                <img src={product.cover_image || "https://placehold.co/400x400/f3f4f6/9ca3af?text=Product"} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                {isAdult && <div className="absolute inset-0 bg-rose-900/5 group-hover:bg-transparent transition-colors"></div>}
                {product.preorder && <div className="absolute top-3 right-3 bg-orange-500/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-black text-white shadow-sm border border-orange-400 z-10">PRE-ORDER</div>}
              </div>

              <div className="p-3 md:p-4 flex flex-col flex-1">
                <h3 className="font-bold text-gray-800 text-sm md:text-base truncate mb-2">{product.name}</h3>
                <div className="mt-auto">
                  <div className="flex flex-col gap-1.5 mb-3">
                    <span className="self-start bg-pink-100 text-pink-600 text-[10px] font-black px-1.5 py-0.5 rounded border border-pink-200 uppercase">
                      {Array.isArray(product.booth_numbers) && product.booth_numbers.length > 0 ? product.booth_numbers.join(", ") : "N/A"}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium truncate">{product.creator || t('unknownCreator')}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                    <p className={`text-[10px] font-bold ${stock > 0 ? 'text-green-500' : 'text-red-500'}`}>{stock > 0 ? `${t('availableStock')}${stock}` : t('outOfStock')}</p>
                    <div className="text-pink-500 font-black text-gray-900">฿{product.price}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ปุ่ม Load More แสดงเมื่อยังมีสินค้าที่ยังไม่ได้แสดง */}
      {filteredProducts.length > visibleCount && (
        <div className="flex justify-center mt-8 mb-4">
          <button onClick={handleLoadMore} className="bg-white border-2 border-pink-100 text-pink-500 font-bold px-8 py-3 rounded-full hover:bg-pink-50 hover:border-pink-200 transition-all shadow-sm">
            ดูเพิ่มเติมอีก 20 รายการ
          </button>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="text-center py-20 text-gray-400 font-bold bg-white rounded-2xl border-2 border-dashed border-gray-200 mt-4">
          {t('noProductsFound')}
        </div>
      )}

      {/* =========================================
          4. Mobile Modals (แสดงเฉพาะมือถือเมื่อกดปุ่ม)
      ========================================= */}
      {activeFilterModal && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center p-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setActiveFilterModal(null)} />
          <div className="relative bg-white w-full rounded-t-[2rem] shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-black text-gray-800">
                {activeFilterModal === 'day' && t('eventDayLabel')}
                {activeFilterModal === 'zone' && t('zoneLabel')}
                {activeFilterModal === 'category' && t('categoryLabel')}
                {activeFilterModal === 'tags' && t('tagsLabel')}
              </h3>
              <button onClick={() => setActiveFilterModal(null)} className="text-gray-400 hover:text-gray-600 p-2 text-xl leading-none">✕</button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {activeFilterModal === 'day' && (
                <div className="grid gap-3">
                  {['All', '30/5/2026', '31/5/2026'].map(day => (
                    <button key={day} onClick={() => { setSelectedDay(day); setActiveFilterModal(null); }}
                      className={`w-full p-4 rounded-2xl text-left font-bold transition-all ${selectedDay === day ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-700"}`}>
                      {day === 'All' ? t('allDays') : day === '30/5/2026' ? t('day1') : t('day2')}
                    </button>
                  ))}
                </div>
              )}

              {activeFilterModal === 'zone' && (
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => { setSelectedSection('All'); setActiveFilterModal(null); }} className={`col-span-3 p-4 rounded-2xl font-bold ${selectedSection === 'All' ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-700"}`}>{t('allZones')}</button>
                  {availableSections.map(sec => (
                    <button key={sec} onClick={() => { setSelectedSection(sec); setActiveFilterModal(null); }} className={`p-4 rounded-2xl font-bold ${selectedSection === sec ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-700"}`}>{sec}</button>
                  ))}
                </div>
              )}

              {activeFilterModal === 'category' && (
                <div className="grid gap-2">
                  <button onClick={() => { setSelectedCategory('All'); setActiveFilterModal(null); }} className={`w-full p-4 rounded-2xl text-left font-bold ${selectedCategory === 'All' ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-700"}`}>{t('allCategories')}</button>
                  {allCategories.map(cat => (
                    <button key={cat} onClick={() => { setSelectedCategory(cat); setActiveFilterModal(null); }} className={`w-full p-4 rounded-2xl text-left font-bold capitalize ${selectedCategory === cat ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-700"}`}>{cat}</button>
                  ))}
                </div>
              )}

              {activeFilterModal === 'tags' && (
                <div>
                  <input type="text" placeholder={t('searchTagsPlaceholder')} value={tagSearchTerm} onChange={(e) => setTagSearchTerm(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-pink-500 bg-gray-50" />
                  <div className="flex flex-wrap gap-2">
                    {filteredTagOptions.map(tag => (
                      <button key={tag} onClick={() => handleTagToggle(tag)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${selectedTags.includes(tag) ? "bg-pink-500 border-pink-500 text-white" : "bg-white border-gray-200 text-gray-600"}`}>#{tag}</button>
                    ))}
                  </div>
                  <div className="mt-8 flex gap-3">
                    <button onClick={() => setSelectedTags([])} className="flex-1 py-3 text-gray-500 font-bold underline">Reset</button>
                    <button onClick={() => setActiveFilterModal(null)} className="flex-[2] py-3 bg-gray-900 text-white rounded-xl font-bold">Apply</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/*<style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>*/}
    </div>
  );
}

export default Searchproduct;