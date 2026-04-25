import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase'; 
import { doc, getDoc } from 'firebase/firestore';

function SellerAddProduct({ user, eventData, editingProductId, onBack }) {
  // 1. State ทั้งหมด (ประกาศชุดเดียวภายใน Function)
  const [categoriesData, setCategoriesData] = useState({}); 
  const [allTags, setAllTags] = useState([]);
  const [isTagOpen, setIsTagOpen] = useState(false);
  const [tagSearchTerm, setTagSearchTerm] = useState("");
  const tagDropdownRef = useRef(null);

  const [cat1, setCat1] = useState('');
  const [cat2, setCat2] = useState('');
  const [cat3, setCat3] = useState('');
  const [cat4, setCat4] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    images: [],
    hasVariations: false,
    variationGroups: [
      { id: Date.now(), items: [{ id: Date.now() + 1, name: '', stock: '0', image: null }] }
    ],
    tags: [], 
    preorder: false
  });

  // 2. Logic การเลือกหมวดหมู่ (ดึงจาก categoriesData ใน State)
  const options1 = Object.keys(categoriesData);
  const data2 = cat1 ? categoriesData[cat1] : null;
  const options2 = data2 ? (Array.isArray(data2) ? data2 : Object.keys(data2)) : [];
  const data3 = (cat2 && data2 && !Array.isArray(data2)) ? data2[cat2] : null;
  const options3 = data3 ? (Array.isArray(data3) ? data3 : Object.keys(data3)) : [];
  const data4 = (cat3 && data3 && !Array.isArray(data3)) ? data3[cat3] : null;
  const options4 = data4 ? (Array.isArray(data4) ? data4 : []) : [];

  // 3. ดึงข้อมูลจาก Firestore เมื่อ Component Mount
  useEffect(() => {
    const fetchClassifications = async () => {
      try {
        const docRef = doc(db, "system_settings", "classifications");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCategoriesData(data.categories || {});
          setAllTags(data.tags || []);
        }
      } catch (error) {
        console.error("Error fetching classifications:", error);
      }
    };
    fetchClassifications();
  }, []);

  // 4. Click Outside เพื่อปิด Dropdown Tags
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target)) {
        setIsTagOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
  const handleClickOutsideCat = (e) => {
    if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) {
      setIsCatOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutsideCat);
  return () => document.removeEventListener("mousedown", handleClickOutsideCat);
}, []);

  // --- Functions จัดการ Event ต่างๆ ---
  const handleTagToggle = (tag) => {
    setFormData(prev => {
      const currentTags = Array.isArray(prev.tags) ? prev.tags : [];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag];
      return { ...prev, tags: newTags };
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleAddGroup = () => {
    setFormData(prev => ({
      ...prev,
      variationGroups: [...prev.variationGroups, { 
        id: Date.now(), 
        items: [{ id: Date.now() + 1, name: '', stock: '0', image: null }] 
      }]
    }));
  };

const handleRemoveGroup = (groupId) => {
    setFormData(prev => ({
      ...prev,
      variationGroups: prev.variationGroups.filter(g => g.id !== groupId)
    }));
  };

  const handleAddItemInGroup = (groupId) => {
    setFormData(prev => ({
      ...prev,
      variationGroups: prev.variationGroups.map(g => 
        g.id === groupId 
          ? { ...g, items: [...g.items, { id: Date.now(), name: '', stock: '0', image: null }] }
          : g
      )
    }));
  };

  const handleItemChange = (groupId, itemId, field, value) => {
    setFormData(prev => ({
      ...prev,
      variationGroups: prev.variationGroups.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            items: g.items.map(item => item.id === itemId ? { ...item, [field]: value } : item)
          };
        }
        return g;
      })
    }));
  };

  const handleUploadClick = (e, groupId, itemId) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setFormData(prev => ({
        ...prev,
        variationGroups: prev.variationGroups.map(g => {
          if (g.id === groupId) {
            return {
              ...g,
              items: g.items.map(item => 
                item.id === itemId ? { ...item, image: imageUrl, file: file } : item
              )
            };
          }
          return g;
        })
      }));
      e.target.value = null; 
    }
  };

  const handleRemoveItemImage = (groupId, itemId) => {
    setFormData(prev => ({
      ...prev,
      variationGroups: prev.variationGroups.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            items: g.items.map(item => 
              item.id === itemId ? { ...item, image: null, file: null } : item
            )
          };
        }
        return g;
      })
    }));
  };



  // 1. เพิ่ม State สำหรับควบคุมการเปิด/ปิด Dropdown หมวดหมู่
