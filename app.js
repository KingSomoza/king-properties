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

const DEFAULT_IMAGE = 'https://res.cloudinary.com/kingsomoza/image/upload/v1783195143/king-propertis-logo-removebg-preview_t5hses.png';

// ============================================================
// إعدادات Cloudinary
// ============================================================

const CLOUDINARY_CONFIG = {
    cloudName: 'kingsomoza', // ✅ استبدل بـ Cloud Name الخاص بك
    uploadPreset: 'king_properties' // ✅ استبدل بـ Upload Preset الخاص بك
};

// ============================================================
// رفع الصور إلى Cloudinary - مع تنظيم المجلدات
// ============================================================

async function uploadImageToCloudinary(file, propertyId = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    
    // ✅ إضافة مجلد بناءً على معرف العقار (إذا كان موجوداً)
    if (propertyId) {
        // استخدام معرف العقار كاسم للمجلد
        const folderName = `properties/${propertyId}`;
        formData.append('folder', folderName);
        console.log(`📁 رفع الصورة إلى المجلد: ${folderName}`);
    } else {
        // إذا لم يكن هناك معرف، استخدم مجلد مؤقت
        formData.append('folder', 'properties/temp');
    }
    
    try {
        let attempts = 0;
        const maxAttempts = 3;
        let lastError = null;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
                    method: 'POST',
                    body: formData,
                    mode: 'cors'
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                if (data.secure_url) {
                    console.log(`✅ تم رفع الصورة بنجاح: ${data.secure_url}`);
                    return data.secure_url;
                } else {
                    throw new Error('لم يتم استلام رابط الصورة');
                }
            } catch (err) {
                lastError = err;
                console.warn(`⚠️ محاولة ${attempts}/${maxAttempts} فشلت:`, err.message);
                
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, attempts * 1000));
                }
            }
        }

        console.error('❌ فشل رفع الصورة بعد', maxAttempts, 'محاولات:', lastError);
        showToast(`❌ فشل رفع الصورة: ${lastError?.message || 'حاول مرة أخرى'}`, 'error');
        return null;

    } catch (error) {
        console.error('❌ خطأ غير متوقع في رفع الصورة:', error);
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
    
    // في updatePageTexts، عند تحديث heroStatLabels
    const heroStatLabels = document.querySelectorAll('.hero-stats .stat-label');
    if (heroStatLabels.length >= 3) {
        heroStatLabels[0].innerText = t.hero_available_label;
        heroStatLabels[1].innerText = t.hero_sold_label;
        heroStatLabels[2].innerText = t.hero_visitors_label; // هذا سيصبح "إجمالي الزوار"
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
    
    // ترجمة فلتر مدة الإيجار - دعم جميع الصيغ
    const rentPeriodSelect = document.getElementById('filterRentPeriod');
    if (rentPeriodSelect) {
        const selectedValue = rentPeriodSelect.value;
        // إعادة تعيين الخيارات مع دعم جميع الصيغ
        rentPeriodSelect.innerHTML = `
            <option value="">${currentLanguage === 'ar' ? 'الكل' : 'All'}</option>
            <option value="monthly">${currentLanguage === 'ar' ? 'شهرياً' : 'Monthly'}</option>
            <option value="yearly">${currentLanguage === 'ar' ? 'سنوياً' : 'Yearly'}</option>
            <option value="weekly">${currentLanguage === 'ar' ? 'أسبوعياً' : 'Weekly'}</option>
            <option value="daily">${currentLanguage === 'ar' ? 'يومياً' : 'Daily'}</option>
        `;
        // استعادة القيمة المحددة إذا كانت موجودة
        if (selectedValue && ['monthly', 'yearly', 'weekly', 'daily'].includes(selectedValue)) {
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
        
        // 2. فلتر مدة الإيجار - دعم جميع الصيغ
        if (rentPeriod) {
            // التحقق من أن العقار للإيجار
            if (p.type !== 'rent') return false;
            // تحويل قيم العقار والفلتر إلى حروف صغيرة للمقارنة
            const propertyPeriod = String(p.rent_period || '').toLowerCase().trim();
            const filterPeriod = String(rentPeriod).toLowerCase().trim();
            if (propertyPeriod !== filterPeriod) return false;
        }
        
        // 3. فلتر السعر (للبيع) - يطبق فقط إذا تم اختيار فلتر سعر البيع
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
        
        // 4. فلتر السعر (للإيجار) - يطبق فقط إذا تم اختيار فلتر سعر الإيجار
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
        showToast(currentLanguage === 'ar' ? 'لا توجد عقارات تطابق معايير البحث' : 'No properties match your search criteria', 'error');
    } else {
        showToast(`✅ ${currentLanguage === 'ar' ? 'تم العثور على' : 'Found'} ${filteredProperties.length} ${currentLanguage === 'ar' ? 'عقار' : 'properties'}`, 'success');
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
    
    // ✅ تحديد إذا كان العنصر الأول فيديو
    const firstMedia = imagesArray[0] || DEFAULT_IMAGE;
    const isFirstVideo = isVideoUrl(firstMedia);
    
    // ✅ بناء عنصر الوسائط المناسب
    let mediaHtml = '';
    if (isFirstVideo) {
        // ✅ عرض صورة ثابتة (بوستر) بدلاً من الفيديو، مع زر تشغيل
        // استخدام أول صورة في المصفوفة كبوستر (أو يمكن استخدام صورة افتراضية)
        const posterImage = imagesArray.length > 1 ? imagesArray[1] : DEFAULT_IMAGE;
        
        mediaHtml = `
            <div class="video-wrapper" style="position:relative;width:100%;height:100%;background:#0a0a0a;cursor:pointer;" onclick="loadAndPlayCardVideo(this, '${firstMedia}')">
                <img class="video-poster" src="${posterImage}" alt="الفيديو" style="width:100%;height:100%;object-fit:contain;background:#0a0a0a;">
                <div class="video-play-overlay" style="
                    position:absolute;
                    top:0;
                    left:0;
                    width:100%;
                    height:100%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    background:rgba(0,0,0,0.3);
                    transition:all 0.3s ease;
                ">
                    <div class="play-btn-circle" style="
                        background:rgba(0,0,0,0.7);
                        border:3px solid rgba(255,255,255,0.3);
                        border-radius:50%;
                        width:60px;
                        height:60px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        transition:all 0.3s ease;
                        backdrop-filter:blur(4px);
                    ">
                        <i class="fas fa-play" style="color:white;font-size:24px;margin-left:4px;"></i>
                    </div>
                </div>
                <video class="card-main-video" src="${firstMedia}" muted loop playsinline style="width:100%;height:100%;object-fit:contain;background:#0a0a0a;display:none;"></video>
            </div>
        `;
    } else {
        mediaHtml = `<img class="card-main-img" src="${firstMedia}" alt="${title}" loading="lazy" style="width:100%;height:100%;object-fit:contain;background:#0a0a0a;">`;
    }
    
    return `<div class="property-card ${isFeatured ? 'featured-property' : ''}" data-id="${p.id}" data-images='${JSON.stringify(imagesArray)}' data-current-img="0">
        ${!p.available ? `<div class="sold-overlay"><div class="sold-stamp">${t?.sold_stamp || 'مباع'}</div></div>` : ''}
        ${isFeatured ? `<div class="featured-badge"><i class="fas fa-star"></i> ${t?.featured_badge || 'مميز'}</div>` : ''}
        <div class="card-badges"><span class="badge-type ${p.type === 'sale' ? 'badge-sale' : 'badge-rent'}">${p.type === 'sale' ? `<i class="fas fa-tag"></i> ${t?.filter_transaction_sale || 'للبيع'}` : `<i class="fas fa-key"></i> ${t?.filter_transaction_rent || 'للإيجار'}`}</span></div>
        <div class="card-images" data-id="${p.id}">
            ${mediaHtml}
            ${imageCount > 1 ? `<button class="card-img-nav prev" data-id="${p.id}">❮</button><button class="card-img-nav next" data-id="${p.id}">❯</button>` : ''}
            ${dotsHtml}
        </div>
        <div class="card-body">
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
                <div class="spec-item"><i class="fas fa-layer-group spec-icon"></i><span class="spec-value">${getFloorText(p.floor)}</span><span>${currentLanguage === 'ar' ? 'طابق' : 'floor'}</span></div>
            </div>
            <div class="card-footer">
                <div class="card-price">
                    ${p.isPriceNumeric ? 
                        `${Number(p.price).toLocaleString()} <span>${p.currency}</span>` : 
                        `<span class="price-contact"><i class="fas fa-tag"></i> ${p.price}</span>`}
                    ${p.type === 'rent' ? ` <span class="rent-period">${getRentPeriodText(p.rent_period)}</span>` : ''}
                </div>
                <button class="btn-more" onclick="event.stopPropagation();openPropertyModal('${p.id}')">${t?.more_btn || 'عرض المزيد'} <i class="fas fa-arrow-left"></i></button>
            </div>
        </div>
    </div>`;
}

// ✅ تحميل وتشغيل الفيديو عند الضغط على زر التشغيل
function loadAndPlayCardVideo(wrapper, videoSrc) {
    // منع الضغط المتكرر
    if (wrapper.dataset.loading === 'true') return;
    wrapper.dataset.loading = 'true';
    
    // إخفاء البوستر والتراكب
    const poster = wrapper.querySelector('.video-poster');
    const overlay = wrapper.querySelector('.video-play-overlay');
    const video = wrapper.querySelector('.card-main-video');
    
    if (!video) return;
    
    // إظهار الفيديو
    video.style.display = 'block';
    
    // إخفاء البوستر والتراكب
    if (poster) poster.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    
    // تحميل الفيديو وتشغيله
    video.load(); // يبدأ التحميل الآن فقط
    video.play().catch(function(error) {
        console.log('تشغيل الفيديو تطلب تفاعل المستخدم:', error);
        // إذا فشل التشغيل، حاول مرة أخرى عند النقر
        video.addEventListener('click', function() {
            video.play();
        }, { once: true });
    });
    
    // إزالة خاصية التحميل
    wrapper.dataset.loading = 'false';
}

// ✅ دالة تشغيل/إيقاف الفيديو في البطاقة
function toggleCardVideo(button) {
    const wrapper = button.closest('.video-wrapper');
    if (!wrapper) return;
    
    const video = wrapper.querySelector('.card-main-video');
    if (!video) return;
    
    // إظهار الفيديو إذا كان مخفياً
    if (video.style.display === 'none') {
        video.style.display = 'block';
    }
    
    if (video.paused) {
        video.play();
        button.innerHTML = '<i class="fas fa-pause" style="color:white;font-size:24px;"></i>';
        button.style.background = 'rgba(201,168,76,0.8)';
        button.style.borderColor = 'var(--primary)';
    } else {
        video.pause();
        button.innerHTML = '<i class="fas fa-play" style="color:white;font-size:24px;margin-left:4px;"></i>';
        button.style.background = 'rgba(0,0,0,0.7)';
        button.style.borderColor = 'rgba(255,255,255,0.3)';
    }
}

// ✅ عند تغيير الصورة في البطاقة، تأكد من إعادة تعيين زر التشغيل
function resetVideoPlayButton(card) {
    const wrapper = card.querySelector('.video-wrapper');
    if (!wrapper) return;
    
    const video = wrapper.querySelector('.card-main-video');
    const button = wrapper.querySelector('.video-play-btn');
    
    if (video && button) {
        video.pause();
        video.style.display = 'none';
        button.innerHTML = '<i class="fas fa-play" style="color:white;font-size:24px;margin-left:4px;"></i>';
        button.style.background = 'rgba(0,0,0,0.7)';
        button.style.borderColor = 'rgba(255,255,255,0.3)';
    }
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
    
    const imagesDiv = card.querySelector('.card-images');
    if (!imagesDiv) return;
    
    let images = card.dataset.images;
    if (!images) return;
    let imagesArray;
    try { imagesArray = JSON.parse(images); } catch { return; }
    if (!imagesArray.length) return;
    
    let currentIndex = parseInt(card.dataset.currentImg) || 0;
    currentIndex = (currentIndex + 1) % imagesArray.length;
    card.dataset.currentImg = currentIndex;
    
    const mediaUrl = imagesArray[currentIndex];
    const isVideo = isVideoUrl(mediaUrl);
    
    // ✅ إزالة العنصر القديم
    const oldWrapper = imagesDiv.querySelector('.video-wrapper');
    const oldImg = imagesDiv.querySelector('.card-main-img');
    if (oldWrapper) oldWrapper.remove();
    if (oldImg) oldImg.remove();
    
    if (isVideo) {
        // ✅ إنشاء فيديو مع بوستر
        const posterImage = imagesArray.length > (currentIndex + 1) ? imagesArray[currentIndex + 1] : DEFAULT_IMAGE;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'video-wrapper';
        wrapper.style.cssText = 'position:relative;width:100%;height:100%;background:#0a0a0a;cursor:pointer;';
        wrapper.onclick = function() { loadAndPlayCardVideo(this, mediaUrl); };
        
        // البوستر
        const poster = document.createElement('img');
        poster.className = 'video-poster';
        poster.src = posterImage;
        poster.alt = 'الفيديو';
        poster.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#0a0a0a;';
        
        // تراكب زر التشغيل
        const overlay = document.createElement('div');
        overlay.className = 'video-play-overlay';
        overlay.style.cssText = `
            position:absolute;
            top:0;
            left:0;
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            background:rgba(0,0,0,0.3);
            transition:all 0.3s ease;
        `;
        overlay.innerHTML = `
            <div style="
                background:rgba(0,0,0,0.7);
                border:3px solid rgba(255,255,255,0.3);
                border-radius:50%;
                width:60px;
                height:60px;
                display:flex;
                align-items:center;
                justify-content:center;
                transition:all 0.3s ease;
                backdrop-filter:blur(4px);
            ">
                <i class="fas fa-play" style="color:white;font-size:24px;margin-left:4px;"></i>
            </div>
        `;
        
        // الفيديو (مخفي)
        const video = document.createElement('video');
        video.className = 'card-main-video';
        video.src = mediaUrl;
        video.muted = true;
        video.loop = true;
        video.playsinline = true;
        video.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#0a0a0a;display:none;';
        
        wrapper.appendChild(poster);
        wrapper.appendChild(overlay);
        wrapper.appendChild(video);
        imagesDiv.appendChild(wrapper);
        
    } else {
        // ✅ صورة عادية
        const img = document.createElement('img');
        img.className = 'card-main-img';
        img.src = mediaUrl;
        img.alt = '';
        img.loading = 'lazy';
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#0a0a0a;';
        imagesDiv.appendChild(img);
    }
    
    // تحديث النقاط
    const dots = card.querySelectorAll('.img-dot');
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
}

// ✅ نفس التعديل لـ prevCardImage
function prevCardImage(e) {
    e.stopPropagation();
    const card = e.currentTarget.closest('.property-card');
    if (!card) return;
    
    const imagesDiv = card.querySelector('.card-images');
    if (!imagesDiv) return;
    
    let images = card.dataset.images;
    if (!images) return;
    let imagesArray;
    try { imagesArray = JSON.parse(images); } catch { return; }
    if (!imagesArray.length) return;
    
    let currentIndex = parseInt(card.dataset.currentImg) || 0;
    currentIndex = (currentIndex - 1 + imagesArray.length) % imagesArray.length;
    card.dataset.currentImg = currentIndex;
    
    const mediaUrl = imagesArray[currentIndex];
    const isVideo = isVideoUrl(mediaUrl);
    
    // ✅ إزالة العنصر القديم
    const oldWrapper = imagesDiv.querySelector('.video-wrapper');
    const oldImg = imagesDiv.querySelector('.card-main-img');
    if (oldWrapper) oldWrapper.remove();
    if (oldImg) oldImg.remove();
    
    if (isVideo) {
        // ✅ إنشاء فيديو مع بوستر
        const posterImage = imagesArray.length > (currentIndex + 1) ? imagesArray[currentIndex + 1] : DEFAULT_IMAGE;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'video-wrapper';
        wrapper.style.cssText = 'position:relative;width:100%;height:100%;background:#0a0a0a;cursor:pointer;';
        wrapper.onclick = function() { loadAndPlayCardVideo(this, mediaUrl); };
        
        const poster = document.createElement('img');
        poster.className = 'video-poster';
        poster.src = posterImage;
        poster.alt = 'الفيديو';
        poster.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#0a0a0a;';
        
        const overlay = document.createElement('div');
        overlay.className = 'video-play-overlay';
        overlay.style.cssText = `
            position:absolute;
            top:0;
            left:0;
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            background:rgba(0,0,0,0.3);
            transition:all 0.3s ease;
        `;
        overlay.innerHTML = `
            <div style="
                background:rgba(0,0,0,0.7);
                border:3px solid rgba(255,255,255,0.3);
                border-radius:50%;
                width:60px;
                height:60px;
                display:flex;
                align-items:center;
                justify-content:center;
                transition:all 0.3s ease;
                backdrop-filter:blur(4px);
            ">
                <i class="fas fa-play" style="color:white;font-size:24px;margin-left:4px;"></i>
            </div>
        `;
        
        const video = document.createElement('video');
        video.className = 'card-main-video';
        video.src = mediaUrl;
        video.muted = true;
        video.loop = true;
        video.playsinline = true;
        video.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#0a0a0a;display:none;';
        
        wrapper.appendChild(poster);
        wrapper.appendChild(overlay);
        wrapper.appendChild(video);
        imagesDiv.appendChild(wrapper);
        
    } else {
        const img = document.createElement('img');
        img.className = 'card-main-img';
        img.src = mediaUrl;
        img.alt = '';
        img.loading = 'lazy';
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#0a0a0a;';
        imagesDiv.appendChild(img);
    }
    
    const dots = card.querySelectorAll('.img-dot');
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
}

function prevCardImage(e) {
    e.stopPropagation();
    const card = e.currentTarget.closest('.property-card');
    if (!card) return;
    const mediaElement = card.querySelector('.card-main-img, .card-main-video');
    let images = card.dataset.images;
    if (!images) return;
    let imagesArray;
    try { imagesArray = JSON.parse(images); } catch { return; }
    if (!imagesArray.length) return;
    let currentIndex = parseInt(card.dataset.currentImg) || 0;
    currentIndex = (currentIndex - 1 + imagesArray.length) % imagesArray.length;
    card.dataset.currentImg = currentIndex;
    
    const mediaUrl = imagesArray[currentIndex];
    const isVideo = isVideoUrl(mediaUrl);
    
    if (isVideo) {
        const video = document.createElement('video');
        video.className = 'card-main-video';
        video.src = mediaUrl;
        video.muted = true;
        video.loop = true;
        video.playsinline = true;
        video.autoplay = true;
        video.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#0a0a0a;';
        mediaElement.replaceWith(video);
    } else {
        const img = document.createElement('img');
        img.className = 'card-main-img';
        img.src = mediaUrl;
        img.alt = '';
        img.loading = 'lazy';
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#0a0a0a;';
        mediaElement.replaceWith(img);
    }
    
    const dots = card.querySelectorAll('.img-dot');
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
}

// نفس التعديل لـ prevCardImage
function prevCardImage(e) {
    e.stopPropagation();
    const card = e.currentTarget.closest('.property-card');
    if (!card) return;
    const mediaElement = card.querySelector('.card-main-img, .card-main-video');
    let images = card.dataset.images;
    if (!images) return;
    let imagesArray;
    try { imagesArray = JSON.parse(images); } catch { return; }
    if (!imagesArray.length) return;
    let currentIndex = parseInt(card.dataset.currentImg) || 0;
    currentIndex = (currentIndex - 1 + imagesArray.length) % imagesArray.length;
    card.dataset.currentImg = currentIndex;
    
    const mediaUrl = imagesArray[currentIndex];
    const isVideo = isVideoUrl(mediaUrl);
    
    if (isVideo) {
        const video = document.createElement('video');
        video.className = 'card-main-video';
        video.src = mediaUrl;
        video.muted = true;
        video.loop = true;
        video.playsinline = true;
        video.autoplay = true;
        video.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        mediaElement.replaceWith(video);
    } else {
        const img = document.createElement('img');
        img.className = 'card-main-img';
        img.src = mediaUrl;
        img.alt = '';
        img.loading = 'lazy';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        mediaElement.replaceWith(img);
    }
    
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
// 7. دوال الإحصائيات - نظام عداد زوار
// ============================================================

async function initStats() {
    // قراءة العداد من localStorage أولاً
    let visitors = parseInt(localStorage.getItem('kh_visitors_total') || '0');
    let contacts = parseInt(localStorage.getItem('kh_contacts_total') || '0');
    
    // تحديث الواجهة فوراً
    updateStatsUI(visitors, contacts);
    
    // محاولة جلب أحدث البيانات من الخادم
    try {
        // جلب عدد الزوار
        const visitorsRes = await fetch(`${CONFIG.API_URL}?action=getVisitorCount&_=${Date.now()}`);
        const visitorsData = await visitorsRes.json();
        if (visitorsData && visitorsData.count !== undefined) {
            visitors = parseInt(visitorsData.count) || 0;
            localStorage.setItem('kh_visitors_total', visitors);
        }
    } catch (err) {
        console.error('❌ فشل جلب الزوار:', err);
    }
    
    try {
        // جلب عدد الاستفسارات
        const contactsRes = await fetch(`${CONFIG.API_URL}?action=getContactsCount&_=${Date.now()}`);
        const contactsData = await contactsRes.json();
        if (contactsData && contactsData.count !== undefined) {
            contacts = parseInt(contactsData.count) || 0;
            localStorage.setItem('kh_contacts_total', contacts);
        }
    } catch (err) {
        console.error('❌ فشل جلب الاستفسارات:', err);
    }
    
    // تحديث الواجهة بالبيانات الجديدة
    updateStatsUI(visitors, contacts);
    console.log(`📊 الإحصائيات الأولية: ${visitors} زائر, ${contacts} استفسار`);
}

// دالة جلب عدد الزوار من الخادم - مع no-cors
async function fetchVisitorCount() {
    try {
        await fetch(`${CONFIG.API_URL}?action=getVisitorCount&_=${Date.now()}`, {
            mode: 'no-cors'
        });
        // لا يمكن قراءة الرد مع no-cors، نستخدم localStorage
        const visitors = parseInt(localStorage.getItem('kh_visitors_total') || '0');
        return visitors;
    } catch (error) {
        console.error('❌ خطأ في جلب عدد الزوار:', error);
        return parseInt(localStorage.getItem('kh_visitors_total') || '0');
    }
}

// دالة جلب عدد الاستفسارات - مع no-cors
async function fetchContactsCount() {
    try {
        await fetch(`${CONFIG.API_URL}?action=getContactsCount&_=${Date.now()}`, {
            mode: 'no-cors'
        });
        const contacts = parseInt(localStorage.getItem('kh_contacts_total') || '0');
        return contacts;
    } catch (error) {
        console.error('❌ خطأ في جلب الاستفسارات:', error);
        return parseInt(localStorage.getItem('kh_contacts_total') || '0');
    }
}

// ===== زيادة عدد الزوار (مرة كل 5 دقائق) =====
async function incrementVisitorCount() {
    const now = Date.now();
    const lastVisitKey = 'kh_last_visit_time';
    const lastVisitTime = parseInt(localStorage.getItem(lastVisitKey) || '0');
    const fiveMinutes = 5 * 60 * 1000; // 5 دقائق
    
    // التحقق من مرور 5 دقائق منذ آخر تسجيل
    if (now - lastVisitTime < fiveMinutes) {
        console.log(`⏳ لم تمر 5 دقائق بعد، انتظر ${Math.ceil((fiveMinutes - (now - lastVisitTime)) / 1000)} ثانية`);
        return false;
    }
    
    // تحديث وقت الزيارة في localStorage
    localStorage.setItem(lastVisitKey, now.toString());
    
    try {
        // إرسال طلب زيادة الزوار
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                type: 'incrementVisitor',
                timestamp: now
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ رد الخادم بعد زيادة الزوار:', data);
        
        if (data && data.count !== undefined) {
            const newCount = parseInt(data.count) || 0;
            localStorage.setItem('kh_visitors_total', newCount);
            const contacts = parseInt(localStorage.getItem('kh_contacts_total') || '0');
            updateStatsUI(newCount, contacts);
            console.log(`📊 العدد الجديد من الخادم: ${newCount}`);
            return true;
        } else {
            // زيادة محلية كحل بديل
            const currentCount = parseInt(localStorage.getItem('kh_visitors_total') || '0');
            const newCount = currentCount + 1;
            localStorage.setItem('kh_visitors_total', newCount);
            const contacts = parseInt(localStorage.getItem('kh_contacts_total') || '0');
            updateStatsUI(newCount, contacts);
            console.log(`📊 العدد الجديد (تقديري محلي): ${newCount}`);
            return true;
        }
    } catch (error) {
        console.error('❌ خطأ في تحديث عدد الزوار:', error);
        
        // زيادة محلية كحل بديل
        const currentCount = parseInt(localStorage.getItem('kh_visitors_total') || '0');
        const newCount = currentCount + 1;
        localStorage.setItem('kh_visitors_total', newCount);
        const contacts = parseInt(localStorage.getItem('kh_contacts_total') || '0');
        updateStatsUI(newCount, contacts);
        console.log(`📊 العدد الجديد (تقديري محلي بعد الخطأ): ${newCount}`);
        return false;
    }
}

/// ===== زيادة عدد الاستفسارات =====
async function incrementContactsCount() {
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'incrementContacts' })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ رد الخادم بعد زيادة الاستفسارات:', data);
        
        if (data && data.count !== undefined) {
            const contacts = parseInt(data.count) || 0;
            localStorage.setItem('kh_contacts_total', contacts);
            const visitors = parseInt(localStorage.getItem('kh_visitors_total') || '0');
            updateStatsUI(visitors, contacts);
            console.log(`📊 عدد الاستفسارات الجديد: ${contacts}`);
        }
    } catch (error) {
        console.error('❌ خطأ في تحديث عداد الاستفسارات:', error);
        // زيادة محلية كحل بديل
        const currentContacts = parseInt(localStorage.getItem('kh_contacts_total') || '0');
        const newContacts = currentContacts + 1;
        localStorage.setItem('kh_contacts_total', newContacts);
        const visitors = parseInt(localStorage.getItem('kh_visitors_total') || '0');
        updateStatsUI(visitors, newContacts);
    }
}

// ===== تحديث واجهة الإحصائيات =====
function updateStatsUI(visitors, contacts) {
    const available = allProperties.filter(p => p.available).length;
    const sold = allProperties.filter(p => !p.available).length;
    
    // تحديث العناصر مع تنسيق الأرقام
    const elements = {
        heroAvailable: available,
        heroSold: sold,
        heroVisitors: visitors,
        statsAvailable: available,
        statsSold: sold,
        statsVisitors: visitors,
        statsContacts: contacts,
        totalVisitors: visitors,
        heroAvailableInline: available,
        heroSoldInline: sold,
        heroVisitorsInline: visitors
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
            // تنسيق الرقم مع فواصل (مثل 1,234)
            el.innerText = Number(value).toLocaleString();
        }
    });
}

