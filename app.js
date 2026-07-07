// ============================================================
// KING HOUSES - MAIN APPLICATION (Google Sheets + Cloudflare)
// نسخة مرتبة ومنظمة
// ============================================================

// ---------- الإعدادات العامة ----------
const CONFIG = {
    WHATSAPP: '963932168293',
    ITEMS_PER_PAGE: 6,
    API_URL: 'https://script.google.com/macros/s/AKfycbwWceDQFxAM4xHNgkkGEcmdpNvVvBy9UoTMNb6tRBSRYthMB--z8aZEdyoREcqosBSc/exec'
};

const DEFAULT_IMAGE = 'https://res.cloudinary.com/dkdilpnuc/image/upload/v1783195143/king-propertis-logo-removebg-preview_t5hses.png';

// ============================================================
// إعدادات Cloudinary
// ============================================================

const CLOUDINARY_CONFIG = {
    cloudName: 'dkdilpnuc', // ✅ استبدل بـ Cloud Name الخاص بك
    uploadPreset: 'king_properties' // ✅ استبدل بـ Upload Preset الخاص بك
};

// ============================================================
// رفع الصور إلى Cloudinary
// ============================================================

async function uploadImageToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('فشل رفع الصورة');
        }
        
        const data = await response.json();
        return data.secure_url; // رابط الصورة
    } catch (error) {
        console.error('❌ خطأ في رفع الصورة:', error);
        showToast('❌ فشل رفع الصورة، حاول مرة أخرى', 'error');
        return null;
    }
}

// دالة معالجة الملفات
async function handleFiles(files) {
    const imagePreview = document.getElementById('imagePreview');
    const imagesHidden = document.getElementById('propertyImages');
    let uploadedImages = JSON.parse(imagesHidden.value || '[]');
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        
        // مؤشر تحميل
        const imgWrapper = document.createElement('div');
        imgWrapper.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid #ddd;flex-shrink:0;background:#f0f0f0;display:flex;align-items:center;justify-content:center;';
        imgWrapper.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:24px;color:#C9A84C;"></i>';
        imagePreview.appendChild(imgWrapper);
        
        const imageUrl = await uploadImageToCloudinary(file);
        
        if (imageUrl) {
            imgWrapper.innerHTML = '';
            const img = document.createElement('img');
            img.src = imageUrl;
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            imgWrapper.appendChild(img);
            
            // زر حذف
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '×';
            removeBtn.style.cssText = 'position:absolute;top:2px;right:2px;background:rgba(231,76,60,0.9);color:white;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;z-index:5;';
            removeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const index = uploadedImages.indexOf(imageUrl);
                if (index > -1) uploadedImages.splice(index, 1);
                imgWrapper.remove();
                imagesHidden.value = JSON.stringify(uploadedImages);
            });
            imgWrapper.appendChild(removeBtn);
            
            uploadedImages.push(imageUrl);
            imagesHidden.value = JSON.stringify(uploadedImages);
        } else {
            imgWrapper.innerHTML = '<i class="fas fa-exclamation-circle" style="font-size:24px;color:#e74c3c;"></i>';
            setTimeout(() => imgWrapper.remove(), 3000);
        }
    }
}

// تسجيل الأحداث
document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('propertyImagesInput');
    const imagePreview = document.getElementById('imagePreview');
    
    if (!dropZone || !fileInput || !imagePreview) return;
    
    dropZone.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function(e) {
        const files = e.target.files;
        if (files.length > 0) {
            handleFiles(files);
        }
        fileInput.value = '';
    });
    
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.style.borderColor = '#C9A84C';
        dropZone.style.background = 'rgba(201,168,76,0.1)';
    });
    
    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropZone.style.borderColor = '#ddd';
        dropZone.style.background = '#fafafa';
    });
    
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.style.borderColor = '#ddd';
        dropZone.style.background = '#fafafa';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    });
});

let allProperties = [];
let filteredProperties = [];
let currentItemCount = 6;
let currentPropertyImages = [];
let currentImageIndex = 0;
let currentPropertyId = null;
let favoritesList = [];
let hideSoldActive = false;

// ===== إعدادات اللغة =====
let currentLanguage = localStorage.getItem('kh_language') || 'ar';

// ============================================================
// 1. دوال الترجمة واللغة
// ============================================================

// دالة تبديل اللغة
function setLanguage(lang) {
    if (lang !== 'ar' && lang !== 'en') return;
    currentLanguage = lang;
    localStorage.setItem('kh_language', lang);
    
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    
    updatePageTexts();
    updateMetaTagsForLanguage();
    refreshAllFilters();
    populatePhoneCountrySelect();
    
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    
    showToast(`🌐 اللغة: ${lang === 'ar' ? 'العربية' : 'English'}`, 'success');
}

// تحديث كل النصوص في الصفحة
function updatePageTexts() {
    const t = translations[currentLanguage];
    if (!t) return;
    
    document.title = t.site_title;
    
    // الهيدر
    const navLinks = document.querySelectorAll('#mainNav ul li a');
    if (navLinks.length >= 4) {
        navLinks[0].innerText = t.nav_home;
        navLinks[1].innerText = t.nav_properties;
        navLinks[2].innerText = t.nav_stats;
        navLinks[3].innerText = t.nav_contact;
    }
    
    // ✅ تحديث عناصر data-i18n (مرة واحدة فقط)
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key] !== undefined) {
            const requiredSpan = el.querySelector('.required');
            if (requiredSpan) {
                el.innerHTML = `${t[key]} <span class="required">*</span>`;
            } else {
                el.innerText = t[key];
            }
        }
    });
    
    
    
    // الهيرو
    const heroBadgeSpan = document.querySelector('.hero-badge span');
    if (heroBadgeSpan) heroBadgeSpan.innerText = t.hero_badge;
    
    const heroTitleAr = document.querySelector('.hero-title-ar');
    if (heroTitleAr) {
        const goldSpan = heroTitleAr.querySelector('.gold-text');
        if (goldSpan) goldSpan.innerText = t.hero_title_span;
    }
    
    const heroSubtitle = document.querySelector('.hero-title-en');
    if (heroSubtitle) heroSubtitle.innerText = t.hero_subtitle;
    
    const heroDescription = document.querySelector('.hero-description');
    if (heroDescription) heroDescription.innerText = t.hero_description;
    
    const heroSearchInput = document.getElementById('heroSearchInput');
    if (heroSearchInput) heroSearchInput.placeholder = t.hero_search_placeholder;
    
    const heroContactBtn = document.querySelector('.btn-outline span');
    if (heroContactBtn) heroContactBtn.innerText = t.hero_contact_btn;
    
    const heroStatLabels = document.querySelectorAll('.hero-stats .stat-label');
    if (heroStatLabels.length >= 3) {
        heroStatLabels[0].innerText = t.hero_available_label;
        heroStatLabels[1].innerText = t.hero_sold_label;
        heroStatLabels[2].innerText = t.hero_visitors_label;
    }
    
    const heroScrollSpan = document.querySelector('.hero-scroll span');
    if (heroScrollSpan) heroScrollSpan.innerText = t.hero_scroll;
    
    // الفلاتر
    const filtersTitle = document.querySelector('.filters-title h3');
    if (filtersTitle) filtersTitle.innerText = t.filters_title;
    
    const filtersToggleSpan = document.querySelector('#filtersToggleBtn span');
    if (filtersToggleSpan) {
        filtersToggleSpan.innerText = currentLanguage === 'ar' ? 'إظهار/إخفاء الفلاتر' : 'Show/Hide Filters';
    }
    
    if (filteredProperties.length > 0) renderProperties();
    
    const filterLabels = document.querySelectorAll('.filter-group label');
    if (filterLabels.length >= 10) {
        const labels = [
            'filter_transaction_type', 'filter_property_type', 'filter_governorate',
            'filter_district', 'filter_floor', 'filter_rooms',
            'filter_price_sale', 'filter_price_rent', 'filter_rent_period', 'filter_code'
        ];
        const icons = ['tag', 'building', 'city', 'map-marker-alt', 'layer-group', 'bed', 'dollar-sign', 'dollar-sign', 'calendar-alt', 'barcode'];
        filterLabels.forEach((el, i) => {
            if (i < labels.length) {
                el.innerHTML = `<i class="fas fa-${icons[i]}"></i> ${t[labels[i]]}`;
            }
        });
    }
    
    // باقي عناصر الفلاتر
    const filterType = document.getElementById('filterType');
    if (filterType) {
        if (filterType.options[0]) filterType.options[0].text = t.filter_transaction_all;
        if (filterType.options[1]) filterType.options[1].text = t.filter_transaction_sale;
        if (filterType.options[2]) filterType.options[2].text = t.filter_transaction_rent;
    }
    
    const filterPropType = document.getElementById('filterPropType');
    if (filterPropType) {
        const propOpts = [
            t.filter_property_all, t.filter_property_apartment,
            t.filter_property_house, t.filter_property_villa,
            t.filter_property_shop, t.filter_property_building,
            t.filter_property_land
        ];
        for (let i = 0; i < filterPropType.options.length && i < propOpts.length; i++) {
            filterPropType.options[i].text = propOpts[i];
        }
    }
    
    const govSelect = document.getElementById('filterGovernorate');
    if (govSelect && govSelect.options[0]) govSelect.options[0].text = t.filter_governorate_all;
    
    const districtSelect = document.getElementById('filterDistrict');
    if (districtSelect && districtSelect.options[0]) {
        districtSelect.options[0].text = t.filter_district_placeholder;
    }
    
    const floorSelect = document.getElementById('filterFloor');
    if (floorSelect && floorSelect.options[0]) floorSelect.options[0].text = t.filter_floor_all;
    
    const roomsSelect = document.getElementById('filterRooms');
    if (roomsSelect) {
        const roomsOpts = [
            t.filter_rooms_all, t.filter_rooms_1, t.filter_rooms_2,
            t.filter_rooms_3, t.filter_rooms_4, t.filter_rooms_5plus
        ];
        for (let i = 0; i < roomsSelect.options.length && i < roomsOpts.length; i++) {
            roomsSelect.options[i].text = roomsOpts[i];
        }
    }
    
    const salePriceSelect = document.getElementById('filterSalePrice');
    if (salePriceSelect && salePriceSelect.options[0]) {
        salePriceSelect.options[0].text = t.filter_price_any;
    }
    
    const rentPriceSelect = document.getElementById('filterRentPrice');
    if (rentPriceSelect && rentPriceSelect.options[0]) {
        rentPriceSelect.options[0].text = t.filter_price_any;
    }
    
    const filterCode = document.getElementById('filterCode');
    if (filterCode) filterCode.placeholder = t.filter_code_placeholder;
    
    // أزرار الفلاتر
    const favoriteBtnSpan = document.querySelector('.btn-favorite span');
    if (favoriteBtnSpan) favoriteBtnSpan.innerText = t.btn_favorite;
    
    const allBtnSpan = document.querySelector('.btn-all span');
    if (allBtnSpan) allBtnSpan.innerText = t.btn_all;
    
    const refreshBtnSpan = document.querySelector('.btn-refresh span');
    if (refreshBtnSpan) refreshBtnSpan.innerText = t.btn_refresh;
    
    const hideSoldBtnSpan = document.querySelector('#hideSoldBtn span');
    if (hideSoldBtnSpan) {
        hideSoldBtnSpan.innerText = hideSoldActive ? t.btn_show_all : t.btn_hide_sold;
    }
    
    // قسم العقارات
    const sectionBadge = document.querySelector('.section-badge');
    if (sectionBadge) sectionBadge.innerText = t.section_badge;
    
    const sectionTitle = document.querySelector('.section-title');
    if (sectionTitle) {
        const goldSpan = sectionTitle.querySelector('.gold-text');
        if (goldSpan) goldSpan.innerText = t.section_title_span;
    }
    
    const sectionSubtitle = document.querySelector('.section-subtitle');
    if (sectionSubtitle) sectionSubtitle.innerText = t.section_subtitle;
    
    const resultsPrefix = document.querySelector('.results-info span:first-child');
    if (resultsPrefix) resultsPrefix.innerText = t.results_prefix;
    
    const resultsSuffix = document.querySelector('.results-info span:last-child');
    if (resultsSuffix) resultsSuffix.innerText = t.results_suffix;
    
    const loadMoreBtnSpan = document.querySelector('.btn-load-more span');
    if (loadMoreBtnSpan) loadMoreBtnSpan.innerText = t.load_more;
    
    // الإحصائيات
    const statsLabels = document.querySelectorAll('.stats-section .stats-label');
    if (statsLabels.length >= 4) {
        statsLabels[0].innerText = t.stats_available_label;
        statsLabels[1].innerText = t.stats_sold_label;
        statsLabels[2].innerText = t.stats_visitors_label;
        statsLabels[3].innerText = t.stats_contacts_label;
    }
    
    // الفوتر
    const footerDesc = document.querySelector('.footer-description');
    if (footerDesc) footerDesc.innerText = t.footer_description;
    
    const footerQuickLinksTitle = document.querySelector('.footer-links:first-of-type h4');
    if (footerQuickLinksTitle) footerQuickLinksTitle.innerText = t.footer_quick_links;
    
    const footerPropertyTypesTitle = document.querySelector('.footer-links:nth-child(3) h4');
    if (footerPropertyTypesTitle) footerPropertyTypesTitle.innerText = t.footer_property_types;
    
    const footerAddPropertyTitle = document.querySelector('.footer-contact h4');
    if (footerAddPropertyTitle) footerAddPropertyTitle.innerText = t.footer_add_property;
    
    const footerContactBtnSpan = document.querySelector('.footer-contact-btn span');
    if (footerContactBtnSpan) footerContactBtnSpan.innerText = t.footer_contact_btn;
    
    const footerCopyright = document.querySelector('.footer-bottom p:first-child');
    if (footerCopyright) {
        footerCopyright.innerHTML = `© 2026 عقارات الملك | KING HOUSES - ${t.footer_copyright}`;
    }
    
    const footerDesignSpan = document.querySelector('.footer-bottom p:last-child .gold-text');
    if (footerDesignSpan) {
        const designText = document.querySelector('.footer-bottom p:last-child');
        if (designText) {
            designText.innerHTML = `${t.footer_design_by} <span class="gold-text">King Somoza</span>`;
        }
    }
    
    const privacyLinkSpan = document.querySelector('.privacy-link');
    if (privacyLinkSpan) {
        privacyLinkSpan.innerHTML = `<i class="fas fa-shield-alt"></i> ${t.footer_privacy}`;
    }
    
    const footerQuickLinks = document.querySelectorAll('.footer-links:first-of-type ul li a');
    if (footerQuickLinks.length >= 3) {
        footerQuickLinks[0].innerText = t.nav_home;
        footerQuickLinks[1].innerText = t.nav_properties;
        footerQuickLinks[2].innerText = t.nav_stats;
    }
    
    const footerPropLinks = document.querySelectorAll('.footer-links:nth-child(3) ul li a');
    if (footerPropLinks.length >= 3) {
        footerPropLinks[0].innerText = t.footer_apartments;
        footerPropLinks[1].innerText = t.footer_villas;
        footerPropLinks[2].innerText = t.footer_houses;
    }
    
    // ===== مودال التواصل - تحديث باستخدام المعرفات =====
    // تحديث العنوان والترحيب
    const contactModalTitle = document.querySelector('#contactModal .modal-title h3');
    if (contactModalTitle) contactModalTitle.innerText = t.contact_title;

    const contactGreetingP = document.querySelector('#contactModal .contact-greeting p');
    if (contactGreetingP) contactGreetingP.innerText = t.contact_greeting;

    // ✅ تحديث حقل الاسم الأول (باستخدام id)
    const firstNameLabel = document.querySelector('label[for="firstName"]');
    if (firstNameLabel) {
        firstNameLabel.innerHTML = `${t.contact_first_name} <span class="required">*</span>`;
    }

    // ✅ تحديث حقل الاسم الأخير (باستخدام id)
    const lastNameLabel = document.querySelector('label[for="lastName"]');
    if (lastNameLabel) {
        lastNameLabel.innerHTML = `${t.contact_last_name} <span class="required">*</span>`;
    }

    // ✅ تحديث حقل رقم الهاتف (باستخدام id)
    const phoneLabel = document.querySelector('label[for="phoneNumber"]');
    if (phoneLabel) {
        phoneLabel.innerHTML = `${t.contact_phone} <span class="required">*</span>`;
    }

    // ✅ تحديث حقل الملاحظات (باستخدام id)
    const notesLabel = document.querySelector('label[for="contactNote"]');
    if (notesLabel) {
        notesLabel.innerHTML = `<i class="fas fa-pen-alt"></i> ${t.contact_notes}`;
    }

    // ✅ تحديث الـ placeholders
    const firstNameInput = document.getElementById('firstName');
    if (firstNameInput) firstNameInput.placeholder = t.contact_first_name_placeholder;

    const lastNameInput = document.getElementById('lastName');
    if (lastNameInput) lastNameInput.placeholder = t.contact_last_name_placeholder;

    const phoneInput = document.getElementById('phoneNumber');
    if (phoneInput) phoneInput.placeholder = t.contact_phone_placeholder;

    const contactNote = document.getElementById('contactNote');
    if (contactNote) contactNote.placeholder = t.contact_notes_placeholder;

    // ✅ تحديث الأزرار
    const submitBtn = document.querySelector('#contactModal .submit-btn span');
    if (submitBtn) submitBtn.innerText = t.contact_submit;

    const thanksTitle = document.querySelector('#contactThanks h3');
    if (thanksTitle) thanksTitle.innerText = t.contact_thanks_title;

    const closeBtn = document.querySelector('#contactThanks .whatsapp-btn span');
    if (closeBtn) closeBtn.innerText = t.contact_close;
    
    // مودال العقار
    const propDescTitle = document.querySelector('.property-description h4');
    if (propDescTitle) propDescTitle.innerText = t.property_description_title;
    
    const propSpecsTitle = document.querySelector('.property-specs h4');
    if (propSpecsTitle) propSpecsTitle.innerText = t.property_specs_title;
    
    const propMapTitle = document.querySelector('.property-map h4');
    if (propMapTitle) propMapTitle.innerText = t.property_map_title;
    
    const propSimilarTitle = document.querySelector('.property-suggestions h4');
    if (propSimilarTitle) propSimilarTitle.innerText = t.property_similar_title;
    
    const contactPropertyBtnSpan = document.querySelector('.action-btn.contact span');
    if (contactPropertyBtnSpan) contactPropertyBtnSpan.innerText = t.property_contact_btn;
    
    const sharePropertyBtnSpan = document.querySelector('.action-btn.share span');
    if (sharePropertyBtnSpan) sharePropertyBtnSpan.innerText = t.property_share_btn;
    
    const favoritePropertyBtnSpan = document.querySelector('.action-btn.favorite span');
    if (favoritePropertyBtnSpan) favoritePropertyBtnSpan.innerText = t.property_favorite_btn;
    
    const copyLinkBtnSpan = document.querySelector('.action-btn.copy-link span');
    if (copyLinkBtnSpan) copyLinkBtnSpan.innerText = t.property_copy_link_btn;
    
    const propModalViewsSpan = document.querySelector('#propModalViews span');
    if (propModalViewsSpan) propModalViewsSpan.innerText = t.property_views;
    
    // سياسة الخصوصية
    const privacyModalTitle = document.querySelector('#privacyModal .modal-title h3');
    if (privacyModalTitle) privacyModalTitle.innerText = t.privacy_title;
    
    const privacySections = document.querySelectorAll('#privacyModal .privacy-section h4');
    if (privacySections.length >= 7) {
        const sections = [
            'privacy_data_collected', 'privacy_usage', 'privacy_retention',
            'privacy_cookies', 'privacy_rights', 'privacy_security', 'privacy_updates'
        ];
        const icons = ['database', 'lock', 'clock', 'cookie-bite', 'user-shield', 'globe', 'envelope'];
        privacySections.forEach((el, i) => {
            if (i < sections.length) {
                el.innerHTML = `<i class="fas fa-${icons[i]}"></i> ${t[sections[i]]}`;
            }
        });
    }
    
    const privacyConsentLabel = document.querySelector('#privacyModal .privacy-consent label');
    if (privacyConsentLabel) {
        privacyConsentLabel.innerHTML = `${t.privacy_consent} <a href="#" onclick="openPrivacyModal(); return false;">${t.privacy_consent_link}</a>`;
    }
    
    const privacyFooter = document.querySelector('#privacyModal .privacy-footer');
    if (privacyFooter) {
        privacyFooter.innerHTML = `<i class="fas fa-heart" style="color: var(--primary);"></i> ${t.privacy_footer}`;
    }
    
    const floatingTooltip = document.querySelector('.floating-tooltip');
    if (floatingTooltip) floatingTooltip.innerText = t.hero_contact_btn;

    // تحديث placeholders في نموذج إضافة العقار
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (t[key] !== undefined) {
        el.placeholder = t[key];
    }
});
    
    console.log(`🌐 تم تحديث الصفحة إلى: ${currentLanguage === 'ar' ? 'العربية' : 'English'}`);

}

