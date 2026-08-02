// HTA Formulary App Logic
document.addEventListener('DOMContentLoaded', () => {
    // State management
    const state = {
        drugs: typeof DRUGS_DATA !== 'undefined' ? DRUGS_DATA : [],
        filteredDrugs: [],
        selectedDrug: null,
        filters: {
            search: '',
            prescriber: 'all',
            pedsOnly: false,
            ehisOnly: false
        },
        theme: 'light'
    };

    // DOM Cache
    const searchInput = document.getElementById('searchInput');
    const prescriberSelect = document.getElementById('prescriberSelect');
    const pedsFilterBtn = document.getElementById('pedsFilterBtn');
    const ehisFilterBtn = document.getElementById('ehisFilterBtn');
    const drugList = document.getElementById('drugList');
    const matchCount = document.getElementById('matchCount');
    const dbStats = document.getElementById('dbStats');
    const themeToggle = document.getElementById('themeToggle');
    
    // Profile DOM Cache
    const viewerPane = document.getElementById('viewerPane');
    const noSelectionState = document.getElementById('noSelectionState');
    const drugProfile = document.getElementById('drugProfile');
    const detailName = document.getElementById('detailName');
    const detailPrescriber = document.getElementById('detailPrescriber');
    const detailEhis = document.getElementById('detailEhis');
    const detailDiscipline = document.getElementById('detailDiscipline');
    const detailIndications = document.getElementById('detailIndications');
    const detailDose = document.getElementById('detailDose');
    const detailScreening = document.getElementById('detailScreening');
    const detailUkk = document.getElementById('detailUkk');
    const detailRemarks = document.getElementById('detailRemarks');
    
    // Calc DOM Cache
    const childWeight = document.getElementById('childWeight');
    const doseMultiplier = document.getElementById('doseMultiplier');
    const multiplierUnit = document.getElementById('multiplierUnit');
    const calculatedDose = document.getElementById('calculatedDose');
    const calculatedUnit = document.getElementById('calculatedUnit');
    const calculatedFormula = document.getElementById('calculatedFormula');
    const suggestedMultipliers = document.getElementById('suggestedMultipliers');
    const suggestedMultipliersSection = document.getElementById('suggestedMultipliersSection');
    
    // Warnings DOM Cache
    const clinicalWarning = document.getElementById('clinicalWarning');
    const warningText = document.getElementById('warningText');
    const mobileBackBtn = document.getElementById('mobileBackBtn');
    
    // Priority Guide DOM Cache
    const priorityGuideSection = document.getElementById('priorityGuideSection');
    const detailPriorityGuide = document.getElementById('detailPriorityGuide');

    // Helper functions
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getPrescriberBadgeClass(prescriber) {
        if (!prescriber) return 'p-default';
        const p = prescriber.trim();
        if (p.startsWith('A*')) return 'p-A-star';
        if (p.startsWith('A')) return 'p-A';
        if (p.startsWith('B')) return 'p-B';
        if (p.startsWith('C')) return 'p-C';
        if (p.startsWith('UKK')) return 'p-UKK';
        return 'p-default';
    }

    // Initialize app
    applyFilters();

    // Event Listeners
    searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value.toLowerCase().trim();
        applyFilters();
    });

    if (prescriberSelect) {
        prescriberSelect.addEventListener('change', (e) => {
            state.filters.prescriber = e.target.value;
            applyFilters();
        });
    }

    pedsFilterBtn.addEventListener('click', () => {
        pedsFilterBtn.classList.toggle('active');
        state.filters.pedsOnly = pedsFilterBtn.classList.contains('active');
        applyFilters();
    });

    ehisFilterBtn.addEventListener('click', () => {
        ehisFilterBtn.classList.toggle('active');
        state.filters.ehisOnly = ehisFilterBtn.classList.contains('active');
        applyFilters();
    });

    themeToggle.addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.body.className = state.theme === 'dark' ? 'dark-theme' : 'light-theme';
        themeToggle.textContent = state.theme === 'dark' ? '🌙' : '☀️';
    });

    // Inputs for Calculator
    childWeight.addEventListener('input', calculatePediatricDose);
    doseMultiplier.addEventListener('input', calculatePediatricDose);
    multiplierUnit.addEventListener('change', calculatePediatricDose);

    mobileBackBtn.addEventListener('click', () => {
        state.selectedDrug = null;
        document.querySelector('.app-container').classList.remove('has-selection');
        drugList.querySelectorAll('.drug-card').forEach(c => c.classList.remove('active'));
    });

    // Apply Filters & Render (Smooth In-Place Filtering)
    function applyFilters() {
        state.filteredDrugs = state.drugs.filter(drug => {
            const matchesSearch = !state.filters.search || 
                drug.name.toLowerCase().includes(state.filters.search) || 
                (drug.indications && drug.indications.toLowerCase().includes(state.filters.search));
                
            const drugP = drug.prescriber || '';
            let matchesPrescriber = false;
            if (state.filters.prescriber === 'all') {
                matchesPrescriber = true;
            } else if (state.filters.prescriber === 'A*') {
                matchesPrescriber = drugP.startsWith('A*');
            } else if (state.filters.prescriber === 'A') {
                matchesPrescriber = drugP === 'A' || drugP.startsWith('A\n') || drugP.startsWith('A/');
            } else if (state.filters.prescriber === 'B') {
                matchesPrescriber = drugP.startsWith('B');
            } else if (state.filters.prescriber === 'C') {
                matchesPrescriber = drugP.startsWith('C');
            } else if (state.filters.prescriber === 'UKK') {
                matchesPrescriber = drugP.includes('UKK');
            }
                
            const matchesPeds = !state.filters.pedsOnly || drug.has_peds_dose;
            const matchesEhis = !state.filters.ehisOnly || drug.name_ehis === '✓';
            
            return matchesSearch && matchesPrescriber && matchesPeds && matchesEhis;
        });

        if (matchCount) matchCount.textContent = state.filteredDrugs.length;
        renderList();
    }

    // Material 3 Touch Ripple Effect Handler
    function attachRipple(element) {
        if (!element) return;
        element.classList.add('md-ripple');
        element.addEventListener('pointerdown', (e) => {
            const circle = document.createElement('span');
            const diameter = Math.max(element.clientWidth, element.clientHeight);
            const radius = diameter / 2;
            const rect = element.getBoundingClientRect();

            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${e.clientX - rect.left - radius}px`;
            circle.style.top = `${e.clientY - rect.top - radius}px`;
            circle.className = 'md-ripple-effect';

            const existing = element.querySelector('.md-ripple-effect');
            if (existing) existing.remove();

            element.appendChild(circle);
            setTimeout(() => circle.remove(), 600);
        });
    }

    // Attach ripple to static buttons
    [pedsFilterBtn, ehisFilterBtn, themeToggle].forEach(btn => attachRipple(btn));

    // Render list (Limit to top 100 for high performance)
    function renderList() {
        drugList.innerHTML = '';
        const itemsToRender = state.filteredDrugs.slice(0, 100);
        
        if (itemsToRender.length === 0) {
            drugList.innerHTML = '<div class="no-results">No drugs match the search query.</div>';
            return;
        }

        itemsToRender.forEach((drug, index) => {
            const card = document.createElement('div');
            card.className = `drug-card md-ripple ${state.selectedDrug && state.selectedDrug.no === drug.no ? 'active' : ''}`;
            
            const badgeClass = getPrescriberBadgeClass(drug.prescriber);
            const indicationText = drug.indications ? drug.indications.replace(/\r?\n|\r/g, ' ') : 'No specific indication recorded.';
            const displayPrescriber = drug.prescriber ? drug.prescriber.split('\n')[0] : '';
            
            card.innerHTML = `
                <div class="card-top-row">
                    <span class="card-name" title="${escapeHtml(drug.name)}">${escapeHtml(drug.name)}</span>
                    <span class="card-prescriber ${badgeClass}">${escapeHtml(displayPrescriber)}</span>
                </div>
                <div class="card-indication" title="${escapeHtml(indicationText)}">${escapeHtml(indicationText)}</div>
                <div class="card-badges">
                    ${drug.has_peds_dose ? '<span class="badge-mini peds">👶 Peds</span>' : ''}
                    ${drug.name_ehis === '✓' ? '<span class="badge-mini ehis">🖥️ e-HIS</span>' : ''}
                </div>
            `;
            
            attachRipple(card);
            card.addEventListener('click', () => selectDrug(drug, true));
            drugList.appendChild(card);
        });
    }

    // Select and Display Drug Detail (isUserClick controls screen switching)
    function selectDrug(drug, isUserClick = true) {
        if (!drug) return;
        state.selectedDrug = drug;

        // Reset scroll position to top when a new drug is selected
        if (viewerPane) {
            viewerPane.scrollTop = 0;
        }

        if (isUserClick) {
            document.querySelector('.app-container').classList.add('has-selection');
        }
        
        // Highlight active card
        const cards = drugList.querySelectorAll('.drug-card');
        cards.forEach(c => c.classList.remove('active'));
        const index = state.filteredDrugs.findIndex(d => d.no === drug.no);
        if (index >= 0 && cards[index]) {
            cards[index].classList.add('active');
        }

        // Toggle visibility
        drugProfile.classList.remove('hidden');

        // Map content safely
        const prescriberRaw = drug.prescriber || '';
        detailName.textContent = drug.name || 'Unknown Drug';
        detailPrescriber.textContent = prescriberRaw.split('\n')[0] || 'General';
        detailPrescriber.className = `prescriber-badge card-prescriber ${getPrescriberBadgeClass(prescriberRaw)}`;
        
        detailEhis.textContent = drug.name_ehis === '✓' ? '✓ e-HIS Integrated' : '⚠️ Not in e-HIS';
        detailEhis.style.color = drug.name_ehis === '✓' ? 'var(--brand-teal)' : 'var(--accent-orange)';
        
        detailDiscipline.textContent = drug.discipline || 'General ED';
        detailIndications.textContent = drug.indications || 'No specific indications recorded.';
        detailDose.innerHTML = formatDoseText(drug.dose || 'No dosage instructions recorded.');
        
        detailScreening.textContent = drug.screening || 'None';
        detailUkk.textContent = drug.ukk || 'None';
        detailRemarks.textContent = drug.remarks || 'None';

        // Populate Priority Paediatric Guide card (Hospital Tunku Azizah) - ALWAYS VISIBLE
        const guideText = drug.priority_guide || 
            (drug.peds_dose_notes ? drug.peds_dose_notes : null) || 
            (drug.dose ? drug.dose : null);

        if (priorityGuideSection) {
            priorityGuideSection.classList.remove('hidden');
            priorityGuideSection.style.display = 'flex';
        }
        if (detailPriorityGuide) {
            detailPriorityGuide.innerHTML = guideText ? formatDoseText(guideText) : '<p class="dose-paragraph"><span class="text-muted">Standard Hospital Tunku Azizah formulary entry. Refer to approved paediatric guidelines below or consult Paediatric ED / Clinical Pharmacy.</span></p>';
        }

        // Scan for Clinical Warnings
        scanClinicalWarnings(drug);

        // Scan for Suggested Multipliers
        scanMultipliers(drug);

        // Reset and calculate
        calculatePediatricDose();
    }

    // Auto scan for warnings in dose text
    function scanClinicalWarnings(drug) {
        const doseText = (drug.dose || '').toLowerCase();
        const indicationsText = (drug.indications || '').toLowerCase();
        const remarksText = (drug.remarks || '').toLowerCase();
        
        const combined = `${doseText} ${indicationsText} ${remarksText}`;
        
        const warnings = [];
        
        if (combined.includes('not recommended in children') || combined.includes('not recommended for children') || combined.includes('use in children under') && combined.includes('not recommended')) {
            warnings.push("Paediatric Safety: Not recommended or contraindicated in certain pediatric age groups.");
        }
        if (combined.includes('renal impairment') || combined.includes('renal failure')) {
            warnings.push("Renal Adjustment: Requires renal monitoring or dose adjustments.");
        }
        if (combined.includes('neonat') || combined.includes('infant')) {
            warnings.push("Neonatal Warning: High risk population. Verify exact age-appropriate guidelines before prescribing.");
        }
        if (combined.includes('max') || combined.includes('maximum')) {
            // Find possible max values e.g. max 50mg/day
            const maxMatch = drug.dose.match(/max(?:imum)?\.?\s*(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml)(?:\/day|\/dose)?)/i);
            if (maxMatch) {
                warnings.push(`Dose Limit: Maximum dose warning detected: ${maxMatch[1]}`);
            }
        }

        if (warnings.length > 0) {
            clinicalWarning.classList.remove('hidden');
            warningText.innerHTML = warnings.map(w => `• ${w}`).join('<br>');
        } else {
            clinicalWarning.classList.add('hidden');
        }
    }

    // Auto extract multipliers from dose instructions
    function scanMultipliers(drug) {
        suggestedMultipliers.innerHTML = '';
        
        const doseText = (drug.dose || '') + '\n' + (drug.priority_guide || '');
        
        // Find "X mg/kg", "X mcg/kg", "X u/kg", "X MU/kg" (supporting commas like 25,000)
        const mgRegex = /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(mg|mcg|microgram|u|units|mu|mega\s*units?)\/kg/gi;
        const matches = [];
        let match;
        
        while ((match = mgRegex.exec(doseText)) !== null) {
            const val = parseFloat(match[1].replace(/,/g, ''));
            const unitType = match[2].toLowerCase();
            const unit = unitType.includes('mg') ? 'mg/kg' :
                         (unitType.includes('mcg') || unitType.includes('micro')) ? 'mcg/kg' :
                         (unitType.includes('mu') || unitType.includes('mega')) ? 'MU/kg' : 'u/kg';
            
            // Avoid duplicates
            const isDuplicate = matches.some(m => m.val === val && m.unit === unit);
            if (!isDuplicate) {
                matches.push({ val, unit });
            }
        }

        if (matches.length > 0) {
            suggestedMultipliersSection.classList.remove('hidden');
            matches.forEach(m => {
                const chip = document.createElement('span');
                chip.className = 'suggested-chip';
                chip.textContent = `${m.val} ${m.unit}`;
                chip.addEventListener('click', () => {
                    doseMultiplier.value = m.val;
                    multiplierUnit.value = m.unit;
                    calculatePediatricDose();
                });
                suggestedMultipliers.appendChild(chip);
            });
        } else {
            suggestedMultipliersSection.classList.add('hidden');
        }
    }

    function detectDivisor(text) {
        if (!text) return 1;
        const lower = text.toLowerCase();
        
        // Match: "divided into 3 doses", "in 2 divided doses", "divided in 4", "divided q6h", etc.
        const dividedDosesRegex = /(?:in|into|giving|given\s+in)?\s*(\d+)\s+divided\s+doses?/i;
        const dividedInRegex = /divided\s+(?:in|into)\s*(\d+)/i;
        
        let match = lower.match(dividedDosesRegex);
        if (match) return parseInt(match[1], 10);
        
        match = lower.match(dividedInRegex);
        if (match) return parseInt(match[1], 10);
        
        // Interval matching
        if (lower.match(/q6h|every\s+6\s*h|6\s*hourly|divided\s+q6h/i)) return 4;
        if (lower.match(/q8h|every\s+8\s*h|8\s*hourly|divided\s+q8h/i)) return 3;
        if (lower.match(/q12h|every\s+12\s*h|12\s*hourly|twice\s+daily|divided\s+q12h/i)) return 2;
        if (lower.match(/q4h|every\s+4\s*h|4\s*hourly|divided\s+q4h/i)) return 6;

        // Word number matching
        if (lower.match(/two\s+divided\s+doses/i)) return 2;
        if (lower.match(/three\s+divided\s+doses/i)) return 3;
        if (lower.match(/four\s+divided\s+doses/i)) return 4;
        if (lower.match(/six\s+divided\s+doses/i)) return 6;
        
        return 1;
    }

    // Calculate paediatric dose
    function calculatePediatricDose() {
        const weight = parseFloat(childWeight.value);
        const multiplier = parseFloat(doseMultiplier.value);
        const unit = multiplierUnit.value;
        const calcResult = document.getElementById('calcResult');
        const resultLabel = document.querySelector('.result-label');

        if (isNaN(weight) || weight <= 0 || isNaN(multiplier) || multiplier <= 0) {
            calculatedDose.textContent = '-';
            calculatedUnit.textContent = unit === 'mg/kg' ? 'mg' : 
                                         unit === 'mcg/kg' ? 'mcg' : 
                                         unit === 'u/kg' ? 'units' : 'MU';
            calculatedFormula.textContent = 'Enter weight & multiplier to compute.';
            if (calcResult) calcResult.classList.remove('has-result');
            if (resultLabel) resultLabel.textContent = 'Calculated Single Dose';
            return;
        }

        const totalDose = weight * multiplier;
        
        // Detect divisor for divided doses
        let divisor = 1;
        if (state.selectedDrug) {
            const combinedText = `${state.selectedDrug.priority_guide || ''} ${state.selectedDrug.dose || ''} ${state.selectedDrug.peds_dose_notes || ''}`;
            divisor = detectDivisor(combinedText);
        }

        const singleDose = totalDose / divisor;
        let formattedDose = singleDose.toFixed(2);
        
        // Clean trailing zeros for round numbers
        if (formattedDose.endsWith('.00')) {
            formattedDose = singleDose.toFixed(0);
        } else if (formattedDose.endsWith('0')) {
            formattedDose = singleDose.toFixed(1);
        }

        const outUnit = unit === 'mg/kg' ? 'mg' : 
                        unit === 'mcg/kg' ? 'mcg' : 
                        unit === 'u/kg' ? 'units' : 'MU';
        calculatedDose.textContent = formattedDose;
        calculatedUnit.textContent = outUnit;

        if (divisor > 1) {
            let totalFormatted = totalDose.toFixed(2);
            if (totalFormatted.endsWith('.00')) totalFormatted = totalDose.toFixed(0);
            else if (totalFormatted.endsWith('0')) totalFormatted = totalDose.toFixed(1);
            
            calculatedFormula.textContent = `${weight.toFixed(1)} kg × ${multiplier} ${unit} = ${totalFormatted} ${outUnit}/day (divided into ${divisor} doses of ${formattedDose} ${outUnit})`;
            if (resultLabel) resultLabel.textContent = `Calculated Single Dose (1/${divisor})`;
        } else {
            calculatedFormula.textContent = `${weight.toFixed(1)} kg × ${multiplier} ${unit} = ${formattedDose} ${outUnit}`;
            if (resultLabel) resultLabel.textContent = 'Calculated Single Dose';
        }
        
        if (calcResult) calcResult.classList.add('has-result');
    }

    // Format lengthy clinical texts into structured elements
    function formatDoseText(text) {
        if (!text) return '<span class="text-muted">No instructions recorded.</span>';
        
        const lines = text.split('\n');
        let html = '';
        let inList = false;
        
        lines.forEach(line => {
            let trimmed = line.trim();
            if (!trimmed) return;
            
            // Highlight weight patterns first
            trimmed = trimmed.replace(/(\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*kg\b)/gi, '<strong class="highlight-weight">$1</strong>');
            
            // Highlight doses e.g. 15mg/kg, 500mg, 25,000 u/kg, 2g/DAY
            trimmed = trimmed.replace(/(\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:mg|g|mcg|microgram|ml|u|mu|units?|mega\s*units?)(?:\/kg|\/dose|\/day)?\b)/gi, '<strong class="highlight-dose">$1</strong>');
            
            // Check for section headers (Adult, Children, Suppository, Oral, IV, Loading, Maintenance, etc.)
            const headerMatch = trimmed.match(/^(adults?|children|neonates?|infants?|indications?|contraindications?|precautions?|suppository|oral|iv|loading|maintenance|treatment|prophylaxis|syrup|tablet|atypical infection|pertussis|pneumonia|tonsillitis\/pharyngitis|acute otitis media|c\.difficile|severe infection|mild infection|rules|requirements):/i);
            
            if (trimmed.endsWith(':') || headerMatch) {
                if (inList) {
                    html += '</ul>';
                    inList = false;
                }
                html += `<h5 class="dose-section-header">${trimmed}</h5>`;
            } 
            // Check for list items
            else if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.match(/^(?:[a-z\d]+\.|\([a-z\d]+\))/i)) {
                if (!inList) {
                    html += '<ul class="dose-list">';
                    inList = true;
                }
                const cleanLine = trimmed.replace(/^([•\-]+|\([a-z\d]+\)|[a-z\d]+\.)\s*/, '');
                html += `<li>${cleanLine}</li>`;
            } 
            // Plain text line
            else {
                if (inList) {
                    html += '</ul>';
                    inList = false;
                }
                html += `<p class="dose-paragraph">${trimmed}</p>`;
            }
        });
        
        if (inList) {
            html += '</ul>';
        }
        
        return html;
    }
});
