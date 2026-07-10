import "./styles.css";

const services = [
  { id: "massage", name: "นวดผ่อนคลาย", desc: "90 นาที · เหมาะหลังเลิกงาน", price: 1290, tag: "Popular" },
  { id: "aroma", name: "Aroma Recovery", desc: "120 นาที · ผ่อนคลายลึก", price: 1890, tag: "Premium" },
  { id: "product", name: "Wellness Kit", desc: "สินค้า wellness ส่งถึงคอนโด", price: 690, tag: "Product" },
  { id: "stretch", name: "Office Stretch", desc: "60 นาที · ลดออฟฟิศซินโดรม", price: 990, tag: "New" },
];

const promos = [
  { title: "First booking", desc: "ลด 120 บาทสำหรับการจองครั้งแรก" },
  { title: "After work care", desc: "ช่วง 18:00-21:00 มี provider เพิ่ม" },
];

const providers = [
  { name: "Mina", rating: "4.92", eta: "18 นาที", jobs: "318" },
  { name: "Narin", rating: "4.88", eta: "24 นาที", jobs: "204" },
];

const state = {
  signedIn: false,
  screen: "home",
  step: 1,
  phone: "",
  serviceId: "massage",
  date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  time: "19:30",
  address: "The Line Sathorn, Tower A",
  placeConfirmed: false,
  payment: "promptpay",
  bookingCode: "",
};

