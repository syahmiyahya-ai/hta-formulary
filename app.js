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
        theme: 'dark'
    };

    // DOM Cache
    const searchInput = document.getElementById('searchInput');
    const prescriberFilters = document.getElementById('prescriberFilters');
    const pedsFilterBtn = document.getElementById('pedsFilterBtn');
    const ehisFilterBtn = document.getElementById('ehisFilterBtn');
    const drugList = document.getElementById('drugList');
    const matchCount = document.getElementById('matchCount');
    const dbStats = document.getElementById('dbStats');
    const themeToggle = document.getElementById('themeToggle');
    
    // Profile DOM Cache
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

    // Initialize stats
    dbStats.textContent = `${state.drugs.length} Drugs Loaded`;

    // Initialize app
    applyFilters();

    // Event Listeners
    searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value.toLowerCase().trim();
        applyFilters();
    });

    prescriberFilters.addEventListener('click', (e) => {
        const target = e.target;
        if (!target.classList.contains('chip')) return;
        
        prescriberFilters.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        target.classList.add('active');
        
        state.filters.prescriber = target.getAttribute('data-filter');
        applyFilters();
    });

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

    // Apply Filters & Render
    function applyFilters() {
        state.filteredDrugs = state.drugs.filter(drug => {
            const matchesSearch = !state.filters.search || 
                drug.name.toLowerCase().includes(state.filters.search) || 
                drug.indications.toLowerCase().includes(state.filters.search);
                
            const matchesPrescriber = state.filters.prescriber === 'all' || 
                drug.prescriber === state.filters.prescriber ||
                (state.filters.prescriber === 'C' && (drug.prescriber === 'C' || drug.prescriber === 'C+'));
                
            const matchesPeds = !state.filters.pedsOnly || drug.has_peds_dose;
            const matchesEhis = !state.filters.ehisOnly || drug.name_ehis === '✓';
            
            return matchesSearch && matchesPrescriber && matchesPeds && matchesEhis;
        });

        matchCount.textContent = state.filteredDrugs.length;
        renderList();
    }

    // Render list (Limit to top 100 for high performance)
    function renderList() {
        drugList.innerHTML = '';
        const itemsToRender = state.filteredDrugs.slice(0, 100);
        
        if (itemsToRender.length === 0) {
            drugList.innerHTML = '<div class="no-results">No drugs match the filters.</div>';
            return;
        }

        itemsToRender.forEach(drug => {
            const card = document.createElement('div');
            card.className = `drug-card ${state.selectedDrug && state.selectedDrug.no === drug.no ? 'active' : ''}`;
            
            const classPrescriber = drug.prescriber.replace('*', '-star').replace('+', '');
            
            card.innerHTML = `
                <div class="card-header-main">
                    <div class="card-name">${drug.name}</div>
                    <span class="card-prescriber p-${classPrescriber}">${drug.prescriber}</span>
                </div>
                <div class="card-indication">${drug.indications || 'No indications listed.'}</div>
                <div class="card-badges">
                    ${drug.has_peds_dose ? '<span class="badge-mini peds">👶 Peds</span>' : ''}
                    ${drug.name_ehis === '✓' ? '<span class="badge-mini">🖥️ e-HIS</span>' : ''}
                </div>
            `;
            
            card.addEventListener('click', () => selectDrug(drug));
            drugList.appendChild(card);
        });
    }

    // Select and Display Drug Detail
    function selectDrug(drug) {
        state.selectedDrug = drug;
        document.querySelector('.app-container').classList.add('has-selection');
        
        // Highlight active card
        const cards = drugList.querySelectorAll('.drug-card');
        const index = state.filteredDrugs.indexOf(drug);
        cards.forEach((c, i) => {
            c.classList.toggle('active', state.filteredDrugs[i] && state.filteredDrugs[i].no === drug.no);
        });

        // Toggle visibility
        noSelectionState.classList.add('hidden');
        drugProfile.classList.remove('hidden');

        // Map content
        detailName.textContent = drug.name;
        detailPrescriber.textContent = drug.prescriber;
        detailPrescriber.className = `prescriber-badge card-prescriber p-${drug.prescriber.replace('*', '-star').replace('+', '')}`;
        
        detailEhis.textContent = drug.name_ehis === '✓' ? '✓ e-HIS Integrated' : '⚠️ Not in e-HIS';
        detailEhis.style.color = drug.name_ehis === '✓' ? 'var(--brand-teal)' : 'var(--accent-orange)';
        
        detailDiscipline.textContent = drug.discipline || 'General ED';
        detailIndications.textContent = drug.indications || 'No specific indications recorded.';
        detailDose.textContent = drug.dose || 'No dosage instructions recorded.';
        
        detailScreening.textContent = drug.screening || 'None';
        detailUkk.textContent = drug.ukk || 'None';
        detailRemarks.textContent = drug.remarks || 'None';

        // Show/hide priority guide section
        if (drug.priority_guide) {
            priorityGuideSection.classList.remove('hidden');
            detailPriorityGuide.textContent = drug.priority_guide;
        } else {
            priorityGuideSection.classList.add('hidden');
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
        
        // Find "X mg/kg" or "X mcg/kg" or "X microgram/kg"
        const mgRegex = /(\d+(?:\.\d+)?)\s*(mg|mcg|microgram)\/kg/gi;
        const matches = [];
        let match;
        
        while ((match = mgRegex.exec(doseText)) !== null) {
            const val = parseFloat(match[1]);
            const unit = match[2].toLowerCase() === 'mg' ? 'mg/kg' : 'mcg/kg';
            
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

    // Calculate paediatric dose
    function calculatePediatricDose() {
        const weight = parseFloat(childWeight.value);
        const multiplier = parseFloat(doseMultiplier.value);
        const unit = multiplierUnit.value;

        if (isNaN(weight) || weight <= 0 || isNaN(multiplier) || multiplier <= 0) {
            calculatedDose.textContent = '-';
            calculatedUnit.textContent = unit === 'mg/kg' ? 'mg' : 'mcg';
            calculatedFormula.textContent = 'Enter weight & multiplier to compute.';
            return;
        }

        const rawDose = weight * multiplier;
        let formattedDose = rawDose.toFixed(2);
        
        // Clean trailing zeros for round numbers
        if (formattedDose.endsWith('.00')) {
            formattedDose = rawDose.toFixed(0);
        } else if (formattedDose.endsWith('0')) {
            formattedDose = rawDose.toFixed(1);
        }

        const outUnit = unit === 'mg/kg' ? 'mg' : 'mcg';
        calculatedDose.textContent = formattedDose;
        calculatedUnit.textContent = outUnit;
        calculatedFormula.textContent = `${weight.toFixed(1)} kg × ${multiplier} ${unit} = ${formattedDose} ${outUnit}`;
    }
});