// ============================================================
// 2. دوال ترجمة الفلاتر
// ============================================================

// ترجمة فلتر السعر (للبيع)
function translateSalePriceFilter() {
    const select = document.getElementById('filterSalePrice');
    if (!select) return;
    
    const texts = currentLanguage === 'en' ? {
        "0-10000": "Less than $10,000",
        "10000-25000": "$10,000 - $25,000",
        "25000-50000": "$25,000 - $50,000",
        "50000-150000": "$50,000 - $150,000",
        "150000-350000": "$150,000 - $350,000",
        "350000-600000": "$350,000 - $600,000",
        "600000-9999999": "More than $600,000"
    } : {
        "0-10000": "أقل من 10,000$",
        "10000-25000": "10,000 - 25,000$",
        "25000-50000": "25,000 - 50,000$",
        "50000-150000": "50,000 - 150,000$",
        "150000-350000": "150,000 - 350,000$",
        "350000-600000": "350,000 - 600,000$",
        "600000-9999999": "أكثر من 600,000$"
    };
    
    for (let i = 0; i < select.options.length; i++) {
        const val = select.options[i].value;
        if (texts[val]) select.options[i].text = texts[val];
    }
}

// ترجمة فلتر السعر (للإيجار) - إزالة /شهر
function translateRentPriceFilter() {
    const select = document.getElementById('filterRentPrice');
    if (!select) return;
    
    const texts = currentLanguage === 'en' ? {
        "0-100": "Less than 100",
        "100-250": "100 - 250",
        "250-500": "250 - 500",
        "500-1000": "500 - 1,000",
        "1000-2000": "1,000 - 2,000",
        "2000-9999": "More than 2,000"
    } : {
        "0-100": "أقل من 100",
        "100-250": "100 - 250",
        "250-500": "250 - 500",
        "500-1000": "500 - 1,000",
        "1000-2000": "1,000 - 2,000",
        "2000-9999": "أكثر من 2,000"
    };
    
    for (let i = 0; i < select.options.length; i++) {
        const val = select.options[i].value;
        if (texts[val]) select.options[i].text = texts[val];
    }
}

// ترجمة فلتر الطوابق
function translateFloorFilter() {
    const select = document.getElementById('filterFloor');
    if (!select) return;
    
    const texts = currentLanguage === 'en' ? {
        "": "All",
        "-2": "Basement 2",
        "-1": "Basement 1",
        "0": "Ground",
        "1": "1st",
        "2": "2nd",
        "3": "3rd",
        "4": "4th",
        "5": "5th",
        "6": "6th",
        "7": "7th",
        "8": "8th",
        "9": "9th",
        "10": "10th",
        "11": "11th",
        "12": "12th"
    } : {
        "": "الكل",
        "-2": "قبو ثاني",
        "-1": "قبو أول",
        "0": "أرضي",
        "1": "الأول",
        "2": "الثاني",
        "3": "الثالث",
        "4": "الرابع",
        "5": "الخامس",
        "6": "السادس",
        "7": "السابع",
        "8": "الثامن",
        "9": "التاسع",
        "10": "العاشر",
        "11": "الحادي عشر",
        "12": "الثاني عشر"
    };
    
    for (let i = 0; i < select.options.length; i++) {
        const val = select.options[i].value;
        if (texts[val] !== undefined) select.options[i].text = texts[val];
    }
}

// إعادة تعيين جميع الفلاتر وترجمتها
function refreshAllFilters() {
    populateGovernorateFilter();
    populateDistrictFilter();
    translateSalePriceFilter();
    translateRentPriceFilter();
    translateFloorFilter();
    
    // ترجمة فلتر مدة الإيجار
    const rentPeriodSelect = document.getElementById('filterRentPeriod');
    if (rentPeriodSelect) {
        const selectedValue = rentPeriodSelect.value;
        if (rentPeriodSelect.options[0]) {
            rentPeriodSelect.options[0].text = currentLanguage === 'ar' ? 'الكل' : 'All';
        }
        const periodOptions = [
            { value: 'month', ar: 'شهرياً', en: 'Monthly' },
            { value: 'year', ar: 'سنوياً', en: 'Yearly' },
            { value: 'week', ar: 'أسبوعياً', en: 'Weekly' }
        ];
        periodOptions.forEach((opt, index) => {
            const optionIndex = index + 1;
            if (rentPeriodSelect.options[optionIndex]) {
                rentPeriodSelect.options[optionIndex].text = currentLanguage === 'ar' ? opt.ar : opt.en;
            }
        });
        if (selectedValue && ['month', 'year', 'week'].includes(selectedValue)) {
            rentPeriodSelect.value = selectedValue;
        } else {
            rentPeriodSelect.value = '';
        }
    }
    
    filterProperties();
    console.log('✅ تم تحديث جميع الفلاتر للغة:', currentLanguage);
}

// ============================================================
// 3. دوال الفلاتر والمحافظات
// ============================================================

// تعبئة فلتر المحافظات
function populateGovernorateFilter() {
    const govSelect = document.getElementById('filterGovernorate');
    if (!govSelect || allProperties.length === 0) return;
    
    const governoratesMap = new Map();
    allProperties.forEach(p => {
        const govAr = p.governorate_ar;
        const govEn = p.governorate_en || govAr;
        if (govAr && !governoratesMap.has(govAr)) {
            governoratesMap.set(govAr, { ar: govAr, en: govEn });
        }
    });
    
    const govs = Array.from(governoratesMap.values()).sort((a, b) => a.ar.localeCompare(b.ar));
    govSelect.innerHTML = `<option value="">${currentLanguage === 'ar' ? 'كل المحافظات' : 'All Governorates'}</option>`;
    
    govs.forEach(gov => {
        const option = document.createElement('option');
        option.value = gov.ar;
        option.textContent = currentLanguage === 'ar' ? gov.ar : gov.en;
        govSelect.appendChild(option);
    });
    
    govSelect.removeEventListener('change', updateDistricts);
    govSelect.addEventListener('change', updateDistricts);
}

