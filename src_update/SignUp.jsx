// src/SignUp.jsx
import React, { useState } from 'react';
import { useLanguage } from './LanguageContext';
import { auth, db } from './firebase'; 
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

function SignUp({ setCurrentPage, setUser }) {
  const { t, lang, setLang } = useLanguage();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPopup, setShowPopup] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  
  // เพิ่ม State สำหรับจัดการ Alert Popup
  const [alertPopup, setAlertPopup] = useState({ isOpen: false, message: '' });

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    // แทนที่ alert() ด้วย setAlertPopup()
    if (password !== confirmPassword) {
      setAlertPopup({ isOpen: true, message: lang === 'th' ? "รหัสผ่านไม่ตรงกัน" : "Passwords do not match" });
      return;
    }
    if (!agreed) {
      setAlertPopup({ isOpen: true, message: lang === 'th' ? "กรุณายอมรับเงื่อนไขก่อนสมัครสมาชิก" : "Please accept the terms and conditions" });
      return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        username: username,
        email: email,
        role: 'user',
        createdAt: new Date()
      });

      setShowPopup(true);
    } catch (error) {
      console.error(error);
      // แทนที่ alert() แจ้งเตือน Error
      setAlertPopup({ isOpen: true, message: lang === 'th' ? "เกิดข้อผิดพลาด: อีเมลนี้อาจถูกใช้งานไปแล้ว" : "Error: " + error.message });
    }
  };

  return (
    <div className="min-h-screen bg-pink-50/30 flex flex-col items-center pt-10 px-4 relative">
      
      <div className="flex justify-between items-center w-full max-w-md mb-6">
        <button onClick={() => setCurrentPage('landing')} className="flex items-center gap-2 text-gray-400 hover:text-pink-500 transition-colors font-medium">
          <span className="text-xl">←</span> {lang === 'th' ? 'กลับ' : 'Back'}
        </button>

        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-pink-100 z-10">
          <button onClick={() => setLang('th')} className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${lang === 'th' ? 'bg-pink-500 text-white shadow-md' : 'text-pink-300 hover:text-pink-500'}`}>TH</button>
          <button onClick={() => setLang('en')} className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${lang === 'en' ? 'bg-pink-500 text-white shadow-md' : 'text-pink-300 hover:text-pink-500'}`}>EN</button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-pink-100/50 border border-pink-50 w-full max-w-md">
        <h2 className="text-3xl font-black text-gray-800 mb-6 tracking-tight">
          <span className="text-pink-500">{t('Sign Up')}</span>
        </h2>
        
        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <div className="space-y-3">
            <input type="text" placeholder='username' required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-4 border border-pink-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-400 bg-pink-50/30 transition-all placeholder:text-pink-200" />
            <input type="email" placeholder='email' required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 border border-pink-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-400 bg-pink-50/30 transition-all placeholder:text-pink-200" />
            <input type="password" placeholder='password' required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 border border-pink-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-400 bg-pink-50/30 transition-all placeholder:text-pink-200" />
            <input type="password" placeholder='confirm password' required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-4 border border-pink-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-400 bg-pink-50/30 transition-all placeholder:text-pink-200" />
          </div>

          <div className="mt-2 py-4 px-3 sm:px-4 bg-pink-50/50 rounded-2xl border border-pink-100">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 rounded-lg border-pink-200 text-pink-500 focus:ring-pink-400 cursor-pointer" />
              <div className="flex flex-wrap items-center text-[10.5px] sm:text-xs text-gray-600 gap-x-1 leading-relaxed">
                <span>{lang === 'th' ? 'ยอมรับ' : 'I accept the'}</span>
                <button type="button" onClick={(e) => { e.preventDefault(); setActiveModal('terms'); }} className="text-pink-600 font-bold hover:underline">{lang === 'th' ? 'เงื่อนไขการใช้บริการ' : 'Terms of Service'}</button> 
                <span>{lang === 'th' ? 'และ' : '&'}</span>
                <button type="button" onClick={(e) => { e.preventDefault(); setActiveModal('privacy'); }} className="text-pink-600 font-bold hover:underline">{lang === 'th' ? 'นโยบายความเป็นส่วนตัว' : 'Privacy Policy'}</button>
              </div>
            </label>
          </div>

          <button type="submit" disabled={!agreed} className={`w-full py-4 mt-2 rounded-2xl font-bold transition-all shadow-lg text-lg ${agreed ? "bg-pink-500 text-white hover:bg-pink-600 active:scale-95 shadow-pink-200" : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"}`}>
            {lang === 'th' ? 'สมัครสมาชิก' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {lang === 'th' ? 'มีบัญชีอยู่แล้วใช่หรือไม่?' : 'Already have an account?'} 
          <span onClick={() => setCurrentPage('login')} className="ml-2 text-pink-500 cursor-pointer hover:underline font-bold">
            {lang === 'th' ? 'คลิกที่นี่!' : 'Click Here!'}
          </span>
        </p>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-pink-900/20 backdrop-blur-md px-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-pink-100 animate-in fade-in zoom-in duration-300">
            <div className="p-6 md:p-8 border-b border-pink-50 flex justify-between items-center bg-pink-50/30">
              <h3 className="text-xl font-bold text-gray-800">
                {activeModal === 'terms' ? (lang === 'th' ? 'เงื่อนไขการใช้บริการ (Terms of Service)' : 'Terms of Service') : (lang === 'th' ? 'นโยบายความเป็นส่วนตัว (Privacy Policy)' : 'Privacy Policy')}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-pink-500 font-bold text-2xl transition-colors leading-none">&times;</button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto text-sm text-gray-600 space-y-6">
              {/* Terms of Service */}
              {activeModal === 'terms' && (
                lang === 'th' ? (
                  <div className="space-y-4">
                    <div><span className="font-bold text-pink-500 text-base block mb-1">1. วัตถุประสงค์ของแพลตฟอร์ม</span><p>Art List เป็นแพลตฟอร์มสำหรับแสดงข้อมูลร้านค้า แผนผังบูธ และแคตตาล็อกสินค้าภายในงานอีเวนต์เท่านั้น ระบบไม่มีการรับชำระเงินหรือดำเนินธุรกรรมซื้อขายผ่านหน้าเว็บไซต์โดยตรง</p></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">2. ความรับผิดชอบเกี่ยวกับการซื้อขาย</span><p>การซื้อขาย การชำระเงิน การจัดส่งสินค้า หรือข้อพิพาทต่าง ๆ เป็นความรับผิดชอบระหว่างผู้ซื้อและผู้ขายโดยตรง ทางแพลตฟอร์มไม่มีส่วนเกี่ยวข้องและไม่รับประกันธุรกรรมดังกล่าว</p></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">3. ข้อกำหนดการใช้งาน</span><p>ผู้ใช้ต้องใช้งานระบบอย่างสุภาพ และห้ามกระทำการดังต่อไปนี้:</p><ul className="list-disc pl-5 mt-2 space-y-1"><li>ใช้โปรแกรมอัตโนมัติ (Bot)</li><li>ส่งข้อมูลสแปมหรือก่อกวนระบบ</li><li>พยายามเข้าถึงข้อมูลของผู้อื่นโดยไม่ได้รับอนุญาต</li><li>กระทำการที่ส่งผลเสียต่อความปลอดภัยหรือเสถียรภาพของเว็บไซต์</li></ul></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">4. การระงับสิทธิ์การใช้งาน</span><p>ผู้ดูแลระบบขอสงวนสิทธิ์ในการระงับ ลบบัญชี หรือจำกัดการเข้าถึงระบบของผู้ใช้งานที่ละเมิดกฎโดยไม่ต้องแจ้งให้ทราบล่วงหน้า</p></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">5. การเปลี่ยนแปลงบริการ</span><p>ผู้ดูแลระบบสามารถปรับปรุง แก้ไข หรือยกเลิกบริการ รวมถึงเปลี่ยนแปลงเงื่อนไขการใช้งานได้ทุกเมื่อโดยไม่ต้องแจ้งล่วงหน้า</p></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">6. ความต่อเนื่องของระบบ</span><p>ระบบอาจมีการปิดปรับปรุง หยุดให้บริการชั่วคราว หรือเกิดข้อผิดพลาดทางเทคนิคได้ ทางผู้พัฒนาไม่รับประกันว่าระบบจะสามารถใช้งานได้ตลอดเวลาโดยไม่มีปัญหา</p></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">7. ข้อกำหนดด้านอายุ</span><p>ผู้ใช้งานควรมีอายุมากกว่า 13 ปีก่อนใช้งานระบบ เนื่องจากอาจมีผลงานบางส่วนที่มีเนื้อหาล่อแหลม</p></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div><span className="font-bold text-pink-500 text-base block mb-1">1. Platform Purpose</span><p>Art List is a platform designed to display event booth information, booth maps, and product catalogs only. The website does not process payments or handle direct transactions.</p></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">2. Transaction Responsibility</span><p>All purchases, payments, deliveries, and disputes are handled directly between buyers and sellers. The platform is not responsible for or involved in such transactions.</p></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">3. User Conduct</span><p>Users agree to use the platform responsibly. The following actions are prohibited:</p><ul className="list-disc pl-5 mt-2 space-y-1"><li>Using automated scripts or bots</li><li>Spamming or disrupting the system</li><li>Attempting unauthorized access to other users’ data</li><li>Any action that harms the website’s security or stability</li></ul></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">4. Account Suspension</span><p>Administrators reserve the right to suspend, remove, or restrict access to accounts that violate the platform rules without prior notice.</p></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">5. Service Changes</span><p>Administrators may modify, update, or discontinue the platform and its terms at any time without prior notice.</p></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">6. Service Availability</span><p>The platform may experience maintenance, temporary downtime, or unexpected technical issues. Continuous or uninterrupted service is not guaranteed.</p></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">7. Age Requirement</span><p>Users should be over 13 years old before using the platform, as some content may be sensitive or inappropriate.</p></div>
                  </div>
                )
              )}
              {/* Privacy Policy */}
              {activeModal === 'privacy' && (
                lang === 'th' ? (
                  <div className="space-y-4">
                    <div><span className="font-bold text-pink-500 text-base block mb-1">1. ข้อมูลที่จัดเก็บ</span><p>ระบบจะจัดเก็บเฉพาะข้อมูลที่จำเป็นต่อการใช้งาน ได้แก่:</p><ul className="list-disc pl-5 mt-2 space-y-1"><li>Username</li><li>Email Address</li><li>Wishlist</li><li>Cart</li><li>ประวัติการใช้งานบางส่วนที่เกี่ยวข้องกับฟังก์ชันของระบบ</li></ul></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">2. การใช้ข้อมูล</span><p>ข้อมูลที่จัดเก็บจะถูกใช้เพื่อ:</p><ul className="list-disc pl-5 mt-2 space-y-1"><li>การเข้าสู่ระบบ</li><li>การบันทึกข้อมูลการใช้งาน</li><li>การแสดงผลฟีเจอร์ภายในเว็บไซต์</li></ul></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">3. การปกป้องข้อมูล</span><p>เราจะพยายามปกป้องข้อมูลของผู้ใช้งานตามสมควร และจะไม่ขายข้อมูลส่วนตัวให้บุคคลภายนอก อย่างไรก็ตามทางเราไม่สามารถรับประกันความปลอดภัยได้อย่างสมบูรณ์</p></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">4. บริการจากบุคคลที่สาม</span><p>เว็บไซต์อาจใช้บริการจากผู้ให้บริการภายนอก เช่น Firebase หรือ Cloudinary เพื่อช่วยในการจัดเก็บข้อมูลและการทำงานของระบบ</p></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">5. การรายงานปัญหา</span><p>หากพบเนื้อหาที่ไม่เหมาะสม การละเมิดลิขสิทธิ์ หรือการใช้งานที่ผิดกฎ ผู้ใช้สามารถติดต่อผู้ดูแลระบบเพื่อดำเนินการตรวจสอบได้</p></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">6. คำเตือนด้านความปลอดภัย</span><p>เว็บไซต์นี้ถูกพัฒนาขึ้นเพื่อการศึกษา กรุณาหลีกเลี่ยงการใช้รหัสผ่านเดียวกับบัญชีสำคัญ เช่น ธนาคาร โซเชียลมีเดีย หรือบัญชีหลักอื่น ๆ ของคุณ</p></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div><span className="font-bold text-pink-500 text-base block mb-1">1. Data Collection</span><p>The platform collects only the minimum necessary information, including:</p><ul className="list-disc pl-5 mt-2 space-y-1"><li>Username</li><li>Email Address</li><li>Wishlist</li><li>Cart</li><li>Certain usage history related to website functionality</li></ul></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">2. Data Usage</span><p>Collected data may be used for:</p><ul className="list-disc pl-5 mt-2 space-y-1"><li>Authentication and login</li><li>Saving user preferences and activity</li><li>Supporting website features and functionality</li></ul></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">3. Data Protection</span><p>We will make reasonable efforts to protect user information and do not sell personal data to third parties. However, no internet-based system can guarantee complete security.</p></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">4. Third-Party Services</span><p>The platform may use third-party services such as Firebase or Cloudinary for data storage and website functionality.</p></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">5. Reporting Content</span><p>Users may contact administrators to report inappropriate content, copyright infringement, or rule violations for review.</p></div>
                    <div><span className="font-bold text-pink-500 text-base block mb-1">6. Security Warning</span><p>This website is developed as an educational project. Please avoid using passwords that are linked to your bank accounts, social media accounts, or other sensitive services.</p></div>
                  </div>
                )
              )}
            </div>
            <div className="p-6 md:p-8 border-t border-pink-50 bg-gray-50/50">
              <button onClick={() => setActiveModal(null)} className="w-full py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-pink-200">
                {t('popupOk') || (lang === 'th' ? 'รับทราบ' : 'Acknowledge')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup สมัครสำเร็จ */}
      {showPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-pink-900/20 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl flex flex-col items-center text-center border border-pink-50">
            <div className="w-20 h-20 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center mb-6 text-3xl">✨</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">{t('popupSuccess')}</h3>
            <p className="text-gray-500 mb-8 leading-relaxed">
               {lang === 'th' ? 'สมัครสมาชิกสำเร็จ ยินดีต้อนรับสู่ Art List!' : 'Sign up successful, welcome to Art List!'}
            </p>
            <button onClick={() => { setShowPopup(false); setCurrentPage('login'); }} className="w-full bg-pink-500 hover:bg-pink-600 transition-colors text-white font-bold py-4 rounded-2xl shadow-lg shadow-pink-200">
              {t('login')}
            </button>
          </div>
        </div>
      )}

      {/* UI กล่องแจ้งเตือน Error ที่เพิ่มเข้ามาใหม่ (ใช้ร่วมกับ state alertPopup) */}
      {alertPopup.isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-pink-900/20 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center border border-pink-50">
            <div className="w-16 h-16 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center mb-5 text-2xl font-black animate-pulse">!</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{lang === 'th' ? 'แจ้งเตือน' : 'Alert'}</h3>
            <p className="text-gray-500 mb-8 leading-relaxed font-medium">{alertPopup.message}</p>
            <button 
              onClick={() => setAlertPopup({ isOpen: false, message: '' })} 
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-pink-100"
            >
              {t('popupOk') || 'OK'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default SignUp;