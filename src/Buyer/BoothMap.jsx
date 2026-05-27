// src/Buyer/BoothMap.jsx
import { useState, useEffect, useRef } from 'react';
import StorePage from './StorePage';
import { db } from '../firebase'; 
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';

export default function BoothMap({ onRequireAuth, user }) {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState("30/5/2026");
  const [activeBooth, setActiveBooth] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [boothsLookup, setBoothsLookup] = useState({});
  const [userInteractionsLookup, setUserInteractionsLookup] = useState({});
  const cachedBooths = useRef({});
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  // [แก้ไขใหม่] สร้างฟังก์ชันเพื่อคำนวณ Scale และ Position
  const updateScaleAndPosition = () => {
    if (containerRef.current) {
      const container = containerRef.current;
      const mapWidth = 1550;
      const mapHeight = 1450;
      
      const scaleX = container.clientWidth / mapWidth;
      const scaleY = container.clientHeight / mapHeight;
      
      // ใช้ Math.max เพื่อบังคับให้แผนที่ขยายเต็มพื้นที่ (Cover)
      const initialScale = Math.max(scaleX, scaleY);
      
      setScale(initialScale);
      
      // เปลี่ยนมาใช้พิกัด 0, 0 เพื่อให้จุดเริ่มต้นอยู่ที่ "มุมซ้ายบน" เสมอ (เห็น A ตัวแรก)
      setPosition({ 
        x: 0, 
        y: 0 
      });
    }
  };

  // [แก้ไขใหม่] เรียกใช้ฟังก์ชันตอนโหลดเสร็จ และตอนที่หน้าจอเปลี่ยนขนาด
  useEffect(() => {
    if (!loading) {
      // คำนวณครั้งแรกเมื่อโหลดเสร็จ
      updateScaleAndPosition();
      
      // ดักจับ Event เมื่อมีการ Resize หน้าจอ (เช่น หมุน iPad)
      window.addEventListener('resize', updateScaleAndPosition);
      
      // Cleanup listener เมื่อ Component ถูกทำลาย
      return () => window.removeEventListener('resize', updateScaleAndPosition);
    }
  }, [loading]);

  // 1. ดึงข้อมูลบูธทั้งหมด
  useEffect(() => {
    const fetchBooths = async () => {
      if (cachedBooths.current[selectedDate]) {
        setBoothsLookup(cachedBooths.current[selectedDate]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const q = query(
          collection(db, "booths"),
          where("event_date", "==", selectedDate)
        );
        const querySnapshot = await getDocs(q);
        
        const lookup = {};
        let index = 0; 

        querySnapshot.docs.forEach(doc => {
          const data = { id: doc.id, originalIndex: index++, ...doc.data() };
          if (Array.isArray(data.booth_numbers)) {
            data.booth_numbers.forEach(num => {
              lookup[num] = data; 
            });
          }
        });

        cachedBooths.current[selectedDate] = lookup; 
        setBoothsLookup(lookup);
      } catch (error) {
        console.error("Error fetching booths: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBooths();
  }, [selectedDate]);

  // 2. ดึงข้อมูลตะกร้าสินค้าและประวัติการซื้อ (อัปเดตระบบดึง Stock จริง)
  useEffect(() => {
    const fetchUserInteractions = async () => {
      const currentUserId = user?.id || user?.uid;

      if (currentUserId) { 
        try {
          const interactionsMap = {}; 
          const boothCartStats = {};

          // --- 1. ดึงข้อมูลตะกร้า (carts) ก่อน ---
          const cartsRef = collection(db, "users", currentUserId, "carts");
          const cartsSnap = await getDocs(cartsRef);
          
          const cartItems = [];
          const productIds = new Set(); // เก็บ ID สินค้าเพื่อไปดึง Stock

          cartsSnap.docs.forEach(doc => {
            const data = doc.data();
            cartItems.push(data);
            if (data.product_id) productIds.add(data.product_id);
          });

          // --- 2. ดึงข้อมูล Products เพื่อเช็ก Stock ล่าสุดจริงๆ ---
          const productsStock = {};
          if (productIds.size > 0) {
            const idsArray = Array.from(productIds);
            const chunks = [];
            // Firestore ค้นหาด้วย 'in' ได้ทีละ 30 รายการ เลยต้องแบ่ง chunk
            for (let i = 0; i < idsArray.length; i += 30) {
              chunks.push(idsArray.slice(i, i + 30));
            }
            
            for (const chunk of chunks) {
              const pQuery = query(collection(db, "products"), where("product_id", "in", chunk));
              const pSnap = await getDocs(pQuery);
              pSnap.forEach(pDoc => {
                productsStock[pDoc.data().product_id || pDoc.id] = pDoc.data();
              });
            }
          }

          // --- 3. ประมวลผลจำนวนของในตะกร้า + เช็ก Stock ---
          cartItems.forEach(data => {
            if (data.booth_id) {
              const bId = data.booth_id;
              if (!interactionsMap[bId]) interactionsMap[bId] = new Set();
              if (data.type) interactionsMap[bId].add(data.type.toLowerCase());
              
              // 🌟 1. เพิ่ม wishlist_soldout: 0 เข้าไปแล้ว จะได้บวกเลขได้ไม่ Error
              if (!boothCartStats[bId]) boothCartStats[bId] = { total: 0, soldout: 0, wishlist_soldout: 0 };
              boothCartStats[bId].total += 1;

              // ตรวจสอบ Stock จริงๆ เหมือนในหน้า Cart
              const pData = productsStock[data.product_id];
              let currentStock = 0;

              // เช็กสต็อกที่แท้จริง
              if (pData) {
                if (pData.has_variations && pData.variations) {
                  const optName = data.option_name || data.variation_name;
                  const opt = pData.variations.find(v => v.option_name === optName || v.variation_name === optName);
                  if (opt) currentStock = opt.stock !== undefined ? opt.stock : 0;
                } else {
                  currentStock = pData.total_stock !== undefined ? pData.total_stock : 0;
                }
              }

              // 🌟 2. เอาการเช็กของหมดมารวมไว้ตรงนี้ที่เดียว (หลังจากรู้ค่า currentStock ที่แท้จริงแล้ว)
              if (currentStock <= 0) {
                boothCartStats[bId].soldout += 1;
                
                // ถ้าของที่หมดเป็น Wishlist ให้จดไว้แยกต่างหาก เพื่อไปทำไอคอน 🔥
                if (data.type && data.type.toLowerCase() === 'wishlist') {
                  boothCartStats[bId].wishlist_soldout += 1;
                }
              }
            }
          });

          // สรุปผลว่าบูธนี้ หมดเกลี้ยง หรือ หมดบางชิ้น
          Object.keys(boothCartStats).forEach(bId => {
            const stats = boothCartStats[bId];
            
            // เช็กหมด 100% (นับรวมทั้งจองและ wishlist) ถ้าหมดเกลี้ยงจะได้เป็นสีเทา
            if (stats.soldout > 0 && stats.soldout === stats.total) {
              interactionsMap[bId].add('soldout_all'); 
            }
            
            // 🌟 เช็กการขึ้นไอคอน 🔥 (เฉพาะเมื่อของ Wishlist หมดเท่านั้น)
            if (stats.wishlist_soldout > 0) {
              interactionsMap[bId].add('wishlist_soldout_some'); 
            }
          });

          // --- 4. เช็กประวัติการซื้อ (allbuys) ---
          const allbuysRef = collection(db, "allbuys");
          const allbuysQuery = query(allbuysRef, where("user_id", "==", currentUserId));
          const allbuysSnap = await getDocs(allbuysQuery);
          
          allbuysSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.booth_id) {
              const bId = data.booth_id;
              if (!interactionsMap[bId]) interactionsMap[bId] = new Set();
              
              interactionsMap[bId].add("purchased");
              
              if (!boothCartStats[bId] || boothCartStats[bId].total === 0) {
                interactionsMap[bId].add("purchased_all");
              }
            }
          });

          setUserInteractionsLookup(interactionsMap);
        } catch (error) {
          console.error("Error fetching user interactions: ", error);
        }
      } else {
        setUserInteractionsLookup({}); 
      }
    };
    fetchUserInteractions();
  }, [user]);

  // --- ระบบ Zoom & Pan ---
  const clampPosition = (x, y, scale) => {
    const container = containerRef.current;
    if (!container) return { x, y };
    
    const mapWidth = 1550;
    const mapHeight = 1450;
    const scaledWidth = mapWidth * scale;
    const scaledHeight = mapHeight * scale;

    // ระบบคำนวณขอบเขต: ถ้าจอใหญ่กว่าแผนที่ให้ล็อคตรงกลาง ถ้าจอเล็กกว่าให้เลื่อนได้สุดขอบ
    const minX = container.clientWidth > scaledWidth ? (container.clientWidth - scaledWidth) / 2 : container.clientWidth - scaledWidth;
    const maxX = container.clientWidth > scaledWidth ? (container.clientWidth - scaledWidth) / 2 : 0;

    const minY = container.clientHeight > scaledHeight ? (container.clientHeight - scaledHeight) / 2 : container.clientHeight - scaledHeight;
    const maxY = container.clientHeight > scaledHeight ? (container.clientHeight - scaledHeight) / 2 : 0;

    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y))
    };
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const wheelHandler = (e) => {
      e.preventDefault();
      const zoomFactor = 0.08;
      let newScale = scale - Math.sign(e.deltaY) * zoomFactor;
      const minScale = Math.min(container.clientWidth / 1550, container.clientHeight / 1450);
      newScale = Math.max(newScale, minScale);
      newScale = Math.min(newScale, 3);
      const clamped = clampPosition(position.x, position.y, newScale);
      setScale(newScale);
      setPosition(clamped);
    };
    container.addEventListener('wheel', wheelHandler, { passive: false });
    return () => container.removeEventListener('wheel', wheelHandler);
  }, [scale, position]);

  const handleMouseDown = (e) => {
    isDragging.current = true;
    start.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };
  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const clamped = clampPosition(e.clientX - start.current.x, e.clientY - start.current.y, scale);
    setPosition(clamped);
  };
  const handleMouseUp = () => { isDragging.current = false; };

  // 3. ฟังก์ชันคำนวณสีและไอคอนบูธ (อัปเดต Logic ใหม่)
  // 3. ฟังก์ชันคำนวณสีและไอคอนบูธ
  const getBoothStyle = (map_booth_id) => {
    const data = boothsLookup[map_booth_id];
    if (!data) return { data: null, classes: 'bg-white text-gray-300 border-gray-200', icons: [] };

    const userStatuses = userInteractionsLookup[data.booth_id] || new Set();

    const hasReserved = userStatuses.has('reserved');
    const hasWishlist = userStatuses.has('wishlist');
    const hasPurchasedSome = userStatuses.has('purchased');
    
    const isPurchasedAll = userStatuses.has('purchased_all'); 
    const isSoldoutAll = userStatuses.has('soldout_all') || data.statuses?.includes('soldout_all');

    const hasWishlistSoldoutSome = userStatuses.has('wishlist_soldout_some');

    // กฎข้อที่ 1: เช็กสถานะ 100% ก่อน (ซื้อครบ 100% หรือ ของหมด 100%)
    // บูธที่ Wishlists หรือจอง ซื้อครบ 100% = bg และ text สีเขียว ไม่มีไอคอน
    if (isPurchasedAll) {
      return { data, classes: 'bg-green-400 font-black border-black text-green-900', icons: [] };
    }

    // บูธที่ Wishlist หมด 100% (และไม่ได้มีของจองไว้) = bg และ text สีเทา ไม่มีไอคอน
    if (isSoldoutAll && !hasReserved) {
      return { data, classes: 'bg-gray-300 font-black border-black text-gray-500', icons: [] };
    }

    // กฎข้อที่ 2: จัดการเรื่องไอคอน (❤️, 🔥, 👜)
    let icons = [];
    
    // ถ้ามี Wishlist ให้เช็กว่ามีของบางชิ้นหมดไหม ถ้าหมดเปลี่ยนเป็น 🔥 ถ้าไม่หมดเป็น ❤️
    if (hasWishlist) {
      icons.push(hasWishlistSoldoutSome ? '🔥' : '❤️');
    }
    
    // ถ้ามีจองไปรับของ ให้เพิ่ม 👜 ต่อท้าย
    if (hasReserved) {
      icons.push('👜');
    }

    // กฎข้อที่ 3: จัดการสี Background (bg)
    let bgColor = 'bg-white hover:bg-gray-100'; // สีเริ่มต้น
    
    if (hasReserved) {
      // บูธที่มีจอง (ไม่ว่าจะมี Wishlist ด้วยหรือไม่) ให้ใช้ bg สีเหลือง
      bgColor = 'bg-yellow-300 hover:bg-yellow-400';
    } else if (hasWishlist) {
      // บูธที่มีแค่ Wishlist ให้ใช้ bg สีฟ้า
      bgColor = 'bg-blue-300 hover:bg-blue-400';
    }

    // กฎข้อที่ 4: จัดการสีข้อความ (text)
    let textColor = 'text-black';
    
    if (hasPurchasedSome) {
      // ถ้าซื้อบางอย่างไปแล้ว ให้ text เป็นสีเขียว
      textColor = 'text-green-700';
    } else {
      // สีเริ่มต้น (สลับดำ-ชมพูตาม Index เดิมของคุณ)
      textColor = data.originalIndex % 2 === 0 ? 'text-pink-600' : 'text-black';
    }

    return { data, classes: `${bgColor} font-black shadow-sm border-black ${textColor}`, icons };
  };

  const handleBoothClick = (booth_id) => {
    const { data } = getBoothStyle(booth_id);
    if (data) setActiveBooth(data);
    else alert(`${t('emptyBooth')} ${booth_id} ${t('emptyBoothAlt')}`);
  };

  // --- ส่วน Render ---
  const renderRowHorizontal = (letter, start, end) => {
    let booths = [];
    for (let i = start; i <= end; i++) {
      const numStr = i.toString().padStart(2, '0');
      const booth_id = `${letter}${numStr}`;
      const { classes, icons } = getBoothStyle(booth_id);
      booths.push(
        <button key={booth_id} onClick={() => handleBoothClick(booth_id)} className={`w-8 h-8 text-[10px] border rounded flex flex-col items-center justify-center transition-all shrink-0 ${classes}`}>
          {icons.length > 0 && (
            <div className="flex gap-[1px] mb-[1px]">
              {icons.map((ic, idx) => <span key={idx} className="text-[7px] leading-none">{ic}</span>)}
            </div>
          )}
          <span className="leading-none">{numStr}</span>
        </button>
      );
      if (i === 16) booths.push(<div key={`gap-${i}`} className="w-20 shrink-0" />);
      else if ([4, 8, 12, 20, 24, 28].includes(i)) booths.push(<div key={`gap-${i}`} className="w-4 shrink-0" />);
    }
    return (
      <div className="flex items-center justify-between bg-cyan-50 p-4 rounded-xl border border-cyan-200 mb-6 shadow-sm w-full">
        <span className="text-3xl font-black text-cyan-800 w-10 shrink-0 text-left">{letter}</span>
        <div className="flex gap-1 flex-nowrap justify-center flex-1">{booths}</div>
        <span className="text-3xl font-black text-cyan-800 w-10 shrink-0 text-right">{letter}</span>
      </div>
    );
  };

  const renderColumnVertical = (letter, start, end, type = 'center') => {
    let booths = [];
    for (let i = end; i >= start; i--) {
      const numStr = i.toString().padStart(2, '0');
      const booth_id = `${letter}${numStr}`;
      const { classes, icons } = getBoothStyle(booth_id);
      booths.push(
        <button key={booth_id} onClick={() => handleBoothClick(booth_id)} className={`w-10 h-7 text-[10px] border rounded flex flex-col items-center justify-center transition-all shrink-0 ${classes}`}>
          {icons.length > 0 && (
            <div className="flex gap-[1px] mb-[1px]">
              {icons.map((ic, idx) => <span key={idx} className="text-[7px] leading-none">{ic}</span>)}
            </div>
          )}
          <span className="leading-none">{numStr}</span>
        </button>
      );
      if (type === 'side') {
        if (i === 17) booths.push(<div key={`gap-${i}`} className="h-[3.75rem] shrink-0" />);
        else if ([29, 25, 21, 13, 9, 5].includes(i)) booths.push(<div key={`gap-${i}`} className="h-4 shrink-0" />);
      } else if (type === 'center') {
        if ([31, 27, 21, 15, 9, 5].includes(i)) booths.push(<div key={`gap-${i}`} className="h-4 shrink-0" />);
      }
    }
    return (
      <div className="flex flex-col gap-1 items-center bg-cyan-50 px-2 py-3 rounded-xl border border-cyan-200 shadow-sm shrink-0">
        <span className="text-xl font-black text-cyan-800 mb-2">{letter}</span>
        {booths}
        <span className="text-xl font-black text-cyan-800 mt-2">{letter}</span>
      </div>
    );
  };

  if (activeBooth) {
    return <StorePage activeBooth={activeBooth} onBack={() => setActiveBooth(null)} onRequireAuth={onRequireAuth} user={user}/>;
  }

  return (
    <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 w-full overflow-hidden">
      
      {/* 1. ส่วนปุ่มเลือกวันที่ (เหมือนเดิม) */}
      <div className="flex justify-center gap-4 mb-6">
        {["30/5/2026", "31/5/2026"].map((date, idx) => (
          <button
            key={date}
            onClick={() => setSelectedDate(date)}
            className={`px-6 py-2 rounded-full font-bold transition ${selectedDate === date ? "bg-pink-500 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Day {idx + 1}
            <span className="hidden md:inline">
              : {date === "30/5/2026" ? "30 May 2026" : "31 May 2026"}
            </span>
          </button>
        ))}
      </div>

      {/* เพิ่ม {user && ( ... )} เพื่อให้แสดงเฉพาะตอนที่ login แล้ว */}
      {user && (
        <div className="mb-6 flex flex-wrap justify-start md:justify-center gap-6 text-sm font-medium text-gray-700">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-yellow-300 flex items-center justify-center text-[10px] border border-black shadow-sm">👜​</span>
            <span>{t('legendReserved')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-blue-300 flex items-center justify-center text-[10px] border border-black shadow-sm">❤️</span>
            <span>{t('legendWishlist')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-blue-300 flex items-center justify-center text-[10px] border border-black shadow-sm">🔥</span>
            <span>{t('legendWishlistSoldout')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-white text-green-700 font-bold flex items-center justify-center text-[12px] border border-black shadow-sm">00</span>
            <span>{t('legendPartialBuy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-green-400 flex items-center justify-center text-[10px] border border-black shadow-sm"></span>
            <span>{t('legendAllBuy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-gray-300 flex items-center justify-center text-[10px] border border-black shadow-sm"></span>
            <span>{t('legendAllSoldout')}</span>
          </div>
        </div>
      )}

      {/* 3. ส่วนแผนที่ (เหมือนเดิม) */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        className="relative bg-cyan-100 rounded-xl shadow-inner border border-cyan-300 overflow-hidden h-[60vh] md:h-[75vh] min-h-[400px] max-h-[1000px] w-full cursor-grab active:cursor-grabbing"
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10 animate-pulse font-bold text-pink-500">
            {t('loading')}
          </div>
        ) : (
          <div
            className="p-4 md:p-8 absolute top-0 left-0"
            style={{
              width: '1550px',
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'top left'
            }}
          >
            {renderRowHorizontal('A', 1, 32)}
            <div className="flex justify-between items-start mt-2 w-full px-1">
              {renderColumnVertical('B', 1, 32, 'side')}
              <div className="flex flex-1 justify-evenly px-4 lg:px-8">
                {['C','E','G','I','K','M'].map(L => (
                  <div key={L} className="flex gap-2">
                    {renderColumnVertical(L, 1, 34, 'center')}
                    {renderColumnVertical(String.fromCharCode(L.charCodeAt(0)+1), 1, 34, 'center')}
                  </div>
                ))}
              </div>
              {renderColumnVertical('O', 1, 32, 'side')}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}