// تعبئة فلتر المناطق
function populateDistrictFilter() {
    const govSelect = document.getElementById('filterGovernorate');
    const distSelect = document.getElementById('filterDistrict');
    if (!govSelect || !distSelect || allProperties.length === 0) return;
    
    const selectedGov = govSelect.value;
    const currentDistValue = distSelect.value;
    const districtsMap = new Map();
    
    const filteredByGov = selectedGov 
        ? allProperties.filter(p => p.governorate_ar === selectedGov)
        : allProperties;
    
    filteredByGov.forEach(p => {
        const distAr = p.district_ar;
        const distEn = p.district_en || distAr;
        if (distAr && !districtsMap.has(distAr)) {
            districtsMap.set(distAr, { ar: distAr, en: distEn });
        }
    });
    
    const districts = Array.from(districtsMap.values()).sort((a, b) => a.ar.localeCompare(b.ar));
    distSelect.innerHTML = `<option value="">${currentLanguage === 'ar' ? 'كل المناطق' : 'All Districts'}</option>`;
    
    districts.forEach(dist => {
        const option = document.createElement('option');
        option.value = dist.ar;
        option.textContent = currentLanguage === 'ar' ? dist.ar : dist.en;
        distSelect.appendChild(option);
    });
    
    distSelect.disabled = districts.length === 0;
    if (currentDistValue && districts.some(d => d.ar === currentDistValue)) {
        distSelect.value = currentDistValue;
    }
}

// تحديث المناطق عند تغيير المحافظة
function updateDistricts() {
    populateDistrictFilter();
}

// ============================================================
// 4. دوال البحث والفلترة
// ============================================================

// دالة الفلترة الرئيسية
function filterProperties() {
    currentItemCount = CONFIG.ITEMS_PER_PAGE;
    
    const governorate = document.getElementById('filterGovernorate')?.value || '';
    const district = document.getElementById('filterDistrict')?.value || '';
    const type = document.getElementById('filterType')?.value || '';
    const propType = document.getElementById('filterPropType')?.value || '';
    const floor = document.getElementById('filterFloor')?.value || '';
    const rooms = document.getElementById('filterRooms')?.value || '';
    const salePrice = document.getElementById('filterSalePrice')?.value || '';
    const rentPrice = document.getElementById('filterRentPrice')?.value || '';
    const code = document.getElementById('filterCode')?.value.trim().toUpperCase() || '';
    const rentPeriod = document.getElementById('filterRentPeriod')?.value || '';
    
    filteredProperties = allProperties.filter(p => {
        // 1. فلاتر عامة (تطبق على الجميع)
        if (hideSoldActive && !p.available) return false;
        if (governorate && p.governorate_ar !== governorate) return false;
        if (district && p.district_ar !== district) return false;
        if (type && p.type !== type) return false;
        if (propType && p.propertyType !== propType) return false;
        if (floor && p.floor !== parseInt(floor)) return false;
        if (rooms && p.rooms < parseInt(rooms)) return false;
        if (code && !p.id.toUpperCase().includes(code)) return false;
        if (rentPeriod && p.type === 'rent' && p.rent_period !== rentPeriod) return false;
        if (rentPeriod && p.type !== 'rent') return false;
        
        // 2. فلتر السعر (للبيع) - يطبق فقط إذا تم اختيار فلتر سعر البيع
        if (salePrice && salePrice !== '') {
            // إذا تم اختيار فلتر سعر البيع، يجب أن يكون العقار للبيع
            if (p.type !== 'sale') {
                return false; // استبعاد جميع العقارات غير المعروضة للبيع
            }
            // إذا كان السعر رقمي
            if (p.isPriceNumeric) {
                const [min, max] = salePrice.split('-').map(Number);
                if (Number(p.price) < min || Number(p.price) > max) return false;
            } else {
                // العقارات ذات السعر النصي لا تظهر في الفلتر العددي
                return false;
            }
        }
        
        // 3. فلتر السعر (للإيجار) - يطبق فقط إذا تم اختيار فلتر سعر الإيجار
        if (rentPrice && rentPrice !== '') {
            // إذا تم اختيار فلتر سعر الإيجار، يجب أن يكون العقار للإيجار
            if (p.type !== 'rent') {
                return false; // استبعاد جميع العقارات غير المعروضة للإيجار
            }
            if (p.isPriceNumeric) {
                const [min, max] = rentPrice.split('-').map(Number);
                if (Number(p.price) < min || Number(p.price) > max) return false;
            } else {
                return false;
            }
        }
        
        return true;
    });
    
    renderProperties();
    updateResultsCount();
    
    if (filteredProperties.length === 0) {
        showToast('لا توجد عقارات تطابق معايير البحث', 'error');
    } else {
        showToast(`✅ تم العثور على ${filteredProperties.length} عقار`, 'success');
    }
}

// إعادة تعيين الفلاتر
function resetFilters() {
    document.getElementById('filterType').value = '';
    document.getElementById('filterPropType').value = '';
    document.getElementById('filterFloor').value = '';
    document.getElementById('filterRooms').value = '';
    document.getElementById('filterSalePrice').value = '';
    document.getElementById('filterRentPrice').value = '';
    document.getElementById('filterCode').value = '';
    document.getElementById('filterGovernorate').value = '';
    document.getElementById('filterRentPeriod').value = '';
    
    const districtSelect = document.getElementById('filterDistrict');
    districtSelect.innerHTML = `<option value="">${currentLanguage === 'ar' ? 'كل المناطق' : 'All Districts'}</option>`;
    districtSelect.disabled = true;
    
    if (allProperties.length > 0) {
        populateGovernorateFilter();
        populateDistrictFilter();
    }
    
    filteredProperties = [...allProperties];
    currentItemCount = CONFIG.ITEMS_PER_PAGE;
    renderProperties();
    updateResultsCount();
    showToast(currentLanguage === 'ar' ? '✅ تم إعادة تعيين جميع الفلاتر' : '✅ All filters reset', 'success');
}

function updateResultsCount() {
    const el = document.getElementById('resultsCount');
    if (el) el.textContent = filteredProperties.length;
}

// ربط الفلاتر
function bindFilters() {
    const filterElements = [
        'filterType', 'filterPropType', 'filterFloor', 'filterRooms',
        'filterSalePrice', 'filterRentPrice', 'filterCode', 'filterDistrict',
        'filterRentPeriod'
    ];
    
    filterElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.removeEventListener('change', filterProperties);
            el.addEventListener('change', filterProperties);
            if (el.tagName === 'INPUT') {
                el.removeEventListener('keyup', filterProperties);
                el.addEventListener('keyup', filterProperties);
            }
        }
    });
    
    const govFilter = document.getElementById('filterGovernorate');
if (govFilter) {
    govFilter.removeEventListener('change', updateDistricts);
    govFilter.addEventListener('change', updateDistricts);
}
    
    console.log("✅ تم ربط جميع الفلاتر بنجاح");
}

// ============================================================
// 5. دوال العرض (البطاقات)
// ============================================================

function createPropertyCard(p) {
    let imagesArray = [];
    if (p.images) {
        if (Array.isArray(p.images)) imagesArray = p.images;
        else if (typeof p.images === 'string') {
            imagesArray = p.images.split(',').map(s => s.trim());
        }
    }
    if (imagesArray.length === 0) {
        imagesArray = [DEFAULT_IMAGE];
    }
    
    const title = getLocalizedText(p, 'title');
    const location = getLocalizedText(p, 'district') + ' - ' + getLocalizedText(p, 'city');
    const t = translations[currentLanguage];
    const isFeatured = p.featured === 'yes';
    const imageCount = imagesArray.length;
    
    let dotsHtml = '';
    if (imageCount > 1) {
        dotsHtml = '<div class="card-image-dots" data-id="' + p.id + '">';
        for (let idx = 0; idx < imagesArray.length; idx++) {
            dotsHtml += `<span class="img-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>`;
        }
        dotsHtml += '</div>';
    }
    
    return `<div class="property-card ${isFeatured ? 'featured-property' : ''}" data-id="${p.id}" data-images='${JSON.stringify(imagesArray)}' data-current-img="0">
        ${!p.available ? `<div class="sold-overlay"><div class="sold-stamp">${t?.sold_stamp || 'مباع'}</div></div>` : ''}
        ${isFeatured ? `<div class="featured-badge">${t?.featured_badge || '⭐ مميز'}</div>` : ''}
        <div class="card-badges"><span class="badge-type ${p.type === 'sale' ? 'badge-sale' : 'badge-rent'}">${p.type === 'sale' ? (t?.filter_transaction_sale || 'للبيع') : (t?.filter_transaction_rent || 'للإيجار')}</span></div>
        <div class="card-images" data-id="${p.id}">
            <img class="card-main-img" src="${imagesArray[0]}" alt="${title}" loading="lazy">
            ${imageCount > 1 ? `<button class="card-img-nav prev" data-id="${p.id}">❮</button><button class="card-img-nav next" data-id="${p.id}">❯</button>` : ''}
            ${dotsHtml}
        </div>
        <div class="card-body">
            <!-- ✅ تم نقل الكود إلى هنا -->
            <div class="card-stats">
                <div class="card-views"><i class="fas fa-eye"></i> ${p.views || 0} ${t?.views_text || 'مشاهدة'}</div>
                <div class="card-favs"><i class="fas fa-heart"></i> ${p.favCount || 0}</div>
                <div class="card-date"><i class="far fa-calendar-alt"></i> ${formatDate(p.added_date)}</div>
                <span class="card-code"><i class="fas fa-barcode"></i> ${p.id}</span>
            </div>
               <h3 class="card-title">${title}</h3>
            <div class="card-location"><i class="fas fa-map-marker-alt"></i> ${location}</div>
            <div class="card-specs">
                <div class="spec-item"><i class="fas fa-ruler-combined spec-icon"></i><span class="spec-value">${p.area}</span><span> ${currentLanguage === 'ar' ? 'م²' : 'm²'}</span></div>
                <div class="spec-item"><i class="fas fa-door-open spec-icon"></i><span class="spec-value">${p.rooms}</span><span>${currentLanguage === 'ar' ? 'غرف' : 'rooms'}</span></div>
                <div class="spec-item"><i class="fas fa-layer-group spec-icon"></i><span class="spec-value">${p.floor === 0 ? (currentLanguage === 'ar' ? 'أرضي' : 'Ground') : p.floor}</span><span>${currentLanguage === 'ar' ? 'طابق' : 'floor'}</span></div>
            </div>
            <div class="card-footer">
                <div class="card-price">
                    ${p.isPriceNumeric ? 
                        `${Number(p.price).toLocaleString()} <span>${p.currency}</span>` : 
                        `<span class="price-contact">💰 ${p.price}</span>`}
                    ${p.type === 'rent' ? ` <span class="rent-period">${getRentPeriodText(p.rent_period)}</span>` : ''}
                </div>
                <button class="btn-more" onclick="event.stopPropagation();openPropertyModal('${p.id}')">${t?.more_btn || 'عرض المزيد'} <i class="fas fa-arrow-left"></i></button>
            </div>
        </div>
    </div>`;
}

