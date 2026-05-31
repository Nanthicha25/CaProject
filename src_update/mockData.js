export const eventData = {
  // ข้อมูลวันที่ 1
  "30/5/2026": [
    {
      id: "b_001",
      boothNumbers: ["A01", "A02"],
      boothName: "Manga Magic Box", // เพิ่มชื่อบูธ
      mainCreator: "MM Studio",
      coCreators: ["Ploy", "Ken", "Nana","a", "b","c", "d","e", "f","g", "h"],
      coverImage: "https://pbs.twimg.com/media/G2-YXpBbwAg3dbV?format=jpg&name=4096x4096", // รูปปก
      profileImage: "https://pbs.twimg.com/media/GtkdxIRaIAAQV28?format=jpg&name=900x900", // รูปโปรไฟล์
      description: "ขายโดจินชิและกู๊ดส์น่ารักๆ สไตล์อนิเมะ",
      // เพิ่มรายการสินค้า เพื่อใช้แยกว่าใครขายอะไร
      products: [
        { id: 1, name: "โดจินชิเล่ม 1 (ปกแข็ง)", price: 150, creator: "CA Studio" },
        { id: 2, name: "พวงกุญแจอะคริลิค", price: 80, creator: "Ploy" },
        { 
          id: 3, 
          name: "สติกเกอร์ไดคัท", 
          price: 40, 
          creator: "Ken",
          // เพิ่มรูปภาพสินค้าย่อย
          images: [
            "https://placehold.co/400x400/fbcfe8/ec4899?text=Sticker+1",
            "https://placehold.co/400x400/bfdbfe/3b82f6?text=Sticker+2",
            "https://placehold.co/400x400/bbf7d0/22c55e?text=Sticker+3"
          ],
          // เพิ่มตัวเลือกสินค้า 10 แบบ พร้อมสต็อกแยกกัน
          variations: [
            { id: "v1", name: "ลายแมวส้ม", stock: 15 },
            { id: "v2", name: "ลายหมาคอร์กี้", stock: 10 },
            { id: "v3", name: "ลายกระต่าย", stock: 5 },
            { id: "v4", name: "ลายนกแก้ว", stock: 20 },
            { id: "v5", name: "ลายแฮมสเตอร์", stock: 8 },
            { id: "v6", name: "ลายชิบะ", stock: 12 },
            { id: "v7", name: "ลายแพนด้า", stock: 0 }, // ลองจำลองว่าของหมด
            { id: "v8", name: "ลายเพนกวิน", stock: 25 },
            { id: "v9", name: "ลายฉลามงับ", stock: 30 },
            { id: "v10", name: "ลายไดโนเสาร์", stock: 7 },
          ]
        },
        { id: 4, name: "โปสการ์ดรวมรวมเซ็ต", price: 50, creator: "CA Studio" },
        { id: 5, name: "สแตนดี้ตั้งโต๊ะ", price: 250, creator: "Ploy" },
        { id: 6, name: "สมุดโน้ตปกเปล่า", price: 60, creator: "Ken" },
      ]
    },
    {
      id: "b_002",
      boothNumbers: ["B08"],
      boothName: "Artisan House",
      mainCreator: "Manga Master",
      coCreators: ["Artist1"],
      coverImage: "https://placehold.co/1200x400/cffafe/0891b2",
      profileImage: "https://placehold.co/700x700/ffffff/0891b2?text=Art",
      description: "รับวาดคอมมิชชั่นสด และขายภาพปรินต์",
      products: [
        { id: 7, name: "ภาพปรินต์ A4", price: 100, creator: "Manga Master" },
        { id: 8, name: "เข็มกลัดเคลือบโฮโลแกรม", price: 50, creator: "Artist1" },
      ]
    }
  ],
  // ข้อมูลวันที่ 2 
  "2026-05-31": [
    {
      id: "b_003",
      boothNumbers: ["A01"], 
      boothName: "Manga",
      mainCreator: "CA Studio",
      coCreators: [], 
      coverImage: "https://placehold.co/1200x400/fbcfe8/ec4899",
      profileImage: "https://placehold.co/700x700/ffffff/ec4899?text=Logo",
      description: "เคลียร์สต็อกของที่เหลือจากเมื่อวาน",
      products: [
        { id: 1, name: "โดจินชิเล่ม 1 (ปกแข็ง)", price: 150, creator: "CA Studio" },
      ]
    }
  ]
};