/// ===== تحديث الإحصائيات التلقائي =====
async function autoRefreshStats() {
    console.log('🔄 جاري تحديث الإحصائيات...');
    try {
        // محاولة جلب عدد الزوار من الخادم
        try {
            const visitorsRes = await fetch(`${CONFIG.API_URL}?action=getVisitorCount&_=${Date.now()}`);
            const visitorsData = await visitorsRes.json();
            if (visitorsData && visitorsData.count !== undefined) {
                const visitors = parseInt(visitorsData.count) || 0;
                localStorage.setItem('kh_visitors_total', visitors);
                console.log(`📊 عدد الزوار من الخادم: ${visitors}`);
            }
        } catch (err) {
            console.error('❌ فشل جلب الزوار:', err);
        }
        
        // محاولة جلب عدد الاستفسارات من الخادم
        try {
            const contactsRes = await fetch(`${CONFIG.API_URL}?action=getContactsCount&_=${Date.now()}`);
            const contactsData = await contactsRes.json();
            if (contactsData && contactsData.count !== undefined) {
                const contacts = parseInt(contactsData.count) || 0;
                localStorage.setItem('kh_contacts_total', contacts);
                console.log(`📊 عدد الاستفسارات من الخادم: ${contacts}`);
            }
        } catch (err) {
            console.error('❌ فشل جلب الاستفسارات:', err);
        }
        
        // تحديث الواجهة
        const visitors = parseInt(localStorage.getItem('kh_visitors_total') || '0');
        const contacts = parseInt(localStorage.getItem('kh_contacts_total') || '0');
        updateStatsUI(visitors, contacts);
        console.log(`✅ تم تحديث الإحصائيات: ${visitors} زائر, ${contacts} استفسار`);
        
    } catch (error) {
        console.error('❌ فشل تحديث الإحصائيات:', error);
    }
    // إعادة الجدولة بعد 30 ثانية
    setTimeout(autoRefreshStats, 30000);
}