function renderProperties() {
    const grid = document.getElementById('propertiesGrid');
    if (!grid) return;
    
    const toShow = filteredProperties.slice(0, currentItemCount);
    if (toShow.length === 0) {
        grid.innerHTML = '<div class="no-results">...</div>';
        document.getElementById('loadMoreBtn').style.display = 'none';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    toShow.forEach(p => {
        tempDiv.innerHTML = createPropertyCard(p);
        fragment.appendChild(tempDiv.firstElementChild);
    });
    
    grid.innerHTML = '';
    grid.appendChild(fragment);
    
    const loadBtn = document.getElementById('loadMoreBtn');
    if (loadBtn) {
        loadBtn.style.display = filteredProperties.length > currentItemCount ? 'block' : 'none';
    }
    
    requestAnimationFrame(() => initCardGalleries());
}

function loadMoreProperties() {
    currentItemCount += CONFIG.ITEMS_PER_PAGE;
    if (currentItemCount > filteredProperties.length) currentItemCount = filteredProperties.length;
    renderProperties();
    window.scrollBy({ top: 400, behavior: 'smooth' });
}

// ============================================================
// 6. معرض الصور داخل البطاقة
// ============================================================

function initCardGalleries() {
    document.querySelectorAll('.card-img-nav.next').forEach(btn => {
        btn.removeEventListener('click', nextCardImage);
        btn.addEventListener('click', nextCardImage);
    });
    document.querySelectorAll('.card-img-nav.prev').forEach(btn => {
        btn.removeEventListener('click', prevCardImage);
        btn.addEventListener('click', prevCardImage);
    });
    document.querySelectorAll('.img-dot').forEach(dot => {
        dot.removeEventListener('click', dotClickHandler);
        dot.addEventListener('click', dotClickHandler);
    });
}

function nextCardImage(e) {
    e.stopPropagation();
    const card = e.currentTarget.closest('.property-card');
    if (!card) return;
    const imgElement = card.querySelector('.card-main-img');
    let images = card.dataset.images;
    if (!images) return;
    let imagesArray;
    try { imagesArray = JSON.parse(images); } catch { return; }
    if (!imagesArray.length) return;
    let currentIndex = parseInt(card.dataset.currentImg) || 0;
    currentIndex = (currentIndex + 1) % imagesArray.length;
    card.dataset.currentImg = currentIndex;
    imgElement.src = imagesArray[currentIndex];
    const dots = card.querySelectorAll('.img-dot');
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
}

function prevCardImage(e) {
    e.stopPropagation();
    const card = e.currentTarget.closest('.property-card');
    if (!card) return;
    const imgElement = card.querySelector('.card-main-img');
    let images = card.dataset.images;
    if (!images) return;
    let imagesArray;
    try { imagesArray = JSON.parse(images); } catch { return; }
    if (!imagesArray.length) return;
    let currentIndex = parseInt(card.dataset.currentImg) || 0;
    currentIndex = (currentIndex - 1 + imagesArray.length) % imagesArray.length;
    card.dataset.currentImg = currentIndex;
    imgElement.src = imagesArray[currentIndex];
    const dots = card.querySelectorAll('.img-dot');
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
}

function dotClickHandler(e) {
    e.stopPropagation();
    const dot = e.currentTarget;
    const card = dot.closest('.property-card');
    if (!card) return;
    const imgElement = card.querySelector('.card-main-img');
    let images = card.dataset.images;
    if (!images) return;
    let imagesArray;
    try { imagesArray = JSON.parse(images); } catch { return; }
    const index = parseInt(dot.dataset.index);
    if (isNaN(index) || !imagesArray[index]) return;
    card.dataset.currentImg = index;
    imgElement.src = imagesArray[index];
    const dots = card.querySelectorAll('.img-dot');
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
}

// ============================================================
// 7. دوال الإحصائيات - نظام عداد زوار دقيق
// ============================================================

async function initStats() {
    // قراءة العداد من localStorage أولاً
    let visitors = parseInt(localStorage.getItem('kh_visitors_total') || '0');
    let contacts = parseInt(localStorage.getItem('kh_contacts_total') || '0');
    
    updateStatsUI(visitors, contacts);
    
    // جلب العداد من الخادم
    await fetchVisitorCount();
    
    // جلب عدد الاستفسارات
    fetch(`${CONFIG.API_URL}?action=getContactsCount&_=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.count) {
                contacts = data.count;
                localStorage.setItem('kh_contacts_total', contacts);
                updateStatsUI(visitors, contacts);
            }
        })
        .catch(err => console.error('خطأ في جلب الاستفسارات:', err));
}

// دالة جلب عدد الزوار من الخادم
async function fetchVisitorCount() {
    try {
        const response = await fetch(`${CONFIG.API_URL}?action=getVisitorCount&_=${Date.now()}`);
        const data = await response.json();
        if (data && data.count !== undefined) {
            const visitors = data.count;
            localStorage.setItem('kh_visitors_total', visitors);
            updateStatsUI(visitors, parseInt(localStorage.getItem('kh_contacts_total') || '0'));
            console.log(`✅ تم تحديث عدد الزوار: ${visitors}`);
            return visitors;
        }
        return null;
    } catch (error) {
        console.error('❌ خطأ في جلب عدد الزوار:', error);
        return null;
    }
}

// دالة زيادة عدد الزوار مع فاصل زمني 5 دقائق
async function incrementVisitorCount() {
    const now = Date.now();
    const lastVisitKey = 'kh_last_visit_time';
    const lastVisitTime = parseInt(localStorage.getItem(lastVisitKey) || '0');
    const fiveMinutes = 5 * 60 * 1000; // 5 دقائق بالميلي ثانية
    
    // التحقق من مرور 5 دقائق منذ آخر تسجيل
    if (now - lastVisitTime < fiveMinutes) {
        console.log(`⏳ لم تمر 5 دقائق بعد، انتظر ${Math.ceil((fiveMinutes - (now - lastVisitTime)) / 1000)} ثانية`);
        return false;
    }
    
    // تحديث وقت الزيارة في localStorage
    localStorage.setItem(lastVisitKey, now.toString());
    
    try {
        // إرسال طلب إلى الخادم لزيادة العداد
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                type: 'incrementVisitor',
                timestamp: now
            })
        });
        
        console.log('✅ تم تسجيل زائر جديد');
        
        // تحديث العداد محلياً بعد 1 ثانية (لإعطاء وقت للخادم)
        setTimeout(async () => {
            await fetchVisitorCount();
        }, 1000);
        
        return true;
    } catch (error) {
        console.error('❌ خطأ في تحديث عدد الزوار:', error);
        return false;
    }
}

// دالة زيادة عدد الاستفسارات (للمستخدمين الذين يتواصلون)
async function incrementContactsCount() {
    try {
        await fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'incrementContacts' })
        });
        console.log('✅ تم تحديث عداد الاستفسارات');
    } catch (error) {
        console.error('❌ خطأ في تحديث عداد الاستفسارات:', error);
    }
}

function updateStatsUI(visitors, contacts) {
    const available = allProperties.filter(p => p.available).length;
    const sold = allProperties.filter(p => !p.available).length;
    
    const elements = {
        // العناصر القديمة (احتفظ بها للتوافق)
        heroAvailable: available,
        heroSold: sold,
        heroVisitors: visitors,
        statsAvailable: available,
        statsSold: sold,
        statsVisitors: visitors,
        statsContacts: contacts,
        totalVisitors: visitors,
        // ✅ العناصر الجديدة للإحصائيات المدمجة
        heroAvailableInline: available,
        heroSoldInline: sold,
        heroVisitorsInline: visitors
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
    });
}

async function autoRefreshStats() {
    console.log('🔄 جاري تحديث الإحصائيات...');
    try {
        // تحديث عدد الزوار
        await fetchVisitorCount();
        
        // تحديث عدد الاستفسارات
        const contactsRes = await fetch(`${CONFIG.API_URL}?action=getContactsCount&_=${Date.now()}`);
        const contactsData = await contactsRes.json();
        if (contactsData && contactsData.count !== undefined) {
            const contacts = contactsData.count;
            localStorage.setItem('kh_contacts_total', contacts);
            const visitors = parseInt(localStorage.getItem('kh_visitors_total') || '0');
            updateStatsUI(visitors, contacts);
        }
        
        console.log(`✅ تم تحديث الإحصائيات`);    } catch (error) {
        console.error('❌ فشل تحديث الإحصائيات، إعادة المحاولة بعد 30 ثانية');
        setTimeout(autoRefreshStats, 30000);
        return;
    }
    // إعادة الجدولة بعد 5 دقائق
    setTimeout(autoRefreshStats, 300000);
}

// بدلاً من setInterval، استخدم استدعاء أولي
autoRefreshStats();


// ============================================================
// 8. المفضلات
// ============================================================

function loadFavorites() {
    favoritesList = JSON.parse(localStorage.getItem('kh_favorites') || '[]');
}

function saveFavorites() {
    localStorage.setItem('kh_favorites', JSON.stringify(favoritesList));
}

async function toggleFavoriteCard(id) {
    event.stopPropagation();
    const p = allProperties.find(x => x.id === id);
    const idx = favoritesList.indexOf(id);
    let newFavCount = p ? (p.favCount || 0) : 0;
    
    if (idx === -1) {
        favoritesList.push(id);
        newFavCount = (p.favCount || 0) + 1;
        if (p) p.favCount = newFavCount;
        showToast('❤️ أضيف للمفضلة');
    } else {
        favoritesList.splice(idx, 1);
        newFavCount = (p.favCount || 0) - 1;
        if (p && p.favCount > 0) p.favCount = newFavCount;
        showToast('💔 أزيل من المفضلة');
    }
    
    saveFavorites();
    localStorage.setItem('kh_properties', JSON.stringify(allProperties));
    renderProperties();
    updateModalFavCount();
    
    try {
        await fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'favorite', propertyId: id, favCount: newFavCount })
        });
        console.log(`✅ تم تحديث المفضلات للعقار ${id}: ${newFavCount}`);
    } catch (error) {
        console.error('❌ خطأ في تحديث المفضلات:', error);
    }
}

function showFavoritesOnly() {
    if (favoritesList.length === 0) {
        showToast('لا توجد مفضلات', 'error');
        return;
    }
    filteredProperties = allProperties.filter(p => favoritesList.includes(p.id));
    currentItemCount = CONFIG.ITEMS_PER_PAGE;
    renderProperties();
    updateResultsCount();
}

function showAllProperties() {
    filteredProperties = [...allProperties];
    currentItemCount = CONFIG.ITEMS_PER_PAGE;
    renderProperties();
    updateResultsCount();
}

function updateModalFavCount() {
    const p = allProperties.find(x => x.id === currentPropertyId);
    const favCountEl = document.getElementById('modalFavCount');
    if (favCountEl && p) favCountEl.innerText = p.favCount || 0;
}

function toggleFavoriteFromModal() {
    if (currentPropertyId) toggleFavoriteCard(currentPropertyId);
}

// ============================================================
// 9. دوال التواصل
// ============================================================

function openContactModal(propId = null) {
    // إذا كان هناك معرف عقار، احفظه
    if (propId) {
        document.getElementById('contactPropId').value = propId;
    }
    
    // إظهار المودال
    document.getElementById('contactModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeContactModal() {
    document.getElementById('contactModal').classList.remove('active');
    document.body.style.overflow = '';
}

// ... دوال أخرى ...

// ============================================================
// التواصل من مودال العقار
// ============================================================

function contactFromProperty() {
    // الحصول على معرف العقار الحالي
    const propertyId = currentPropertyId;
    
    // إغلاق مودال العقار
    closePropertyModal();
    
    // فتح مودال التواصل مع تمرير معرف العقار
    setTimeout(function() {
        // فتح المودال مباشرة
        document.getElementById('contactModal').classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // حفظ معرف العقار
        if (propertyId) {
            document.getElementById('contactPropId').value = propertyId;
        }
        
        console.log('✅ تم فتح مودال التواصل للعقار:', propertyId);
    }, 400);
}

function validateName(name, fieldName) {
    if (!name || name.trim().length === 0) return { valid: false, message: `❌ ${fieldName} مطلوب` };
    const trimmed = name.trim();
    if (trimmed.length < 2) return { valid: false, message: `❌ ${fieldName} يجب أن يكون حرفين على الأقل` };
    if (trimmed.length > 50) return { valid: false, message: `❌ ${fieldName} طويل جداً` };
    const nameRegex = /^[\u0621-\u064A\u0660-\u0669a-zA-Z\s]+$/;
    if (!nameRegex.test(trimmed)) return { valid: false, message: `❌ ${fieldName} يجب أن يحتوي على حروف فقط` };
    return { valid: true, value: trimmed };
}

function validatePhone(phone, countryCode) {
    if (!phone || phone.trim().length === 0) return { valid: false, message: `❌ رقم الهاتف مطلوب` };
    const trimmed = phone.trim().replace(/^0+/, '');
    if (!/^[0-9]{7,15}$/.test(trimmed)) return { valid: false, message: `❌ رقم الهاتف يجب أن يحتوي على 7-15 رقم فقط` };
    const fullPhone = countryCode + trimmed;
    if (fullPhone.length < 9) return { valid: false, message: `❌ رقم الهاتف غير مكتمل` };
    if (fullPhone.length > 18) return { valid: false, message: `❌ رقم الهاتف طويل جداً` };
    return { valid: true, value: trimmed, fullPhone: fullPhone };
}

function resetSubmitBtn(btn) {
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i><span>تأكيد الطلب</span>';
    }
}

async function submitContactRequest() {
    console.log('📤 جاري إرسال الطلب...', { firstName, lastName, phoneNumber, propertyId, note });
    const firstNameRaw = document.getElementById('firstName')?.value || '';
    const lastNameRaw = document.getElementById('lastName')?.value || '';
    const countryCode = document.getElementById('phoneCountry')?.value || '+963';
    const phoneRaw = document.getElementById('phoneNumber')?.value || '';
    const note = document.getElementById('contactNote')?.value || '';
    const propertyId = document.getElementById('contactPropId')?.value || '';
    
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn?.disabled) return;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
    }
    
    const firstNameCheck = validateName(firstNameRaw, 'الاسم الأول');
    if (!firstNameCheck.valid) { showToast(firstNameCheck.message, 'error'); resetSubmitBtn(submitBtn); return; }
    
    const lastNameCheck = validateName(lastNameRaw, 'الاسم الأخير');
    if (!lastNameCheck.valid) { showToast(lastNameCheck.message, 'error'); resetSubmitBtn(submitBtn); return; }
    
    const phoneCheck = validatePhone(phoneRaw, countryCode);
    if (!phoneCheck.valid) { showToast(phoneCheck.message, 'error'); resetSubmitBtn(submitBtn); return; }
    
    const firstName = firstNameCheck.value;
    const lastName = lastNameCheck.value;
    const phoneNumber = phoneCheck.value;
    const fullPhone = phoneCheck.fullPhone;
    
    showToast('📤 جاري إرسال طلبك...', 'info');
    
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'no-cors',  // هذا يمنع قراءة الرد، لكن الطلب يصل
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                type: 'contact', 
                firstName, 
                lastName, 
                phoneCountry: countryCode, 
                phoneNumber, 
                propertyId, 
                note 
            })
        });
        
        const thanksMsg = document.getElementById('thanksMessage');
        if (thanksMsg) {
            const t = translations[currentLanguage];
            const whatsappNumber = '+963 932 168 293';
            
            if (currentLanguage === 'ar') {
                thanksMsg.innerHTML = `
                    <div style="text-align: right;">
                        <p style="font-size: 18px; margin-bottom: 15px;">
                            ✅ شكراً ${firstName} ${lastName}، تم تسجيل طلبك بنجاح.
                        </p>
                        <p style="margin-bottom: 10px;">
                            📞 سنتواصل معك على الرقم <strong dir="ltr">${fullPhone}</strong> خلال 24 ساعة.
                        </p>
                        <div style="background: #f0f0f0; border-radius: 12px; padding: 15px; margin: 15px 0; text-align: center; direction: ltr;">
                            <span style="font-size: 20px; font-weight: 700; color: #25D366; direction: ltr; display: inline-block;">${whatsappNumber}</span>
                            <button onclick="copyWhatsAppNumber()" style="
                                background: #25D366;
                                color: white;
                                border: none;
                                padding: 8px 20px;
                                border-radius: 30px;
                                font-size: 14px;
                                font-weight: 600;
                                cursor: pointer;
                                margin-right: 10px;
                                transition: all 0.3s ease;
                                display: inline-flex;
                                align-items: center;
                                gap: 8px;
                            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                                <i class="fas fa-copy"></i> نسخ الرقم
                            </button>
                        </div>
                        <p style="font-size: 13px; color: var(--gray);">
                            💡 يمكنك أيضاً التواصل معنا مباشرة على واتساب
                        </p>
                    </div>
                `;
            } else {
                thanksMsg.innerHTML = `
                    <div style="text-align: left;">
                        <p style="font-size: 18px; margin-bottom: 15px;">
                            ✅ Thank you ${firstName} ${lastName}, your request has been recorded successfully.
                        </p>
                        <p style="margin-bottom: 10px;">
                            📞 We will contact you at <strong dir="ltr">${fullPhone}</strong> within 24 hours.
                        </p>
                        <div style="background: #f0f0f0; border-radius: 12px; padding: 15px; margin: 15px 0; text-align: center; direction: ltr;">
                            <span style="font-size: 20px; font-weight: 700; color: #25D366; direction: ltr; display: inline-block;">${whatsappNumber}</span>
                            <button onclick="copyWhatsAppNumber()" style="
                                background: #25D366;
                                color: white;
                                border: none;
                                padding: 8px 20px;
                                border-radius: 30px;
                                font-size: 14px;
                                font-weight: 600;
                                cursor: pointer;
                                margin-left: 10px;
                                transition: all 0.3s ease;
                                display: inline-flex;
                                align-items: center;
                                gap: 8px;
                            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                                <i class="fas fa-copy"></i> Copy Number
                            </button>
                        </div>
                        <p style="font-size: 13px; color: var(--gray);">
                            💡 You can also contact us directly on WhatsApp
                        </p>
                    </div>
                `;
            }
        }
        
        // مسح الحقول
        document.getElementById('firstName').value = '';
        document.getElementById('lastName').value = '';
        document.getElementById('phoneNumber').value = '';
        if (document.getElementById('contactNote')) document.getElementById('contactNote').value = '';
        if (document.getElementById('contactPropId')) document.getElementById('contactPropId').value = '';
        
        // ✅ تحديث عداد الاستفسارات في الخلفية (بدون انتظار)
        incrementContactsCount().catch(err => console.error('خطأ في تحديث العداد:', err));
        
        showToast('✅ تم إرسال طلبك بنجاح', 'success');
    } catch (error) {
        console.error(error);
        showToast('❌ حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
    } finally {
        resetSubmitBtn(submitBtn);
    }
}

// ============================================================
// 10. قائمة الدول للاتصال
// ============================================================

const countriesList = [
    { code: "+93", name_ar: "أفغانستان", name_en: "Afghanistan", flag: "🇦🇫" },
    { code: "+355", name_ar: "ألبانيا", name_en: "Albania", flag: "🇦🇱" },
    { code: "+963", name_ar: "سوريا", name_en: "Syria", flag: "🇸🇾" },
    // ... (جميع الدول موجودة في ملفك، اختصرتها للعرض)
];

// ترتيب الدول أبجدياً
countriesList.sort((a, b) => a.name_ar.localeCompare(b.name_ar));

function populatePhoneCountrySelect() {
    const select = document.getElementById('phoneCountry');
    if (!select) return;
    const lang = currentLanguage;
    select.innerHTML = '';
    countriesList.forEach(country => {
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = `${country.flag} ${lang === 'ar' ? country.name_ar : country.name_en} ${country.code}`;
        if (country.code === '+963') option.selected = true;
        select.appendChild(option);
    });
}

// ============================================================
// 11. دوال المودالات
// ============================================================

async function openPropertyModal(id) {
    const p = allProperties.find(x => x.id === id);
    if (!p) return;
    
    // تحديث المشاهدات
    const storageKey = `kh_view_${id}`;
    const lastViewTime = localStorage.getItem(storageKey);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (!lastViewTime || (now - parseInt(lastViewTime)) > oneHour) {
        p.views = (p.views || 0) + 1;
        localStorage.setItem(storageKey, now.toString());
        localStorage.setItem('kh_properties', JSON.stringify(allProperties));
        try {
            await fetch(CONFIG.API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'view', propertyId: id, views: p.views })
            });
            console.log(`✅ تم إضافة مشاهدة للعقار ${id}. العدد الجديد: ${p.views}`);
        } catch (error) { console.error('❌ خطأ في تحديث المشاهدات:', error); }
    }
    
    currentPropertyId = id;
    updateMetaTagsForProperty(p);
    
    const title = getLocalizedText(p, 'title');
    const description = getLocalizedText(p, 'description');
    const city = getLocalizedText(p, 'city');
    const district = getLocalizedText(p, 'district');
    const finishing = getLocalizedText(p, 'finishing');
    const ownership = getLocalizedText(p, 'ownership');
    const direction = getLocalizedText(p, 'direction');
    const elevator = getLocalizedText(p, 'elevator');
    const parking = getLocalizedText(p, 'parking');
    const t = translations[currentLanguage];
    
    document.getElementById('propModalTitle').textContent = title;
    document.getElementById('propModalCode').innerHTML = `<i class="fas fa-barcode"></i> ${t?.property_code_prefix || 'كود:'} ${p.id}`;
    document.getElementById('propModalName').textContent = title;
    
    const rentPeriodText = (p.type === 'rent') ? ` / ${getRentPeriodText(p.rent_period)}` : '';
    
    // عرض السعر في المودال
    const priceElement = document.getElementById('propModalPrice');
    if (p.isPriceNumeric) {
        priceElement.textContent = `${Number(p.price).toLocaleString()} ${p.currency}`;
        priceElement.style.color = 'var(--primary)';
        priceElement.style.fontSize = '32px';
        priceElement.style.fontWeight = '800';
    } else {
        priceElement.textContent = p.price;
        priceElement.style.color = '#e74c3c';
        priceElement.style.fontSize = '28px';
        priceElement.style.fontWeight = '800';
    }
    
    document.getElementById('propModalLocation').textContent = district ? `${district} - ${city}` : p.location;
    document.getElementById('propModalDesc').textContent = description;
    document.getElementById('propModalType').innerHTML = p.type === 'sale' ? '🏷️ ' + (t?.filter_transaction_sale || 'للبيع') : '🔑 ' + (t?.filter_transaction_rent || 'للإيجار');
    
    const viewsEl = document.getElementById('propModalViews');
    if (viewsEl) viewsEl.innerHTML = `<i class="fas fa-eye"></i> ${p.views} ${t?.property_views || 'مشاهدة'}`;
    renderProperties();
    
    currentPropertyImages = p.images || [];
    currentImageIndex = 0;
    updateModalImage();
    
    // المواصفات
    const specs = document.getElementById('propModalSpecs');
    if (specs) {
        // تحضير متغيرات السعر
        const priceDisplay = p.isPriceNumeric ? 
            `${Number(p.price).toLocaleString()} ${p.currency}` : 
            p.price;
        
        const priceStyle = p.isPriceNumeric ? 
            'color:#C9A84C;font-size:18px;font-weight:700' : 
            'color:#e74c3c;font-size:20px;font-weight:800;background:rgba(231,76,60,0.1);padding:4px 15px;border-radius:8px';
        
        const priceBg = p.isPriceNumeric ? 
            'rgba(201,168,76,0.1)' : 
            'rgba(231,76,60,0.1)';
        
        const priceBorder = p.isPriceNumeric ? 
            'none' : 
            '1px dashed #e74c3c';
        
        specs.innerHTML = `
            <div class="spec-item-detail"><i class="fas fa-ruler-combined"></i><div><span class="spec-label-detail">${t?.property_specs_area || 'المساحة'}</span><span class="spec-value-detail">${p.area} م²</span></div></div>
            <div class="spec-item-detail"><i class="fas fa-door-open"></i><div><span class="spec-label-detail">${t?.property_specs_rooms || 'الغرف'}</span><span class="spec-value-detail">${p.rooms} ${t?.property_specs_rooms_unit || 'غرف'}</span></div></div>
            <div class="spec-item-detail"><i class="fas fa-bath"></i><div><span class="spec-label-detail">${t?.property_specs_bathrooms || 'الحمامات'}</span><span class="spec-value-detail">${p.bathrooms || '—'}</span></div></div>
            <div class="spec-item-detail"><i class="fas fa-layer-group"></i><div><span class="spec-label-detail">${t?.property_specs_floor || 'الطابق'}</span><span class="spec-value-detail">${p.floor === 0 ? (currentLanguage === 'ar' ? 'أرضي' : 'Ground') : p.floor}</span></div></div>
            <div class="spec-item-detail"><i class="fas fa-arrow-up"></i><div><span class="spec-label-detail">${t?.property_specs_elevator || 'مصعد'}</span><span class="spec-value-detail">${elevator}</span></div></div>
            <div class="spec-item-detail"><i class="fas fa-compass"></i><div><span class="spec-label-detail">${t?.property_specs_direction || 'الاتجاه'}</span><span class="spec-value-detail">${direction}</span></div></div>
            <div class="spec-item-detail"><i class="fas fa-paint-brush"></i><div><span class="spec-label-detail">${t?.property_specs_finishing || 'التشطيب'}</span><span class="spec-value-detail">${finishing}</span></div></div>
            <div class="spec-item-detail"><i class="fas fa-car"></i><div><span class="spec-label-detail">${t?.property_specs_parking || 'موقف السيارة'}</span><span class="spec-value-detail">${parking}</span></div></div>
            <div class="spec-item-detail"><i class="fas fa-file-contract"></i><div><span class="spec-label-detail">${t?.property_specs_ownership || 'سند الملكية'}</span><span class="spec-value-detail">${ownership}</span></div></div>
            <div class="spec-item-detail" style="background:${priceBg};border:${priceBorder}">
                <i class="fas fa-tag" style="color:${p.isPriceNumeric ? '#C9A84C' : '#e74c3c'}"></i>
                <div>
                    <span class="spec-label-detail">${t?.property_specs_price || 'السعر'}</span>
                    <span class="spec-value-detail" style="${priceStyle}">${priceDisplay}</span>
                </div>
            </div>
        `;
    }
    
    // الخريطة
    const mapDiv = document.getElementById('propModalMap');
    if (mapDiv) {
        const hasValidCoordinates = p.lat && p.lng && p.lat !== 0 && p.lng !== 0;
        
        if (hasValidCoordinates) {
            const lat = p.lat;
            const lng = p.lng;
            const locationName = encodeURIComponent(p.location || getLocalizedText(p, 'district') || 'موقع العقار');
            const t = translations[currentLanguage];
            
            mapDiv.innerHTML = `
                <div style="position:relative;width:100%;height:100%;min-height:200px;background:#f5f5f5;border-radius:12px;overflow:hidden;">
                    <iframe 
                        src="https://www.google.com/maps?q=${lat},${lng}&output=embed" 
                        width="100%" 
                        height="100%" 
                        style="border:0;min-height:250px;"
                        loading="lazy"
                        referrerpolicy="no-referrer-when-downgrade">
                    </iframe>
                    <button onclick="window.open('https://www.google.com/maps?q=${lat},${lng}', '_blank')" 
                            style="position:absolute;bottom:15px;left:50%;transform:translateX(-50%);
                                background:#C9A84C;color:#1A1410;border:none;
                                padding:12px 30px;border-radius:50px;font-size:16px;font-weight:700;
                                cursor:pointer;box-shadow:0 4px 15px rgba(201,168,76,0.4);
                                transition:all 0.3s ease;z-index:10;
                                display:flex;align-items:center;gap:10px;"
                            onmouseover="this.style.transform='translateX(-50%) scale(1.05)'" 
                            onmouseout="this.style.transform='translateX(-50%) scale(1)'">
                        <i class="fas fa-map-marked-alt"></i> 
                        <span>${currentLanguage === 'ar' ? 'فتح الموقع على خرائط جوجل' : 'Open in Google Maps'}</span>
                    </button>
                </div>
            `;
        } else {
            mapDiv.innerHTML = `
                <div style="background:#f8f8f8;border-radius:12px;padding:40px 20px;text-align:center;color:#999;border:1px dashed #ddd;">
                    <i class="fas fa-map-pin" style="font-size:40px;color:#C9A84C;display:block;margin-bottom:15px;"></i>
                    <p style="font-size:16px;font-weight:500;color:#666;">
                        ${currentLanguage === 'ar' ? '📍 لم يتم تحديد موقع هذا العقار على الخريطة' : '📍 Location not specified for this property'}
                    </p>
                    <p style="font-size:13px;color:#999;margin-top:8px;">
                        ${currentLanguage === 'ar' ? 'يمكنك التواصل معنا للحصول على الموقع الدقيق' : 'Contact us for the exact location'}
                    </p>
                </div>
            `;
        }
    }
    
    // عقارات مشابهة
    let similar = allProperties.filter(x => x.id !== id && x.type === p.type && x.available && Math.abs(x.price - p.price) <= (p.price * 0.3));
    if (similar.length < 3) {
        similar = [...similar, ...allProperties.filter(x => x.id !== id && x.type === p.type && x.available && !similar.includes(x))].slice(0, 3);
    }
    const suggDiv = document.getElementById('propSuggestions');
    if (suggDiv) {
        suggDiv.innerHTML = similar.length ? 
            similar.map(s => `<div class="suggestion-card" onclick="openPropertyModal('${s.id}')"><div class="s-title">${getLocalizedText(s, 'title')}</div><div class="s-price">${s.isPriceNumeric ? `${Number(s.price).toLocaleString()} ${s.currency}` : s.price}</div></div>`).join('') : 
            `<div>${t?.property_no_similar || 'لا توجد عقارات مشابهة'}</div>`;
    }
    
    document.getElementById('propertyModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    history.pushState({}, '', `${window.location.pathname}?id=${id}`);
}

function updateModalImage() {
    const img = document.getElementById('propModalImg');
    const counter = document.getElementById('imageCounter');
    if (currentPropertyImages.length) {
        if (img) img.src = currentPropertyImages[currentImageIndex];
        if (counter) counter.textContent = `${currentImageIndex + 1}/${currentPropertyImages.length}`;
    } else if (img) {
        img.src = DEFAULT_IMAGE;
    }
}

function nextPropImg() {
    if (currentPropertyImages.length) {
        currentImageIndex = (currentImageIndex + 1) % currentPropertyImages.length;
        updateModalImage();
    }
}

function prevPropImg() {
    if (currentPropertyImages.length) {
        currentImageIndex = (currentImageIndex - 1 + currentPropertyImages.length) % currentPropertyImages.length;
        updateModalImage();
    }
}

function closePropertyModal() {
    document.getElementById('propertyModal').classList.remove('active');
    document.body.style.overflow = '';
}


// ============================================================
// 12. دوال المشاركة والنسخ
// ============================================================

function shareProperty(id) {
    const p = allProperties.find(x => x.id === id);
    if (!p) return;
    const url = window.location.href.split('?')[0] + '?property=' + id;
    const priceDisplay = p.isPriceNumeric ? `${Number(p.price).toLocaleString()} ${p.currency}` : p.price;
    const text = `*${getLocalizedText(p, 'title')}*\n📍 ${getLocalizedText(p, 'district') || p.location}\n💰 ${priceDisplay}\n🔗 ${url}`;
    if (navigator.share) navigator.share({ title: getLocalizedText(p, 'title'), text: text });
    else { navigator.clipboard.writeText(url); showToast('✅ تم نسخ رابط العقار'); }
}

function shareFromModal() {
    if (currentPropertyId) shareProperty(currentPropertyId);
}

function copyPropertyLink() {
    if (!currentPropertyId) return;
    const url = `${window.location.origin}${window.location.pathname}?id=${currentPropertyId}`;
    navigator.clipboard.writeText(url);
    showToast('✅ تم نسخ رابط العقار', 'success');
}

// ============================================================
// 13. دوال Meta Tags
// ============================================================

function updateMetaTagsForProperty(property) {
    if (!property) return;
    const t = translations[currentLanguage];
    const title = getLocalizedText(property, 'title');
    const description = getLocalizedText(property, 'description');
    const price = property.isPriceNumeric ? 
        `${Number(property.price).toLocaleString()} ${property.currency}` : 
        property.price;
    const location = getLocalizedText(property, 'district') + ' - ' + getLocalizedText(property, 'city');
    const imageUrl = property.images && property.images[0] ? property.images[0] : DEFAULT_IMAGE;
    
    const fullTitle = currentLanguage === 'ar' ? `${title} | ${t.brand_ar}` : `${title} | ${t.brand_en}`;
    const fullDescription = currentLanguage === 'ar' ? `${description} | السعر: ${price} | الموقع: ${location}` : `${description} | Price: ${price} | Location: ${location}`;
    
    const tags = [
        ['property', 'og:title', fullTitle],
        ['property', 'og:description', fullDescription],
        ['property', 'og:image', imageUrl],
        ['name', 'twitter:title', fullTitle],
        ['name', 'twitter:description', fullDescription],
        ['name', 'twitter:image', imageUrl]
    ];
    
    tags.forEach(([attr, tag, content]) => {
        let meta = document.querySelector(`meta[${attr}="${tag}"]`);
        if (meta) meta.setAttribute('content', content);
    });
    
    document.title = fullTitle;
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = fullTitle;
}

function updateMetaTagsForLanguage() {
    const t = translations[currentLanguage];
    if (!t) return;
    document.title = t.site_title;
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = t.site_title;
    
    const metaDesc = document.getElementById('metaDescription');
    if (metaDesc) metaDesc.setAttribute('content', t.site_title);
    
    const ogTitle = document.getElementById('ogTitle');
    if (ogTitle) ogTitle.setAttribute('content', `${t.brand_ar} | ${t.brand_en}`);
    
    const ogSiteName = document.getElementById('ogSiteName');
    if (ogSiteName) ogSiteName.setAttribute('content', t.brand_ar);
    
    const ogDescription = document.getElementById('ogDescription');
    if (ogDescription) ogDescription.setAttribute('content', t.hero_description);
    
    const twitterTitle = document.getElementById('twitterTitle');
    if (twitterTitle) twitterTitle.setAttribute('content', `${t.brand_ar} | ${t.brand_en}`);
    
    const twitterDescription = document.getElementById('twitterDescription');
    if (twitterDescription) twitterDescription.setAttribute('content', t.hero_description);
}

// ============================================================
// 14. البحث الذكي
// ============================================================

const heroSearchInput = document.getElementById('heroSearchInput');
const heroSearchDropdown = document.getElementById('heroSearchDropdown');
const heroClearBtn = document.getElementById('heroClearSearchBtn');
let searchDebounceTimer;

function performSmartSearch(searchTerm) {
    if (!searchTerm || searchTerm.trim().length < 2) {
        if (heroSearchDropdown) heroSearchDropdown.style.display = 'none';
        return;
    }
    
    const term = searchTerm.trim().toLowerCase();
    
    const results = allProperties.filter(p => {
        // البحث في جميع الحقول المتاحة
        const searchableFields = [
            p.id,
            p.title_ar,
            p.title_en,
            p.description_ar,
            p.description_en,
            p.district_ar,
            p.district_en,
            p.governorate_ar,
            p.governorate_en,
            p.city_ar,
            p.city_en,
            p.location,
            p.ownership_ar,
            p.ownership_en,
            p.type, // sale / rent
            p.propertyType,
            p.currency,
            p.price ? String(p.price) : '',
            p.area ? String(p.area) : '',
            p.rooms ? String(p.rooms) : '',
            p.floor !== undefined ? String(p.floor) : '',
            p.available !== undefined ? (p.available ? 'متاح' : 'مباع') : '',
            p.available !== undefined ? (p.available ? 'available' : 'sold') : '',
        ];
        
        // إضافة مدة الإيجار إذا كانت موجودة
        if (p.rent_period) {
            searchableFields.push(p.rent_period);
            if (p.rent_period === 'month') {
                searchableFields.push('شهرياً', 'monthly');
            } else if (p.rent_period === 'year') {
                searchableFields.push('سنوياً', 'yearly');
            } else if (p.rent_period === 'week') {
                searchableFields.push('أسبوعياً', 'weekly');
            }
        }
        
        // إضافة نوع العملية باللغتين
        if (p.type === 'sale') {
            searchableFields.push('بيع', 'sale', 'للبيع', 'for sale');
        } else if (p.type === 'rent') {
            searchableFields.push('إيجار', 'rent', 'للإيجار', 'for rent');
        }
        
        // إضافة نوع العقار باللغتين
        const propertyTypes = {
            'apartment': ['شقة', 'apartment', 'شقّة'],
            'house': ['منزل', 'house', 'بيت'],
            'villa': ['فيلا', 'villa'],
            'shop': ['محل', 'shop', 'متجر', 'تجاري'],
            'building': ['بناء', 'building', 'عمارة'],
            'land': ['أرض', 'land']
        };
        if (p.propertyType && propertyTypes[p.propertyType]) {
            searchableFields.push(...propertyTypes[p.propertyType]);
        }
        
        // البحث في جميع الحقول
        return searchableFields.some(field => {
            if (!field) return false;
            return String(field).toLowerCase().includes(term);
        });
    }).slice(0, 8);
    
    if (!heroSearchDropdown) return;
    
    const t = translations[currentLanguage] || translations.ar;
    const noResultsText = currentLanguage === 'ar' ? 'لا توجد نتائج لـ "' : 'No results for "';
    const propertyTypes = {
        'apartment': currentLanguage === 'ar' ? 'شقة' : 'Apartment',
        'house': currentLanguage === 'ar' ? 'منزل' : 'House',
        'villa': currentLanguage === 'ar' ? 'فيلا' : 'Villa',
        'shop': currentLanguage === 'ar' ? 'محل تجاري' : 'Shop',
        'building': currentLanguage === 'ar' ? 'بناء' : 'Building',
        'land': currentLanguage === 'ar' ? 'أرض' : 'Land'
    };
    
    if (results.length === 0) {
        heroSearchDropdown.innerHTML = `<div class="hero-result-item" style="justify-content: center; color: var(--gray);"><i class="fas fa-search"></i> ${noResultsText}${searchTerm}"</div>`;
        heroSearchDropdown.style.display = 'block';
        return;
    }
    
    heroSearchDropdown.innerHTML = results.map(p => {
        const img = p.images && p.images.length ? p.images[0] : DEFAULT_IMAGE;
        const title = getLocalizedText(p, 'title');
        const location = getLocalizedText(p, 'district') || p.district || p.location;
        const priceDisplay = p.isPriceNumeric ? `${Number(p.price).toLocaleString()} ${p.currency}` : p.price;
        const typeLabel = p.type === 'sale' ? 
            (currentLanguage === 'ar' ? '🏷️ للبيع' : '🏷️ For Sale') : 
            (currentLanguage === 'ar' ? '🔑 للإيجار' : '🔑 For Rent');
        const propertyType = propertyTypes[p.propertyType] || p.propertyType;
        const ownership = getLocalizedText(p, 'ownership') || p.ownership_ar || p.ownership_en || '';
        
        return `<div class="hero-result-item" onclick="selectPropertyFromSearch('${p.id}')">
            <img src="${img}" class="hero-result-image" alt="${title}">
            <div class="hero-result-info">
                <div class="hero-result-title">${title}</div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:2px;">
                    <span class="hero-result-code">${p.id}</span>
                    <span class="hero-result-type">${typeLabel}</span>
                    ${propertyType ? `<span class="hero-result-type">${propertyType}</span>` : ''}
                </div>
                <div class="hero-result-location"><i class="fas fa-map-marker-alt"></i> ${location}</div>
                ${ownership ? `<div class="hero-result-ownership"><i class="fas fa-file-contract"></i> ${ownership}</div>` : ''}
            </div>
            <div class="hero-result-price">${priceDisplay}</div>
        </div>`;
    }).join('');
    
    heroSearchDropdown.style.display = 'block';
    ensureDropdownAboveAll();
}

function ensureDropdownAboveAll() {
    const dropdown = document.getElementById('heroSearchDropdown');
    const wrapper = document.querySelector('.hero-search-wrapper');
    
    if (dropdown) {
        // إزالة أي تنسيقات سابقة
        dropdown.style.position = '';
        dropdown.style.top = '';
        dropdown.style.left = '';
        dropdown.style.width = '';
        dropdown.style.zIndex = '';
        dropdown.style.backgroundColor = '';
        dropdown.style.transform = '';
        
        // التأكد من أن القائمة فوق كل شيء
        dropdown.style.zIndex = '999999';
    }
    
    if (wrapper) {
        wrapper.style.position = 'relative';
        wrapper.style.zIndex = '999999';
        wrapper.style.overflow = 'visible';
    }
}

function selectPropertyFromSearch(propertyId) {
    if (heroSearchDropdown) heroSearchDropdown.style.display = 'none';
    if (heroSearchInput) heroSearchInput.value = '';
    if (heroClearBtn) heroClearBtn.style.display = 'none';
    openPropertyModal(propertyId);
    setTimeout(() => {
        const propertiesSection = document.getElementById('properties');
        if (propertiesSection) propertiesSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// ربط البحث الذكي
if (heroSearchInput) {
    heroSearchInput.addEventListener('input', (e) => {
        const value = e.target.value;
        if (heroClearBtn) heroClearBtn.style.display = value.length > 0 ? 'flex' : 'none';
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => performSmartSearch(value), 300);
    });
    
    document.addEventListener('click', (e) => {
        if (heroSearchInput && !heroSearchInput.contains(e.target) && 
            heroSearchDropdown && !heroSearchDropdown.contains(e.target)) {
            heroSearchDropdown.style.display = 'none';
        }
    });
    
    heroSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && heroSearchInput.value.trim().length >= 2) {
            const term = heroSearchInput.value.trim().toLowerCase();
            const results = allProperties.filter(p => {
                const title = getLocalizedText(p, 'title');
                return title.toLowerCase().includes(term) || p.id.toLowerCase().includes(term);
            });
            if (results.length > 0) {
                selectPropertyFromSearch(results[0].id);
            } else {
                showToast(currentLanguage === 'ar' ? '❌ لا توجد نتائج' : '❌ No results found', 'error');
            }
        }
    });
}

