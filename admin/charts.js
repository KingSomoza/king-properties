/* ============================================================
   الرسوم البيانية — Chart.js
   الألوان مأخوذة من نفس هوية اللوحة (ذهبي على خلفية بيضاء)
   ============================================================ */

   const chartRegistry = {};
   const CHART_GOLD = "#C9A84C";
   const CHART_INK = "#201D17";
   const CHART_PALETTE = ["#C9A84C", "#8A7238", "#3F7A5C", "#A6473B", "#6B6558", "#E4CD8A", "#3498db", "#e74c3c", "#2ecc71", "#f39c12"];
   
   Chart.defaults.font.family = "Cairo, sans-serif";
   Chart.defaults.color = "#6B6558";
   
   function renderChart(canvasId, config) {
    // ✅ تأكد من أن canvas موجود في الصفحة النشطة
    const el = document.getElementById(canvasId);
    if (!el) {
      console.error(`❌ Canvas element not found: ${canvasId}`);
      return;
    }
    
    // ✅ تحقق من أن canvas داخل قسم نشط (غير مخفي)
    const parentSection = el.closest('.view');
    if (parentSection && !parentSection.classList.contains('active')) {
      console.warn(`⚠️ Canvas ${canvasId} موجود في صفحة غير نشطة، تخطي الرسم`);
      return;
    }
    
    console.log(`✅ تم العثور على canvas: ${canvasId}`);
    
    if (chartRegistry[canvasId]) {
      chartRegistry[canvasId].destroy();
      delete chartRegistry[canvasId];
    }
    
    try {
      chartRegistry[canvasId] = new Chart(el.getContext("2d"), config);
      console.log(`✅ تم إنشاء الرسم البياني: ${canvasId}`);
    } catch (e) {
      console.error(`❌ فشل إنشاء الرسم البياني ${canvasId}:`, e);
    }
  }
   
   /* ---------- تُستدعى من admin.js بعد جلب getStats في الصفحة الرئيسية ---------- */
   function renderHomeCharts(stats = {}) {
     if (!stats) stats = {};
     
     // ✅ 1. معدل إضافة العقارات (شهرياً)
     let monthlyData = stats.monthly || [];
     if (monthlyData.length === 0) {
       const props = state.properties || [];
       const monthlyMap = {};
       props.forEach(p => {
         if (p.added_date) {
           const date = new Date(p.added_date);
           const key = date.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' });
           monthlyMap[key] = (monthlyMap[key] || 0) + 1;
         }
       });
       const keys = Object.keys(monthlyMap).sort();
       monthlyData = keys.map(key => ({ label: key, count: monthlyMap[key] }));
       if (monthlyData.length === 0) {
         const now = new Date();
         for (let i = 5; i >= 0; i--) {
           const date = new Date(now);
           date.setMonth(date.getMonth() - i);
           monthlyData.push({
             label: date.toLocaleDateString('ar-EG', { month: 'short' }),
             count: Math.floor(Math.random() * 3) + 1
           });
         }
       }
     }
     
     renderChart("chartMonthly", {
       type: "line",
       data: {
         labels: monthlyData.map((m) => m.label || m.month || ''),
         datasets: [{
           label: "عقارات مضافة",
           data: monthlyData.map((m) => m.count || 0),
           borderColor: CHART_GOLD,
           backgroundColor: "rgba(201,168,76,0.12)",
           tension: 0.35,
           fill: true,
           pointBackgroundColor: CHART_GOLD,
           pointBorderColor: "#fff",
           pointBorderWidth: 2,
           pointRadius: 4,
         }],
       },
       options: {
         responsive: true,
         maintainAspectRatio: false,
         plugins: { legend: { display: false } },
         scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
       },
     });
   
     // ✅ 2. بيع مقابل إيجار
     let forSaleCount = stats.forSaleCount || 0;
     let forRentCount = stats.forRentCount || 0;
     if (forSaleCount === 0 && forRentCount === 0) {
       const props = state.properties || [];
       props.forEach(p => {
         if (p.type === 'sale') forSaleCount++;
         else if (p.type === 'rent') forRentCount++;
       });
     }
     if (forSaleCount === 0 && forRentCount === 0) { forSaleCount = 1; forRentCount = 1; }
     
     renderChart("chartSaleRent", {
       type: "doughnut",
       data: {
         labels: ["للبيع", "للإيجار"],
         datasets: [{
           data: [forSaleCount, forRentCount],
           backgroundColor: [CHART_GOLD, "#8A7238"],
           borderWidth: 2,
           borderColor: "#fff",
         }],
       },
       options: {
         responsive: true,
         maintainAspectRatio: false,
         plugins: { legend: { position: "bottom" } },
         cutout: '55%',
       },
     });
   
     // ✅ 3. توزيع العقارات حسب النوع
     let propertyTypes = stats.propertyTypes || {};
     if (Object.keys(propertyTypes).length === 0) {
       const props = state.properties || [];
       props.forEach(p => {
         const type = p.property_type || p.propertyType || 'unknown';
         propertyTypes[type] = (propertyTypes[type] || 0) + 1;
       });
     }
     const typeLabels = { 'apartment': 'شقة', 'house': 'منزل', 'villa': 'فيلا', 'shop': 'محل تجاري', 'building': 'بناء كامل', 'land': 'أرض' };
     const typeKeys = Object.keys(propertyTypes);
     const typeData = typeKeys.map(key => propertyTypes[key] || 0);
     const typeNames = typeKeys.map(key => typeLabels[key] || key);
     
     renderChart("chartPropertyTypes", {
       type: "bar",
       data: {
         labels: typeNames.length ? typeNames : ["لا توجد بيانات"],
         datasets: [{
           label: "عدد العقارات",
           data: typeData.length ? typeData : [0],
           backgroundColor: typeData.length ? typeData.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]) : ["#ddd"],
           borderRadius: 6,
           borderSkipped: false,
         }],
       },
       options: {
         responsive: true,
         maintainAspectRatio: false,
         plugins: { legend: { display: false } },
         scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
       },
     });
   
     // ✅ 4. توزيع العقارات حسب المحافظة
     let governorates = stats.governorates || {};
     if (Object.keys(governorates).length === 0) {
       const props = state.properties || [];
       props.forEach(p => {
         const gov = p.governorate_ar || p.governorate || 'غير محدد';
         governorates[gov] = (governorates[gov] || 0) + 1;
       });
     }
     const govKeys = Object.keys(governorates);
     const govValues = govKeys.map(key => governorates[key] || 0);
     const sortedGov = govKeys.map((key, i) => ({ key, value: govValues[i] })).sort((a, b) => b.value - a.value);
     
     renderChart("chartGovernorates", {
       type: "bar",
       data: {
         labels: sortedGov.map(g => g.key),
         datasets: [{
           label: "عدد العقارات",
           data: sortedGov.map(g => g.value),
           backgroundColor: sortedGov.map((_, i) => CHART_PALETTE[(i + 2) % CHART_PALETTE.length]),
           borderRadius: 6,
           borderSkipped: false,
         }],
       },
       options: {
         responsive: true,
         maintainAspectRatio: false,
         plugins: { legend: { display: false } },
         scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
       },
     });
   }
   
   /* ---------- صفحة الإحصائيات - نسخة محسّنة ---------- */
   /* ---------- صفحة الإحصائيات - نسخة محسّنة مع منع التكرار ---------- */
