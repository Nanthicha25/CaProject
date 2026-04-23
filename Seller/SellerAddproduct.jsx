import React, { useState, useEffect } from 'react';

const FIRESTORE_CATEGORIES = {
  "bag": null,
  "book": {
    "doujinshi": ["general", "adult (18+)"],
    "original (OC)": ["general", "adult (18+)"]
  },
  "clothes": null,
  "craft": ["accessories", "lifestyle goods"],
  "dolls": ["doll", "doll accessory"],
  "merchandise": {
    "brooch": { "acrylic": ["set", "single"], "wood": ["set", "single"] },
    "keychain": { "acrylic": ["set", "single"], "wood": ["set", "single"] },
    "pin": { "acrylic": ["set", "single"], "wood": ["set", "single"] },
    "standee": { "acrylic": ["set", "single"], "wood": ["set", "single"] }
  },
  "others": null,
  "paper commission": null,
  "paper goods": {
    "keychain": ["set", "single"],
    "photocard": ["set", "single"],
    "postcard": ["set", "single"],
    "poster": ["set", "single"],
    "standee": ["set", "single"],
    "sticker": ["set", "single"]
  }
};

function SellerAddProduct({ user, eventData, editingProductId, onBack }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    images: [],
    hasVariations: false,
    variations: [],
    tags: '', 
    preorder: false
  });

  const [cat1, setCat1] = useState('');
  const [cat2, setCat2] = useState('');
  const [cat3, setCat3] = useState('');
  const [cat4, setCat4] = useState('');

  useEffect(() => {
    if (editingProductId && eventData) {
      let foundProduct = null;
      for (const event_date in eventData) {
        eventData[event_date].forEach(booth => {
          const item = booth.products?.find(p => p.id === editingProductId);
          if (item) foundProduct = item;
        });
      }

      if (foundProduct) {
        setFormData({
          name: foundProduct.name || '',
          description: foundProduct.description || '',
          price: foundProduct.price || '',
          stock: foundProduct.stock || '',
          images: foundProduct.images || foundProduct.product_images?.images || [],
          hasVariations: foundProduct.variations?.length > 0 || false,
          variations: foundProduct.variations || [],
          tags: foundProduct.classification?.tags?.join(', ') || '',
          preorder: foundProduct.classification?.preorder || false
        });

        const catPath = foundProduct.classification?.category?.split('/') || [];
        setCat1(catPath[0] || '');
        setCat2(catPath[1] || '');
        setCat3(catPath[2] || '');
        setCat4(catPath[3] || '');
      }
    }
  }, [editingProductId, eventData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleAddVariation = () => {
    setFormData(prev => ({
      ...prev,
      variations: [...prev.variations, { id: Date.now().toString(), name: '', price: prev.price || '', stock: '0', image: '' }]
    }));
  };

  const handleVariationChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.map(v => v.id === id ? { ...v, [field]: value } : v)
    }));
  };

  const handleRemoveVariation = (id) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.filter(v => v.id !== id)
    }));
  };

  const options1 = Object.keys(FIRESTORE_CATEGORIES);
  const data2 = cat1 ? FIRESTORE_CATEGORIES[cat1] : null;
  const options2 = data2 ? (Array.isArray(data2) ? data2 : Object.keys(data2)) : [];
  const data3 = (cat2 && data2 && !Array.isArray(data2)) ? data2[cat2] : null;
  const options3 = data3 ? (Array.isArray(data3) ? data3 : Object.keys(data3)) : [];
  const data4 = (cat3 && data3 && !Array.isArray(data3)) ? data3[cat3] : null;
  const options4 = data4 ? (Array.isArray(data4) ? data4 : Object.keys(data4)) : [];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
      
      {/* Header & Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          type="button" 
          onClick={onBack} 
          className="text-purple-600 hover:bg-purple-100 p-2 rounded-full transition font-bold"
        >
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
          
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-gray-700">หมวดหมู่</label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select value={cat1} onChange={(e) => { setCat1(e.target.value); setCat2(''); setCat3(''); setCat4(''); }} className="p-3 border border-gray-300 rounded-lg text-sm">
                <option value="">-- หมวดหมู่หลัก --</option>
                {options1.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {options2.length > 0 && (
                <select value={cat2} onChange={(e) => { setCat2(e.target.value); setCat3(''); setCat4(''); }} className="p-3 border border-gray-300 rounded-lg text-sm">
                  <option value="">-- ประเภท --</option>
                  {options2.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )}
              {/* ... (Dropdown 3 และ 4 โค้ดเดิมได้เลย) */}
            </div>
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
            <div className="flex flex-col md:flex-row gap-5">
              <div className="flex flex-col gap-2 flex-1">
                <label className="font-semibold text-gray-700">ราคา (บาท)</label>
                <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="font-semibold text-gray-700">คลังสินค้า (ชิ้น)</label>
                <input type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" />
              </div>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto border border-purple-200 rounded-lg"> 
  {/* หุ้มตารางด้วย div ที่มีเส้นขอบและมุมโค้ง */}
  
  <table className="w-full text-center border-collapse"> 
    <thead>
      <tr className="bg-purple-50 text-purple-700">
        <th className="p-3 border-b border-r border-purple-200 w-[15%]">รูป</th>
        <th className="p-3 border-b border-r border-purple-200 w-[35%] text-left">ชื่อตัวเลือก (เช่น ลายแมว)</th>
        <th className="p-3 border-b border-r border-purple-200 w-[20%]">ราคา (บาท)</th>
        <th className="p-3 border-b border-r border-purple-200 w-[20%]">คลังสินค้า (ชิ้น)</th>
        <th className="p-3 border-b border-purple-200 w-[10%]">จัดการ</th>
      </tr>
    </thead>
    <tbody>
      {formData.variations.map((v) => (
        <tr key={v.id} className="bg-white">
          {/* รูปภาพ */}
          <td className="p-4 border-b border-r border-purple-100 align-middle">
            <div className="flex justify-center">
              {v.image ? (
                <div className="relative w-14 h-14 group">
                  <img src={v.image} className="w-full h-full object-cover rounded-md border border-purple-100" />
                  <button onClick={() => handleRemoveImage(v.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-[10px]">✕</button>
                </div>
              ) : (
                <label className="w-12 h-12 border-2 border-dashed border-purple-200 bg-purple-50 rounded-full flex items-center justify-center cursor-pointer text-purple-400 text-xl hover:bg-purple-100 transition-colors">
                  <input type="file" className="hidden" onChange={(e) => handleUploadClick(e, v.id)} accept="image/*" />
                  +
                </label>
              )}
            </div>
          </td>

          {/* ชื่อตัวเลือก */}
          <td className="p-3 border-b border-r border-purple-100">
            <input 
              type="text" 
              value={v.name} 
              onChange={(e) => handleVariationChange(v.id, 'name', e.target.value)} 
              placeholder="ระบุตัวเลือก" 
              className="w-full p-2 border border-gray-300 rounded focus:border-purple-500 outline-none text-sm" 
            />
          </td>

          {/* ราคา */}
          <td className="p-3 border-b border-r border-purple-100">
            <input 
              type="number" 
              value={v.price} 
              onChange={(e) => handleVariationChange(v.id, 'price', e.target.value)} 
              placeholder="0" 
              className="w-full p-2 border border-gray-300 rounded focus:border-purple-500 outline-none text-sm text-center" 
            />
          </td>

          {/* คลัง */}
          <td className="p-3 border-b border-r border-purple-100">
            <input 
              type="number" 
              value={v.stock} 
              onChange={(e) => handleVariationChange(v.id, 'stock', e.target.value)} 
              placeholder="0" 
              className="w-full p-2 border border-gray-300 rounded focus:border-purple-500 outline-none text-sm text-center" 
            />
          </td>

          {/* ปุ่มลบ */}
          <td className="p-3 border-b border-purple-100 text-center">
            <button 
              onClick={() => handleRemoveVariation(v.id)} 
              className="text-red-500 hover:text-red-700 font-bold text-sm"
            >
              ลบ
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
              <button type="button" onClick={handleAddVariation} className="mt-4 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-bold">
                + เพิ่มตัวเลือก
              </button>
            </div>
          )}
        </div>
      </div>

        {/* Buttons */}           
        <div className="mt-8">         
          <button className="w-full px-8 py-3 bg-purple-600 text-white border-2 border-purple-600 rounded-lg font-bold hover:bg-purple-700 transition shadow-sm">
                   +Add Variation         
          </button>               
        </div>

      {/* ปุ่มบันทึกและยกเลิกด้านล่างสุด */}
      <div className="flex justify-end gap-4 mt-8 pb-10">
        <button 
          type="button" 
          onClick={onBack} 
          className="px-8 py-3 bg-white text-purple-600 border-2 border-purple-600 rounded-lg font-bold hover:bg-purple-50 transition shadow-sm"
        >
          ยกเลิก
        </button>
        <button 
          type="button"
          className="px-8 py-3 bg-purple-600 text-white border-2 border-purple-600 rounded-lg font-bold hover:bg-purple-700 transition shadow-sm"
        >
          บันทึกสินค้า
        </button>
      </div>

    </div>
  );
}

export default SellerAddProduct;