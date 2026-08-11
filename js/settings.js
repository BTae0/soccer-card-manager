/* ================================================
   Settings Module - Backup, Restore, Theme
   ================================================ */

const Settings = (() => {

  function init() {
    // Export
    document.getElementById('btn-export').addEventListener('click', exportData);

    // Import
    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('import-file-input').click();
    });
    document.getElementById('import-file-input').addEventListener('change', importData);

    // Clear data
    document.getElementById('btn-clear-data').addEventListener('click', clearData);

    // Dark mode toggle
    document.getElementById('toggle-dark-mode').addEventListener('change', (e) => {
      const isDark = e.target.checked;
      document.body.classList.toggle('light-mode', !isDark);
      localStorage.setItem('darkMode', isDark);
    });

    // Default currency
    document.getElementById('default-currency').addEventListener('change', (e) => {
      localStorage.setItem('defaultCurrency', e.target.value);
      App.toast(`기본 통화가 ${e.target.value}로 변경되었습니다`);
    });
  }

  async function exportData() {
    try {
      const data = await DB.exportData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `soccer-cards-backup-${date}.json`;
      a.click();

      URL.revokeObjectURL(url);
      App.toast('백업 파일이 다운로드되었습니다');
    } catch (err) {
      App.toast('내보내기 중 오류가 발생했습니다', 'error');
      console.error(err);
    }
  }

  async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const confirmed = await App.confirm('기존 데이터를 덮어쓰고 백업 파일에서 복원하시겠습니까?');
    if (!confirmed) {
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await DB.importData(data);

      App.toast('데이터가 복원되었습니다');

      // Refresh current view
      Dashboard.refresh();
      Collection.refresh();
      Purchases.refresh();
    } catch (err) {
      App.toast('복원 중 오류가 발생했습니다: ' + err.message, 'error');
      console.error(err);
    }

    e.target.value = '';
  }

  async function clearData() {
    const confirmed = await App.confirm('⚠️ 모든 데이터가 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.\n\n정말 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
      await DB.clearAllData();
      App.toast('모든 데이터가 삭제되었습니다');
      Dashboard.refresh();
      Collection.refresh();
      Purchases.refresh();
      Analytics.refresh();
    } catch (err) {
      App.toast('삭제 중 오류가 발생했습니다', 'error');
      console.error(err);
    }
  }

  return { init };
})();