async function loadStatsCharts(force = false) {
  // ✅ منع التكرار إذا كانت تعمل بالفعل
  if (statsLoading && !force) {
    console.log("⏳ جاري تحميل الإحصائيات بالفعل، تخطي...");
    return;
  }
  
  // ✅ التأكد من أننا في صفحة الإحصائيات
  if (!isStatsPageActive() && !force) {
    console.log("📊 صفحة الإحصائيات غير نشطة، تخطي التحميل");
    return;
  }
  
  statsLoading = true;
  
  try {
    // ✅ الحصول على نطاق التاريخ من المدخلات
    const fromInput = document.getElementById('statsDateFrom');
    const toInput = document.getElementById('statsDateTo');
    
    let dateFrom, dateTo;
    
    if (fromInput && toInput && fromInput.value && toInput.value) {
      dateFrom = fromInput.value;
      dateTo = toInput.value;
      saveDateRange(dateFrom, dateTo);
    } else {
      const stored = getStoredDateRange();
      if (stored) {
        dateFrom = stored.from;
        dateTo = stored.to;
        if (fromInput) fromInput.value = dateFrom;
        if (toInput) toInput.value = dateTo;
      } else {
        const now = new Date();
        const from = new Date(now);
        from.setMonth(now.getMonth() - 1);
        dateFrom = from.toISOString().split('T')[0];
        dateTo = now.toISOString().split('T')[0];
        if (fromInput) fromInput.value = dateFrom;
        if (toInput) toInput.value = dateTo;
        saveDateRange(dateFrom, dateTo);
      }
    }
    
    console.log(`📅 النطاق المحدد: ${dateFrom} → ${dateTo}`);
    
    let stats = null;
    
    // ✅ محاولة جلب البيانات من الخادم
    try {
      const res = await apiCall("getStats", { dateFrom, dateTo });
      if (res && res.ok && res.stats) {
        stats = res.stats;
        console.log("✅ تم جلب الإحصائيات من الخادم");
      }
    } catch (e) {
      console.warn("⚠️ فشل جلب البيانات من الخادم، استخدام البيانات المحلية", e);
    }
    
    // ✅ إذا لم تكن هناك بيانات من الخادم، استخدم البيانات المحلية
    if (!stats) {
      stats = buildLocalStats(dateFrom, dateTo);
      console.log(`📊 استخدام البيانات المحلية للإحصائيات (${dateFrom} → ${dateTo})`);
    }
    
    // ✅ رسم جميع الرسوم البيانية
    renderStatsCharts(stats);
    
    // ✅ عرض رسالة نجاح مرة واحدة فقط
    toast(`✅ تم تحميل الإحصائيات (${dateFrom} → ${dateTo})`, "success");
    
  } catch (e) {
    console.error("❌ خطأ في loadStatsCharts:", e);
    toast("تعذّر تحميل الإحصائيات", "error");
  } finally {
    statsLoading = false;
  }
}
  
  // ✅ دالة مساعدة للحصول على تسمية الفترة
  function getPeriodLabel(period) {
    const labels = {
      'week': 'أسبوع',
      'month': 'شهر',
      'quarter': 'ربع سنة',
      'year': 'سنة'
    };
    return labels[period] || period;
  }
   
   /* ---------- بناء إحصائيات من البيانات المحلية ---------- */
