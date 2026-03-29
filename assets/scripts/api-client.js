(function () {
  const config = window.EMS_STORE_CONFIG || {};

  function getApiBaseUrl() {
    if (!config.apiBaseUrl) {
      throw new Error('EMS_STORE_CONFIG.apiBaseUrl ontbreekt.');
    }
    return config.apiBaseUrl;
  }

  async function apiGet(params) {
    const url = new URL(getApiBaseUrl());
    Object.entries(params || {}).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`API GET fout: ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || 'Onbekende API GET fout');
    }

    return data.data;
  }

  async function apiPost(payload) {
    const response = await fetch(getApiBaseUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: new URLSearchParams({
        payload: JSON.stringify(payload)
      })
    });

    if (!response.ok) {
      throw new Error(`API POST fout: ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || 'Onbekende API POST fout');
    }

    return data.data;
  }

  window.EMSApiClient = {
    apiGet,
    apiPost
  };
})();