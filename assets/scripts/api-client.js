(function () {
  const config = window.EMS_STORE_CONFIG || {};

  function getApiBaseUrl() {
    if (!config.apiBaseUrl) {
      throw new Error('EMS_STORE_CONFIG.apiBaseUrl ontbreekt.');
    }
    return config.apiBaseUrl;
  }

  async function parseJsonResponse(response, methodLabel) {
    if (!response.ok) {
      throw new Error(`API ${methodLabel} fout: ${response.status}`);
    }

    const data = await response.json();
    const ok = data?.ok === true || data?.success === true;
    if (!ok) {
      throw new Error(data?.error || data?.message || `Onbekende API ${methodLabel} fout`);
    }
    return data.data ?? data;
  }

  async function apiGet(params) {
    const url = new URL(getApiBaseUrl());
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value != null) url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store'
    });

    return parseJsonResponse(response, 'GET');
  }

  async function apiPost(payload) {
    const response = await fetch(getApiBaseUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: new URLSearchParams({
        payload: JSON.stringify(payload || {})
      })
    });

    return parseJsonResponse(response, 'POST');
  }

  window.EMSApiClient = {
    apiGet,
    apiPost
  };
})();