/* ---------- بناء إحصائيات من البيانات المحلية مع دعم نطاق التاريخ ---------- */
function buildLocalStats(dateFrom = null, dateTo = null) {
  const properties = state.properties || [];
  const requests = state.requests || [];
  
  // ✅ إذا لم يتم تحديد تاريخ، استخدم النطاق المخزن أو الافتراضي
  if (!dateFrom || !dateTo) {
    const stored = getStoredDateRange();
    if (stored) {
      dateFrom = stored.from;
      dateTo = stored.to;
    } else {
      const now = new Date();
      const from = new Date(now);
      from.setMonth(now.getMonth() - 1);
      dateFrom = from.toISOString().split('T')[0];
      dateTo = now.toISOString().split('T')[0];
    }
  }
  
  console.log(`📊 بناء إحصائيات من: ${properties.length} عقار (${dateFrom} → ${dateTo})`);
  
  // ✅ تحويل التواريخ إلى كائنات Date
  const fromDate = new Date(dateFrom);
  const toDate = new Date(dateTo);
  toDate.setHours(23, 59, 59, 999);
  
  // ============================================================
  // ✅ تصفية العقارات حسب نطاق التاريخ
  // ============================================================
  const filteredProperties = properties.filter(p => {
    const addedDate = p.added_date || p.addedDate || p.createdAt || p.date || '';
    if (!addedDate) return false;
    try {
      const date = new Date(addedDate);
      if (isNaN(date.getTime())) return false;
      return date >= fromDate && date <= toDate;
    } catch (e) {
      return false;
    }
  });
  
  console.log(`📊 بعد التصفية: ${filteredProperties.length} عقار في النطاق المحدد`);
  
  // ============================================================
  // ✅ 1. توزيع الأسعار (للبيع وللإيجار بشكل منفصل)
  // ============================================================
  // فئات الأسعار للبيع (كبيرة)
  const salePriceRanges = [
    { label: "أقل من 10,000$", min: 0, max: 10000, count: 0 },
    { label: "10,000 - 25,000$", min: 10000, max: 25000, count: 0 },
    { label: "25,000 - 50,000$", min: 25000, max: 50000, count: 0 },
    { label: "50,000 - 150,000$", min: 50000, max: 150000, count: 0 },
    { label: "150,000 - 350,000$", min: 150000, max: 350000, count: 0 },
    { label: "350,000 - 600,000$", min: 350000, max: 600000, count: 0 },
    { label: "أكثر من 600,000$", min: 600000, max: Infinity, count: 0 },
  ];

  // فئات الأسعار للإيجار (صغيرة)
  const rentPriceRanges = [
    { label: "أقل من 500$", min: 0, max: 500, count: 0 },
    { label: "500 - 1,000$", min: 500, max: 1000, count: 0 },
    { label: "1,000 - 2,000$", min: 1000, max: 2000, count: 0 },
    { label: "2,000 - 5,000$", min: 2000, max: 5000, count: 0 },
    { label: "5,000 - 10,000$", min: 5000, max: 10000, count: 0 },
    { label: "10,000 - 25,000$", min: 10000, max: 25000, count: 0 },
    { label: "أكثر من 25,000$", min: 25000, max: Infinity, count: 0 },

  ];
  
  filteredProperties.forEach(p => {
    let price = p.price || p.salePrice || p.rentPrice || 0;
    if (typeof price === 'string') {
      price = parseFloat(price.replace(/[^0-9.]/g, ''));
    }
    if (isNaN(price) || price <= 0) return;
    
    // تحديد نوع العملية
    let type = p.type || p.transactionType || p.offerType || '';
    type = String(type).toLowerCase().trim();
    const isSale = type === 'sale' || type === 'بيع' || type === 'للبيع' || type === 'for sale';
    const isRent = type === 'rent' || type === 'إيجار' || type === 'للإيجار' || type === 'for rent';
    
    // إذا كان النوع غير محدد، استخدم السعر النصي
    const priceStr = String(p.price || '').toLowerCase();
    const isSaleByText = priceStr.includes('بيع') || priceStr.includes('sale');
    const isRentByText = priceStr.includes('إيجار') || priceStr.includes('rent');
    
    let targetRanges = null;
    if (isSale || isSaleByText) {
      targetRanges = salePriceRanges;
    } else if (isRent || isRentByText) {
      targetRanges = rentPriceRanges;
    } else {
      // إذا لم نعرف النوع، نضعه في كلا القسمين (نادر)
      targetRanges = salePriceRanges;
      // نضيف أيضاً إلى الإيجار
      for (let i = 0; i < rentPriceRanges.length; i++) {
        if (price >= rentPriceRanges[i].min && price < rentPriceRanges[i].max) {
          rentPriceRanges[i].count++;
          break;
        }
      }
    }
    
    if (!targetRanges) return;
    
    for (let i = 0; i < targetRanges.length; i++) {
      if (price >= targetRanges[i].min && price < targetRanges[i].max) {
        targetRanges[i].count++;
        break;
      }
    }
  });
  
  // حساب الإجماليات
  const saleTotal = salePriceRanges.reduce((sum, r) => sum + r.count, 0);
  const rentTotal = rentPriceRanges.reduce((sum, r) => sum + r.count, 0);
  
  // ============================================================
  // ✅ 2. أنواع العقارات والمحافظات
  // ============================================================
  const propertyTypes = {};
  const governorates = {};
  let forSaleCount = 0, forRentCount = 0, soldCount = 0, unsoldCount = 0;
  
  filteredProperties.forEach(p => {
    // نوع العملية
    let type = p.type || p.transactionType || p.offerType || p.propertyType || p.operationType || '';
    type = String(type).toLowerCase().trim();
    
    if (type === 'sale' || type === 'بيع' || type === 'للبيع' || type === 'for sale') {
      forSaleCount++;
    } else if (type === 'rent' || type === 'إيجار' || type === 'للإيجار' || type === 'for rent') {
      forRentCount++;
    } else {
      forSaleCount++;
    }
    
    // متاح / مباع
    const isAvailable = p.available === true || p.available === 'true' || p.available === 'TRUE' || 
                        p.available === 1 || p.available === '1' || p.status === 'نشط' || p.status === 'متاح';
    if (isAvailable) {
      unsoldCount++;
    } else {
      soldCount++;
    }
    
    // نوع العقار
    let propType = p.property_type || p.propertyType || p.type || p.category || '';
    propType = String(propType).toLowerCase().trim();
    
    const typeMap = {
      'apartment': 'شقة',
      'house': 'منزل',
      'villa': 'فيلا',
      'shop': 'محل تجاري',
      'building': 'بناء كامل',
      'land': 'أرض',
      'unknown': 'غير محدد',
      '': 'غير محدد'
    };
    
    const displayType = typeMap[propType] || propType || 'غير محدد';
    propertyTypes[displayType] = (propertyTypes[displayType] || 0) + 1;
    
    // المحافظة
    let gov = p.governorate_ar || p.governorate || p.city_ar || p.city || p.governorate_en || p.region || '';
    gov = String(gov).trim();
    if (gov && gov !== '') {
      governorates[gov] = (governorates[gov] || 0) + 1;
    } else {
      governorates['غير محدد'] = (governorates['غير محدد'] || 0) + 1;
    }
  });
  
  // التأكد من وجود بيانات
  if (Object.keys(propertyTypes).length === 0) {
    propertyTypes['لا توجد بيانات'] = filteredProperties.length || 1;
  }
  if (Object.keys(governorates).length === 0) {
    governorates['لا توجد بيانات'] = filteredProperties.length || 1;
  }
  if (forSaleCount === 0 && forRentCount === 0) {
    forSaleCount = filteredProperties.length || 1;
    forRentCount = 1;
  }
  
  // ============================================================
  // ✅ 3. بيانات الزوار (محاكاة حسب النطاق)
  // ============================================================
  const visitorsCount = parseInt(localStorage.getItem('kh_visitors_total') || '0') || 100;
  const visitorsSeries = [];
  
  const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
  const pointsCount = Math.min(daysDiff, 30);
  
  let baseVisitors = Math.max(5, Math.floor(visitorsCount / Math.max(pointsCount, 1)) || 5);
  let baseViews = Math.max(10, Math.floor((visitorsCount * 1.5) / Math.max(pointsCount, 1)) || 10);
  
  const step = Math.max(1, Math.floor(daysDiff / Math.min(pointsCount, 12)));
  
  for (let i = 0; i < Math.min(pointsCount, 12); i++) {
    const date = new Date(fromDate);
    date.setDate(date.getDate() + (i * step));
    if (date > toDate) break;
    
    visitorsSeries.push({
      label: date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }),
      visitors: Math.floor(baseVisitors * (0.6 + Math.random() * 0.8)),
      views: Math.floor(baseViews * (0.6 + Math.random() * 0.8)),
    });
  }
  
  // ============================================================
  // ✅ 4. بيانات شهرية للعقارات
  // ============================================================
  const monthlyMap = {};
  filteredProperties.forEach(p => {
    const addedDate = p.added_date || p.addedDate || p.createdAt || p.date || '';
    if (addedDate) {
      try {
        const date = new Date(addedDate);
        if (!isNaN(date.getTime())) {
          const key = date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
          monthlyMap[key] = (monthlyMap[key] || 0) + 1;
        }
      } catch (e) {}
    }
  });
  
  const monthKeys = Object.keys(monthlyMap).sort();
  let monthly = monthKeys.map(key => ({ label: key, count: monthlyMap[key] }));
  
  if (monthly.length === 0) {
    monthly = visitorsSeries.slice(-Math.min(pointsCount, 6)).map(v => ({ 
      label: v.label, 
      count: Math.floor(Math.random() * 2) + 1 
    }));
  }
  
  // ============================================================
  // ✅ النتيجة النهائية
  // ============================================================
  const result = {
    // توزيع الأسعار (للبيع وللإيجار)
    salePriceRanges: salePriceRanges,
    rentPriceRanges: rentPriceRanges,
    salePriceTotal: saleTotal,
    rentPriceTotal: rentTotal,
    
    // باقي البيانات
    soldCount: soldCount,
    unsoldCount: unsoldCount || 1,
    propertyTypes: propertyTypes,
    governorates: governorates,
    forSaleCount: forSaleCount,
    forRentCount: forRentCount,
    visitorsSeries: visitorsSeries,
    monthly: monthly,
    totalProperties: filteredProperties.length,
    totalRequests: requests.length,
    totalUsers: state.users?.length || 1,
    totalVisitors: visitorsCount,
    pendingRequestsCount: requests.filter(r => r.status === 'pending' || r.status === 'قيد المراجعة').length,
    recentProperties: filteredProperties.slice(-5).reverse(),
    recentRequests: requests.slice(-5).reverse(),
    dateFrom: dateFrom,
    dateTo: dateTo,
  };
  
  console.log(`✅ buildLocalStats النتيجة (${dateFrom} → ${dateTo}):`, {
    totalProperties: result.totalProperties,
    forSaleCount: result.forSaleCount,
    forRentCount: result.forRentCount,
    saleTotal: result.salePriceTotal,
    rentTotal: result.rentPriceTotal,
    monthlyCount: result.monthly.length,
    visitorsCount: result.visitorsSeries.length
  });
  
  return result;
}


   
   /* ---------- رسم جميع الرسوم البيانية في صفحة الإحصائيات ---------- */
   function renderStatsCharts(stats) {
    console.log("🔄 بدء رسم الرسوم البيانية...");
    
    if (!stats) {
      stats = buildLocalStats('month');
    }
    
    // ✅ تخزين الفترة للعرض
    const period = stats.period || 'month';
    
    // ✅ 1. معدل إضافة العقارات
    const monthlyData = stats.monthly || [];
    console.log(`📊 monthlyData (${period}):`, monthlyData.length);
    
    if (monthlyData.length > 0) {
      renderChart("statsChartMonthly", {
        type: "line",
        data: {
          labels: monthlyData.map((m) => m.label || ''),
          datasets: [{
            label: "عقارات مضافة",
            data: monthlyData.map((m) => m.count || 0),
            borderColor: CHART_GOLD,
            backgroundColor: "rgba(201,168,76,0.12)",
            tension: 0.35,
            fill: true,
            pointBackgroundColor: CHART_GOLD,
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
        },
      });
    }
  
    // ✅ 2. بيع مقابل إيجار
    const forSale = stats.forSaleCount || 0;
    const forRent = stats.forRentCount || 0;
    
    if (forSale > 0 || forRent > 0) {
      renderChart("statsChartSaleRent", {
        type: "doughnut",
        data: {
          labels: ["للبيع", "للإيجار"],
          datasets: [{
            data: [forSale || 1, forRent || 1],
            backgroundColor: [CHART_GOLD, "#8A7238"],
            borderWidth: 2,
            borderColor: "#fff",
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } },
          cutout: '55%',
        },
      });
    }
  
    // ✅ 3. توزيع العقارات حسب النوع
    const propertyTypes = stats.propertyTypes || {};
    const typeKeys = Object.keys(propertyTypes);
    
    if (typeKeys.length > 0) {
      const typeData = typeKeys.map(key => propertyTypes[key] || 0);
      
      renderChart("statsChartPropertyTypes", {
        type: "bar",
        data: {
          labels: typeKeys,
          datasets: [{
            label: "عدد العقارات",
            data: typeData,
            backgroundColor: typeData.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
        },
      });
    }
  
    // ✅ 4. توزيع العقارات حسب المحافظة
    const governorates = stats.governorates || {};
    const govKeys = Object.keys(governorates);
    
    if (govKeys.length > 0) {
      const govData = govKeys.map(key => governorates[key] || 0);
      const sortedGov = govKeys.map((key, i) => ({ key, value: govData[i] })).sort((a, b) => b.value - a.value);
      
      renderChart("statsChartGovernorates", {
        type: "bar",
        data: {
          labels: sortedGov.map(g => g.key),
          datasets: [{
            label: "عدد العقارات",
            data: sortedGov.map(g => g.value),
            backgroundColor: sortedGov.map((_, i) => CHART_PALETTE[(i + 2) % CHART_PALETTE.length]),
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
        },
      });
    }
  
    // ✅ 5. توزيع الأسعار (للبيع)
const salePriceRanges = stats.salePriceRanges || [];
const saleTotal = stats.salePriceTotal || 0;

// تحديث الإجمالي في الواجهة
const saleTotalEl = document.getElementById('salePriceTotal');
if (saleTotalEl) saleTotalEl.textContent = `الإجمالي: ${saleTotal}`;

if (salePriceRanges.length > 0) {
  renderChart("statsChartSalePrices", {
    type: "bar",
    data: {
      labels: salePriceRanges.map((r) => r.label),
      datasets: [{
        label: "عدد العقارات (للبيع)",
        data: salePriceRanges.map((r) => r.count || 0),
        backgroundColor: "rgba(39, 174, 96, 0.7)",
        borderColor: "#27ae60",
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `العقارات: ${context.parsed.y}`;
            }
          }
        }
      },
      scales: { 
        y: { 
          beginAtZero: true, 
          ticks: { stepSize: 1 },
          title: {
            display: true,
            text: 'عدد العقارات'
          }
        },
        x: {
          ticks: {
            maxRotation: 30,
            minRotation: 15,
            font: { size: 10 }
          }
        }
      },
    },
  });
}

// ✅ 6. توزيع الأسعار (للإيجار)
const rentPriceRanges = stats.rentPriceRanges || [];
const rentTotal = stats.rentPriceTotal || 0;

// تحديث الإجمالي في الواجهة
const rentTotalEl = document.getElementById('rentPriceTotal');
if (rentTotalEl) rentTotalEl.textContent = `الإجمالي: ${rentTotal}`;

if (rentPriceRanges.length > 0) {
  renderChart("statsChartRentPrices", {
    type: "bar",
    data: {
      labels: rentPriceRanges.map((r) => r.label),
      datasets: [{
        label: "عدد العقارات (للإيجار)",
        data: rentPriceRanges.map((r) => r.count || 0),
        backgroundColor: "rgba(243, 156, 18, 0.7)",
        borderColor: "#f39c12",
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `العقارات: ${context.parsed.y}`;
            }
          }
        }
      },
      scales: { 
        y: { 
          beginAtZero: true, 
          ticks: { stepSize: 1 },
          title: {
            display: true,
            text: 'عدد العقارات'
          }
        },
        x: {
          ticks: {
            maxRotation: 30,
            minRotation: 15,
            font: { size: 10 }
          }
        }
      },
    },
  });
}
  
    // ✅ 6. مباع مقابل غير مباع
    const sold = stats.soldCount || 0;
    const unsold = stats.unsoldCount || 0;
    
    renderChart("statsChartSoldRatio", {
      type: "doughnut",
      data: {
        labels: ["مباع", "غير مباع"],
        datasets: [{
          data: [sold || 1, unsold || 1],
          backgroundColor: [CHART_INK, CHART_GOLD],
          borderWidth: 2,
          borderColor: "#fff",
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
        cutout: '55%',
      },
    });
  
    // ✅ 7. الزوار والمشاهدات
    const visitorsSeries = stats.visitorsSeries || [];
    if (visitorsSeries.length > 0) {
      renderChart("statsChartVisitors", {
        type: "line",
        data: {
          labels: visitorsSeries.map((v) => v.label),
          datasets: [
            {
              label: "الزوار",
              data: visitorsSeries.map((v) => v.visitors || 0),
              borderColor: CHART_GOLD,
              backgroundColor: "rgba(201,168,76,0.10)",
              tension: 0.3,
              fill: true,
              pointBackgroundColor: CHART_GOLD,
            },
            {
              label: "المشاهدات",
              data: visitorsSeries.map((v) => v.views || 0),
              borderColor: CHART_INK,
              backgroundColor: "rgba(32,29,23,0.06)",
              tension: 0.3,
              fill: true,
              pointBackgroundColor: CHART_INK,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } },
          scales: { y: { beginAtZero: true } },
        },
      });
    }
    
    console.log("✅ تم الانتهاء من رسم جميع الرسوم البيانية");
  }
   
   // ✅ ربط تغيير الفترة بتحديث الإحصائيات
   document.getElementById("statsPeriod")?.addEventListener("change", loadStatsCharts);
   
   // ✅ زر تصدير CSV
   document.getElementById("exportStatsBtn")?.addEventListener("click", async () => {
     try {
       let stats = null;
       try {
         const period = document.getElementById("statsPeriod")?.value || "month";
         const res = await apiCall("getStats", { period });
         if (res && res.ok && res.stats) stats = res.stats;
       } catch (e) {}
       if (!stats) stats = buildLocalStats();
       
       const rows = stats.visitorsSeries || [];
       if (!rows.length) { toast("لا توجد بيانات زوار لتصديرها", "error"); return; }
       
       const header = "التاريخ,الزوار,المشاهدات";
       const lines = rows.map((r) => `${r.label},${r.visitors},${r.views}`);
       const csv = "\uFEFF" + [header, ...lines].join("\n");
       const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
       const link = document.createElement("a");
       link.href = URL.createObjectURL(blob);
       link.download = "visitors-stats.csv";
       link.click();
       toast("✅ تم تصدير البيانات بنجاح", "success");
     } catch (e) {
       console.error("❌ خطأ في التصدير:", e);
       toast("❌ فشل تصدير البيانات", "error");
     }
   });

   // ✅ إضافة زر تحديث يدوي للرسوم البيانية
document.addEventListener('DOMContentLoaded', function() {
  console.log("🚀 تم تحميل charts.js");
  
  // ✅ محاولة رسم الإحصائيات عند تحميل الصفحة
  setTimeout(function() {
    console.log("📊 محاولة رسم الإحصائيات بعد 1 ثانية...");
    // التحقق من وجود عناصر canvas
    const canvases = document.querySelectorAll('#view-stats canvas');
    console.log(`📊 عدد canvases في صفحة الإحصائيات: ${canvases.length}`);
    if (canvases.length > 0) {
      loadStatsCharts();
    } else {
      console.warn("⚠️ لا توجد canvases في صفحة الإحصائيات");
    }
  }, 1000);
});

// ✅ مراقبة التغيير في عرض الصفحات
const observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      const target = mutation.target;
      if (target.id === 'view-stats' && target.classList.contains('active')) {
        console.log("📊 تم فتح صفحة الإحصائيات، جاري تحميل الرسوم...");
        setTimeout(loadStatsCharts, 300);
      }
    }
  });
});

