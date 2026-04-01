(function (global) {
  function getValue(id) {
    const element = document.getElementById(id);
    return element ? String(element.value || '').trim() : '';
  }

  function formatLabelValue(label, value) {
    return `${label}: ${value || '-'}`;
  }

  function joinLines(lines) {
    return lines.filter((line) => line !== null && line !== undefined).join('\n');
  }

  function buildBlock(title, value) {
    return joinLines([title, value || '-', '']);
  }

  function createRequestForm(options) {
    const form = document.getElementById(options.formId || 'requestForm');
    const generateBtn = document.getElementById(options.generateBtnId || 'generateBtn');
    const copyBtn = document.getElementById(options.copyBtnId || 'copyBtn');
    const output = document.getElementById(options.outputId || 'output');
    const statusBox = document.getElementById(options.statusId || 'requestStatus');

    if (!form || !generateBtn || !copyBtn || !output || !statusBox || typeof options.buildSummary !== 'function') {
      return null;
    }

    const setStatus = (message) => {
      statusBox.textContent = message;
    };

    generateBtn.addEventListener('click', () => {
      output.value = options.buildSummary({ getValue, formatLabelValue, joinLines, buildBlock });
      setStatus(options.generatedMessage || 'Samenvatting gegenereerd.');
    });

    copyBtn.addEventListener('click', async () => {
      if (!output.value.trim()) {
        setStatus(options.emptyCopyMessage || 'Er is nog geen tekst om te kopiëren.');
        return;
      }

      try {
        await navigator.clipboard.writeText(output.value);
        setStatus(options.copiedMessage || 'Tekst gekopieerd naar het klembord.');
      } catch (error) {
        console.warn('Kopiëren mislukt.', error);
        setStatus(options.copyErrorMessage || 'Kopiëren is niet gelukt.');
      }
    });

    form.addEventListener('reset', () => {
      setTimeout(() => {
        output.value = '';
        setStatus(options.resetMessage || 'Formulier werd gereset.');
      }, 0);
    });

    return { form, output, statusBox, setStatus, getValue };
  }

  global.EMSRequestForm = {
    create: createRequestForm,
    getValue,
    formatLabelValue,
    joinLines,
    buildBlock
  };
})(window);
