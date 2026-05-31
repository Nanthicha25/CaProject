//src/Seller/SellerAddproduct.jsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, getDoc, addDoc, updateDoc, collection, query, where, or, getDocs } from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';

// === ตั้งค่า Cloudinary ===
const CLOUDINARY_CLOUD_NAME = "dlbmwbcjj"; 
const CLOUDINARY_UPLOAD_PRESET = "caprojectaddproduct";

function SellerAddProduct({ user, eventData, editingProductId, onBack }) {

  // ดึง lang มาใช้เพื่อสลับภาษาแบบ Ternary
  const { t, lang } = useLanguage();

  const [categoriesData, setCategoriesData] = useState({});
  const [allTags, setAllTags] = useState([]);
  const [isTagOpen, setIsTagOpen] = useState(false);
  const [tagSearchTerm, setTagSearchTerm] = useState("");
  const [isCatOpen, setIsCatOpen] = useState(false);
  
  const tagDropdownRef = useRef(null);
  const catDropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    images: [],
    hasVariations: false,
    variations: [],
    tags: [],
    preorder: false,
    preorderLink: '',
    isR18: false,
    r18Link: '',
    status: 'pending',
    booth_id: '',
    booth_name: '',
    booth_numbers: [],
    event_date: ''
  });

  const [cat1, setCat1] = useState('');
  const [cat2, setCat2] = useState('');
  const [cat3, setCat3] = useState('');
  const [cat4, setCat4] = useState('');

  // === State สำหรับระบบอัปโหลดรูป ===
  const [uploadingMainIndex, setUploadingMainIndex] = useState(null);
  const [uploadingVarIndex, setUploadingVarIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState({ show: false, type: 'success', message: '' });

  // === State สำหรับ Modal Pre-order & R-18 ===
  const [showPreorderModal, setShowPreorderModal] = useState(false);
  const [tempPreorderLink, setTempPreorderLink] = useState('');
  const [showR18Modal, setShowR18Modal] = useState(false);
  const [tempR18Link, setTempR18Link] = useState('');

  useEffect(() => {
    const fetchCategoriesAndTags = async () => {
      try {
        const [catSnap, tagSnap] = await Promise.all([
          getDoc(doc(db, "categories", "master")), 
          getDoc(doc(db, "tags", "master"))        
        ]);

        if (catSnap.exists()) {
          const catData = catSnap.data();
          setCategoriesData(catData.tree || {}); 
        }

        if (tagSnap.exists()) {
          const tagData = tagSnap.data();
          setAllTags(tagData.list || []);
        }
      } catch (error) {
        console.error("Error fetching categories and tags:", error);
      }
    };
    fetchCategoriesAndTags();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target)) setIsTagOpen(false);
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) setIsCatOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchProductForEdit = async () => {
      if (editingProductId) {
        try {
          const docRef = doc(db, "products", editingProductId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            const loadedImages = [];
            if (data.cover_image) loadedImages.push(data.cover_image);
            if (data.extra_images) {
              loadedImages.push(...data.extra_images.split(',').filter(url => url.trim() !== ''));
            }

            setFormData(prev => ({
              ...prev,
              name: data.name || '',
              description: data.description || '',
              price: data.price || '',
              stock: data.total_stock || '',
              images: loadedImages,
              hasVariations: data.has_variations || false,
              variations: data.variations || [], 
              tags: Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(',') : []),
              preorder: data.preorder || false,
              preorderLink: data.preorderLink || '',
              isR18: data.isR18 || false,
              r18Link: data.r18Link || '',
              status: data.status || 'pending',
              booth_id: data.booth_id || '',
              booth_name: data.booth_name || '',
              // อนุญาตให้ค่าเดิมโหลดขึ้นมาก่อน เดี๋ยว useEffect ด้านล่างจะตรวจจับอัปเดตให้อีกที
              booth_numbers: data.booth_numbers || [],
              event_date: data.event_date || ''
            }));

            const catPath = data.category_path ? data.category_path.split('/') : [];
            setCat1(catPath[0] || '');
            setCat2(catPath[1] || '');
            setCat3(catPath[2] || '');
            setCat4(catPath[3] || '');
          }
        } catch (error) {
          console.error("Error fetching product details:", error);
        }
      }
    };
    fetchProductForEdit();
  }, [editingProductId]);

  // --- [จุดที่แก้ไข] ---
  // ดึงข้อมูล Booth ของผู้ขายเสมอ (ทำงานทั้งตอนเพิ่มใหม่ และตอนแก้ไข เพื่อให้ข้อมูล booth_numbers อัปเดตเสมอ)
  useEffect(() => {
    const fetchMyBoothInfo = async () => {
      if (user?.username) {
        try {
          const q = query(
            collection(db, "booths"),
            or(
              where("main_creator", "==", user.username),
              where("co_creators", "array-contains", user.username)
            )
          );
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const boothData = snapshot.docs[0].data();
            setFormData(prev => ({
              ...prev,
              booth_id: boothData.booth_id || snapshot.docs[0].id || prev.booth_id,
              booth_name: boothData.booth_name || boothData.main_creator || prev.booth_name,
              booth_numbers: (boothData.booth_numbers && boothData.booth_numbers.length > 0) ? boothData.booth_numbers : prev.booth_numbers,
              event_date: boothData.event_date || prev.event_date
            }));
          }
        } catch (error) {
          console.error("Error fetching booth info:", error);
        }
      }
    };
    fetchMyBoothInfo();
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'hasVariations' && checked === true && prev.variations.length === 0) {
        newData.variations = [{ variation_name: '', option_name: '', stock: '0', image: '' }];
      }
      return newData;
    });
  };

  // === ฟังก์ชันจัดการ Modal Pre-order ===
  const handlePreorderToggle = (e) => {
    if (e.target.checked) {
      setTempPreorderLink(formData.preorderLink || '');
      setShowPreorderModal(true);
    } else {
      setFormData(prev => ({ ...prev, preorder: false, preorderLink: '' }));
    }
  };

  const confirmPreorder = () => {
    if (!tempPreorderLink.trim()) {
      alert(lang === 'th' ? "กรุณาใส่ลิงก์ช่องทางพรีออเดอร์" : "Please provide a pre-order link.");
      return;
    }
    setFormData(prev => ({ ...prev, preorder: true, preorderLink: tempPreorderLink }));
    setShowPreorderModal(false);
  };

  // === ฟังก์ชันจัดการ Modal R-18 ===
  const handleR18Toggle = (e) => {
    if (e.target.checked) {
      setTempR18Link(formData.r18Link || '');
      setShowR18Modal(true);
    } else {
      setFormData(prev => ({ ...prev, isR18: false, r18Link: '' }));
    }
  };

  const confirmR18 = () => {
    setFormData(prev => ({ ...prev, isR18: true, r18Link: tempR18Link }));
    setShowR18Modal(false);
  };

  const handleCategorySelect = (value, level) => {
    if (level === 1) { setCat1(value); setCat2(''); setCat3(''); setCat4(''); }
    else if (level === 2) { setCat2(value); setCat3(''); setCat4(''); }
    else if (level === 3) { setCat3(value); setCat4(''); }
    else if (level === 4) { setCat4(value); }
  };

  const getCategoryLabel = () => {
    const parts = [cat1, cat2, cat3, cat4].filter(part => part && part !== "");
    return parts.length > 0 ? parts.join(' > ') : (lang === 'th' ? 'เลือกหมวดหมู่' : 'Select Category');
  };

  const renderStepMenu = () => {
    if (!categoriesData || Object.keys(categoriesData).length === 0) return null;
    
    const getLevelData = (level) => {
      if (level === 1) return categoriesData;
      if (level === 2 && cat1) return categoriesData[cat1];
      if (level === 3 && cat2) return categoriesData[cat1]?.[cat2];
      if (level === 4 && cat3) return categoriesData[cat1]?.[cat2]?.[cat3];
      return null;
    };

    const currentCats = [cat1, cat2, cat3, cat4];
    const menus = [];

    for (let i = 1; i <= 4; i++) {
      const data = getLevelData(i);
      if (!data) break;
      const isArray = Array.isArray(data);
      const keys = isArray ? data : Object.keys(data);

      if (keys.length === 0) break;

      menus.push(
        <div key={i} className="min-w-[160px] md:min-w-[180px] border-r border-gray-100 last:border-r-0 flex flex-col h-[280px] overflow-y-auto bg-white custom-purple-scrollbar">
          {keys.map((key) => {
            const hasNext = !isArray && typeof data[key] === 'object' && data[key] !== null;
            const isSelected = currentCats[i - 1] === key;
            return (
              <button
                key={key}
                type="button"
                className={`w-full text-left px-4 py-3 text-[13px] flex justify-between items-center transition-all ${isSelected ? 'bg-purple-50 text-purple-700 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCategorySelect(key, i);
                  if (!hasNext) setIsCatOpen(false);
                }}
              >
                <span className="truncate">{key}</span>
                {hasNext && <span className="text-[10px] text-gray-400">❯</span>}
              </button>
            );
          })}
        </div>
      );
      if (!currentCats[i-1]) break;
    }
    return <div className="flex bg-white rounded-xl border border-purple-100 shadow-xl overflow-hidden">{menus}</div>;
  };

  const handleTagToggle = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }));
  };

  const handleAddVariation = () => {
    setFormData(prev => ({
      ...prev,
      variations: [...prev.variations, { variation_name: '', option_name: '', stock: '0', image: '' }]
    }));
  };

  const handleVariationChange = (index, field, value) => {
    const newVariations = [...formData.variations];
    newVariations[index] = { ...newVariations[index], [field]: value };
    setFormData(prev => ({ ...prev, variations: newVariations }));
  };

  const handleRemoveVariation = (index) => {
    const newVariations = formData.variations.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, variations: newVariations }));
  };

  const uploadToCloudinary = async (file) => {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      return json.secure_url;
    } catch (error) {
      console.error("Upload error:", error);
      alert(lang === 'th' ? "อัปโหลดล้มเหลว" : "Upload failed");
      return null;
    }
  };

  const handleMainImageUpload = async (index, file) => {
    if (!file) return;
    setUploadingMainIndex(index);
    const imageUrl = await uploadToCloudinary(file);
    if (imageUrl) {
      const newImages = [...formData.images];
      newImages[index] = imageUrl;
      setFormData(prev => ({ ...prev, images: newImages }));
    }
    setUploadingMainIndex(null);
  };

  const handleVariationImageUpload = async (index, file) => {
    if (!file) return;
    setUploadingVarIndex(index);
    const imageUrl = await uploadToCloudinary(file);
    if (imageUrl) {
      handleVariationChange(index, 'image', imageUrl);
    }
    setUploadingVarIndex(null);
  };

  const handleCloseModal = () => {
    const isSuccess = showModal.type === 'success';
    setShowModal({ ...showModal, show: false });
    if (isSuccess) onBack(); 
  };

  const handleSave = async () => {
    // บังคับกรอกชื่อ ราคา และหมวดหมู่
    if (!formData.name || !formData.price || !cat1) {
      setShowModal({ 
        show: true, 
        type: 'error', 
        message: lang === 'th' ? "กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน" : "Please fill in all required fields (*)" 
      });
      return;
    }

    setIsSaving(true);
    try {
      const cleanImages = formData.images.filter(url => url && url.trim() !== "");
      const cover_image = cleanImages[0] || ""; 
      const extra_images = cleanImages.slice(1).join(","); 

      const categoryParts = [cat1, cat2, cat3, cat4].filter(c => c !== "");
      const category_path = categoryParts.join("/");
      const category_main = categoryParts[0] || "";
      const category_levels = categoryParts.join(",");

      let totalStock = 0;
      if (formData.hasVariations) {
        totalStock = formData.variations.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
      } else {
        totalStock = parseInt(formData.stock) || 0;
      }

      const cleanVariations = formData.hasVariations ? formData.variations.map(v => ({
        ...v,
        stock: parseInt(v.stock) || 0
      })) : [];

      const productData = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price) || 0,
        total_stock: totalStock,
        cover_image: cover_image,
        extra_images: extra_images,
        has_variations: formData.hasVariations,
        variations: cleanVariations,
        tags: formData.tags.join(','),
        preorder: formData.preorder,
        preorderLink: formData.preorderLink,
        isR18: formData.isR18,
        r18Link: formData.r18Link,
        status: 'pending', // บังคับให้เป็น pending เพื่อรอแอดมินตรวจเสมอ
        category_main: category_main,
        category_path: category_path,
        category_levels: category_levels,
        // --- [จุดที่แก้ไข] ---
        // บันทึก booth_numbers อย่างถูกต้องเป็น Array
        booth_id: formData.booth_id || "", 
        booth_name: formData.booth_name || "",
        booth_numbers: Array.isArray(formData.booth_numbers) ? formData.booth_numbers : [],
        creator: user?.username || "",
        event_date: formData.event_date || eventData?.date || eventData?.event_date || "", 
      };

      if (editingProductId) {
        await updateDoc(doc(db, "products", editingProductId), productData);
      } else {
        const docRef = await addDoc(collection(db, "products"), productData);
        if (formData.hasVariations) {
          const varsWithId = cleanVariations.map(v => ({ ...v, product_id: docRef.id }));
          await updateDoc(docRef, { product_id: docRef.id, variations: varsWithId });
        } else {
          await updateDoc(docRef, { product_id: docRef.id });
        }
      }

      setShowModal({ 
        show: true, 
        type: 'success', 
        message: lang === 'th' 
          ? "ระบบได้รับข้อมูลสินค้าแล้ว! แอดมินจะตรวจสอบรายละเอียดสินค้าก่อนอนุมัติ หากเกิน 24 ชม. สามารถติดต่อแอดมินได้ผ่านหน้า Contact Us ค่ะ" 
          : "Product received! Admins will review the details before approval. If it takes more than 24 hours, please reach out via the Contact Us page." 
      });

    } catch (error) {
      console.error("Error saving product:", error);
      setShowModal({ 
        show: true, 
        type: 'error', 
        message: lang === 'th' ? "เกิดข้อผิดพลาด" : "An error occurred" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
      
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-purple-600 hover:bg-purple-100 p-2 rounded-full transition font-bold text-lg flex items-center">
          ← {lang === 'th' ? 'กลับ' : 'Back'}
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          {editingProductId ? (lang === 'th' ? 'แก้ไขสินค้า' : 'Edit Product') : (lang === 'th' ? 'เพิ่มสินค้าใหม่' : 'Add Product')}
        </h1>
      </div>

      {/* ---------------- Section 1: ข้อมูลทั่วไป ---------------- */}
      <div className="bg-white border border-purple-100 rounded-xl mb-6 shadow-sm">
        <div className="bg-[#fcf8ff] text-purple-700 px-6 py-4 font-bold text-lg border-b border-purple-100 rounded-t-xl">
          {lang === 'th' ? 'ข้อมูลทั่วไป' : 'General Info'}
        </div>
        <div className="p-6 flex flex-col gap-6">
          
          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-800 text-sm">{lang === 'th' ? 'ชื่อสินค้า' : 'Product Name'} <span className="text-red-500">*</span></label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500" />
          </div>
          
          {/* แถวที่ 2: Price, Pre-order, R-18 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-bold text-gray-800 text-sm">{lang === 'th' ? 'ราคา' : 'Price'} <span className="text-red-500">*</span></label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="0" className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500" />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-orange-600 bg-orange-50 px-4 py-3 rounded-lg border border-orange-200 transition hover:bg-orange-100 h-[46px]">
                <input 
                  type="checkbox"
                  checked={formData.preorder}
                  onChange={handlePreorderToggle}
                  className="w-5 h-5 cursor-pointer appearance-none rounded border-2 border-orange-600 checked:bg-orange-600 checked:border-orange-600 relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px] after:top-[1px] after:w-[6px] after:h-[11px] after:border-white after:border-b-2 after:border-r-2 after:rotate-45" 
                />
                {lang === 'th' ? 'พรีออเดอร์' : 'Pre-order'}
              </label>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200 transition hover:bg-red-100 h-[46px]">
                <input 
                  type="checkbox"
                  checked={formData.isR18}
                  onChange={handleR18Toggle}
                  className="w-5 h-5 cursor-pointer appearance-none rounded border-2 border-red-600 checked:bg-red-600 checked:border-red-600 relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px] after:top-[1px] after:w-[6px] after:h-[11px] after:border-white after:border-b-2 after:border-r-2 after:rotate-45" 
                />
                R-18
              </label>
            </div>
          </div>

          {/* แถวที่ 3: Category และ Tags */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-bold text-gray-800 text-sm">{lang === 'th' ? 'หมวดหมู่' : 'Category'} <span className="text-red-500">*</span></label>
              <div className="relative" ref={catDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsCatOpen(!isCatOpen)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm flex justify-between items-center bg-white hover:border-gray-400 transition-all focus:border-purple-500 min-h-[46px]"
                >
                  <span className={cat1 ? "text-gray-800" : "text-gray-500"}>{getCategoryLabel()}</span>
                  <span className={`transition-transform text-gray-400 ${isCatOpen ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {isCatOpen && <div className="absolute z-30 mt-1 left-0">{renderStepMenu()}</div>}
              </div>
            </div>

            <div className="flex flex-col gap-2 relative" ref={tagDropdownRef}>
              <label className="font-bold text-gray-800 text-sm">{lang === 'th' ? 'แท็ก' : 'Tags'}</label>
              <div 
                className="w-full min-h-[46px] p-2 border border-gray-300 rounded-lg bg-white flex flex-wrap gap-2 items-center cursor-pointer focus-within:border-purple-500" 
                onClick={() => setIsTagOpen(!isTagOpen)}
              >
                {formData.tags.length === 0 && <span className="text-gray-400 text-sm ml-2">{lang === 'th' ? 'ค้นหาแท็ก...' : 'Search Tags...'}</span>}
                {formData.tags.map(tag => (
                  <span key={tag} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-sm flex items-center gap-1">
                    {tag} <button type="button" onClick={(e) => { e.stopPropagation(); handleTagToggle(tag); }} className="hover:text-purple-900 font-bold">×</button>
                  </span>
                ))}
              </div>
              
              {isTagOpen && (
                <div className="absolute z-30 w-full top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                  <div className="p-2 bg-gray-50 border-b">
                    <input 
                      type="text" placeholder={lang === 'th' ? 'ค้นหา Tags...' : 'Search Tags...'} 
                      value={tagSearchTerm} onChange={(e) => setTagSearchTerm(e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 rounded outline-none focus:border-purple-500" 
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {allTags.filter(tag => tag.toLowerCase().includes(tagSearchTerm.toLowerCase())).map(tag => (
                      <div key={tag} onClick={() => handleTagToggle(tag)} className="flex items-center gap-3 p-3 hover:bg-purple-50 cursor-pointer border-b border-gray-50 last:border-0">
                        <input type="checkbox" checked={formData.tags.includes(tag)} readOnly className="accent-purple-600 w-4 h-4 cursor-pointer" />
                        <span className="text-sm text-gray-700">{tag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <label className="font-bold text-gray-800 text-sm">{lang === 'th' ? 'รายละเอียด' : 'Description'}</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows="4" placeholder={lang === 'th' ? 'รายละเอียดสินค้า...' : 'Product description...'} className="w-full p-4 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 resize-y"></textarea>
          </div>

        </div>
      </div>

      {/* ---------------- Section 2: รูปภาพสินค้า ---------------- */}
      <div className="bg-white border border-purple-200 rounded-xl mb-6 shadow-sm overflow-hidden">
        <div className="bg-purple-50 text-purple-700 px-5 py-4 font-bold text-lg border-b border-purple-200">
          {lang === 'th' ? 'รูปภาพสินค้า' : 'Product Images'} <span className="text-sm font-normal text-gray-500 ml-2">{lang === 'th' ? '(สูงสุด 5 รูป)' : '(Max 5 images)'}</span>
        </div>
        <div className="p-5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, idx) => (
            <label key={idx} className="relative aspect-square border-2 border-dashed border-purple-300 bg-purple-50 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-purple-100 transition text-purple-500 text-sm overflow-hidden">
              {uploadingMainIndex === idx ? (
                <span className="text-xs animate-pulse">{lang === 'th' ? 'กำลังโหลด...' : 'Uploading...'}</span>
              ) : formData.images[idx] ? (
                <img src={formData.images[idx]} alt={`img-${idx}`} className="w-full h-full object-cover" />
              ) : (
                <>
                  <span className="text-2xl mb-1">+</span>
                  <span>{idx === 0 ? (lang === 'th' ? 'หน้าปก' : 'Cover') : ''}</span>
                </>
              )}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => handleMainImageUpload(idx, e.target.files[0])} 
              />
            </label>
          ))}
        </div>
      </div>

      {/* ---------------- Section 3: ข้อมูลการขาย ---------------- */}
      <div className="bg-white border border-purple-200 rounded-xl mb-6 shadow-sm overflow-hidden">
        <div className="bg-purple-50 text-purple-700 px-5 py-4 font-bold text-lg border-b border-purple-200 flex justify-between items-center">
          <span>{lang === 'th' ? 'ข้อมูลการขาย' : 'Sales Info'}</span>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
            <input type="checkbox" name="hasVariations" checked={formData.hasVariations} onChange={handleChange} className="w-4 h-4 accent-purple-600" />
            {lang === 'th' ? 'มีตัวเลือกสินค้า' : 'Has Variations'}
          </label>
        </div>

        <div className="p-5">
          {!formData.hasVariations && (
            <div className="flex flex-col md:flex-row gap-5 mb-6">
              <div className="flex flex-col gap-2 w-full md:w-1/2">
                <label className="font-semibold text-gray-700">{lang === 'th' ? 'คลังสินค้า' : 'Total Stock'} <span className="text-red-500">*</span></label>
                <input type="number" name="stock" value={formData.stock} onChange={handleChange} placeholder="0" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500" />
              </div>
            </div>
          )}

          {formData.hasVariations && (
            <div>
              <div className="md:hidden flex flex-col gap-4">
                {formData.variations.map((v, index) => (
                  <div key={`mob-var-${index}`} className="border border-purple-200 rounded-xl p-4 bg-purple-50/30 relative">
                    <button 
                      onClick={() => handleRemoveVariation(index)} 
                      className="absolute top-4 right-4 text-red-500 hover:text-red-700 text-sm font-bold bg-red-50 px-2 py-1 rounded"
                    >
                      {lang === 'th' ? 'ลบ' : 'Remove'}
                    </button>
                    <div className="flex flex-col gap-2 mb-4 w-full">
                      <label className="font-semibold text-gray-700 text-sm">{lang === 'th' ? 'รูปภาพ' : 'Image'}</label>
                      <label className="w-20 h-20 border-2 border-dashed border-purple-300 bg-white rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-purple-100 transition overflow-hidden relative group">
                        {uploadingVarIndex === index ? (
                           <span className="text-purple-500 text-[10px] animate-pulse">{lang === 'th' ? 'กำลังโหลด' : 'Loading'}</span>
                        ) : v.image ? (
                          <img src={v.image} alt={`opt-${index}`} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-purple-500 font-bold text-2xl leading-none">+</span>
                        )}
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleVariationImageUpload(index, e.target.files[0])}
                        />
                      </label>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-gray-700 text-sm">{lang === 'th' ? 'ชื่อตัวเลือกหลัก' : 'Variation Name'}</label>
                        <input type="text" value={v.variation_name || ''} onChange={(e) => handleVariationChange(index, 'variation_name', e.target.value)} placeholder={lang === 'th' ? 'เช่น สี' : 'e.g. Color'} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-purple-500 text-sm bg-white" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-gray-700 text-sm">{lang === 'th' ? 'ชื่อตัวเลือกย่อย' : 'Option'}</label>
                        <input type="text" value={v.option_name || ''} onChange={(e) => handleVariationChange(index, 'option_name', e.target.value)} placeholder={lang === 'th' ? 'เช่น แดง' : 'e.g. Red'} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-purple-500 text-sm bg-white" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-gray-700 text-sm">{lang === 'th' ? 'คลัง' : 'Stock'}</label>
                        <input type="number" value={v.stock || ''} onChange={(e) => handleVariationChange(index, 'stock', e.target.value)} placeholder="0" className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-purple-500 text-sm bg-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto border border-purple-200 rounded-lg">
                <table className="w-full text-center border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-purple-50 text-purple-700 border-b border-purple-200 text-sm">
                      <th className="p-3 border-r border-purple-200 w-20">{lang === 'th' ? 'รูป' : 'Img'}</th>
                      <th className="p-3 border-r border-purple-200 w-1/4">{lang === 'th' ? 'ชื่อตัวเลือกหลัก' : 'Variation Name'}</th>
                      <th className="p-3 border-r border-purple-200 w-1/4">{lang === 'th' ? 'ชื่อตัวเลือกย่อย' : 'Option'}</th>
                      <th className="p-3 border-r border-purple-200 w-1/4">{lang === 'th' ? 'คลัง' : 'Stock'}</th>
                      <th className="p-3 w-16">X</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.variations.map((v, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="p-3 border-r border-gray-200 align-middle">
                          <div className="flex justify-center">
                            <label className="w-12 h-12 border-2 border-dashed border-purple-300 bg-purple-50 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-purple-100 transition overflow-hidden relative group">
                              {uploadingVarIndex === index ? (
                                <span className="text-purple-500 text-[10px] animate-pulse">{lang === 'th' ? 'กำลังโหลด' : 'Loading'}</span>
                              ) : v.image ? (
                                <img src={v.image} alt={`opt-${index}`} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-purple-500 font-bold text-lg leading-none">+</span>
                              )}
                              <input 
                                type="file" 
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleVariationImageUpload(index, e.target.files[0])}
                              />
                            </label>
                          </div>
                        </td>
                        <td className="p-3 border-r border-gray-200">
                          <input type="text" value={v.variation_name || ''} onChange={(e) => handleVariationChange(index, 'variation_name', e.target.value)} className="w-full p-2 border border-gray-300 rounded outline-none focus:border-purple-500 text-sm" />
                        </td>
                        <td className="p-3 border-r border-gray-200">
                          <input type="text" value={v.option_name || ''} onChange={(e) => handleVariationChange(index, 'option_name', e.target.value)} className="w-full p-2 border border-gray-300 rounded outline-none focus:border-purple-500 text-sm" />
                        </td>
                        <td className="p-3 border-r border-gray-200">
                          <input type="number" value={v.stock || ''} onChange={(e) => handleVariationChange(index, 'stock', e.target.value)} placeholder="0" className="w-full p-2 border border-gray-300 rounded outline-none focus:border-purple-500 text-sm text-center" />
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => handleRemoveVariation(index)} className="text-red-500 hover:text-red-700 text-lg font-bold">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={handleAddVariation} className="mt-4 bg-purple-100 text-purple-700 border border-purple-300 px-4 py-2 rounded-lg font-bold hover:bg-purple-200 transition text-sm w-full md:w-auto">
                + {lang === 'th' ? 'เพิ่มตัวเลือก' : 'Add Variation'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-4 mt-8">
        <button onClick={onBack} disabled={isSaving} className="px-8 py-3 bg-white text-purple-600 border-2 border-purple-600 rounded-lg font-bold hover:bg-purple-50 transition shadow-sm disabled:opacity-50">
          {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
        </button>
        <button onClick={handleSave} disabled={isSaving} className="px-8 py-3 bg-purple-600 text-white border-2 border-purple-600 rounded-lg font-bold hover:bg-purple-700 transition shadow-sm disabled:opacity-50 flex items-center gap-2">
          {isSaving ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (lang === 'th' ? 'บันทึก' : 'Save')}
        </button>
      </div>

      {/* === Modal ของ Pre-order === */}
      {showPreorderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-800 mb-2">{lang === 'th' ? 'ยืนยันสถานะ Pre-order' : 'Confirm Pre-order Status'}</h3>
            <p className="text-gray-600 mb-4 text-sm">{lang === 'th' ? 'สินค้านี้มีพรีออเดอร์ที่ช่องทางของคุณใช่มั้ย?' : 'Is this product available for pre-order on your platform?'}</p>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">{lang === 'th' ? 'กรุณาใส่ลิงก์ช่องทางพรีออเดอร์' : 'Please provide the pre-order link'} <span className="text-red-500">*</span></label>
              <input 
                type="url" 
                value={tempPreorderLink} 
                onChange={(e) => setTempPreorderLink(e.target.value)} 
                placeholder="https://..."
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowPreorderModal(false)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition">{lang === 'th' ? 'ยกเลิก' : 'Cancel'}</button>
              <button onClick={confirmPreorder} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold transition">{lang === 'th' ? 'ยืนยัน' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {/* === Modal ของ R-18 === */}
      {showR18Modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-red-600 mb-2">{lang === 'th' ? 'ยืนยันเนื้อหา R-18' : 'Confirm R-18 Content'}</h3>
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
              {lang === 'th' ? 'สินค้านี้มีการตรวจบัตรประชาชนที่ต้องมีอายุ 18 ปีขึ้นไปใช่มั้ย?' : 'Does this product require age verification (18+)?'} <br/>
              <span className="text-red-500 font-bold">{lang === 'th' ? 'หมายเหตุ:' : 'Note:'}</span> {lang === 'th' ? 'สินค้านี้จะต้องอัปโหลดรูปที่ปิดความล่อแหลมหรือความรุนแรงให้เหมาะสม เนื่องจากผู้ใช้งานเว็บไซต์มีหลายช่วงวัย' : 'Please ensure uploaded images are properly censored or appropriate, as our website is accessed by various age groups.'}
            </p>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">{lang === 'th' ? 'ลิงก์สำหรับดูตัวอย่างเนื้อหา (ถ้ามี)' : 'Content preview link (optional)'}</label>
              <input 
                type="url" 
                value={tempR18Link} 
                onChange={(e) => setTempR18Link(e.target.value)} 
                placeholder="https://..."
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowR18Modal(false)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition">{lang === 'th' ? 'ยกเลิก' : 'Cancel'}</button>
              <button onClick={confirmR18} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition">{lang === 'th' ? 'ยอมรับเงื่อนไข' : 'Accept Terms'}</button>
            </div>
          </div>
        </div>
      )}

      {/* === Success/Error Save Modal === */}
      {showModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${showModal.type === 'success' ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
              {showModal.type === 'success' ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{showModal.type === 'success' ? (lang === 'th' ? 'สำเร็จ' : 'Success') : (lang === 'th' ? 'ผิดพลาด' : 'Error')}</h3>
            <p className="text-gray-500 mb-6 text-sm">{showModal.message}</p>
            <button 
              onClick={handleCloseModal}
              className={`w-full py-3 rounded-xl font-bold text-white transition shadow-lg ${showModal.type === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              {lang === 'th' ? 'ตกลง' : 'OK'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SellerAddProduct;