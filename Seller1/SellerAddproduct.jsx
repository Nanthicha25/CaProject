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
                const renderCategoryMenu = (data, level = 1) => {
  if (!data) return null;
  const keys = Object.keys(data);

  return (
    // เพิ่ม z-index และลบ overflow-hidden ออกจากคอนเทนเนอร์เพื่อให้เมนูย่อยยื่นออกมาได้
    <div className={`flex flex-col ${level > 1 ? 'min-w-[200px]' : 'w-full'} bg-white py-1 relative`}>
      {keys.map((key) => {
        const subData = data[key];
        const hasSub = subData !== null && typeof subData === 'object' && !Array.isArray(subData);
        const isArray = Array.isArray(subData);
        const hasNextLevel = hasSub || isArray;

        // เช็คว่าไอเทมนี้อยู่ในเส้นทางที่เลือกหรือไม่
        const isSelected = [cat1, cat2, cat3, cat4].includes(key);

        return (
          <div key={key} className="group relative">
            <button
              type="button"
              className={`w-full text-left px-4 py-2.5 text-[13px] flex justify-between items-center transition-colors
                ${isSelected ? 'bg-purple-50 text-purple-600 font-bold' : 'hover:bg-purple-50 text-gray-700'}`}
              onClick={(e) => {
                e.stopPropagation();
                handleCategorySelect(key, level, hasNextLevel);
              }}
            >
              <span className="truncate pr-4">{key}</span>
              {hasNextLevel && (
                <svg className={`w-3 h-3 ${isSelected ? 'text-purple-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>

            {/* เมนูย่อย (ชั้นที่ 2, 3, 4) */}
            {hasNextLevel && (
              <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute left-full top-0 z-[150] pl-1 transition-all duration-150">
                <div className="bg-white border border-gray-200 shadow-2xl rounded-md overflow-visible min-w-[200px]">
                  {/* RECURSIVE: เรียกตัวเองซ้ำเพื่อสร้างชั้นถัดไป */}
                  {hasSub && renderCategoryMenu(subData, level + 1)}
                  
                  {/* กรณีเป็น Array (ชั้นสุดท้าย เช่น [pin, keychain]) */}
                  {isArray && (
                    <div className="flex flex-col max-h-[300px] overflow-y-auto custom-scrollbar bg-white py-1">
                      {subData.map((item) => {
                        const isFinalSelected = [cat1, cat2, cat3, cat4].includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCategorySelect(item, level + 1, false);
                            }}
                            className={`w-full px-4 py-2 text-[13px] text-left transition-colors
                              ${isFinalSelected ? 'bg-purple-100 text-purple-700 font-bold' : 'text-gray-600 hover:bg-purple-50'}`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
         // ปรับฟังก์ชันนี้ใหม่เพื่อให้รองรับการคงค่าชั้นก่อนหน้าไว้
const handleCategorySelect = (value, level, hasSubOrArray) => {
  if (level === 1) {
    setCat1(value); setCat2(''); setCat3(''); setCat4('');
  } else if (level === 2) {
    setCat2(value); setCat3(''); setCat4('');
  } else if (level === 3) {
    setCat3(value); setCat4('');
  } else if (level === 4) {
    setCat4(value);
  }

  // ถ้าไม่มีหมวดหมู่ย่อยต่อแล้ว (เป็นตัวสุดท้าย) ให้ปิด Dropdown
  if (!hasSubOrArray) {
    setIsCatOpen(false);
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
      <div className="bg-white border border-purple-200 rounded-xl mb-6 shadow-sm overflow-hidden">
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
          className={`w-full p-3 border rounded-lg text-sm flex justify-between items-center transition-all ${
            isCatOpen ? 'border-purple-500 ring-2 ring-purple-100 bg-white' : 'border-gray-300 bg-gray-50 hover:bg-white'
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
        {isCatOpen && (
  <div className="absolute z-[100] mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-2xl py-1">
    <style>{`
      .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #d8b4fe; border-radius: 10px; }
    `}</style>
    
    {/* สำคัญมาก: ต้องเป็น overflow-visible เพื่อให้เมนูที่ยื่นไปทางขวาแสดงผลได้ */}
    <div className="overflow-visible"> 
      {renderCategoryMenu(categoriesData)}
    </div>
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
              <div className="w-full min-h-[46px] p-2 border border-gray-300 rounded-lg bg-white flex flex-wrap gap-2 items-center focus-within:border-purple-500" onClick={() => setIsTagOpen(true)}>
                {formData.tags.map(tag => (
                  <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded border flex items-center gap-1 text-sm">
                    {tag}
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleTagToggle(tag); }} className="text-gray-400 hover:text-red-500 font-bold">×</button>
                  </span>
                ))}
                <input type="text" placeholder={formData.tags.length === 0 ? "ค้นหาแท็ก..." : ""} value={tagSearchTerm} onChange={(e) => { setTagSearchTerm(e.target.value); setIsTagOpen(true); }} className="flex-1 outline-none text-sm min-w-[100px]" />
              </div>

              {isTagOpen && (
                <div className="absolute z-50 w-full top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {allTags
                    .filter(tag => tag.toLowerCase().includes(tagSearchTerm.toLowerCase()))
                    .map(tag => (
                      <div key={tag} onClick={() => { handleTagToggle(tag); setTagSearchTerm(""); }} className="flex items-center justify-between p-3 hover:bg-purple-50 cursor-pointer">
                        <span className="text-sm">{tag}</span>
                        {formData.tags.includes(tag) && <span className="text-purple-600 font-bold">✓</span>}
                      </div>
                    ))}
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