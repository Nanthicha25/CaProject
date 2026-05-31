import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import ProductDetail from './ProductDetail';
import { useLanguage } from "./LanguageContext"; // 1. นำเข้า Hook

function Searchproduct({ user, onRequireAuth }) {
  const { t } = useLanguage(); // 2. ดึงฟังก์ชันแปลภาษา
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDay, setSelectedDay] = useState("All");
  const [selectedSection, setSelectedSection] = useState("All");
  
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isTagOpen, setIsTagOpen] = useState(false);
  const [tagSearchTerm, setTagSearchTerm] = useState("");
  const tagDropdownRef = useRef(null);
  const [availableSections, setAvailableSections] = useState([]);

  useEffect(() => {
    const fetchAndFlattenData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "booths"));
        let allItems = [];
        let tagsSet = new Set();
        let sectionsSet = new Set();

        querySnapshot.forEach((doc) => {
          const boothData = doc.data();
          const boothItems = boothData.products || [];

          if (boothData.boothNumbers && boothData.boothNumbers.length > 0) {
            const section = boothData.boothNumbers[0].charAt(0).toUpperCase();
            if (/[A-Z]/.test(section)) sectionsSet.add(section);
          }

          boothItems.forEach(item => {
            allItems.push({
              ...item,
              parentBoothId: doc.id,
              boothName: boothData.boothName || boothData.mainCreator,
              boothNumbers: boothData.boothNumbers || [],
              eventDay: boothData.eventDay || "Day 1",
              section: boothData.boothNumbers?.[0]?.charAt(0).toUpperCase() || ""
            });

            const itemTags = item.tags || boothData.tags || [];
            itemTags.forEach(t => tagsSet.add(t.toLowerCase()));
          });
        });

        setProducts(allItems);
        setAllTags(Array.from(tagsSet).sort());
        setAvailableSections(Array.from(sectionsSet).sort());
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    fetchAndFlattenData();
  }, []);

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

  const filteredProducts = products.filter(product => {
    const matchSearch = searchTerm === "" || 
      (product.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.boothName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.boothNumbers || []).some(b => b.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchDay = selectedDay === "All" || (product.eventDay === selectedDay || product.eventDay === "Both");
    const matchSection = selectedSection === "All" || product.section === selectedSection;
    const productTags = (product.tags || []).map(t => t.toLowerCase());
    const matchTags = selectedTags.length === 0 || selectedTags.every(tag => productTags.includes(tag));

    return matchSearch && matchDay && matchSection && matchTags;
  });

  const filteredTagOptions = allTags.filter(tag => tag.includes(tagSearchTerm.toLowerCase()));

  if (loading) {
    return <div className="text-center py-20 text-pink-500 font-bold animate-pulse">{t('searching_products')}</div>;
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
      
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
        {t('search_products_title')}
      </h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('event_day_label')}</label>
            <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-pink-500 bg-white text-sm">
              <option value="All">{t('all_days')}</option>
              <option value="Day 1">Day 1 [30-May]</option>
              <option value="Day 2">Day 2 [31-May]</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('section_zone_label')}</label>
            <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-pink-500 bg-white text-sm">
              <option value="All">{t('all_sections')}</option>
              {availableSections.map(sec => <option key={sec} value={sec}>{t('zone')} {sec}</option>)}
            </select>
          </div>

          <div ref={tagDropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('tags_label')}</label>
            <div onClick={() => setIsTagOpen(!isTagOpen)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white flex justify-between items-center cursor-pointer">
              <span className="truncate text-sm">
                {selectedTags.length === 0 ? t('filter_by_tags') : `${selectedTags.length} ${t('tags_selected')}`}
              </span>
              <span className="text-gray-400 text-xs">▼</span>
            </div>
            {isTagOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <div className="p-3 border-b border-gray-100 flex items-center gap-2">
                  <input type="text" placeholder={t('search_tags_placeholder')} value={tagSearchTerm} onChange={(e) => setTagSearchTerm(e.target.value)} className="w-full outline-none text-sm" />
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
        </div>

        <input 
          type="text" 
          placeholder={t('search_placeholder')} 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="w-full border border-gray-300 rounded-lg px-5 py-3 outline-none focus:border-pink-500 shadow-sm" 
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {filteredProducts.map((product, index) => (
          <div key={index} onClick={() => setSelectedProduct(product)}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all group cursor-pointer flex flex-col">
            
            <div className="aspect-square w-full bg-gray-50 relative overflow-hidden">
              <img 
                src={product.product_images?.cover_image || product.images?.[0] || "https://placehold.co/400x400/f3f4f6/9ca3af?text=No+Image"} 
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-white px-2 py-1 rounded-lg text-xs font-bold">
                ฿{product.price}
              </div>
            </div>

            <div className="p-3 md:p-4 flex flex-col flex-1">
              <h3 className="font-bold text-gray-800 text-sm md:text-base line-clamp-2 leading-tight mb-2 min-h-[2.5rem]">
                {product.name}
              </h3>
              
              <div className="mt-auto">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="bg-pink-100 text-pink-600 text-[10px] font-black px-1.5 py-0.5 rounded border border-pink-200 uppercase">
                    {product.boothNumbers?.[0] || "N/A"}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium truncate">
                    {product.boothName}
                  </span>
                </div>
                
                <p className={`text-[10px] font-bold ${product.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {product.stock > 0 ? `${t('available')}: ${product.stock}` : t('out_of_stock')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-20 text-gray-400 font-bold bg-white rounded-2xl border-2 border-dashed border-gray-200">
          {t('no_products_found')}
        </div>
      )}
    </div>
  );
}

export default Searchproduct;