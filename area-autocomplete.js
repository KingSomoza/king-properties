// ============================================================
// نظام تصحيح وترجمة أسماء المناطق - Area Autocomplete System
// إصدار 1.0 - يعمل بالكامل على جانب العميل (Client-Side)
// ============================================================

// ============================================================
// 1. نظام المطابقة الذكي (Fuzzy Matching Engine)
// ============================================================

class AreaMatcher {
    constructor() {
        this.areas = [];
        this.governorates = [];
        this.isLoading = false;
        this.cache = {};
        this.initialized = false;
        this.init();
    }

    // ===== تحميل البيانات من ملفات JSON =====
    async init() {
        try {
            this.isLoading = true;
            console.log('📂 جاري تحميل بيانات المناطق...');
            
            // 1. تحميل قائمة المحافظات
            const govResponse = await fetch('/data/areas/governorates.json');
            if (!govResponse.ok) {
                throw new Error(`HTTP ${govResponse.status}: ${govResponse.statusText}`);
            }
            this.governorates = await govResponse.json();
            console.log(`✅ تم تحميل ${this.governorates.length} محافظة`);
            
            // 2. تحميل جميع المحافظات (أضف الملفات هنا حسب الحاجة)
            const areaFiles = [
                'damascus.json'
                // 'aleppo.json',
                // 'homs.json',
                // 'latakia.json',
                // 'tartus.json',
                // 'hama.json',
                // 'deir_ez_zor.json',
                // 'hasakah.json',
                // 'raqqa.json',
                // 'idlib.json',
                // 'daraa.json',
                // 'suwayda.json',
                // 'quneitra.json'
            ];
            
            let loadedCount = 0;
            for (const file of areaFiles) {
                try {
                    const response = await fetch(`/data/areas/${file}`);
                    if (!response.ok) {
                        console.warn(`⚠️ فشل تحميل ${file}: HTTP ${response.status}`);
                        continue;
                    }
                    const data = await response.json();
                    const flattened = this.flattenAreas(data);
                    this.areas = this.areas.concat(flattened);
                    loadedCount++;
                    console.log(`✅ تم تحميل ${file} (${flattened.length} منطقة)`);
                } catch (e) {
                    console.warn(`⚠️ فشل تحميل ${file}:`, e.message);
                }
            }
            
            this.initialized = true;
            this.isLoading = false;
            console.log(`✅ تم تحميل ${this.areas.length} منطقة بنجاح`);
            
            // إطلاق حدث اكتمال التحميل
            document.dispatchEvent(new CustomEvent('areas-loaded', {
                detail: { count: this.areas.length }
            }));
            
        } catch (error) {
            console.error('❌ فشل تحميل بيانات المناطق:', error);
            this.isLoading = false;
            
            // محاولة التحميل من localStorage كحل بديل
            this.loadFromCache();
        }
    }

    // ===== تحميل من localStorage (حل بديل) =====
    loadFromCache() {
        try {
            const cached = localStorage.getItem('areas_data');
            if (cached) {
                const data = JSON.parse(cached);
                this.areas = data.areas || [];
                this.governorates = data.governorates || [];
                this.initialized = true;
                console.log(`📦 تم تحميل ${this.areas.length} منطقة من التخزين المحلي`);
            }
        } catch (e) {
            console.warn('⚠️ فشل تحميل من localStorage:', e);
        }
    }