function currency(value) {
  return value.toLocaleString("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function selectedService() {
  return services.find((service) => service.id === state.serviceId) || services[0];
}

function progressWidth() {
  return `${Math.max(25, state.step * 25)}%`;
}

function loginScreen() {
  return `
    <section class="loginScreen">
      <div class="loginHero">
        <span>Wellnest</span>
        <h1>บริการดูแลตัวเองถึงคอนโด</h1>
        <p>ล็อกอินเพื่อดูบริการ โปรโมชั่น และจองผู้ให้บริการใกล้พี่</p>
      </div>
      <div class="loginOptions">
        <button class="authButton apple" data-action="future-auth">Continue with Apple</button>
        <button class="authButton facebook" data-action="future-auth">Continue with Facebook</button>
        <button class="authButton email" data-action="future-auth">Continue with Email</button>
      </div>
      <div class="divider"><span>หรือรอบทดสอบ</span></div>
      <label class="fieldLabel">เบอร์โทรศัพท์
        <input data-field="phone" inputmode="tel" placeholder="0812345678" value="${escapeHtml(state.phone)}" />
      </label>
      <button class="primaryButton" data-action="login">เข้าสู่ระบบ</button>
      <p class="finePrint">Apple ID, Facebook และ Email จะเชื่อมต่อจริงใน production ส่วนรอบนี้ใช้เบอร์เพื่อทดสอบ flow ก่อน</p>
    </section>
  `;
}

function homeScreen() {
  return `
    <section class="homeScreen">
      <header class="appHeader">
        <div>
          <p>พร้อมดูแลพี่วันนี้</p>
          <h1>Wellnest</h1>
        </div>
        <button class="profileButton" data-action="profile" aria-label="Profile">P</button>
      </header>

      <div class="walletStrip">
        <div><span>Coins</span><strong>240</strong></div>
        <div><span>Points</span><strong>1,850</strong></div>
        <div><span>Tier</span><strong>Member</strong></div>
      </div>

      <article class="heroCard">
        <span>Today available</span>
        <h2>จองบริการที่บ้านได้ในไม่กี่ขั้นตอน</h2>
        <p>เลือกบริการ เวลา และสถานที่ ระบบจะจับคู่ผู้ให้บริการที่พร้อมใกล้พี่</p>
        <button data-action="start-booking">เริ่มจองบริการ</button>
      </article>

      <section class="homeSection">
        <div class="sectionTitle">
          <h2>บริการ</h2>
          <button data-action="start-booking">ดูทั้งหมด</button>
        </div>
        <div class="serviceScroller">
          ${services.map(serviceCard).join("")}
        </div>
      </section>

      <section class="homeSection">
        <div class="sectionTitle">
          <h2>โปรวันนี้</h2>
        </div>
        <div class="promoList">${promos.map((promo) => `
          <article class="promoCard">
            <strong>${promo.title}</strong>
            <p>${promo.desc}</p>
          </article>
        `).join("")}</div>
      </section>

      <section class="homeSection">
        <div class="sectionTitle">
          <h2>ผู้ให้บริการใกล้พี่</h2>
        </div>
        <div class="providerList">${providers.map(providerCard).join("")}</div>
      </section>
    </section>
  `;
}

function bookingScreen() {
  const service = selectedService();
  const safeAddress = escapeHtml(state.address);
  return `
    <section class="bookingScreen">
      <header class="appHeader compact">
        <button class="backButton" data-action="go-home" aria-label="Back">‹</button>
        <div>
          <p>Booking</p>
          <h1>จองบริการ</h1>
        </div>
      </header>
      <div class="progressPanel">
        <div class="progressTrack"><span style="width:${progressWidth()}"></span></div>
        <div class="stepTabs">
          <button class="${state.step === 1 ? "active" : ""}" data-action="step" data-step="1">บริการ</button>
          <button class="${state.step === 2 ? "active" : ""}" data-action="step" data-step="2">เวลา</button>
          <button class="${state.step === 3 ? "active" : ""}" data-action="step" data-step="3">ยืนยัน</button>
          <button class="${state.step === 4 ? "active" : ""}" data-action="step" data-step="4">ติดตาม</button>
        </div>
      </div>

      ${state.step === 1 ? `
        <div class="screenBlock">
          <h2>เลือกบริการ</h2>
          <div class="serviceGrid">${services.map(serviceCard).join("")}</div>
          <button class="primaryButton" data-action="step" data-step="2">เลือกวันเวลา</button>
        </div>
      ` : ""}

      ${state.step === 2 ? `
        <div class="screenBlock">
          <h2>วัน เวลา และสถานที่</h2>
          <div class="formGrid">
            <label class="fieldLabel">วันที่<input type="date" data-field="date" value="${state.date}" /></label>
            <label class="fieldLabel">เวลา<input type="time" data-field="time" value="${state.time}" /></label>
            <label class="fieldLabel wide">คอนโด / ที่อยู่<input data-field="address" value="${safeAddress}" /></label>
          </div>
          <div class="mapCard">
            <div class="pin"></div>
            <div>
              <strong>${safeAddress}</strong>
              <p>${state.placeConfirmed ? "ยืนยันสถานที่แล้ว" : "กดยืนยันหลังตรวจตำแหน่ง"}</p>
            </div>
          </div>
          <div class="actionRow">
            <button class="secondaryButton" data-action="open-maps">ค้นหา Google Maps</button>
            <button class="secondaryButton ${state.placeConfirmed ? "confirmed" : ""}" data-action="confirm-place">ยืนยันพื้นที่</button>
          </div>
          <button class="primaryButton" data-action="step" data-step="3">ตรวจสอบรายการ</button>
        </div>
      ` : ""}

      ${state.step === 3 ? `
        <div class="screenBlock">
          <h2>ตรวจสอบก่อนชำระเงิน</h2>
          <div class="summaryList">
            <div><span>บริการ</span><strong>${service.name}</strong></div>
            <div><span>วันเวลา</span><strong>${state.date} · ${state.time}</strong></div>
            <div><span>สถานที่</span><strong>${safeAddress}</strong></div>
            <div><span>ผู้ให้บริการ</span><strong>Mina · 18 นาที</strong></div>
            <div><span>ยอดชำระ</span><strong>${currency(service.price)}</strong></div>
          </div>
          <div class="paymentSwitch">
            <button class="${state.payment === "promptpay" ? "active" : ""}" data-action="payment" data-payment="promptpay">PromptPay / QR</button>
            <button class="${state.payment === "card" ? "active" : ""}" data-action="payment" data-payment="card">บัตรเครดิต</button>
          </div>
          <button class="primaryButton" data-action="pay">${state.payment === "promptpay" ? "สร้าง QR ชำระเงิน" : "ชำระด้วยบัตร"}</button>
        </div>
      ` : ""}

      ${state.step === 4 ? `
        <div class="screenBlock">
          <h2>ติดตามผู้ให้บริการ</h2>
          <div class="trackingCard">
            <div class="routeLine"><span></span><span></span><span></span></div>
            <strong>${state.bookingCode || "WN-45821"}</strong>
            <p>Mina กำลังเดินทางไปยัง ${safeAddress}</p>
            <mark>ETA 18 นาที</mark>
          </div>
          <button class="secondaryButton" data-action="go-home">กลับหน้า Home</button>
        </div>
      ` : ""}
    </section>
  `;
}

function serviceCard(service) {
  const active = service.id === state.serviceId;
  return `
    <button class="serviceCard ${active ? "selected" : ""}" data-action="select-service" data-service="${service.id}">
      <span>${service.tag}</span>
      <strong>${service.name}</strong>
      <small>${service.desc}</small>
      <b>${currency(service.price)}</b>
    </button>
  `;
}

function providerCard(provider) {
  return `
    <article class="providerCard">
      <div class="avatar">${provider.name.slice(0, 1)}</div>
      <div>
        <strong>${provider.name}</strong>
        <p>${provider.jobs} jobs · ${provider.rating} คะแนน</p>
      </div>
      <span>${provider.eta}</span>
    </article>
  `;
}

function render() {
  document.querySelector("#app").innerHTML = `
    <main class="previewShell">
      <div class="previewInfo">
        <strong>Mobile preview</strong>
        <span>Frame 390 × 844 px</span>
      </div>
      <div class="phoneFrame" aria-label="Wellnest mobile app preview">
        ${state.signedIn ? (state.screen === "booking" ? bookingScreen() : homeScreen()) : loginScreen()}
        ${state.signedIn ? bottomNav() : ""}
      </div>
    </main>
  `;
  bindEvents();
}

function bottomNav() {
  const items = [
    ["home", "Home"],
    ["activity", "Activity"],
    ["wallet", "Wallet"],
    ["profile", "Profile"],
  ];
  return `
    <nav class="bottomNav">
      ${items.map(([screen, label]) => `<button class="${state.screen === screen ? "active" : ""}" data-action="nav" data-screen="${screen}">${label}</button>`).join("")}
    </nav>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", (event) => {
      state[input.dataset.field] = event.target.value;
      render();
    });
  });
  document.querySelector("[data-action='login']")?.addEventListener("click", () => {
    state.signedIn = true;
    state.screen = "home";
    render();
  });
  document.querySelectorAll("[data-action='future-auth']").forEach((button) => {
    button.addEventListener("click", () => {
      state.phone = "0812345678";
      render();
    });
  });
  document.querySelectorAll("[data-action='select-service']").forEach((button) => {
    button.addEventListener("click", () => {
      state.serviceId = button.dataset.service;
      render();
    });
  });
  document.querySelectorAll("[data-action='step']").forEach((button) => {
    button.addEventListener("click", () => {
      state.step = Number(button.dataset.step);
      state.screen = "booking";
      render();
    });
  });
  document.querySelectorAll("[data-action='start-booking']").forEach((button) => {
    button.addEventListener("click", () => {
      state.screen = "booking";
      state.step = 1;
      render();
    });
  });
  document.querySelector("[data-action='go-home']")?.addEventListener("click", () => {
    state.screen = "home";
    render();
  });
  document.querySelector("[data-action='profile']")?.addEventListener("click", () => {
    state.screen = "profile";
    render();
  });
  document.querySelector("[data-action='confirm-place']")?.addEventListener("click", () => {
    state.placeConfirmed = true;
    render();
  });
  document.querySelector("[data-action='open-maps']")?.addEventListener("click", () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(state.address)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  });
  document.querySelectorAll("[data-action='payment']").forEach((button) => {
    button.addEventListener("click", () => {
      state.payment = button.dataset.payment;
      render();
    });
  });
  document.querySelector("[data-action='pay']")?.addEventListener("click", () => {
    state.bookingCode = `WN-${Math.floor(10000 + Math.random() * 89999)}`;
    state.step = 4;
    render();
  });
  document.querySelectorAll("[data-action='nav']").forEach((button) => {
    button.addEventListener("click", () => {
      state.screen = button.dataset.screen;
      if (state.screen !== "home") state.screen = "home";
      render();
    });
  });
}

render();
