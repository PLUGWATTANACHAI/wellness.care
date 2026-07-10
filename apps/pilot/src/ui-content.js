export const appContent = {
  preview: {
    title: "Mobile preview",
    sizeLabel: "Frame 390 × 844 px",
  },
  login: {
    brand: "Wellnest",
    title: "บริการดูแลตัวเองถึงคอนโด",
    subtitle: "ล็อกอินเพื่อดูบริการ โปรโมชั่น และจองผู้ให้บริการใกล้พี่",
    loginLabel: "อีเมล หรือ เบอร์โทรศัพท์",
    loginPlaceholder: "plug@example.com หรือ 0812345678",
    passcodeLabel: "รหัสเข้าใช้งาน",
    passcodePlaceholder: "ใส่รหัสผ่านหรือ OTP",
    signInButton: "Sign in",
    createAccountButton: "Create account",
    socialDivider: "หรือเข้าสู่ระบบด้วย",
    note: "รอบ production จะเชื่อม Apple ID, Facebook และ Gmail จริง ส่วนตอนนี้ปุ่ม Sign in และ Create account ใช้พาเข้า flow เพื่อดูหน้าตาแอพก่อน",
  },
  signup: {
    brand: "Wellnest",
    title: "สร้างบัญชี Wellnest",
    subtitle: "ใช้ข้อมูลนี้เพื่อจองบริการ แจ้งเตือน และดูแลความปลอดภัยระหว่างการให้บริการ",
    nameLabel: "ชื่อที่ใช้เรียก",
    namePlaceholder: "เช่น Plug",
    emailLabel: "อีเมล",
    emailPlaceholder: "plug@example.com",
    phoneLabel: "เบอร์โทรศัพท์",
    phonePlaceholder: "0812345678",
    passcodeLabel: "ตั้งรหัสเข้าใช้งาน",
    passcodePlaceholder: "อย่างน้อย 6 ตัว",
    createButton: "Create account",
    signInLink: "มีบัญชีแล้ว? Sign in",
    note: "ขั้นตอนจริงจะเพิ่มการยืนยัน OTP/Email และขอ consent ก่อนเปิดใช้งานจริง",
  },
  home: {
    greeting: "พร้อมดูแลพี่วันนี้",
    brand: "Wellnest",
    location: "Sathorn · Bangkok",
    heroLabel: "Available tonight",
    heroTitle: "บริการ wellness ส่วนตัวถึงคอนโด",
    heroSubtitle: "เลือกบริการ เวลาที่สะดวก และยืนยันพื้นที่ ระบบจะจับคู่ผู้ให้บริการที่พร้อมใกล้พี่",
    heroButton: "เริ่มจองบริการ",
    servicesTitle: "บริการ",
    viewAllButton: "ดูทั้งหมด",
    promoTitle: "โปรวันนี้",
    providerTitle: "ผู้ให้บริการใกล้พี่",
    recentTitle: "การจองล่าสุด",
    recentBooking: "ยังไม่มีการจองล่าสุด",
  },
};

export const services = [
  { id: "massage", name: "นวดผ่อนคลาย", desc: "90 นาที · เหมาะหลังเลิกงาน", price: 1290, tag: "Popular" },
  { id: "aroma", name: "Aroma Recovery", desc: "120 นาที · ผ่อนคลายลึก", price: 1890, tag: "Premium" },
  { id: "product", name: "Wellness Kit", desc: "สินค้า wellness ส่งถึงคอนโด", price: 690, tag: "Product" },
  { id: "stretch", name: "Office Stretch", desc: "60 นาที · ลดออฟฟิศซินโดรม", price: 990, tag: "New" },
];

export const promos = [
  { title: "First booking", desc: "ลด 120 บาทสำหรับการจองครั้งแรก" },
  { title: "After work care", desc: "ช่วง 18:00-21:00 มี provider เพิ่ม" },
];

export const providers = [
  { name: "Mina", rating: "4.92", eta: "18 นาที", jobs: "318" },
  { name: "Narin", rating: "4.88", eta: "24 นาที", jobs: "204" },
];