    // ===== حفظ في localStorage =====
    saveToCache() {
        try {
            localStorage.setItem('areas_data', JSON.stringify({
                areas: this.areas,
                governorates: this.governorates,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('⚠️ فشل حفظ في localStorage:', e);
        }
    }

    // ===== تسطيح البيانات (تحويل الهيكل الهرمي إلى قائمة مسطحة) =====
    flattenAreas(data) {
        const result = [];
        
        if (!Array.isArray(data)) {
            console.warn('⚠️ البيانات ليست مصفوفة:', data);
            return result;
        }
        
        data.forEach(governorate => {
            // إضافة المحافظة نفسها
            result.push({
                id: governorate.id || `GOV-${Date.now()}`,
                name_ar: governorate.name_ar || '',
                name_en: governorate.name_en || '',
                type: 'governorate',
                aliases: governorate.aliases || [],
                parent: null,
                level: 1
            });
            
            // إضافة المناطق
            if (governorate.districts && Array.isArray(governorate.districts)) {
                governorate.districts.forEach(district => {
                    result.push({
                        id: district.id || `DIS-${Date.now()}`,
                        name_ar: district.name_ar || '',
                        name_en: district.name_en || '',
                        type: 'district',
                        aliases: district.aliases || [],
                        parent: governorate.name_ar || '',
                        level: 2
                    });
                    
                    // إضافة الأحياء الفرعية
                    if (district.subdistricts && Array.isArray(district.subdistricts)) {
                        district.subdistricts.forEach(sub => {
                            result.push({
                                id: sub.id || `SUB-${Date.now()}`,
                                name_ar: sub.name_ar || '',
                                name_en: sub.name_en || '',
                                type: 'subdistrict',
                                aliases: sub.aliases || [],
                                parent: district.name_ar || '',
                                level: 3
                            });
                        });
                    }
                });
            }
        });
        
        return result;
    }

    // ===== دالة حساب مسافة Levenshtein (للمطابقة الغامضة) =====
    levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b[i-1] === a[j-1]) {
                    matrix[i][j] = matrix[i-1][j-1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i-1][j-1] + 1,
                        matrix[i][j-1] + 1,
                        matrix[i-1][j] + 1
                    );
                }
            }
        }
        
        return matrix[b.length][a.length];
    }

    // ===== حساب نسبة التشابه بين نصين =====
    similarity(str1, str2) {
        if (!str1 || !str2) return 0;
        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();
        if (s1 === s2) return 1;
        if (s1.length === 0 || s2.length === 0) return 0;
        
        const maxLength = Math.max(s1.length, s2.length);
        const distance = this.levenshteinDistance(s1, s2);
        return 1 - (distance / maxLength);
    }

    // ===== البحث عن أقرب تطابق =====
    findMatch(input, threshold = 0.7) {
        if (!input || input.trim().length < 2) return null;
        if (!this.initialized) {
            console.warn('⚠️ البيانات لم تكتمل تحميلها بعد');
            return null;
        }
        
        const searchTerm = input.trim();
        let bestMatch = null;
        let bestScore = 0;
        
        for (const area of this.areas) {
            // التحقق من الاسم الرسمي
            const nameScore = this.similarity(searchTerm, area.name_ar);
            
            // التحقق من الأسماء المستعارة
            let aliasScore = 0;
            if (area.aliases && Array.isArray(area.aliases)) {
                for (const alias of area.aliases) {
                    const score = this.similarity(searchTerm, alias);
                    if (score > aliasScore) aliasScore = score;
                }
            }
            
            const finalScore = Math.max(nameScore, aliasScore);
            
            // وزن حسب المستوى (المحافظات لها وزن أعلى)
            const typeWeight = area.level === 1 ? 1.1 :
                              area.level === 2 ? 1.0 :
                              0.9;
            
            const weightedScore = finalScore * typeWeight;
            
            if (weightedScore > bestScore && weightedScore >= threshold) {
                bestScore = weightedScore;
                bestMatch = {
                    ...area,
                    score: weightedScore,
                    rawScore: finalScore
                };
            }
        }
        
        if (bestMatch && bestMatch.rawScore >= threshold) {
            return bestMatch;
        }
        
        return null;
    }

    // ===== اقتراح التصحيح بناءً على الإدخال =====
    suggestCorrection(input) {
        if (!input || input.trim().length < 2) return null;
        if (!this.initialized) return null;
        
        const result = this.findMatch(input, 0.7);
        
        if (result) {
            const typeLabels = {
                governorate: 'محافظة',
                district: 'منطقة',
                subdistrict: 'حي'
            };
            
            return {
                suggested_ar: result.name_ar,
                suggested_en: result.name_en,
                confidence: Math.round(result.rawScore * 100),
                type: result.type,
                type_label: typeLabels[result.type] || result.type,
                parent: result.parent,
                id: result.id,
                raw: result
            };
        }
        
        return null;
    }

    // ===== الحصول على قائمة الاقتراحات (لـ Autocomplete) =====
    getSuggestions(input, limit = 10) {
        if (!input || input.trim().length < 1) return [];
        if (!this.initialized) return [];
        
        const searchTerm = input.trim().toLowerCase();
        const results = [];
        const seen = new Set();
        
        for (const area of this.areas) {
            // التحقق من الاسم
            const nameMatch = area.name_ar.toLowerCase().includes(searchTerm);
            
            // التحقق من الأسماء المستعارة
            let aliasMatch = false;
            let matchedAlias = '';
            if (area.aliases && Array.isArray(area.aliases)) {
                for (const alias of area.aliases) {
                    if (alias.toLowerCase().includes(searchTerm)) {
                        aliasMatch = true;
                        matchedAlias = alias;
                        break;
                    }
                }
            }
            
            if (nameMatch || aliasMatch) {
                const key = area.id || area.name_ar;
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push({
                        ...area,
                        matchType: nameMatch ? 'name' : 'alias',
                        matchedAlias: matchedAlias
                    });
                }
            }
        }
        
        // ترتيب النتائج حسب المستوى والوزن
        results.sort((a, b) => {
            const order = { governorate: 0, district: 1, subdistrict: 2 };
            const aOrder = order[a.type] || 3;
            const bOrder = order[b.type] || 3;
            if (aOrder !== bOrder) return aOrder - bOrder;
            // إذا كان نفس المستوى، رتب حسب طول الاسم
            return a.name_ar.length - b.name_ar.length;
        });
        
        return results.slice(0, limit);
    }

    // ===== الحصول على جميع المحافظات =====
    getGovernorates() {
        return this.governorates;
    }

    // ===== التحقق من جاهزية النظام =====
    isReady() {
        return this.initialized && this.areas.length > 0;
    }
}

