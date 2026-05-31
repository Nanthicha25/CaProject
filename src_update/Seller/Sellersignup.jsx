// src/Seller/Sellersignup.jsx
import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext'; 
import { auth, db } from '../firebase'; 
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

function Sellersignup({ setCurrentPage, setUser }) {
  const { lang, setLang } = useLanguage();
  
  const [penName, setPenName] = useState('');
  const [email, setEmail] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [day30, setDay30] = useState(false);
  const [day31, setDay31] = useState(false);
  const [booth30, setBooth30] = useState('');
  const [booth31, setBooth31] = useState('');

  const [agreed, setAgreed] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  // เพิ่ม State สำหรับจัดการ Alert Popup แจ้งเตือนข้อผิดพลาด
  const [alertPopup, setAlertPopup] = useState({ isOpen: false, message: '' });

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    // แทนที่ alert() ทั้งหมดด้วย setAlertPopup()
    if (!day30 && !day31) {
      setAlertPopup({ isOpen: true, message: lang === 'th' ? "กรุณาเลือกวันจัดแสดงอย่างน้อย 1 วัน" : "Please select at least 1 exhibition day." });
      return;
    }
    if (day30 && !booth30) {
      setAlertPopup({ isOpen: true, message: lang === 'th' ? "กรุณากรอกเลขบูธสำหรับวันที่ 30 พ.ค." : "Please enter booth number for May 30." });
      return;
    }
    if (day31 && !booth31) {
      setAlertPopup({ isOpen: true, message: lang === 'th' ? "กรุณากรอกเลขบูธสำหรับวันที่ 31 พ.ค." : "Please enter booth number for May 31." });
      return;
    }
    if (password !== confirmPassword) {
      setAlertPopup({ isOpen: true, message: lang === 'th' ? "รหัสผ่านไม่ตรงกัน" : "Passwords do not match." });
      return;
    }
    if (!agreed) {
      setAlertPopup({ isOpen: true, message: lang === 'th' ? "กรุณายอมรับเงื่อนไขก่อนสมัครสมาชิก" : "Please accept the terms and conditions." });
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "sellers", user.uid), {
        penName: penName,
        email: email,
        socialLink: socialLink,
        day30: day30,
        day31: day31,
        booth30: day30 ? booth30 : '',
        booth31: day31 ? booth31 : '',
        role: 'seller',
        status: 'pending', 
        createdAt: new Date()
      });

      setShowPopup(true);
    } catch (error) {
      console.error(error);
      // แทนที่ alert() เมื่อเกิด error จากระบบ (เช่น อีเมลซ้ำ)
      setAlertPopup({ isOpen: true, message: lang === 'th' ? "อีเมลนี้อาจถูกใช้งานไปแล้ว หรือเกิดข้อผิดพลาด" : "Email already in use or error occurred." });
    }
  };

  return (
    <div className="min-h-screen bg-purple-50/30 flex flex-col items-center pt-10 px-4 pb-10 relative">
      
      <div className="flex justify-between items-center w-full max-w-xl mb-6">
        <button onClick={() => setCurrentPage('sellerlogin')} className="flex items-center gap-2 text-gray-400 hover:text-purple-600 transition-colors font-medium">
          <span className="text-xl">←</span> {lang === 'th' ? 'กลับ' : 'Back'}
        </button>

        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-purple-100 z-10">
          <button onClick={() => setLang('th')} className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${lang === 'th' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-300 hover:text-purple-500'}`}>TH</button>
          <button onClick={() => setLang('en')} className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${lang === 'en' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-300 hover:text-purple-500'}`}>EN</button>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-purple-100/50 border-t-8 border-purple-600 w-full max-w-xl">
        <h2 className="text-3xl font-black text-gray-800 mb-2 tracking-tight">{lang === 'th' ? 'สมัครบัญชีครีเอเตอร์' : 'Creator Sign Up'}</h2>
        <p className="text-sm text-gray-500 mb-6 font-medium">{lang === 'th' ? 'กรุณากรอกข้อมูลให้ครบถ้วนเพื่อรอการอนุมัติ' : 'Please fill in your details for approval.'}</p>
        
        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">{lang === 'th' ? 'นามปากกา' : 'Pen Name'}</label>
              <input type="text" required value={penName} onChange={(e)=>setPenName(e.target.value)} placeholder={lang === 'th' ? 'เช่น ArtList_Studio' : 'e.g. ArtList_Studio'} className="w-full p-4 border border-purple-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-purple-50/30 transition-all placeholder:text-purple-200" />
              <p className="text-[11px] text-purple-600 mt-1 ml-2">* {lang === 'th' ? 'ให้ตรงกับงาน CA หรือแอคเคาท์หลักของคุณ' : 'Must match your CA or main account'}</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">{lang === 'th' ? 'อีเมล' : 'Email'}</label>
              <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="example@mail.com" className="w-full p-4 border border-purple-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-purple-50/30 transition-all placeholder:text-purple-200" />
            </div>
          </div>

          <hr className="border-purple-50 my-2" />

          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-700 ml-1">{lang === 'th' ? 'วันที่จัดแสดง (เลือกได้มากกว่า 1 วัน)' : 'Exhibition Dates (Multiple selection allowed)'}</label>
            <div className="flex flex-col gap-3">
              <div className="p-4 rounded-2xl border border-purple-100 bg-white shadow-sm flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={day30} onChange={(e) => setDay30(e.target.checked)} className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-400 cursor-pointer" />
                  <span className="font-bold text-gray-800">{lang === 'th' ? 'วันที่ 30 พ.ค.' : 'May 30th'}</span>
                </label>
                {day30 && (
                  <div>
                    <input type="text" value={booth30} onChange={(e)=>setBooth30(e.target.value)} placeholder={lang === 'th' ? 'ระบุเลขบูธ (เช่น A01,A02)' : 'Booth number (e.g. A01,A02)'} className="w-full p-3 text-sm border border-purple-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-purple-50/20" />
                  </div>
                )}
              </div>
              <div className="p-4 rounded-2xl border border-purple-100 bg-white shadow-sm flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={day31} onChange={(e) => setDay31(e.target.checked)} className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-400 cursor-pointer" />
                  <span className="font-bold text-gray-800">{lang === 'th' ? 'วันที่ 31 พ.ค.' : 'May 31st'}</span>
                </label>
                {day31 && (
                  <div>
                    <input type="text" value={booth31} onChange={(e)=>setBooth31(e.target.value)} placeholder={lang === 'th' ? 'ระบุเลขบูธ (เช่น A01,A02)' : 'Booth number (e.g. A01,A02)'} className="w-full p-3 text-sm border border-purple-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-purple-50/20" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-purple-50 my-2" />

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">{lang === 'th' ? 'ลิงก์โซเชียลมีเดียหลัก (สำหรับยืนยันตัวตน)' : 'Main Social Media Link (For verification)'}</label>
            <input type="url" required value={socialLink} onChange={(e)=>setSocialLink(e.target.value)} placeholder="https://x.com/your_account หรือ facebook" className="w-full p-4 border border-purple-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-purple-50/30 transition-all placeholder:text-purple-200" />
          </div>

          <div className="space-y-3 mt-2">
            <input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder={lang === 'th' ? 'รหัสผ่าน' : 'Password'} className="w-full p-4 border border-purple-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-purple-50/30 transition-all placeholder:text-purple-200" />
            <input type="password" required value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} placeholder={lang === 'th' ? 'ยืนยันรหัสผ่าน' : 'Confirm Password'} className="w-full p-4 border border-purple-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-purple-50/30 transition-all placeholder:text-purple-200" />
          </div>

          <div className="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl text-sm text-yellow-800">
            <div className="font-bold flex items-center gap-2 mb-1">
              <span>⚠️</span> {lang === 'th' ? 'สำคัญ! ขั้นตอนหลังการสมัคร' : 'IMPORTANT! Next Steps'}
            </div>
            <p className="text-xs mb-3">
              {lang === 'th' 
                ? 'หลังจากกดสมัครแล้ว บัญชีของคุณจะยังใช้งานไม่ได้ กรุณาทักแอดมินผ่านช่องทางด้านล่าง เพื่อยืนยันตัวตน โดยใช้แอคเคาท์ที่ให้ไว้ในฟอร์มสมัครนี้ทักมาเท่านั้นพร้อมแจ้งอีเมลที่ใช้สมัคร' 
                : 'After signing up, your account will remain inactive. Please contact the admin via the channels below to verify your identity. You must use the social media account provided in this form to contact us and include your registered email.'}
            </p>
            <div className="flex gap-2">
              <a href="https://x.com/projectogetherr" target="_blank" rel="noreferrer" className="flex-1 bg-black text-white text-center py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors">X (Twitter) Admin</a>
              <a href="https://www.facebook.com/share/18wasfCsjM/" target="_blank" rel="noreferrer" className="flex-1 bg-blue-600 text-white text-center py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">Facebook Admin</a>
            </div>
          </div>

          <div className="py-4 px-3 sm:px-4 bg-purple-50/50 rounded-2xl border border-purple-100">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 rounded-lg border-purple-200 text-purple-600 focus:ring-purple-400 cursor-pointer" />
              <div className="flex flex-wrap items-center text-[10.5px] sm:text-xs text-gray-600 gap-x-1 leading-relaxed">
                <span>{lang === 'th' ? 'ยอมรับ' : 'I accept the'}</span>
                <button type="button" onClick={(e) => { e.preventDefault(); setActiveModal('terms'); }} className="text-purple-600 font-bold hover:underline">{lang === 'th' ? 'เงื่อนไขครีเอเตอร์' : 'Creator Terms'}</button> 
                <span>{lang === 'th' ? 'และ' : '&'}</span>
                <button type="button" onClick={(e) => { e.preventDefault(); setActiveModal('privacy'); }} className="text-purple-600 font-bold hover:underline">{lang === 'th' ? 'นโยบายความเป็นส่วนตัว' : 'Privacy Policy'}</button>
              </div>
            </label>
          </div>

          <button type="submit" disabled={!agreed} className={`w-full py-4 mt-2 rounded-2xl font-bold transition-all shadow-lg text-lg ${agreed ? "bg-purple-600 text-white hover:bg-purple-700 active:scale-95 shadow-purple-200" : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"}`}>
            {lang === 'th' ? 'ส่งคำขอสมัครครีเอเตอร์' : 'Submit Application'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {lang === 'th' ? 'มีบัญชีอยู่แล้วใช่หรือไม่?' : 'Already have an account?'} 
          <span onClick={() => setCurrentPage('sellerlogin')} className="ml-2 text-purple-600 cursor-pointer hover:underline font-bold">
            {lang === 'th' ? 'เข้าสู่ระบบร้านค้า' : 'Login Here'}
          </span>
        </p>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-purple-900/20 backdrop-blur-md px-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-purple-100 animate-in fade-in zoom-in duration-300">
            <div className="p-6 md:p-8 border-b border-purple-50 flex justify-between items-center bg-purple-50/30">
              <h3 className="text-xl font-bold text-gray-800">
                {activeModal === 'terms' ? (lang === 'th' ? 'เงื่อนไขการใช้บริการสำหรับครีเอเตอร์' : 'Creator Terms of Service') : (lang === 'th' ? 'นโยบายความเป็นส่วนตัว' : 'Privacy Policy')}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-purple-600 font-bold text-2xl transition-colors leading-none">&times;</button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto text-sm text-gray-600 space-y-6">
              {/* Terms of Service */}
              {activeModal === 'terms' && (
                lang === 'th' ? (
                  <div className="space-y-4">
                    <div><span className="font-bold text-purple-600 text-base block mb-1">1. สิทธิ์ในผลงาน</span><p>รูปภาพ ผลงาน สินค้า และเนื้อหาทั้งหมดที่ครีเอเตอร์อัปโหลดขึ้นสู่ระบบ ถือเป็นทรัพย์สินทางปัญญาของเจ้าของผลงาน แพลตฟอร์มไม่มีกรรมสิทธิ์เหนือผลงานดังกล่าว</p></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">2. การละเมิดลิขสิทธิ์</span><p>ห้ามอัปโหลดผลงานที่:</p><ul className="list-disc pl-5 mt-2 space-y-1"><li>ลอกเลียนแบบ (Tracing)</li><li>แอบอ้างผลงานผู้อื่น</li><li>ละเมิดลิขสิทธิ์หรือทรัพย์สินทางปัญญา</li></ul><p className="mt-2 text-red-500 text-xs">หากตรวจพบ ผู้ดูแลระบบมีสิทธิ์ลบข้อมูลหรือระงับบัญชีทันที</p></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">3. นโยบายเกี่ยวกับ AI Art</span><p>เพื่อสนับสนุนชุมชนนักวาดและครีเอเตอร์ ไม่อนุญาตให้นำผลงานที่สร้างจาก Generative AI มาใช้เป็น:</p><ul className="list-disc pl-5 mt-2 space-y-1"><li>สินค้า</li><li>ภาพปก</li><li>ภาพโปรโมต</li><li>ภาพประกอบร้านค้า</li></ul></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">4. การจัดการเนื้อหา</span><p>ห้ามเผยแพร่:</p><ul className="list-disc pl-5 mt-2 space-y-1"><li>เนื้อหาที่ผิดกฎของงาน</li><li>เนื้อหาผิดกฎหมาย</li><li>เนื้อหารุนแรงหรือไม่เหมาะสม</li><li>เนื้อหาที่สร้างความเกลียดชัง</li><li>ข้อมูลหลอกลวงหรือแอบอ้าง</li></ul></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">5. ความรับผิดชอบของผู้ขาย</span><p>ผู้ขายเป็นผู้รับผิดชอบต่อรายละเอียดสินค้า ราคา การติดต่อกับลูกค้า การจัดส่งสินค้า และการแก้ไขปัญหาหลังการซื้อขาย ทางเว็บของเราไม่ได้มีการเปิดให้ซื้อขายโดยตรงเป็นเพียงตัวกลางที่ทำให้ผู้ใช้ได้เห็นสินค้าของทางครีเอเตอร์เท่านั้น</p></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">6. การระงับบัญชี</span><p>ผู้ดูแลระบบสามารถลบสินค้า ระงับร้านค้า หรือจำกัดสิทธิ์การใช้งานได้ทันที หากตรวจพบการกระทำที่ผิดกฎ</p></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">7. การเปลี่ยนแปลงบริการ</span><p>ผู้ดูแลระบบสามารถปรับปรุง เปลี่ยนแปลง หรือยกเลิกระบบได้ทุกเมื่อโดยไม่ต้องแจ้งล่วงหน้า</p></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div><span className="font-bold text-purple-600 text-base block mb-1">1. Intellectual Property</span><p>All images, artworks, products, and content uploaded by the creator remain the intellectual property of the owner. The platform claims no ownership over such works.</p></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">2. Copyright Infringement</span><p>Do not upload works that involve:</p><ul className="list-disc pl-5 mt-2 space-y-1"><li>Tracing</li><li>Impersonation of others' works</li><li>Copyright or IP infringement</li></ul><p className="mt-2 text-red-500 text-xs">If detected, admins reserve the right to delete content or suspend accounts immediately.</p></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">3. AI Art Policy</span><p>To support the artist community, artworks generated by Generative AI are prohibited from being used as:</p><ul className="list-disc pl-5 mt-2 space-y-1"><li>Products</li><li>Cover images</li><li>Promotional materials</li><li>Store illustrations</li></ul></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">4. Content Management</span><p>Do not publish content that is:</p><ul className="list-disc pl-5 mt-2 space-y-1"><li>Violating event rules</li><li>Illegal</li><li>Violent or inappropriate</li><li>Hate speech</li><li>Misleading or fraudulent</li></ul></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">5. Seller Responsibility</span><p>Sellers are solely responsible for product details, pricing, customer communication, shipping, and dispute resolution. Our website does not facilitate direct transactions but acts only as an intermediary catalog.</p></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">6. Account Suspension</span><p>Administrators may delete products, suspend stores, or restrict access immediately upon detecting rule violations.</p></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">7. Service Changes</span><p>Administrators may update, modify, or discontinue the system at any time without prior notice.</p></div>
                  </div>
                )
              )}
              {/* Privacy Policy */}
              {activeModal === 'privacy' && (
                lang === 'th' ? (
                  <div className="space-y-4">
                    <div><span className="font-bold text-purple-600 text-base block mb-1">1. ข้อมูลสาธารณะ</span><p>ข้อมูลต่อไปนี้อาจถูกแสดงต่อสาธารณะ:</p><ul className="list-disc pl-5 mt-2 space-y-1"><li>ชื่อบูธ และ นามปากกา</li><li>รูปภาพสินค้าและรายละเอียด</li><li>ลิงก์โซเชียลมีเดียที่ครีเอเตอร์กรอกไว้</li></ul></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">2. ข้อมูลภายในระบบ</span><p>ข้อมูลส่วนตัว เช่น Email และข้อมูลยืนยันตัวตน จะถูกใช้เพื่อการเข้าสู่ระบบ ยืนยันตัวตน และการเข้าถึงระบบหลังบ้านเท่านั้น จะไม่ถูกเผยแพร่สู่สาธารณะ</p></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">3. บริการภายนอก</span><p>เว็บไซต์อาจใช้บริการจากบุคคลที่สาม เช่น Firebase หรือ Cloudinary เพื่อช่วยในการจัดเก็บข้อมูลและประมวลผลระบบ</p></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">4. การตรวจสอบเนื้อหา</span><p>ผู้ดูแลระบบอาจตรวจสอบ ลบ หรือจำกัดการแสดงผลของเนื้อหาที่ผิดกฎหรือถูกรายงานโดยผู้ใช้งาน</p></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">5. คำเตือนด้านความปลอดภัย</span><p>ระบบนี้เป็นโปรเจกต์เพื่อการศึกษา กรุณาอย่าใช้รหัสผ่านเดียวกับบัญชีร้านค้า บัญชีโซเชียลหลัก หรือบัญชีธนาคารของคุณ</p></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div><span className="font-bold text-purple-600 text-base block mb-1">1. Public Data</span><p>The following information may be displayed publicly:</p><ul className="list-disc pl-5 mt-2 space-y-1"><li>Booth name & Pen name</li><li>Product images & details</li><li>Social media links provided</li></ul></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">2. Internal Data</span><p>Personal data such as Email and verification details will be used for login, identity verification, and backend access only. It will not be published publicly.</p></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">3. Third-Party Services</span><p>The website may use third-party services like Firebase or Cloudinary to help store data and process the system.</p></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">4. Content Moderation</span><p>Administrators may review, delete, or restrict the display of content that violates rules or is reported by users.</p></div>
                    <div><span className="font-bold text-purple-600 text-base block mb-1">5. Security Warning</span><p>This system is an educational project. Please do not use the same password as your primary store, main social media, or bank accounts.</p></div>
                  </div>
                )
              )}
            </div>
            <div className="p-6 md:p-8 border-t border-purple-50 bg-gray-50/50">
              <button onClick={() => setActiveModal(null)} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-purple-200">
                {lang === 'th' ? 'ปิดหน้านี้' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-purple-900/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl flex flex-col items-center text-center border border-purple-50">
            <div className="w-20 h-20 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-6 text-3xl">📩</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              {lang === 'th' ? 'ส่งคำขอสำเร็จ!' : 'Application Submitted!'}
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
               {lang === 'th' 
                 ? 'ข้อมูลของคุณถูกส่งแล้ว แต่บัญชีจะยังใช้งานไม่ได้ กรุณาทักแอดมินผ่านช่องทางด้านล่างเพื่อยืนยันตัวตน โดยใช้แอคเคาท์ที่ให้ไว้ในฟอร์มทักมาเท่านั้น พร้อมแจ้งอีเมลที่ใช้สมัคร' 
                 : 'Your data has been sent, but your account is not yet active. Please contact the admin via the channels below to verify your identity. You must use the social media account provided in the form to contact us along with your registered email.'}
            </p>
            
            <div className="w-full space-y-3 mb-6">
              <a href="https://x.com/projectogetherr" target="_blank" rel="noreferrer" className="block w-full bg-black text-white py-3 rounded-2xl font-bold hover:bg-gray-800 transition-colors">
                {lang === 'th' ? 'ทัก X (Twitter)' : 'Contact via X'}
              </a>
              <a href="https://www.facebook.com/share/18wasfCsjM/" target="_blank" rel="noreferrer" className="block w-full bg-blue-600 text-white py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors">
                {lang === 'th' ? 'ทัก Facebook' : 'Contact via Facebook'}
              </a>
            </div>

            <button onClick={() => { setShowPopup(false); setCurrentPage('sellerlogin'); }} className="text-purple-500 font-bold hover:underline">
              {lang === 'th' ? 'กลับไปหน้าเข้าสู่ระบบ' : 'Back to Login'}
            </button>
          </div>
        </div>
      )}

      {/* UI กล่องแจ้งเตือน Error ที่เพิ่มเข้ามาใหม่ เป็นธีมสีม่วง */}
      {alertPopup.isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-purple-900/20 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center border border-purple-50">
            <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-500 flex items-center justify-center mb-5 text-2xl font-black animate-pulse">!</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{lang === 'th' ? 'แจ้งเตือน' : 'Alert'}</h3>
            <p className="text-gray-500 mb-8 leading-relaxed font-medium">{alertPopup.message}</p>
            <button 
              onClick={() => setAlertPopup({ isOpen: false, message: '' })} 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-purple-100"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Sellersignup;