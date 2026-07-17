/* ============================================================
   الرسوم البيانية — Chart.js
   الألوان مأخوذة من نفس هوية اللوحة (ذهبي على خلفية بيضاء)
   ============================================================ */

const chartRegistry = {};
const CHART_GOLD = "#C9A84C";
const CHART_INK = "#201D17";
const CHART_PALETTE = ["#C9A84C", "#8A7238", "#3F7A5C", "#A6473B", "#6B6558", "#E4CD8A"];

Chart.defaults.font.family = "Cairo, sans-serif";
Chart.defaults.color = "#6B6558";

function renderChart(canvasId, config) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  if (chartRegistry[canvasId]) chartRegistry[canvasId].destroy();
  chartRegistry[canvasId] = new Chart(el.getContext("2d"), config);
}

/* ---------- تُستدعى من admin.js بعد جلب getStats في الصفحة الرئيسية ---------- */
function renderHomeCharts(stats = {}) {
  renderChart("chartMonthly", {
    type: "line",
    data: {
      labels: (stats.monthly || []).map((m) => m.label),
      datasets: [
        {
          label: "عقارات مضافة",
          data: (stats.monthly || []).map((m) => m.count),
          borderColor: CHART_GOLD,
          backgroundColor: "rgba(201,168,76,0.12)",
          tension: 0.35,
          fill: true,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });

  renderChart("chartSaleRent", {
    type: "doughnut",
    data: {
      labels: ["للبيع", "للإيجار"],
      datasets: [
        {
          data: [stats.forSaleCount || 0, stats.forRentCount || 0],
          backgroundColor: [CHART_GOLD, "#8A7238"],
          borderWidth: 0,
        },
      ],
    },
    options: { plugins: { legend: { position: "bottom" } } },
  });
}

/* ---------- صفحة الإحصائيات ---------- */
async function loadStatsCharts() {
  const period = document.getElementById("statsPeriod").value;
  try {
    const res = await apiCall("getStats", { period });
    if (!res || !res.ok) return toast("تعذّر تحميل الإحصائيات", "error");
    const s = res.stats || {};

    renderChart("chartPrices", {
      type: "bar",
      data: {
        labels: (s.priceRanges || []).map((r) => r.label),
        datasets: [
          {
            label: "عدد العقارات",
            data: (s.priceRanges || []).map((r) => r.count),
            backgroundColor: CHART_GOLD,
            borderRadius: 6,
          },
        ],
      },
      options: { plugins: { legend: { display: false } } },
    });

    renderChart("chartSoldRatio", {
      type: "doughnut",
      data: {
        labels: ["مباع", "غير مباع"],
        datasets: [
          {
            data: [s.soldCount || 0, s.unsoldCount || 0],
            backgroundColor: [CHART_INK, CHART_GOLD],
            borderWidth: 0,
          },
        ],
      },
      options: { plugins: { legend: { position: "bottom" } } },
    });

    renderChart("chartVisitors", {
      type: "line",
      data: {
        labels: (s.visitorsSeries || []).map((v) => v.label),
        datasets: [
          {
            label: "الزوار",
            data: (s.visitorsSeries || []).map((v) => v.visitors),
            borderColor: CHART_GOLD,
            backgroundColor: "rgba(201,168,76,0.10)",
            tension: 0.3,
          },
          {
            label: "المشاهدات",
            data: (s.visitorsSeries || []).map((v) => v.views),
            borderColor: CHART_INK,
            backgroundColor: "rgba(32,29,23,0.06)",
            tension: 0.3,
          },
        ],
      },
      options: { plugins: { legend: { position: "bottom" } } },
    });
  } catch (e) {
    toast("تعذّر الاتصال بالخادم", "error");
  }
}

document.getElementById("statsPeriod").addEventListener("change", loadStatsCharts);

document.getElementById("exportStatsBtn").addEventListener("click", async () => {
  const period = document.getElementById("statsPeriod").value;
  const res = await apiCall("getStats", { period });
  if (!res || !res.ok) return toast("تعذّر تجهيز التصدير", "error");
  const rows = res.stats.visitorsSeries || [];
  if (!rows.length) return toast("لا توجد بيانات زوار لتصديرها بعد", "error");

  const header = "التاريخ,الزوار,المشاهدات";
  const lines = rows.map((r) => `${r.label},${r.visitors},${r.views}`);
  const csv = "\uFEFF" + [header, ...lines].join("\n"); // BOM لدعم العربية في Excel

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "visitors-stats.csv";
  link.click();
});
