import { useState } from 'react';
import ProductDetail from './ProductDetail';

export default function StorePage({ activeBooth, onBack, onRequireAuth, user }) {
  const [selectedCreator, setSelectedCreator] = useState("ทั้งหมด");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const products = activeBooth.products || [];
  const allCreators = ["ทั้งหมด", activeBooth.mainCreator, ...(activeBooth.coCreators || [])];

  const filteredProducts = products.filter(p => {
    const itemCreator = p.creator || activeBooth.mainCreator;
    return selectedCreator === "ทั้งหมด" ? true : itemCreator === selectedCreator;
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
    // เปลี่ยนพื้นหลังเป็น bg-white
    <div className="bg-white rounded-3xl animate-fade-in w-full min-h-[800px] shadow-sm border border-gray-200 overflow-hidden relative">
      
      {/* แถบเมนูด้านบน */}
      <div className="bg-white p-4 sticky top-0 z-20 flex items-center shadow-sm">
        <button onClick={onBack} className="flex items-center text-pink-500 hover:text-pink-600 font-bold transition bg-pink-50 px-4 py-2 rounded-full">
          <span className="mr-2">←</span> back
        </button>
        <span className="ml-auto text-black font-black text-lg">
          บูธ {activeBooth.boothNumbers?.join(', ') || 'N/A'}
        </span>
      </div>

      {/* ส่วน Header ร้านค้า */}
      <div className="bg-white pb-6 shadow-sm mb-4">
        <div className="h-72 md:h-96 bg-gradient-to-r from-pink-300 to-purple-400 w-full relative">
          <img src={activeBooth.coverImage || "https://placehold.co/1200x1000/fbcfe8/ec4899"} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute -bottom-12 left-8 w-32 h-32 bg-white rounded-2xl p-1 shadow-md">
            <img src={activeBooth.profileImage || "https://placehold.co/700x700/fbcfe8/ec4899?text=Logo"} alt="Profile" className="w-full h-full object-cover rounded-xl border border-gray-100" />
          </div>
        </div>
        <div className="pt-16 px-8 flex flex-col items-start gap-1">
          <h1 className="text-3xl md:text-4xl font-black text-gray-800">
            {activeBooth.boothName || activeBooth.mainCreator}
          </h1>
          <p className="text-gray-600">{activeBooth.description}</p>
        </div>
      </div>

      {/* ส่วนตัวกรองและแสดงสินค้า */}
      <div className="p-4 md:p-8">
        {/* เปลี่ยนแถบเมนูตัวกรองเป็น bg-white */}
        <div className="flex flex-col mb-8 gap-4 sticky top-[72px] bg-white z-10 py-2">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center shrink-0">
            <span className="bg-pink-500 w-2 h-6 rounded-full mr-3"></span> สินค้าบูธนี้
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 w-full no-scrollbar">
            {allCreators.map(creator => (
              <button
                key={creator}
                onClick={() => setSelectedCreator(creator)}
                className={`whitespace-nowrap px-6 py-2 rounded-full font-bold transition border-2 ${
                  selectedCreator === creator 
                  ? 'bg-pink-500 text-white border-pink-500 shadow-md' 
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-pink-50 hover:border-pink-200 hover:text-pink-500'
                }`}
              >
                {creator === "ทั้งหมด" ? "🌟 รวมทั้งหมด" : `🎨 ${creator}`}
              </button>
            ))}
          </div>
        </div>
        
        {/* รายการสินค้า */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((item, index) => {
              // คำนวณสต็อกเพื่อแสดงใน Card
              const itemTotalStock = item.variations?.reduce((acc, v) => {
                const optionSum = v.options?.reduce((sum, opt) => sum + (opt.stock || 0), 0) || 0;
                return acc + optionSum;
              }, 0) || item.stock || 0;

              return (
                <div 
                  key={item.id || index} 
                  onClick={() => setSelectedProduct(item)}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 overflow-hidden group flex flex-col"
                >
                  {/* เปลี่ยนพื้นหลังรูปเป็น bg-white */}
                  <div className="aspect-square bg-white relative overflow-hidden">
                    <img 
                      src={item.product_images?.cover_image || `https://placehold.co/400x400/f3f4f6/9ca3af?text=${item.name}`} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                    />

                    {/* ป้าย PRE-ORDER ย้ายมามุมขวาบน (right-3) แทนที่ Creator */}
                    {item.classification?.preorder && (
                      <div className="absolute top-3 right-3 bg-orange-500/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-black text-white shadow-sm border border-orange-400">
                        PRE-ORDER
                      </div>
                    )}
                  </div>

                  <div className="p-4 md:p-5 flex flex-col flex-1 justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm md:text-base line-clamp-2 leading-tight">
                        {item.name}
                      </h3>
                      {/* ชื่อ Creator ย้ายมาอยู่ใต้ชื่อสินค้า */}
                      <p className="text-xs text-gray-500 mt-1.5 font-medium">
                        🎨 {item.creator || activeBooth.mainCreator}
                      </p>
                    </div>

                    <div className="flex items-end justify-between mt-4">
                      <p className="text-pink-500 font-black text-lg">฿{item.price}</p>
                      
                      {/* สีของ Stock: 0 ชิ้น = สีแดง, > 0 ชิ้น = สีดำ */}
                      <p className={`text-xs font-bold ${itemTotalStock === 0 ? 'text-red-500' : 'text-black'}`}>
                        เหลือ {itemTotalStock} ชิ้น
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400 font-bold bg-white rounded-2xl border-2 border-dashed border-gray-200">
            ยังไม่มีสินค้าของ {selectedCreator}
          </div>
        )}
      </div>

    </div>
  );
}