// بدء التحديث التلقائي
autoRefreshStats();
// دالة جلب عدد الزوار من الخادم - مع no-cors
async function fetchVisitorCount() {
    try {
        // ✅ استخدام no-cors (لا يمكن قراءة الرد، لكن الطلب يصل)
        await fetch(`${CONFIG.API_URL}?action=getVisitorCount&_=${Date.now()}`, {
            mode: 'no-cors'
        });
        
        // نظراً لأننا لا نستطيع قراءة الرد، نستخدم localStorage
        const visitors = parseInt(localStorage.getItem('kh_visitors_total') || '0');
        console.log(`📊 عدد الزوار من localStorage: ${visitors}`);
        return visitors;
        
    } catch (error) {
        console.error('❌ خطأ في جلب عدد الزوار:', error);
        const visitors = parseInt(localStorage.getItem('kh_visitors_total') || '0');
        return visitors;
    }
}


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
    
        // في دالة openPropertyModal

        // ===== تحديث عنوان العقار =====
        document.getElementById('propModalTitle').textContent = title;
        document.getElementById('propModalName').textContent = title;

        // ===== تحديث كود العقار =====
        const codeEl = document.getElementById('propModalCode');
        if (codeEl) {
            codeEl.innerHTML = `<i class="fas fa-barcode"></i> ${p.id}`;
        }

        // ===== تحديث نوع العملية =====
        const typeEl = document.getElementById('propModalType');
        if (typeEl) {
            const typeIcon = p.type === 'sale' ? 'fa-tag' : 'fa-key';
            const typeText = p.type === 'sale' ? (t?.filter_transaction_sale || 'للبيع') : (t?.filter_transaction_rent || 'للإيجار');
            typeEl.innerHTML = `<i class="fas ${typeIcon}"></i> ${typeText}`;
            typeEl.className = `meta-badge type-badge ${p.type === 'sale' ? 'sale' : 'rent'}`;
        }

        // ===== تحديث الموقع =====
        const locationEl = document.getElementById('propModalLocation');
        if (locationEl) {
            const gov = getLocalizedText(p, 'governorate') || '';
            const dist = getLocalizedText(p, 'district') || '';
            const locationText = dist + (dist && gov ? ' - ' : '') + gov;
            locationEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${locationText || p.location || 'غير محدد'}`;
        }

        // ===== تحديث المشاهدات والمفضلات =====
        const viewsCountEl = document.getElementById('viewsCount');
        if (viewsCountEl) viewsCountEl.textContent = p.views || 0;

        const favCountEl = document.getElementById('modalFavCountDisplay');
        if (favCountEl) favCountEl.textContent = p.favCount || 0;

        // ===== تحديث الوصف =====
        document.getElementById('propModalDesc').textContent = description || 'لا يوجد وصف';

    // ✅ تعيين الصور الحالية
    currentPropertyImages = p.images || [];
    currentImageIndex = 0;

    // ✅ تنظيف معرض الصور مع الحفاظ على zoomOverlay و zoomBtn وأزرار التنقل والعداد
    const galleryMain = document.getElementById('galleryMain');
    if (galleryMain) {
        // حذف جميع العناصر باستثناء العناصر المهمة
        const children = galleryMain.children;
        for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            // الاحتفاظ بالعناصر المهمة
            if (child.id === 'zoomOverlay' || 
                child.id === 'zoomBtn' ||
                child.classList.contains('gallery-nav') || 
                child.classList.contains('image-counter')) {
                continue;
            }
            child.remove();
        }
        
        // ✅ التأكد من وجود zoomOverlay في الصفحة (وليس داخل galleryMain)
        let zoomOverlay = document.getElementById('zoomOverlay');
        if (!zoomOverlay) {
            // إذا لم يكن موجوداً، أنشئه في نهاية body
            zoomOverlay = document.createElement('div');
            zoomOverlay.className = 'zoom-overlay';
            zoomOverlay.id = 'zoomOverlay';
            zoomOverlay.onclick = closeZoom;
            zoomOverlay.innerHTML = `
                <img id="zoomImage" src="" alt="صورة مكبرة">
                <video id="zoomVideo" src="" controls style="display:none;"></video>
                <button class="zoom-close-btn" id="zoomCloseBtn" onclick="closeZoom()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            document.body.appendChild(zoomOverlay);
        }
        
        // ✅ التأكد من وجود زر التكبير
        let zoomBtn = document.getElementById('zoomBtn');
        if (!zoomBtn) {
            zoomBtn = document.createElement('button');
            zoomBtn.className = 'zoom-btn';
            zoomBtn.id = 'zoomBtn';
            zoomBtn.innerHTML = '<i class="fas fa-expand"></i>';
            zoomBtn.title = 'تكبير الصورة';
            zoomBtn.onclick = openZoom;
            galleryMain.insertBefore(zoomBtn, galleryMain.firstChild);
        }
        
        // ✅ إذا لم توجد أزرار تنقل، أضفها
        let galleryNav = galleryMain.querySelector('.gallery-nav');
        if (!galleryNav) {
            galleryNav = document.createElement('div');
            galleryNav.className = 'gallery-nav';
            galleryNav.innerHTML = `
                <button class="gallery-nav-btn prev" onclick="prevPropImg()" aria-label="السابق">
                    <i class="fas fa-chevron-right"></i>
                </button>
                <button class="gallery-nav-btn next" onclick="nextPropImg()" aria-label="التالي">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
            galleryMain.appendChild(galleryNav);
        }
        
        // ✅ إذا لم يوجد عداد، أضفه
        let counter = galleryMain.querySelector('.image-counter');
        if (!counter) {
            counter = document.createElement('div');
            counter.className = 'image-counter';
            counter.id = 'imageCounter';
            counter.textContent = '0/0';
            galleryMain.appendChild(counter);
        }
    }

    // ✅ تحديث الصورة/الفيديو
    updateModalImage();
        
    // في دالة openPropertyModal، استبدل قسم المواصفات بهذا:
const specs = document.getElementById('propModalSpecs');
if (specs) {
    // تحضير متغيرات السعر
    let priceDisplay = p.isPriceNumeric ? 
        `${Number(p.price).toLocaleString()} ${p.currency}` : 
        p.price;
    
    // إضافة مدة الإيجار إذا كان العقار للإيجار
    let rentPeriodText = '';
    if (p.type === 'rent' && p.rent_period) {
        const periodMap = {
            'month': currentLanguage === 'ar' ? 'شهرياً' : 'Monthly',
            'year': currentLanguage === 'ar' ? 'سنوياً' : 'Yearly',
            'week': currentLanguage === 'ar' ? 'أسبوعياً' : 'Weekly',
            'daily': currentLanguage === 'ar' ? 'يومياً' : 'Daily'
        };
        rentPeriodText = periodMap[p.rent_period.toLowerCase()] || '';
    }
    
    const priceStyle = p.isPriceNumeric ? 
        'color:#C9A84C;font-size:28px;font-weight:800;' : 
        'color:#e74c3c;font-size:24px;font-weight:800;background:rgba(231,76,60,0.1);padding:4px 20px;border-radius:8px;display:inline-block;';
    
    const priceBg = p.isPriceNumeric ? 
        'rgba(201,168,76,0.08)' : 
        'rgba(231,76,60,0.08)';
    
    const priceBorder = p.isPriceNumeric ? 
        '1px solid rgba(201,168,76,0.2)' : 
        '1px solid rgba(231,76,60,0.2)';
    
    // بناء قائمة المواصفات
    specs.innerHTML = `
        <!-- السعر - بارز في الأعلى -->
        <div class="spec-item-detail price-spec" style="
            background: ${priceBg};
            border: ${priceBorder};
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
            grid-column: 1 / -1;
        ">
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-tag" style="color:${p.isPriceNumeric ? '#C9A84C' : '#e74c3c'}; font-size: 24px;"></i>
                <span class="spec-label-detail" style="font-size: 16px; color: var(--gray);">${t?.property_specs_price || 'السعر'}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <span class="spec-value-detail" style="${priceStyle}">${priceDisplay}</span>
                ${rentPeriodText ? `<span style="font-size: 18px; font-weight: 600; color: var(--gray); background: rgba(0,0,0,0.05); padding: 4px 16px; border-radius: 20px;">${rentPeriodText}</span>` : ''}
            </div>
        </div>
        
        <!-- باقي المواصفات - كل صف: التسمية في طرف والقيمة في الطرف الآخر -->
        <div class="spec-item-detail" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: var(--light); border-radius: 10px; border-bottom: 1px solid rgba(0,0,0,0.04);">
            <span class="spec-label-detail" style="font-size: 14px; color: var(--gray); display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-ruler-combined" style="color: var(--primary); width: 20px;"></i> ${t?.property_specs_area || 'المساحة'}
            </span>
            <span class="spec-value-detail" style="font-size: 16px; font-weight: 600;">${p.area} م²</span>
        </div>
        
        <div class="spec-item-detail" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: var(--light); border-radius: 10px; border-bottom: 1px solid rgba(0,0,0,0.04);">
            <span class="spec-label-detail" style="font-size: 14px; color: var(--gray); display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-door-open" style="color: var(--primary); width: 20px;"></i> ${t?.property_specs_rooms || 'الغرف'}
            </span>
            <span class="spec-value-detail" style="font-size: 16px; font-weight: 600;">${p.rooms} ${t?.property_specs_rooms_unit || 'غرف'}</span>
        </div>
        
        <div class="spec-item-detail" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: var(--light); border-radius: 10px; border-bottom: 1px solid rgba(0,0,0,0.04);">
            <span class="spec-label-detail" style="font-size: 14px; color: var(--gray); display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-bath" style="color: var(--primary); width: 20px;"></i> ${t?.property_specs_bathrooms || 'الحمامات'}
            </span>
            <span class="spec-value-detail" style="font-size: 16px; font-weight: 600;">${p.bathrooms || '—'}</span>
        </div>
        
        <div class="spec-item-detail" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: var(--light); border-radius: 10px; border-bottom: 1px solid rgba(0,0,0,0.04);">
            <span class="spec-label-detail" style="font-size: 14px; color: var(--gray); display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-layer-group" style="color: var(--primary); width: 20px;"></i> ${t?.property_specs_floor || 'الطابق'}
            </span>
            <span class="spec-value-detail" style="font-size: 16px; font-weight: 600;">${getFloorText(p.floor)}</span>
        </div>
        
        <div class="spec-item-detail" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: var(--light); border-radius: 10px; border-bottom: 1px solid rgba(0,0,0,0.04);">
            <span class="spec-label-detail" style="font-size: 14px; color: var(--gray); display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-arrow-up" style="color: var(--primary); width: 20px;"></i> ${t?.property_specs_elevator || 'مصعد'}
            </span>
            <span class="spec-value-detail" style="font-size: 16px; font-weight: 600;">${getLocalizedText(p, 'elevator')}</span>
        </div>
        
        <div class="spec-item-detail" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: var(--light); border-radius: 10px; border-bottom: 1px solid rgba(0,0,0,0.04);">
            <span class="spec-label-detail" style="font-size: 14px; color: var(--gray); display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-compass" style="color: var(--primary); width: 20px;"></i> ${t?.property_specs_direction || 'الاتجاه'}
            </span>
            <span class="spec-value-detail" style="font-size: 16px; font-weight: 600;">${getLocalizedText(p, 'direction')}</span>
        </div>
        
        <div class="spec-item-detail" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: var(--light); border-radius: 10px; border-bottom: 1px solid rgba(0,0,0,0.04);">
            <span class="spec-label-detail" style="font-size: 14px; color: var(--gray); display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-paint-brush" style="color: var(--primary); width: 20px;"></i> ${t?.property_specs_finishing || 'التشطيب'}
            </span>
            <span class="spec-value-detail" style="font-size: 16px; font-weight: 600;">${getLocalizedText(p, 'finishing')}</span>
        </div>
        
        <div class="spec-item-detail" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: var(--light); border-radius: 10px; border-bottom: 1px solid rgba(0,0,0,0.04);">
            <span class="spec-label-detail" style="font-size: 14px; color: var(--gray); display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-car" style="color: var(--primary); width: 20px;"></i> ${t?.property_specs_parking || 'موقف السيارة'}
            </span>
            <span class="spec-value-detail" style="font-size: 16px; font-weight: 600;">${getLocalizedText(p, 'parking')}</span>
        </div>
        
        <div class="spec-item-detail" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: var(--light); border-radius: 10px; border-bottom: 1px solid rgba(0,0,0,0.04);">
            <span class="spec-label-detail" style="font-size: 14px; color: var(--gray); display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-file-contract" style="color: var(--primary); width: 20px;"></i> ${t?.property_specs_ownership || 'سند الملكية'}
            </span>
            <span class="spec-value-detail" style="font-size: 16px; font-weight: 600;">${getLocalizedText(p, 'ownership')}</span>
        </div>
    `;
}
    
// ===== الخريطة - تظهر تلقائياً مع تفاعل كامل =====
const mapDiv = document.getElementById('propModalMap');
if (mapDiv) {
    const hasValidCoordinates = p.lat && p.lng && p.lat !== 0 && p.lng !== 0;
    
    if (hasValidCoordinates) {
        const lat = p.lat;
        const lng = p.lng;
        
        // استخدام iframe مع خيارات تفاعلية كاملة
        const mapUrl = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed&hl=${currentLanguage === 'ar' ? 'ar' : 'en'}`;
        
        mapDiv.innerHTML = `
            <div class="map-wrapper-interactive">
                <div class="map-container-interactive">
                    <iframe 
                        src="${mapUrl}"
                        width="100%" 
                        height="100%" 
                        style="border:0;"
                        loading="lazy"
                        allowfullscreen
                        referrerpolicy="no-referrer-when-downgrade"
                        title="موقع العقار على الخريطة">
                    </iframe>
                    <!-- زر فتح في خرائط جوجل - أعلى اليسار -->
                    <button onclick="window.open('https://www.google.com/maps?q=${lat},${lng}', '_blank')" 
                            class="map-open-btn-top-left">
                        <i class="fas fa-external-link-alt"></i> 
                        <span>${currentLanguage === 'ar' ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}</span>
                    </button>
                </div>
                <div class="map-info-bar">
                    <div class="map-coordinates-interactive">
                        <i class="fas fa-crosshairs"></i>
                        <span>${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
                    </div>
                    <div class="map-zoom-hint">
                        <i class="fas fa-mouse-pointer"></i>
                        <span>${currentLanguage === 'ar' ? 'اسحب للتنقل • درّج للتكبير' : 'Drag to navigate • Scroll to zoom'}</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        mapDiv.innerHTML = `
            <div class="map-placeholder-interactive">
                <div class="map-placeholder-icon-interactive">
                    <i class="fas fa-map-pin"></i>
                </div>
                <h4>${currentLanguage === 'ar' ? '📍 لم يتم تحديد الموقع' : '📍 Location Not Set'}</h4>
                <p>${currentLanguage === 'ar' ? 'يمكنك التواصل معنا للحصول على الموقع الدقيق' : 'Contact us for the exact location'}</p>
                <button onclick="openContactModal('${p.id}')" class="map-contact-btn-interactive">
                    <i class="fas fa-phone-alt"></i>
                    <span>${currentLanguage === 'ar' ? 'طلب الموقع' : 'Request Location'}</span>
                </button>
            </div>
        `;
    }
}
    
    // ===== عقارات مشابهة (مع صورة + اسم + موقع + سعر) =====
let similar = allProperties.filter(x => x.id !== id && x.type === p.type && x.available && Math.abs(x.price - p.price) <= (p.price * 0.3));
if (similar.length < 3) {
    similar = [...similar, ...allProperties.filter(x => x.id !== id && x.type === p.type && x.available && !similar.includes(x))].slice(0, 4);
}

const suggDiv = document.getElementById('propSuggestions');
if (suggDiv) {
    if (similar.length > 0) {
        suggDiv.innerHTML = similar.map(s => {
            // الحصول على أول صورة
            let firstImage = DEFAULT_IMAGE;
            if (s.images && Array.isArray(s.images) && s.images.length > 0) {
                firstImage = s.images[0];
            } else if (s.images && typeof s.images === 'string') {
                const imagesArray = s.images.split(',').map(img => img.trim());
                if (imagesArray.length > 0) {
                    firstImage = imagesArray[0];
                }
            }
            
            const sTitle = getLocalizedText(s, 'title');
            const sLocation = getLocalizedText(s, 'district') + (getLocalizedText(s, 'city') ? ' - ' + getLocalizedText(s, 'city') : '');
            const sPrice = s.isPriceNumeric ? 
                `${Number(s.price).toLocaleString()} ${s.currency}` : 
                s.price;
            
            return `
                <div class="suggestion-card-luxury" onclick="openPropertyModal('${s.id}')">
                    <div class="suggestion-image">
                        <img src="${firstImage}" alt="${sTitle}" loading="lazy">
                    </div>
                    <div class="suggestion-info">
                        <div class="s-title">${sTitle}</div>
                        <div class="s-location"><i class="fas fa-map-marker-alt"></i> ${sLocation}</div>
                        <div class="s-price">${sPrice}</div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        suggDiv.innerHTML = `<div class="no-similar">${t?.property_no_similar || 'لا توجد عقارات مشابهة'}</div>`;
    }
}
    
    document.getElementById('propertyModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    history.pushState({}, '', `${window.location.pathname}?id=${id}`);
}