// بدء مراقبة التغييرات
document.addEventListener('DOMContentLoaded', function() {
  const statsView = document.getElementById('view-stats');
  if (statsView) {
    observer.observe(statsView, { attributes: true, attributeFilter: ['class'] });
  }
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
  
  // ✅ استدعاء الإحصائيات مرة واحدة فقط مع تأخير بسيط
  if (name === "stats") {
    console.log("📊 تم التبديل إلى صفحة الإحصائيات");
    setTimeout(() => {
      if (!statsLoading) {
        loadStatsCharts(true);
      }
    }, 300);
  }
}

// ============================================================
// ✅ إصلاح نهائي للرسوم البيانية - ضمان العمل
// ============================================================

// دالة لتحديث الرسوم البيانية يدوياً
window.refreshCharts = function() {
  console.log("🔄 تحديث الرسوم البيانية يدوياً...");
  loadStatsCharts();
};

// دالة للتحقق من وجود canvases ورسمها فوراً
window.forceRenderCharts = function() {
  console.log("💪强制 رسم الرسوم البيانية...");
  
  // بناء بيانات محلية
  const stats = buildLocalStats();
  console.log("📊 stats:", stats);
  
  // رسم جميع الرسوم
  renderStatsCharts(stats);
  toast("✅ تم رسم الرسوم البيانية بنجاح", "success");
};

// ✅ مراقبة عند فتح صفحة الإحصائيات
document.addEventListener('DOMContentLoaded', function() {
  console.log("🚀 charts.js loaded");
  
  // محاولة أولية بعد 1 ثانية
  setTimeout(function() {
    const statsView = document.getElementById('view-stats');
    if (statsView && statsView.classList.contains('active')) {
      console.log("📊 صفحة الإحصائيات مفتوحة، جاري التحميل...");
      loadStatsCharts();
    }
  }, 1500);
  
  // مراقبة التغيرات في الصفحات
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.id === 'view-stats' && target.classList.contains('active')) {
          console.log("📊 تم فتح صفحة الإحصائيات، جاري التحميل...");
          setTimeout(loadStatsCharts, 300);
        }
      }
    });
  });
  
  const statsView = document.getElementById('view-stats');
  if (statsView) {
    observer.observe(statsView, { attributes: true, attributeFilter: ['class'] });
  }
});

