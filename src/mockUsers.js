// mockUsers.js
export const mockUsers = [
  {
    id: "u_001",
    username: "Na",
    email: "na@example.com",
    role: "buyer",
    profileImage: "https://ui-avatars.com/api/?name=Na&background=fbcfe8&color=ec4899",
    cart: [
      { id: 'c1', name: "สติกเกอร์ไดคัท", variation: "ลายแมวส้ม",type: "Reserved", price: 40, quantity: 2, stock: 15, checked: false, image: "https://placehold.co/100x100/fbcfe8/ec4899" },
      { id: 'c2', name: "พวงกุญแจอะคริลิค", variation: "Ploy", type: "Wishlist", price: 80, quantity: 1, stock: 30, checked: false, image: "https://placehold.co/100x100/bfdbfe/3b82f6" }
    ]
  },
  {
    id: "u_002",
    username: "MM Studio",
    email: "mmstudio@example.com",
    role: "seller", // <-- ตัวบอกว่าเป็นผู้ขาย
    profileImage: "https://ui-avatars.com/api/?name=MM+Studio&background=cffafe&color=0891b2",
    managedBoothId: "b_001", // เชื่อมไปยัง ID บูธที่คนนี้เป็นเจ้าของ
  },
  {
    id: "u_003",
    username: "Ken",
    email: "ken@example.com",
    role: "seller", // <-- ตัวบอกว่าเป็นผู้ขาย
    profileImage: "https://ui-avatars.com/api/?name=Ken&background=f0f9ff&color=3b82f6",
    managedBoothId: "b_001", // เชื่อมไปยัง ID บูธที่คนนี้เป็นเจ้าของ
  }

];