function updateModalImage() {
    const galleryMain = document.getElementById('galleryMain');
    const counter = document.getElementById('imageCounter');
    const zoomBtn = document.getElementById('zoomBtn');
    
    if (!galleryMain) return;
    
    // 1. حذف جميع عناصر الوسائط السابقة
    const children = galleryMain.children;
    for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        if (child.id === 'zoomBtn' || 
            child.id === 'zoomOverlay' || 
            child.id === 'imageCounter' || 
            child.classList.contains('gallery-nav')) {
            continue;
        }
        child.remove();
    }
    
    // 2. التأكد من وجود العداد
    let imageCounter = document.getElementById('imageCounter');
    if (!imageCounter) {
        imageCounter = document.createElement('div');
        imageCounter.className = 'image-counter';
        imageCounter.id = 'imageCounter';
        galleryMain.appendChild(imageCounter);
    }
    
    // 3. التأكد من وجود زر التكبير
    let zoomButton = document.getElementById('zoomBtn');
    if (!zoomButton) {
        zoomButton = document.createElement('button');
        zoomButton.className = 'zoom-btn';
        zoomButton.id = 'zoomBtn';
        zoomButton.innerHTML = '<i class="fas fa-expand"></i>';
        zoomButton.title = 'تكبير الصورة';
        zoomButton.onclick = openZoom;
        galleryMain.insertBefore(zoomButton, galleryMain.firstChild);
    }
    
    // 4. التحقق من وجود صور
    if (currentPropertyImages && currentPropertyImages.length > 0 && currentPropertyImages[currentImageIndex]) {
        const mediaUrl = currentPropertyImages[currentImageIndex];
        const isVideo = isVideoUrl(mediaUrl);
        
        // إظهار زر التكبير
        if (zoomButton) zoomButton.style.display = 'flex';
        
        // إنشاء وعرض الوسائط
        const wrapper = document.createElement('div');
        wrapper.className = 'media-wrapper';
        wrapper.style.cssText = 'width:100%;height:100%;min-height:400px;max-height:600px;display:flex;align-items:center;justify-content:center;background:#0a0a0a;overflow:hidden;';
        
        if (isVideo) {
            const video = document.createElement('video');
            video.src = mediaUrl;
            video.controls = true;
            video.muted = false;
            video.playsinline = true;
            video.preload = 'metadata';
            video.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#000;';
            wrapper.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = mediaUrl;
            img.alt = 'صورة العقار';
            img.loading = 'lazy';
            img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;background:#0a0a0a;';
            img.onerror = function() {
                this.src = DEFAULT_IMAGE;
                this.alt = 'الصورة غير متوفرة';
            };
            wrapper.appendChild(img);
        }
        
        // إضافة الوسائط قبل زر التكبير
        galleryMain.insertBefore(wrapper, zoomButton);
        
        // تحديث العداد
        if (imageCounter) {
            imageCounter.textContent = `${currentImageIndex + 1}/${currentPropertyImages.length}`;
            imageCounter.style.display = 'block';
        }
        
    } else {
        // لا توجد صور
        if (zoomButton) zoomButton.style.display = 'none';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'media-wrapper';
        wrapper.style.cssText = 'width:100%;height:100%;min-height:400px;max-height:600px;display:flex;align-items:center;justify-content:center;background:#0a0a0a;overflow:hidden;';
        
        const img = document.createElement('img');
        img.src = DEFAULT_IMAGE;
        img.alt = 'صورة افتراضية';
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;opacity:0.4;';
        wrapper.appendChild(img);
        
        galleryMain.insertBefore(wrapper, zoomButton);
        
        if (imageCounter) {
            imageCounter.textContent = '0/0';
            imageCounter.style.display = 'none';
        }
    }
}