// ============================================================
// 2. واجهة المستخدم (UI Controller)
// ============================================================

class AreaAutocompleteUI {
    constructor(inputElement, enInputElement = null) {
        if (!inputElement) {
            console.error('❌ عنصر الإدخال مطلوب');
            return;
        }
        
        this.input = inputElement;
        this.enInput = enInputElement;
        this.matcher = new AreaMatcher();
        this.dropdown = null;
        this.selectedIndex = -1;
        this.suggestions = [];
        this.isOpen = false;
        this.timeoutId = null;
        this.hasCorrection = false;
        
        this.initUI();
        this.bindEvents();
        
        // إذا كان الحقل الإنجليزي غير موجود، أنشئه
        if (!this.enInput) {
            this.createEnField();
        }
        
        console.log('✅ تم تهيئة نظام تصحيح وترجمة المناطق');
    }

    // ===== إنشاء الحقل الإنجليزي تلقائياً =====
    createEnField() {
        const wrapper = this.input.parentElement;
        const formGroup = wrapper.closest('.form-group') || wrapper;
        
        // إنشاء التسمية
        const enLabel = document.createElement('label');
        enLabel.textContent = 'المنطقة (إنجليزي)';
        enLabel.style.cssText = 'display: block; margin-top: 10px; font-weight: 600; font-size: 14px;';
        
        // إنشاء الحقل
        const enInput = document.createElement('input');
        enInput.type = 'text';
        enInput.id = 'propertyDistrictEn';
        enInput.className = 'form-input';
        enInput.placeholder = 'مثال: Al-Midan';
        enInput.style.cssText = 'margin-top: 4px;';
        
        // إضافة الحقل
        formGroup.appendChild(enLabel);
        formGroup.appendChild(enInput);
        
        this.enInput = enInput;
    }

    // ===== تهيئة واجهة المستخدم =====
    initUI() {
        // إنشاء القائمة المنسدلة
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'area-autocomplete-dropdown';
        this.dropdown.style.cssText = `
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.15);
            max-height: 280px;
            overflow-y: auto;
            z-index: 99999;
            display: none;
        `;
        
        // التأكد من أن العنصر الأب لديه position: relative
        if (this.input.parentElement.style.position !== 'relative') {
            this.input.parentElement.style.position = 'relative';
        }
        
        this.input.parentElement.appendChild(this.dropdown);
    }