if (heroClearBtn) {
    heroClearBtn.addEventListener('click', () => {
        if (heroSearchInput) heroSearchInput.value = '';
        heroClearBtn.style.display = 'none';
        if (heroSearchDropdown) heroSearchDropdown.style.display = 'none';
        if (heroSearchInput) heroSearchInput.focus();
    });
}

// ============================================================
// 15. دوال أخرى
// ============================================================

function getRentPeriodText(period) {
    if (currentLanguage === 'ar') {
        switch(period) {
            case 'month': return 'شهرياً';
            case 'year': return 'سنوياً';
            case 'week': return 'أسبوعياً';
            default: return 'شهرياً';
        }
    } else {
        switch(period) {
            case 'month': return 'per month';
            case 'year': return 'per year';
            case 'week': return 'per week';
            default: return 'per month';
        }
    }
}

function getLocalizedText(property, field) {
    const lang = currentLanguage;
    if (lang === 'ar') {
        return property[field + '_ar'] || property[field] || '';
    } else {
        return property[field + '_en'] || property[field] || '';
    }
}

function formatNumber(num) {
    return new Intl.NumberFormat('ar-SY').format(num);
}

function formatDate(dateString) {
    if (!dateString) return currentLanguage === 'ar' ? 'تاريخ غير محدد' : 'Unknown date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return currentLanguage === 'ar' ? 'تاريخ غير محدد' : 'Unknown date';
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (currentLanguage === 'ar') {
        if (diffDays === 0) return 'اليوم';
        if (diffDays === 1) return 'أمس';
        if (diffDays < 7) return `منذ ${diffDays} أيام`;
        if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
        if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`;
        return `منذ ${Math.floor(diffDays / 365)} سنوات`;
    } else {
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    }
}

function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.background = type === 'success' ? '#27ae60' : '#e74c3c';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setFilter(type, value) {
    if (type === 'propType') document.getElementById('filterPropType').value = value;
    filterProperties();
    document.getElementById('properties').scrollIntoView({ behavior: 'smooth' });
}

function toggleHideSold() {
    hideSoldActive = !hideSoldActive;
    const btn = document.getElementById('hideSoldBtn');
    const t = translations[currentLanguage];
    if (hideSoldActive) {
        btn.style.background = '#27ae60';
        btn.innerHTML = `<i class="fas fa-eye"></i> <span>${t?.btn_show_all || 'إظهار الكل'}</span>`;
        showToast('🔒 تم إخفاء العقارات المباعة', 'info');
    } else {
        btn.style.background = '#9b59b6';
        btn.innerHTML = `<i class="fas fa-eye-slash"></i> <span>${t?.btn_hide_sold || 'إخفاء المباعة'}</span>`;
        showToast('🔓 تم إظهار جميع العقارات', 'info');
    }
    filterProperties();
}

// ============================================================
// 16. سياسة الخصوصية
// ============================================================

function openPrivacyModal() {
    const modal = document.getElementById('privacyModal');
    if (modal) modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePrivacyModal() {
    const modal = document.getElementById('privacyModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

function updatePrivacyConsentStatus() {
    const checkbox = document.getElementById('privacyConsentCheckbox');
    if (checkbox) localStorage.setItem('privacy_consent', checkbox.checked);
}

function loadPrivacyConsent() {
    const saved = localStorage.getItem('privacy_consent');
    if (saved !== null) {
        const checkbox = document.getElementById('privacyConsentCheckbox');
        if (checkbox) checkbox.checked = saved === 'true';
    }
}

// ============================================================
// 17. دوال التحميل والتشغيل
// ============================================================

// جلب البيانات من Google Sheets
async function loadProperties() {
    showToast('جاري تحميل العقارات...', 'info');
    try {
        const response = await fetch(CONFIG.API_URL);
        const data = await response.json();
        console.log(`📊 تم استلام ${data ? data.length : 0} عقار من الخادم`);
        
        if (data && data.length > 0) {
            allProperties = data.map(row => {
                // ===== معالجة الصور =====
                let imagesArray = [];
                if (row.images) {
                    if (Array.isArray(row.images)) imagesArray = row.images;
                    else if (typeof row.images === 'string' && row.images.trim()) {
                        imagesArray = row.images.split(',').map(s => s.trim()).filter(s => s !== '');
                    }
                }
                // ✅ إذا لم توجد صور، استخدم شعار الموقع
                if (imagesArray.length === 0) {
                    imagesArray = [DEFAULT_IMAGE];
                }
                
                const isAvailable = row.available === true || row.available === 'TRUE' || row.available === 'true' || row.available === 1 || row.available === '1';
                
                return {
                    id: row.id || 'KH-000',
                    title_ar: row.title_ar || row.title || 'بدون عنوان',
                    description_ar: row.description_ar || row.description || 'لا يوجد وصف',
                    city_ar: row.city_ar || row.city || 'دمشق',
                    governorate_ar: row.governorate_ar || row.governorate || 'دمشق',
                    district_ar: row.district_ar || row.district || 'غير محدد',
                    finishing_ar: row.finishing_ar || row.finishing || 'عادي',
                    ownership_ar: row.ownership_ar || row.ownership || 'غير محدد',
                    direction_ar: row.direction_ar || row.direction || 'غير محدد',
                    elevator_ar: row.elevator_ar || row.elevator || 'لا',
                    parking_ar: row.parking_ar || row.parking || 'لا',
                    title_en: row.title_en || row.title || 'No title',
                    description_en: row.description_en || row.description || 'No description',
                    city_en: row.city_en || row.city || 'Damascus',
                    governorate_en: row.governorate_en || row.governorate || 'Damascus',
                    district_en: row.district_en || row.district || 'Not specified',
                    finishing_en: row.finishing_en || row.finishing || 'Normal',
                    ownership_en: row.ownership_en || row.ownership || 'Not specified',
                    direction_en: row.direction_en || row.direction || 'Not specified',
                    elevator_en: row.elevator_en || row.elevator || 'No',
                    parking_en: row.parking_en || row.parking || 'No',
                    added_date: row.added_date || null,
                    type: row.type || 'sale',
                    propertyType: row.property_type || 'apartment',
                    price: row.price,
                    isPriceNumeric: !isNaN(Number(row.price)) && row.price !== '' && row.price !== null,
                    currency: row.currency || '$',
                    rent_period: row.rent_period || 'month',
                    area: Number(row.area) || 0,
                    rooms: Number(row.rooms) || 0,
                    bathrooms: Number(row.bathrooms) || 0,
                    floor: row.floor === 'أرضي' ? 0 : Number(row.floor) || 0,
                    location: row.location || 'موقع غير محدد',
                    lat: Number(row.latitude) || 0,
                    lng: Number(row.longitude) || 0,
                    images: imagesArray,
                    available: isAvailable,
                    views: Number(row.views) || 0,
                    featured: row.featured || 'no',
                    favCount: Number(row.fav_count) || 0
                };
            });

            console.log('📊 تم تحميل العقارات:');
            allProperties.forEach(p => {
                console.log(`${p.id}: price=${p.price}, isPriceNumeric=${p.isPriceNumeric}, type=${p.type}`);
            });
            
            allProperties.sort((a, b) => {
                if (a.featured === 'yes' && b.featured !== 'yes') return -1;
                if (a.featured !== 'yes' && b.featured === 'yes') return 1;
                return 0;
            });
            
            localStorage.setItem('kh_properties', JSON.stringify(allProperties));
            
            const availableCount = allProperties.filter(p => p.available).length;
            const soldCount = allProperties.filter(p => !p.available).length;
            console.log(`✅ تم تحميل ${allProperties.length} عقار (${availableCount} متاح, ${soldCount} مباع)`);
            showToast(`✅ تم تحميل ${allProperties.length} عقار`, 'success');
            
            // ✅ تسجيل زائر جديد (بعد تحميل العقارات)
            incrementVisitorCount();
        } else {
            throw new Error('لا توجد بيانات');
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        showToast('❌ لا توجد بيانات، يرجى إضافة عقارات', 'error');
        allProperties = [];
        forceHideLoader();
    }
    
    filteredProperties = [...allProperties];
    currentItemCount = CONFIG.ITEMS_PER_PAGE;
    renderProperties();
    updateResultsCount();
    await initStats();
    if (allProperties.length > 0) {
        populateGovernorateFilter();
        populateDistrictFilter();
        refreshAllFilters();
    }
    updatePageTexts(); 
    forceHideLoader();
}

// تحديث البيانات (مع مهلة 5 دقائق)
let lastRefreshTime = 0;
const REFRESH_INTERVAL = 5 * 60 * 1000;

async function refreshProperties() {
    const now = Date.now();
    if (now - lastRefreshTime < REFRESH_INTERVAL) {
        const remaining = Math.ceil((REFRESH_INTERVAL - (now - lastRefreshTime)) / 1000);
        showToast(`⌛ ${currentLanguage === 'ar' ? 'يرجى الانتظار' : 'Please wait'} ${remaining} ${currentLanguage === 'ar' ? 'ثانية' : 'seconds'}`, 'info');
        return;
    }
    lastRefreshTime = now;
    showToast(currentLanguage === 'ar' ? '🔄 جاري تحديث البيانات...' : '🔄 Refreshing...', 'info');
    
    try {
        const response = await fetch(CONFIG.API_URL);
        const data = await response.json();
        if (data && data.length > 0) {
            allProperties = data.map(row => {
                // معالجة الصور
                let imagesArray = [];
                if (row.images) {
                    if (Array.isArray(row.images)) imagesArray = row.images;
                    else if (typeof row.images === 'string' && row.images.trim()) {
                        imagesArray = row.images.split(',').map(s => s.trim()).filter(s => s !== '');
                    }
                }
                // إذا لم توجد صور، استخدم الشعار الافتراضي
                if (imagesArray.length === 0) {
                    imagesArray = [DEFAULT_IMAGE];
                }
                const isAvailable = row.available === true || row.available === 'TRUE' || row.available === 'true' || row.available === 1 || row.available === '1';
                
                return {
                    id: row.id || 'KH-000',
                    title_ar: row.title_ar || row.title || 'بدون عنوان',
                    description_ar: row.description_ar || row.description || 'لا يوجد وصف',
                    city_ar: row.city_ar || row.city || 'دمشق',
                    governorate_ar: row.governorate_ar || row.governorate || 'دمشق',
                    district_ar: row.district_ar || row.district || 'غير محدد',
                    finishing_ar: row.finishing_ar || row.finishing || 'عادي',
                    ownership_ar: row.ownership_ar || row.ownership || 'غير محدد',
                    direction_ar: row.direction_ar || row.direction || 'غير محدد',
                    elevator_ar: row.elevator_ar || row.elevator || 'لا',
                    parking_ar: row.parking_ar || row.parking || 'لا',
                    title_en: row.title_en || row.title || 'No title',
                    description_en: row.description_en || row.description || 'No description',
                    city_en: row.city_en || row.city || 'Damascus',
                    governorate_en: row.governorate_en || row.governorate || 'Damascus',
                    district_en: row.district_en || row.district || 'Not specified',
                    finishing_en: row.finishing_en || row.finishing || 'Normal',
                    ownership_en: row.ownership_en || row.ownership || 'Not specified',
                    direction_en: row.direction_en || row.direction || 'Not specified',
                    elevator_en: row.elevator_en || row.elevator || 'No',
                    parking_en: row.parking_en || row.parking || 'No',
                    added_date: row.added_date || null,
                    type: row.type || 'sale',
                    propertyType: row.property_type || 'apartment',
                    price: row.price,
                    isPriceNumeric: !isNaN(Number(row.price)) && row.price !== '' && row.price !== null,
                    currency: row.currency || '$',
                    rent_period: row.rent_period || 'month',
                    area: Number(row.area) || 0,
                    rooms: Number(row.rooms) || 0,
                    bathrooms: Number(row.bathrooms) || 0,
                    floor: row.floor === 'أرضي' ? 0 : Number(row.floor) || 0,
                    location: row.location || 'موقع غير محدد',
                    lat: Number(row.latitude) || 0,
                    lng: Number(row.longitude) || 0,
                    images: imagesArray,
                    available: isAvailable,
                    views: Number(row.views) || 0,
                    featured: row.featured || 'no',
                    favCount: Number(row.fav_count) || 0
                };
            });
            
            allProperties.sort((a, b) => {
                if (a.featured === 'yes' && b.featured !== 'yes') return -1;
                if (a.featured !== 'yes' && b.featured === 'yes') return 1;
                return 0;
            });
            
            localStorage.setItem('kh_properties', JSON.stringify(allProperties));
            filteredProperties = [...allProperties];
            currentItemCount = CONFIG.ITEMS_PER_PAGE;
            
            document.getElementById('filterType').value = '';
            document.getElementById('filterPropType').value = '';
            document.getElementById('filterFloor').value = '';
            document.getElementById('filterRooms').value = '';
            document.getElementById('filterSalePrice').value = '';
            document.getElementById('filterRentPrice').value = '';
            document.getElementById('filterCode').value = '';
            document.getElementById('filterGovernorate').value = '';
            
            const districtSelect = document.getElementById('filterDistrict');
            districtSelect.innerHTML = `<option value="">${currentLanguage === 'ar' ? 'كل المناطق' : 'All Districts'}</option>`;
            districtSelect.disabled = true;
            
            if (hideSoldActive) {
                hideSoldActive = false;
                const hideBtn = document.getElementById('hideSoldBtn');
                if (hideBtn) {
                    hideBtn.style.background = '#9b59b6';
                    hideBtn.innerHTML = `<i class="fas fa-eye-slash"></i> <span>${currentLanguage === 'ar' ? 'إخفاء المباعة' : 'Hide Sold'}</span>`;
                }
            }
            
            populateGovernorateFilter();
            populateDistrictFilter();
            renderProperties();
            updateResultsCount();
            await initStats();
            updatePageTexts();
            
            const availableCount = allProperties.filter(p => p.available).length;
            const soldCount = allProperties.filter(p => !p.available).length;
            showToast(currentLanguage === 'ar' ? `✅ تم التحديث: ${allProperties.length} عقار (${availableCount} متاح, ${soldCount} مباع)` : `✅ Updated: ${allProperties.length} properties (${availableCount} available, ${soldCount} sold)`, 'success');
            console.log(`✅ تم تحديث البيانات: ${allProperties.length} عقار`);
        } else {
            throw new Error(currentLanguage === 'ar' ? 'لا توجد بيانات' : 'No data');
        }
    } catch (error) {
        console.error('❌ خطأ في التحديث:', error);
        showToast(currentLanguage === 'ar' ? '❌ فشل التحديث، يرجى المحاولة لاحقاً' : '❌ Update failed, please try again later', 'error');
        lastRefreshTime = 0;
    }
}

// ============================================================
// 18. التهيئة والتشغيل
// ============================================================

function initHeader() {
    window.addEventListener('scroll', () => {
        document.getElementById('mainHeader')?.classList.toggle('scrolled', window.scrollY > 50);
    });
}

function initHamburger() {
    const btn = document.getElementById('hamburger');
    const nav = document.getElementById('mainNav');
    if (btn && nav) {
        btn.addEventListener('click', () => nav.classList.toggle('mobile-open'));
    }
}

function initFiltersToggle() {
    const btn = document.getElementById('filtersToggleBtn');
    const wrap = document.getElementById('filtersWrapper');
    if (btn && wrap) {
        btn.addEventListener('click', () => wrap.classList.toggle('show'));
    }
}

function initScrollTop() {
    const btn = document.getElementById('scrollTopBtn');
    if (btn) {
        window.addEventListener('scroll', () => btn.classList.toggle('show', window.scrollY > 300));
    }
}

function getPropertyIdFromURL() {
    return new URLSearchParams(window.location.search).get('id');
}

function autoOpenPropertyFromURL() {
    const propertyId = getPropertyIdFromURL();
    if (propertyId) {
        setTimeout(() => {
            const property = allProperties.find(p => p.id === propertyId);
            if (property) {
                openPropertyModal(propertyId);
                showToast(`🔗 تم فتح العقار: ${getLocalizedText(property, 'title')}`, 'success');
            } else {
                history.pushState({}, '', window.location.pathname);
            }
        }, 500);
    }
}

function hideLoader() {
    const loader = document.getElementById('preloader');
    if (!loader) return;
    setTimeout(() => {
        loader.classList.add('fade-out');
        setTimeout(() => {
            loader.style.display = 'none';
            console.log('✅ تم إخفاء شاشة التحميل');
        }, 500);
    }, 300);
}

function forceHideLoader() {
    const loader = document.getElementById('preloader');
    if (loader && loader.style.display !== 'none') {
        loader.classList.add('fade-out');
        setTimeout(() => { loader.style.display = 'none'; }, 500);
    }
}

// تحديث الإحصائيات كل 10 دقائق
setInterval(autoRefreshStats, 6000000);

// بدء التشغيل
document.addEventListener('DOMContentLoaded', async () => {
    initHeader();
    initHamburger();
    initFiltersToggle();
    initScrollTop();
    loadFavorites();
    populatePhoneCountrySelect();
    await loadProperties();
    setLanguage(currentLanguage);
    bindFilters();
    autoOpenPropertyFromURL();
    loadPrivacyConsent();
    
    const consentCheckbox = document.getElementById('privacyConsentCheckbox');
    if (consentCheckbox) {
        consentCheckbox.addEventListener('change', updatePrivacyConsentStatus);
    }
    
    hideLoader();
    setTimeout(forceHideLoader, 3000);
});

// ============================================================
// نسخ رقم واتساب بعد تسجيل العميل
// ============================================================

function copyWhatsAppNumber() {
    const phoneNumber = '+963 932 168 293';
    
    // نسخ الرقم إلى الحافظة
    navigator.clipboard.writeText(phoneNumber).then(() => {
        showToast('✅ تم نسخ رقم واتساب: ' + phoneNumber, 'success');
    }).catch(() => {
        // في حال فشل النسخ، استخدم الطريقة البديلة
        const textarea = document.createElement('textarea');
        textarea.value = phoneNumber;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('✅ تم نسخ رقم واتساب: ' + phoneNumber, 'success');
        } catch (e) {
            showToast('❌ فشل النسخ، يرجى نسخ الرقم يدوياً: ' + phoneNumber, 'error');
        }
        document.body.removeChild(textarea);
    });
}

// ============================================================
// 19. تعريف الدوال العامة
// ============================================================

// ============================================================
// إضافة عقار جديد (طلب)
// ============================================================

// فتح نموذج إضافة العقار
function openAddPropertyModal() {
    const modal = document.getElementById('addPropertyModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// إغلاق نموذج إضافة العقار
function closeAddPropertyModal() {
    const modal = document.getElementById('addPropertyModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============================================================
// رفع الصور (سحب وإفلات)
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('propertyImagesInput');
    const imagePreview = document.getElementById('imagePreview');
    const imagesHidden = document.getElementById('propertyImages');
    let uploadedImages = [];

    // فتح نافذة اختيار الملفات عند الضغط على المنطقة
    dropZone.addEventListener('click', function() {
        fileInput.click();
    });

    // عند اختيار ملفات
    fileInput.addEventListener('change', function(e) {
        const files = e.target.files;
        handleFiles(files);
    });

    // سحب وإفلات
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary)';
        dropZone.style.background = 'rgba(201,168,76,0.1)';
    });

    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropZone.style.borderColor = '#ddd';
        dropZone.style.background = '#fafafa';
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.style.borderColor = '#ddd';
        dropZone.style.background = '#fafafa';
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    function handleFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) continue;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgData = e.target.result;
                uploadedImages.push(imgData);
                
                // عرض الصورة المصغرة
                const imgWrapper = document.createElement('div');
                imgWrapper.style.position = 'relative';
                imgWrapper.style.width = '80px';
                imgWrapper.style.height = '80px';
                imgWrapper.style.borderRadius = '8px';
                imgWrapper.style.overflow = 'hidden';
                imgWrapper.style.border = '1px solid #ddd';
                
                const img = document.createElement('img');
                img.src = imgData;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                
                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '×';
                removeBtn.style.position = 'absolute';
                removeBtn.style.top = '2px';
                removeBtn.style.right = '2px';
                removeBtn.style.background = 'rgba(231,76,60,0.9)';
                removeBtn.style.color = 'white';
                removeBtn.style.border = 'none';
                removeBtn.style.borderRadius = '50%';
                removeBtn.style.width = '22px';
                removeBtn.style.height = '22px';
                removeBtn.style.cursor = 'pointer';
                removeBtn.style.fontSize = '14px';
                removeBtn.style.display = 'flex';
                removeBtn.style.alignItems = 'center';
                removeBtn.style.justifyContent = 'center';
                
                removeBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const index = uploadedImages.indexOf(imgData);
                    if (index > -1) {
                        uploadedImages.splice(index, 1);
                    }
                    imgWrapper.remove();
                    updateHiddenImages();
                });
                
                imgWrapper.appendChild(img);
                imgWrapper.appendChild(removeBtn);
                imagePreview.appendChild(imgWrapper);
                
                updateHiddenImages();
            };
            reader.readAsDataURL(file);
        }
    }

    function updateHiddenImages() {
        imagesHidden.value = uploadedImages.join(',');
    }
});

// إرسال طلب إضافة العقار إلى Google Sheets
function submitAddProperty(event) {
    event.preventDefault();
    
    const ownerName = document.getElementById('ownerName')?.value.trim() || '';
    const ownerPhone = document.getElementById('ownerPhone')?.value.trim() || '';
    const title = document.getElementById('propertyTitle')?.value.trim() || '';
    const price = document.getElementById('propertyPrice')?.value.trim() || '';
    const type = document.getElementById('propertyType')?.value || '';
    const area = document.getElementById('propertyArea')?.value.trim() || '';
    const governorate = document.getElementById('propertyGovernorate')?.value || '';
    const district = document.getElementById('propertyDistrict')?.value.trim() || '';
    const ownership = document.getElementById('propertyOwnership')?.value || '';
    const rooms = document.getElementById('propertyRooms')?.value.trim() || '';
    const bathrooms = document.getElementById('propertyBathrooms')?.value.trim() || '';
    const finishing = document.getElementById('propertyFinishing')?.value || '';
    const description = document.getElementById('propertyDescription')?.value.trim() || '';
    const images = document.getElementById('propertyImages')?.value || '';
    const mapLink = document.getElementById('propertyMap')?.value.trim() || '';
    
    if (!ownerName || !ownerPhone || !title || !price || !type || !area || !governorate || !district || !ownership) {
        showToast('❌ يرجى تعبئة جميع الحقول المطلوبة', 'error');
        return;
    }
    
    const message = encodeURIComponent(
        `📋 طلب إضافة عقار جديد\n\n` +
        `👤 المالك: ${ownerName}\n` +
        `📞 الهاتف: ${ownerPhone}\n\n` +
        `🏠 عنوان العقار: ${title}\n` +
        `💰 السعر: ${price}\n` +
        `🏗️ النوع: ${type}\n` +
        `📐 المساحة: ${area} م²\n` +
        `📍 المحافظة: ${governorate}\n` +
        `📍 المنطقة: ${district}\n` +
        `📄 نوع الملكية: ${ownership}\n` +
        `🛏️ الغرف: ${rooms || 'غير محدد'}\n` +
        `🚿 الحمامات: ${bathrooms || 'غير محدد'}\n` +
        `🔧 التشطيب: ${finishing || 'غير محدد'}\n` +
        `📝 الوصف: ${description || 'لا يوجد'}\n` +
        `🖼️ الصور: ${images ? 'تم رفع ' + images.split(',').length + ' صورة' : 'لا توجد'}\n` +
        `🗺️ رابط الخريطة: ${mapLink || 'لا يوجد'}`
    );
    
    const whatsappUrl = `https://wa.me/${CONFIG.WHATSAPP}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    
    closeAddPropertyModal();
    document.getElementById('addPropertyForm')?.reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('propertyImages').value = '';
    
    showToast('✅ تم إرسال طلبك بنجاح، سنتواصل معك قريباً', 'success');
}

// ============================================================
// إغلاق المودالات عند الضغط خارجها
// ============================================================

// إغلاق مودال التواصل عند الضغط على الخلفية
document.getElementById('contactModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeContactModal();
    }
});

