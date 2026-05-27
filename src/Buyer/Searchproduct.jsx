//src/Buyer/Searchproduct.jsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
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
  
  // State สำหรับ Categories
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isTagOpen, setIsTagOpen] = useState(false);
  const [tagSearchTerm, setTagSearchTerm] = useState("");
  const tagDropdownRef = useRef(null);
  const [availableSections, setAvailableSections] = useState([]);

  // 1.ดึงข้อมูลสินค้าโดยตรง (พร้อมระบบลด Cost การอ่าน)
  useEffect(() => {
    const fetchProductsData = async () => {
      try {
        // --- ระบบลด Cost: เช็ค Cache ก่อน หากเพิ่งดึงข้อมูลมาไม่เกิน 5 นาที จะไม่ดึงใหม่ ---
        const cachedProducts = sessionStorage.getItem('cached_products');
        const cachedTime = sessionStorage.getItem('cached_products_time');
        const CACHE_DURATION = 5 * 60 * 1000; // 5 นาที (ปรับเปลี่ยนได้)

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
          return; // ออกจากฟังก์ชันทันที ประหยัด Read Cost
        }
        // -----------------------------------------------------------

        const querySnapshot = await getDocs(collection(db, "products"));
        let allItems = [];
        let sectionsSet = new Set();
        let tagsSet = new Set();
        let categoriesSet = new Set();

        querySnapshot.forEach((doc) => {
          const itemData = doc.data();
          
          // โครงสร้างของคุณเก็บ Tags เป็นString คั่นด้วยลูกน้ำ
          const itemTags = itemData.tags ? itemData.tags.split(',').map(t => t.trim()) : [];
          
          // เก็บหมวดหมู่จากฟิลด์ category_main
          if (itemData.category_main) {
            categoriesSet.add(itemData.category_main);
          }

          // หา Section จากตัวอักษรตัวแรกของ booth_numbers (เช่น A01 -> A)
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
            tagsArray: itemTags, // เก็บArray ไว้ใช้Filter
            section: section
          });

          // รวบรวม Tags จากตัวสินค้า
          itemTags.forEach(t => tagsSet.add(t.toLowerCase()));
        });

        setProducts(allItems);
        setAvailableSections(Array.from(sectionsSet).sort());
        // เราตั้ง Tags จากข้อมูลจริงไว้ก่อน เผื่อ System Settings โหลดไม่ขึ้น
        setAllTags(Array.from(tagsSet).sort());

        // นำหมวดหมู่ที่รวบรวมได้จากสินค้ามาใส่ใน State
        setAllCategories(Array.from(categoriesSet).sort());

        setLoading(false);

        // --- บันทึกข้อมูลลง Cache เพื่อลด Cost ในการเปิดหน้าครั้งต่อไป ---
        sessionStorage.setItem('cached_products', JSON.stringify(allItems));
        sessionStorage.setItem('cached_products_time', Date.now().toString());

      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    
    fetchProductsData();
  }, []);

  /*// ดึง Categoriesจาก Document "master"
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const docRef = doc(db, "categories", "master");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // แก้ไขบรรทัดนี้: เข้าไปที่ data.tree ก่อนดึง Keys
          // และเพิ่มเงื่อนไขตรวจสอบว่า data.tree มีค่าอยู่จริง
          const treeData = data.tree || {};
          const topLevelCategories = Object.keys(treeData).sort();
          
          setAllCategories(topLevelCategories);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);*/

  // ดึงTagsจากSystem Settings (พร้อม Cache เพื่อลด Cost)
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
          // แปลง object ที่ได้มาให้เป็น Array ของค่าvalue
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

  // ปิดDropdownเมื่อคลิกข้างนอก
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
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // 2.ตรรกะการกรองข้อมูลสินค้า
  const filteredProducts = products.map(product => {
    const productTags = product.tagsArray.map(t => t.toLowerCase());
    // นับจำนวนtag ที่ match
    const matchCount = selectedTags.filter(tag => productTags.includes(tag)).length;
    return {
      ...product,
      matchCount
    };
  })
  .filter(product => {
    // แปลง Array ของหมายเลขบูธเป็น String เพื่อค้นหา
    const boothNumbersText = Array.isArray(product.booth_numbers) ? product.booth_numbers.join(", ") : "";

    const matchSearch = searchTerm === "" || 
      (product.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.creator || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.booth_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      boothNumbersText.toLowerCase().includes(searchTerm.toLowerCase());

    const matchDay = selectedDay === "All" || 
      (product.event_date === selectedDay || product.event_date === "Both");

    const matchSection = selectedSection === "All" || product.section === selectedSection;

    // เช็คหมวดหมู่ (Category)
    const matchCategory = selectedCategory === "All" || 
      (product.category_main && product.category_main.toLowerCase() === selectedCategory.toLowerCase());

    // ใช้ OR (มีอย่างน้อย 1 tag ก็พอ)
    const matchTags = selectedTags.length === 0 || product.matchCount > 0;

    return matchSearch && matchDay && matchSection && matchCategory && matchTags;
  })
  .sort((a, b) => {
    // เรียงตามจำนวนtagที่ match (มาก → น้อย)
    return b.matchCount - a.matchCount;
  });

  const filteredTagOptions = allTags.filter(tag => tag.includes(tagSearchTerm.toLowerCase()));

  if (loading) {
    return <div className="text-center py-20 text-pink-500 font-bold animate-pulse">{t('searchingProducts')}</div>;
  }

  if (selectedProduct) {
    return (
      <ProductDetail 
        product={selectedProduct} 
        onBack={() => setSelectedProduct(null)}
        user={user}
        onRequireAuth={onRequireAuth}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
        {t('searchTitle')}
      </h1>

      {/* Filter Box */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
        
        {/* แถวที่ 1: Event Day, Zone, Category */}
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
              {allCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* แถวที่ 2: Tags และ Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* กล่อง Tags */}
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

          {/* กล่อง Search By Product - ปรับให้มี Label และความสูงเท่ากัน */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('searchLabel')}</label>
            <input 
              type="text"
              placeholder={t('searchPlaceholder')} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg px-5 outline-none focus:border-pink-500 shadow-sm h-[46px]" 
            />
          </div>

        </div>
      </div>

      {/* Results Grid - เปลี่ยนเป็นสไตล์สินค้า */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {filteredProducts.map((product, index) => {
          
          const stock = product.total_stock || 0;

          return (
            <div key={index} onClick={() => setSelectedProduct(product)}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all group cursor-pointer flex flex-col">
              
              {/* Image Area */}
              <div className="aspect-square w-full bg-gray-50 relative overflow-hidden">
                <img
                  src={product.cover_image || "https://placehold.co/400x400/f3f4f6/9ca3af?text=No+Image"}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                
                {/* ป้าย PRE-ORDER */}
                {product.preorder && (
                  <div className="absolute top-2 right-2 bg-orange-500/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-black text-white shadow-sm border border-orange-400">
                    PRE-ORDER
                  </div>
                )}
              </div>

              {/* Detail Area */}
              <div className="p-3 md:p-4 flex flex-col flex-1">
                <h3 className="font-bold text-gray-800 text-sm md:text-base truncate mb-2">
                  {product.name}
                </h3>
                
                <div className="mt-auto">
                  <div className="flex flex-col gap-1.5 mb-3">
                    <span className="self-start bg-pink-100 text-pink-600 text-[10px] font-black px-1.5 py-0.5 rounded border border-pink-200 uppercase">
                      {Array.isArray(product.booth_numbers) && product.booth_numbers.length > 0 
                        ? product.booth_numbers.join(", ") 
                        : "N/A"}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium truncate">
                      {product.creator || t('unknownCreator')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                    <p className={`text-[10px] font-bold ${stock > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {stock > 0 ? `${t('availableStock')}${stock}` : t('outOfStock')}
                    </p>
                    <div className="text-pink-500 font-black text-gray-900">
                      ฿{product.price}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-20 text-gray-400 font-bold bg-white rounded-2xl border-2 border-dashed border-gray-200">
          {t('noProductsFound')}
        </div>
      )}

    </div>
  );
}

export default Searchproduct;