    // ===== ربط الأحداث =====
    bindEvents() {
        // ===== عند الكتابة =====
        this.input.addEventListener('input', () => {
            const value = this.input.value;
            
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            
            if (value.length < 1) {
                this.dropdown.style.display = 'none';
                this.isOpen = false;
                return;
            }
            
            // تأخير البحث لتقليل العمليات
            this.timeoutId = setTimeout(() => {
                this.performSearch(value);
            }, 200);
        });

        // ===== عند الخروج من الحقل =====
        this.input.addEventListener('blur', () => {
            setTimeout(() => {
                this.dropdown.style.display = 'none';
                this.isOpen = false;
                
                // محاولة التصحيح التلقائي إذا كان الحقل غير فارغ
                const value = this.input.value;
                if (value && value.length >= 2 && !this.hasCorrection) {
                    this.autoCorrect(value);
                }
            }, 300);
        });

        // ===== عند الدخول إلى الحقل =====
        this.input.addEventListener('focus', () => {
            const value = this.input.value;
            if (value && value.length >= 2) {
                this.performSearch(value);
            }
        });

        // ===== التنقل عبر لوحة المفاتيح =====
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!this.isOpen) return;
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
                this.highlightSuggestion();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (!this.isOpen) return;
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.highlightSuggestion();
            } else if (e.key === 'Enter') {
                if (this.selectedIndex >= 0 && this.suggestions[this.selectedIndex]) {
                    e.preventDefault();
                    this.selectSuggestion(this.suggestions[this.selectedIndex]);
                } else {
                    this.dropdown.style.display = 'none';
                    this.isOpen = false;
                }
            } else if (e.key === 'Escape') {
                this.dropdown.style.display = 'none';
                this.isOpen = false;
            }
        });

        // ===== النقر خارج القائمة =====
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && !this.dropdown.contains(e.target)) {
                this.dropdown.style.display = 'none';
                this.isOpen = false;
            }
        });

        // ===== عندما يتم تحميل البيانات =====
        document.addEventListener('areas-loaded', () => {
            console.log('📦 البيانات جاهزة، النظام يعمل بكامل طاقته');
        });
    }

    // ===== تنفيذ البحث =====
    performSearch(value) {
        if (!this.matcher.isReady()) {
            this.dropdown.innerHTML = `
                <div style="padding: 15px; color: #999; text-align: center;">
                    <i class="fas fa-spinner fa-spin"></i> جاري تحميل البيانات...
                </div>
            `;
            this.dropdown.style.display = 'block';
            this.isOpen = true;
            return;
        }
        
        this.suggestions = this.matcher.getSuggestions(value);
        this.renderSuggestions(this.suggestions);
        
        if (this.suggestions.length > 0) {
            this.dropdown.style.display = 'block';
            this.isOpen = true;
        } else {
            this.dropdown.style.display = 'none';
            this.isOpen = false;
        }
    }

    // ===== عرض الاقتراحات في القائمة =====
    renderSuggestions(items) {
        if (!items || items.length === 0) {
            this.dropdown.innerHTML = `
                <div style="padding: 12px 15px; color: #999; text-align: center; font-size: 14px;">
                    <i class="fas fa-search" style="margin-left: 8px;"></i>
                    لا توجد نتائج مطابقة
                </div>
            `;
            return;
        }
        
        const typeLabels = {
            governorate: 'محافظة',
            district: 'منطقة',
            subdistrict: 'حي'
        };
        
        const typeColors = {
            governorate: '#C9A84C',
            district: '#3498db',
            subdistrict: '#2ecc71'
        };
        
        let html = '';
        items.forEach((item, index) => {
            const isSelected = index === this.selectedIndex;
            const typeLabel = typeLabels[item.type] || item.type;
            const typeColor = typeColors[item.type] || '#999';
            
            html += `
                <div class="autocomplete-item" data-index="${index}" style="
                    padding: 10px 15px;
                    cursor: pointer;
                    border-bottom: 1px solid #f0f0f0;
                    transition: all 0.15s ease;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    ${isSelected ? 'background: rgba(201,168,76,0.12);' : ''}
                ">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 15px; color: #1a1410;">
                            ${item.name_ar}
                            ${item.matchType === 'alias' ? ' <span style="font-size: 11px; color: #e67e22;">(مرادف)</span>' : ''}
                        </div>
                        <div style="font-size: 12px; color: #888; margin-top: 2px;">
                            ${item.parent ? `📍 ${item.parent} → ` : ''}
                            <span style="
                                background: ${typeColor}20; 
                                color: ${typeColor}; 
                                padding: 1px 10px; 
                                border-radius: 12px; 
                                font-size: 11px;
                                font-weight: 600;
                            ">
                                ${typeLabel}
                            </span>
                        </div>
                    </div>
                    <div style="font-size: 12px; color: #888; direction: ltr; margin-right: 10px; flex-shrink: 0;">
                        ${item.name_en || '—'}
                    </div>
                </div>
            `;
        });
        
        this.dropdown.innerHTML = html;
        
        // ربط أحداث النقر
        this.dropdown.querySelectorAll('.autocomplete-item').forEach(el => {
            el.addEventListener('click', () => {
                const index = parseInt(el.dataset.index);
                if (this.suggestions[index]) {
                    this.selectSuggestion(this.suggestions[index]);
                }
            });
            
            el.addEventListener('mouseenter', () => {
                const index = parseInt(el.dataset.index);
                this.selectedIndex = index;
                this.highlightSuggestion();
            });
        });
        
        // تعيين الفهرس المحدد
        this.selectedIndex = -1;
    }

    // ===== تمييز العنصر المحدد =====
    highlightSuggestion() {
        const items = this.dropdown.querySelectorAll('.autocomplete-item');
        items.forEach((el, index) => {
            if (index === this.selectedIndex) {
                el.style.background = 'rgba(201,168,76,0.15)';
                el.scrollIntoView({ block: 'nearest' });
            } else {
                el.style.background = '';
            }
        });
    }

    // ===== اختيار اقتراح =====
    selectSuggestion(item) {
        this.input.value = item.name_ar;
        this.hasCorrection = true;
        
        if (this.enInput) {
            this.enInput.value = item.name_en || '';
        }
        
        this.dropdown.style.display = 'none';
        this.isOpen = false;
        this.input.focus();
        
        // إطلاق حدث مخصص
        this.input.dispatchEvent(new CustomEvent('area-selected', {
            detail: {
                id: item.id,
                name_ar: item.name_ar,
                name_en: item.name_en,
                type: item.type,
                parent: item.parent
            }
        }));
        
        console.log(`✅ تم اختيار: ${item.name_ar} (${item.name_en})`);
    }

    // ===== التصحيح التلقائي عند الخروج =====
    autoCorrect(value) {
        if (!this.matcher.isReady()) return;
        
        const correction = this.matcher.suggestCorrection(value);
        if (correction && correction.confidence >= 75) {
            // إذا كان التصحيح مختلفاً عن النص المدخل
            if (correction.suggested_ar !== value.trim()) {
                this.input.value = correction.suggested_ar;
                this.hasCorrection = true;
                
                if (this.enInput) {
                    this.enInput.value = correction.suggested_en;
                }
                
                console.log(`🔧 تم التصحيح: "${value}" → "${correction.suggested_ar}" (${correction.confidence}%)`);
            }
        }
    }

    // ===== الحصول على حالة جاهزية النظام =====
    isReady() {
        return this.matcher.isReady();
    }
}