const [isCatOpen, setIsCatOpen] = useState(false);
const catDropdownRef = useRef(null);

// 2. ฟังก์ชันสำหรับสร้าง Label แสดงหมวดหมู่ที่เลือก (เช่น book > doujinshi > general)
// ฟังก์ชันสำหรับสร้าง Label แสดงหมวดหมู่ที่เลือก
const getCategoryLabel = () => {
  // กรองเอาเฉพาะค่าที่มีอยู่จริงมาต่อกันด้วย >
  const parts = [cat1, cat2, cat3, cat4].filter(part => part && part !== "");
  return parts.length > 0 ? parts.join(' > ') : '-- เลือกหมวดหมู่ --';
};
                // 1. ฟังก์ชันสำหรับ Render เมนูแบบทีละ Step
// 1. ฟังก์ชันสำหรับ Render เมนูแบบทีละ Step (แทนที่ตัวเดิม)
  const renderStepMenu = () => {
    if (!categoriesData) return null;

    const getLevelData = (level) => {
      if (level === 1) return categoriesData;
      if (level === 2 && cat1) return categoriesData[cat1];
      if (level === 3 && cat2) {
        const d2 = categoriesData[cat1];
        return d2 ? d2[cat2] : null;
      }
      if (level === 4 && cat3) {
        const d2 = categoriesData[cat1];
        const d3 = d2 ? d2[cat2] : null;
        return d3 ? d3[cat3] : null;
      }
      return null;
    };

    const currentCats = [cat1, cat2, cat3, cat4];
    const menus = [];

    for (let i = 1; i <= 4; i++) {
      const data = getLevelData(i);
      if (!data) break;

      const isArray = Array.isArray(data);
      const keys = isArray ? data : Object.keys(data);

      menus.push(
        <div key={i} className="min-w-[160px] md:min-w-[180px] border-r border-gray-100 last:border-r-0 flex flex-col h-[280px] overflow-y-auto custom-purple-scrollbar bg-white">
          {keys.map((key) => {
            const subData = !isArray ? data[key] : null;
            const hasNext = subData !== null && typeof subData === 'object';
            const isSelected = currentCats[i - 1] === key;

            return (
              <button
                key={key}
                type="button"
                className={`w-full text-left px-4 py-3 text-[13px] flex justify-between items-center transition-all
                  ${isSelected ? 'bg-gray-100 text-purple-700 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCategorySelect(key, i);
                  if (!hasNext) setIsCatOpen(false);
                }}
              >
                <span className="truncate pr-2">{key}</span>
                {hasNext && (
                  <svg className={`w-3 h-3 ${isSelected ? 'text-purple-700' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      );
      if (!currentCats[i-1]) break;
    }

    return (
      <div className="flex bg-white rounded-xl border border-purple-100 overflow-x-auto custom-purple-scrollbar max-w-[calc(100vw-2.5rem)] md:max-w-max">
        {menus}
      </div>
    );
  };

  
         // ปรับฟังก์ชันนี้ใหม่เพื่อให้รองรับการคงค่าชั้นก่อนหน้าไว้
const handleCategorySelect = (value, level) => {
  if (level === 1) {
    setCat1(value); setCat2(''); setCat3(''); setCat4('');
  } else if (level === 2) {
    setCat2(value); setCat3(''); setCat4('');
  } else if (level === 3) {
    setCat3(value); setCat4('');
  } else if (level === 4) {
    setCat4(value);
  }
};

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-purple-600 hover:bg-purple-100 p-2 rounded-full transition font-bold">
          ← กลับ
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          {editingProductId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
        </h1>
      </div>

      {/* Section 1: ข้อมูลทั่วไป */}
      <div className="bg-white border border-purple-200 rounded-xl mb-6 shadow-sm ">
        <div className="bg-purple-50 text-purple-700 px-5 py-4 font-bold text-lg border-b border-purple-200">
          ข้อมูลทั่วไป
        </div>
        <div className="p-5 flex flex-col gap-5">

          <div className="flex flex-col gap-2">
            <label className="font-semibold text-gray-700">ชื่อสินค้า <span className="text-red-500">*</span></label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:border-purple-500 outline-none" />
          </div>

          {/* ราคา และ หมวดหมู่ */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-gray-700">ราคา (บาท) <span className="text-red-500">*</span></label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="0" className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500" />
            </div>

            <div className="md:col-span-3 flex flex-col gap-2">
              <label className="font-semibold text-gray-700">หมวดหมู่ </label>
              <div className="md:col-span-3 flex flex-col gap-2">
  <div className="relative" ref={catDropdownRef}>
        <button
  type="button"
  onClick={() => setIsCatOpen(!isCatOpen)}
  className={`w-full p-3 border rounded-lg text-sm flex justify-between items-center transition-all 
   
    outline-none focus:outline-none focus:ring-0
    
    !focus:border-gray-300 !active:border-gray-300
    ${
      isCatOpen 
        ? '!border-gray-300 bg-white' 
        : '!border-gray-300 bg-white hover:border-gray-400'
    }`}
>
          <span className={cat1 ? "text-gray-800 font-medium" : "text-gray-400"}>
            {getCategoryLabel()}
          </span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCatOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

  {/* Dropdown คอนเทนเนอร์หลัก พร้อมระบบเลื่อนลง (Scroll) ถ้าข้อมูลยาวเกินไป */}
  {/* Dropdown คอนเทนเนอร์หลัก */}
        {/* Dropdown คอนเทนเนอร์หลัก */}
{isCatOpen && (
  <div className="absolute z-[100] mt-1 left-0 ">
    <style>{`
      /* ตกแต่ง Scrollbar แนวนอนเพิ่มเติม */
      .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 4px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: #f8f5ff; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #d8b4fe; border-radius: 10px; }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #c084fc; }
    `}</style>
    
    {renderStepMenu()}
  </div>
)}
</div>
</div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-5">
            {/* Tags UI */}
            <div className="flex flex-col gap-2 flex-1 relative" ref={tagDropdownRef}>
  <label className="font-semibold text-gray-700">Tags (เลือกจากรายการ)</label>
  
  {/* ส่วนแสดง Tag ที่เลือกแล้ว */}
  <div 
    className="w-full min-h-[46px] p-2 border border-gray-300 rounded-lg bg-white flex flex-wrap gap-2 items-center focus-within:border-purple-500 cursor-pointer" 
    onClick={() => setIsTagOpen(!isTagOpen)}
  >
    {formData.tags.length === 0 && <span className="text-gray-400 text-sm ml-2">เลือกแท็ก...</span>}
    {formData.tags.map(tag => (
      <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded border flex items-center gap-1 text-sm">
        {tag}
        <button 
          type="button" 
          onClick={(e) => { e.stopPropagation(); handleTagToggle(tag); }} 
          className="text-gray-400 hover:text-red-500 font-bold"
        >
          ×
        </button>
      </span>
    ))}
    {/* ไอคอนลูกศรลงด้านขวา */}
    <div className="ml-auto pr-1">
      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isTagOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>

  {/* Dropdown Menu */}
  {isTagOpen && (
    <div className="absolute z-50 w-full top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
      
      {/* ช่อง Search ภายใน Dropdown ตามภาพที่ 2 */}
      <div className="p-2 border-b border-gray-100 bg-gray-50">
        <input 
          type="text" 
          placeholder="Search tags..." 
          value={tagSearchTerm} 
          onChange={(e) => setTagSearchTerm(e.target.value)}
          className="w-full p-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-purple-400"
          onClick={(e) => e.stopPropagation()} // กัน dropdown ปิดเวลาคลิกช่อง search
        />
      </div>

      {/* รายการ Tag พร้อม Checkbox */}
      <div className="max-h-60 overflow-y-auto custom-scrollbar">
        {allTags
          .filter(tag => tag.toLowerCase().includes(tagSearchTerm.toLowerCase()))
          .map(tag => {
            const isSelected = formData.tags.includes(tag);
            return (
              <div 
                key={tag} 
                onClick={() => handleTagToggle(tag)} 
                className="flex items-center gap-3 p-3 hover:bg-purple-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
              >
                {/* Checkbox ด้านหน้า */}
                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                  isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-300 bg-white'
                }`}>
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                
                <span className={`text-sm ${isSelected ? 'text-purple-700 font-bold' : 'text-gray-600'}`}>
                  {tag}
                </span>
              </div>
            );
          })}
        {allTags.filter(tag => tag.toLowerCase().includes(tagSearchTerm.toLowerCase())).length === 0 && (
          <div className="p-4 text-center text-gray-400 text-sm">ไม่พบแท็กที่ค้นหา</div>
        )}
      </div>
    </div>
  )}
</div>
            
            <div className="flex flex-col gap-2 justify-center mt-6">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-orange-600 bg-orange-50 px-4 py-3 rounded-lg border border-orange-200">
                <input type="checkbox" name="preorder" checked={formData.preorder} onChange={handleChange} className="w-5 h-5 accent-orange-500" />
                สินค้านี้เป็น Pre-order
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold text-gray-700">รายละเอียดสินค้า</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows="3" placeholder="อธิบายรายละเอียดสินค้าของคุณ..." className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500"></textarea>
          </div>
        </div>
      </div>



              {/* ---------------- Section 2: รูปภาพสินค้า ---------------- */}
      <div className="bg-white border border-purple-200 rounded-xl mb-6 shadow-sm overflow-hidden">
        <div className="bg-purple-50 text-purple-700 px-5 py-4 font-bold text-lg border-b border-purple-200">
          รูปภาพสินค้า <span className="text-sm font-normal text-gray-500 ml-2">(สูงสุด 5 รูป)</span>
        </div>
        <div className="p-5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="aspect-square border-2 border-dashed border-purple-300 bg-purple-50 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-purple-100 transition text-purple-500 text-sm overflow-hidden">
              {formData.images[idx] ? (
                <img src={formData.images[idx]} alt={`img-${idx}`} className="w-full h-full object-cover" />
              ) : (
                <>
                  <span className="text-2xl mb-1">+</span>
                  <span>เพิ่มรูป {idx === 0 && "(ปก)"}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>



      {/* Section 3: ข้อมูลการขาย */}
<div className="bg-white border border-purple-200 rounded-xl mb-6 shadow-sm overflow-hidden">
  <div className="bg-purple-50 text-purple-700 px-5 py-4 font-bold text-lg border-b border-purple-200 flex justify-between items-center">
    <span>ข้อมูลการขาย</span>
    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
      <input type="checkbox" name="hasVariations" checked={formData.hasVariations} onChange={handleChange} className="w-4 h-4 accent-purple-600" />
      สินค้านี้มีตัวเลือก
    </label>
  </div>

  <div className="p-5">
    {!formData.hasVariations ? (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <label className="font-semibold text-gray-700">ราคา (บาท)</label>
          <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:border-purple-500 outline-none" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-semibold text-gray-700">คลังสินค้า (ชิ้น)</label>
          <input type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:border-purple-500 outline-none" />
        </div>
      </div>
    ) : (
      <div className="flex flex-col gap-10">
        {formData.variationGroups.map((group, index) => (
          <div key={group.id} className="border-2 border-gray-100 rounded-2xl p-6 bg-white shadow-sm relative">
            
            {/* ปุ่มลบ Group ใหญ่ (กากบาทแดงมุมบน) */}
            {formData.variationGroups.length > 1 && (
              <button 
                onClick={() => handleRemoveGroup(group.id)}
                className="absolute -top-3 -right-3 bg-red-500 text-white w-8 h-8 rounded-full shadow-lg hover:bg-red-600 transition-all flex items-center justify-center z-10 border-2 border-white"
              >✕</button>
            )}

            {/* --- ส่วนหัวใหม่: Variation 1, 2 และช่องกรอกชื่อกลุ่ม --- */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Variation {index + 1}</h3>
              <input 
                type="text" 
                placeholder="ระบุชื่อสินค้า"
                value={group.groupName || ''}
                onChange={(e) => {
                  const newGroups = formData.variationGroups.map(g => 
                    g.id === group.id ? { ...g, groupName: e.target.value } : g
                  );
                  setFormData(prev => ({ ...prev, variationGroups: newGroups }));
                }}
                className="w-full md:w-1/2 p-3 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-purple-500 outline-none transition-all"
              />
            </div>

            {/* Header ตารางรายการย่อย */}
            <div className="hidden md:grid md:grid-cols-[120px_1fr_120px_80px] gap-4 bg-purple-50 p-3 rounded-lg text-purple-700 font-bold text-sm text-center mb-3">
              <div>รูป</div>
              <div>ชื่อตัวเลือก</div>
              <div>คลังสินค้า (ชิ้น)</div>
              <div>จัดการ</div>
            </div>

            {/* รายการตัวเลือกย่อยภายใน Group */}
            <div className="flex flex-col gap-3">
              {group.items.map((item) => (
                <div key={item.id} className="flex flex-col md:grid md:grid-cols-[120px_1fr_120px_80px] gap-4 p-3 items-center border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-lg transition-colors">
                  
                  {/* รูปภาพ */}
                  <div className="flex justify-center">
                    <div className="relative group/img w-20 h-20">
                      <label className="w-full h-full border-2 border-dashed border-purple-200 bg-purple-50 rounded-xl flex items-center justify-center cursor-pointer text-purple-400 hover:bg-purple-100 overflow-hidden">
                        <input type="file" className="hidden" onChange={(e) => handleUploadClick(e, group.id, item.id)} accept="image/*" />
                        {item.image ? (
                          <img src={item.image} className="w-full h-full object-cover" alt="preview" />
                        ) : ( <span className="text-xl">+</span> )}
                      </label>
                      {item.image && (
                        <button onClick={() => handleRemoveItemImage(group.id, item.id)} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-[10px] border-2 border-white">✕</button>
                      )}
                    </div>
                  </div>

                  <input 
                    type="text" 
                    value={item.name} 
                    onChange={(e) => handleItemChange(group.id, item.id, 'name', e.target.value)}
                    placeholder="ระบุชื่อตัวเลือก" 
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-purple-500 outline-none" 
                  />

                  <input 
                    type="number" 
                    value={item.stock} 
                    onChange={(e) => handleItemChange(group.id, item.id, 'stock', e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-center focus:border-purple-500 outline-none" 
                  />

                  <div className="flex justify-center">
                    <button 
                      onClick={() => {
                        const newItems = group.items.filter(i => i.id !== item.id);
                        if (newItems.length > 0) {
                          setFormData(prev => ({
                            ...prev,
                            variationGroups: prev.variationGroups.map(g => g.id === group.id ? { ...g, items: newItems } : g)
                          }));
                        }
                      }}
                      className="text-red-500 font-bold text-sm hover:underline"
                    >ลบ</button>
                  </div>
                </div>
              ))}
            </div>

                  {/* ปุ่มเพิ่มแถวภายใน Group ปรับขนาดให้เล็กลงตามรูป */}
                  <button 
                    type="button" 
                    onClick={() => handleAddItemInGroup(group.id)}
                    className="mt-4 px-4 py-2 bg-white text-purple-600 rounded-lg font-bold hover:bg-purple-50 border border-purple-200 flex items-center justify-center gap-2 transition-all text-sm shadow-sm"
                  >
                    + เพิ่มตัวเลือก
                  </button>
                </div>
              ))}

              {/* ปุ่มเพิ่ม Group ใหญ่ด้านล่างสุด */}
              <button 
                type="button"
                onClick={handleAddGroup}
                className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg flex items-center justify-center gap-2 active:scale-[0.95] transition-all"
              >
                + Add Variation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mt-8 pb-10">
        <button onClick={onBack} className="px-8 py-3 bg-white text-purple-600 border-2 border-purple-600 rounded-lg font-bold hover:bg-purple-50 transition">
          ยกเลิก
        </button>
        <button className="px-8 py-3 bg-purple-600 text-white border-2 border-purple-600 rounded-lg font-bold hover:bg-purple-700 transition">
          บันทึกสินค้า
        </button>
      </div>

    </div>
  );
}

export default SellerAddProduct;