// ✅ فتح الصورة في نافذة جديدة - طريقة مباشرة
function openZoom() {
    let imageUrl = null;
    
    // 1. البحث عن الصورة في media-wrapper
    const galleryMain = document.getElementById('galleryMain');
    if (galleryMain) {
        const mediaWrapper = galleryMain.querySelector('.media-wrapper');
        if (mediaWrapper) {
            const img = mediaWrapper.querySelector('img');
            if (img && img.src) {
                imageUrl = img.src;
            }
        }
        
        // 2. إذا لم نجد، ابحث عن أي صورة في galleryMain
        if (!imageUrl) {
            const img = galleryMain.querySelector('img:not(.zoom-btn):not(.gallery-nav-btn)');
            if (img && img.src) {
                imageUrl = img.src;
            }
        }
    }
    
    // 3. إذا لم نجد، استخدم currentPropertyImages
    if (!imageUrl && currentPropertyImages && currentPropertyImages.length > 0) {
        imageUrl = currentPropertyImages[currentImageIndex] || currentPropertyImages[0];
    }
    
    // 4. إذا لم نجد، استخدم الصورة الافتراضية
    if (!imageUrl) {
        imageUrl = DEFAULT_IMAGE;
    }
    
    // ✅ فتح الصورة في نافذة جديدة
    if (imageUrl) {
        window.open(imageUrl, '_blank');
    } else {
        showToast('❌ لا توجد صورة لعرضها', 'error');
    }
}