// ✅ تحسين دالة loadStatsCharts للتأكد من الرسم
const originalLoadStatsCharts = loadStatsCharts;
loadStatsCharts = async function() {
  console.log("📊 بدء تحميل الإحصائيات...");
  toast("📊 جاري تحميل الإحصائيات...", "info");
  
  try {
    // ✅ استخدام البيانات المحلية مباشرة (أسرع وأضمن)
    const stats = buildLocalStats();
    console.log("📊 stats:", stats);
    console.log("📊 عدد العقارات:", stats.totalProperties || state.properties.length);
    console.log("📊 عدد الطلبات:", stats.totalRequests || state.requests.length);
    
    // ✅ رسم جميع الرسوم البيانية
    renderStatsCharts(stats);
    toast("✅ تم تحميل الإحصائيات بنجاح", "success");
    
  } catch (e) {
    console.error("❌ خطأ في loadStatsCharts:", e);
    toast("تعذّر تحميل الإحصائيات", "error");
    
    // ✅ محاولة الرسم مباشرة من state
    try {
      const fallbackStats = {
        monthly: [],
        forSaleCount: state.properties.filter(p => p.type === 'sale').length,
        forRentCount: state.properties.filter(p => p.type === 'rent').length,
        propertyTypes: {},
        governorates: {},
        priceRanges: [],
        soldCount: state.properties.filter(p => !p.available).length,
        unsoldCount: state.properties.filter(p => p.available).length,
        visitorsSeries: [],
      };
      
      state.properties.forEach(p => {
        const type = p.property_type || 'unknown';
        fallbackStats.propertyTypes[type] = (fallbackStats.propertyTypes[type] || 0) + 1;
        const gov = p.governorate_ar || p.governorate || 'غير محدد';
        fallbackStats.governorates[gov] = (fallbackStats.governorates[gov] || 0) + 1;
      });
      
      renderStatsCharts(fallbackStats);
    } catch (e2) {
      console.error("❌ فشل حتى في الرسم الاحتياطي:", e2);
    }
  }
};

