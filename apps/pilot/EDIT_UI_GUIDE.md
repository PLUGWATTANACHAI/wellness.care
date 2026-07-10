# Wellnest UI Preview แก้เองเร็ว

ไฟล์ที่พี่แก้บ่อยมี 2 ไฟล์นี้:

1. `src/ui-content.js`
   - แก้ข้อความบนหน้า Login/Home
   - แก้ชื่อบริการ ราคา โปรโมชัน และ provider

2. `src/styles.css`
   - แก้สี ขนาด และระยะห่าง
   - จุดที่แก้ง่ายที่สุดอยู่บนสุดใน `:root`

ตัวอย่างที่แก้ได้ใน `src/styles.css`:

```css
--app-width: 390px;
--app-height: 844px;
--page-background: #eee4d6;
--phone-background: #fbf7f0;
--text-main: #2f2118;
--brand-brown: #6d4c2f;
--screen-padding: 18px;
```

หลังแก้ไฟล์แล้ว ถ้าหน้า preview เปิดอยู่ ให้กด refresh ที่:

`http://127.0.0.1:5174/`

ถ้าหน้าไม่อัปเดตหรือเปิดไม่ได้ ให้บอกเอ็นว่า "เปิด preview ให้ใหม่" ได้เลย
