(function() {
  "use strict";

  // ---------- 配置 ----------
  const SLEEP_HOURS_PER_DAY = 8;          // 每天睡眠小时数
  const UPDATE_INTERVAL_MS = 1000;        // 1秒刷新

  // 各组总时长 (原始小时)
  const TOTAL_WEEKS = 12;                 // 12周
  const TOTAL_HOURS_72 = 72;              // 72小时
  const TOTAL_HOURS_12 = 12;              // 12小时

  // 周转小时
  const WEEKS_TO_HOURS = TOTAL_WEEKS * 7 * 24; // 2016 小时

  // 计算排除睡眠后的有效总秒数
  function calculateEffectiveSeconds(totalHours) {
    const totalDays = totalHours / 24;
    const sleepHours = totalDays * SLEEP_HOURS_PER_DAY;
    const effectiveHours = Math.max(0, totalHours - sleepHours);
    return effectiveHours * 3600;
  }

  // 预计算各组有效总秒数
  const EFFECTIVE_SECONDS = {
    weeks: calculateEffectiveSeconds(WEEKS_TO_HOURS),
    hours72: calculateEffectiveSeconds(TOTAL_HOURS_72),
    hours12: calculateEffectiveSeconds(TOTAL_HOURS_12)
  };

  // 剩余秒数 (初始为有效总秒数)
  let remaining = {
    weeks: EFFECTIVE_SECONDS.weeks,
    hours72: EFFECTIVE_SECONDS.hours72,
    hours12: EFFECTIVE_SECONDS.hours12
  };

  // 初始有效总秒数 (用于百分比)
  const INITIAL_SECONDS = {
    weeks: EFFECTIVE_SECONDS.weeks,
    hours72: EFFECTIVE_SECONDS.hours72,
    hours12: EFFECTIVE_SECONDS.hours12
  };

  // DOM 元素
  const displayWeeks = document.getElementById('displayWeeks');
  const displayHours72 = document.getElementById('displayHours72');
  const displayHours12 = document.getElementById('displayHours12');

  const progressWeeks = document.getElementById('progressWeeks');
  const progressHours72 = document.getElementById('progressHours72');
  const progressHours12 = document.getElementById('progressHours12');

  const percentWeeks = document.getElementById('percentWeeks');
  const percentHours72 = document.getElementById('percentHours72');
  const percentHours12 = document.getElementById('percentHours12');

  // ---------- 辅助函数 ----------
  function formatTimeFromSeconds(totalSeconds) {
    if (totalSeconds < 0) totalSeconds = 0;
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (days > 0) {
      return `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }

  // 更新UI
  function updateUI() {
    const remWeeks = Math.max(0, remaining.weeks);
    displayWeeks.textContent = formatTimeFromSeconds(remWeeks);
    const pctWeeks = INITIAL_SECONDS.weeks > 0 ? (remWeeks / INITIAL_SECONDS.weeks) * 100 : 0;
    progressWeeks.style.width = Math.min(100, pctWeeks) + '%';
    percentWeeks.textContent = Math.floor(pctWeeks) + '%';

    const rem72 = Math.max(0, remaining.hours72);
    displayHours72.textContent = formatTimeFromSeconds(rem72);
    const pct72 = INITIAL_SECONDS.hours72 > 0 ? (rem72 / INITIAL_SECONDS.hours72) * 100 : 0;
    progressHours72.style.width = Math.min(100, pct72) + '%';
    percentHours72.textContent = Math.floor(pct72) + '%';

    const rem12 = Math.max(0, remaining.hours12);
    displayHours12.textContent = formatTimeFromSeconds(rem12);
    const pct12 = INITIAL_SECONDS.hours12 > 0 ? (rem12 / INITIAL_SECONDS.hours12) * 100 : 0;
    progressHours12.style.width = Math.min(100, pct12) + '%';
    percentHours12.textContent = Math.floor(pct12) + '%';
  }

  // ---------- 时间流失逻辑 (每秒) ----------
  function tick() {
    if (remaining.weeks > 0) {
      remaining.weeks = Math.max(0, remaining.weeks - 1);
    }
    if (remaining.hours72 > 0) {
      remaining.hours72 = Math.max(0, remaining.hours72 - 1);
    }
    if (remaining.hours12 > 0) {
      remaining.hours12 = Math.max(0, remaining.hours12 - 1);
    }
    updateUI();
  }

  // ---------- 初始化 ----------
  function init() {
    updateUI();
    setInterval(tick, UPDATE_INTERVAL_MS);
  }

  // 页面加载启动
  window.addEventListener('DOMContentLoaded', init);

})();