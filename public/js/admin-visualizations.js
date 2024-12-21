class AdminVisualizations {
    constructor() {
        this.charts = new Map();
        this.colors = {
            primary: '#FFD700',
            success: '#00A36C',
            danger: '#B22222',
            warning: '#FFA500',
            info: '#4682B4',
            background: 'rgba(255, 255, 255, 0.1)',
            text: '#FFFFFF'
        };
        this.initializeChartDefaults();
    }

    initializeChartDefaults() {
        Chart.defaults.color = this.colors.text;
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
        Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
    }

    // Create Real-time Line Chart
    createRealtimeChart(canvasId, options = {}) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const defaultOptions = {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: options.label || '',
                    data: [],
                    borderColor: options.color || this.colors.primary,
                    backgroundColor: options.backgroundColor || 'rgba(255, 215, 0, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: this.colors.text,
                        bodyColor: this.colors.text,
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1
                    }
                }
            }
        };

        const chart = new Chart(ctx, defaultOptions);
        this.charts.set(canvasId, chart);
        return chart;
    }

    // Create Gauge Chart
    createGaugeChart(canvasId, options = {}) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const data = {
            datasets: [{
                data: [options.value || 0, 100 - (options.value || 0)],
                backgroundColor: [
                    this.getGaugeColor(options.value || 0),
                    'rgba(255, 255, 255, 0.1)'
                ],
                borderWidth: 0,
                circumference: 180,
                rotation: 270
            }]
        };

        const gaugeChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            }
        });

        this.charts.set(canvasId, gaugeChart);
        return gaugeChart;
    }

    // Create Heat Map
    createHeatMap(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const chart = new Chart(ctx, {
            type: 'matrix',
            data: {
                datasets: [{
                    data: data,
                    backgroundColor(context) {
                        const value = context.dataset.data[context.dataIndex].v;
                        const alpha = value / 100;
                        return `rgba(255, 215, 0, ${alpha})`;
                    },
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    width: ({ chart }) => (chart.chartArea || {}).width / options.columns || 1,
                    height: ({ chart }) => (chart.chartArea || {}).height / options.rows || 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title() {
                                return '';
                            },
                            label(context) {
                                const v = context.dataset.data[context.dataIndex];
                                return [`${options.xLabels[v.x]}, ${options.yLabels[v.y]}`, `Value: ${v.v}`];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        labels: options.xLabels
                    },
                    y: {
                        display: true,
                        labels: options.yLabels
                    }
                }
            }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    // Create Radar Chart for Multi-metric Analysis
    createRadarChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: options.labels || [],
                datasets: data.map(dataset => ({
                    label: dataset.label,
                    data: dataset.data,
                    borderColor: dataset.color || this.colors.primary,
                    backgroundColor: `${dataset.color || this.colors.primary}33`,
                    borderWidth: 2,
                    pointBackgroundColor: dataset.color || this.colors.primary
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        pointLabels: {
                            color: this.colors.text
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    // Create Bubble Chart for Cluster Analysis
    createBubbleChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bubble',
            data: {
                datasets: data.map(dataset => ({
                    label: dataset.label,
                    data: dataset.data,
                    backgroundColor: `${dataset.color || this.colors.primary}88`
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        title: {
                            display: true,
                            text: options.xLabel || ''
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        title: {
                            display: true,
                            text: options.yLabel || ''
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    // Create Sankey Diagram for Flow Analysis
    createSankeyDiagram(canvasId, data, options = {}) {
        const container = document.getElementById(canvasId);
        const chart = new google.visualization.Sankey(container);
        
        const dataTable = new google.visualization.DataTable();
        dataTable.addColumn('string', 'From');
        dataTable.addColumn('string', 'To');
        dataTable.addColumn('number', 'Weight');
        dataTable.addRows(data);

        const sankeyOptions = {
            height: options.height || 400,
            sankey: {
                node: {
                    colors: options.nodeColors || [this.colors.primary],
                    label: {
                        color: this.colors.text
                    }
                },
                link: {
                    colorMode: 'gradient',
                    color: {
                        fill: options.linkColor || this.colors.primary,
                        fillOpacity: 0.3
                    }
                }
            }
        };

        chart.draw(dataTable, sankeyOptions);
        return chart;
    }

    // Create Tree Map
    createTreeMap(canvasId, data, options = {}) {
        const container = document.getElementById(canvasId);
        const chart = new google.visualization.TreeMap(container);
        
        const dataTable = new google.visualization.DataTable();
        dataTable.addColumn('string', 'ID');
        dataTable.addColumn('string', 'Parent');
        dataTable.addColumn('number', 'Value');
        dataTable.addRows(data);

        const treeMapOptions = {
            height: options.height || 400,
            minColor: options.minColor || this.colors.danger,
            midColor: options.midColor || this.colors.warning,
            maxColor: options.maxColor || this.colors.success,
            headerHeight: 15,
            fontColor: this.colors.text,
            showScale: true
        };

        chart.draw(dataTable, treeMapOptions);
        return chart;
    }

    // Utility Functions
    getGaugeColor(value) {
        if (value <= 30) return this.colors.success;
        if (value <= 70) return this.colors.warning;
        return this.colors.danger;
    }

    updateChartData(chartId, newData, labels = null) {
        const chart = this.charts.get(chartId);
        if (!chart) return;

        if (Array.isArray(newData)) {
            chart.data.datasets[0].data = newData;
        } else {
            Object.assign(chart.data.datasets[0].data, newData);
        }

        if (labels) {
            chart.data.labels = labels;
        }

        chart.update();
    }

    // Animation Functions
    animateNumber(element, start, end, duration = 1000) {
        const range = end - start;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const value = start + (range * this.easeOutCubic(progress));
            element.textContent = Math.round(value).toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    easeOutCubic(x) {
        return 1 - Math.pow(1 - x, 3);
    }

    // Clean up
    destroyChart(chartId) {
        const chart = this.charts.get(chartId);
        if (chart) {
            chart.destroy();
            this.charts.delete(chartId);
        }
    }

    destroyAllCharts() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }
}

// Export the visualization module
window.AdminVisualizations = new AdminVisualizations();
