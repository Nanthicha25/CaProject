// src/Buyer/BoothMap.jsx
import { useState, useEffect, useRef } from 'react';
import StorePage from './StorePage';
import { db } from '../firebase'; 
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';

export default function BoothMap({ onRequireAuth, user }) {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState("30/5/2026");
  const [activeBooth, setActiveBooth] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [boothsLookup, setBoothsLookup] = useState({});
  const [activeQueuesList, setActiveQueuesList] = useState([]); 
  const [userInteractionsLookup, setUserInteractionsLookup] = useState({});
  
  // States ใหม่สำหรับแยกสัญญารับข้อมูลเรียลไทม์ออกจากกัน
  const [cartItems, setCartItems] = useState([]);
  const [productsStock, setProductsStock] = useState({});
  const [purchasedBooths, setPurchasedBooths] = useState(new Set());

  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const initialPinchDistance = useRef(null);
  const pinchStartScale = useRef(1);
  const pinchStartPosition = useRef({ x: 0, y: 0 });
  const pinchCenter = useRef({ x: 0, y: 0 });

  const updateScaleAndPosition = () => {
    if (containerRef.current) {
      const container = containerRef.current;
      const mapWidth = 1550;
      const mapHeight = 1450;
      const scaleX = container.clientWidth / mapWidth;
      const scaleY = container.clientHeight / mapHeight;
      const initialScale = Math.max(scaleX, scaleY);
      setScale(initialScale);
      setPosition({ x: 0, y: 0 });
    }
  };

  useEffect(() => {
    if (!loading) {
      updateScaleAndPosition();
      window.addEventListener('resize', updateScaleAndPosition);
      return () => window.removeEventListener('resize', updateScaleAndPosition);
    }
  }, [loading]);

  // 1. ดึงข้อมูลคิวและบูธแบบ Real-time
  useEffect(() => {
    setLoading(true);
    try {
      const q = query(collection(db, "booths"), where("event_date", "==", selectedDate));
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const lookup = {};
        const queues = []; 
        let index = 0; 
        
        querySnapshot.docs.forEach(doc => {
          const docData = doc.data();
          const data = { id: doc.id, originalIndex: index++, ...docData };
          
          if (Array.isArray(data.booth_numbers)) {
            data.booth_numbers.forEach(num => { lookup[num] = data; });
          }

          if (data.queue_status === 'open') {
            queues.push({
              id: data.id,
              booth_name: data.booth_name || data.shop_name || "Unknown Shop",
              booth_numbers: data.booth_numbers || [],
              current_queue: data.current_queue !== undefined ? data.current_queue : 0,
              total_queue: data.total_queue !== undefined ? data.total_queue : 0,
              raw_data: data 
            });
          }
        });
        
        setBoothsLookup(lookup);
        setActiveQueuesList(queues); 
        setLoading(false);
      }, (error) => {
        console.error("Error listening to booths: ", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up booths snapshot: ", error);
      setLoading(false);
    }
  }, [selectedDate]);

  // 2. ฟังข้อมูลตะกร้าสินค้า (Carts) แบบ Real-time
  useEffect(() => {
    const currentUserId = user?.id || user?.uid;
    if (!currentUserId) {
      setCartItems([]);
      return;
    }

    const cartsRef = collection(db, "users", currentUserId, "carts");
    const unsubscribeCarts = onSnapshot(cartsRef, (cartsSnap) => {
      const items = cartsSnap.docs.map(doc => doc.data());
      setCartItems(items);
    }, (err) => console.error("Error watching carts:", err));

    return () => unsubscribeCarts();
  }, [user]);

  // 3. ฟังข้อมูลสต็อกสินค้า (Products) แบบ Real-time เฉพาะชิ้นที่มีในตะกร้า
  useEffect(() => {
    if (cartItems.length === 0) {
      setProductsStock({});
      return;
    }

    const productIds = Array.from(new Set(cartItems.map(item => item.product_id).filter(Boolean)));
    if (productIds.length === 0) return;

    // แบ่งกลุ่มรับข้อมูลทีละ 30 ชิ้นตามข้อจำกัดคิวรี 'in' ของ Firestore
    const unsubscribes = [];
    const chunks = [];
    for (let i = 0; i < productIds.length; i += 30) {
      chunks.push(productIds.slice(i, i + 30));
    }

    chunks.forEach(chunk => {
      const pQuery = query(collection(db, "products"), where("product_id", "in", chunk));
      const unsub = onSnapshot(pQuery, (pSnap) => {
        setProductsStock(prev => {
          const updated = { ...prev };
          pSnap.forEach(pDoc => {
            updated[pDoc.data().product_id || pDoc.id] = pDoc.data();
          });
          return updated;
        });
      }, (err) => console.error("Error watching products stock:", err));
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [cartItems]);

  // 4. ฟังประวัติการสั่งซื้อ (Allbuys) แบบ Real-time
  useEffect(() => {
    const currentUserId = user?.id || user?.uid;
    if (!currentUserId) {
      setPurchasedBooths(new Set());
      return;
    }

    const allbuysRef = collection(db, "allbuys");
    const allbuysQuery = query(allbuysRef, where("user_id", "==", currentUserId));
    
    const unsubscribeAllbuys = onSnapshot(allbuysQuery, (allbuysSnap) => {
      const purchasedSet = new Set();
      allbuysSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.booth_id) purchasedSet.add(data.booth_id);
      });
      setPurchasedBooths(purchasedSet);
    }, (err) => console.error("Error watching allbuys:", err));

    return () => unsubscribeAllbuys();
  }, [user]);

  // 5. ประกอบร่างคำนวณและสร้าง Interactions Map เมื่อข้อมูลย่อยตัวใดตัวหนึ่งอัปเดต
  useEffect(() => {
    const interactionsMap = {};
    const boothCartStats = {};

    // จัดการข้อมูลจากตะกร้าและเช็กสต็อกสินค้า
    cartItems.forEach(data => {
      if (data.booth_id) {
        const bId = data.booth_id;
        if (!interactionsMap[bId]) interactionsMap[bId] = new Set();
        if (data.type) interactionsMap[bId].add(data.type.toLowerCase());
        
        if (!boothCartStats[bId]) boothCartStats[bId] = { total: 0, soldout: 0, wishlist_soldout: 0 };
        boothCartStats[bId].total += 1;

        const pData = productsStock[data.product_id];
        let currentStock = 0;
        if (pData) {
          if (pData.has_variations && pData.variations) {
            const optName = data.option_name || data.variation_name;
            const opt = pData.variations.find(v => v.option_name === optName || v.variation_name === optName);
            if (opt) currentStock = opt.stock !== undefined ? opt.stock : 0;
          } else {
            currentStock = pData.total_stock !== undefined ? pData.total_stock : 0;
          }
        }
        
        if (currentStock <= 0) {
          boothCartStats[bId].soldout += 1;
          if (data.type && data.type.toLowerCase() === 'wishlist') {
            boothCartStats[bId].wishlist_soldout += 1;
          }
        }
      }
    });

    // ตรวจสอบบูธที่สินค้าถูกเหมาหมด หรือสินค้าใน Wishlist บางชิ้นหมด
    Object.keys(boothCartStats).forEach(bId => {
      const stats = boothCartStats[bId];
      if (stats.soldout > 0 && stats.soldout === stats.total) interactionsMap[bId].add('soldout_all'); 
      if (stats.wishlist_soldout > 0) interactionsMap[bId].add('wishlist_soldout_some'); 
    });

    // ตรวจสอบประวัติการซื้อร่วมด้วยจาก State ตัวรับข้อมูล Allbuys
    purchasedBooths.forEach(bId => {
      if (!interactionsMap[bId]) interactionsMap[bId] = new Set();
      interactionsMap[bId].add("purchased");
      if (!boothCartStats[bId] || boothCartStats[bId].total === 0) {
        interactionsMap[bId].add("purchased_all");
      }
    });

    setUserInteractionsLookup(interactionsMap);
  }, [cartItems, productsStock, purchasedBooths]);

  const clampPosition = (x, y, scale) => {
    const container = containerRef.current;
    if (!container) return { x, y };
    const mapWidth = 1550;
    const mapHeight = 1450;
    const scaledWidth = mapWidth * scale;
    const scaledHeight = mapHeight * scale;
    const minX = container.clientWidth > scaledWidth ? (container.clientWidth - scaledWidth) / 2 : container.clientWidth - scaledWidth;
    const maxX = container.clientWidth > scaledWidth ? (container.clientWidth - scaledWidth) / 2 : 0;
    const minY = container.clientHeight > scaledHeight ? (container.clientHeight - scaledHeight) / 2 : container.clientHeight - scaledHeight;
    const maxY = container.clientHeight > scaledHeight ? (container.clientHeight - scaledHeight) / 2 : 0;
    return { x: Math.min(maxX, Math.max(minX, x)), y: Math.min(maxY, Math.max(minY, y)) };
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const wheelHandler = (e) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zoomIntensity = 0.0015;
      let newScale = scale * Math.exp(-e.deltaY * zoomIntensity);
      const minScale = Math.min(container.clientWidth / 1550, container.clientHeight / 1450);
      newScale = Math.max(minScale, Math.min(newScale, 3));
      const scaleRatio = newScale / scale;
      const newX = mouseX - (mouseX - position.x) * scaleRatio;
      const newY = mouseY - (mouseY - position.y) * scaleRatio;
      setPosition(clampPosition(newX, newY, newScale));
      setScale(newScale);
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
    const newX = e.clientX - start.current.x;
    const newY = e.clientY - start.current.y;
    requestAnimationFrame(() => setPosition(clampPosition(newX, newY, scale)));
  };

  const handleMouseUp = () => { isDragging.current = false; };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      start.current = { x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y };
    } else if (e.touches.length === 2) {
      isDragging.current = false;
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      initialPinchDistance.current = dist;
      pinchStartScale.current = scale;
      pinchStartPosition.current = { ...position };
      const rect = containerRef.current.getBoundingClientRect();
      pinchCenter.current = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging.current) {
      const newX = e.touches[0].clientX - start.current.x;
      const newY = e.touches[0].clientY - start.current.y;
      requestAnimationFrame(() => setPosition(clampPosition(newX, newY, scale)));
    } else if (e.touches.length === 2 && initialPinchDistance.current) {
      const currentDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const zoomFactor = currentDist / initialPinchDistance.current;
      let newScale = pinchStartScale.current * zoomFactor;
      const minScale = Math.min(containerRef.current.clientWidth / 1550, containerRef.current.clientHeight / 1450);
      newScale = Math.max(minScale, Math.min(newScale, 3));
      const scaleRatio = newScale / pinchStartScale.current;
      const newX = pinchCenter.current.x - (pinchCenter.current.x - pinchStartPosition.current.x) * scaleRatio;
      const newY = pinchCenter.current.y - (pinchCenter.current.y - pinchStartPosition.current.y) * scaleRatio;
      requestAnimationFrame(() => { setScale(newScale); setPosition(clampPosition(newX, newY, newScale)); });
    }
  };

  const handleTouchEnd = () => { isDragging.current = false; initialPinchDistance.current = null; };

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

    const isQueueOpen = data.queue_status === 'open';

    if (isPurchasedAll) return { data, classes: 'bg-green-400 font-black border-black text-green-900', icons: [] };
    if (isSoldoutAll && !hasReserved) return { data, classes: 'bg-gray-300 font-black border-black text-gray-500', icons: [] };

    let icons = [];
    if (hasWishlist) icons.push(hasWishlistSoldoutSome ? '🔥' : '❤️');
    if (hasReserved) icons.push('👜');
    if (isQueueOpen) icons.push('⏳'); 

    let bgColor = 'bg-white hover:bg-gray-100';
    if (isQueueOpen) bgColor = 'bg-purple-300 hover:bg-purple-400';
    else if (hasReserved) bgColor = 'bg-yellow-300 hover:bg-yellow-400';
    else if (hasWishlist) bgColor = 'bg-blue-300 hover:bg-blue-400';

    let textColor = hasPurchasedSome ? 'text-green-700' : (isQueueOpen ? 'text-purple-900' : (data.originalIndex % 2 === 0 ? 'text-pink-600' : 'text-black'));
    return { data, classes: `${bgColor} font-black shadow-sm border-black ${textColor}`, icons };
  };

  const handleBoothClick = (booth_id) => {
    const { data } = getBoothStyle(booth_id);
    if (data) setActiveBooth(data);
    else alert(`${t('emptyBooth')} ${booth_id} ${t('emptyBoothAlt')}`);
  };

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
      
      {/* 1. ส่วนปุ่มเลือกวันที่ */}
      <div className={`flex justify-center gap-4 ${user ? 'mb-6' : 'mb-2'}`}>
        {["30/5/2026", "31/5/2026"].map((date, idx) => (
          <button
            key={date}
            onClick={() => setSelectedDate(date)}
            className={`px-6 py-2 rounded-full font-bold transition ${selectedDate === date ? "bg-pink-500 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Day {idx + 1}
            <span className="hidden md:inline">: {date === "30/5/2026" ? "30 May 2026" : "31 May 2026"}</span>
          </button>
        ))}
      </div>

      {!user && (
        <div className="text-left text-sm text-gray-500 mb-3 px-2">
          {t('mapPanZoomHint') || '💡 สามารถปรับขนาดหรือเลื่อนเพื่อสำรวจแผนผังได้ (Pan & Zoom)'}
        </div>
      )}

      {/* 2. ส่วนแผนที่ */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}
        className="relative touch-none bg-cyan-100 rounded-xl shadow-inner border border-cyan-300 overflow-hidden h-[60vh] md:h-[75vh] min-h-[400px] max-h-[1000px] w-full cursor-grab active:cursor-grabbing"
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

      {/* 3. ส่วนแสดงรายการคิวแบบเรียลไทม์ (Live Queues Banner) */}
      {activeQueuesList.length > 0 && (
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-2xl p-4 shadow-sm animate-fadeIn">
          <h3 className="text-md font-black text-purple-900 mb-3 flex items-center gap-2">
            ⏳ {t('liveQueuesTitle') || 'บูธที่กำลังเปิดรับจองคิวอยู่ในขณะนี้'} ({activeQueuesList.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeQueuesList.map((qBooth) => (
              <div 
                key={qBooth.id} 
                onClick={() => setActiveBooth(qBooth.raw_data)}
                className="bg-white border border-purple-100 hover:border-purple-400 p-3 rounded-xl flex flex-col justify-between cursor-pointer transition-all shadow-sm active:scale-95"
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="font-bold text-gray-800 text-sm truncate max-w-[170px]" title={qBooth.booth_name}>
                    {qBooth.booth_name}
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {qBooth.booth_numbers.map(num => (
                      <span key={num} className="bg-purple-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded">
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between bg-purple-100/60 rounded-lg p-2 text-xs">
                  <div className="text-purple-950 font-medium">
                    {t('currentQueue') || 'คิวปัจจุบัน'}: <span className="font-black text-sm text-purple-700">{qBooth.current_queue}</span>
                  </div>
                  <div className="text-gray-500">
                    {t('totalQueue') || 'คิวทั้งหมด'}: <span className="font-bold text-gray-750">{qBooth.total_queue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. ส่วนของ Legend คู่มือและสัญลักษณ์แผนที่ */}
      {user && (
        <div className="mt-8 pt-8 border-t border-gray-100">
          <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
            🗺️ {t('mapGuideTitle') || 'คู่มือและสัญลักษณ์แสดงสถานะแผ่นผัง'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* คอลัมน์ที่ 1: การควบคุม */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                🎮 {t('mapControl') || 'การควบคุมแผ่นผัง'}
              </h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-pink-500">•</span>
                  <span><strong>{t('zoom') || 'การปรับขนาด'}:</strong> {t('zoomDesc') || 'ใช้ลูกกลิ้งเมาส์ หรือใช้สองนิ้วจีบขยายบนหน้าจอ'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500">•</span>
                  <span><strong>{t('pan') || 'การเลื่อนตำแหน่ง'}:</strong> {t('panDesc') || 'คลิกแล้วลาก หรือใช้หนึ่งนิ้วลากเพื่อปรับมุมมอง'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500">•</span>
                  <span><strong>{t('shop') || 'ข้อมูลร้านค้า'}:</strong> {t('shopDesc') || 'เลือกที่บูธเพื่อตรวจสอบรายการสินค้าและจัดการตะกร้าสินค้า'}</span>
                </li>
              </ul>
            </div>

            {/* คอลัมน์ที่ 2: ความหมายของสีบูธ */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                🎨 {t('mapColor') || 'ความหมายของสีบูธ'}
              </h4>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded bg-purple-300 border border-black/20 shrink-0"></span>
                  <span>{t('colorQueueOpen') || 'บูธที่กำลังเปิดระบบจองคิว (⏳)'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded bg-blue-300 border border-black/20 shrink-0"></span>
                  <span>{t('colorWishlist') || 'มีสินค้าที่ท่านบันทึกไว้ในรายการโปรด (❤️)'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded bg-yellow-300 border border-black/20 shrink-0"></span>
                  <span>{t('colorReserved') || 'มีสินค้าที่ท่านได้ทำรายการจองไว้ (👜)'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded bg-green-400 border border-black/20 shrink-0"></span>
                  <span>{t('colorPurchased') || 'เสร็จสิ้นการซื้อสินค้าตามความต้องการแล้ว'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded bg-gray-300 border border-black/20 shrink-0"></span>
                  <span>{t('colorSoldout') || 'สินค้าในรายการโปรดของท่านหมดสต็อก'}</span>
                </div>
              </div>
            </div>

            {/* คอลัมน์ที่ 3: ไอคอนและการแจ้งเตือน */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                📢 {t('mapAlerts') || 'สัญลักษณ์การแจ้งเตือน'}
              </h4>
              <div className="space-y-4 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <span className="text-xl w-6 text-center">⏳</span>
                  <p><strong>{t('alertQueue') || 'เปิดระบบรับคิว'}:</strong> {t('alertQueueDesc') || 'บูธเปิดระบบจัดลำดับคิว ท่านสามารถกดเข้าบูธเพื่อรับคิวได้ทันที'}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl w-6 text-center">🔥</span>
                  <p><strong>{t('alertLowStock') || 'สินค้าใกล้หมด'}:</strong> {t('alertLowStockDesc') || 'สินค้าในรายการโปรดของท่านมีจำนวนจำกัดในขณะนี้'}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl w-6 text-center">👜</span>
                  <p><strong>{t('alertPickup') || 'ติดต่อรับสินค้า'}:</strong> {t('alertPickupDesc') || 'บูธนี้มีสินค้าที่ท่านจองไว้ โปรดติดต่อรับสินค้า ณ บูธดังกล่าว'}</p>
                </div>
                <div className="flex items-start gap-3 text-green-700">
                  <span className="w-6 h-6 rounded bg-white border border-black font-bold flex items-center justify-center text-[10px] shrink-0">00</span>
                  <p><strong>{t('alertPartial') || 'ซื้อแล้วบางส่วน'}:</strong> {t('alertPartialDesc') || 'สีของหมายเลขบูธจะเปลี่ยนเป็นสีเขียวเมื่อท่านชำระเงินสินค้าบางส่วนแล้ว'}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}