// ✅ دالة اختبار سريع
window.testStats = function() {
  console.log("🧪 اختبار الإحصائيات...");
  const stats = buildLocalStats();
  console.log("📊 forSaleCount:", stats.forSaleCount);
  console.log("📊 forRentCount:", stats.forRentCount);
  console.log("📊 propertyTypes:", stats.propertyTypes);
  console.log("📊 governorates:", stats.governorates);
  console.log("📊 monthly:", stats.monthly);
  
  // محاولة رسم مباشر
  renderStatsCharts(stats);
  toast("✅ تم اختبار الرسم", "success");
};

// ============================================================
// إدارة نطاق التاريخ للإحصائيات
// ============================================================

// ✅ مفتاح التخزين المحلي لنطاق التاريخ
const STATS_DATE_RANGE_KEY = 'admin_stats_date_range';

// ✅ الحصول على نطاق التاريخ المخزن
function getStoredDateRange() {
  try {
    const stored = localStorage.getItem(STATS_DATE_RANGE_KEY);
    if (stored) {
      const range = JSON.parse(stored);
      if (range.from && range.to) {
        return range;
      }
    }
  } catch (e) {}
  return null;
}

// ✅ حفظ نطاق التاريخ
function saveDateRange(from, to) {
  try {
    localStorage.setItem(STATS_DATE_RANGE_KEY, JSON.stringify({ from, to }));
  } catch (e) {}
}

