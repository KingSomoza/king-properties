/* ============================================================
   لوحة التحكم — المنطق الرئيسي
   كل نداء للخادم يمر عبر apiCall(action, payload) المعرّفة في session.js
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
    
    // ✅ تأكد من وجود هذا السطر
    if (name === "stats") {
      console.log("📊 تم التبديل إلى صفحة الإحصائيات");
      setTimeout(loadStatsCharts, 500);
    }
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
          // ✅ أولاً: تأكد من تحميل البيانات
          if (state.properties.length === 0) {
            await loadProperties();
          }
          if (state.requests.length === 0) {
            await loadRequests();
          }
          if (state.users.length === 0) {
            await loadUsers();
          }
          
          // ✅ محاولة قراءة من التخزين المؤقت أولاً
          const cachedData = getCachedData();
          if (cachedData) {
            renderDashboard(cachedData);
            return;
          }
          
          // ✅ محاولة جلب البيانات من الخادم
          let statsData = null;
          try {
            const res = await apiCall("getStats", { period: "week" });
            if (res && res.ok) {
              statsData = res.stats;
            }
          } catch (e) {
            console.warn("⚠️ فشل جلب البيانات من الخادم، استخدام البيانات المحلية", e);
          }
          
          // ✅ إذا لم تكن هناك بيانات من الخادم، استخدم البيانات المحلية
          if (!statsData) {
            statsData = buildLocalStatsForHome();
          }
          
          // ✅ حفظ في التخزين المؤقت
          setCachedData(statsData);
          renderDashboard(statsData);
          
        } catch (e) {
          console.error("❌ خطأ في loadHome:", e);
          toast("تعذّر تحميل الإحصائيات", "error");
          
          // ✅ استخدام البيانات المحلية كحل أخير
          const localStats = buildLocalStatsForHome();
          renderDashboard(localStats);
        }
      }
   
   /* ---------- بناء إحصائيات محلية للصفحة الرئيسية ---------- */
   function buildLocalStatsForHome() {
    const properties = state.properties || [];
    const requests = state.requests || [];
    const users = state.users || [];
    
    // ✅ تأكد من أن البيانات موجودة
    console.log("📊 بناء إحصائيات محلية:", {
      properties: properties.length,
      requests: requests.length,
      users: users.length
    });
    
    // حساب العقارات المتاحة والمباعة
    let available = 0;
    let sold = 0;
    properties.forEach(p => {
      if (p.available) available++;
      else sold++;
    });
    
    // عدد الطلبات المعلقة
    const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'قيد المراجعة').length;
    
    // عدد الزوار من localStorage
    const visitors = parseInt(localStorage.getItem('kh_visitors_total') || '0');
    
    return {
      totalProperties: properties.length,
      totalRequests: requests.length,
      totalUsers: users.length || 1,
      totalVisitors: visitors || 0,
      availableCount: available,
      soldCount: sold,
      pendingRequestsCount: pendingRequests,
      forSaleCount: properties.filter(p => p.type === 'sale').length,
      forRentCount: properties.filter(p => p.type === 'rent').length,
      recentProperties: properties.slice(-5).reverse(),
      recentRequests: requests.slice(-5).reverse(),
    };
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
    // ✅ استخدام البيانات من state إذا كانت stats فارغة
    if (!stats || Object.keys(stats).length === 0) {
      stats = buildLocalStatsForHome();
    }
    
    // ✅ عرض بطاقات الإحصائيات
    renderStatCards(stats);
    
    // ✅ إضافة بيانات إضافية للرسوم البيانية من state.properties
    const propertyTypes = {};
    const governorates = {};
    
    // استخدام state.properties إذا كانت موجودة
    const props = state.properties || [];
    props.forEach(p => {
      const type = p.property_type || p.propertyType || 'unknown';
      propertyTypes[type] = (propertyTypes[type] || 0) + 1;
      
      const gov = p.governorate_ar || p.governorate || 'غير محدد';
      governorates[gov] = (governorates[gov] || 0) + 1;
    });
    
    stats.propertyTypes = propertyTypes;
    stats.governorates = governorates;
    
    // ✅ عرض الرسوم البيانية
    if (typeof renderHomeCharts === "function") {
      renderHomeCharts(stats);
    }
    
    // ✅ عرض أحدث العقارات - استخدام state.properties
    const recentProperties = stats.recentProperties || props.slice(-5).reverse();
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
    
    // ✅ عرض أحدث الطلبات - استخدام state.requests
    const recentRequests = stats.recentRequests || state.requests.slice(-5).reverse();
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
    const pendingCount = stats.pendingRequestsCount || state.requests.filter(r => r.status === 'قيد المراجعة' || r.status === 'pending').length;
    if (pendingCount > 0) {
      badge.style.display = "inline-block";
      badge.textContent = pendingCount;
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
          
          // ✅ تحديث الصفحة الرئيسية بعد تحميل العقارات
          if (document.getElementById("view-home").classList.contains("active")) {
            loadHome();
          }
        } catch (e) {
          console.error("❌ خطأ في loadProperties:", e);
          toast("تعذّر الاتصال بالخادم", "error");
        }
      }
      
      async function loadRequests() {
        try {
          const res = await apiCall("getRequests", {});
          if (res && res.ok) {
            state.requests = res.requests || [];
            console.log("✅ تم تحميل الطلبات:", state.requests.length);
            renderRequests();
            updateRequestsCount();
            
            // ✅ تحديث الصفحة الرئيسية بعد تحميل الطلبات
            if (document.getElementById("view-home").classList.contains("active")) {
              loadHome();
            }
          } else {
            toast("تعذّر تحميل الطلبات", "error");
          }
        } catch (e) {
          console.error("❌ خطأ في loadRequests:", e);
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
       if (type && p.type !== type) return false;
       if (status) {
         const pStatus = p.status || (p.available === true ? 'نشط' : 'غير نشط');
         if (pStatus !== status) return false;
       }
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
   
   // ============================================================
   // ✅ نموذج إضافة/تعديل العقار (مختصر)
   // ============================================================
   
   function propertyFormHtml(p = {}) {
     const isEdit = !!p.id;
     return `
     <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 12px;">
       <div class="form-field full">
         <label>العنوان (عربي)</label>
         <input id="f_title_ar" value="${p.title_ar || p.title || ''}" placeholder="مثال: شقة فاخرة في دمشق">
       </div>
       <div class="form-field full">
         <label>العنوان (إنجليزي)</label>
         <input id="f_title_en" value="${p.title_en || ''}" placeholder="Example: Luxury Apartment in Damascus">
       </div>
       <div class="form-field">
         <label>نوع العملية</label>
         <select id="f_type">
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
         <input id="f_price" value="${p.price || ''}" placeholder="250000">
       </div>
       <div class="form-field">
         <label>العملة</label>
         <select id="f_currency">
           <option value="$" ${p.currency === '$' ? 'selected' : ''}>$ USD</option>
           <option value="EUR" ${p.currency === 'EUR' ? 'selected' : ''}>€ EUR</option>
           <option value="SYP" ${p.currency === 'SYP' ? 'selected' : ''}>ل.س SYP</option>
         </select>
       </div>
       <div class="form-field">
         <label>المدينة</label>
         <input id="f_city" value="${p.city || ''}" placeholder="دمشق">
       </div>
       <div class="form-field">
         <label>المنطقة</label>
         <input id="f_district" value="${p.district || ''}" placeholder="الميدان">
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
         <label>الحالة</label>
         <select id="f_status">
           <option value="نشط" ${p.status === 'نشط' || p.available === true ? 'selected' : ''}>نشط</option>
           <option value="غير نشط" ${p.status === 'غير نشط' ? 'selected' : ''}>غير نشط</option>
           <option value="مباع" ${p.status === 'مباع' ? 'selected' : ''}>مباع</option>
         </select>
       </div>
       <div class="form-field full">
         <label>الوصف</label>
         <textarea id="f_description" rows="2" placeholder="وصف العقار...">${p.description || ''}</textarea>
       </div>
       <div class="form-field full">
         <label>روابط الصور</label>
         <input id="f_images" value="${p.images || ''}" placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg">
       </div>
       ${isEdit ? `<input type="hidden" id="f_id" value="${p.id}">` : ''}
     </div>`;
   }
   
   function readPropertyForm() {
     return {
       title_ar: document.getElementById("f_title_ar")?.value?.trim() || '',
       title_en: document.getElementById("f_title_en")?.value?.trim() || '',
       type: document.getElementById("f_type")?.value || 'sale',
       property_type: document.getElementById("f_property_type")?.value || 'apartment',
       price: document.getElementById("f_price")?.value?.trim() || '',
       currency: document.getElementById("f_currency")?.value || '$',
       city: document.getElementById("f_city")?.value?.trim() || '',
       district: document.getElementById("f_district")?.value?.trim() || '',
       area: document.getElementById("f_area")?.value || '',
       rooms: document.getElementById("f_rooms")?.value || '',
       status: document.getElementById("f_status")?.value || 'نشط',
       description: document.getElementById("f_description")?.value?.trim() || '',
       images: document.getElementById("f_images")?.value?.trim() || '',
       id: document.getElementById("f_id")?.value || null
     };
   }
   
   function val(id) {
     return document.getElementById(id)?.value?.trim() || '';
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
     if (!property.title_ar) {
       toast("يرجى إدخال عنوان العقار", "error");
       return;
     }
     const res = await apiCall("addProperty", { property });
     if (res && res.ok) {
       toast("تمت إضافة العقار", "success");
       closeModal();
       loadProperties();
       if (document.getElementById("view-home").classList.contains("active")) {
         loadHome();
       }
     } else {
       toast((res && res.message) || "تعذّرت الإضافة", "error");
     }
   }
   
   async function submitEditProperty(id) {
     const property = readPropertyForm();
     if (!property.title_ar) {
       toast("يرجى إدخال عنوان العقار", "error");
       return;
     }
     const res = await apiCall("updateProperty", { id, property });
     if (res && res.ok) {
       toast("تم حفظ التعديلات", "success");
       closeModal();
       loadProperties();
       if (document.getElementById("view-home").classList.contains("active")) {
         loadHome();
       }
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
   
   async function deleteProperty(id) {
     if (!confirm("هل أنت متأكد من حذف هذا العقار؟")) return;
     const res = await apiCall("deleteProperty", { id });
     if (res && res.ok) {
       toast("تم حذف العقار", "success");
       loadProperties();
       if (document.getElementById("view-home").classList.contains("active")) {
         loadHome();
       }
     } else {
       toast((res && res.message) || "تعذّر الحذف", "error");
     }
   }
   
   /* ============================================================
      ✅ إدارة الطلبات
      ============================================================ */
   
   async function loadRequests() {
     try {
       const res = await apiCall("getRequests", {});
       if (res && res.ok) {
         state.requests = res.requests || [];
         console.log("✅ تم تحميل الطلبات:", state.requests.length);
         renderRequests();
         updateRequestsCount();
         if (document.getElementById("view-home").classList.contains("active")) {
           loadHome();
         }
       } else {
         toast("تعذّر تحميل الطلبات", "error");
       }
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
   
     body.innerHTML = rows.map((r) => {
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
               <button class="btn btn-icon btn-sm btn-gold-outline" onclick="approveRequest('${r.id}')" title="موافقة" style="background: #27ae60; color: white; border-color: #27ae60;">
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
   
   // ============================================================
   // ✅ دوال إدارة الطلبات المتقدمة
   // ============================================================
   
   async function approveRequest(id) {
     if (!confirm("⚠️ هل أنت متأكد من الموافقة على هذا الطلب وتحويله إلى عقار؟")) return;
     
     const btn = event?.target?.closest?.('button');
     if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }
     
     try {
       const res = await apiCall("approveRequest", { id });
       if (res && res.ok) {
         toast("✅ تمت الموافقة وإضافة العقار", "success");
         loadRequests();
         loadProperties();
         if (document.getElementById("view-home").classList.contains("active")) {
           loadHome();
         }
       } else {
         toast((res && res.message) || "❌ فشل الموافقة", "error");
       }
     } catch (e) {
       console.error("❌ خطأ في approveRequest:", e);
       toast("❌ فشل الاتصال بالخادم", "error");
     } finally {
       if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i>'; }
     }
   }
   
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
       ['الحالة', req.status === 'pending' ? 'قيد المراجعة' : req.status === 'approved' ? 'موافق عليه' : req.status === 'rejected' ? 'مرفوض' : req.status || '—'],
     ];
     
     let html = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; padding: 4px 0;">`;
     fields.forEach(([label, value]) => {
       html += `
         <div style="display: flex; flex-direction: column; padding: 6px 0; border-bottom: 1px solid var(--line);">
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
      ✅ إدارة المستخدمين
      ============================================================ */
   
   async function loadUsers() {
     try {
       const res = await apiCall("getUsers", {});
       if (res && res.ok) {
         state.users = res.users || [];
         console.log("✅ تم تحميل المستخدمين:", state.users.length);
         renderUsers();
         if (document.getElementById("view-home").classList.contains("active")) {
           loadHome();
         }
       } else {
         toast("تعذّر تحميل المستخدمين", "error");
       }
     } catch (e) {
       console.error("❌ خطأ في loadUsers:", e);
       toast("تعذّر الاتصال بالخادم", "error");
     }
   }
   
   function renderUsers() {
     const body = document.getElementById("usersBody");
     if (!state.users.length) {
       body.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-users"></i>لا يوجد مستخدمون</div></td></tr>`;
       return;
     }
     body.innerHTML = state.users
       .map(
         (u) => `
       <tr>
         <td>${u.id || "—"}</td>
         <td>${u.username || "—"}</td>
         <td>${u.role === "full_access" ? "مدير رئيسي" : "مشرف"}</td>
         <td>${u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('ar-EG') : "لم يسجّل دخول"}</td>
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
   
   document.getElementById("addUserBtn").addEventListener("click", () => {
     openModal(
       "إضافة مستخدم جديد",
       `<div class="form-field"><label>اسم المستخدم</label><input id="u_username"></div>
        <div class="form-field"><label>كلمة المرور</label><input id="u_password" type="password"></div>
        <div class="form-field"><label>الدور</label><select id="u_role"><option value="supervisor">مشرف</option><option value="full_access">مدير رئيسي</option></select></div>`,
       `<button class="btn" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" onclick="submitNewUser()">حفظ</button>`
     );
   });
   
   function readUserForm() {
     return {
       username: document.getElementById("u_username")?.value?.trim() || '',
       password: document.getElementById("u_password")?.value || '',
       role: document.getElementById("u_role")?.value || 'supervisor'
     };
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
       `<div class="form-field"><label>اسم المستخدم</label><input id="u_username" value="${u.username || ''}"></div>
        <div class="form-field"><label>كلمة مرور جديدة</label><input id="u_password" type="password" placeholder="اتركها فارغة لعدم التغيير"></div>
        <div class="form-field"><label>الدور</label><select id="u_role"><option value="supervisor" ${u.role !== 'full_access' ? 'selected' : ''}>مشرف</option><option value="full_access" ${u.role === 'full_access' ? 'selected' : ''}>مدير رئيسي</option></select></div>`,
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
   // إدارة إجمالي الزوار والاستفسارات
   // ============================================================
   
   async function loadCurrentVisitors() {
     try {
       const res = await apiCall('getStats', { period: 'month' });
       if (res && res.ok && res.stats) {
         const visitors = res.stats.totalVisitors || 0;
         const display = document.getElementById('currentVisitorsDisplay');
         if (display) display.textContent = `العدد الحالي: ${Number(visitors).toLocaleString()}`;
       }
     } catch (e) {
       console.error('❌ خطأ في جلب عدد الزوار:', e);
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
     
     if (!confirm(`⚠️ هل أنت متأكد من تغيير عدد الزوار إلى ${newCount.toLocaleString()}؟`)) return;
     
     try {
       const res = await apiCall('updateVisitorsCount', { count: newCount });
       if (res && res.ok) {
         toast(`✅ تم تحديث عدد الزوار إلى ${newCount.toLocaleString()}`, 'success');
         const display = document.getElementById('currentVisitorsDisplay');
         if (display) display.textContent = `العدد الحالي: ${newCount.toLocaleString()}`;
         loadHome();
       } else {
         toast((res && res.message) || '❌ فشل تحديث عدد الزوار', 'error');
       }
     } catch (e) {
       console.error('❌ خطأ في تحديث عدد الزوار:', e);
       toast('❌ فشل الاتصال بالخادم', 'error');
     }
   }
   
   async function loadCurrentContacts() {
     try {
       const res = await apiCall('getStats', { period: 'month' });
       if (res && res.ok && res.stats) {
         const contacts = res.stats.totalContacts || 0;
         const display = document.getElementById('currentContactsDisplay');
         if (display) display.textContent = `العدد الحالي: ${Number(contacts).toLocaleString()}`;
       }
     } catch (e) {
       console.error('❌ خطأ في جلب عدد الاستفسارات:', e);
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
     
     if (!confirm(`⚠️ هل أنت متأكد من تغيير عدد الاستفسارات إلى ${newCount.toLocaleString()}؟`)) return;
     
     try {
       const res = await apiCall('updateContactsCount', { count: newCount });
       if (res && res.ok) {
         toast(`✅ تم تحديث عدد الاستفسارات إلى ${newCount.toLocaleString()}`, 'success');
         const display = document.getElementById('currentContactsDisplay');
         if (display) display.textContent = `العدد الحالي: ${newCount.toLocaleString()}`;
         loadHome();
       } else {
         toast((res && res.message) || '❌ فشل تحديث عدد الاستفسارات', 'error');
       }
     } catch (e) {
       console.error('❌ خطأ في تحديث عدد الاستفسارات:', e);
       toast('❌ فشل الاتصال بالخادم', 'error');
     }
   }
   
   // ============================================================
   // ربط الأحداث
   // ============================================================
   
   document.addEventListener('DOMContentLoaded', function() {
     setTimeout(() => {
       loadCurrentVisitors();
       loadCurrentContacts();
       
       document.getElementById('updateVisitorsBtn')?.addEventListener('click', updateVisitorsCount);
       document.getElementById('updateContactsBtn')?.addEventListener('click', updateContactsCount);
     }, 500);
   });
   
   /* ---------------- تشغيل ---------------- */
   initUserChrome();
   loadHome();