// ✅ إغلاق نافذة التكبير - نسخة محسنة
function closeZoom() {
    console.log('🔄 إغلاق نافذة التكبير');
    
    const zoomOverlay = document.getElementById('zoomOverlay');
    const zoomVideo = document.getElementById('zoomVideo');
    const zoomCloseBtn = document.getElementById('zoomCloseBtn');
    
    if (!zoomOverlay) return;
    
    zoomOverlay.classList.remove('active');
    if (zoomCloseBtn) {
        zoomCloseBtn.style.display = 'none';
    }
    document.body.style.overflow = '';
    
    // إيقاف الفيديو
    if (zoomVideo) {
        zoomVideo.pause();
    }
    console.log('✅ نافذة التكبير مغلقة');
}

// ✅ إغلاق التكبير بالضغط على Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeZoom();
    }
});

// ✅ تحميل وتشغيل الفيديو في المودال عند الضغط على زر التشغيل
// ✅ تحميل وتشغيل الفيديو في المودال
function loadAndPlayModalVideo(wrapper, videoSrc) {
    if (wrapper.dataset.loading === 'true') return;
    wrapper.dataset.loading = 'true';
    
    const poster = wrapper.querySelector('.video-poster');
    const overlay = wrapper.querySelector('.video-play-overlay');
    const video = wrapper.querySelector('.card-main-video');
    
    if (!video) return;
    
    video.style.display = 'block';
    if (poster) poster.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    
    video.load();
    video.play().catch(function(error) {
        console.log('تشغيل الفيديو تطلب تفاعل المستخدم:', error);
        video.addEventListener('click', function() {
            video.play();
        }, { once: true });
    });
    
    wrapper.dataset.loading = 'false';
}