// إغلاق مودال تفاصيل العقار عند الضغط على الخلفية
document.getElementById('propertyModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closePropertyModal();
    }
});

// إغلاق مودال سياسة الخصوصية عند الضغط على الخلفية
document.getElementById('privacyModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closePrivacyModal();
    }
});

// إغلاق مودال إضافة عقار عند الضغط على الخلفية
document.getElementById('addPropertyModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeAddPropertyModal();
    }
});

// ============================================================
// نسخ رقم الهاتف من مودال التواصل
// ============================================================

function copyContactPhone() {
    const phoneNumber = '+963 932 168 293';
    const btn = document.querySelector('.copy-phone-btn');
    
    navigator.clipboard.writeText(phoneNumber).then(() => {
        // تغيير مظهر الزر مؤقتاً
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> تم النسخ';
        btn.classList.add('copied');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('copied');
        }, 2000);
        
        showToast('✅ تم نسخ رقم الهاتف: ' + phoneNumber, 'success');
    }).catch(() => {
        // طريقة بديلة للنسخ
        const textarea = document.createElement('textarea');
        textarea.value = phoneNumber;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('✅ تم نسخ رقم الهاتف: ' + phoneNumber, 'success');
        } catch (e) {
            showToast('❌ فشل النسخ، يرجى نسخ الرقم يدوياً', 'error');
        }
        document.body.removeChild(textarea);
    });
}