// ============================================================
// 3. التهيئة التلقائية عند تحميل الصفحة
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 تهيئة نظام تصحيح المناطق...');
    
    // البحث عن حقل المنطقة في نموذج إضافة العقار
    const districtInput = document.getElementById('propertyDistrict');
    
    if (districtInput) {
        // البحث عن الحقل الإنجليزي (قد يكون موجوداً أو لا)
        let districtEnInput = document.getElementById('propertyDistrictEn');
        
        // تهيئة النظام
        const autocomplete = new AreaAutocompleteUI(districtInput, districtEnInput);
        
        // حفظ في window للوصول من أي مكان
        window.areaAutocomplete = autocomplete;
        
        console.log('✅ تم تهيئة نظام تصحيح وترجمة المناطق بنجاح');
    } else {
        console.warn('⚠️ لم يتم العثور على حقل المنطقة (propertyDistrict)');
    }
});

// ============================================================
// 4. دوال مساعدة للاستخدام العام
// ============================================================

// دالة للحصول على الاقتراحات من أي مكان
window.getAreaSuggestions = function(input, limit = 10) {
    if (window.areaAutocomplete && window.areaAutocomplete.matcher) {
        return window.areaAutocomplete.matcher.getSuggestions(input, limit);
    }
    return [];
};

// دالة للتصحيح من أي مكان
window.correctAreaName = function(input) {
    if (window.areaAutocomplete && window.areaAutocomplete.matcher) {
        return window.areaAutocomplete.matcher.suggestCorrection(input);
    }
    return null;
};

// دالة للحصول على جميع المحافظات
window.getGovernorates = function() {
    if (window.areaAutocomplete && window.areaAutocomplete.matcher) {
        return window.areaAutocomplete.matcher.getGovernorates();
    }
    return [];
};

console.log('📦 تم تحميل area-autocomplete.js');

// ============================================================
// دالة للتحقق من وجود ترجمة مباشرة
// ============================================================

function getTranslation(arabicText) {
    if (!arabicText) return null;
    const trimmed = arabicText.trim();
    
    // البحث في fullTranslationMap
    if (window.fullTranslationMap && window.fullTranslationMap[trimmed]) {
        return window.fullTranslationMap[trimmed];
    }
    
    // البحث في TRANSLATION_DB
    if (window.TRANSLATION_DB && window.TRANSLATION_DB[trimmed]) {
        return window.TRANSLATION_DB[trimmed];
    }
    
    return null;
}

// ✅ ربط الدالة بالـ window للاستخدام من أي مكان
window.getTranslation = getTranslation;