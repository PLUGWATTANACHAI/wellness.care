import "./styles.css";
import { appContent, partnerClinics, services } from "./ui-content.js";

const state = {
  signedIn: false,
  screen: "login",
  step: 1,
  loginId: "",
  passcode: "",
  signupName: "",
  signupEmail: "",
  signupPhone: "",
  signupPasscode: "",
  serviceId: "massage",
  clinicId: "",
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

function selectedClinic() {
  return partnerClinics.find((clinic) => clinic.id === state.clinicId);
}

function progressWidth() {
  const maxSteps = selectedClinic() ? 5 : 4;
  return `${Math.max(100 / maxSteps, state.step * (100 / maxSteps))}%`;
}

function loginScreen() {
  const copy = appContent.login;
  return `
    <section class="loginScreen">
      <div class="loginHero">
        <span>${copy.brand}</span>
        <h1>${copy.title}</h1>
        <p>${copy.subtitle}</p>
      </div>
      <div class="loginCard">
        <label class="fieldLabel">${copy.loginLabel}
          <input data-field="loginId" inputmode="email" placeholder="${copy.loginPlaceholder}" value="${escapeHtml(state.loginId)}" />
        </label>
        <label class="fieldLabel">${copy.passcodeLabel}
          <input data-field="passcode" type="password" placeholder="${copy.passcodePlaceholder}" value="${escapeHtml(state.passcode)}" />
        </label>
        <button class="primaryButton" data-action="login">${copy.signInButton}</button>
        <button class="createAccountButton" data-action="signup">${copy.createAccountButton}</button>
      </div>
      <div class="divider"><span>${copy.socialDivider}</span></div>
      <div class="loginOptions" aria-label="Social login options">
        <button class="authLogoButton apple" data-action="social-login" data-provider="apple" aria-label="Sign in with Apple"><span></span></button>
        <button class="authLogoButton facebook" data-action="social-login" data-provider="facebook" aria-label="Sign in with Facebook"><span>f</span></button>
        <button class="authLogoButton gmail" data-action="social-login" data-provider="gmail" aria-label="Sign in with Gmail">
          <span class="gmailMark">G</span>
        </button>
      </div>
      <p class="finePrint">${copy.note}</p>
    </section>
  `;
}

function signupScreen() {
  const copy = appContent.signup;
  return `
    <section class="loginScreen signupScreen">
      <div class="loginHero signupHero">
        <span>${copy.brand}</span>
        <h1>${copy.title}</h1>
        <p>${copy.subtitle}</p>
      </div>
      <div class="loginCard">
        <label class="fieldLabel">${copy.nameLabel}
          <input data-field="signupName" placeholder="${copy.namePlaceholder}" value="${escapeHtml(state.signupName)}" />
        </label>
        <label class="fieldLabel">${copy.emailLabel}
          <input data-field="signupEmail" inputmode="email" placeholder="${copy.emailPlaceholder}" value="${escapeHtml(state.signupEmail)}" />
        </label>
        <label class="fieldLabel">${copy.phoneLabel}
          <input data-field="signupPhone" inputmode="tel" placeholder="${copy.phonePlaceholder}" value="${escapeHtml(state.signupPhone)}" />
        </label>
        <label class="fieldLabel">${copy.passcodeLabel}
          <input data-field="signupPasscode" type="password" placeholder="${copy.passcodePlaceholder}" value="${escapeHtml(state.signupPasscode)}" />
        </label>
        <button class="primaryButton" data-action="create-account">${copy.createButton}</button>
        <button class="createAccountButton" data-action="show-login">${copy.signInLink}</button>
      </div>
      <p class="finePrint">${copy.note}</p>
    </section>
  `;
}

function homeScreen() {
  const copy = appContent.home;
  return `
    <section class="homeScreen">
      <header class="appHeader">
        <div>
          <p>${copy.greeting}</p>
          <h1>${copy.brand}</h1>
          <span class="locationLine">${copy.location}</span>
        </div>
        <button class="profileButton" data-action="profile" aria-label="Profile">P</button>
      </header>

      <div class="walletStrip">
        <div><span>Coins</span><strong>240</strong></div>
        <div><span>Points</span><strong>1,850</strong></div>
        <div><span>Tier</span><strong>Member</strong></div>
      </div>

      <article class="heroCard">
        <div>
          <span>${copy.heroLabel}</span>
          <h2>${copy.heroTitle}</h2>
          <p>${copy.heroSubtitle}</p>
          <button data-action="start-booking">${copy.heroButton}</button>
        </div>
        <div class="heroTrustMini">
          <strong>${copy.heroTrustTitle}</strong>
          <span>${copy.heroTrustBody}</span>
        </div>
      </article>

      <section class="homeSection">
        <article class="awPanel">
          <div class="awMark">${copy.awTitle}</div>
          <div>
            <span>${copy.awEyebrow}</span>
            <h2>${copy.awHeadline}</h2>
            <p>${copy.awBody}</p>
            <button data-action="start-booking">${copy.awButton}</button>
          </div>
        </article>
      </section>

      <section class="homeSection">
        <div class="sectionTitle">
          <h2>${copy.servicesTitle}</h2>
          <button data-action="start-booking">${copy.viewAllButton}</button>
        </div>
        <div class="serviceScroller">
          ${services.map(serviceCard).join("")}
        </div>
      </section>

      <section class="homeSection">
        <div class="sectionTitle">
          <h2>${copy.clinicsTitle}</h2>
          <button data-action="start-booking">${copy.clinicsAction}</button>
        </div>
        <div class="clinicList">
          ${partnerClinics.map(clinicCard).join("")}
        </div>
      </section>
    </section>
  `;
}

function activityScreen() {
  return `
    <section class="tabScreen">
      <header class="appHeader">
        <div>
          <p>Activity</p>
          <h1>สถานะการจอง</h1>
        </div>
      </header>
      <article class="recentCard">
        <span>${state.bookingCode || "ยังไม่มีรายการใหม่"}</span>
        <strong>${state.bookingCode ? "รอชำระเงิน / รอตรวจสอบ" : "เริ่มจองบริการจากหน้า Home"}</strong>
        <p>${state.bookingCode ? "รายการล่าสุดจะใช้สำหรับติดตามสถานะ ผู้ให้บริการ และข้อความจากทีมดูแล" : "เมื่อมี booking แล้ว รายการล่าสุดและ timeline จะแสดงที่หน้านี้"}</p>
      </article>
      <article class="trackingCard">
        <mark>Tracking</mark>
        <strong>ตำแหน่งผู้ให้บริการจะแสดงเมื่อรับงานแล้ว</strong>
        <div class="routeLine"><span></span><span></span><span></span></div>
        <p>รอบ production จะแสดง ETA และตำแหน่งแบบ real-time เฉพาะ booking ที่กำลังให้บริการ</p>
      </article>
    </section>
  `;
}

function profileScreen() {
  return `
    <section class="tabScreen">
      <header class="appHeader">
        <div>
          <p>Profile</p>
          <h1>ข้อมูลลูกค้า</h1>
        </div>
      </header>
      <div class="screenBlock">
        <label class="fieldLabel">ชื่อ นามสกุล<input value="Plug Wattanachai" /></label>
        <label class="fieldLabel">อีเมล<input value="plug@example.com" /></label>
        <label class="fieldLabel">เบอร์โทร<input value="0812345678" /></label>
        <label class="fieldLabel">ที่อยู่หลัก<input value="${escapeHtml(state.address)}" /></label>
        <button class="primaryButton" data-action="go-home">บันทึกข้อมูล</button>
      </div>
    </section>
  `;
}

function chatScreen() {
  return `
    <section class="tabScreen">
      <header class="appHeader">
        <div>
          <p>Chat</p>
          <h1>แชทกับทีมดูแล</h1>
        </div>
      </header>
      <div class="screenBlock">
        <article class="chatContextCard">
          <span>Active booking</span>
          <strong>${state.bookingCode || "#WN-240618"} · นวดคอ บ่า ไหล่ 90 นาที</strong>
          <p>ห้องแชทนี้เชื่อมกับ booking communications หลังบ้าน แยกสิทธิ์ลูกค้า ผู้ให้บริการ และทีมดูแล</p>
        </article>
        <div class="chatThread">
          <article class="messageBubble staff">
            <span>ทีมดูแล</span>
            <p>สวัสดีค่ะ พี่สามารถคุยกับทีมดูแลหรือผู้ให้บริการจาก booking นี้ได้ที่นี่</p>
            <small>19:12</small>
          </article>
          <article class="messageBubble provider">
            <span>ผู้ให้บริการ</span>
            <p>รับทราบการจองแล้วค่ะ หากถึงคอนโดจะอัปเดตสถานะให้ค่ะ</p>
            <small>19:18</small>
          </article>
          <article class="messageBubble mine">
            <span>พี่</span>
            <p>เดี๋ยวรอที่ Lobby A นะครับ</p>
            <small>19:20</small>
          </article>
        </div>
        <div class="chatComposer">
          <input placeholder="พิมพ์ข้อความถึงทีมดูแลหรือผู้ให้บริการ" />
          <button data-action="send-chat">ส่ง</button>
        </div>
        <article class="policyCard">
          <strong>Support request</strong>
          <p>ปุ่มนี้จะใช้เปิดเคสให้ทีมหลังบ้านดูแลต่อ เช่น ปัญหาการเดินทาง การชำระเงิน หรือความปลอดภัย</p>
        </article>
      </div>
    </section>
  `;
}

function providerScreen() {
  return `
    <section class="tabScreen">
      <header class="appHeader">
        <div>
          <p>Provider</p>
          <h1>ฝั่งผู้ให้บริการ</h1>
        </div>
      </header>
      <article class="providerCard">
        <div class="avatar">M</div>
        <div>
          <strong>Mina Wellness</strong>
          <p>พร้อมรับงาน · Sathorn zone</p>
        </div>
        <span>Online</span>
      </article>
      <div class="screenBlock">
        <h2>งานใหม่</h2>
        <p class="finePrint">หน้านี้จะใช้สำหรับรับงาน อัปเดตสถานะเดินทาง และแชร์ตำแหน่งเมื่อผู้ให้บริการกดยินยอม</p>
      </div>
    </section>
  `;
}

function activeScreen() {
  if (!state.signedIn) return state.screen === "signup" ? signupScreen() : loginScreen();
  if (state.screen === "booking") return bookingScreen();
  if (state.screen === "activity") return activityScreen();
  if (state.screen === "profile") return profileScreen();
  if (state.screen === "chat") return chatScreen();
  return homeScreen();
}

function bookingScreen() {
  const service = selectedService();
  const clinic = selectedClinic();
  const safeAddress = escapeHtml(state.address);
  const tabs = clinic
    ? [
        [1, "คลินิก"],
        [2, "หน้าคลินิก"],
        [3, "วัน/เวลา"],
        [4, "ยืนยัน"],
        [5, "ชำระเงิน"],
      ]
    : [
        [1, "บริการ"],
        [2, "เวลา"],
        [3, "ยืนยัน"],
        [4, "ชำระเงิน"],
      ];
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
          ${tabs.map(([step, label]) => `<button class="${state.step === step ? "active" : ""}" data-action="step" data-step="${step}">${label}</button>`).join("")}
        </div>
      </div>

      ${state.step === 1 ? `
        <div class="screenBlock">
          <h2>เลือกบริการ</h2>
          <div class="serviceGrid">${services.map(serviceCard).join("")}</div>
          <button class="primaryButton" data-action="step" data-step="2">เลือกวันเวลา</button>
        </div>
      ` : ""}

      ${clinic && state.step === 2 ? `
        <div class="screenBlock">
          <h2>${clinic.name}</h2>
          <article class="clinicDetailPanel">
            <div class="clinicLogo">${clinic.name.slice(0, 1)}</div>
            <div>
              <strong>${clinic.headline}</strong>
              <p>${clinic.address} · ${clinic.area}</p>
            </div>
          </article>
          <article class="clinicPromoPanel">
            <span>โปรโมชั่นคลินิก</span>
            <strong>${clinic.promoTitle}</strong>
            <p>${clinic.promoBody}</p>
          </article>
          <div class="clinicPackageList">
            ${clinic.packages.map((item) => `
              <button class="clinicPackage ${state.serviceId === item.serviceId ? "selected" : ""}" data-action="select-clinic-package" data-service="${item.serviceId}">
                <strong>${item.name}</strong>
                <span>${item.duration} · ${currency(item.price)}</span>
              </button>
            `).join("")}
          </div>
          <button class="primaryButton" data-action="step" data-step="3">เลือกวันเวลา</button>
        </div>
      ` : ""}

      ${state.step === (clinic ? 3 : 2) ? `
        <div class="screenBlock">
          <h2>${clinic ? "วัน เวลา และคลินิก" : "วัน เวลา และสถานที่"}</h2>
          <div class="formGrid">
            <label class="fieldLabel">วันที่<input type="date" data-field="date" value="${state.date}" /></label>
            <label class="fieldLabel">เวลา<input type="time" data-field="time" value="${state.time}" /></label>
            <label class="fieldLabel wide">${clinic ? "คลินิก" : "คอนโด / ที่อยู่"}<input data-field="address" value="${clinic ? clinic.address : safeAddress}" /></label>
          </div>
          <div class="mapCard">
            <div class="pin"></div>
            <div>
              <strong>${clinic ? clinic.name : safeAddress}</strong>
              <p>${state.placeConfirmed ? "ยืนยันสถานที่แล้ว" : "กดยืนยันหลังตรวจตำแหน่ง"}</p>
            </div>
          </div>
          <div class="actionRow">
            <button class="secondaryButton" data-action="open-maps">ค้นหา Google Maps</button>
            <button class="secondaryButton ${state.placeConfirmed ? "confirmed" : ""}" data-action="confirm-place">ยืนยันพื้นที่</button>
          </div>
          <button class="primaryButton" data-action="step" data-step="${clinic ? 4 : 3}">ตรวจสอบรายการ</button>
        </div>
      ` : ""}

      ${state.step === (clinic ? 4 : 3) ? `
        <div class="screenBlock">
          <h2>ตรวจสอบก่อนชำระเงิน</h2>
          <div class="summaryList">
            <div><span>บริการ</span><strong>${service.name}</strong></div>
            ${clinic ? `<div><span>คลินิก</span><strong>${clinic.name}</strong></div>` : ""}
            <div><span>วันเวลา</span><strong>${state.date} · ${state.time}</strong></div>
            <div><span>สถานที่</span><strong>${clinic ? clinic.address : safeAddress}</strong></div>
            <div><span>${clinic ? "รอบคลินิก" : "ผู้ให้บริการ"}</span><strong>${clinic ? "รอยืนยันจากคลินิก" : "Mina · 18 นาที"}</strong></div>
            <div><span>ยอดชำระ</span><strong>${currency(service.price)}</strong></div>
          </div>
          <button class="primaryButton" data-action="step" data-step="${clinic ? 5 : 4}">ไปชำระเงิน</button>
        </div>
      ` : ""}

      ${state.step === (clinic ? 5 : 4) ? `
        <div class="screenBlock">
          <h2>ชำระเงิน</h2>
          <div class="paymentSwitch">
            <button class="${state.payment === "promptpay" ? "active" : ""}" data-action="payment" data-payment="promptpay">PromptPay / QR</button>
            <button class="${state.payment === "card" ? "active" : ""}" data-action="payment" data-payment="card">บัตรเครดิต</button>
          </div>
          <button class="primaryButton" data-action="pay">${state.payment === "promptpay" ? "สร้าง QR ชำระเงิน" : "ชำระด้วยบัตร"}</button>
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

function clinicCard(clinic) {
  return `
    <button class="clinicCard" data-action="select-clinic" data-clinic="${clinic.id}" data-service="${clinic.serviceId}">
      <div class="clinicLogo">${clinic.name.slice(0, 1)}</div>
      <div>
        <strong>${clinic.name}</strong>
        <p>${clinic.type}</p>
        <span>${clinic.area} · ${clinic.note}</span>
      </div>
      <b>จอง</b>
    </button>
  `;
}

function render() {
  document.querySelector("#app").innerHTML = `
    <main class="previewShell">
      <div class="previewInfo">
        <strong>${appContent.preview.title}</strong>
        <span>${appContent.preview.sizeLabel}</span>
      </div>
      <div class="phoneFrame" aria-label="Wellnest mobile app preview">
        ${activeScreen()}
        ${state.signedIn ? bottomNav() : ""}
      </div>
    </main>
  `;
  bindEvents();
}

function bottomNav() {
  const items = [
    ["home", "Home"],
    ["activity", "Bookings"],
    ["profile", "Profile"],
    ["chat", "Chat"],
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
  document.querySelector("[data-action='signup']")?.addEventListener("click", () => {
    state.screen = "signup";
    render();
  });
  document.querySelector("[data-action='show-login']")?.addEventListener("click", () => {
    state.screen = "login";
    render();
  });
  document.querySelector("[data-action='create-account']")?.addEventListener("click", () => {
    state.signedIn = true;
    state.screen = "home";
    render();
  });
  document.querySelectorAll("[data-action='social-login']").forEach((button) => {
    button.addEventListener("click", () => {
      state.loginId = button.dataset.provider === "gmail" ? "plug@gmail.com" : `${button.dataset.provider}@wellnest.local`;
      state.signedIn = true;
      state.screen = "home";
      render();
    });
  });
  document.querySelector("[data-action='send-chat']")?.addEventListener("click", () => {
    state.screen = "activity";
    render();
  });
  document.querySelectorAll("[data-action='select-service']").forEach((button) => {
    button.addEventListener("click", () => {
      state.serviceId = button.dataset.service;
      state.clinicId = "";
      if (state.screen === "home") {
        state.screen = "booking";
        state.step = 2;
      }
      render();
    });
  });
  document.querySelectorAll("[data-action='select-clinic']").forEach((button) => {
    button.addEventListener("click", () => {
      state.clinicId = button.dataset.clinic;
      state.serviceId = button.dataset.service;
      state.screen = "booking";
      state.step = 2;
      render();
    });
  });
  document.querySelectorAll("[data-action='select-clinic-package']").forEach((button) => {
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
      state.clinicId = "";
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
    state.screen = "home";
    render();
  });
  document.querySelectorAll("[data-action='nav']").forEach((button) => {
    button.addEventListener("click", () => {
      state.screen = button.dataset.screen;
      render();
    });
  });
}

render();
