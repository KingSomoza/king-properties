/* ============================================================
   لوحة التحكم — المنطق الرئيسي
   كل نداء للخادم يمر عبر apiCall(action, payload) المعرّفة في session.js
   انظر backend/Code.gs لمطابقة أسماء الحقول والإجراءات (actions).
   ============================================================ */

   const session = requireSession();
   let currentUser = session;
   let state = {
     properties: [],
     requests: [],
     users: [],
   };
   
   /* ---------------- topbar + صلاحيات ---------------- */
   function initUserChrome() {
     document.getElementById("topUserName").textContent = currentUser.username;
     document.getElementById("topUserRole").textContent =
       currentUser.role === "full_access" ? "مدير رئيسي" : "مشرف";
     document.getElementById("topUserAvatar").textContent = currentUser.username
       .charAt(0)
       .toUpperCase();
   
     const perms = currentUser.permissions || [];
     const canManageUsers =
       currentUser.role === "full_access" || perms.includes("manage_users");
     if (!canManageUsers) {
       document.getElementById("navUsers").style.display = "none";
     }
   }
   
   /* ---------------- التنقل بين الصفحات ---------------- */
   const titles = {
     home: "الرئيسية",
     properties: "إدارة العقارات",
     requests: "طلبات الإضافة",
     stats: "الإحصائيات",
     users: "إدارة المستخدمين",
     settings: "الإعدادات",
   };
   
   document.querySelectorAll(".nav-item[data-view]").forEach((item) => {
     item.addEventListener("click", () => switchView(item.dataset.view));
   });
   
   function switchView(name) {
     document
       .querySelectorAll(".nav-item")
       .forEach((n) => n.classList.toggle("active", n.dataset.view === name));
     document
       .querySelectorAll(".view")
       .forEach((v) => v.classList.toggle("active", v.id === "view-" + name));
     document.getElementById("viewTitle").textContent = titles[name];
     document.getElementById("sidebar").classList.remove("open");
   
     if (name === "properties" && state.properties.length === 0) loadProperties();
     if (name === "requests" && state.requests.length === 0) loadRequests();
     if (name === "users" && state.users.length === 0) loadUsers();
     if (name === "stats") loadStatsCharts();
   }
   
   document.getElementById("menuToggle").addEventListener("click", () => {
     document.getElementById("sidebar").classList.toggle("open");
   });
   document.getElementById("logoutBtn").addEventListener("click", logout);
   
   /* ---------------- Toast ---------------- */
   function toast(msg, type = "") {
     const wrap = document.getElementById("toastWrap");
     const el = document.createElement("div");
     el.className = "toast " + type;
     el.textContent = msg;
     wrap.appendChild(el);
     setTimeout(() => el.remove(), 3200);
   }
   
   /* ---------------- Modal helpers ---------------- */
   const modalOverlay = document.getElementById("modalOverlay");
   document.getElementById("modalClose").addEventListener("click", closeModal);
   modalOverlay.addEventListener("click", (e) => {
     if (e.target === modalOverlay) closeModal();
   });
   function openModal(title, bodyHtml, footHtml) {
     document.getElementById("modalTitle").textContent = title;
     document.getElementById("modalBody").innerHTML = bodyHtml;
     document.getElementById("modalFoot").innerHTML = footHtml;
     modalOverlay.classList.add("show");
   }
   function closeModal() {
     modalOverlay.classList.remove("show");
   }
   
   /* ============================================================
      التخزين المؤقت (Cache) للبيانات
      ============================================================ */
   
   const CACHE_KEY = 'admin_dashboard_cache';
   const CACHE_EXPIRY = 5 * 60 * 1000; // 5 دقائق
   
   function getCachedData() {
     try {
       const cached = localStorage.getItem(CACHE_KEY);
       if (!cached) return null;
       const data = JSON.parse(cached);
       if (Date.now() - data.timestamp > CACHE_EXPIRY) return null;
       return data.data;
     } catch (e) {
       return null;
     }
   }
   
   function setCachedData(data) {
     try {
       localStorage.setItem(CACHE_KEY, JSON.stringify({
         timestamp: Date.now(),
         data: data
       }));
     } catch (e) {}
   }
   
   /* ============================================================
      الرئيسية — بطاقات الإحصائيات + آخر العقارات/الطلبات
      ============================================================ */
   
   async function loadHome() {
     try {
       // ✅ محاولة قراءة من التخزين المؤقت أولاً
       const cachedData = getCachedData();
       if (cachedData) {
         renderDashboard(cachedData);
         return;
       }
       
       const res = await apiCall("getStats", { period: "week" });
       if (!res || !res.ok) {
         toast("تعذّر تحميل الإحصائيات", "error");
         return;
       }
       
       // ✅ حفظ في التخزين المؤقت
       setCachedData(res.stats);
       renderDashboard(res.stats);
       
     } catch (e) {
       console.error("❌ خطأ في loadHome:", e);
       toast("تعذّر تحميل الإحصائيات", "error");
     }
   }
   
   function renderStatCards(stats = {}) {
     const cards = [
       { icon: "fa-building", label: "إجمالي العقارات", value: stats.totalProperties ?? "—" },
       { icon: "fa-inbox", label: "إجمالي الطلبات", value: stats.totalRequests ?? "—" },
       { icon: "fa-users", label: "إجمالي المستخدمين", value: stats.totalUsers ?? "—" },
       { icon: "fa-eye", label: "إجمالي الزوار", value: stats.totalVisitors ?? "—" },
     ];
     document.getElementById("statsGrid").innerHTML = cards
       .map(
         (c) => `
       <div class="stat-card framed">
         <div class="top">
           <div class="icon"><i class="fa-solid ${c.icon}"></i></div>
         </div>
         <p class="value">${c.value}</p>
         <p class="label">${c.label}</p>
       </div>`
       )
       .join("");
   }
   
   function renderRecentTable(bodyId, rows, formatter) {
     const body = document.getElementById(bodyId);
     if (!rows || rows.length === 0) {
       body.innerHTML = `<div class="empty-state" style="padding: 30px 20px; text-align: center; color: var(--ink-soft);">
         <i class="fa-regular fa-building" style="font-size: 28px; display: block; margin-bottom: 10px; opacity: 0.3;"></i>
         لا توجد بيانات بعد
       </div>`;
       return;
     }
     const count = Math.min(rows.length, 5);
     body.innerHTML = rows
       .slice(-count)
       .reverse()
       .map((r) => `<div class="recent-item">${formatter(r)}</div>`)
       .join("");
   }
   
   function renderDashboard(stats) {
     // ✅ عرض بطاقات الإحصائيات
     renderStatCards(stats);
     
     // ✅ عرض الرسوم البيانية
     if (typeof renderHomeCharts === "function") {
       renderHomeCharts(stats);
     }
     
     // ✅ عرض أحدث العقارات
     const recentProperties = stats.recentProperties || [];
     renderRecentTable(
       "recentPropertiesBody",
       recentProperties,
       (p) => {
         const title = p.title_ar || p.title || 'بدون عنوان';
         const governorate = p.governorate_ar || p.governorate || '';
         const type = p.type === 'sale' ? 'للبيع' : p.type === 'rent' ? 'للإيجار' : p.type || '';
         const price = p.price ? Number(p.price).toLocaleString() + ' ' + (p.currency || '$') : 'سعر غير محدد';
         const date = p.added_date ? new Date(p.added_date).toLocaleDateString('ar-EG') : '';
         const typeClass = type === 'للبيع' ? 'sale' : 'rent';
         const typeIcon = type === 'للبيع' ? 'fa-tag' : 'fa-key';
         
         return `
           <div class="recent-property">
             <div class="recent-property-header">
               <span class="recent-property-title">${title}</span>
               <span class="recent-property-price">${price}</span>
             </div>
             <div class="recent-property-footer">
               <span class="recent-property-location">
                 <i class="fa-regular fa-location-dot"></i> ${governorate}
               </span>
               <span class="recent-property-type ${typeClass}">
                 <i class="fa-regular ${typeIcon}"></i> ${type}
               </span>
               ${date ? `<span class="recent-property-date"><i class="fa-regular fa-calendar"></i> ${date}</span>` : ''}
             </div>
           </div>
         `;
       }
     );
     
     // ✅ عرض أحدث الطلبات
     const recentRequests = stats.recentRequests || [];
     renderRecentTable(
       "recentRequestsBody",
       recentRequests,
       (r) => {
         const name = r.fullName || r.ownerName || 'غير معروف';
         const propertyType = r.propertyType || r.type || 'عقار';
         const status = r.status === 'pending' || r.status === 'قيد المراجعة' ? 'قيد المراجعة' : 
                        r.status === 'approved' || r.status === 'موافق عليه' ? 'موافق عليه' : 
                        r.status === 'rejected' || r.status === 'مرفوض' ? 'مرفوض' : r.status || 'جديد';
         const date = r.requestDate || r.added_date || '';
         const statusClass = status === 'قيد المراجعة' ? 'pending' : 
                             status === 'موافق عليه' ? 'approved' : 
                             status === 'مرفوض' ? 'rejected' : 'new';
         const statusIcon = status === 'قيد المراجعة' ? 'fa-clock' : 
                            status === 'موافق عليه' ? 'fa-circle-check' : 
                            status === 'مرفوض' ? 'fa-circle-xmark' : 'fa-circle';
         
         return `
           <div class="recent-request">
             <div class="recent-request-header">
               <span class="recent-request-name">${name}</span>
               <span class="recent-request-status ${statusClass}">
                 <i class="fa-regular ${statusIcon}"></i>
                 ${status}
               </span>
             </div>
             <div class="recent-request-footer">
               <span class="recent-request-type">
                 <i class="fa-regular fa-building"></i> ${propertyType}
               </span>
               ${date ? `<span class="recent-request-date"><i class="fa-regular fa-calendar"></i> ${new Date(date).toLocaleDateString('ar-EG')}</span>` : ''}
             </div>
           </div>
         `;
       }
     );
     
     // ✅ تحديث عدد الطلبات المعلقة
     const badge = document.getElementById("requestsBadge");
     if (stats.pendingRequestsCount) {
       badge.style.display = "inline-block";
       badge.textContent = stats.pendingRequestsCount;
     } else {
       badge.style.display = "none";
     }
   }
   
   /* ============================================================
      إدارة العقارات
      ============================================================ */
      async function loadProperties() {
        try {
          const res = await apiCall("getProperties", {});
          if (!res || !res.ok) {
            toast("تعذّر تحميل العقارات", "error");
            return;
          }
          state.properties = res.properties || [];
          console.log("✅ تم تحميل العقارات:", state.properties.length);
          populateTypeFilter();
          renderProperties();
        } catch (e) {
          console.error("❌ خطأ في loadProperties:", e);
          toast("تعذّر الاتصال بالخادم", "error");
        }
      }
   
   function populateTypeFilter() {
    const types = [...new Set(state.properties.map((p) => p.type).filter(Boolean))];
    const sel = document.getElementById("propFilterType");
    sel.innerHTML =
      `<option value="">كل الأنواع</option>` +
      types.map((t) => `<option value="${t}">${t === 'sale' ? 'للبيع' : t === 'rent' ? 'للإيجار' : t}</option>`).join("");
  }
   
   function renderProperties() {
    const search = document.getElementById("propSearch").value.trim().toLowerCase();
    const type = document.getElementById("propFilterType").value;
    const status = document.getElementById("propFilterStatus").value;
  
    const rows = state.properties.filter((p) => {
      // فلتر النوع
      if (type && p.type !== type) return false;
      
      // فلتر الحالة
      if (status) {
        const pStatus = p.status || (p.available === true ? 'نشط' : 'غير نشط');
        if (pStatus !== status) return false;
      }
      
      // فلتر البحث
      if (search) {
        const hay = `${p.title_ar || p.title || ''} ${p.id || ''} ${p.owner_name || p.ownerName || ''} ${p.owner_phone || ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  
    const body = document.getElementById("propertiesBody");
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="12"><div class="empty-state"><i class="fa-solid fa-building-circle-xmark"></i>لا توجد عقارات مطابقة</div></td></tr>`;
      return;
    }
    
    body.innerHTML = rows
      .map((p) => {
        const title = p.title_ar || p.title || '—';
        const typeLabel = p.type === 'sale' ? 'للبيع' : p.type === 'rent' ? 'للإيجار' : p.type || '—';
        const governorate = p.governorate_ar || p.governorate || '—';
        const price = p.price ? Number(p.price).toLocaleString('ar-EG') + ' ' + (p.currency || '$') : '—';
        const pStatus = p.status || (p.available === true ? 'نشط' : 'غير نشط');
        const owner = p.owner_name || p.ownerName || '—';
        const date = p.added_date ? new Date(p.added_date).toLocaleDateString('ar-EG') : '—';
        const propertyType = p.property_type || '—';
        const area = p.area || '—';
        const rooms = p.rooms || '—';
        
        // ترجمة نوع العقار
        const propertyTypeMap = {
          'apartment': 'شقة',
          'house': 'منزل',
          'villa': 'فيلا',
          'shop': 'محل تجاري',
          'building': 'بناء كامل',
          'land': 'أرض'
        };
        const propertyTypeLabel = propertyTypeMap[propertyType] || propertyType;
        
        return `
      <tr>
        <td><span class="badge badge-neutral" style="font-size: 11px;">${p.id || '—'}</span></td>
        <td><strong>${title}</strong></td>
        <td><span class="badge ${p.type === 'sale' ? 'badge-success' : 'badge-warning'}">${typeLabel}</span></td>
        <td>${propertyTypeLabel}</td>
        <td>${governorate}</td>
        <td>${price}</td>
        <td>${area} م²</td>
        <td>${rooms}</td>
        <td>${statusBadge(pStatus)}</td>
        <td>${owner}</td>
        <td>${date}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-icon btn-sm" onclick="editProperty('${p.id}')" title="تعديل"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-icon btn-sm btn-danger-outline" onclick="deleteProperty('${p.id}')" title="حذف"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
      })
      .join("");
  }
   
  function statusBadge(status) {
    const map = {
      "نشط": "badge-success",
      "غير نشط": "badge-neutral",
      "مباع": "badge-danger",
      "مؤجر": "badge-warning",
      "true": "badge-success",
      "TRUE": "badge-success",
      "false": "badge-danger",
      "FALSE": "badge-danger",
    };
    
    let label = status;
    if (status === true || status === 'true' || status === 'TRUE') label = 'نشط';
    else if (status === false || status === 'false' || status === 'FALSE') label = 'غير نشط';
    else if (!status) label = '—';
    
    return `<span class="badge ${map[status] || map[label] || "badge-neutral"}">${label}</span>`;
  }
   
   ["propSearch", "propFilterType", "propFilterStatus"].forEach((id) =>
     document.getElementById(id).addEventListener("input", renderProperties)
   );
   
   function propertyFormHtml(p = {}) {
    const isEdit = !!p.id;
    return `
    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 12px;">
      
      <!-- ===== القسم الأساسي ===== -->
      <div class="form-field full" style="grid-column: 1 / -1;">
        <label style="font-weight: 700; color: var(--gold); border-bottom: 2px solid var(--gold); padding-bottom: 4px; display: block; margin-bottom: 12px;">
          <i class="fa-solid fa-info-circle"></i> المعلومات الأساسية
        </label>
      </div>
      
      <div class="form-field full">
        <label>العنوان (عربي)</label>
        <input id="f_title_ar" value="${p.title_ar || p.title || ''}" placeholder="مثال: شقة فاخرة في دمشق">
      </div>
      
      <div class="form-field full">
        <label>العنوان (إنجليزي)</label>
        <input id="f_title_en" value="${p.title_en || ''}" placeholder="Example: Luxury Apartment in Damascus" oninput="autoTranslateFields()">
      </div>
      
      <div class="form-field">
        <label>نوع العملية</label>
        <select id="f_type" onchange="toggleRentPeriod()">
          <option value="sale" ${p.type === 'sale' ? 'selected' : ''}>للبيع</option>
          <option value="rent" ${p.type === 'rent' ? 'selected' : ''}>للإيجار</option>
        </select>
      </div>
      
      <div class="form-field">
        <label>نوع العقار</label>
        <select id="f_property_type">
          <option value="apartment" ${p.property_type === 'apartment' ? 'selected' : ''}>شقة</option>
          <option value="house" ${p.property_type === 'house' ? 'selected' : ''}>منزل</option>
          <option value="villa" ${p.property_type === 'villa' ? 'selected' : ''}>فيلا</option>
          <option value="shop" ${p.property_type === 'shop' ? 'selected' : ''}>محل تجاري</option>
          <option value="building" ${p.property_type === 'building' ? 'selected' : ''}>بناء كامل</option>
          <option value="land" ${p.property_type === 'land' ? 'selected' : ''}>أرض</option>
        </select>
      </div>
      
      <div class="form-field">
        <label>السعر</label>
        <input id="f_price" value="${p.price || ''}" placeholder="250000 أو حسب الاتفاق">
      </div>
      
      <div class="form-field">
        <label>العملة</label>
        <select id="f_currency">
          <option value="$" ${p.currency === '$' ? 'selected' : ''}>$ USD</option>
          <option value="EUR" ${p.currency === 'EUR' ? 'selected' : ''}>€ EUR</option>
          <option value="GBP" ${p.currency === 'GBP' ? 'selected' : ''}>£ GBP</option>
          <option value="TRY" ${p.currency === 'TRY' ? 'selected' : ''}>₺ TRY</option>
          <option value="SYP" ${p.currency === 'SYP' ? 'selected' : ''}>ل.س SYP</option>
          <option value="SAR" ${p.currency === 'SAR' ? 'selected' : ''}>ر.س SAR</option>
          <option value="AED" ${p.currency === 'AED' ? 'selected' : ''}>د.إ AED</option>
          <option value="QAR" ${p.currency === 'QAR' ? 'selected' : ''}>ر.ق QAR</option>
        </select>
      </div>
      
      <div class="form-field" id="rentPeriodField" style="${p.type === 'rent' ? '' : 'display: none;'}">
        <label>مدة الإيجار</label>
        <select id="f_rent_period">
          <option value="month" ${p.rent_period === 'month' ? 'selected' : ''}>شهرياً</option>
          <option value="year" ${p.rent_period === 'year' ? 'selected' : ''}>سنوياً</option>
          <option value="week" ${p.rent_period === 'week' ? 'selected' : ''}>أسبوعياً</option>
          <option value="daily" ${p.rent_period === 'daily' ? 'selected' : ''}>يومياً</option>
        </select>
      </div>
      
      <!-- ===== الموقع ===== -->
      <div class="form-field full" style="grid-column: 1 / -1; margin-top: 4px;">
        <label style="font-weight: 700; color: var(--gold); border-bottom: 2px solid var(--gold); padding-bottom: 4px; display: block; margin-bottom: 12px;">
          <i class="fa-solid fa-location-dot"></i> الموقع
        </label>
      </div>
      
      <div class="form-field">
        <label>المدينة (عربي)</label>
        <input id="f_city_ar" value="${p.city_ar || p.city || ''}" placeholder="دمشق" oninput="autoTranslateFields()">
      </div>
      
      <div class="form-field">
        <label>المدينة (إنجليزي)</label>
        <input id="f_city_en" value="${p.city_en || ''}" placeholder="Damascus" oninput="autoTranslateFields()">
      </div>
      
      <!-- ===== المحافظة ===== -->
      <div class="form-field" style="display: none;">
        <label>المحافظة (عربي)</label>
        <input id="f_governorate_ar" value="${p.governorate_ar || p.governorate || ''}" placeholder="دمشق" oninput="autoTranslateFields()">
      </div>
      
      <div class="form-field" style="display: none;">
        <label>المحافظة (إنجليزي)</label>
        <input id="f_governorate_en" value="${p.governorate_en || ''}" placeholder="Damascus" oninput="autoTranslateFields()">
      </div>
      
      <!-- ===== المنطقة ===== -->
      <div class="form-field">
        <label>المنطقة (عربي)</label>
        <input id="f_district_ar" value="${p.district_ar || p.district || ''}" placeholder="الميدان" oninput="autoTranslateFields()">
      </div>
      
      <div class="form-field">
        <label>المنطقة (إنجليزي)</label>
        <input id="f_district_en" value="${p.district_en || ''}" placeholder="Al-Midan" oninput="autoTranslateFields()">
      </div>
      
      <div class="form-field full">
        <label>الموقع التفصيلي</label>
        <input id="f_location" value="${p.location || ''}" placeholder="شارع الثورة، بناء رقم 5">
      </div>
      
      <div class="form-field">
        <label>خط العرض (Latitude)</label>
        <input id="f_latitude" type="number" step="any" value="${p.latitude || ''}" placeholder="33.5138">
      </div>
      
      <div class="form-field">
        <label>خط الطول (Longitude)</label>
        <input id="f_longitude" type="number" step="any" value="${p.longitude || ''}" placeholder="36.2765">
      </div>
      
      <!-- ===== المواصفات ===== -->
      <div class="form-field full" style="grid-column: 1 / -1; margin-top: 4px;">
        <label style="font-weight: 700; color: var(--gold); border-bottom: 2px solid var(--gold); padding-bottom: 4px; display: block; margin-bottom: 12px;">
          <i class="fa-solid fa-list-check"></i> المواصفات
        </label>
      </div>
      
      <div class="form-field">
        <label>المساحة (م²)</label>
        <input id="f_area" type="number" value="${p.area || ''}" placeholder="150">
      </div>
      
      <div class="form-field">
        <label>عدد الغرف</label>
        <input id="f_rooms" type="number" value="${p.rooms || ''}" placeholder="3">
      </div>
      
      <div class="form-field">
        <label>عدد الحمامات</label>
        <input id="f_bathrooms" type="number" value="${p.bathrooms || ''}" placeholder="2">
      </div>
      
      <div class="form-field">
        <label>الطابق</label>
        <select id="f_floor">
          <option value="-2" ${p.floor === -2 ? 'selected' : ''}>قبو ثاني</option>
          <option value="-1" ${p.floor === -1 ? 'selected' : ''}>قبو أول</option>
          <option value="0" ${p.floor === 0 ? 'selected' : ''}>أرضي</option>
          ${Array.from({length: 20}, (_, i) => i + 1).map(i => 
            `<option value="${i}" ${p.floor === i ? 'selected' : ''}>${i}</option>`
          ).join('')}
        </select>
      </div>
      
      <!-- ===== التفاصيل الإضافية ===== -->
      <div class="form-field full" style="grid-column: 1 / -1; margin-top: 4px;">
        <label style="font-weight: 700; color: var(--gold); border-bottom: 2px solid var(--gold); padding-bottom: 4px; display: block; margin-bottom: 12px;">
          <i class="fa-solid fa-circle-plus"></i> تفاصيل إضافية
        </label>
      </div>
      
      <div class="form-field">
        <label>الاتجاه (عربي)</label>
        <select id="f_direction_ar" onchange="autoTranslateFields()">
          <option value="">اختر الاتجاه</option>
          ${["شمالي", "جنوبي", "شرقي", "غربي", "شمالي شرقي", "شمالي غربي", "جنوبي شرقي", "جنوبي غربي"]
            .map(d => `<option value="${d}" ${p.direction_ar === d ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </div>
      
      <div class="form-field">
        <label>الاتجاه (إنجليزي)</label>
        <input id="f_direction_en" value="${p.direction_en || ''}" placeholder="North" oninput="autoTranslateFields()">
      </div>
      
      <div class="form-field">
        <label>مصعد (عربي)</label>
        <select id="f_elevator_ar" onchange="autoTranslateFields()">
          <option value="">اختر</option>
          <option value="نعم" ${p.elevator_ar === 'نعم' ? 'selected' : ''}>نعم</option>
          <option value="لا" ${p.elevator_ar === 'لا' ? 'selected' : ''}>لا</option>
        </select>
      </div>
      
      <div class="form-field">
        <label>مصعد (إنجليزي)</label>
        <input id="f_elevator_en" value="${p.elevator_en || ''}" placeholder="Yes" oninput="autoTranslateFields()">
      </div>
      
      <div class="form-field">
        <label>نوع التشطيب (عربي)</label>
        <select id="f_finishing_ar" onchange="autoTranslateFields()">
          <option value="">اختر التشطيب</option>
          ${["فاخر", "جيد", "عادي", "على العضم"]
            .map(f => `<option value="${f}" ${p.finishing_ar === f ? 'selected' : ''}>${f}</option>`).join('')}
        </select>
      </div>
      
      <div class="form-field">
        <label>نوع التشطيب (إنجليزي)</label>
        <input id="f_finishing_en" value="${p.finishing_en || ''}" placeholder="Luxury" oninput="autoTranslateFields()">
      </div>
      
      <div class="form-field">
        <label>نوع الملكية (عربي)</label>
        <select id="f_ownership_ar" onchange="autoTranslateFields()">
          <option value="">اختر نوع الملكية</option>
          ${["طابو أخضر", "مشاع (أسهم)", "حكم محكمة"]
            .map(o => `<option value="${o}" ${p.ownership_ar === o ? 'selected' : ''}>${o}</option>`).join('')}
        </select>
      </div>
      
      <div class="form-field">
        <label>نوع الملكية (إنجليزي)</label>
        <input id="f_ownership_en" value="${p.ownership_en || ''}" placeholder="Green Title Deed" oninput="autoTranslateFields()">
      </div>
      
      <div class="form-field">
        <label>موقف سيارة (عربي)</label>
        <select id="f_parking_ar" onchange="autoTranslateFields()">
          <option value="">اختر</option>
          <option value="نعم" ${p.parking_ar === 'نعم' ? 'selected' : ''}>نعم</option>
          <option value="لا" ${p.parking_ar === 'لا' ? 'selected' : ''}>لا</option>
        </select>
      </div>
      
      <div class="form-field">
        <label>موقف سيارة (إنجليزي)</label>
        <input id="f_parking_en" value="${p.parking_en || ''}" placeholder="Yes" oninput="autoTranslateFields()">
      </div>
      
      <!-- ===== بيانات المالك ===== -->
      <div class="form-field full" style="grid-column: 1 / -1; margin-top: 4px;">
        <label style="font-weight: 700; color: var(--gold); border-bottom: 2px solid var(--gold); padding-bottom: 4px; display: block; margin-bottom: 12px;">
          <i class="fa-solid fa-user"></i> بيانات المالك
        </label>
      </div>
      
      <div class="form-field">
        <label>اسم المالك</label>
        <input id="f_owner_name" value="${p.owner_name || p.ownerName || ''}" placeholder="أحمد محمد">
      </div>
      
      <div class="form-field">
        <label>هاتف المالك</label>
        <input id="f_owner_phone" value="${p.owner_phone || p.ownerPhone || ''}" placeholder="0912345678">
      </div>
      
      <div class="form-field">
        <label>نوع المالك</label>
        <select id="f_owner_type">
          <option value="مالك" ${p.owner_type === 'مالك' ? 'selected' : ''}>مالك</option>
          <option value="مكتب عقاري" ${p.owner_type === 'مكتب عقاري' ? 'selected' : ''}>مكتب عقاري</option>
          <option value="دلال" ${p.owner_type === 'دلال' ? 'selected' : ''}>دلال</option>
        </select>
      </div>
      
      <div class="form-field">
        <label>نسبة العمولة (%)</label>
        <input id="f_commission" type="number" value="${p.commission || 2}" placeholder="2" step="0.1">
      </div>
      
      <!-- ===== الحالة ===== -->
      <div class="form-field full" style="grid-column: 1 / -1; margin-top: 4px;">
        <label style="font-weight: 700; color: var(--gold); border-bottom: 2px solid var(--gold); padding-bottom: 4px; display: block; margin-bottom: 12px;">
          <i class="fa-solid fa-toggle-on"></i> الحالة والنشر
        </label>
      </div>
      
      <div class="form-field">
        <label>الحالة</label>
        <select id="f_status">
          <option value="نشط" ${p.status === 'نشط' || p.available === true ? 'selected' : ''}>نشط (متاح)</option>
          <option value="غير نشط" ${p.status === 'غير نشط' ? 'selected' : ''}>غير نشط</option>
          <option value="مباع" ${p.status === 'مباع' ? 'selected' : ''}>مباع</option>
          <option value="مؤجر" ${p.status === 'مؤجر' ? 'selected' : ''}>مؤجر</option>
        </select>
      </div>
      
      <div class="form-field">
        <label>مميز</label>
        <select id="f_featured">
          <option value="no" ${p.featured !== 'yes' ? 'selected' : ''}>لا</option>
          <option value="yes" ${p.featured === 'yes' ? 'selected' : ''}>نعم</option>
        </select>
      </div>
      
      <!-- ===== الصور والوصف ===== -->
      <div class="form-field full" style="grid-column: 1 / -1; margin-top: 4px;">
        <label style="font-weight: 700; color: var(--gold); border-bottom: 2px solid var(--gold); padding-bottom: 4px; display: block; margin-bottom: 12px;">
          <i class="fa-solid fa-image"></i> الصور والوصف
        </label>
      </div>
      
      <div class="form-field full">
        <label>روابط الصور (افصل بينها بفاصلة)</label>
        <input id="f_images" value="${p.images || ''}" placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg">
      </div>
      
      <div class="form-field full">
        <label>الوصف (عربي)</label>
        <textarea id="f_description_ar" rows="3" placeholder="وصف تفصيلي للعقار..." oninput="autoTranslateFields()">${p.description_ar || p.description || ''}</textarea>
      </div>
      
      <div class="form-field full">
        <label>الوصف (إنجليزي)</label>
        <textarea id="f_description_en" rows="3" placeholder="Detailed property description..." oninput="autoTranslateFields()">${p.description_en || ''}</textarea>
      </div>
      
      <div class="form-field full">
        <label>ملاحظات (خاصة)</label>
        <textarea id="f_notes" rows="2" placeholder="ملاحظات إضافية (للمدير فقط)...">${p.notes || ''}</textarea>
      </div>
      
      ${isEdit ? `<input type="hidden" id="f_id" value="${p.id}">` : ''}
    </div>`;
  }
   
  function readPropertyForm() {
    return {
      // الأساسي
      title_ar: val("f_title_ar"),
      title_en: val("f_title_en"),
      type: val("f_type"),
      property_type: val("f_property_type"),
      price: val("f_price"),
      currency: val("f_currency"),
      rent_period: val("f_rent_period"),
      
      // الموقع (مدينة ومنطقة فقط، المحافظة تُستنتج من المدينة)
      city_ar: val("f_city_ar"),
      city_en: val("f_city_en"),
      // المحافظة = نفس المدينة (نسخة طبق الأصل)
      governorate_ar: val("f_city_ar"),
      governorate_en: val("f_city_en"),
      district_ar: val("f_district_ar"),
      district_en: val("f_district_en"),
      location: val("f_location"),
      latitude: val("f_latitude"),
      longitude: val("f_longitude"),
      
      // المواصفات
      area: val("f_area"),
      rooms: val("f_rooms"),
      bathrooms: val("f_bathrooms"),
      floor: val("f_floor"),
      
      // التفاصيل الإضافية
      direction_ar: val("f_direction_ar"),
      direction_en: val("f_direction_en"),
      elevator_ar: val("f_elevator_ar"),
      elevator_en: val("f_elevator_en"),
      finishing_ar: val("f_finishing_ar"),
      finishing_en: val("f_finishing_en"),
      ownership_ar: val("f_ownership_ar"),
      ownership_en: val("f_ownership_en"),
      parking_ar: val("f_parking_ar"),
      parking_en: val("f_parking_en"),
      
      // المالك
      owner_name: val("f_owner_name"),
      owner_phone: val("f_owner_phone"),
      owner_type: val("f_owner_type"),
      commission: val("f_commission"),
      
      // الحالة
      status: val("f_status"),
      featured: val("f_featured"),
      
      // الصور والوصف
      images: val("f_images"),
      description_ar: val("f_description_ar"),
      description_en: val("f_description_en"),
      notes: val("f_notes"),
      
      // المعرف (للتعديل)
      id: document.getElementById("f_id")?.value || null
    };
  }
   function val(id) {
     return document.getElementById(id).value.trim();
   }
   
   document.getElementById("addPropertyBtn").addEventListener("click", () => {
     openModal(
       "إضافة عقار جديد",
       propertyFormHtml(),
       `<button class="btn" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" onclick="submitNewProperty()">حفظ العقار</button>`
     );
   });
   async function submitNewProperty() {
    const property = readPropertyForm();
    // ✅ لا يوجد شيء إجباري - المستخدم حر
    const res = await apiCall("addProperty", { property });
    if (res && res.ok) {
      toast("تمت إضافة العقار", "success");
      closeModal();
      loadProperties();
    } else {
      toast((res && res.message) || "تعذّرت الإضافة", "error");
    }
  }
  
  async function submitEditProperty(id) {
    const property = readPropertyForm();
    // ✅ لا يوجد شيء إجباري - المستخدم حر
    const res = await apiCall("updateProperty", { id, property });
    if (res && res.ok) {
      toast("تم حفظ التعديلات", "success");
      closeModal();
      loadProperties();
    } else {
      toast((res && res.message) || "تعذّر الحفظ", "error");
    }
  }
   
   function editProperty(id) {
     const p = state.properties.find((x) => x.id === id);
     if (!p) return;
     openModal(
       "تعديل العقار",
       propertyFormHtml(p),
       `<button class="btn" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" onclick="submitEditProperty('${id}')">حفظ التعديلات</button>`
     );
   }

   async function submitEditProperty(id) {
    const property = readPropertyForm();
    if (!property.title_ar) return toast("العنوان بالعربية مطلوب", "error");
    
    const res = await apiCall("updateProperty", { id, property });
    if (res && res.ok) {
      toast("تم حفظ التعديلات", "success");
      closeModal();
      loadProperties();
    } else {
      toast((res && res.message) || "تعذّر الحفظ", "error");
    }
  }
   
   async function deleteProperty(id) {
     if (!confirm("هل أنت متأكد من حذف هذا العقار؟ لا يمكن التراجع عن هذا الإجراء.")) return;
     const res = await apiCall("deleteProperty", { id });
     if (res && res.ok) {
       toast("تم حذف العقار", "success");
       loadProperties();
     } else {
       toast((res && res.message) || "تعذّر الحذف", "error");
     }
   }
   
   /* ============================================================
   إدارة الطلبات (نسخة كاملة)
   ============================================================ */

async function loadRequests() {
  try {
    const res = await apiCall("getRequests", {});
    if (!res || !res.ok) {
      toast("تعذّر تحميل الطلبات", "error");
      return;
    }
    state.requests = res.requests || [];
    console.log("✅ تم تحميل الطلبات:", state.requests.length);
    renderRequests();
    updateRequestsCount();
  } catch (e) {
    console.error("❌ خطأ في loadRequests:", e);
    toast("تعذّر الاتصال بالخادم", "error");
  }
}

function updateRequestsCount() {
  const count = state.requests.length;
  const pending = state.requests.filter(r => r.status === 'قيد المراجعة' || r.status === 'pending').length;
  const el = document.getElementById('requestsCount');
  if (el) el.textContent = `${count} طلب (${pending} قيد المراجعة)`;
}

function renderRequests() {
  const search = document.getElementById('reqSearch')?.value?.trim().toLowerCase() || '';
  const status = document.getElementById('reqFilterStatus')?.value || '';
  const type = document.getElementById('reqFilterType')?.value || '';

  const rows = state.requests.filter((r) => {
    if (status && r.status !== status) return false;
    if (type && r.type !== type) return false;
    if (search) {
      const hay = `${r.ownerName || r.fullName || ''} ${r.phone || ''} ${r.title || r.propertyTitle || ''} ${r.id || ''}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const body = document.getElementById("requestsBody");
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="18"><div class="empty-state"><i class="fa-solid fa-inbox"></i>لا توجد طلبات مطابقة</div></td></tr>`;
    return;
  }

  const reqStatusMap = {
    "قيد المراجعة": "badge-warning",
    "pending": "badge-warning",
    "موافق عليه": "badge-success",
    "approved": "badge-success",
    "مرفوض": "badge-danger",
    "rejected": "badge-danger",
  };

  body.innerHTML = rows.map((r, index) => {
    const statusLabel = r.status === 'pending' ? 'قيد المراجعة' : 
                        r.status === 'approved' ? 'موافق عليه' : 
                        r.status === 'rejected' ? 'مرفوض' : r.status || 'قيد المراجعة';
    
    const isPending = statusLabel === 'قيد المراجعة';
    
    return `
    <tr style="${isPending ? 'background: rgba(243, 156, 18, 0.04);' : ''}">
      <td><span class="badge badge-neutral" style="font-size: 11px;">${r.id || '—'}</span></td>
      <td style="font-size: 12px; color: var(--ink-soft);">${r.requestDate ? new Date(r.requestDate).toLocaleDateString('ar-EG') : '—'}</td>
      <td><strong>${r.ownerName || r.fullName || '—'}</strong></td>
      <td dir="ltr" style="font-size: 13px;">${r.phone || '—'}</td>
      <td>${r.title || r.propertyTitle || '—'}</td>
      <td style="font-weight: 600; color: var(--gold);">${r.price ? Number(r.price).toLocaleString('ar-EG') + ' ' + (r.currency || '$') : '—'}</td>
      <td><span class="badge ${r.type === 'sale' ? 'badge-success' : 'badge-warning'}">${r.type === 'sale' ? 'للبيع' : r.type === 'rent' ? 'للإيجار' : '—'}</span></td>
      <td>${r.propertyType || '—'}</td>
      <td>${r.area || '—'} م²</td>
      <td>${r.rooms || '—'}</td>
      <td>${r.bathrooms || '—'}</td>
      <td>${r.governorate || '—'}</td>
      <td>${r.district || '—'}</td>
      <td>${r.ownership || '—'}</td>
      <td>${r.finishing || '—'}</td>
      <td>${r.mapLink ? `<a href="${r.mapLink}" target="_blank" style="color: var(--primary);"><i class="fa-solid fa-map-location-dot"></i></a>` : '—'}</td>
      <td><span class="badge ${reqStatusMap[r.status] || reqStatusMap[statusLabel] || 'badge-neutral'}">${statusLabel}</span></td>
      <td>
        <div class="row-actions" style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${isPending ? `
            <button class="btn btn-icon btn-sm btn-gold-outline" onclick="approveRequest('${r.id}')" title="موافقة وإضافة إلى العقارات" style="background: #27ae60; color: white; border-color: #27ae60;">
              <i class="fa-solid fa-check"></i>
            </button>
            <button class="btn btn-icon btn-sm" onclick="rejectRequest('${r.id}')" title="رفض" style="background: #e74c3c; color: white; border-color: #e74c3c;">
              <i class="fa-solid fa-xmark"></i>
            </button>
          ` : ''}
          <button class="btn btn-icon btn-sm" onclick="viewRequestDetails('${r.id}')" title="تفاصيل" style="background: #3498db; color: white; border-color: #3498db;">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="btn btn-icon btn-sm btn-danger-outline" onclick="deleteRequest('${r.id}')" title="حذف">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

// ===== ربط فلاتر الطلبات =====
document.getElementById("reqSearch")?.addEventListener("input", renderRequests);
document.getElementById("reqFilterStatus")?.addEventListener("change", renderRequests);
document.getElementById("reqFilterType")?.addEventListener("change", renderRequests);
   
   function renderRequests() {
     const status = document.getElementById("reqFilterStatus").value;
     const rows = state.requests.filter((r) => !status || r.status === status);
     const body = document.getElementById("requestsBody");
     if (!rows.length) {
       body.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-inbox"></i>لا توجد طلبات</div></td></tr>`;
       return;
     }
     const reqStatusMap = {
       "قيد المراجعة": "badge-warning",
       "موافق عليه": "badge-success",
       "مرفوض": "badge-danger",
     };
     body.innerHTML = rows
       .map(
         (r) => `
       <tr>
         <td>${r.id || "—"}</td>
         <td>${r.fullName || "—"}</td>
         <td>${r.phone || "—"}</td>
         <td>${r.propertyType || "—"}</td>
         <td>${r.requestDate ? new Date(r.requestDate).toLocaleDateString('ar-EG') : "—"}</td>
         <td><span class="badge ${reqStatusMap[r.status] || "badge-neutral"}">${r.status || "—"}</span></td>
         <td>
           <div class="row-actions">
             ${
               r.status === "قيد المراجعة"
                 ? `<button class="btn btn-icon btn-sm btn-gold-outline" onclick="convertRequest('${r.id}')" title="تحويل إلى عقار"><i class="fa-solid fa-right-left"></i></button>
                    <button class="btn btn-icon btn-sm" onclick="setRequestStatus('${r.id}','مرفوض')" title="رفض"><i class="fa-solid fa-xmark"></i></button>`
                 : ""
             }
             <button class="btn btn-icon btn-sm btn-danger-outline" onclick="deleteRequest('${r.id}')" title="حذف"><i class="fa-solid fa-trash"></i></button>
           </div>
         </td>
       </tr>`
       )
       .join("");
   }
   
   async function setRequestStatus(id, status) {
     const res = await apiCall("updateRequestStatus", { id, status });
     if (res && res.ok) {
       toast("تم تحديث حالة الطلب", "success");
       loadRequests();
     } else {
       toast((res && res.message) || "تعذّر التحديث", "error");
     }
   }
   async function convertRequest(id) {
     if (!confirm("سيتم تحويل هذا الطلب إلى عقار جديد في القاعدة الرئيسية. متابعة؟")) return;
     const res = await apiCall("convertRequestToProperty", { id });
     if (res && res.ok) {
       toast("تم تحويل الطلب إلى عقار", "success");
       loadRequests();
     } else {
       toast((res && res.message) || "تعذّر التحويل", "error");
     }
   }
   async function deleteRequest(id) {
     if (!confirm("هل تريد حذف هذا الطلب نهائياً؟")) return;
     const res = await apiCall("deleteRequest", { id });
     if (res && res.ok) {
       toast("تم حذف الطلب", "success");
       loadRequests();
     } else {
       toast((res && res.message) || "تعذّر الحذف", "error");
     }
   }
   
   /* ============================================================
      إدارة المستخدمين
      ============================================================ */
   async function loadUsers() {
     try {
       const res = await apiCall("getUsers", {});
       if (!res || !res.ok) {
         toast("تعذّر تحميل المستخدمين", "error");
         return;
       }
       state.users = res.users || [];
       renderUsers();
     } catch (e) {
       console.error("❌ خطأ في loadUsers:", e);
       toast("تعذّر الاتصال بالخادم", "error");
     }
   }
   const ALL_PERMISSIONS = [
     { key: "manage_properties", label: "إدارة العقارات" },
     { key: "manage_requests", label: "إدارة الطلبات" },
     { key: "manage_users", label: "إدارة المستخدمين" },
     { key: "view_stats", label: "عرض الإحصائيات" },
     { key: "manage_settings", label: "إدارة الإعدادات" },
   ];
   
   function renderUsers() {
     const body = document.getElementById("usersBody");
     if (!state.users.length) {
       body.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-users"></i>لا يوجد مستخدمون إضافيون بعد</div></td></tr>`;
       return;
     }
     body.innerHTML = state.users
       .map(
         (u) => `
       <tr>
         <td>${u.id || "—"}</td>
         <td>${u.username || "—"}</td>
         <td>${u.role === "full_access" ? "مدير رئيسي" : "مشرف"}</td>
         <td>${u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('ar-EG') : "لم يسجّل دخول بعد"}</td>
         <td>
           <div class="row-actions">
             <button class="btn btn-icon btn-sm" onclick="editUser('${u.id}')" title="تعديل"><i class="fa-solid fa-pen"></i></button>
             <button class="btn btn-icon btn-sm btn-danger-outline" onclick="deleteUser('${u.id}')" title="حذف"><i class="fa-solid fa-trash"></i></button>
           </div>
         </td>
       </tr>`
       )
       .join("");
   }
   
   function userFormHtml(u = {}) {
     const perms = u.permissions || [];
     return `
     <div class="form-field" style="margin-bottom:14px;">
       <label>اسم المستخدم</label>
       <input id="u_username" value="${u.username || ""}">
     </div>
     <div class="form-field" style="margin-bottom:14px;">
       <label>${u.id ? "كلمة مرور جديدة (اتركها فارغة لعدم التغيير)" : "كلمة المرور"}</label>
       <input id="u_password" type="password">
     </div>
     <div class="form-field" style="margin-bottom:14px;">
       <label>الدور</label>
       <select id="u_role" onchange="document.getElementById('permBlock').style.display = this.value==='full_access' ? 'none':'block'">
         <option value="supervisor" ${u.role !== "full_access" ? "selected" : ""}>مشرف</option>
         <option value="full_access" ${u.role === "full_access" ? "selected" : ""}>مدير رئيسي (كل الصلاحيات)</option>
       </select>
     </div>
     <div id="permBlock" style="display:${u.role === "full_access" ? "none" : "block"}">
       <label style="font-size:12.5px; font-weight:600; color:var(--ink-soft);">الصلاحيات</label>
       <div class="perm-grid">
         ${ALL_PERMISSIONS.map(
           (p) => `
           <label class="perm-chip">
             <input type="checkbox" value="${p.key}" ${perms.includes(p.key) ? "checked" : ""} class="u_perm">
             ${p.label}
           </label>`
         ).join("")}
       </div>
     </div>`;
   }
   
   document.getElementById("addUserBtn").addEventListener("click", () => {
     openModal(
       "إضافة مستخدم جديد",
       userFormHtml(),
       `<button class="btn" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" onclick="submitNewUser()">حفظ</button>`
     );
   });
   function readUserForm() {
     const role = val("u_role");
     const permissions =
       role === "full_access"
         ? ["full_access"]
         : [...document.querySelectorAll(".u_perm:checked")].map((c) => c.value);
     return { username: val("u_username"), password: val("u_password"), role, permissions };
   }
   async function submitNewUser() {
     const user = readUserForm();
     if (!user.username || !user.password) return toast("اسم المستخدم وكلمة المرور مطلوبان", "error");
     const res = await apiCall("addUser", { user });
     if (res && res.ok) {
       toast("تمت إضافة المستخدم", "success");
       closeModal();
       loadUsers();
     } else {
       toast((res && res.message) || "تعذّرت الإضافة", "error");
     }
   }
   function editUser(id) {
     const u = state.users.find((x) => x.id === id);
     if (!u) return;
     openModal(
       "تعديل المستخدم",
       userFormHtml(u),
       `<button class="btn" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" onclick="submitEditUser('${id}')">حفظ التعديلات</button>`
     );
   }
   async function submitEditUser(id) {
     const user = readUserForm();
     if (!user.password) delete user.password;
     const res = await apiCall("updateUser", { id, user });
     if (res && res.ok) {
       toast("تم حفظ التعديلات", "success");
       closeModal();
       loadUsers();
     } else {
       toast((res && res.message) || "تعذّر الحفظ", "error");
     }
   }
   async function deleteUser(id) {
     if (!confirm("هل تريد حذف هذا المستخدم؟")) return;
     const res = await apiCall("deleteUser", { id });
     if (res && res.ok) {
       toast("تم حذف المستخدم", "success");
       loadUsers();
     } else {
       toast((res && res.message) || "تعذّر الحذف", "error");
     }
   }
   
   /* ============================================================
      الإعدادات
      ============================================================ */
   document.getElementById("saveSettingsBtn").addEventListener("click", async () => {
     const newUsername = val("newUsername");
     const newPassword = val("newPassword");
     const confirmPassword = val("confirmPassword");
   
     if (!newUsername && !newPassword) return toast("لا يوجد تغيير لحفظه", "error");
     if (newPassword && newPassword !== confirmPassword)
       return toast("كلمتا المرور غير متطابقتين", "error");
   
     const res = await apiCall("updateSettings", {
       username: newUsername || undefined,
       password: newPassword || undefined,
     });
     if (res && res.ok) {
       toast("تم حفظ الإعدادات، سيتم تسجيل خروجك الآن", "success");
       setTimeout(logout, 1500);
     } else {
       toast((res && res.message) || "تعذّر الحفظ", "error");
     }
   });
   
   // ============================================================
   // إدارة إجمالي الزوار
   // ============================================================
   
   async function loadCurrentVisitors() {
     try {
       const res = await apiCall('getStats', { period: 'month' });
       if (res && res.ok && res.stats) {
         const visitors = res.stats.totalVisitors || 0;
         const display = document.getElementById('currentVisitorsDisplay');
         const input = document.getElementById('visitorsCountInput');
         if (display) display.textContent = `العدد الحالي: ${Number(visitors).toLocaleString()}`;
         if (input) input.placeholder = visitors;
       }
     } catch (e) {
       console.error('❌ خطأ في جلب عدد الزوار:', e);
       const display = document.getElementById('currentVisitorsDisplay');
       if (display) display.textContent = 'العدد الحالي: غير معروف';
     }
   }
   
   async function updateVisitorsCount() {
     const input = document.getElementById('visitorsCountInput');
     if (!input) return;
     const newCount = parseInt(input.value.trim());
     
     if (isNaN(newCount) || newCount < 0) {
       toast('❌ يرجى إدخال عدد صحيح موجب', 'error');
       return;
     }
     
     if (!confirm(`⚠️ هل أنت متأكد من تغيير عدد الزوار إلى ${newCount.toLocaleString()}؟`)) {
       return;
     }
     
     try {
       const btn = document.getElementById('updateVisitorsBtn');
       if (btn) {
         btn.disabled = true;
         btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
       }
       
       const res = await apiCall('updateVisitorsCount', { count: newCount });
       
       if (res && res.ok) {
         toast(`✅ تم تحديث عدد الزوار إلى ${newCount.toLocaleString()}`, 'success');
         const display = document.getElementById('currentVisitorsDisplay');
         if (display) display.textContent = `العدد الحالي: ${newCount.toLocaleString()}`;
         if (input) {
           input.value = '';
           input.placeholder = newCount;
         }
         loadStatsCharts();
       } else {
         toast((res && res.message) || '❌ فشل تحديث عدد الزوار', 'error');
       }
     } catch (e) {
       console.error('❌ خطأ في تحديث عدد الزوار:', e);
       toast('❌ فشل الاتصال بالخادم', 'error');
     } finally {
       const btn = document.getElementById('updateVisitorsBtn');
       if (btn) {
         btn.disabled = false;
         btn.innerHTML = '<i class="fas fa-save"></i> تحديث';
       }
     }
   }
   
   // ============================================================
   // إدارة إجمالي الاستفسارات
   // ============================================================
   
   async function loadCurrentContacts() {
     try {
       const res = await apiCall('getStats', { period: 'month' });
       if (res && res.ok && res.stats) {
         const contacts = res.stats.totalContacts || 0;
         const display = document.getElementById('currentContactsDisplay');
         const input = document.getElementById('contactsCountInput');
         if (display) display.textContent = `العدد الحالي: ${Number(contacts).toLocaleString()}`;
         if (input) input.placeholder = contacts;
       }
     } catch (e) {
       console.error('❌ خطأ في جلب عدد الاستفسارات:', e);
       const display = document.getElementById('currentContactsDisplay');
       if (display) display.textContent = 'العدد الحالي: غير معروف';
     }
   }
   
   async function updateContactsCount() {
     const input = document.getElementById('contactsCountInput');
     if (!input) return;
     const newCount = parseInt(input.value.trim());
     
     if (isNaN(newCount) || newCount < 0) {
       toast('❌ يرجى إدخال عدد صحيح موجب', 'error');
       return;
     }
     
     if (!confirm(`⚠️ هل أنت متأكد من تغيير عدد الاستفسارات إلى ${newCount.toLocaleString()}؟`)) {
       return;
     }
     
     try {
       const btn = document.getElementById('updateContactsBtn');
       if (btn) {
         btn.disabled = true;
         btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
       }
       
       const res = await apiCall('updateContactsCount', { count: newCount });
       
       if (res && res.ok) {
         toast(`✅ تم تحديث عدد الاستفسارات إلى ${newCount.toLocaleString()}`, 'success');
         const display = document.getElementById('currentContactsDisplay');
         if (display) display.textContent = `العدد الحالي: ${newCount.toLocaleString()}`;
         if (input) {
           input.value = '';
           input.placeholder = newCount;
         }
         loadStatsCharts();
       } else {
         toast((res && res.message) || '❌ فشل تحديث عدد الاستفسارات', 'error');
       }
     } catch (e) {
       console.error('❌ خطأ في تحديث عدد الاستفسارات:', e);
       toast('❌ فشل الاتصال بالخادم', 'error');
     } finally {
       const btn = document.getElementById('updateContactsBtn');
       if (btn) {
         btn.disabled = false;
         btn.innerHTML = '<i class="fas fa-save"></i> تحديث';
       }
     }
   }
   
   // ============================================================
   // ربط الأحداث عند تحميل الصفحة
   // ============================================================
   
   document.addEventListener('DOMContentLoaded', function() {
     setTimeout(() => {
       // زر تحديث الزوار
       const updateVisitorsBtn = document.getElementById('updateVisitorsBtn');
       if (updateVisitorsBtn) {
         updateVisitorsBtn.addEventListener('click', updateVisitorsCount);
       }
       
       const visitorsInput = document.getElementById('visitorsCountInput');
       if (visitorsInput) {
         visitorsInput.addEventListener('keypress', function(e) {
           if (e.key === 'Enter') updateVisitorsCount();
         });
       }
       
       loadCurrentVisitors();
       
       // زر تحديث الاستفسارات
       const updateContactsBtn = document.getElementById('updateContactsBtn');
       if (updateContactsBtn) {
         updateContactsBtn.addEventListener('click', updateContactsCount);
       }
       
       const contactsInput = document.getElementById('contactsCountInput');
       if (contactsInput) {
         contactsInput.addEventListener('keypress', function(e) {
           if (e.key === 'Enter') updateContactsCount();
         });
       }
       
       loadCurrentContacts();
     }, 500);
   });

   // ============================================================
// دوال إدارة الطلبات المتقدمة
// ============================================================

// ✅ الموافقة على الطلب وإضافته إلى العقارات
async function approveRequest(id) {
  if (!confirm("⚠️ هل أنت متأكد من الموافقة على هذا الطلب وتحويله إلى عقار؟")) return;
  
  const btn = event?.target?.closest?.('button');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }
  
  try {
    const res = await apiCall("approveRequest", { id });
    if (res && res.ok) {
      toast("✅ تمت الموافقة وإضافة العقار بنجاح", "success");
      loadRequests();
      loadProperties();
    } else {
      toast((res && res.message) || "❌ فشل الموافقة على الطلب", "error");
    }
  } catch (e) {
    console.error("❌ خطأ في approveRequest:", e);
    toast("❌ فشل الاتصال بالخادم", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i>'; }
  }
}

// ✅ رفض الطلب
async function rejectRequest(id) {
  if (!confirm("⚠️ هل أنت متأكد من رفض هذا الطلب؟")) return;
  
  const btn = event?.target?.closest?.('button');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }
  
  try {
    const res = await apiCall("rejectRequest", { id });
    if (res && res.ok) {
      toast("✅ تم رفض الطلب", "success");
      loadRequests();
    } else {
      toast((res && res.message) || "❌ فشل رفض الطلب", "error");
    }
  } catch (e) {
    console.error("❌ خطأ في rejectRequest:", e);
    toast("❌ فشل الاتصال بالخادم", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-xmark"></i>'; }
  }
}

// ✅ عرض تفاصيل الطلب في مودال
function viewRequestDetails(id) {
  const req = state.requests.find(r => r.id === id);
  if (!req) {
    toast("❌ الطلب غير موجود", "error");
    return;
  }
  
  const fields = [
    ['رقم الطلب', req.id],
    ['تاريخ الطلب', req.requestDate ? new Date(req.requestDate).toLocaleString('ar-EG') : '—'],
    ['اسم المالك', req.ownerName || req.fullName || '—'],
    ['رقم الهاتف', req.phone || '—'],
    ['عنوان العقار', req.title || req.propertyTitle || '—'],
    ['السعر', req.price ? Number(req.price).toLocaleString('ar-EG') + ' ' + (req.currency || '$') : '—'],
    ['نوع العملية', req.type === 'sale' ? 'للبيع' : req.type === 'rent' ? 'للإيجار' : '—'],
    ['نوع العقار', req.propertyType || '—'],
    ['المساحة', req.area ? req.area + ' م²' : '—'],
    ['عدد الغرف', req.rooms || '—'],
    ['عدد الحمامات', req.bathrooms || '—'],
    ['المحافظة', req.governorate || '—'],
    ['المنطقة', req.district || '—'],
    ['نوع الملكية', req.ownership || '—'],
    ['نوع الإكساء', req.finishing || '—'],
    ['الوصف', req.description || '—'],
    ['رابط الخريطة', req.mapLink ? `<a href="${req.mapLink}" target="_blank">${req.mapLink}</a>` : '—'],
    ['الحالة', req.status === 'pending' ? 'قيد المراجعة' : req.status === 'approved' ? 'موافق عليه' : req.status === 'rejected' ? 'مرفوض' : req.status || '—'],
  ];
  
  let html = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; padding: 4px 0;">`;
  fields.forEach(([label, value]) => {
    html += `
      <div style="display: flex; flex-direction: column; padding: 6px 0; border-bottom: 1px solid var(--line); ${label === 'الوصف' ? 'grid-column: 1 / -1;' : ''}">
        <span style="font-size: 11px; color: var(--ink-soft); font-weight: 600;">${label}</span>
        <span style="font-size: 14px; color: var(--ink);">${value}</span>
      </div>
    `;
  });
  html += `</div>`;
  
  openModal(
    `📋 تفاصيل الطلب #${req.id}`,
    html,
    `<button class="btn" onclick="closeModal()">إغلاق</button>
     ${req.status === 'pending' ? `<button class="btn btn-success" onclick="approveRequest('${req.id}'); closeModal();">موافقة</button>
     <button class="btn btn-danger" onclick="rejectRequest('${req.id}'); closeModal();">رفض</button>` : ''}`
  );
}

// ============================================================
// الترجمة التلقائية (Auto Translate)
// ============================================================

function autoTranslateFields() {
  // خريطة الترجمة العربية → إنجليزية
  const translationMap = {
    'شمالي': 'North',
    'جنوبي': 'South',
    'شرقي': 'East',
    'غربي': 'West',
    'شمالي شرقي': 'Northeast',
    'شمالي غربي': 'Northwest',
    'جنوبي شرقي': 'Southeast',
    'جنوبي غربي': 'Southwest',
    'نعم': 'Yes',
    'لا': 'No',
    'فاخر': 'Luxury',
    'جيد': 'Good',
    'عادي': 'Normal',
    'على العضم': 'Shell & Core',
    'طابو أخضر': 'Green Title Deed',
    'مشاع (أسهم)': 'Shared (Shares)',
    'حكم محكمة': 'Court Ruling',
    'دمشق': 'Damascus',
    'حلب': 'Aleppo',
    'حمص': 'Homs',
    'اللاذقية': 'Latakia',
    'طرطوس': 'Tartus',
    'حماة': 'Hama',
    'دير الزور': 'Deir ez-Zor',
    'الحسكة': 'Al-Hasakah',
    'الرقة': 'Ar-Raqqah',
    'إدلب': 'Idlib',
    'درعا': 'Daraa',
    'السويداء': 'As-Suwayda',
    'القنيطرة': 'Quneitra',
    'شقة': 'Apartment',
    'منزل': 'House',
    'فيلا': 'Villa',
    'محل تجاري': 'Shop',
    'بناء كامل': 'Building',
    'أرض': 'Land'
  };
  
  // الحقول العربية ومقابلاتها الإنجليزية
  const fields = [
    { ar: 'f_city_ar', en: 'f_city_en' },
    { ar: 'f_governorate_ar', en: 'f_governorate_en' },
    { ar: 'f_district_ar', en: 'f_district_en' },
    { ar: 'f_direction_ar', en: 'f_direction_en' },
    { ar: 'f_elevator_ar', en: 'f_elevator_en' },
    { ar: 'f_finishing_ar', en: 'f_finishing_en' },
    { ar: 'f_ownership_ar', en: 'f_ownership_en' },
    { ar: 'f_parking_ar', en: 'f_parking_en' },
    { ar: 'f_description_ar', en: 'f_description_en' },
    { ar: 'f_title_ar', en: 'f_title_en' },
  ];
  
  fields.forEach(({ ar, en }) => {
    const arField = document.getElementById(ar);
    const enField = document.getElementById(en);
    if (!arField || !enField) return;
    
    const arabicText = arField.value.trim();
    
    // إذا كانت القيمة موجودة في خريطة الترجمة
    if (translationMap[arabicText]) {
      enField.value = translationMap[arabicText];
    }
    // إذا كان الحقل فارغاً، امسح الإنجليزي
    else if (arabicText === '') {
      // لا نفعل شيء، نترك المستخدم يكتب بنفسه
    }
  });
}

// دالة إظهار/إخفاء مدة الإيجار
function toggleRentPeriod() {
  const type = document.getElementById('f_type').value;
  const rentField = document.getElementById('rentPeriodField');
  if (type === 'rent') {
    rentField.style.display = 'block';
  } else {
    rentField.style.display = 'none';
  }
}

// ربط دالة الترجمة التلقائية عند تغيير أي حقل عربي
document.addEventListener('DOMContentLoaded', function() {
  // ربط الترجمة التلقائية
  const arabicFields = [
    'f_city_ar', 'f_governorate_ar', 'f_district_ar',
    'f_direction_ar', 'f_elevator_ar', 'f_finishing_ar',
    'f_ownership_ar', 'f_parking_ar', 'f_description_ar',
    'f_title_ar'
  ];
  
  arabicFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', autoTranslateFields);
      el.addEventListener('change', autoTranslateFields);
    }
  });
  
  // تفعيل إخفاء/إظهار مدة الإيجار
  toggleRentPeriod();
});
   
   /* ---------------- تشغيل ---------------- */
   initUserChrome();
   loadHome();