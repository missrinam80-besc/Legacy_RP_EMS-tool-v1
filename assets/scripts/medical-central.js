(function (global) {
  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function unique(values) {
    return [...new Set((values || []).filter(Boolean))];
  }

  function asArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string') {
      return value.split('|').map((part) => part.trim()).filter(Boolean);
    }
    return [];
  }

  function getItems(collection) {
    if (Array.isArray(collection)) return collection;
    if (Array.isArray(collection?.items)) return collection.items;
    return [];
  }

  function departmentAliases(department) {
    const value = normalize(department);
    const map = {
      chirurgie: ['chirurgie', 'surgery', 'spoed', 'ambulance'],
      psychologie: ['psychologie', 'psychology', 'algemeen'],
      revalidatie: ['revalidatie', 'ortho-revalidatie', 'ortho', 'algemeen'],
      'ortho-revalidatie': ['revalidatie', 'ortho-revalidatie', 'ortho', 'algemeen'],
      operatie: ['chirurgie', 'surgery', 'spoed', 'ambulance'],
      spoed: ['spoed', 'ambulance', 'algemeen'],
      ambulance: ['ambulance', 'spoed', 'algemeen'],
      forensisch: ['forensisch', 'algemeen'],
      labo: ['labo', 'algemeen']
    };

    return unique([value, ...(map[value] || []), 'algemeen', 'general']);
  }

  function departmentMatch(recordDepartments, department) {
    const aliases = departmentAliases(department);
    const values = Array.isArray(recordDepartments)
      ? recordDepartments.map(normalize)
      : asArray(recordDepartments).map(normalize);

    if (!values.length) return true;
    return values.some((value) => aliases.includes(value));
  }

  function documentTypeMatch(documentTypes, documentType) {
    if (!documentType) return true;
    const values = Array.isArray(documentTypes) ? documentTypes : asArray(documentTypes);
    if (!values.length) return true;
    return values.map(normalize).includes(normalize(documentType));
  }

  function truthy(value, fallback = true) {
    if (value == null) return fallback;
    if (typeof value === 'boolean') return value;
    return normalize(value) !== 'false';
  }

  function compare(actual, operator, expected) {
    const op = normalize(operator || 'equals');
    const actualNorm = normalize(actual);
    const expectedNorm = normalize(expected);

    if (op === 'equals') return actualNorm === expectedNorm;
    if (op === 'not_equals') return actualNorm !== expectedNorm;
    if (op === 'contains' || op === 'includes') return actualNorm.includes(expectedNorm);
    if (op === 'in') {
      return asArray(expected).map(normalize).includes(actualNorm);
    }
    if (op === 'any' || op === 'exists') return actualNorm.length > 0;
    return false;
  }

  async function getType(type) {
    if (!global.EMSAdminStore) return null;
    try {
      return await global.EMSAdminStore.get(type);
    } catch (error) {
      console.warn(`Kon centraal configtype ${type} niet laden.`, error);
      return null;
    }
  }

  async function loadContext({ department, documentType } = {}) {
    const [prices, medication, injuries, treatmentRules] = await Promise.all([
      getType('prices'),
      getType('medication'),
      getType('injuries'),
      getType('treatmentRules')
    ]);

    const centralPrices = getItems(prices).filter((item) =>
      truthy(item.active) &&
      departmentMatch(item.department ? [item.department] : item.departments, department) &&
      documentTypeMatch(item.documentTypes, documentType)
    );

    const centralMedication = getItems(medication).filter((item) =>
      truthy(item.active) && departmentMatch(item.departments, department)
    );

    const centralInjuries = getItems(injuries).filter((item) => truthy(item.active));

    const centralTreatmentRules = getItems(treatmentRules).filter((item) => {
      if (!truthy(item.active)) return false;
      const dept = item.department || item.departments;
      if (!dept) return true;
      return departmentMatch(Array.isArray(dept) ? dept : [dept], department);
    });

    return {
      prices: centralPrices,
      medication: centralMedication,
      injuries: centralInjuries,
      treatmentRules: centralTreatmentRules
    };
  }

  function getCostRows(prices) {
    return (prices || []).map((item) => ({
      label: item.label || item.name || item.code || 'Kost',
      amount: Number(item.defaultPrice ?? item.price ?? 0),
      source: 'central'
    }));
  }

  function getMedicationNames(medication) {
    return unique((medication || []).map((item) => item.name).filter(Boolean));
  }

  function getAidNames(medication) {
    return unique((medication || [])
      .filter((item) => {
        const type = normalize(item.type);
        const category = normalize(item.category);
        return type === 'hulpmiddel' || /brace|kruk|rolstoel|immobil|spalk/.test(category + ' ' + normalize(item.name));
      })
      .map((item) => item.name)
      .filter(Boolean));
  }

  function getInjuryLabels(injuries) {
    return unique((injuries || []).map((item) => item.label).filter(Boolean));
  }

  function evaluateRules(rules, state) {
    return (rules || [])
      .filter((rule) => {
        const field = rule.conditionField || rule.field;
        if (!field) return false;
        return compare(state?.[field], rule.operator, rule.conditionValue);
      })
      .sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));
  }

  function formatAdvice(rule) {
    const value = rule.adviceValue || rule.label || rule.notes || 'extra aandacht';
    const type = normalize(rule.adviceType);
    if (type === 'treatment') return `Behandeling: ${value}`;
    if (type === 'medication') return `Medicatie: ${value}`;
    if (type === 'warning') return `Waarschuwing: ${value}`;
    if (type === 'imaging') return `Onderzoek: ${value}`;
    return value;
  }

  global.EMSMedicalCentral = {
    loadContext,
    getCostRows,
    getMedicationNames,
    getAidNames,
    getInjuryLabels,
    evaluateRules,
    formatAdvice,
    unique
  };
})(window);