// ✅ دالة مساعدة لعرض الصورة الافتراضية
function showFallbackImage(galleryMain, counter) {
    const wrapper = document.createElement('div');
    wrapper.className = 'media-wrapper';
    wrapper.style.cssText = `
        width: 100%;
        height: 100%;
        min-height: 400px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #0a0a0a;
        border-radius: 12px 12px 0 0;
        overflow: hidden;
    `;
    
    const img = document.createElement('img');
    img.src = DEFAULT_IMAGE;
    img.alt = 'صورة افتراضية';
    img.style.cssText = `
        width: auto;
        height: auto;
        max-width: 80%;
        max-height: 80%;
        object-fit: contain;
        display: block;
        opacity: 0.5;
    `;
    wrapper.appendChild(img);
    galleryMain.appendChild(wrapper);
    
    if (counter) {
        counter.textContent = '0/0';
        counter.style.display = 'none';
    }
}

function nextPropImg() {
    if (currentPropertyImages && currentPropertyImages.length > 0) {
        currentImageIndex = (currentImageIndex + 1) % currentPropertyImages.length;
        updateModalImage();
    }
}

function prevPropImg() {
    if (currentPropertyImages && currentPropertyImages.length > 0) {
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
    // تحويل القيمة إلى حروف صغيرة للمقارنة
    const p = String(period || '').toLowerCase().trim();
    
    if (currentLanguage === 'ar') {
        switch(p) {
            case 'month':
            case 'monthly':
                return 'شهرياً';
            case 'year':
            case 'yearly':
                return 'سنوياً';
            case 'week':
            case 'weekly':
                return 'أسبوعياً';
            case 'day':
            case 'daily':
                return 'يومياً';
            default:
                return 'شهرياً';
        }
    } else {
        switch(p) {
            case 'month':
            case 'monthly':
                return 'per month';
            case 'year':
            case 'yearly':
                return 'per year';
            case 'week':
            case 'weekly':
                return 'per week';
            case 'day':
            case 'daily':
                return 'per day';
            default:
                return 'per month';
        }
    }
}

// دالة للحصول على نص الطابق مترجماً
function getFloorText(floor) {
    // تحويل إلى رقم إذا كان نصاً
    const floorNum = typeof floor === 'string' ? parseInt(floor) : floor;
    
    // التحقق من أن القيمة رقم صحيح
    if (isNaN(floorNum)) {
        return floor || '—';
    }
    
    if (currentLanguage === 'ar') {
        if (floorNum === -2) return 'قبو ثاني';
        if (floorNum === -1) return 'قبو أول';
        if (floorNum === 0) return 'أرضي';
        return floorNum;
    } else {
        if (floorNum === -2) return 'Basement 2';
        if (floorNum === -1) return 'Basement 1';
        if (floorNum === 0) return 'Ground';
        // تحويل الأرقام الإنجليزية إلى نص ترتيبي
        if (floorNum === 1) return '1st';
        if (floorNum === 2) return '2nd';
        if (floorNum === 3) return '3rd';
        if (floorNum >= 4) return floorNum + 'th';
        return floorNum;
    }
}

function getLocalizedText(property, field) {
    const lang = currentLanguage;
    if (lang === 'ar') {
        return property[field + '_ar'] || property[field] || '';
    } else {
        // إذا لم توجد الترجمة الإنجليزية، استخدم العربية
        return property[field + '_en'] || property[field] || property[field + '_ar'] || '';
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

// دالة للكشف إذا كان الرابط فيديو
function isVideoUrl(url) {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.endsWith(ext)) || lowerUrl.includes('/video/upload/');
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
            
            // ترتيب العقارات: المميزة أولاً، ثم حسب تاريخ الإضافة (الأجدد أولاً)
            allProperties.sort((a, b) => {
                // أولاً: العقارات المميزة تظهر في الأعلى
                if (a.featured === 'yes' && b.featured !== 'yes') return -1;
                if (a.featured !== 'yes' && b.featured === 'yes') return 1;
                
                // ثانياً: ترتيب حسب تاريخ الإضافة (الأجدد أولاً)
                const dateA = a.added_date ? new Date(a.added_date).getTime() : 0;
                const dateB = b.added_date ? new Date(b.added_date).getTime() : 0;
                return dateB - dateA; // الأحدث أولاً
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
        btn.addEventListener('click', function() {
            wrap.classList.toggle('show');
            this.classList.toggle('active');
            
            // تغيير النص حسب الحالة
            const span = this.querySelector('span');
            const t = translations[currentLanguage];
            if (wrap.classList.contains('show')) {
                span.textContent = t?.filters_toggle_hide || 'إخفاء الفلاتر';
                this.querySelector('i').style.transform = 'rotate(180deg)';
            } else {
                span.textContent = t?.filters_toggle_show || 'إظهار الفلاتر';
                this.querySelector('i').style.transform = 'rotate(0deg)';
            }
        });
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
// رفع الصور - أسهل حل
// ============================================================

// جلب العناصر
const fileInput = document.getElementById('propertyImagesInput');
const dropZone = document.getElementById('dropZone');
const imagePreview = document.getElementById('imagePreview');
const imagesHidden = document.getElementById('propertyImages');

if (fileInput && dropZone && imagePreview) {
    console.log('✅ عناصر رفع الصور موجودة');
    
    // ===== 1. فتح نافذة اختيار الصور عند النقر على الزر =====
    const selectBtn = document.getElementById('selectImagesBtn');
    if (selectBtn) {
        selectBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ زر اختيار الصور - فتح النافذة');
            fileInput.click();
        };
    }
    
    // ===== 2. فتح نافذة اختيار الصور عند النقر على منطقة الإفلات =====
    dropZone.onclick = function(e) {
        // إذا كان النقر على الزر أو على الـ input، لا تفعل شيء
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        e.preventDefault();
        console.log('🖱️ منطقة الإفلات - فتح النافذة');
        fileInput.click();
    };
    
    // ===== 3. عند اختيار ملفات =====
    fileInput.onchange = function(e) {
        const files = e.target.files;
        console.log(`📁 تم اختيار ${files.length} ملف`);
        if (files && files.length > 0) {
            handleUploadedFiles(files);
        }
        // إعادة تعيين قيمة input
        fileInput.value = '';
    };
    
    // ===== 4. السحب والإفلات =====
    dropZone.ondragover = function(e) {
        e.preventDefault();
        this.style.borderColor = '#C9A84C';
        this.style.background = 'rgba(201,168,76,0.1)';
    };
    
    dropZone.ondragleave = function(e) {
        e.preventDefault();
        this.style.borderColor = '#ddd';
        this.style.background = '#fafafa';
    };
    
    dropZone.ondrop = function(e) {
        e.preventDefault();
        this.style.borderColor = '#ddd';
        this.style.background = '#fafafa';
        const files = e.dataTransfer.files;
        console.log(`📁 تم إسقاط ${files.length} ملف`);
        if (files && files.length > 0) {
            handleUploadedFiles(files);
        }
    };
    
    // ===== 5. معالجة الملفات المرفوعة =====
    async function handleUploadedFiles(files) {
        if (!imagePreview || !imagesHidden) return;
        
        // الحصول على معرف العقار من النموذج (إذا كان موجوداً)
        const propertyIdInput = document.getElementById('propertyId');
        const propertyId = propertyIdInput ? propertyIdInput.value : null;
        
        let currentImages = [];
        try {
            currentImages = JSON.parse(imagesHidden.value || '[]');
        } catch {
            currentImages = [];
        }
        
        let successCount = 0;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) {
                console.log(`⚠️ ${file.name} ليس صورة`);
                continue;
            }
            
            console.log(`📤 رفع: ${file.name}`);
            
            // إضافة مؤشر تحميل
            const imgWrapper = document.createElement('div');
            imgWrapper.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid #ddd;flex-shrink:0;background:#f0f0f0;display:flex;align-items:center;justify-content:center;';
            imgWrapper.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:24px;color:#C9A84C;"></i>';
            imagePreview.appendChild(imgWrapper);
            
            // ✅ رفع الصورة مع معرف العقار
            const imageUrl = await uploadImageToCloudinary(file, propertyId);
            
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
                removeBtn.onclick = function(e) {
                    e.stopPropagation();
                    const index = currentImages.indexOf(imageUrl);
                    if (index > -1) {
                        currentImages.splice(index, 1);
                        imagesHidden.value = JSON.stringify(currentImages);
                    }
                    imgWrapper.remove();
                };
                imgWrapper.appendChild(removeBtn);
                
                currentImages.push(imageUrl);
                imagesHidden.value = JSON.stringify(currentImages);
                successCount++;
                console.log(`✅ رفع: ${file.name}`);
            } else {
                imgWrapper.innerHTML = '<i class="fas fa-exclamation-circle" style="font-size:24px;color:#e74c3c;"></i>';
                setTimeout(() => {
                    if (imgWrapper.parentNode) imgWrapper.remove();
                }, 3000);
            }
        }
        
        if (successCount > 0) {
            showToast(`✅ تم رفع ${successCount} صورة بنجاح`, 'success');
        } else {
            showToast('❌ فشل رفع الصور، تأكد من إعدادات Cloudinary', 'error');
        }
    } // ✅ إغلاق دالة handleUploadedFiles
} // ✅ إغلاق if
else {
    console.error('❌ عناصر رفع الصور غير موجودة');
} // ✅ إغلاق else

async function submitAddProperty(event) {
    event.preventDefault();

    // جلب جميع الحقول
    const fields = {
        ownerName: document.getElementById('ownerName')?.value?.trim() || '',
        ownerPhone: document.getElementById('ownerPhone')?.value?.trim() || '',
        title: document.getElementById('propertyTitle')?.value?.trim() || '',
        price: document.getElementById('propertyPrice')?.value?.trim() || '',
        type: document.getElementById('propertyType')?.value || '',
        area: document.getElementById('propertyArea')?.value?.trim() || '',
        governorate: document.getElementById('propertyGovernorate')?.value || '',
        district: document.getElementById('propertyDistrict')?.value?.trim() || '',
        ownership: document.getElementById('propertyOwnership')?.value || '',
        rooms: document.getElementById('propertyRooms')?.value?.trim() || '',
        bathrooms: document.getElementById('propertyBathrooms')?.value?.trim() || '',
        finishing: document.getElementById('propertyFinishing')?.value || '',
        description: document.getElementById('propertyDescription')?.value?.trim() || '',
        images: document.getElementById('propertyImages')?.value || '',
        mapLink: document.getElementById('propertyMap')?.value?.trim() || ''
    };

    console.log('📋 القيم المدخلة:', fields);

    // ============================================================
    // ✅ 1. التحقق من الحقول المطلوبة (غير فارغة)
    // ============================================================
    const requiredFields = [
        'ownerName', 'ownerPhone', 'title', 'type', 'area',
        'governorate', 'district', 'ownership', 'rooms', 'bathrooms', 'finishing'
    ];

    const missingFields = requiredFields.filter(field => {
        const value = fields[field];
        return value === '' || value === null || value === undefined;
    });

    if (missingFields.length > 0) {
        const fieldNames = {
            ownerName: 'الاسم',
            ownerPhone: 'الهاتف',
            title: 'اسم العقار',
            type: 'نوع العقار',
            area: 'المساحة',
            governorate: 'المحافظة',
            district: 'المنطقة',
            ownership: 'نوع الملكية',
            rooms: 'عدد الغرف',
            bathrooms: 'عدد الحمامات',
            finishing: 'نوع التشطيب'
        };
        const missingNames = missingFields.map(f => fieldNames[f] || f).join('، ');
        showToast(`❌ يرجى تعبئة الحقول التالية: ${missingNames}`, 'error');
        return;
    }

    // ============================================================
    // ✅ 2. التحقق من صحة الاسم (حروف فقط)
    // ============================================================
    const nameRegex = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z\s\-\.]+$/;
    if (!nameRegex.test(fields.ownerName)) {
        showToast('❌ الاسم يجب أن يحتوي على حروف فقط (عربية أو إنجليزية)', 'error');
        return;
    }
    if (fields.ownerName.length < 2) {
        showToast('❌ الاسم يجب أن يكون حرفين على الأقل', 'error');
        return;
    }

    // ============================================================
    // ✅ 3. التحقق من صحة رقم الهاتف (أرقام فقط)
    // ============================================================
    const phoneRegex = /^[0-9]{7,15}$/;
    const cleanPhone = fields.ownerPhone.replace(/^0+/, '').replace(/[^0-9]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
        showToast('❌ رقم الهاتف يجب أن يحتوي على 7-15 رقم فقط (بدون حروف أو رموز)', 'error');
        return;
    }

    // ============================================================
    // ✅ 4. التحقق من صحة المساحة (رقم موجب)
    // ============================================================
    const areaNum = Number(fields.area);
    if (isNaN(areaNum) || areaNum <= 0) {
        showToast('❌ المساحة يجب أن تكون رقماً موجباً (أكبر من 0)', 'error');
        return;
    }

    // ============================================================
    // ✅ 5. التحقق من صحة عدد الغرف (عدد صحيح غير سالب)
    // ============================================================
    const roomsNum = Number(fields.rooms);
    if (isNaN(roomsNum) || roomsNum < 0 || !Number.isInteger(roomsNum)) {
        showToast('❌ عدد الغرف يجب أن يكون عدداً صحيحاً غير سالب (0, 1, 2, ...)', 'error');
        return;
    }

    // ============================================================
    // ✅ 6. التحقق من صحة عدد الحمامات (عدد صحيح غير سالب)
    // ============================================================
    const bathroomsNum = Number(fields.bathrooms);
    if (isNaN(bathroomsNum) || bathroomsNum < 0 || !Number.isInteger(bathroomsNum)) {
        showToast('❌ عدد الحمامات يجب أن يكون عدداً صحيحاً غير سالب (0, 1, 2, ...)', 'error');
        return;
    }

    // ============================================================
    // ✅ 7. التحقق من صحة السعر (إذا كان رقمياً)
    // ============================================================
    if (fields.price && fields.price.trim() !== '') {
        // إزالة أي رموز غير رقمية باستثناء النقطة والفاصلة
        const cleanPrice = fields.price.replace(/[^0-9.]/g, '');
        if (cleanPrice && !isNaN(Number(cleanPrice))) {
            const priceNum = Number(cleanPrice);
            if (priceNum < 0) {
                showToast('❌ السعر لا يمكن أن يكون سالباً', 'error');
                return;
            }
        }
        // إذا كان السعر نصياً (مثل "اتصل بنا")، نسمح به
    }

    // ============================================================
    // ✅ جميع التحققات نجحت ✅
    // ============================================================

    // تعطيل الزر
    const submitBtn = document.querySelector('#addPropertyForm .submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
    }

    showToast('📤 جاري إرسال طلبك...', 'info');

    try {
        // ✅ إرسال كـ JSON
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'addProperty',
                ownerName: fields.ownerName,
                ownerPhone: cleanPhone,
                propertyTitle: fields.title,
                propertyPrice: fields.price || 'غير محدد',
                propertyType: fields.type,
                propertyArea: fields.area,
                governorate: fields.governorate,
                district: fields.district,
                ownership: fields.ownership,
                rooms: fields.rooms || 'غير محدد',
                bathrooms: fields.bathrooms || 'غير محدد',
                finishing: fields.finishing || 'غير محدد',
                description: fields.description || 'لا يوجد',
                images: fields.images || 'لا توجد',
                mapLink: fields.mapLink || 'لا يوجد',
                commission: '2%',
                timestamp: new Date().toISOString()
            })
        });

        console.log('✅ تم إرسال طلب إضافة العقار إلى Google Sheets (JSON)');

        showToast('✅ تم إرسال طلبك بنجاح، سيتم مراجعته قريباً (نسبة العمولة: 2%)', 'success');

        // إعادة تعيين النموذج
        document.getElementById('addPropertyForm')?.reset();
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('propertyImages').value = '';

        // إغلاق المودال بعد ثانيتين
        setTimeout(() => {
            closeAddPropertyModal();
        }, 2000);

    } catch (error) {
        console.error('❌ خطأ في إرسال الطلب:', error);
        showToast('❌ حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
    } finally {
        // إعادة تمكين الزر
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> <span data-i18n="add_property_submit">إرسال طلب الإضافة</span>';
        }
    }
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