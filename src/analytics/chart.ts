import ApexCharts from "apexcharts";

document.addEventListener('DOMContentLoaded', () => {
  const options = {
    chart: {
      type: 'line',
      height: 350
    },
    series: [{
      name: 'My Series',
      data: [10, 20, 15, 30, 25]
    }],
    xaxis: {
      categories: ['A', 'B', 'C', 'D', 'E']
    }
  };

  const chart = new ApexCharts(document.querySelector("#chart"), options);
  chart.render();
});