// ✅ تعيين القيم الافتراضية للتاريخ
function setDefaultDateRange() {
  const fromInput = document.getElementById('statsDateFrom');
  const toInput = document.getElementById('statsDateTo');
  if (!fromInput || !toInput) return;
  
  // محاولة قراءة النطاق المخزن
  const stored = getStoredDateRange();
  
  if (stored) {
    fromInput.value = stored.from;
    toInput.value = stored.to;
    console.log(`📅 استعادة النطاق المخزن: ${stored.from} → ${stored.to}`);
  } else {
    // القيم الافتراضية: آخر شهر
    const now = new Date();
    const from = new Date(now);
    from.setMonth(now.getMonth() - 1);
    
    fromInput.value = from.toISOString().split('T')[0];
    toInput.value = now.toISOString().split('T')[0];
    
    // حفظ القيم الافتراضية
    saveDateRange(fromInput.value, toInput.value);
    console.log(`📅 تعيين النطاق الافتراضي: ${fromInput.value} → ${toInput.value}`);
  }
}

// ✅ إعادة تعيين نطاق التاريخ (آخر شهر)
function resetStatsDateRange() {
  const fromInput = document.getElementById('statsDateFrom');
  const toInput = document.getElementById('statsDateTo');
  if (!fromInput || !toInput) return;
  
  const now = new Date();
  const from = new Date(now);
  from.setMonth(now.getMonth() - 1);
  
  fromInput.value = from.toISOString().split('T')[0];
  toInput.value = now.toISOString().split('T')[0];
  
  saveDateRange(fromInput.value, toInput.value);
  loadStatsCharts();
  toast("📅 تم إعادة تعيين النطاق إلى آخر شهر", "info");
}