window.filterProperties = filterProperties;
window.resetFilters = resetFilters;
window.openPropertyModal = openPropertyModal;
window.closePropertyModal = closePropertyModal;
window.openContactModal = openContactModal;
window.closeContactModal = closeContactModal;
window.submitContactRequest = submitContactRequest;
window.shareProperty = shareProperty;
window.shareFromModal = shareFromModal;
window.nextPropImg = nextPropImg;
window.prevPropImg = prevPropImg;
window.loadMoreProperties = loadMoreProperties;
window.setFilter = setFilter;
window.scrollToTop = scrollToTop;
window.contactFromProperty = contactFromProperty;
window.toggleFavoriteCard = toggleFavoriteCard;
window.showFavoritesOnly = showFavoritesOnly;
window.showAllProperties = showAllProperties;
window.refreshProperties = refreshProperties;
window.toggleFavoriteFromModal = toggleFavoriteFromModal;
window.openPrivacyModal = openPrivacyModal;
window.closePrivacyModal = closePrivacyModal;
window.selectPropertyFromSearch = selectPropertyFromSearch;
window.toggleHideSold = toggleHideSold;
window.copyPropertyLink = copyPropertyLink;
window.setLanguage = setLanguage;
window.openAddPropertyModal = openAddPropertyModal;
window.closeAddPropertyModal = closeAddPropertyModal;
window.filterProperties = filterProperties;
window.submitAddProperty = submitAddProperty;
window.copyContactPhone = copyContactPhone;