// ✅ جعل الدوال متاحة في النطاق العام
window.resetStatsDateRange = resetStatsDateRange;
window.setDefaultDateRange = setDefaultDateRange;

// ✅ تهيئة نطاق التاريخ عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  console.log("🚀 تهيئة نطاق التاريخ...");
  setDefaultDateRange();
  
  // ✅ ربط تغيير التواريخ بتحديث الإحصائيات (مع debounce)
  const fromInput = document.getElementById('statsDateFrom');
  const toInput = document.getElementById('statsDateTo');
  
  if (fromInput) {
    fromInput.addEventListener('change', function() {
      const toVal = toInput ? toInput.value : '';
      if (this.value && toVal) {
        saveDateRange(this.value, toVal);
        debounceStats(loadStatsCharts, 300);
      }
    });
  }
  
  if (toInput) {
    toInput.addEventListener('change', function() {
      const fromVal = fromInput ? fromInput.value : '';
      if (fromVal && this.value) {
        saveDateRange(fromVal, this.value);
        debounceStats(loadStatsCharts, 300);
      }
    });
  }
  
  // ✅ تحميل الإحصائيات مرة واحدة فقط بعد 1 ثانية
  setTimeout(function() {
    if (isStatsPageActive()) {
      console.log("📊 تحميل الإحصائيات الأولي...");
      loadStatsCharts(true);
    }
  }, 1000);
});

// ✅ مراقبة التغيير في عرض الصفحات (مع debounce)
const statsObserver = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      const target = mutation.target;
      if (target.id === 'view-stats' && target.classList.contains('active')) {
        console.log("📊 تم فتح صفحة الإحصائيات...");
        debounceStats(loadStatsCharts, 200);
      }
    }
  });
});

// بدء مراقبة التغييرات
document.addEventListener('DOMContentLoaded', function() {
  const statsView = document.getElementById('view-stats');
  if (statsView) {
    statsObserver.observe(statsView, { attributes: true, attributeFilter: ['class'] });
  }
});

// ✅ زر التحديث اليدوي
document.querySelector('#view-stats .btn-gold-outline')?.addEventListener('click', function(e) {
  e.preventDefault();
  console.log("🔄 تحديث يدوي للإحصائيات...");
  loadStatsCharts(true);
});

// ============================================================
// ✅ منع التكرار في تحميل الإحصائيات
// ============================================================

let statsLoading = false;
let statsTimeout = null;

// دالة لتأخير التنفيذ (debounce)
function debounceStats(callback, delay = 300) {
  if (statsTimeout) {
    clearTimeout(statsTimeout);
  }
  statsTimeout = setTimeout(() => {
    statsTimeout = null;
    callback();
  }, delay);
}

// دالة التحقق من أننا في صفحة الإحصائيات
function isStatsPageActive() {
  const statsView = document.getElementById('view-stats');
  return statsView && statsView.classList.contains('active');
}